import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isCancel } from "axios";
import { BadgeCheck, Ban, CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, Eye, LayoutGrid, List, Pencil, Repeat, RotateCcw, Undo2, Wallet, X } from "lucide-react";
import CampoBusqueda from "../../components/ui/CampoBusqueda/CampoBusqueda";
import { useBusqueda } from "../../hooks/useBusqueda";
import { useCierresClub } from "../../hooks/useCierresClub";
import { useAuth } from "../../context/AuthContext";
import { useJornada } from "../../hooks/useJornada";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import SelectorFecha from "../../components/ui/SelectorFecha/SelectorFecha";
import SelectorPeriodo, { type Periodo } from "../../components/ui/SelectorPeriodo/SelectorPeriodo";
import { useCanchas } from "../../hooks/useCanchas";
import { adminService } from "../../services/adminService";
import type { FiltrosReservasAdmin, ListadoReservas, PartidoDeTurnoFijo, TurnoFijo } from "../../types/admin.types";
import type { DevolucionAEntregar, DevolucionSinRevisar, EstadoReserva, ReservaResponse, TipoReserva } from "../../types/reserva.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatMonto, horaCorta, hoyISO } from "../../utils/fechas";
import { paletasDe } from "../../utils/productos";
import { esPartido } from "../../utils/reservas";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Vacio } from "./comunes";
import AsistenteReserva, { type Edicion, type TipoAlta } from "./Crear/AsistenteReserva";
import type { TurnoElegido } from "./ElegirTurno";
import GrillaReservas from "./GrillaReservas";
import ModalBajaTurnoFijo from "./ModalBajaTurnoFijo";
import { admiteBajaFecha, admiteCancelacionPersonal, admiteCobro, deuda, etiquetaEstado, tonoEstado } from "./estadoReserva";
import ModalCobro from "./ModalCobro";
import { ModalCancelarReserva, ModalDetalleReserva } from "./ModalesReserva";
import "./ReservasAdmin.css";
import "./GrillaReservas.css";

/** Filtros rápidos por estado. "Por cobrar" usa pendientes=true (CONFIRMADA, SEÑADA y PARCIALMENTE_PAGADA). */
const FILTROS_ESTADO: { id: string; etiqueta: string; estados?: EstadoReserva[]; pendientes?: boolean }[] = [
    { id: "todas", etiqueta: "Todas" },
    { id: "por-cobrar", etiqueta: "Por cobrar", pendientes: true },
    { id: "sin-pagar", etiqueta: "Sin pagar", estados: ["PENDIENTE"] },
    { id: "pagadas", etiqueta: "Pagadas", estados: ["PAGADA", "COMPLETADA"] },
    { id: "canceladas", etiqueta: "Canceladas", estados: ["CANCELADA", "EXPIRADA"] },
];
const POR_PAGINA = 20;

/** Sin tildes ni mayúsculas, para comparar nombres */
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Filtro por tipo (?tipo=), en la grilla y en la lista: reservas normales, partidos sueltos y los
 * partidos de turnos fijos (`tipo` y `deTurnoFijo` del backend).
 */
export type FiltroTipo = "todas" | "reserva" | "partido" | "turnos-fijos";
const FILTROS_TIPO: { id: FiltroTipo; etiqueta: string; tipo?: TipoReserva; deTurnoFijo?: boolean }[] = [
    { id: "todas", etiqueta: "Todas" },
    { id: "reserva", etiqueta: "Reservas", tipo: "NORMAL" },
    { id: "partido", etiqueta: "Partidos", tipo: "PARTIDO", deTurnoFijo: false },
    { id: "turnos-fijos", etiqueta: "Turnos fijos", deTurnoFijo: true },
];
/** Para la grilla (un día entero, sin filtrar en el backend): si la reserva es del tipo y estado elegidos */
const cumpleTipo = (r: ReservaResponse, f: (typeof FILTROS_TIPO)[number]) =>
    (!f.tipo || r.tipo === f.tipo) && (f.deTurnoFijo === undefined || (r.turnoFijoId !== null) === f.deTurnoFijo);
const cumpleEstado = (r: ReservaResponse, f: (typeof FILTROS_ESTADO)[number] | undefined) =>
    !f || (f.pendientes ? deuda(r) > 0 && ["CONFIRMADA", "SEÑADA", "PARCIALMENTE_PAGADA"].includes(r.estado)
        : !f.estados || f.estados.includes(r.estado));

/** Lo que abre el popup del asistente (crear o editar) */
interface Asistente {
    tipoInicial?: TipoAlta | null;
    fijoInicial?: boolean;
    edicion?: Edicion;
    turnoInicial?: TurnoElegido;
}

/** Un partido se puede modificar mientras no se jugó ni se canceló */
const editable = (r: ReservaResponse) =>
    !r.turnoTerminado && r.estado !== "CANCELADA" && r.estado !== "EXPIRADA" && r.estado !== "COMPLETADA";

/**
 * Reservas de cualquier cliente para el personal, en grilla (un día) o lista, filtradas por tipo
 * (reservas, partidos, turnos fijos). Crear y editar es un popup con pasos ("Nueva reserva", un
 * horario libre de la grilla o Editar). Desde el detalle se cobra, bonifica, edita y cancela; en un
 * partido de turno fijo, el ADMIN también edita o da de baja la serie o esa fecha.
 */
export default function ReservasAdmin() {
    // También las dadas de baja: sus reservas pasadas se siguen consultando
    const { canchas } = useCanchas(true);
    // Bonificar (no cobrarle al cliente) es solo del ADMIN
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Filtro por tipo (queda en la URL; vale para la grilla y la lista) ──
    const filtroTipo = FILTROS_TIPO.find(p => p.id === searchParams.get("tipo")) ?? FILTROS_TIPO[0];
    const elegirTipo = (id: FiltroTipo) => {
        const params = new URLSearchParams(searchParams);
        if (id === "todas") params.delete("tipo"); else params.set("tipo", id);
        setSearchParams(params, { replace: true });
    };

    // ── Vista: grilla del día (por defecto) o lista con filtros. "?filtro=" (por ejemplo, Por cobrar) abre la lista ──
    const vista: "grilla" | "lista" = searchParams.get("vista") === "lista" || searchParams.has("filtro") ? "lista" : "grilla";
    const elegirVista = (v: "grilla" | "lista") => {
        const params = new URLSearchParams(searchParams);
        if (v === "lista") params.set("vista", "lista"); else { params.delete("vista"); params.delete("filtro"); }
        setSearchParams(params, { replace: true });
    };

    // ── Filtros ── (por defecto, hoy; "?filtro=por-cobrar" abre directo lo que deben, sin fecha)
    const filtroInicial = FILTROS_ESTADO.find(f => f.id === searchParams.get("filtro"))?.id ?? "todas";
    const [filtroEstado, setFiltroEstado] = useState(filtroInicial);
    // El EMPLEADO ve y opera su jornada y fechas futuras: sus selectores no bajan de ahí (pasada la
    // medianoche, la jornada sigue siendo el día anterior hasta la apertura)
    const jornada = useJornada();
    const minimoFecha = esAdmin ? undefined : jornada;
    const [periodo, setPeriodo] = useState<Periodo>(() => filtroInicial === "por-cobrar"
        ? (esAdmin ? {} : { desde: hoyISO() }) : { desde: hoyISO(), hasta: hoyISO() });
    // Cuando llega la jornada del EMPLEADO (pasada la medianoche, el día anterior), el período por
    // defecto pasa a ser ese día
    const [jornadaVista, setJornadaVista] = useState(hoyISO());
    if (!esAdmin && jornada !== jornadaVista) {
        setJornadaVista(jornada);
        if (periodo.desde === jornadaVista) setPeriodo(p => ({ desde: jornada, hasta: p.hasta === jornadaVista ? jornada : p.hasta }));
    }
    const [canchaId, setCanchaId] = useState<number | "">("");
    // Cliente: se busca con 3 letras o más, al dejar de escribir, con Enter o con la lupa
    const campoCliente = useBusqueda();
    const cliente = campoCliente.termino;
    const [pagina, setPagina] = useState(0);

    // Día de la grilla (?fecha=, por defecto hoy); los días cerrados se marcan en el calendario
    const { cierres } = useCierresClub();
    const hoy = hoyISO();
    const fechaPedida = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("fecha") ?? "") ? searchParams.get("fecha")! : hoy;
    const fechaGrilla = minimoFecha && fechaPedida < minimoFecha ? minimoFecha : fechaPedida;
    const elegirFechaGrilla = (f: string) => {
        const params = new URLSearchParams(searchParams);
        if (f === hoy) params.delete("fecha"); else params.set("fecha", f);
        setSearchParams(params, { replace: true });
    };

    const hayFiltros = filtroEstado !== "todas" || campoCliente.texto !== "" || (vista === "grilla"
        ? fechaGrilla !== hoy
        : canchaId !== "" || periodo.desde !== hoyISO() || periodo.hasta !== hoyISO());
    const limpiarFiltros = () => {
        setFiltroEstado("todas");
        setPeriodo({ desde: hoyISO(), hasta: hoyISO() });
        setCanchaId("");
        campoCliente.limpiar();
        if (vista === "grilla") elegirFechaGrilla(hoy);
    };

    const estado = FILTROS_ESTADO.find(f => f.id === filtroEstado);
    // En la grilla, el pedido es solo para los totales del día con los mismos filtros (las reservas
    // las trae la grilla): una sola fila, todas las canchas
    const enGrilla = vista === "grilla";
    const filtros: FiltrosReservasAdmin = {
        desde: enGrilla ? fechaGrilla : periodo.desde, hasta: enGrilla ? fechaGrilla : periodo.hasta,
        estado: estado?.estados, pendientes: estado?.pendientes,
        cliente: cliente || undefined,
        canchaId: enGrilla || canchaId === "" ? undefined : canchaId,
        tipo: filtroTipo.tipo,
        deTurnoFijo: filtroTipo.deTurnoFijo,
        page: enGrilla ? 0 : pagina, size: enGrilla ? 1 : POR_PAGINA,
    };
    const claveFiltros = JSON.stringify(filtros);

    // Cambiar un filtro vuelve a la primera página (ajuste de estado durante el render)
    const claveSinPagina = JSON.stringify({ ...filtros, page: 0 });
    const [claveAnterior, setClaveAnterior] = useState(claveSinPagina);
    if (claveAnterior !== claveSinPagina) {
        setClaveAnterior(claveSinPagina);
        if (pagina !== 0) setPagina(0);
    }

    // ── Datos ──
    const [version, setVersion] = useState(0);
    const [resultado, setResultado] = useState<{ clave: string; datos?: ListadoReservas; error?: string } | null>(null);
    const clave = `${claveFiltros}|${version}`;
    useEffect(() => {
        const controller = new AbortController();
        adminService.reservas(JSON.parse(claveFiltros) as FiltrosReservasAdmin, controller.signal)
            .then(datos => setResultado({ clave, datos }))
            .catch(e => {
                if (isCancel(e)) return;
                setResultado({ clave, error: primerError(extraerErrores(e, "No se pudieron cargar las reservas.")) });
            });
        return () => controller.abort();
    }, [clave, claveFiltros]);

    const actual = resultado?.clave === clave ? resultado : null;
    // Mientras carga otra página o filtro se conserva lo anterior (sin parpadeo)
    const datos = actual?.datos ?? resultado?.datos ?? null;
    const contenido = datos?.contenido ?? [];

    const cargando = actual === null;
    const recargar = () => setVersion(v => v + 1);

    // Turnos que ya empezaron con paletas sin devolver: se registran desde el detalle
    const [devoluciones, setDevoluciones] = useState<ReservaResponse[]>([]);
    useEffect(() => {
        let activo = true;
        adminService.devolucionesPendientes()
            // El EMPLEADO opera solo hoy y fechas futuras: los turnos de días pasados los resuelve el ADMIN
            .then(r => { if (activo) setDevoluciones(esAdmin ? r : r.filter(x => x.fechaReserva >= jornada)); })
            .catch(() => { /* el aviso es secundario: sin él, la lista funciona igual */ });
        return () => { activo = false; };
    }, [version, esAdmin, jornada]);

    // Plata que hay que devolverle a mano a un cliente (cobros del club devueltos): se entrega desde el detalle
    const [aEntregar, setAEntregar] = useState<DevolucionAEntregar[]>([]);
    useEffect(() => {
        let activo = true;
        adminService.devolucionesAEntregar()
            .then(d => { if (activo) setAEntregar(d); })
            .catch(() => { /* el aviso es secundario */ });
        return () => { activo = false; };
    }, [version]);
    // ADMIN: devoluciones que hizo el EMPLEADO y falta controlar
    const [sinRevisar, setSinRevisar] = useState<DevolucionSinRevisar[]>([]);
    useEffect(() => {
        if (!esAdmin) return;
        let activo = true;
        adminService.devolucionesSinRevisar()
            .then(d => { if (activo) setSinRevisar(d); })
            .catch(() => { /* el aviso es secundario */ });
        return () => { activo = false; };
    }, [version, esAdmin]);
    const abrirDetalle = (reservaId: number) => {
        setMensaje(null);
        adminService.reserva(reservaId).then(setDetalle).catch(() => setMensaje(null));
    };

    // ── Acciones ──
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [asistente, setAsistente] = useState<Asistente | null>(null);
    const [bajaTurno, setBajaTurno] = useState<{ turno: TurnoFijo; partido: PartidoDeTurnoFijo | null } | null>(null);
    const [errorTurnoFijo, setErrorTurnoFijo] = useState<string | null>(null);
    const [detalle, setDetalle] = useState<ReservaResponse | null>(null);
    const [cobrando, setCobrando] = useState<ReservaResponse | null>(null);
    const [cancelando, setCancelando] = useState<ReservaResponse | null>(null);

    /** Recarga la pantalla y, si el detalle está abierto, lo vuelve a pedir */
    const recargarTodo = () => {
        recargar();
        const id = detalle?.id;
        if (id !== undefined) adminService.reserva(id).then(setDetalle).catch(() => { /* queda el que estaba */ });
    };

    const t = datos?.totales;

    /** Totales de todo el filtro (en la grilla, del día con los mismos filtros) */
    const bloqueTotales = (t && (
                <div className="ra-totales">
                    <div><span>Reservas</span><strong>{t.reservas}</strong></div>
                    <div><span>Total</span><strong>{formatMonto(Number(t.montoTotal))}</strong></div>
                    <div>
                        <span>Cobrado</span>
                        <strong className="ra-totales__ok">{formatMonto(Number(t.montoCobrado))}</strong>
                        <small>
                            Efectivo {formatMonto(Number(t.cobradoEfectivo ?? 0))} · Mercado Pago {formatMonto(Number(t.cobradoMercadoPago ?? 0))}
                            {Number(t.cobradoCuentaDni ?? 0) > 0 && ` · Cuenta DNI ${formatMonto(Number(t.cobradoCuentaDni))}`}
                        </small>
                    </div>
                    <div>
                        <span>Por cobrar</span>
                        <strong className={Number(t.montoPendiente) > 0 ? "ra-totales__alerta" : undefined}>{formatMonto(Number(t.montoPendiente))}</strong>
                        {Number(t.montoBonificado ?? 0) > 0 && <small>Bonificado {formatMonto(Number(t.montoBonificado))}</small>}
                    </div>
                </div>
            ));

    /** Cliente buscado, para la grilla: nombre del titular o de un jugador (sin tildes ni mayúsculas) */
    const buscado = normalizar(cliente);
    const cumpleCliente = (r: ReservaResponse) => !buscado
        || [r.clienteNombre, ...r.jugadores.map(j => j.nombre)].some(n => normalizar(n ?? "").includes(buscado));

    /** Filtro por estado: el mismo en la grilla y en la lista */
    const chipsEstado = (
        <div className="ra-chips" role="radiogroup" aria-label="Estado">
            {FILTROS_ESTADO.map(f => (
                <button key={f.id} type="button" role="radio" aria-checked={filtroEstado === f.id}
                    className={`ra-chip${filtroEstado === f.id ? " ra-chip--activo" : ""}`}
                    onClick={() => setFiltroEstado(f.id)}>
                    {f.etiqueta}
                </button>
            ))}
        </div>
    );

    /** Trae el turno fijo de un partido y sigue con él (editar la serie o dar de baja) */
    const conTurnoFijo = async (r: ReservaResponse, seguir: (t: TurnoFijo) => void) => {
        if (r.turnoFijoId === null) return;
        setErrorTurnoFijo(null);
        try {
            const turno = await adminService.turnoFijo(r.turnoFijoId);
            if (!turno.activo) { setErrorTurnoFijo("Ese turno fijo ya está dado de baja."); return; }
            // El detalle queda abierto: editar o dar de baja se abre encima y al cerrar se vuelve a él
            seguir(turno);
        } catch (e) {
            setErrorTurnoFijo(primerError(extraerErrores(e, "No se pudo cargar el turno fijo.")) ?? null);
        }
    };

    /** "Nueva reserva": con el filtro de tipo ya elegido, el asistente arranca en ese tipo */
    const nueva = () => {
        setMensaje(null);
        if (!esAdmin || filtroTipo.id === "reserva") setAsistente({ tipoInicial: "reserva" });
        else if (filtroTipo.id === "partido") setAsistente({ tipoInicial: "partido" });
        else if (filtroTipo.id === "turnos-fijos") setAsistente({ tipoInicial: "partido", fijoInicial: true });
        else setAsistente({});
    };

    /** Editar y cancelar desde el detalle (cobrar y bonificar van en el cobro): se abren encima del detalle */
    const accionesDetalle = (r: ReservaResponse) => <>
        {esAdmin && esPartido(r) && editable(r) && (
            <button type="button" className="accion accion--chica" onClick={() => setAsistente({ edicion: { tipo: "partido", reserva: r } })}>
                <Pencil size={14} /> {r.turnoFijoId !== null ? "Editar esta fecha" : "Editar"}
            </button>
        )}
        {esAdmin && r.turnoFijoId !== null && <>
            <button type="button" className="accion accion--chica" onClick={() => void conTurnoFijo(r, turno => setAsistente({ edicion: { tipo: "turno-fijo", turno } }))}>
                <Repeat size={14} /> Editar el turno fijo
            </button>
            {admiteBajaFecha(r, esAdmin) && (
                <button type="button" className="accion accion--chica accion--peligro"
                    onClick={() => void conTurnoFijo(r, turno => setBajaTurno({ turno, partido: turno.proximosPartidos.find(p => p.reservaId === r.id) ?? null }))}>
                    <Ban size={14} /> Baja de esta fecha
                </button>
            )}
            <button type="button" className="accion accion--chica accion--peligro" onClick={() => void conTurnoFijo(r, turno => setBajaTurno({ turno, partido: null }))}>
                <Ban size={14} /> Baja del turno fijo
            </button>
        </>}
        {admiteCancelacionPersonal(r, esAdmin) && (
            <button type="button" className="accion accion--chica accion--peligro" onClick={() => setCancelando(r)}>
                <Ban size={14} /> Cancelar
            </button>
        )}
    </>;

    return (
        <div className="admin-pagina">
            {/* El detalle va primero: lo que se abre desde él (cobrar, editar, bajas, cancelar) queda
                encima, y al cerrarlo se vuelve al detalle actualizado */}
            {detalle && <ModalDetalleReserva reserva={detalle} onCerrar={() => setDetalle(null)} onCambio={recargar}
                onCobrar={r => setCobrando(r)} acciones={accionesDetalle} />}
            {asistente && (
                <AsistenteReserva
                    {...asistente}
                    onCerrar={() => setAsistente(null)}
                    onTerminado={texto => { setAsistente(null); setMensaje(texto); recargarTodo(); }}
                    onCobrar={r => { setAsistente(null); recargar(); setMensaje(`Reserva #${r.id} creada para ${r.clienteNombre}.`); setCobrando(r); }}
                />
            )}
            {bajaTurno && (
                <ModalBajaTurnoFijo
                    turno={bajaTurno.turno}
                    partido={bajaTurno.partido}
                    onCerrar={() => setBajaTurno(null)}
                    onHecho={texto => { setBajaTurno(null); setMensaje(texto); recargarTodo(); }}
                />
            )}
            {cobrando && (
                <ModalCobro
                    reserva={cobrando}
                    onCerrar={() => setCobrando(null)}
                    onCobrado={({ cobrado, bonificado, completo }) => {
                        const partes = [cobrado > 0 && `se cobraron ${formatMonto(cobrado)}`, bonificado > 0 && `se bonificaron ${formatMonto(bonificado)}`].filter(Boolean).join(" y ");
                        setMensaje(`A ${cobrando.clienteNombre} ${partes}. ${completo ? "La reserva quedó paga." : "Todavía le queda saldo."}`);
                        setCobrando(null);
                        recargarTodo();
                    }}
                />
            )}
            {cancelando && (
                <ModalCancelarReserva
                    reserva={cancelando}
                    onCerrar={() => setCancelando(null)}
                    onCancelada={r => {
                        const devuelto = r.pagos.reduce((s, p) => s + Number(p.montoReembolsado ?? 0), 0);
                        setMensaje(`Reserva #${r.id} cancelada.${devuelto > 0 ? ` Se devuelven ${formatMonto(devuelto)}.` : ""}`);
                        setCancelando(null);
                        recargarTodo();
                    }}
                />
            )}

            <Encabezado
                titulo="Reservas"
                descripcion="Reservas, partidos y turnos fijos: consultá, cobrá en el club lo que deben, editá los partidos y cancelá si hace falta."
                acciones={<>
                    <BotonActualizar onClick={recargar} cargando={cargando} />
                    <button type="button" className="accion accion--primaria" onClick={nueva}>
                        <CalendarPlus size={15} />
                        {filtroTipo.id === "partido" && esAdmin ? "Nuevo partido" : filtroTipo.id === "turnos-fijos" && esAdmin ? "Nuevo turno fijo" : "Nueva reserva"}
                    </button>
                </>}
            />

            <div className="ra-cabecera-vista">
                <div className="ra-chips" role="radiogroup" aria-label="Tipo">
                    {FILTROS_TIPO.map(f => (
                        <button key={f.id} type="button" role="radio" aria-checked={filtroTipo.id === f.id}
                            className={`ra-chip${filtroTipo.id === f.id ? " ra-chip--activo" : ""}`} onClick={() => elegirTipo(f.id)}>
                            {f.etiqueta}
                        </button>
                    ))}
                </div>
                {(
                    <div className="ra-chips" role="radiogroup" aria-label="Vista">
                        {([["grilla", "Grilla", LayoutGrid], ["lista", "Lista", List]] as const).map(([id, etiqueta, Icono]) => (
                            <button key={id} type="button" role="radio" aria-checked={vista === id}
                                className={`ra-chip ra-chip--icono${vista === id ? " ra-chip--activo" : ""}`} onClick={() => elegirVista(id)}>
                                <Icono size={14} /> {etiqueta}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {errorTurnoFijo && <Mensaje tipo="error">{errorTurnoFijo}</Mensaje>}
            {sinRevisar.length > 0 && (
                <div className="ra-devoluciones" role="status">
                    <BadgeCheck size={16} />
                    <span>
                        {sinRevisar.length === 1 ? "1 devolución del personal" : `${sinRevisar.length} devoluciones del personal`} sin revisar
                        ({formatMonto(sinRevisar.reduce((s, d) => s + Number(d.monto), 0))}):
                    </span>
                    {sinRevisar.map(d => (
                        <button key={d.devolucionId} type="button" className="ra-chip" onClick={() => abrirDetalle(d.reservaId)}
                            title={[d.registradaPor, d.motivo].filter(Boolean).join(" · ") || undefined}>
                            {d.cliente} · {formatMonto(Number(d.monto))} · #{d.reservaId}
                        </button>
                    ))}
                </div>
            )}
            {aEntregar.length > 0 && (
                <div className="ra-devoluciones" role="status">
                    <Undo2 size={16} />
                    <span>
                        {aEntregar.length === 1 ? "Hay 1 devolución" : `Hay ${aEntregar.length} devoluciones`} para entregar
                        ({formatMonto(aEntregar.reduce((s, d) => s + Number(d.monto), 0))}):
                    </span>
                    {aEntregar.map(d => (
                        <button key={d.devolucionId} type="button" className="ra-chip" onClick={() => abrirDetalle(d.reservaId)}
                            title={d.motivo ?? undefined}>
                            {d.cliente} · {formatMonto(Number(d.monto))} · #{d.reservaId}
                        </button>
                    ))}
                </div>
            )}
            {devoluciones.length > 0 && (
                <div className="ra-devoluciones" role="status">
                    <RotateCcw size={16} />
                    <span>
                        {devoluciones.length === 1 ? "1 turno tiene" : `${devoluciones.length} turnos tienen`} paletas sin devolver:
                    </span>
                    {devoluciones.map(r => (
                        <button key={r.id} type="button" className="ra-chip" onClick={() => { setMensaje(null); setDetalle(r); }}>
                            {r.clienteNombre} · {paletasDe(r)} · {horaCorta(r.horaInicio)} hs
                        </button>
                    ))}
                </div>
            )}

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}

            {vista === "grilla" ? <>
                {/* Estado (a la izquierda) y día (a la derecha), como en la Lista */}
                <div className="ra-filtros__fila">
                    {chipsEstado}
                    {/* "Hoy" a la izquierda: al aparecer no corre el selector */}
                    <div className="grilla-reservas__fecha">
                        {fechaGrilla !== hoy && (
                            <button type="button" className="accion accion--chica" onClick={() => elegirFechaGrilla(hoy)}>Hoy</button>
                        )}
                        <SelectorFecha valor={fechaGrilla} onChange={elegirFechaGrilla} min={minimoFecha ?? "2020-01-01"} cerrados={cierres} elegirCerrados />
                    </div>
                </div>
                <div className="admin-filtros">
                    <CampoBusqueda id="ra-cliente" label="Cliente" placeholder="Nombre, apellido o email" busqueda={campoCliente} />
                    <button type="button" className="accion admin-filtros__fijo admin-filtros__limpiar" onClick={limpiarFiltros} disabled={!hayFiltros}>
                        <X size={15} /> Limpiar filtros
                    </button>
                </div>
                {bloqueTotales}
                <GrillaReservas fecha={fechaGrilla} version={version}
                    coincide={r => cumpleTipo(r, filtroTipo) && cumpleEstado(r, estado) && cumpleCliente(r)}
                    estadoFiltro={filtroEstado} tipoFiltro={filtroTipo.id}
                    onVer={r => { setMensaje(null); setDetalle(r); }}
                    onReservar={turno => { setMensaje(null); setAsistente({ turnoInicial: turno }); }} />
            </> : <>

            {/* Filtros */}
            <div className="ra-filtros">
                <div className="ra-filtros__fila">
                    {chipsEstado}
                    <SelectorPeriodo valor={periodo} onChange={setPeriodo} min={minimoFecha} rangoTodo={datos?.rango ?? null} />
                </div>
                <div className="admin-filtros">
                    <CampoBusqueda id="ra-cliente" label="Cliente" placeholder="Nombre, apellido o email" busqueda={campoCliente} />
                    <CampoSelect id="ra-cancha" name="cancha" label="Cancha" value={canchaId}
                        onChange={e => setCanchaId(e.target.value === "" ? "" : Number(e.target.value))}
                        opciones={[{ valor: "", etiqueta: "Todas" }, ...canchas.map(c => ({ valor: c.id, etiqueta: `Cancha ${c.numero}${c.activa === false ? " (desactivada)" : ""}` }))]} />
                    <button type="button" className="accion admin-filtros__fijo admin-filtros__limpiar" onClick={limpiarFiltros} disabled={!hayFiltros}>
                        <X size={15} /> Limpiar filtros
                    </button>
                </div>
            </div>

            {bloqueTotales}

            {actual?.error && <Mensaje tipo="error">{actual.error}</Mensaje>}

            {!datos ? (cargando ? <Cargando /> : null) : contenido.length === 0 ? (
                <Vacio icono={<CalendarX2 size={32} />}>No hay reservas con esos filtros.</Vacio>
            ) : (
                <>
                    <div className={`admin-tabla-contenedor${cargando ? " ra-cargando" : ""}`}>
                        <table className="admin-tabla ra-tabla">
                            <thead>
                                <tr>
                                    <th>Turno</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Total</th>
                                    <th>Pagó</th>
                                    <th>Debe</th>
                                    <th className="admin-tabla__acciones" aria-label="Acciones" />
                                </tr>
                            </thead>
                            <tbody>
                                {contenido.map(r => {
                                    const debe = deuda(r);
                                    return (
                                        <tr key={r.id} className={r.estado === "CANCELADA" || r.estado === "EXPIRADA" ? "admin-tabla__inactiva" : undefined}>
                                            <td className="admin-tabla__titulo-celda">
                                                <span className="admin-tabla__principal" style={{ textTransform: "capitalize" }}>{formatFecha(r.fechaReserva)}</span>
                                                <span className="admin-tabla__secundario">{horaCorta(r.horaInicio)} a {horaCorta(r.horaFin)} · Cancha {r.canchaNumero} · #{r.id}</span>
                                            </td>
                                            <td data-label={esPartido(r) ? "Jugadores" : "Cliente"}>
                                                <div>
                                                    {r.clienteNombre}
                                                    {esPartido(r) && (
                                                        <span className="admin-tabla__secundario">
                                                            {r.turnoFijoId !== null ? "Turno fijo" : "Partido"}
                                                            {r.jugadores.length > 1 && ` · con ${[...r.jugadores].sort((a, b) => a.posicion - b.posicion).slice(1).map(j => j.nombre).join(", ")}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Estado"><span className={`admin-chip ${tonoEstado(r)}`}>{etiquetaEstado(r)}</span></td>
                                            <td data-label="Total" className="admin-tabla__num">{formatMonto(Number(r.montoTotal))}</td>
                                            <td data-label="Pagó" className="admin-tabla__num">
                                                <div>
                                                    {formatMonto(Number(r.montoPagado))}
                                                    {Number(r.montoBonificado ?? 0) > 0 && (
                                                        <span className="admin-tabla__secundario">+ {formatMonto(Number(r.montoBonificado))} bonificado</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Debe" className="admin-tabla__num">
                                                {debe > 0 ? <strong className="ra-debe">{formatMonto(debe)}</strong> : "—"}
                                            </td>
                                            <td className="admin-tabla__acciones">
                                                <span className="admin-tabla__acciones-grupo">
                                                    <button type="button" className="accion accion--chica" onClick={() => setDetalle(r)}
                                                        title="Ver el detalle" aria-label="Ver el detalle">
                                                        <Eye size={14} />
                                                        <span className="ra-accion__texto">Ver</span>
                                                    </button>
                                                    {admiteCobro(r) && (
                                                        <button type="button" className="accion accion--chica accion--primaria"
                                                            onClick={() => { setMensaje(null); setCobrando(r); }}
                                                            title="Cobrar en el club" aria-label="Cobrar en el club">
                                                            <Wallet size={14} />
                                                            <span className="ra-accion__texto">Cobrar</span>
                                                        </button>
                                                    )}
                                                    {esAdmin && esPartido(r) && editable(r) && (
                                                        <button type="button" className="accion accion--chica"
                                                            onClick={() => { setMensaje(null); setAsistente({ edicion: { tipo: "partido", reserva: r } }); }}
                                                            title="Editar el partido" aria-label="Editar el partido">
                                                            <Pencil size={14} />
                                                            <span className="ra-accion__texto">Editar</span>
                                                        </button>
                                                    )}
                                                    {admiteCancelacionPersonal(r, esAdmin) && (
                                                        <button type="button" className="accion accion--chica accion--peligro"
                                                            onClick={() => { setMensaje(null); setCancelando(r); }}
                                                            title="Cancelar la reserva" aria-label="Cancelar la reserva">
                                                            <Ban size={14} />
                                                            <span className="ra-accion__texto">Cancelar</span>
                                                        </button>
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {datos.totalPaginas > 1 && (
                        <nav className="ra-paginado" aria-label="Páginas">
                            <button type="button" className="accion accion--chica" disabled={pagina === 0 || cargando}
                                onClick={() => setPagina(p => p - 1)}>
                                <ChevronLeft size={14} /> Anterior
                            </button>
                            <span>Página {datos.pagina + 1} de {datos.totalPaginas}</span>
                            <button type="button" className="accion accion--chica" disabled={pagina + 1 >= datos.totalPaginas || cargando}
                                onClick={() => setPagina(p => p + 1)}>
                                Siguiente <ChevronRight size={14} />
                            </button>
                        </nav>
                    )}
                </>
            )}
            </>}
        </div>
    );
}
