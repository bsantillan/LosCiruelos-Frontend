import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import CampoToggle from "../ui/CampoToggle/CampoToggle";
import SelectorPeriodo, { type Periodo } from "../ui/SelectorPeriodo/SelectorPeriodo";
import { adminService } from "../../services/adminService";
import { perfilService } from "../../services/perfilService";
import type { ConfigAvisos, MensajesWhatsApp } from "../../types/perfil.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { hoyISO } from "../../utils/fechas";
import { AvisoTransitorio } from "../ui/Avisos/Avisos";
import "./Notificaciones.css";

/** Del 1 del mes en curso a hoy (lo mismo que responde el backend sin fechas) */
function mesEnCurso(): Periodo {
    const hoy = hoyISO();
    return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
}

const numero = (n: number) => n.toLocaleString("es-AR");

/**
 * WhatsApp del club (solo ADMIN):
 *  - Si el club manda WhatsApp a los clientes. Apagado, a los clientes les llega todo por mail y no
 *    verifican el celular (alcanza con cargarlo). Al personal no le cambia nada.
 *  - Cuántos WhatsApp se mandaron en un período (cada uno lo cobra Meta).
 */
export default function WhatsAppClub() {
    const [config, setConfig] = useState<ConfigAvisos | null>(null);
    const [errorConfig, setErrorConfig] = useState<string | null>(null);
    const [guardado, setGuardado] = useState<string | null>(null);

    const [periodo, setPeriodo] = useState<Periodo>(mesEnCurso);
    const [mensajes, setMensajes] = useState<MensajesWhatsApp | null>(null);
    const [cargando, setCargando] = useState(true);
    const [errorMensajes, setErrorMensajes] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;
        adminService.getConfigAvisos()
            .then(c => { if (activo) setConfig(c); })
            .catch(e => { if (activo) setErrorConfig(primerError(extraerErrores(e, "No se pudo cargar la configuración de WhatsApp.")) ?? null); });
        return () => { activo = false; };
    }, []);

    useEffect(() => {
        let activo = true;
        perfilService.getMensajesWhatsApp(periodo.desde, periodo.hasta)
            .then(m => { if (activo) { setMensajes(m); setErrorMensajes(null); } })
            .catch(e => { if (activo) setErrorMensajes(primerError(extraerErrores(e, "No se pudo cargar cuántos mensajes se mandaron.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [periodo.desde, periodo.hasta]);

    // Se guarda en el acto; si falla se vuelve atrás. El PUT lleva el recordatorio tal como está.
    const cambiarWhatsapp = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!config) return;
        const anterior = config;
        const nuevo = { ...config, whatsappClientes: e.target.checked };
        setConfig(nuevo);
        setErrorConfig(null);
        setGuardado(null);
        try {
            const c = await adminService.updateConfigAvisos(nuevo);
            setConfig(c);
            setGuardado(c.whatsappClientes
                ? "Listo: los clientes que elijan WhatsApp lo vuelven a recibir. Los que no verificaron el celular lo van a tener que verificar."
                : "Listo: a los clientes les llega todo por mail y no tienen que verificar el celular.");
        } catch (err) {
            setConfig(anterior);
            setErrorConfig(primerError(extraerErrores(err, "No se pudo guardar el cambio.")) ?? null);
        }
    };

    return (
        <section className="perfil-seccion">
            <div className="perfil-seccion__header">
                <MessageCircle size={16} />
                <h2 className="perfil-seccion__titulo">WhatsApp del club</h2>
            </div>

            {config && (
                <div className="notif-bloque">
                    <CampoToggle
                        id="whatsapp-clientes" name="whatsappClientes"
                        label="Mandar WhatsApp a los clientes"
                        descripcion="Los avisos de sus reservas y el código para verificar el celular. Apagado, a los clientes les llega todo por mail y no tienen que verificar el celular para reservar. A vos y al personal no les cambia nada."
                        checked={config.whatsappClientes}
                        onChange={e => void cambiarWhatsapp(e)}
                    />
                    {guardado && <AvisoTransitorio tipo="ok">{guardado}</AvisoTransitorio>}
                </div>
            )}
            {errorConfig && <AvisoTransitorio tipo="error">{errorConfig}</AvisoTransitorio>}

            <div className="notif-bloque">
                <div className="notif-mensajes__cabecera">
                    <h3 className="notif-subtitulo">Mensajes enviados</h3>
                    <SelectorPeriodo valor={periodo} obligatorio
                        onChange={p => { setCargando(true); setPeriodo(p); }} />
                </div>
                <p className="notif-ayuda">
                    Cada WhatsApp que sale lo cobra Meta. Los que no se pudieron mandar y salieron por mail no cuentan.
                </p>

                {errorMensajes && <AvisoTransitorio tipo="error">{errorMensajes}</AvisoTransitorio>}

                {mensajes && (
                    <div className={`notif-mensajes${cargando ? " notif-mensajes--cargando" : ""}`} aria-busy={cargando}>
                        <dl className="notif-cifras">
                            <div className="notif-cifra notif-cifra--principal">
                                <dt>Total</dt>
                                <dd>{numero(mensajes.total)}</dd>
                            </div>
                            <div className="notif-cifra">
                                <dt>Avisos de reservas</dt>
                                <dd>{numero(mensajes.avisos)}</dd>
                            </div>
                            <div className="notif-cifra">
                                <dt>Códigos del celular</dt>
                                <dd>{numero(mensajes.codigos)}</dd>
                            </div>
                            <div className="notif-cifra">
                                <dt>A clientes</dt>
                                <dd>{numero(mensajes.aClientes)}</dd>
                            </div>
                            <div className="notif-cifra">
                                <dt>Al personal</dt>
                                <dd>{numero(mensajes.alPersonal)}</dd>
                            </div>
                        </dl>

                        {mensajes.porAviso.length > 0 ? (
                            <ul className="notif-por-aviso" aria-label="Avisos por tipo">
                                {mensajes.porAviso.map(a => (
                                    <li key={a.aviso}>
                                        <span>{a.nombre}</span>
                                        <strong>{numero(a.cantidad)}</strong>
                                    </li>
                                ))}
                            </ul>
                        ) : mensajes.total === 0 && (
                            <p className="notif-ayuda">No se mandó ningún WhatsApp en este período.</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
