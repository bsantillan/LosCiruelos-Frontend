import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { AlarmClock, CalendarRange, CirclePause, Clock, Coins, Copy, DoorClosed, DoorOpen, Globe, MessageCircle, Save, Undo2, XCircle } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoTexto from "../../components/ui/CampoTexto/CampoTexto";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import SelectorFecha from "../../components/ui/SelectorFecha/SelectorFecha";
import SelectorHora from "../../components/ui/SelectorHora/SelectorHora";
import { HORAS_MEDIA_HORA } from "../../utils/horas";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import { adminService } from "../../services/adminService";
import type { CancelacionesResultado, ConfiguracionClub, DiaCerrado, FueraDeHorario, HorarioDia } from "../../types/admin.types";
import { extraerErrores } from "../../utils/apiErrors";
import { formatFecha, formatMonto, horaCorta } from "../../utils/fechas";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Pestanas } from "./comunes";
import { ModalFueraDeHorario, SinCancelar } from "./ConflictoReservas";
import { textoCanceladas } from "./conflictoReservas.texto";
import "./ReservasAdmin.css";
import "./Configuracion.css";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
/** El cierre puede ser hasta las 23:59 (el club cierra a medianoche) */
const CIERRES = [...HORAS_MEDIA_HORA.slice(1), "23:59"];

type Seccion = "precio" | "duracion" | "cancelacion" | "avisos" | "online" | "horarios" | "cierres";
const SECCIONES: { id: Seccion; etiqueta: string }[] = [
    { id: "precio", etiqueta: "Precio y seña" },
    { id: "duracion", etiqueta: "Duración" },
    { id: "cancelacion", etiqueta: "Cancelación" },
    { id: "avisos", etiqueta: "Avisos y anticipación" },
    { id: "online", etiqueta: "Reservas online" },
    { id: "horarios", etiqueta: "Horarios" },
    { id: "cierres", etiqueta: "Días cerrados" },
];

/** En qué pestaña está cada campo con error (para llevar ahí al guardar) */
function seccionDe(campo: string): Seccion {
    if (campo === "montoReserva" || campo === "montoXMediaHora" || campo === "porcentajeSenia") return "precio";
    if (campo.startsWith("duracion")) return "duracion";
    if (campo.startsWith("reembolso")) return "cancelacion";
    if (campo === "diasAnticipacion" || campo === "minutosRecordatorio") return "avisos";
    if (campo === "mensajeReservasPausadas") return "online";
    return "horarios";
}

/** Errores del backend que no son de un campo: a qué pestaña corresponden, por el texto */
function seccionDelMensaje(mensaje: string): Seccion | null {
    const m = mensaje.toLowerCase();
    if (/(abre|apertura|cierre|repetido|día inválido|lunes|martes|miércoles|jueves|viernes|sábado|domingo)/.test(m)) return "horarios";
    if (/duración|turno mínimo|turno máximo/.test(m)) return "duracion";
    if (/devolver|reembolso|seña/.test(m)) return "cancelacion";
    if (/recordatorio|anticipación|whatsapp/.test(m)) return "avisos";
    if (/precio|monto|porcentaje/.test(m)) return "precio";
    return null;
}

/** 90 → "1 h 30 min" */
function duracionTexto(min: number): string {
    if (!Number.isFinite(min) || min <= 0) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return [h > 0 && `${h} h`, m > 0 && `${m} min`].filter(Boolean).join(" ");
}

const aMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/** Lo que se edita: los números como texto (los inputs) y un horario por día de la semana */
interface Formulario {
    montoReserva: string;
    montoXMediaHora: string;
    porcentajeSenia: string;
    /** En minutos */
    duracionMinimaTurno: string;
    duracionMaximaTurno: string;
    /** En horas (el backend usa minutos) */
    horasReembolsoTotal: string;
    horasReembolsoSenia: string;
    recordatorioActivo: boolean;
    /** En minutos */
    minutosRecordatorio: string;
    whatsappClientes: boolean;
    reservasOnline: boolean;
    mensajeReservasPausadas: string;
    diasAnticipacion: string;
    horarios: { dia: string; abre: boolean; apertura: string; cierre: string }[];
}

function aFormulario(c: ConfiguracionClub): Formulario {
    return {
        montoReserva: String(c.montoReserva),
        montoXMediaHora: String(c.montoXMediaHora),
        porcentajeSenia: String(c.porcentajeSenia),
        duracionMinimaTurno: String(c.duracionMinimaTurno),
        duracionMaximaTurno: String(c.duracionMaximaTurno),
        horasReembolsoTotal: String(c.minutosReembolsoTotal / 60),
        horasReembolsoSenia: String(c.minutosReembolsoSenia / 60),
        recordatorioActivo: c.recordatorioActivo,
        minutosRecordatorio: String(c.minutosRecordatorio),
        whatsappClientes: c.whatsappClientes ?? true,
        reservasOnline: c.reservasOnline ?? true,
        mensajeReservasPausadas: c.mensajeReservasPausadas ?? "",
        diasAnticipacion: String(c.diasAnticipacion),
        horarios: DIAS.map(dia => {
            const h = c.horarios.find(x => x.dia === dia);
            return { dia, abre: h !== undefined, apertura: horaCorta(h?.apertura ?? "08:00"), cierre: horaCorta(h?.cierre ?? "23:00") };
        }),
    };
}

/**
 * El body del PUT, o los errores de lo que falta completar. Las reglas del club (múltiplos de 30, la
 * mínima no mayor que la máxima, rangos, horarios) las valida el backend y se muestran en cada campo.
 */
function aConfiguracion(f: Formulario): { config?: ConfiguracionClub; errores?: Record<string, string> } {
    const e: Record<string, string> = {};
    const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
    const valores = {
        montoReserva: num(f.montoReserva), montoXMediaHora: num(f.montoXMediaHora), porcentajeSenia: num(f.porcentajeSenia),
        duracionMinimaTurno: num(f.duracionMinimaTurno), duracionMaximaTurno: num(f.duracionMaximaTurno),
        reembolsoTotal: Math.round(num(f.horasReembolsoTotal) * 60), reembolsoSenia: Math.round(num(f.horasReembolsoSenia) * 60),
        minutosRecordatorio: num(f.minutosRecordatorio), diasAnticipacion: num(f.diasAnticipacion),
    };
    for (const [campo, v] of Object.entries(valores)) {
        if (Number.isNaN(v)) e[campo] = "Es obligatorio.";
    }
    const abiertos = f.horarios.filter(h => h.abre);
    if (abiertos.length === 0) e.horarios = "El club tiene que abrir al menos un día.";
    for (const h of abiertos) {
        if (!h.apertura || !h.cierre) e[`horario-${h.dia}`] = "Indicá la apertura y el cierre.";
    }
    if (Object.keys(e).length) return { errores: e };
    return {
        config: {
            montoReserva: valores.montoReserva, montoXMediaHora: valores.montoXMediaHora, porcentajeSenia: valores.porcentajeSenia,
            duracionMinimaTurno: valores.duracionMinimaTurno, duracionMaximaTurno: valores.duracionMaximaTurno,
            minutosReembolsoTotal: valores.reembolsoTotal, minutosReembolsoSenia: valores.reembolsoSenia,
            recordatorioActivo: f.recordatorioActivo, minutosRecordatorio: valores.minutosRecordatorio,
            whatsappClientes: f.whatsappClientes,
            reservasOnline: f.reservasOnline,
            mensajeReservasPausadas: f.mensajeReservasPausadas.trim() || null,
            diasAnticipacion: valores.diasAnticipacion,
            horarios: abiertos.map((h): HorarioDia => ({ dia: h.dia, apertura: h.apertura, cierre: h.cierre })),
        },
    };
}

/** Los errores por campo del backend, con los nombres del formulario (horarios[i] → el día) */
function erroresDelBackend(err: unknown, f: Formulario): Record<string, string> {
    const crudos = extraerErrores(err, "No se pudo guardar la configuración.") as Record<string, string | undefined>;
    const abiertos = f.horarios.filter(h => h.abre);
    const e: Record<string, string> = {};
    for (const [campo, mensaje] of Object.entries(crudos)) {
        if (!mensaje) continue;
        const horario = campo.match(/^horarios\[(\d+)\]/);
        const nombre = horario ? `horario-${abiertos[Number(horario[1])]?.dia ?? ""}`
            : campo === "minutosReembolsoTotal" ? "reembolsoTotal"
                : campo === "minutosReembolsoSenia" ? "reembolsoSenia"
                    : campo;
        e[nombre] = mensaje;
    }
    return e;
}

/* ─── Días cerrados (se guardan al momento, aparte del formulario) ── */
function DiasCerrados() {
    const [version, setVersion] = useState(0);
    const [lista, setLista] = useState<DiaCerrado[] | null>(null);
    const [errorLista, setErrorLista] = useState<string | null>(null);
    const [fecha, setFecha] = useState<string | null>(null);
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [resultado, setResultado] = useState<CancelacionesResultado | null>(null);
    const [fuera, setFuera] = useState<FueraDeHorario | null>(null);
    const [reabriendo, setReabriendo] = useState<DiaCerrado | null>(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        let activo = true;
        adminService.cierres()
            .then(l => { if (activo) { setLista(l); setErrorLista(null); } })
            .catch(e => { if (activo) setErrorLista(extraerErrores(e, "No se pudieron cargar los días cerrados.").general ?? null); });
        return () => { activo = false; };
    }, [version]);

    const cerrar = async (confirmar = false) => {
        const e: Record<string, string> = {};
        if (!fecha) e.fecha = "Elegí el día.";
        if (!motivo.trim()) e.motivo = "Escribí el motivo (lo ven los clientes).";
        setErrores(e);
        if (!fecha || Object.keys(e).length) return;
        setOcupado(true);
        setError(null);
        setMensaje(null);
        try {
            const c = await adminService.cerrarDia({ fecha, motivo: motivo.trim(), confirmar });
            setFuera(null);
            setResultado(c.cancelaciones ?? null);
            setMensaje(`El club queda cerrado el ${formatFecha(c.fecha)}.${textoCanceladas(c.cancelaciones)}`);
            setFecha(null);
            setMotivo("");
            setVersion(v => v + 1);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 409 && err.response.data?.reservasFueraDeHorario) {
                setFuera(err.response.data as FueraDeHorario);
            } else {
                setFuera(null);
                const crudos = extraerErrores(err, "No se pudo cerrar el día.") as Record<string, string | undefined>;
                setErrores({ ...(crudos.fecha ? { fecha: crudos.fecha } : {}), ...(crudos.motivo ? { motivo: crudos.motivo } : {}) });
                setError(crudos.general ?? null);
            }
        } finally {
            setOcupado(false);
        }
    };

    const reabrir = async () => {
        if (!reabriendo) return;
        setOcupado(true);
        try {
            await adminService.abrirDia(reabriendo.fecha);
            setMensaje(`El ${formatFecha(reabriendo.fecha)} el club vuelve a abrir. Las reservas que se cancelaron al cerrarlo no vuelven.`);
            setResultado(null);
            setReabriendo(null);
            setVersion(v => v + 1);
        } catch (err) {
            setError(extraerErrores(err, "No se pudo reabrir el día.").general ?? null);
            setReabriendo(null);
        } finally {
            setOcupado(false);
        }
    };

    return (
        <>
            {fuera && (
                <ModalFueraDeHorario fuera={fuera} guardando={ocupado} onCerrar={() => setFuera(null)} onConfirmar={() => void cerrar(true)}
                    titulo={`El ${fecha ? formatFecha(fecha) : "día"} hay reservas`} textoConfirmar="Cerrar y cancelarlas" />
            )}
            {reabriendo && (
                <ModalConfirmacion
                    titulo={`¿Reabrir el ${formatFecha(reabriendo.fecha)}?`}
                    descripcion="Ese día se vuelve a poder reservar. Las reservas que se cancelaron al cerrarlo no vuelven."
                    icono={<DoorOpen size={22} />}
                    textoConfirmar="Sí, reabrir"
                    cargando={ocupado}
                    onCerrar={() => setReabriendo(null)}
                    onConfirmar={() => void reabrir()}
                />
            )}

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            <SinCancelar resultado={resultado} />

            <section className="admin-tarjeta config-seccion">
                <h2 className="admin-tarjeta__titulo config-seccion__titulo"><DoorClosed size={16} /> Cerrar el club un día</h2>
                <p className="modal__descripcion">
                    Un feriado o una obra: ese día no se puede reservar y los turnos fijos no crean su partido. Si ya hay reservas, antes
                    se muestra la lista y, si confirmás, se cancelan con reembolso total y aviso al cliente. Se guarda al momento.
                </p>
                <div className="config-cierre">
                    <div className="campo">
                        <span className="campo__etiqueta">Día</span>
                        <SelectorFecha valor={fecha} onChange={f => { setFecha(f); setErrores({}); setError(null); }} />
                        {errores.fecha && <p className="config-error">{errores.fecha}</p>}
                    </div>
                    <CampoInput id="cierre-motivo" name="motivo" label="Motivo (lo ven los clientes)" value={motivo} placeholder="Ej. Navidad, mantenimiento"
                        onChange={e => { setMotivo(e.target.value.slice(0, 200)); setErrores({}); setError(null); }} error={errores.motivo} />
                    <button type="button" className="accion accion--primaria config-cierre__boton" onClick={() => void cerrar()} disabled={ocupado}>
                        <DoorClosed size={15} /> {ocupado ? "Cerrando..." : "Cerrar el día"}
                    </button>
                </div>
                {error && <Mensaje tipo="error">{error}</Mensaje>}
            </section>

            <section className="admin-tarjeta config-seccion">
                <h2 className="admin-tarjeta__titulo config-seccion__titulo"><CalendarRange size={16} /> Próximos días cerrados</h2>
                {errorLista && <Mensaje tipo="error">{errorLista}</Mensaje>}
                {!lista ? (!errorLista && <Cargando />) : lista.length === 0 ? (
                    <p className="modal__descripcion">No hay días cerrados de hoy en adelante: el club abre según el horario de cada semana.</p>
                ) : (
                    <ul className="config-cierres">
                        {lista.map(c => (
                            <li key={c.fecha}>
                                <div>
                                    <strong style={{ textTransform: "capitalize" }}>{formatFecha(c.fecha)}</strong>
                                    <span>{c.motivo}</span>
                                </div>
                                <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setReabriendo(c); }}>
                                    <DoorOpen size={14} /> Reabrir
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}

/* ─── Página ─────────────────────────────────────── */
/**
 * Configuración del club (ADMIN), en pestañas y toda junta (GET/PUT /admin/configuracion): precio del
 * turno y seña, duración de los turnos, política de cancelación, recordatorio, anticipación y días y
 * horarios de apertura. Rige para lo que se reserve o se cobre desde ahora. Las reglas las valida el
 * backend (los errores salen en cada campo). Si el horario nuevo deja afuera reservas o turnos fijos,
 * el backend responde 409 con la lista y se puede guardar igual (no se tocan).
 */
export default function Configuracion() {
    const [version, setVersion] = useState(0);
    const [guardada, setGuardada] = useState<ConfiguracionClub | null>(null);
    const [form, setForm] = useState<Formulario | null>(null);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [fuera, setFuera] = useState<FueraDeHorario | null>(null);
    const [resultado, setResultado] = useState<CancelacionesResultado | null>(null);

    // Pestaña (queda en la URL: ?tab=horarios). Es un solo formulario: se guarda todo junto
    const [searchParams, setSearchParams] = useSearchParams();
    const seccion = SECCIONES.find(s => s.id === searchParams.get("tab"))?.id ?? "precio";
    const elegirSeccion = (id: Seccion) => setSearchParams(id === "precio" ? {} : { tab: id }, { replace: true });

    useEffect(() => {
        let activo = true;
        adminService.configuracion()
            .then(c => { if (activo) { setGuardada(c); setForm(aFormulario(c)); setErrorCarga(null); } })
            .catch(e => { if (activo) setErrorCarga(extraerErrores(e, "No se pudo cargar la configuración.").general ?? "No se pudo cargar la configuración."); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [version]);

    const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
        setForm(f => f && { ...f, [campo]: valor });
        setErrores({});
        setError(null);
        setMensaje(null);
    };
    const cambiarDia = (dia: string, cambios: Partial<Formulario["horarios"][number]>) =>
        cambiar("horarios", form!.horarios.map(h => h.dia === dia ? { ...h, ...cambios } : h));
    /** El horario de un día pasa a todos los días que abren */
    const copiarATodos = (dia: string) => {
        const base = form!.horarios.find(h => h.dia === dia)!;
        cambiar("horarios", form!.horarios.map(h => h.abre ? { ...h, apertura: base.apertura, cierre: base.cierre } : h));
    };

    const hayCambios = form !== null && guardada !== null && JSON.stringify(form) !== JSON.stringify(aFormulario(guardada));

    /** Muestra los errores y lleva a la pestaña del primero (si no está en la actual) */
    const mostrarErrores = (e: Record<string, string>, general: string | null) => {
        const campos = Object.keys(e).filter(c => c !== "general");
        const destino = campos.length ? seccionDe(campos[0]) : general ? seccionDelMensaje(general) : null;
        setErrores(e);
        if (destino && !campos.some(c => seccionDe(c) === seccion) && destino !== seccion) elegirSeccion(destino);
        setError(general ?? `Revisá los datos marcados en "${SECCIONES.find(s => s.id === destino)?.etiqueta}".`);
    };

    const guardar = async (confirmar = false) => {
        if (!form) return;
        const { config, errores: e } = aConfiguracion(form);
        if (!config) { mostrarErrores(e ?? {}, null); return; }
        setGuardando(true);
        setError(null);
        try {
            const c = await adminService.actualizarConfiguracion({ ...config, confirmar });
            setGuardada(c);
            setForm(aFormulario(c));
            setFuera(null);
            setResultado(c.cancelaciones);
            setMensaje(`Configuración guardada. Rige para lo que se reserve o se cobre desde ahora; las reservas existentes conservan su precio y su seña.${textoCanceladas(c.cancelaciones)}`);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 409 && err.response.data?.reservasFueraDeHorario) {
                setFuera(err.response.data as FueraDeHorario);
            } else {
                setFuera(null);
                const e2 = erroresDelBackend(err, form);
                const general = e2.general ?? null;
                delete e2.general;
                mostrarErrores(e2, general ?? (Object.keys(e2).length ? null : "No se pudo guardar la configuración."));
            }
        } finally {
            setGuardando(false);
        }
    };

    // Precio de cada duración: el monto base es el turno mínimo y cada media hora de más suma
    const base = Number(form?.montoReserva) || 0;
    const media = Number(form?.montoXMediaHora) || 0;
    const porcentaje = Number(form?.porcentajeSenia) || 0;
    const minima = Number(form?.duracionMinimaTurno) || 0;
    const maxima = Number(form?.duracionMaximaTurno) || 0;
    const ejemplos = minima > 0 && maxima >= minima
        ? Array.from({ length: Math.min(8, Math.floor((maxima - minima) / 30) + 1) }, (_, i) => minima + i * 30)
        : [];

    return (
        <div className="admin-pagina">
            {fuera && (
                <ModalFueraDeHorario fuera={fuera} guardando={guardando} onCerrar={() => setFuera(null)} onConfirmar={() => void guardar(true)} />
            )}

            <Encabezado
                titulo="Configuración"
                descripcion="Reglas del club: precio del turno y seña, duración, cancelación, recordatorio, hasta cuándo se puede reservar, las reservas online y los horarios. Rige para lo que se reserve desde ahora."
                acciones={<BotonActualizar onClick={() => { setCargando(true); setVersion(v => v + 1); }} cargando={cargando} />}
            />

            {errorCarga && <Mensaje tipo="error">{errorCarga}</Mensaje>}
            {guardada && guardada.reservasOnline === false && (
                <div className="config-pausadas" role="status">
                    <CirclePause size={18} />
                    <span>Las reservas online están <strong>pausadas</strong>: los clientes no pueden reservar desde la web. El personal sigue cargando reservas desde el panel.</span>
                    {seccion !== "online" && (
                        <button type="button" className="accion accion--chica" onClick={() => elegirSeccion("online")}>Ver</button>
                    )}
                </div>
            )}
            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            <SinCancelar resultado={resultado} />

            {!form ? (cargando && <Cargando />) : (
                <>
                    <Pestanas etiqueta="Secciones de la configuración" opciones={SECCIONES} valor={seccion} onChange={elegirSeccion} />

                    {/* ── Precio del turno ── */}
                    {seccion === "precio" && (
                        <section className="admin-tarjeta config-seccion">
                            <h2 className="admin-tarjeta__titulo config-seccion__titulo"><Coins size={16} /> Precio del turno</h2>
                            <div className="admin-form__fila">
                                <CampoInput id="cf-monto" name="montoReserva" label={`Turno mínimo (${duracionTexto(minima)})`} type="number" prefijo="$" min={0} paso={0.01}
                                    value={form.montoReserva} onChange={e => cambiar("montoReserva", e.target.value)} error={errores.montoReserva} />
                                <CampoInput id="cf-media" name="montoXMediaHora" label="Por cada media hora de más" type="number" prefijo="$" min={0} paso={0.01}
                                    value={form.montoXMediaHora} onChange={e => cambiar("montoXMediaHora", e.target.value)} error={errores.montoXMediaHora} />
                            </div>
                            <CampoInput id="cf-senia" name="porcentajeSenia" label="Seña (% del total)" type="number" sufijo="%" min={0} max={100} paso={0.01}
                                value={form.porcentajeSenia} onChange={e => cambiar("porcentajeSenia", e.target.value)} error={errores.porcentajeSenia} />
                            <p className="modal__descripcion">
                                El turno mínimo cuesta el monto base; cada media hora por encima del mínimo suma el monto por media hora.
                            </p>
                            <dl className="config-ejemplos">
                                {ejemplos.map(d => {
                                    const precio = base + media * ((d - minima) / 30);
                                    return (
                                        <div key={d}>
                                            <dt>{duracionTexto(d)}</dt>
                                            <dd>{formatMonto(precio)} <span>· seña {formatMonto(precio * porcentaje / 100)}</span></dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </section>
                    )}

                    {/* ── Duración ── */}
                    {seccion === "duracion" && (
                        <section className="admin-tarjeta config-seccion">
                            <h2 className="admin-tarjeta__titulo config-seccion__titulo"><Clock size={16} /> Duración de los turnos</h2>
                            <div className="admin-form__fila">
                                <CampoInput id="cf-dur-min" name="duracionMinimaTurno" label="Mínima" type="number" entero min={0} sufijo="min"
                                    value={form.duracionMinimaTurno} onChange={e => cambiar("duracionMinimaTurno", e.target.value)} error={errores.duracionMinimaTurno} />
                                <CampoInput id="cf-dur-max" name="duracionMaximaTurno" label="Máxima" type="number" entero min={0} sufijo="min"
                                    value={form.duracionMaximaTurno} onChange={e => cambiar("duracionMaximaTurno", e.target.value)} error={errores.duracionMaximaTurno} />
                            </div>
                            <p className="config-equivale">
                                Mínima: <strong>{duracionTexto(minima)}</strong> · Máxima: <strong>{duracionTexto(maxima)}</strong>
                            </p>
                            <p className="modal__descripcion">En minutos, de a 30 (entre 30 y 600). Los turnos ya reservados conservan su duración.</p>
                        </section>
                    )}

                    {/* ── Cancelación ── */}
                    {seccion === "cancelacion" && (
                        <section className="admin-tarjeta config-seccion">
                            <h2 className="admin-tarjeta__titulo config-seccion__titulo"><XCircle size={16} /> Cancelación del cliente</h2>
                            <div className="admin-form__fila">
                                <CampoInput id="cf-reemb-total" name="horasReembolsoTotal" label="Devolver todo, hasta" type="number" sufijo="h antes" min={0} max={168} paso={0.5}
                                    value={form.horasReembolsoTotal} onChange={e => cambiar("horasReembolsoTotal", e.target.value)} error={errores.reembolsoTotal} />
                                <CampoInput id="cf-reemb-senia" name="horasReembolsoSenia" label="Devolver la seña, hasta" type="number" sufijo="h antes" min={0} max={168} paso={0.5}
                                    value={form.horasReembolsoSenia} onChange={e => cambiar("horasReembolsoSenia", e.target.value)} error={errores.reembolsoSenia} />
                            </div>
                            <p className="modal__descripcion">
                                Si el cliente cancela con {form.horasReembolsoTotal || "—"} h o más de anticipación se le devuelve todo; con {form.horasReembolsoSenia || "—"} h o más, la seña; después, nada.
                            </p>
                        </section>
                    )}

                    {/* ── Avisos a los clientes (recordatorio y WhatsApp) y anticipación ── */}
                    {seccion === "avisos" && (
                        <section className="admin-tarjeta config-seccion">
                            <h2 className="admin-tarjeta__titulo config-seccion__titulo"><AlarmClock size={16} /> Avisos a los clientes y anticipación</h2>
                            <CampoToggle id="cf-recordatorio" name="recordatorioActivo" label="Recordatorio del turno"
                                descripcion="Le llega al cliente (y a los jugadores con cuenta) antes de jugar, por su medio de avisos."
                                checked={form.recordatorioActivo} onChange={e => cambiar("recordatorioActivo", e.target.checked)} />
                            {form.recordatorioActivo && (
                                <>
                                    <CampoInput id="cf-rec-min" name="minutosRecordatorio" label="Cuánto antes" type="number" entero min={0} sufijo="min antes"
                                        value={form.minutosRecordatorio} onChange={e => cambiar("minutosRecordatorio", e.target.value)} error={errores.minutosRecordatorio} />
                                    <p className="config-equivale">
                                        = <strong>{duracionTexto(Number(form.minutosRecordatorio))}</strong> antes del turno (entre 15 minutos y 24 horas)
                                    </p>
                                </>
                            )}
                            <CampoToggle id="cf-whatsapp" name="whatsappClientes" label="Mandar WhatsApp a los clientes"
                                descripcion="Los avisos de sus reservas y el código para verificar el celular. Apagado, a los clientes les llega todo por mail y no tienen que verificar el celular para reservar. A vos y al personal no les cambia nada."
                                checked={form.whatsappClientes} onChange={e => cambiar("whatsappClientes", e.target.checked)} />
                            {guardada && form.whatsappClientes !== (guardada.whatsappClientes ?? true) && (
                                <p className="config-equivale">
                                    <MessageCircle size={13} />{" "}
                                    {form.whatsappClientes
                                        ? "Al guardar, los clientes que eligieron WhatsApp lo vuelven a recibir. Los que no verificaron el celular lo van a tener que verificar para reservar."
                                        : "Al guardar, a los clientes les llega todo por mail y pueden reservar sin verificar el celular."}
                                </p>
                            )}
                            <CampoInput id="cf-dias" name="diasAnticipacion" label="El cliente reserva hasta" type="number" entero sufijo="días adelante" min={0} max={365}
                                value={form.diasAnticipacion} onChange={e => cambiar("diasAnticipacion", e.target.value)} error={errores.diasAnticipacion} />
                            <p className="modal__descripcion">También es el tope de los partidos que se crean solos para los turnos fijos. El personal puede reservar más adelante.</p>
                        </section>
                    )}

                    {/* ── Reservas online: el ADMIN las pausa (por ejemplo, mientras cambia los precios) ── */}
                    {seccion === "online" && (
                        <section className="admin-tarjeta config-seccion">
                            <h2 className="admin-tarjeta__titulo config-seccion__titulo"><Globe size={16} /> Reservas online</h2>
                            <CampoToggle id="cf-reservas-online" name="reservasOnline" label="Los clientes pueden reservar desde la web"
                                descripcion="Apagalo mientras evaluás cambios (precios, horarios u otra cosa). Las reservas que ya existen, los pagos de seña pendientes, las cancelaciones y los turnos fijos siguen igual, y vos y el personal siguen cargando reservas desde el panel."
                                checked={form.reservasOnline} onChange={e => cambiar("reservasOnline", e.target.checked)} />
                            {!form.reservasOnline && (
                                <CampoTexto id="cf-mensaje-pausadas" label="Mensaje para los clientes (opcional)" maximo={200} filas={3}
                                    placeholder="Ej: Estamos actualizando los precios. Volvemos a tomar reservas el lunes."
                                    value={form.mensajeReservasPausadas} onChange={v => cambiar("mensajeReservasPausadas", v)}
                                    error={errores.mensajeReservasPausadas} />
                            )}
                            {guardada && form.reservasOnline !== (guardada.reservasOnline ?? true) && (
                                <p className="config-equivale">
                                    <CirclePause size={13} />{" "}
                                    {form.reservasOnline
                                        ? "Al guardar, los clientes vuelven a reservar desde la web."
                                        : "Al guardar, los clientes ven el aviso en lugar de los turnos y no pueden reservar hasta que lo vuelvas a prender."}
                                </p>
                            )}
                        </section>
                    )}

                    {/* ── Horarios: un renglón por día, con la franja abierta dibujada sobre el día ── */}
                    {seccion === "horarios" && (
                        <section className="admin-tarjeta config-seccion">
                            <h2 className="admin-tarjeta__titulo config-seccion__titulo"><CalendarRange size={16} /> Días y horarios de apertura</h2>
                            <p className="modal__descripcion">
                                Los turnos empiezan cada 30 minutos desde la apertura. Si un cambio deja afuera reservas o turnos fijos ya hechos,
                                antes de guardar se muestra la lista y, si confirmás, se cancelan con reembolso total y aviso al cliente.
                            </p>
                            {errores.horarios && <p className="config-error">{errores.horarios}</p>}
                            <div className="config-semana" role="table" aria-label="Horarios de la semana">
                                <div className="config-semana__fila config-semana__fila--cabecera" role="row">
                                    <span role="columnheader">Día</span>
                                    <span role="columnheader">Horario</span>
                                    <span role="columnheader" className="config-semana__escala" aria-hidden="true">
                                        {[0, 6, 12, 18, 24].map(h => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{h}</span>)}
                                    </span>
                                    <span role="columnheader" aria-label="Acciones" />
                                </div>
                                {form.horarios.map(h => {
                                    const desde = aMinutos(h.apertura);
                                    const hasta = h.cierre === "00:00" ? 1440 : aMinutos(h.cierre);
                                    return (
                                        <div key={h.dia} role="row" className={`config-semana__fila${h.abre ? "" : " config-semana__fila--cerrado"}`}>
                                            <span role="cell" className="config-semana__dia">
                                                <label className="config-semana__switch">
                                                    <input type="checkbox" checked={h.abre} onChange={e => cambiarDia(h.dia, { abre: e.target.checked })}
                                                        aria-label={`${h.dia}: ${h.abre ? "abre" : "cerrado"}`} />
                                                    <span aria-hidden="true" />
                                                </label>
                                                {h.dia}
                                            </span>
                                            <span role="cell" className="config-semana__horas">
                                                {h.abre ? <>
                                                    <SelectorHora valor={h.apertura} etiqueta={`${h.dia}, abre`}
                                                        onChange={v => cambiarDia(h.dia, { apertura: v })} />
                                                    <span>a</span>
                                                    <SelectorHora valor={h.cierre} etiqueta={`${h.dia}, cierra`} opciones={CIERRES}
                                                        onChange={v => cambiarDia(h.dia, { cierre: v })} />
                                                </> : <span className="config-semana__cerrado">Cerrado</span>}
                                            </span>
                                            <span role="cell" className="config-semana__barra" aria-hidden="true">
                                                {h.abre && hasta > desde && (
                                                    <span style={{ left: `${(desde / 1440) * 100}%`, width: `${((hasta - desde) / 1440) * 100}%` }} />
                                                )}
                                            </span>
                                            <span role="cell">
                                                {h.abre && (
                                                    <button type="button" className="accion accion--chica" onClick={() => copiarATodos(h.dia)}
                                                        title="Usar este horario en todos los días que abren" aria-label={`Copiar el horario del ${h.dia.toLowerCase()} a todos los días`}>
                                                        <Copy size={13} /><span className="config-semana__copiar">A todos</span>
                                                    </button>
                                                )}
                                            </span>
                                            {errores[`horario-${h.dia}`] && <p className="config-error config-semana__error">{errores[`horario-${h.dia}`]}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {seccion === "cierres" && <DiasCerrados />}

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    {/* Guardar o descartar: a la vista mientras haya cambios (los días cerrados se guardan aparte) */}
                    {(seccion !== "cierres" || hayCambios) && <div className={`config-acciones${hayCambios ? " config-acciones--cambios" : ""}`}>
                        <span className="config-acciones__estado">{hayCambios ? "Tenés cambios sin guardar." : "Sin cambios."}</span>
                        <div className="config-acciones__botones">
                            <button type="button" className="accion" disabled={!hayCambios || guardando}
                                onClick={() => { if (guardada) setForm(aFormulario(guardada)); setErrores({}); setError(null); }}>
                                <Undo2 size={15} /> Descartar
                            </button>
                            <button type="button" className="accion accion--primaria" disabled={!hayCambios || guardando} onClick={() => void guardar()}>
                                <Save size={15} /> {guardando ? "Guardando..." : "Guardar cambios"}
                            </button>
                        </div>
                    </div>}
                </>
            )}
        </div>
    );
}
