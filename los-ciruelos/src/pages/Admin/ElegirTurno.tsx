import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import SelectorFecha from "../../components/ui/SelectorFecha/SelectorFecha";
import { useCanchas } from "../../hooks/useCanchas";
import { useDisponibilidad } from "../../hooks/useDisponibilidad";
import type { SlotLibre } from "../../types/reserva.types";
import { formatFecha, formatMonto, minToTime } from "../../utils/fechas";
import { Mensaje } from "./comunes";
import "./NuevaReserva.css";
import "./ReservasAdmin.css";

const PASO_DURACION = 30;

/** 90 → "1 h 30 min" */
function duracionTexto(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return [h > 0 && `${h} h`, m > 0 && `${m} min`].filter(Boolean).join(" ");
}

export interface TurnoElegido {
    canchaId: number | null;
    /** null mientras no se elige (el asistente no propone una fecha) */
    fecha: string | null;
    slot: SlotLibre | null;
    /** Precio de la cancha para el horario elegido (se guarda al elegirlo, para el resumen) */
    precioCancha?: number | null;
}

/**
 * Cancha, fecha, duración y horario libre (con las reglas del backend). Al editar, `actual` es el
 * horario que ya ocupa la reserva: la disponibilidad lo ve ocupado, pero se puede conservar.
 * Con `inicioFijo` (un horario libre tocado en la grilla) la cancha, la fecha y la hora de inicio ya
 * están elegidas: solo se elige la duración, y "Elegir otro horario" vuelve al selector completo.
 */
export default function ElegirTurno({ valor, onChange, actual, fechaFija = false, ayudaFecha, inicioFijo, onLiberarInicio }: {
    valor: TurnoElegido;
    onChange: (t: TurnoElegido) => void;
    actual?: TurnoElegido;
    /** No se puede cambiar la fecha (un partido de un turno fijo) */
    fechaFija?: boolean;
    ayudaFecha?: string;
    /** Minutos del día en que empieza el turno elegido en la grilla */
    inicioFijo?: number;
    onLiberarInicio?: () => void;
}) {
    const { canchas } = useCanchas();
    const canchaId = valor.canchaId ?? canchas[0]?.id ?? null;
    const [duracion, setDuracion] = useState<number | null>(
        valor.slot ? valor.slot.fin - valor.slot.inicio : null);
    // Sin fecha no se consultan horarios
    const { disponibilidad, turnosLibres, cargando, error } = useDisponibilidad(valor.fecha ? canchaId : null, valor.fecha ?? "", duracion);

    // El horario actual de la reserva que se edita, si es de esta cancha, fecha y duración
    const actualAca = actual?.slot && actual.canchaId === canchaId && actual.fecha === valor.fecha
        && (duracion === null || actual.slot.fin - actual.slot.inicio === (disponibilidad?.duracion ?? duracion))
        ? actual.slot : null;
    const opciones = actualAca && !turnosLibres.some(s => s.inicio === actualAca.inicio)
        ? [...turnosLibres, actualAca].sort((a, b) => a.inicio - b.inicio)
        : turnosLibres;
    const precioCancha = disponibilidad?.montoCancha != null ? Number(disponibilidad.montoCancha) : null;

    const cambiar = (cambios: Partial<TurnoElegido>) => onChange({ ...valor, canchaId, ...cambios });

    // Un horario que ya vino elegido (desde la grilla o al editar) no trae el precio: se completa
    // cuando llega la disponibilidad de esa duración
    const sinPrecio = valor.slot !== null && valor.precioCancha === undefined && precioCancha !== null
        && disponibilidad?.duracion === valor.slot.fin - valor.slot.inicio;
    useEffect(() => {
        if (sinPrecio) onChange({ ...valor, canchaId, precioCancha });
    }, [sinPrecio, valor, canchaId, precioCancha, onChange]);

    // Hora de inicio fija: con cada duración, el turno libre que empieza a esa hora (o ninguno)
    const listo = inicioFijo !== undefined && !cargando && disponibilidad !== null
        && (duracion === null || disponibilidad.duracion === duracion);
    const slotFijo = listo ? turnosLibres.find(s => s.inicio === inicioFijo) ?? null : null;
    const cambiaSlot = listo && (slotFijo
        ? valor.slot?.inicio !== slotFijo.inicio || valor.slot?.fin !== slotFijo.fin
        : valor.slot !== null);
    useEffect(() => {
        if (cambiaSlot) onChange({ ...valor, canchaId, slot: slotFijo, precioCancha: slotFijo ? precioCancha : undefined });
    }, [cambiaSlot, slotFijo, valor, canchaId, precioCancha, onChange]);

    if (inicioFijo !== undefined) {
        const cancha = canchas.find(c => c.id === canchaId);
        const minima = disponibilidad?.duracionMinimaTurno ?? 30;
        const maxima = disponibilidad?.duracionMaximaTurno ?? minima;
        const actualDur = disponibilidad?.duracion ?? duracion;
        const duraciones = Array.from({ length: Math.max(0, (maxima - minima) / PASO_DURACION + 1) }, (_, i) => minima + i * PASO_DURACION);
        return (
            <div className="elegir-turno">
                <p className="elegir-turno__fijo">
                    Cancha {cancha?.numero ?? "—"} · <span style={{ textTransform: "capitalize" }}>{valor.fecha ? formatFecha(valor.fecha) : "—"}</span> · desde las <strong>{minToTime(inicioFijo)}</strong>
                </p>
                <div>
                    <span className="elegir-turno__etiqueta"><Clock size={14} /> Duración del turno</span>
                    <div className="ra-chips" role="radiogroup" aria-label="Duración del turno">
                        {duraciones.map(d => (
                            <button key={d} type="button" role="radio" aria-checked={actualDur === d}
                                className={`ra-chip${actualDur === d ? " ra-chip--activo" : ""}`}
                                onClick={() => setDuracion(d)}>
                                {duracionTexto(d)}
                            </button>
                        ))}
                    </div>
                </div>
                {cargando || !listo ? (
                    <p className="nr-ayuda">Consultando el horario…</p>
                ) : error ? (
                    <Mensaje fijo tipo="error">{error}</Mensaje>
                ) : slotFijo ? (
                    <p className="elegir-turno__resultado">
                        {minToTime(slotFijo.inicio)} a {minToTime(slotFijo.fin)} hs{precioCancha !== null && <> · <strong>{formatMonto(precioCancha)}</strong></>}
                    </p>
                ) : (
                    <Mensaje fijo tipo="error">
                        No entra un turno de {duracionTexto(actualDur ?? minima)} desde las {minToTime(inicioFijo)}: se superpone con otra reserva o pasa el cierre. Probá con menos tiempo u otro horario.
                    </Mensaje>
                )}
                {onLiberarInicio && (
                    <button type="button" className="accion accion--chica elegir-turno__otro" onClick={onLiberarInicio}>
                        Elegir otra cancha, fecha u horario
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="elegir-turno">
            <div className="nr-turno-controles">
                <div className="nr-canchas" role="tablist" aria-label="Cancha">
                    {canchas.map(c => (
                        <button key={c.id} type="button" role="tab" aria-selected={canchaId === c.id}
                            className={`nr-cancha${canchaId === c.id ? " nr-cancha--activa" : ""}`}
                            onClick={() => cambiar({ canchaId: c.id, slot: null })}>
                            Cancha {c.numero}
                        </button>
                    ))}
                </div>
                {!fechaFija && <SelectorFecha valor={valor.fecha} onChange={f => cambiar({ fecha: f, slot: null })} />}
            </div>
            {ayudaFecha && <p className="nr-ayuda">{ayudaFecha}</p>}

            {disponibilidad && (
                <div className="nr-duracion">
                    <Clock size={14} />
                    <span>Duración</span>
                    <button type="button" className="nr-duracion__btn" aria-label="Menos tiempo"
                        disabled={disponibilidad.duracion <= disponibilidad.duracionMinimaTurno}
                        onClick={() => { setDuracion(disponibilidad.duracion - PASO_DURACION); cambiar({ slot: null }); }}>−</button>
                    <strong>{disponibilidad.duracion} min</strong>
                    <button type="button" className="nr-duracion__btn" aria-label="Más tiempo"
                        disabled={disponibilidad.duracion >= disponibilidad.duracionMaximaTurno}
                        onClick={() => { setDuracion(disponibilidad.duracion + PASO_DURACION); cambiar({ slot: null }); }}>+</button>
                    {precioCancha !== null && <span className="nr-duracion__precio">{formatMonto(precioCancha)}</span>}
                </div>
            )}

            {!valor.fecha ? (
                <p className="nr-ayuda">Elegí la fecha para ver los horarios libres.</p>
            ) : cargando ? (
                <p className="nr-ayuda">Cargando horarios…</p>
            ) : error ? (
                <Mensaje fijo tipo="error">{error}</Mensaje>
            ) : opciones.length === 0 ? (
                <p className="nr-ayuda">No quedan turnos libres de esta duración en esta cancha y fecha.</p>
            ) : (
                <div className="nr-slots">
                    {opciones.map(s => {
                        const activo = valor.slot?.inicio === s.inicio && valor.slot?.fin === s.fin;
                        return (
                            <button key={s.inicio} type="button" aria-pressed={activo}
                                className={`nr-slot${activo ? " nr-slot--activo" : ""}`} onClick={() => cambiar({ slot: s, precioCancha })}>
                                {minToTime(s.inicio)} – {minToTime(s.fin)}
                                {s === actualAca && " (actual)"}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
