import { useEffect, useState } from "react";
import { AlertCircle, BellRing, CheckCircle2, KeyRound, Mail, MessageCircle, Smartphone } from "lucide-react";
import CampoInput from "../ui/CampoInput/CampoInput";
import CampoTelefono from "../ui/CampoTelefono/CampoTelefono";
import CampoToggle from "../ui/CampoToggle/CampoToggle";
import Boton from "../ui/Boton/Boton";
import { perfilService } from "../../services/perfilService";
import type {
    CanalNotificacion, NotificacionesResponse, PerfilResponse, SuscripcionesResponse,
} from "../../types/perfil.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { aInternacional, celularValido, formatTelefono, mismoTelefono } from "../../utils/telefono";
import "./Notificaciones.css";
import { AvisoTransitorio } from "../ui/Avisos/Avisos";

/** Segundos de espera entre pedidos de código (el backend permite 1 por minuto y 5 por día) */
const ESPERA_REENVIO = 60;

interface Props {
    perfil: PerfilResponse;
    esCliente: boolean;
    /** Algo cambió del lado del servidor (celular nuevo o verificado): hay que recargar el perfil */
    onPerfilCambio: () => void;
}

/**
 * Celular y notificaciones. Es el único lugar donde se carga y cambia el celular:
 *  1. Cargar o cambiar el celular (PUT /perfil/notificaciones con el canal actual) y verificarlo
 *     con un código por WhatsApp. Sin el celular verificado el perfil no está completo y el
 *     cliente no puede reservar. Si el club no manda WhatsApp a los clientes
 *     (perfil.verificacionDeCelular en false), el celular no se verifica: alcanza con cargarlo.
 *  2. Elegir el medio de los avisos: mail o WhatsApp (WhatsApp necesita el celular verificado).
 *  3. CLIENTE: qué avisos recibe (las cancelaciones, siempre).
 */
export default function CelularYNotificaciones({ perfil, esCliente, onPerfilCambio }: Props) {
    const [notif, setNotif] = useState<NotificacionesResponse | null>(null);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);

    // Cargar o cambiar el celular
    const [editando, setEditando] = useState(false);
    const [nuevoTelefono, setNuevoTelefono] = useState("");
    const [guardandoTelefono, setGuardandoTelefono] = useState(false);
    const [errorTelefono, setErrorTelefono] = useState<string | null>(null);

    // Verificación: el código se pidió para este número (si el celular cambia, ese código ya no sirve)
    const [codigoEnviadoA, setCodigoEnviadoA] = useState<string | null>(null);
    const [codigo, setCodigo] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [verificando, setVerificando] = useState(false);
    const [espera, setEspera] = useState(0);
    const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
    const [verificadoRecien, setVerificadoRecien] = useState(false);

    // Medio de los avisos
    const [guardandoCanal, setGuardandoCanal] = useState(false);
    const [errorCanal, setErrorCanal] = useState<string | null>(null);

    // Avisos del cliente
    const [susc, setSusc] = useState<SuscripcionesResponse | null>(null);
    const [errorSusc, setErrorSusc] = useState<string | null>(null);

    // Se recarga cuando cambia el teléfono o su verificación
    const { telefono, telefonoVerificado, perfilCompleto } = perfil;
    useEffect(() => {
        let activo = true;
        perfilService.getNotificaciones()
            .then(n => { if (activo) { setNotif(n); setErrorCarga(null); } })
            .catch(e => { if (activo) setErrorCarga(primerError(extraerErrores(e, "No se pudieron cargar tus notificaciones.")) ?? null); });
        return () => { activo = false; };
    }, [telefono, telefonoVerificado]);

    // `editable` depende de que el perfil esté completo
    useEffect(() => {
        if (!esCliente) return;
        let activo = true;
        perfilService.getSuscripciones()
            .then(s => { if (activo) setSusc(s); })
            .catch(e => { if (activo) setErrorSusc(primerError(extraerErrores(e, "No se pudieron cargar tus avisos.")) ?? null); });
        return () => { activo = false; };
    }, [esCliente, perfilCompleto]);

    // Cuenta regresiva para reenviar el código
    useEffect(() => {
        if (espera <= 0) return;
        const t = setTimeout(() => setEspera(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [espera]);

    /** El backend mandó (o va a mandar) un código a ese número: se muestra para ingresarlo */
    const esperarCodigo = (numero: string | null) => {
        setCodigoEnviadoA(numero);
        setCodigo("");
        setErrorCodigo(null);
        setEspera(ESPERA_REENVIO);
    };

    const empezarEdicion = () => {
        setNuevoTelefono(aInternacional(telefono));
        setErrorTelefono(null);
        setEditando(true);
    };

    const guardarTelefono = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!celularValido(nuevoTelefono)) {
            setErrorTelefono("Ingresá un celular válido, con el código de área.");
            return;
        }
        if (!notif) return;
        setGuardandoTelefono(true);
        setErrorTelefono(null);
        try {
            // Mismo canal que tenía: solo cambia el número (queda sin verificar si es otro)
            const n = await perfilService.updateNotificaciones({ canal: notif.canal, telefono: nuevoTelefono });
            setNotif(n);
            setEditando(false);
            setVerificadoRecien(false);
            // Con WhatsApp elegido y el número sin verificar, el backend ya mandó el código
            if (n.canal === "WHATSAPP" && !n.telefonoVerificado && n.whatsappDisponible) esperarCodigo(n.telefono);
            onPerfilCambio();
        } catch (err) {
            const errores = extraerErrores(err, "No se pudo guardar el celular.");
            setErrorTelefono(errores.telefono ?? primerError(errores) ?? null);
        } finally {
            setGuardandoTelefono(false);
        }
    };

    const pedirCodigo = async () => {
        setEnviando(true);
        setErrorCodigo(null);
        try {
            await perfilService.enviarCodigoTelefono();
            esperarCodigo(telefono);
        } catch (e) {
            setErrorCodigo(primerError(extraerErrores(e, "No se pudo enviar el código. Intentá de nuevo.")) ?? null);
        } finally {
            setEnviando(false);
        }
    };

    const verificar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (codigo.length !== 6) {
            setErrorCodigo("El código tiene 6 dígitos.");
            return;
        }
        setVerificando(true);
        setErrorCodigo(null);
        try {
            const n = await perfilService.verificarTelefono(codigo);
            setNotif(n);
            setCodigoEnviadoA(null);
            setCodigo("");
            setVerificadoRecien(true);
            onPerfilCambio(); // perfilCompleto puede haber pasado a true
        } catch (err) {
            setErrorCodigo(primerError(extraerErrores(err, "No se pudo verificar el código.")) ?? null);
        } finally {
            setVerificando(false);
        }
    };

    const elegirCanal = async (canal: CanalNotificacion) => {
        if (!notif || canal === notif.canal || guardandoCanal) return;
        setGuardandoCanal(true);
        setErrorCanal(null);
        try {
            const n = await perfilService.updateNotificaciones({ canal });
            setNotif(n);
            // Elegir WhatsApp sin el celular verificado manda el código: se muestra para ingresarlo
            if (n.canal === "WHATSAPP" && !n.telefonoVerificado) esperarCodigo(n.telefono);
        } catch (e) {
            setErrorCanal(primerError(extraerErrores(e, "No se pudo cambiar el medio de los avisos.")) ?? null);
        } finally {
            setGuardandoCanal(false);
        }
    };

    const cambiarSuscripcion = (campo: "recordatorios" | "promociones") => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!susc) return;
        const anterior = susc;
        const nuevo = { ...susc, [campo]: e.target.checked };
        setSusc(nuevo); // se muestra en el acto; si falla se vuelve atrás
        setErrorSusc(null);
        try {
            setSusc(await perfilService.updateSuscripciones({
                recordatorios: nuevo.recordatorios,
                promociones: nuevo.promociones,
            }));
        } catch (err) {
            setSusc(anterior);
            setErrorSusc(primerError(extraerErrores(err, "No se pudo guardar el cambio.")) ?? null);
        }
    };

    const whatsappDisponible = notif?.whatsappDisponible ?? false;
    // false: el club no manda WhatsApp a los clientes (no hay código ni WhatsApp para elegir)
    const seVerifica = perfil.verificacionDeCelular;
    const tieneTelefono = Boolean(telefono);
    // Sin celular cargado se muestra directamente el campo para cargarlo
    const mostrarFormulario = editando || (!tieneTelefono && notif !== null);
    const puedeVerificar = seVerifica && tieneTelefono && !telefonoVerificado && whatsappDisponible && !mostrarFormulario;
    const codigoEnviado = codigoEnviadoA !== null && codigoEnviadoA === telefono;

    return (
        <section className="perfil-seccion" id="notificaciones">
            <div className="perfil-seccion__header">
                <BellRing size={16} />
                <h2 className="perfil-seccion__titulo">Celular y notificaciones</h2>
            </div>

            {errorCarga && <AvisoTransitorio tipo="error">{errorCarga}</AvisoTransitorio>}

            {/* ── 1. Celular: cargarlo, cambiarlo y verificarlo ── */}
            <div className="notif-bloque">
                {!mostrarFormulario && (
                    <div className="notif-celular">
                        <Smartphone size={18} aria-hidden="true" />
                        <div className="notif-celular__datos">
                            <span className="notif-celular__numero">{formatTelefono(telefono)}</span>
                            {seVerifica && (
                                <span className={`notif-chip${telefonoVerificado ? " notif-chip--ok" : " notif-chip--pendiente"}`}>
                                    {telefonoVerificado ? <><CheckCircle2 size={12} /> Verificado</> : "Sin verificar"}
                                </span>
                            )}
                        </div>
                        <button type="button" className="accion accion--chica" onClick={empezarEdicion}>
                            Cambiar
                        </button>
                    </div>
                )}

                {mostrarFormulario && (
                    <form className="notif-codigo" onSubmit={guardarTelefono} noValidate>
                        <CampoTelefono
                            id="celular" name="telefono" label={tieneTelefono ? "Celular nuevo" : "Celular"}
                            value={nuevoTelefono}
                            onChange={v => { setNuevoTelefono(v); setErrorTelefono(null); }}
                            required error={errorTelefono ?? undefined}
                        />
                        <p className="notif-ayuda">
                            {!seVerifica
                                ? "Elegí el país y escribí el número con el código de área, sin 0 ni 15."
                                : tieneTelefono && telefonoVerificado
                                    ? "Si lo cambiás, vas a tener que verificar el número nuevo."
                                    : "Elegí el país y escribí el número con el código de área, sin 0 ni 15. Después lo verificás con un código por WhatsApp."}
                        </p>
                        <div className="notif-codigo__acciones">
                            {tieneTelefono && (
                                <Boton variante="fantasma" ancho="auto" type="button" disabled={guardandoTelefono}
                                    onClick={() => { setEditando(false); setErrorTelefono(null); }}>
                                    <span>Volver</span>
                                </Boton>
                            )}
                            <Boton ancho="auto" type="submit" cargando={guardandoTelefono}
                                disabled={!nuevoTelefono || (tieneTelefono && mismoTelefono(nuevoTelefono, telefono))}>
                                <span>Guardar celular</span>
                            </Boton>
                        </div>
                    </form>
                )}

                {verificadoRecien && telefonoVerificado && (
                    <AvisoTransitorio tipo="ok">Listo, tu celular quedó verificado.</AvisoTransitorio>
                )}

                {seVerifica && tieneTelefono && !telefonoVerificado && !mostrarFormulario && (
                    <>
                        <p className="notif-ayuda">
                            {!whatsappDisponible
                                ? "La verificación por WhatsApp no está disponible por ahora. Probá más tarde."
                                : "Verificalo con un código que te mandamos por WhatsApp. Lo necesitás para completar tu perfil"
                                + (esCliente ? " y poder reservar." : ".")}
                        </p>

                        {!codigoEnviado && puedeVerificar && (
                            <Boton variante="secundario" ancho="auto" cargando={enviando} onClick={() => void pedirCodigo()}>
                                <MessageCircle size={15} />
                                <span>Enviar código por WhatsApp</span>
                            </Boton>
                        )}

                        {codigoEnviado && puedeVerificar && (
                            <form className="notif-codigo" onSubmit={verificar} noValidate>
                                <p className="notif-ayuda">
                                    Te mandamos un código de 6 dígitos al <strong>{formatTelefono(telefono)}</strong>. Vence en 10 minutos.
                                </p>
                                <CampoInput
                                    id="codigo-celular" name="codigo" label="Código"
                                    type="tel" value={codigo}
                                    onChange={e => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrorCodigo(null); }}
                                    placeholder="123456" autoComplete="one-time-code"
                                    icono={<KeyRound size={16} />}
                                />
                                <div className="notif-codigo__acciones">
                                    <Boton variante="secundario" ancho="auto" type="button"
                                        disabled={espera > 0} cargando={enviando} onClick={() => void pedirCodigo()}>
                                        <span>{espera > 0 ? `Reenviar en ${espera} s` : "Reenviar código"}</span>
                                    </Boton>
                                    <Boton ancho="auto" type="submit" cargando={verificando} disabled={codigo.length !== 6}>
                                        <span>Verificar</span>
                                    </Boton>
                                </div>
                            </form>
                        )}

                        {errorCodigo && <AvisoTransitorio tipo="error">{errorCodigo}</AvisoTransitorio>}
                    </>
                )}
            </div>

            {/* ── 2. Medio de los avisos ── */}
            {notif && (
                <div className="notif-bloque">
                    <h3 className="notif-subtitulo">¿Por dónde te avisamos?</h3>
                    <div className="notif-canales" role="radiogroup" aria-label="Medio de los avisos">
                        <label className={`notif-canal${notif.canal === "EMAIL" ? " notif-canal--activo" : ""}`}>
                            <input type="radio" name="canal" checked={notif.canal === "EMAIL"}
                                disabled={guardandoCanal} onChange={() => void elegirCanal("EMAIL")} />
                            <Mail size={18} />
                            <span className="notif-canal__nombre">Mail</span>
                            <span className="notif-canal__desc">{perfil.email}</span>
                        </label>
                        <label className={`notif-canal${notif.canal === "WHATSAPP" ? " notif-canal--activo" : ""}${!whatsappDisponible || !tieneTelefono ? " notif-canal--deshabilitado" : ""}`}>
                            <input type="radio" name="canal" checked={notif.canal === "WHATSAPP"}
                                disabled={guardandoCanal || !whatsappDisponible || !tieneTelefono}
                                onChange={() => void elegirCanal("WHATSAPP")} />
                            <MessageCircle size={18} />
                            <span className="notif-canal__nombre">WhatsApp</span>
                            <span className="notif-canal__desc">
                                {!seVerifica ? "El club avisa por mail" : !whatsappDisponible ? "No disponible por ahora" : tieneTelefono ? formatTelefono(telefono) : "Cargá tu celular arriba"}
                            </span>
                        </label>
                    </div>

                    {notif.canal === "WHATSAPP" && notif.canalEnUso === "EMAIL" && (
                        <p className="notif-aviso" role="status">
                            <AlertCircle size={14} />
                            Verificá tu celular para recibir por WhatsApp. Mientras tanto te avisamos por mail.
                        </p>
                    )}
                    {errorCanal && <AvisoTransitorio tipo="error">{errorCanal}</AvisoTransitorio>}
                </div>
            )}

            {/* ── 3. Qué avisos recibe el cliente ── */}
            {esCliente && susc && (
                <div className="notif-bloque">
                    <h3 className="notif-subtitulo">¿Qué avisos querés recibir?</h3>
                    {!susc.editable && (
                        <p className="notif-ayuda">
                            Completá tu perfil{seVerifica ? " (con el celular verificado)" : ""} para elegir tus avisos.
                        </p>
                    )}
                    <div className="notif-fijo">
                        <div>
                            <span className="notif-fijo__titulo">Cancelaciones</span>
                            <span className="notif-fijo__desc">Si se cancela uno de tus turnos.</span>
                        </div>
                        <span className="notif-chip notif-chip--ok">Siempre activo</span>
                    </div>
                    <CampoToggle
                        id="aviso-recordatorios" name="recordatorios"
                        label="Recordatorios"
                        descripcion="Un aviso antes de cada turno."
                        checked={susc.recordatorios}
                        onChange={cambiarSuscripcion("recordatorios")}
                        disabled={!susc.editable}
                    />
                    <CampoToggle
                        id="aviso-promociones" name="promociones"
                        label="Novedades y promociones"
                        descripcion="Torneos, eventos y ofertas del club."
                        checked={susc.promociones}
                        onChange={cambiarSuscripcion("promociones")}
                        disabled={!susc.editable}
                    />
                </div>
            )}
            {errorSusc && <AvisoTransitorio tipo="error">{errorSusc}</AvisoTransitorio>}
        </section>
    );
}
