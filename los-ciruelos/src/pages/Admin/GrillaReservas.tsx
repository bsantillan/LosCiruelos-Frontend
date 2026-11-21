import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CalendarX2, Repeat, Swords } from "lucide-react";
import { useCanchas } from "../../hooks/useCanchas";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { adminService } from "../../services/adminService";
import { canchaService } from "../../services/canchaService";
import type { HorarioDia } from "../../types/admin.types";
import type { DisponibilidadResponse, ReservaResponse } from "../../types/reserva.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatMonto, horaCorta, hoyISO, minToTime, timeToMin } from "../../utils/fechas";
import { estaVencida, esPartido } from "../../utils/reservas";
import { Cargando, Mensaje, Vacio } from "./comunes";
import type { TurnoElegido } from "./ElegirTurno";
import { deuda, etiquetaEstado } from "./estadoReserva";
import "./NuevaReserva.css";
import "./GrillaReservas.css";

const BLOQUE = 30;
/** En pantallas angostas se ve una cancha por vez */
const MEDIA_UNA_CANCHA = "(max-width: 760px)";

/** Color de cada reserva en la grilla (y su explicación en la leyenda) */
type Categoria = "pagada" | "por-cobrar" | "pendiente" | "deuda";
const LEYENDA: { id: Categoria; etiqueta: string }[] = [
    { id: "pagada", etiqueta: "Pagada" },
    { id: "por-cobrar", etiqueta: "Por cobrar (señada, parcial o partido sin pagar)" },
    { id: "pendiente", etiqueta: "Sin pagar (vence a los 15 min)" },
    { id: "deuda", etiqueta: "Jugada con deuda" },
];

function categoria(r: ReservaResponse): Categoria {
    if (r.debeSaldo) return "deuda";
    if (r.estado === "PENDIENTE") return "pendiente";
    if (deuda(r) > 0) return "por-cobrar";
    return "pagada";
}

/** Las canceladas y vencidas no ocupan la cancha: se ven en la Lista */
const ocupa = (r: ReservaResponse) =>
    r.estado !== "CANCELADA" && r.estado !== "EXPIRADA" && !(r.estado === "PENDIENTE" && estaVencida(r));

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** "Sábado" (como vienen en GET /club/horarios) de una fecha ISO */
const diaDeLaSemana = (fecha: string) => DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];

/** Minutos del día; el cierre "00:00" es medianoche (fin del día) */
const minutos = (hora: string, esCierre = false) => {
    const m = timeToMin(horaCorta(hora));
    return esCierre && m === 0 ? 24 * 60 : m;
};

interface Datos {
    clave: string;
    reservas?: ReservaResponse[];
    /** Horario actual del club (GET /club/horarios) */
    horarios?: HorarioDia[];
    /** Próximos días cerrados (de hoy en adelante) */
    cierres?: { fecha: string; motivo: string }[];
    /** Por cancha, solo de hoy en adelante: los horarios libres (null si no se pudo consultar) */
    disponibilidad?: Record<number, DisponibilidadResponse | null>;
    error?: string;
}

/**
 * Grilla de un día: una columna por cancha y una fila cada 30 minutos, del horario de apertura al de
 * cierre (GET /club/horarios). Nunca corta una reserva: si alguna quedó fuera del horario actual (el
 * ADMIN lo cambió después de reservarse), el rango se estira hasta incluirla, esas franjas se ven
 * rayadas y la reserva lleva el aviso "Fuera de horario". Cada reserva ocupa su duración, con el color de su estado (ver la leyenda); tocarla abre el
 * detalle. Tocar un horario libre abre el asistente con la cancha, la fecha y la hora cargadas. Las
 * reservas que no coinciden con los filtros (tipo y estado) no se muestran. En el
 * celular se ve una cancha por vez. La fecha queda en la URL (?fecha=).
 */
/** Qué colores de la leyenda corresponden a cada filtro de estado */
const CATEGORIAS_DEL_ESTADO: Record<string, Categoria[]> = {
    "todas": ["pagada", "por-cobrar", "pendiente", "deuda"],
    "por-cobrar": ["por-cobrar", "deuda"],
    "sin-pagar": ["pendiente"],
    "pagadas": ["pagada"],
    "canceladas": [],
};

/**
 * Quién juega, para la tarjeta: con más de un jugador, todos de a dos por renglón
 * ("Jugador 1 - Jugador 2" / "Jugador 3 - Jugador 4"); si no, el titular.
 */
function filasJugadores(r: ReservaResponse): string[] {
    const nombres = [...r.jugadores].sort((a, b) => a.posicion - b.posicion).map(j => j.nombre);
    if (nombres.length <= 1) return [r.clienteNombre];
    const filas: string[] = [];
    for (let i = 0; i < nombres.length; i += 2) filas.push(nombres.slice(i, i + 2).join(" - "));
    return filas;
}

export default function GrillaReservas({ fecha, coincide, estadoFiltro = "todas", tipoFiltro = "todas", version, onVer, onReservar }: {
    /** El día que se ve (lo elige la pantalla, con el selector de fecha de los filtros) */
    fecha: string;
    /** Los filtros de la pantalla (tipo y estado): las que no coinciden no se muestran */
    coincide: (r: ReservaResponse) => boolean;
    /**
     * Filtro de estado ("todas", "por-cobrar", "sin-pagar", "pagadas", "canceladas"): la leyenda muestra
     * solo lo que corresponde; los horarios libres se ofrecen solo con "todas"; con "canceladas" se
     * ven también las canceladas y vencidas (no ocupan la cancha)
     */
    estadoFiltro?: string;
    /** Filtro de tipo ("todas", "reserva", "partido", "turnos-fijos"): los íconos de la leyenda */
    tipoFiltro?: string;
    /** Cambia al tocar "Actualizar" o al modificar una reserva */
    version: number;
    onVer: (r: ReservaResponse) => void;
    /** Se tocó un horario libre: cancha, fecha y hora de inicio (con la duración mínima) */
    onReservar: (turno: TurnoElegido) => void;
}) {
    const hoy = hoyISO();

    // Todas, también las dadas de baja: su columna aparece los días en que tienen reservas (las pasadas)
    const { canchas: todas, error: errorCanchas } = useCanchas(true);
    // Memorizadas: son dependencia de la carga de datos (un filter nuevo en cada render la repetiría sin fin)
    const canchas = useMemo(() => todas.filter(c => c.activa !== false), [todas]);
    const unaCancha = useMediaQuery(MEDIA_UNA_CANCHA);
    const [canchaMovil, setCanchaMovil] = useState<number | null>(null);

    // Un día pasado no tiene horarios libres (el backend no da disponibilidad de días pasados)
    const pasado = fecha < hoy;
    const mostrarCanceladas = estadoFiltro === "canceladas";
    // Los horarios libres se ofrecen solo sin filtro de estado (y en días de hoy en adelante)
    const conLibres = !pasado && estadoFiltro === "todas";
    const clave = `${fecha}|${version}|${todas.map(c => c.id).join(",")}`;
    const [datos, setDatos] = useState<Datos | null>(null);

    useEffect(() => {
        if (todas.length === 0) return;
        let activo = true;
        Promise.all([
            adminService.reservas({ desde: fecha, hasta: fecha, size: 100 }),
            adminService.horariosClub(),
            pasado ? Promise.resolve([]) : Promise.allSettled(canchas.map(c => canchaService.getDisponibilidad(c.id, fecha, null))),
        ]).then(([lista, club, disp]) => {
            if (!activo) return;
            const disponibilidad = Object.fromEntries(canchas.map((c, i) => {
                const d = disp[i];
                return [c.id, d?.status === "fulfilled" ? d.value : null];
            }));
            setDatos({ clave, reservas: lista.contenido, horarios: club.horarios, cierres: club.cierres ?? [], disponibilidad });
        }).catch(e => {
            if (activo) setDatos({ clave, error: primerError(extraerErrores(e, "No se pudo cargar la grilla.")) });
        });
        return () => { activo = false; };
    }, [clave, canchas, todas.length, fecha, pasado]); // todas.length: con solo canchas dadas de baja igual se carga

    const actual = datos?.clave === clave ? datos : null;
    // Mientras se actualiza se conserva lo anterior (sin parpadeo), si es del mismo día
    const vigente = actual ?? (datos?.clave.startsWith(`${fecha}|`) ? datos : null);
    // Las del día (con "Canceladas", también las canceladas y vencidas) y, de esas, las que coinciden
    // con los filtros: solo esas se ven (el rango de horas sí toma todas, para no cortar el día)
    const delDia = (vigente?.reservas ?? []).filter(r => ocupa(r) || mostrarCanceladas);
    const reservas = delDia.filter(coincide);

    // Horario actual del club ese día de la semana (null: ese día no abre). El rango de la grilla es ese
    // horario más cualquier reserva que haya quedado afuera: nunca se corta una reserva
    // Un día cerrado (feriado, obra) no tiene horario: no se ofrece nada y lo que haya queda fuera de horario
    const cierreDia = vigente?.cierres?.find(c => c.fecha === fecha) ?? null;
    const horarioDia = cierreDia ? null : vigente?.horarios?.find(h => h.dia === diaDeLaSemana(fecha)) ?? null;
    const abre = horarioDia ? minutos(horarioDia.apertura) : null;
    const cierra = horarioDia ? minutos(horarioDia.cierre, true) : null;
    const fueraDeHorario = (inicio: number, fin = inicio + BLOQUE) => abre === null || cierra === null || inicio < abre || fin > cierra;
    const inicios = [...(abre !== null ? [abre] : []), ...delDia.map(r => minutos(r.horaInicio))];
    const fines = [...(cierra !== null ? [cierra] : []), ...delDia.map(r => minutos(r.horaFin, true))];
    const reservasFuera = reservas.filter(r => fueraDeHorario(minutos(r.horaInicio), minutos(r.horaFin, true)));
    const apertura = inicios.length ? Math.floor(Math.min(...inicios) / BLOQUE) * BLOQUE : 0;
    const cierre = fines.length ? Math.ceil(Math.max(...fines) / BLOQUE) * BLOQUE : 0;
    const filas = Math.max(0, (cierre - apertura) / BLOQUE);

    // Las activas y las dadas de baja con alguna reserva ese día (para ver lo que se jugó)
    const delDiaPorCancha = new Set(delDia.map(r => r.canchaId));
    const visibles = todas.filter(c => c.activa !== false || delDiaPorCancha.has(c.id));
    const columnas = unaCancha ? visibles.filter(c => c.id === (canchaMovil ?? visibles[0]?.id)) : visibles;
    const fila = (min: number) => Math.round((min - apertura) / BLOQUE) + 2; // la fila 1 es la cabecera

    // Línea de la hora actual (hora del club)
    const ahora = new Date();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const mostrarAhora = fecha === hoy && minAhora >= apertura && minAhora <= cierre;

    /** Turnos libres que empiezan en ese bloque, en esa cancha (con la duración mínima) */
    const libre = (canchaId: number, inicio: number) => {
        if (!conLibres || cierreDia) return null;
        const d = vigente?.disponibilidad?.[canchaId];
        return d?.turnosDisponibles.find(t => minutos(t.horaInicio) === inicio) ?? null;
    };

    const reservar = (canchaId: number, horaInicio: string, horaFin: string) => onReservar({
        canchaId, fecha, slot: { inicio: minutos(horaInicio), fin: minutos(horaFin, true) },
    });

    return (
        <section className="grilla-reservas">
            {/* Qué representa cada color */}
            <ul className="grilla-leyenda" aria-label="Referencias">
                {LEYENDA.filter(l => (CATEGORIAS_DEL_ESTADO[estadoFiltro] ?? CATEGORIAS_DEL_ESTADO.todas).includes(l.id)).map(l => (
                    <li key={l.id}><span className={`grilla-leyenda__color grilla-color--${l.id}`} aria-hidden="true" />{l.etiqueta}</li>
                ))}
                {conLibres && !cierreDia && <li><span className="grilla-leyenda__color grilla-leyenda__color--libre" aria-hidden="true" />Libre: tocalo para reservar</li>}
                {(reservasFuera.length > 0 || !horarioDia) && <li><span className="grilla-leyenda__color grilla-leyenda__color--fuera" aria-hidden="true" />Fuera del horario actual</li>}
                {mostrarCanceladas && <li><span className="grilla-leyenda__color grilla-leyenda__color--fuera" aria-hidden="true" />Cancelada o vencida (tachada)</li>}
                {(tipoFiltro === "todas" || tipoFiltro === "partido") && <li><Swords size={13} aria-hidden="true" /> Partido</li>}
                {(tipoFiltro === "todas" || tipoFiltro === "turnos-fijos") && <li><Repeat size={13} aria-hidden="true" /> Turno fijo</li>}
            </ul>

            {unaCancha && visibles.length > 1 && (
                <div className="nr-canchas grilla-reservas__canchas" role="tablist" aria-label="Cancha">
                    {visibles.map(c => {
                        const activa = (canchaMovil ?? visibles[0]?.id) === c.id;
                        return (
                            <button key={c.id} type="button" role="tab" aria-selected={activa}
                                className={`nr-cancha${activa ? " nr-cancha--activa" : ""}`} onClick={() => setCanchaMovil(c.id)}>
                                Cancha {c.numero}{c.activa === false ? " (desactivada)" : ""}
                            </button>
                        );
                    })}
                </div>
            )}

            {errorCanchas && <Mensaje tipo="error">{errorCanchas}</Mensaje>}
            {actual?.error && <Mensaje tipo="error">{actual.error}</Mensaje>}

            {!vigente ? (!actual?.error && <Cargando />) : filas === 0 ? (
                <Vacio icono={<CalendarX2 size={32} />}>
                    {cierreDia ? `El club está cerrado ese día: ${cierreDia.motivo}.` : `El club no abre los ${diaDeLaSemana(fecha).toLowerCase()} y no hay reservas ese día.`}
                </Vacio>
            ) : (
                <div className={`grilla${vigente !== actual ? " ra-cargando" : ""}`}>
                    <div className="grilla__cuerpo" role="grid" aria-label={`Turnos del ${fecha}`}
                        style={{ gridTemplateColumns: `56px repeat(${columnas.length}, minmax(${unaCancha ? 0 : 150}px, 1fr))`, gridTemplateRows: `40px repeat(${filas}, var(--grilla-fila))` }}>
                        {/* Cabecera: canchas */}
                        <div className="grilla__esquina" style={{ gridRow: 1, gridColumn: 1 }} />
                        {columnas.map((c, i) => (
                            <div key={c.id} className={`grilla__cancha${c.activa === false ? " grilla__cancha--inactiva" : ""}`} role="columnheader" style={{ gridRow: 1, gridColumn: i + 2 }}
                                title={c.activa === false ? "Cancha dada de baja: se ven sus reservas, no se puede reservar" : undefined}>
                                Cancha {c.numero}{c.activa === false && <small> · desactivada</small>}
                            </div>
                        ))}

                        {/* Horas y celdas (libres o no) */}
                        {Array.from({ length: filas }, (_, f) => {
                            const inicio = apertura + f * BLOQUE;
                            return [
                                <div key={`h${f}`} className={`grilla__hora${inicio % 60 === 0 ? " grilla__hora--entera" : ""}${fueraDeHorario(inicio) ? " grilla__hora--fuera" : ""}`} style={{ gridRow: f + 2, gridColumn: 1 }}>
                                    {minToTime(inicio)}
                                </div>,
                                ...columnas.map((c, i) => {
                                    const t = libre(c.id, inicio);
                                    const estilo = { gridRow: f + 2, gridColumn: i + 2 };
                                    return t ? (
                                        <button key={`${c.id}-${f}`} type="button" className="grilla__celda grilla__celda--libre" style={estilo}
                                            onClick={() => reservar(c.id, t.horaInicio, t.horaFin)}
                                            aria-label={`Reservar cancha ${c.numero} a las ${minToTime(inicio)}`} title={`Reservar ${minToTime(inicio)} a ${horaCorta(t.horaFin)}`}>
                                            <span>+ {minToTime(inicio)}</span>
                                        </button>
                                    ) : (
                                        <div key={`${c.id}-${f}`} className={`grilla__celda${fueraDeHorario(inicio) ? " grilla__celda--fuera" : ""}`} style={estilo}
                                            title={fueraDeHorario(inicio) ? "Fuera del horario actual del club" : undefined} />
                                    );
                                }),
                            ];
                        })}

                        {/* Reservas: cada una ocupa su duración */}
                        {reservas.map(r => {
                            const i = columnas.findIndex(c => c.id === r.canchaId);
                            if (i < 0) return null;
                            const desde = fila(Math.max(minutos(r.horaInicio), apertura));
                            const hasta = fila(Math.min(minutos(r.horaFin, true), cierre));
                            const debe = deuda(r);
                            const cat = categoria(r);
                            const fuera = fueraDeHorario(minutos(r.horaInicio), minutos(r.horaFin, true));
                            return (
                                <button key={r.id} type="button" onClick={() => onVer(r)}
                                    className={`grilla__reserva grilla-color--${cat}${fuera ? " grilla__reserva--fuera" : ""}${ocupa(r) ? "" : " grilla__reserva--cancelada"}`}
                                    style={{ gridRow: `${desde} / ${Math.max(hasta, desde + 1)}`, gridColumn: i + 2 }}
                                    title={`${r.clienteNombre} · ${horaCorta(r.horaInicio)} a ${horaCorta(r.horaFin)} · ${etiquetaEstado(r)}${debe > 0 ? ` · debe ${formatMonto(debe)}` : ""}${fuera ? " · fuera del horario actual" : ""}`}
                                    aria-label={`Ver ${esPartido(r) ? "el partido" : "la reserva"} #${r.id} de ${r.clienteNombre}, ${horaCorta(r.horaInicio)} a ${horaCorta(r.horaFin)}, ${etiquetaEstado(r)}`}>
                                    {/* El ícono (partido o turno fijo) arriba de todo y debajo los jugadores, de a dos */}
                                    {(r.turnoFijoId !== null || esPartido(r)) && (
                                        <span className="grilla__reserva-icono" aria-hidden="true">
                                            {r.turnoFijoId !== null ? <Repeat size={14} /> : <Swords size={14} />}
                                        </span>
                                    )}
                                    {filasJugadores(r).map((fila, n) => (
                                        <span key={n} className="grilla__reserva-titulo grilla__reserva-nombres">{fila}</span>
                                    ))}
                                    <span className="grilla__reserva-detalle">{horaCorta(r.horaInicio)} – {horaCorta(r.horaFin)} · {etiquetaEstado(r)}</span>
                                    {debe > 0 && <span className="grilla__reserva-debe">Debe {formatMonto(debe)}</span>}
                                    {fuera && <span className="grilla__reserva-fuera"><AlertTriangle size={11} /> Fuera de horario</span>}
                                </button>
                            );
                        })}

                        {mostrarAhora && (
                            <div className="grilla__ahora" aria-hidden="true"
                                style={{ gridRow: `${fila(Math.floor(minAhora / BLOQUE) * BLOQUE)}`, gridColumn: `2 / ${columnas.length + 2}`, "--grilla-ahora": (minAhora % BLOQUE) / BLOQUE } as React.CSSProperties} />
                        )}
                    </div>
                </div>
            )}
            {cierreDia && filas > 0 && (
                <p className="grilla-reservas__aviso"><AlertTriangle size={14} /> El club está cerrado ese día: {cierreDia.motivo}. No se puede reservar.</p>
            )}
            {vigente && !cierreDia && reservasFuera.length > 0 && (
                <p className="grilla-reservas__aviso">
                    <AlertTriangle size={14} />
                    {reservasFuera.length === 1 ? "1 reserva quedó" : `${reservasFuera.length} reservas quedaron`} fuera del horario actual del club
                    ({horarioDia ? `los ${diaDeLaSemana(fecha).toLowerCase()} abre de ${horaCorta(horarioDia.apertura)} a ${horaCorta(horarioDia.cierre)}` : `los ${diaDeLaSemana(fecha).toLowerCase()} no abre`}):
                    {pasado ? " se ve completa, como se jugó." : " sigue en pie; reprogramala o cancelala desde su detalle si hace falta."}
                </p>
            )}
            {pasado && vigente && <p className="nr-ayuda">Es un día pasado: se ven los turnos con el horario actual del club, pero no se puede reservar.</p>}
        </section>
    );
}
