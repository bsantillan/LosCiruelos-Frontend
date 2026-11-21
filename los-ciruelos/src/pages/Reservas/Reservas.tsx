import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Clock, AlertCircle, CalendarDays, CheckCircle2, UserCog, LogIn, UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useCanchas } from "../../hooks/useCanchas";
import { useDisponibilidad } from "../../hooks/useDisponibilidad";
import { useCierresClub } from "../../hooks/useCierresClub";
import { useProductosDisponibles } from "../../hooks/useProductosDisponibles";
import { useReserva } from "../../hooks/useReserva";
import { useMisReservas } from "../../hooks/useMisReservas";
import type {
    CanchaResponse, DisponibilidadResponse, ReservaResponse, SlotLibre,
} from "../../types/reserva.types";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import { ListaProductos } from "../../components/SelectorProducto/SelectorProducto";
import { aPedido, cantidadesDe, lineasProductos, totalProductos, type Cantidades } from "../../utils/productos";
import { DetallePendiente } from "../../components/DetalleCancelacion/DetalleCancelacion";
import SelectorFecha from "../../components/ui/SelectorFecha/SelectorFecha";
import HojaInferior from "../../components/ui/HojaInferior/HojaInferior";
import { MEDIA_MOVIL, useMediaQuery } from "../../hooks/useMediaQuery";
import { borrarSeleccion, guardarSeleccion, leerSeleccion } from "../../utils/seleccionReserva";
import { formatFecha, formatMonto, horaCorta, hoyISO, minToTime, timeToMin } from "../../utils/fechas";
import { admiteCancelacion, esPendienteVigente, pagoEnProceso } from "../../utils/reservas";
import "./Reservas.css";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";

const PASO_DURACION = 30;
// Para el aviso de "reserva sin pagar": solo las pendientes que todavía ocupan su turno
const FILTRO_PENDIENTES = { tipo: "proximas" as const, estado: ["PENDIENTE" as const], size: 5 };

/* ─── TABS DE CANCHAS ────────────────────────────── */
function TabsCanchas({
    canchas,
    activa,
    onSeleccionar,
}: {
    canchas: CanchaResponse[];
    activa: number | null;
    onSeleccionar: (id: number) => void;
}) {
    return (
        <div className="reservas-tabs" role="tablist" aria-label="Canchas">
            {canchas.map(c => {
                // Una cancha dada de baja se muestra, pero no se puede elegir
                const disponible = c.activa !== false;
                return (
                    <button
                        key={c.id}
                        role="tab"
                        aria-selected={activa === c.id}
                        aria-disabled={!disponible}
                        disabled={!disponible}
                        title={disponible ? undefined : `La cancha ${c.numero} no está disponible por el momento`}
                        className={`reservas-tab${activa === c.id ? " reservas-tab--activa" : ""}${disponible ? "" : " reservas-tab--inactiva"}`}
                        onClick={() => onSeleccionar(c.id)}
                    >
                        <span className="reservas-tab__nombre">Cancha {c.numero}</span>
                        <span className="reservas-tab__desc">{disponible ? c.descripcion : "No disponible por el momento"}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ─── SELECTOR DE DURACIÓN ───────────────────────── */
function SelectorDuracion({
    duracion,
    min,
    max,
    onChange,
}: {
    duracion: number;
    min: number;
    max: number;
    onChange: (d: number) => void;
}) {
    return (
        <div className="reservas-duracion">
            <Clock size={14} />
            <span className="reservas-duracion__label">Duración</span>
            <button
                className="reservas-duracion__btn"
                onClick={() => onChange(Math.max(min, duracion - PASO_DURACION))}
                disabled={duracion <= min}
                aria-label="Menos tiempo"
            >-</button>
            <span className="reservas-duracion__valor">{duracion} min</span>
            <button
                className="reservas-duracion__btn"
                onClick={() => onChange(Math.min(max, duracion + PASO_DURACION))}
                disabled={duracion >= max}
                aria-label="Más tiempo"
            >+</button>
        </div>
    );
}

/** Hoy ya no quedan horarios por delante: el backend devuelve horarioMinimoInicio en null */
function cerradoPorHoy(disponibilidad: DisponibilidadResponse | null, fecha: string): boolean {
    return disponibilidad !== null && fecha === hoyISO() && disponibilidad.horarioMinimoInicio === null;
}

/* ─── LÍNEA DE TIEMPO ────────────────────────────── */
type ItemTimeline =
    | { tipo: "libre"; inicio: number; slot: SlotLibre }
    | { tipo: "ocupado"; inicio: number; fin: number };

function LineaTiempo({
    disponibilidad,
    turnosLibres,
    fecha,
    slotSeleccionado,
    onSeleccionar,
    cargando,
    error,
}: {
    disponibilidad: DisponibilidadResponse | null;
    turnosLibres: SlotLibre[];
    fecha: string;
    slotSeleccionado: SlotLibre | null;
    onSeleccionar: (slot: SlotLibre) => void;
    cargando: boolean;
    error: string | null;
}) {
    if (cargando) {
        return (
            <div className="reservas-cargando">
                <div className="reservas-cargando__spinner" />
                <span>Cargando horarios...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="reservas-aviso">
                <AlertCircle size={20} />
                <p>{error}</p>
            </div>
        );
    }

    if (!disponibilidad) return null;

    // Sin turnos libres solo se muestra el aviso, sin la lista de ocupados
    if (turnosLibres.length === 0) {
        return (
            <div className="reservas-aviso">
                <Clock size={20} />
                {cerradoPorHoy(disponibilidad, fecha) ? (
                    <p>
                        El club cierra a las {horaCorta(disponibilidad.horarioCierre)} y ya no quedan turnos para hoy.
                        Elegí otro día para reservar.
                    </p>
                ) : (
                    <p>No quedan turnos libres de esta duración. Probá con otra cancha, otro día o menos tiempo.</p>
                )}
            </div>
        );
    }

    // Hoy: los ocupados que ya terminaron no aportan nada
    const desde = disponibilidad.horarioMinimoInicio ? timeToMin(disponibilidad.horarioMinimoInicio) : 0;
    const items: ItemTimeline[] = [
        ...turnosLibres.map(s => ({ tipo: "libre" as const, inicio: s.inicio, slot: s })),
        ...disponibilidad.slotsOcupados
            .map(o => ({ tipo: "ocupado" as const, inicio: timeToMin(o.horaInicio), fin: timeToMin(o.horaFin) }))
            .filter(o => o.fin > desde),
    ].sort((a, b) => a.inicio - b.inicio);

    return (
        <div className="reservas-timeline">
            <div className="reservas-timeline__rango">
                <span>{horaCorta(disponibilidad.horarioApertura)}</span>
                <div className="reservas-timeline__linea" />
                <span>{horaCorta(disponibilidad.horarioCierre)}</span>
            </div>

            <div className="reservas-timeline__items">
                {items.map((item, i) =>
                    item.tipo === "libre" ? (
                        <motion.button
                            key={`libre-${item.inicio}`}
                            className={`timeline-slot${slotSeleccionado?.inicio === item.slot.inicio ? " timeline-slot--activo" : ""}`}
                            onClick={() => onSeleccionar(item.slot)}
                            aria-pressed={slotSeleccionado?.inicio === item.slot.inicio}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.4), ease: "easeOut" }}
                            whileHover={{ scale: 1.01 }}
                        >
                            <span className="timeline-slot__hora">
                                {minToTime(item.slot.inicio)} – {minToTime(item.slot.fin)}
                            </span>
                            <span className="timeline-slot__badge">Disponible</span>
                        </motion.button>
                    ) : (
                        <div key={`ocupado-${item.inicio}`} className="timeline-ocupado">
                            <span className="timeline-ocupado__hora">
                                {minToTime(item.inicio)} – {minToTime(item.fin)}
                            </span>
                            <span className="timeline-ocupado__label">Ocupado</span>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

/* ─── PANEL DE RESUMEN ───────────────────────────── */
type BloqueoReserva = "invitado" | "perfil" | null;
type DestinoBloqueo = "login" | "register" | "perfil";

function PanelResumen({
    cancha,
    fecha,
    slot,
    precioCancha,
    onConfirmar,
    onLimpiar,
    cargando,
    enHoja = false,
    bloqueo = null,
    onIrA,
    cantidadesIniciales,
}: {
    cancha: CanchaResponse;
    fecha: string;
    slot: SlotLibre;
    /** Precio de la cancha para la duración elegida (null si el backend no lo informa) */
    precioCancha: number | null;
    onConfirmar: (cantidades: Cantidades) => void;
    onLimpiar: () => void;
    cargando: boolean;
    /** Dentro de la hoja inferior (celular): sin tarjeta propia; se cierra con la X de la hoja */
    enHoja?: boolean;
    /** Por qué todavía no se puede reservar: sin sesión, o con el perfil incompleto (el backend daría 403) */
    bloqueo?: BloqueoReserva;
    /** Ir a iniciar sesión, registrarse o completar el perfil, guardando el turno y los extras elegidos */
    onIrA?: (destino: DestinoBloqueo, cantidades: Cantidades) => void;
    /** Al retomar un turno elegido antes de iniciar sesión */
    cantidadesIniciales?: Cantidades;
}) {
    const [cantidades, setCantidades] = useState<Cantidades>(cantidadesIniciales ?? {});
    const stock = useProductosDisponibles(fecha, minToTime(slot.inicio), minToTime(slot.fin));

    const lineas = lineasProductos(stock.productos, cantidades);
    const extras = totalProductos(stock.productos, cantidades);
    const total = precioCancha !== null ? precioCancha + extras : null;

    return (
        <motion.div
            className={`reservas-resumen${enHoja ? " reservas-resumen--hoja" : ""}`}
            initial={enHoja ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: "easeOut", duration: 0.3 }}
        >
            <div className="reservas-resumen__header">
                <div>
                    <p className="reservas-resumen__cancha">Cancha {cancha.numero}</p>
                    <p className="reservas-resumen__fecha">{formatFecha(fecha)}</p>
                    <p className="reservas-resumen__horario">
                        {minToTime(slot.inicio)} – {minToTime(slot.fin)} hs
                    </p>
                </div>
                {!enHoja && (
                    <button type="button" className="accion accion--chica" onClick={onLimpiar}>
                        Cambiar
                    </button>
                )}
            </div>

            <div className="reservas-resumen__extras">
                <ListaProductos
                    productos={stock.productos}
                    cantidades={cantidades}
                    cargando={stock.cargando}
                    onChange={setCantidades}
                />
                {stock.error && <p className="reservas-resumen__nota">{stock.error}</p>}
            </div>

            {/* Precio: se actualiza al sumar o quitar productos */}
            <dl className="reservas-precio">
                <div>
                    <dt>Cancha · {slot.fin - slot.inicio} min</dt>
                    <dd>{precioCancha !== null ? formatMonto(precioCancha) : "Al confirmar"}</dd>
                </div>
                {lineas.map(l => (
                    <div key={l.id}>
                        <dt>{l.cantidad} × {l.nombre} ({formatMonto(l.precio)})</dt>
                        <dd>{formatMonto(l.subtotal)}</dd>
                    </div>
                ))}
                <div className="reservas-precio__total">
                    <dt>{total !== null ? "Total" : "Extras"}</dt>
                    <dd>{formatMonto(total ?? extras)}</dd>
                </div>
            </dl>

            {bloqueo === null && (
                <p className="reservas-resumen__nota">
                    {precioCancha === null && "El precio de la cancha se muestra en el próximo paso. "}
                    El turno queda reservado por 15 minutos mientras completás el pago.
                </p>
            )}

            {/* Visitante: para reservar hace falta una cuenta. El turno elegido se guarda. */}
            {bloqueo === "invitado" && (
                <>
                    <p className="reservas-resumen__bloqueo">
                        <LogIn size={15} />
                        Para reservar necesitás una cuenta. Guardamos el turno que elegiste para que sigas después.
                    </p>
                    <button className="reservas-resumen__confirmar" onClick={() => onIrA?.("login", cantidades)}>
                        Iniciar sesión para reservar
                    </button>
                    <button type="button" className="accion accion--ancha" onClick={() => onIrA?.("register", cantidades)}>
                        <UserPlus size={15} />
                        Crear cuenta
                    </button>
                </>
            )}

            {/* Perfil incompleto: el backend rechazaría la reserva (403) */}
            {bloqueo === "perfil" && (
                <>
                    <p className="reservas-resumen__bloqueo">
                        <UserCog size={15} />
                        Para reservar tenés que completar tu perfil: celular, categoría y posición.
                    </p>
                    <button className="reservas-resumen__confirmar" disabled>
                        Continuar al pago
                    </button>
                    <button type="button" className="accion accion--primaria accion--ancha" onClick={() => onIrA?.("perfil", cantidades)}>
                        <UserCog size={15} />
                        Completar perfil
                    </button>
                </>
            )}

            {bloqueo === null && (
                <button
                    className="reservas-resumen__confirmar"
                    onClick={() => onConfirmar(cantidades)}
                    disabled={cargando || stock.cargando}
                >
                    {cargando ? <span className="boton__spinner" /> : "Continuar al pago"}
                </button>
            )}
        </motion.div>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Reservas() {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const esVisitante = usuario === null;
    // Todas las canchas, también las dadas de baja (se ven como "No disponible por el momento")
    const { canchas, cargando: cargandoCanchas, error: errorCanchas } = useCanchas(true);
    // Las reservas propias necesitan sesión (sin ella el backend responde 401)
    const { reservas, recargar: recargarMias } = useMisReservas(FILTRO_PENDIENTES, !esVisitante);

    // Turno elegido antes de iniciar sesión, registrarse o completar el perfil: se retoma
    const [retomar] = useState(() => {
        const s = leerSeleccion();
        return s && s.fecha >= hoyISO() ? s : null;
    });
    const [fecha, setFecha] = useState(() => retomar?.fecha ?? hoyISO());
    const [canchaElegida, setCanchaElegida] = useState<number | null>(retomar?.canchaId ?? null);
    // null = no se envía y el backend usa la duración mínima configurada
    const [duracionPedida, setDuracionPedida] = useState<number | null>(
        retomar ? timeToMin(retomar.horaFin) - timeToMin(retomar.horaInicio) : null);
    const [slotSeleccionado, setSlotSeleccionado] = useState<SlotLibre | null>(null);
    const [slotARetomar, setSlotARetomar] = useState(retomar);
    const [avisoRetomar, setAvisoRetomar] = useState<string | null>(null);
    const [modalCerrado, setModalCerrado] = useState(false);
    const { crear, cancelar, cargando: cargandoReserva, cancelando, error, setError } = useReserva();
    const esMovil = useMediaQuery(MEDIA_MOVIL);

    // La elegida si se puede reservar; si no (o no se eligió), la primera disponible
    const disponibles = canchas.filter(c => c.activa !== false);
    const canchaActiva = disponibles.find(c => c.id === canchaElegida)?.id ?? disponibles[0]?.id ?? null;
    const cancha = canchas.find(c => c.id === canchaActiva) ?? null;

    // Días en que el club no abre (feriados, obras): ese día no se consultan turnos y se muestra el motivo
    const { cierres, cierreDe } = useCierresClub();
    const cierreDia = cierreDe(fecha);

    const {
        disponibilidad, turnosLibres, cargando: cargandoDisp, error: errorDisp, recargar: recargarDisp,
    } = useDisponibilidad(cierreDia ? null : canchaActiva, fecha, duracionPedida);

    // Último día que el cliente puede reservar (días de anticipación del club): llega con la
    // disponibilidad y se recuerda para limitar el calendario
    const [reservableHasta, setReservableHasta] = useState<string | null>(null);
    if (disponibilidad?.reservableHasta && disponibilidad.reservableHasta !== reservableHasta) {
        setReservableHasta(disponibilidad.reservableHasta);
    }
    // La disponibilidad responde también fechas más lejanas (para el personal): el cliente no puede reservarlas
    const fueraDeAnticipacion = reservableHasta !== null && fecha > reservableHasta;

    // La selección guardada se usa una sola vez (la pantalla ya la tomó)
    useEffect(() => { if (retomar) borrarSeleccion(); }, [retomar]);

    // Cuando llegan los horarios del día guardado, se vuelve a elegir ese turno si sigue libre
    // (ajuste de estado durante el render, como en el resto de la app)
    if (slotARetomar && !cargandoDisp && (disponibilidad || errorDisp)) {
        const libre = turnosLibres.find(s =>
            minToTime(s.inicio) === slotARetomar.horaInicio && minToTime(s.fin) === slotARetomar.horaFin);
        setSlotARetomar(null);
        if (libre && canchaActiva === slotARetomar.canchaId) setSlotSeleccionado(libre);
        else setAvisoRetomar(`El turno de las ${slotARetomar.horaInicio} que habías elegido ya no está libre. Elegí otro horario.`);
    }

    // Reserva sin pagar del usuario (la más reciente), según el servidor
    const pendiente: ReservaResponse | undefined = reservas.find(esPendienteVigente);
    const modalPendiente = pendiente !== undefined && !modalCerrado;

    const elegirFecha = (f: string) => { setFecha(f); setSlotSeleccionado(null); setError(null); setAvisoRetomar(null); };
    const elegirCancha = (id: number) => { setCanchaElegida(id); setSlotSeleccionado(null); setError(null); setAvisoRetomar(null); };
    const elegirDuracion = (d: number) => { setDuracionPedida(d); setSlotSeleccionado(null); };

    // Sin sesión o con el perfil incompleto no se puede reservar: se guarda el turno y se lleva
    // a iniciar sesión, registrarse o completar el perfil; al volver, Reservas lo retoma
    const bloqueo: BloqueoReserva = esVisitante ? "invitado" : !usuario.perfilCompleto ? "perfil" : null;
    const irA = (destino: DestinoBloqueo, cantidades: Cantidades) => {
        if (!canchaActiva || !slotSeleccionado) return;
        guardarSeleccion({
            canchaId: canchaActiva,
            fecha,
            horaInicio: minToTime(slotSeleccionado.inicio),
            horaFin: minToTime(slotSeleccionado.fin),
            productos: aPedido(cantidades),
        });
        navigate(`/${destino}`, { state: { desdeReserva: true } });
    };

    const irAPagar = (reserva: ReservaResponse) => {
        navigate(`/reservas/${reserva.id}/pago`, { state: { reserva } });
    };

    const handleConfirmar = async (cantidades: Cantidades) => {
        if (!canchaActiva || !slotSeleccionado) return;
        const reserva = await crear({
            canchaId: canchaActiva,
            fechaReserva: fecha,
            horaInicio: minToTime(slotSeleccionado.inicio),
            horaFin: minToTime(slotSeleccionado.fin),
            productos: aPedido(cantidades),
        });
        if (reserva) {
            irAPagar(reserva);
        } else {
            // Turno ocupado o sin stock mientras elegía: se refrescan los horarios
            setSlotSeleccionado(null);
            recargarDisp();
        }
    };

    const handleCancelarPendiente = async () => {
        if (!pendiente) return;
        if (await cancelar(pendiente.id)) {
            setModalCerrado(true);
            recargarMias();
            recargarDisp();
        }
    };

    if (cargandoCanchas) {
        return (
            <div className="reservas-pagina reservas-pagina--cargando">
                <div className="reservas-cargando__spinner" />
            </div>
        );
    }

    const r = pendiente;
    const enProceso = r ? pagoEnProceso(r) !== undefined : false;
    const precioCancha = disponibilidad?.montoCancha != null ? Number(disponibilidad.montoCancha) : null;
    const claveResumen = slotSeleccionado && cancha
        ? `${cancha.id}-${fecha}-${slotSeleccionado.inicio}-${slotSeleccionado.fin}` : "";
    // Productos que se habían elegido antes de iniciar sesión (solo para ese turno)
    const esElRetomado = retomar !== null && slotSeleccionado !== null && canchaActiva === retomar.canchaId
        && fecha === retomar.fecha && minToTime(slotSeleccionado.inicio) === retomar.horaInicio
        && minToTime(slotSeleccionado.fin) === retomar.horaFin;
    const propsResumen = {
        precioCancha,
        onConfirmar: handleConfirmar,
        onLimpiar: () => setSlotSeleccionado(null),
        cargando: cargandoReserva,
        bloqueo,
        onIrA: irA,
        cantidadesIniciales: esElRetomado ? cantidadesDe(retomar.productos ?? []) : undefined,
    };

    return (
        <div className="reservas-pagina">

            {/* Modal reserva pendiente */}
            <AnimatePresence>
                {modalPendiente && r && (
                    <ModalConfirmacion
                        titulo={enProceso ? "Tenés un pago en revisión" : "Tenés una reserva sin pagar"}
                        icono={<Clock size={22} />}
                        textoConfirmar={enProceso ? "Ver estado" : "Completar pago"}
                        textoCancelar={admiteCancelacion(r) ? "Cancelar reserva" : "Cerrar"}
                        cargando={cancelando}
                        error={error}
                        onCerrar={() => { setModalCerrado(true); setError(null); }}
                        onCancelar={admiteCancelacion(r) ? handleCancelarPendiente : undefined}
                        onConfirmar={() => irAPagar(r)}
                    >
                        <DetallePendiente reserva={r} enProceso={enProceso} />
                    </ModalConfirmacion>
                )}
            </AnimatePresence>

            <div className="reservas-contenedor">

                {/* Header */}
                <div className="reservas-header">
                    <div>
                        <p className="etiqueta-pagina">Reservas</p>
                        <h1 className="titulo-pagina">ELEGÍ TU <em>TURNO</em></h1>
                    </div>
                    <SelectorFecha valor={fecha} onChange={elegirFecha} max={reservableHasta} cerrados={cierres} />
                </div>

                {/* Visitante: puede mirar todo; para reservar, cuenta */}
                {esVisitante && (
                    <div className="reservas-aviso reservas-aviso--fila">
                        <LogIn size={18} />
                        <p>Mirá los turnos libres y los precios. Para reservar, iniciá sesión o creá tu cuenta.</p>
                        <div className="reservas-aviso__acciones">
                            <Link to="/register" className="accion accion--chica">Crear cuenta</Link>
                            <Link to="/login" className="accion accion--primaria accion--chica">Iniciar sesión</Link>
                        </div>
                    </div>
                )}

                {/* Perfil incompleto: el backend rechaza la reserva */}
                {usuario && !usuario.perfilCompleto && (
                    <div className="reservas-aviso reservas-aviso--fila">
                        <UserCog size={18} />
                        <p>Para reservar necesitás completar tu perfil: celular, categoría y posición.</p>
                        <Link to="/perfil" className="accion accion--primaria accion--chica">Completar perfil</Link>
                    </div>
                )}

                {/* El turno elegido antes de iniciar sesión ya no está libre */}
                {avisoRetomar && <AvisoTransitorio tipo="error">{avisoRetomar}</AvisoTransitorio>}

                {/* Reserva pendiente (si se cerró el modal) */}
                {r && !modalPendiente && (
                    <div className="reservas-aviso reservas-aviso--fila">
                        <Clock size={18} />
                        <p>Tenés una reserva sin pagar: Cancha {r.canchaNumero}, {horaCorta(r.horaInicio)} hs.</p>
                        <button type="button" className="accion accion--primaria accion--chica" onClick={() => irAPagar(r)}>
                            {enProceso ? "Ver estado del pago" : "Completar pago"}
                        </button>
                    </div>
                )}

                {/* Errores */}
                {(errorCanchas || (error && !modalPendiente)) && <AvisoTransitorio tipo="error">{errorCanchas ?? error}</AvisoTransitorio>}

                {/* Tabs canchas */}
                <TabsCanchas canchas={canchas} activa={canchaActiva} onSeleccionar={elegirCancha} />

                {cierreDia && (
                    <div className="reservas-aviso reservas-aviso--fila">
                        <CalendarDays size={18} />
                        <p>
                            El club está cerrado el <span style={{ textTransform: "capitalize" }}>{formatFecha(fecha)}</span>: {cierreDia.motivo}. Elegí otro día.
                        </p>
                    </div>
                )}

                {!cierreDia && fueraDeAnticipacion && reservableHasta && (
                    <div className="reservas-aviso reservas-aviso--fila">
                        <CalendarDays size={18} />
                        <p>
                            Podés reservar hasta el <span style={{ textTransform: "capitalize" }}>{formatFecha(reservableHasta)}</span>.
                            Para una fecha más lejana, consultá en el club.
                        </p>
                        <button type="button" className="accion accion--primaria accion--chica" onClick={() => elegirFecha(reservableHasta)}>
                            Ir al último día
                        </button>
                    </div>
                )}

                {!fueraDeAnticipacion && !cierreDia && <div className="reservas-grid">
                    {/* Línea de tiempo */}
                    <div className="reservas-timeline-contenedor">
                        {/* Sin la duración cuando el club ya cerró por hoy: no hay nada que ajustar */}
                        {disponibilidad && !cerradoPorHoy(disponibilidad, fecha) && (
                            <SelectorDuracion
                                duracion={disponibilidad.duracion}
                                min={disponibilidad.duracionMinimaTurno}
                                max={disponibilidad.duracionMaximaTurno}
                                onChange={elegirDuracion}
                            />
                        )}
                        <LineaTiempo
                            disponibilidad={disponibilidad}
                            turnosLibres={turnosLibres}
                            fecha={fecha}
                            slotSeleccionado={slotSeleccionado}
                            onSeleccionar={setSlotSeleccionado}
                            cargando={cargandoDisp}
                            error={errorDisp}
                        />
                    </div>

                    {/* Panel resumen: columna lateral en escritorio */}
                    {!esMovil && (
                        <div className="reservas-panel-lateral">
                            <AnimatePresence>
                                {slotSeleccionado && cancha && (
                                    <PanelResumen
                                        key={claveResumen}
                                        cancha={cancha}
                                        fecha={fecha}
                                        slot={slotSeleccionado}
                                        {...propsResumen}
                                    />
                                )}
                            </AnimatePresence>
                            {!slotSeleccionado && (
                                <div className="reservas-panel-vacio">
                                    <CheckCircle2 size={32} />
                                    <p>Seleccioná un horario para ver el resumen</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>}

                {/* En el celular el resumen sube desde abajo al tocar un horario,
                    en vez de quedar al final de la lista */}
                <AnimatePresence>
                    {esMovil && slotSeleccionado && cancha && (
                        <HojaInferior
                            titulo="Resumen de la reserva"
                            onCerrar={() => setSlotSeleccionado(null)}
                            bloqueada={cargandoReserva}
                        >
                            <PanelResumen
                                key={claveResumen}
                                cancha={cancha}
                                fecha={fecha}
                                slot={slotSeleccionado}
                                {...propsResumen}
                                enHoja
                            />
                        </HojaInferior>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
