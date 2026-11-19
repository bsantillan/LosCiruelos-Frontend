import type { DiaSemana, TurnoFijo } from "../../types/admin.types";
import { formatFecha, horaCorta, hoyISO, sumarDias } from "../../utils/fechas";

export const DIA: Record<DiaSemana, string> = {
    MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles", THURSDAY: "Jueves",
    FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** "martes" (el día de la semana de una fecha ISO) */
export const diaDe = (fecha: string) => DIAS[new Date(`${fecha}T12:00:00`).getDay()];

/**
 * Fecha desde la que se edita: la original si todavía no pasó; si no, la próxima de ese mismo día
 * de la semana (los horarios libres solo se consultan para hoy en adelante)
 */
export function fechaParaEditar(desde: string): string {
    let fecha = desde;
    while (fecha < hoyISO()) fecha = sumarDias(fecha, 7);
    return fecha;
}

/** Qué pasó al crear o modificar: fechas que no se pudieron crear y partidos con pagos que no cambiaron */
export function resultadoGuardado(t: TurnoFijo, nuevo: boolean): string {
    const partes = [nuevo ? `Turno fijo creado: ${DIA[t.diaSemana].toLowerCase()} ${horaCorta(t.horaInicio)} hs, cancha ${t.canchaNumero}.` : "Se guardaron los cambios del turno fijo."];
    if (t.fechasOmitidas?.length) {
        partes.push(`No se pudieron crear: ${t.fechasOmitidas.map(f => `${formatFecha(f.fecha)} (${f.motivo})`).join("; ")}. Se vuelve a intentar solo.`);
    }
    if (t.partidosSinCambiar?.length) {
        partes.push(`Quedaron como estaban, porque tienen pagos: ${t.partidosSinCambiar.map(p => `${formatFecha(p.fecha)} (#${p.reservaId})`).join(", ")}. Se editan uno por uno desde Reservas.`);
    }
    return partes.join(" ");
}
