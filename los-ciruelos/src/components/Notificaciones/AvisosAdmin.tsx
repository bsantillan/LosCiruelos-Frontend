import { useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import CampoToggle from "../ui/CampoToggle/CampoToggle";
import Boton from "../ui/Boton/Boton";
import { perfilService } from "../../services/perfilService";
import type { AvisosAdmin as Avisos, PruebaAvisoResponse } from "../../types/perfil.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatTelefono } from "../../utils/telefono";
import "./Notificaciones.css";
import { AvisoTransitorio } from "../ui/Avisos/Avisos";

const AVISOS: { campo: Exclude<keyof Avisos, "activos">; titulo: string; desc: string }[] = [
    { campo: "reservaConfirmada", titulo: "Reserva confirmada", desc: "Cuando un cliente paga la seña o el total." },
    { campo: "saldoCobrado", titulo: "Saldo cobrado", desc: "Cuando se cobra lo que faltaba de un turno." },
    { campo: "reservaCancelada", titulo: "Reserva cancelada", desc: "Cuando se cancela un turno confirmado." },
    { campo: "reembolsoManual", titulo: "Reembolso a mano", desc: "Cuando hay plata para devolver por el club." },
];

/** Avisos de reservas que recibe el ADMIN, con un interruptor general y un envío de prueba. */
export default function AvisosAdmin() {
    const [avisos, setAvisos] = useState<Avisos | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [probando, setProbando] = useState(false);
    const [prueba, setPrueba] = useState<PruebaAvisoResponse | null>(null);

    useEffect(() => {
        let activo = true;
        perfilService.getAvisos()
            .then(a => { if (activo) setAvisos(a); })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar tus avisos.")) ?? null); });
        return () => { activo = false; };
    }, []);

    // Cada cambio se guarda en el acto; si falla se vuelve atrás
    const cambiar = (campo: keyof Avisos) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!avisos) return;
        const anterior = avisos;
        const nuevo = { ...avisos, [campo]: e.target.checked };
        setAvisos(nuevo);
        setError(null);
        try {
            setAvisos(await perfilService.updateAvisos(nuevo));
        } catch (err) {
            setAvisos(anterior);
            setError(primerError(extraerErrores(err, "No se pudo guardar el cambio.")) ?? null);
        }
    };

    const probar = async () => {
        setProbando(true);
        setPrueba(null);
        setError(null);
        try {
            setPrueba(await perfilService.probarAviso());
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo enviar el aviso de prueba.")) ?? null);
        } finally {
            setProbando(false);
        }
    };

    const destino = (p: PruebaAvisoResponse) =>
        p.canal === "WHATSAPP" ? `por WhatsApp al ${formatTelefono(p.destino)}` : `por mail a ${p.destino}`;

    return (
        <section className="perfil-seccion">
            <div className="perfil-seccion__header">
                <Megaphone size={16} />
                <h2 className="perfil-seccion__titulo">Avisos que recibís</h2>
            </div>

            {avisos && (
                <div className="notif-bloque">
                    <CampoToggle
                        id="avisos-activos" name="activos"
                        label="Recibir avisos"
                        descripcion="Apagalo para pausar todos los avisos sin perder lo que elegiste abajo."
                        checked={avisos.activos}
                        onChange={cambiar("activos")}
                    />
                    <div className={`notif-lista${avisos.activos ? "" : " notif-lista--pausada"}`}>
                        {AVISOS.map(a => (
                            <CampoToggle
                                key={a.campo}
                                id={`aviso-${a.campo}`} name={a.campo}
                                label={a.titulo} descripcion={a.desc}
                                checked={avisos[a.campo]}
                                onChange={cambiar(a.campo)}
                                disabled={!avisos.activos}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="notif-bloque">
                <Boton variante="secundario" ancho="auto" cargando={probando} onClick={() => void probar()}>
                    <Send size={15} />
                    <span>Enviar aviso de prueba</span>
                </Boton>
                {prueba && (prueba.enviado ? (
                    <AvisoTransitorio tipo="ok">Te mandamos un aviso de prueba {destino(prueba)}.</AvisoTransitorio>
                ) : (
                    <AvisoTransitorio tipo="error">No se pudo enviar el aviso de prueba. Revisá tu celular y el medio elegido.</AvisoTransitorio>
                ))}
            </div>

            {error && <AvisoTransitorio tipo="error">{error}</AvisoTransitorio>}
        </section>
    );
}
