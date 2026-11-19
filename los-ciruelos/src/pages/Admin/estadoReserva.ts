import type { ReservaResponse } from "../../types/reserva.types";
import { horaCorta } from "../../utils/fechas";
import { ETIQUETA_ESTADO, estaVencida, pagoEnProceso } from "../../utils/reservas";

/** Clase del chip según el estado de la reserva */
export function tonoEstado(r: ReservaResponse): string {
    if (r.debeSaldo || r.estado === "PENDIENTE" || r.estado === "CONFIRMADA" || r.estado === "PARCIALMENTE_PAGADA") return "admin-chip--alerta";
    if (r.estado === "CANCELADA" || r.estado === "EXPIRADA") return "admin-chip--error";
    return "admin-chip--ok";
}

export function etiquetaEstado(r: ReservaResponse): string {
    if (r.debeSaldo) return "Jugada · debe saldo";
    if (r.estado === "PENDIENTE" && estaVencida(r)) return "Vencida";
    return ETIQUETA_ESTADO[r.estado];
}

/** Lo que falta cobrar (las canceladas y vencidas no deben nada) */
export function deuda(r: ReservaResponse): number {
    if (r.estado === "CANCELADA" || r.estado === "EXPIRADA" || (r.estado === "PENDIENTE" && estaVencida(r))) return 0;
    return Number(r.montoPendiente);
}

/**
 * Se puede cobrar en el club: seña, saldo o total de una SEÑADA, PARCIALMENTE_PAGADA o de un
 * partido CONFIRMADA (aunque no se haya jugado), o de una PENDIENTE mientras está en plazo, sin
 * un pago en revisión (online o con el QR de la caja).
 */
export function admiteCobro(r: ReservaResponse): boolean {
    if (pagoEnProceso(r) || deuda(r) <= 0) return false;
    return r.estado === "CONFIRMADA" || r.estado === "SEÑADA" || r.estado === "PARCIALMENTE_PAGADA" || r.estado === "PENDIENTE";
}

/** Sigue viva y no terminó: se puede cancelar (o dar de baja esa fecha), sin un pago en revisión */
function cancelable(r: ReservaResponse): boolean {
    if (pagoEnProceso(r) || r.turnoTerminado) return false;
    if (r.estado === "PENDIENTE") return !estaVencida(r);
    return r.estado === "CONFIRMADA" || r.estado === "SEÑADA" || r.estado === "PARCIALMENTE_PAGADA" || r.estado === "PAGADA";
}

/**
 * El personal puede cancelar hasta que termina el turno, sin un pago en revisión. Un partido lo
 * cancela solo el ADMIN. Un partido de turno fijo no se cancela: se da de baja esa fecha (es lo
 * mismo, con la devolución, y el turno fijo no la vuelve a crear).
 */
export function admiteCancelacionPersonal(r: ReservaResponse, esAdmin: boolean): boolean {
    if (r.turnoFijoId !== null) return false;
    if (r.tipo === "PARTIDO" && !esAdmin) return false;
    return cancelable(r);
}

/** "Baja de esta fecha" de un partido de turno fijo (ADMIN): mientras no terminó */
export function admiteBajaFecha(r: ReservaResponse, esAdmin: boolean): boolean {
    return esAdmin && r.turnoFijoId !== null && cancelable(r);
}

/** El turno ya empezó (hora del club, Argentina sin horario de verano) */
export function turnoEmpezado(r: ReservaResponse, ahora = Date.now()): boolean {
    return new Date(`${r.fechaReserva}T${horaCorta(r.horaInicio)}:00-03:00`).getTime() <= ahora;
}

/**
 * El personal puede sumar o sacar productos en una reserva confirmada (también pagada o jugada),
 * sin un pago en revisión. No en una PENDIENTE, cancelada o vencida.
 */
export function admiteCambiarProductos(r: ReservaResponse): boolean {
    if (pagoEnProceso(r)) return false;
    return r.estado === "CONFIRMADA" || r.estado === "SEÑADA" || r.estado === "PARCIALMENTE_PAGADA"
        || r.estado === "PAGADA" || r.estado === "COMPLETADA";
}
