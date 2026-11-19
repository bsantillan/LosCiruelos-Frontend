import { useState, useEffect, useMemo } from "react";
import { isCancel } from "axios";
import { canchaService } from "../services/canchaService";
import type { DisponibilidadResponse, SlotLibre } from "../types/reserva.types";
import { timeToMin } from "../utils/fechas";
import { extraerErrores, primerError } from "../utils/apiErrors";

interface Resultado {
    clave: string;
    data?: DisponibilidadResponse;
    error?: string;
}

/**
 * Disponibilidad de una cancha para una fecha y duración. El backend calcula los
 * turnos libres (`turnosDisponibles`) con las mismas reglas que usa al reservar;
 * sin duración usa la mínima configurada.
 */
export function useDisponibilidad(canchaId: number | null, fecha: string, duracion: number | null) {
    const [version, setVersion] = useState(0);
    const clave = canchaId ? `${canchaId}|${fecha}|${duracion ?? ""}|${version}` : null;
    const [resultado, setResultado] = useState<Resultado | null>(null);

    useEffect(() => {
        if (!canchaId || !clave) return;
        const controller = new AbortController();
        canchaService.getDisponibilidad(canchaId, fecha, duracion, controller.signal)
            .then(data => setResultado({ clave, data }))
            .catch(error => {
                if (isCancel(error)) return;
                const errores = extraerErrores(error, "No se pudieron cargar los horarios.");
                setResultado({ clave, error: primerError(errores) });
            });
        return () => controller.abort();
    }, [clave, canchaId, fecha, duracion]);

    const actual = resultado?.clave === clave ? resultado : null;
    const cargando = clave !== null && actual === null;

    // Mientras carga se conservan los últimos límites de duración conocidos
    const disponibilidad = actual?.data ?? (cargando ? resultado?.data ?? null : null);

    const turnosLibres: SlotLibre[] = useMemo(
        () => (actual?.data?.turnosDisponibles ?? []).map(t => ({
            inicio: timeToMin(t.horaInicio),
            fin: timeToMin(t.horaFin),
        })),
        [actual]
    );

    /** Vuelve a pedir los turnos (por ejemplo, si el que se eligió se ocupó mientras tanto) */
    const recargar = () => setVersion(v => v + 1);

    return { disponibilidad, turnosLibres, cargando, error: actual?.error ?? null, recargar };
}
