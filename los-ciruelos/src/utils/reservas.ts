import type { EstadoReserva, PagoResponse, ReservaResponse } from "../types/reserva.types";
import { formatFechaHora, parseFechaHora } from "./fechas";

/*
 * Reglas de negocio de la reserva tal como las aplica el backend
 * (LosCiruelos-Backend/docs/flujos-de-negocio.md). Se usan para decidir qué
 * acciones mostrar; el backend vuelve a validar todo.
 */

export const ETIQUETA_ESTADO: Record<EstadoReserva, string> = {
    PENDIENTE: "Pendiente de pago",
    CONFIRMADA: "Confirmado",
    SEÑADA: "Señada",
    PARCIALMENTE_PAGADA: "Pago parcial",
    PAGADA: "Pagada",
    CANCELADA: "Cancelada",
    EXPIRADA: "Vencida",
    COMPLETADA: "Jugada",
};

const n = (valor: number | null | undefined) => Number(valor ?? 0);

/**
 * Una PENDIENTE vence a los 15 minutos o cuando empieza el turno, lo que pase primero: si no se pagó
 * y el horario ya llegó, no tiene sentido seguir con esa reserva (el job del backend la marca después).
 */
export function estaVencida(reserva: ReservaResponse, ahora = Date.now()): boolean {
    if (reserva.estado !== "PENDIENTE") return false;
    if (reserva.expiresAt !== null && parseFechaHora(reserva.expiresAt).getTime() <= ahora) return true;
    const inicio = new Date(`${reserva.fechaReserva}T${reserva.horaInicio.slice(0, 5)}:00-03:00`).getTime();
    return inicio <= ahora && !reserva.pagos.some(p => p.estado === "EN_PROCESO");
}

export function pagoEnProceso(reserva: ReservaResponse): PagoResponse | undefined {
    return reserva.pagos.find(p => p.estado === "EN_PROCESO");
}

/** PENDIENTE dentro de plazo, o con un pago en proceso (que la mantiene viva). */
export function esPendienteVigente(reserva: ReservaResponse): boolean {
    return reserva.estado === "PENDIENTE" && (!estaVencida(reserva) || pagoEnProceso(reserva) !== undefined);
}

/**
 * Se puede iniciar un pago online: PENDIENTE en plazo, SEÑADA o PARCIALMENTE_PAGADA, sin pago en
 * proceso. Un partido no se paga online (se cobra en el club).
 */
export function admitePagoOnline(reserva: ReservaResponse): boolean {
    if (reserva.tipo === "PARTIDO" || pagoEnProceso(reserva) || n(reserva.montoPendiente) <= 0) return false;
    if (reserva.estado === "PENDIENTE") return !estaVencida(reserva);
    return reserva.estado === "SEÑADA" || reserva.estado === "PARCIALMENTE_PAGADA";
}

/**
 * Si el cliente puede cancelar: lo calcula el backend (`cancelable`) con la política de
 * cancelación. Una PENDIENTE vencida que el job todavía no marcó tampoco se ofrece.
 */
export function admiteCancelacion(reserva: ReservaResponse): boolean {
    // Un partido lo cancela solo el club
    return reserva.tipo !== "PARTIDO" && reserva.cancelable === true && !estaVencida(reserva);
}

export interface InfoCancelacion {
    pagado: number;
    reembolso: number;
    /** Por qué se devuelve eso (según el plazo de la política) */
    motivo: string;
    /** Por dónde vuelve la plata (si hay devolución) */
    medio?: string;
}

/**
 * Qué pasa si se cancela ahora: lo pagado, lo que se devuelve (montoReembolso, calculado
 * por el backend con la política) y el motivo según el plazo.
 */
export function infoCancelacion(reserva: ReservaResponse): InfoCancelacion {
    const pagado = n(reserva.montoPagado);
    const reembolso = n(reserva.montoReembolso);

    if (pagado <= 0) return { pagado, reembolso: 0, motivo: "No pagaste nada, así que no hay devolución. El turno se libera." };

    // Lo cobrado en el club (efectivo, Cuenta DNI o Mercado Pago cargado a mano) lo devuelve el club
    const pagosEnClub = reserva.pagos.some(p => p.estado === "APROBADO" && p.provider !== "BONIFICACION" && !p.externalPaymentId);
    const medio = pagosEnClub
        ? "Lo pagado online vuelve a tu medio de pago (puede demorar unos minutos); lo pagado en el club te lo devuelve el club."
        : "Vuelve al medio de pago que usaste en Mercado Pago. Puede demorar unos minutos.";

    if (reembolso >= pagado) {
        return { pagado, reembolso, medio, motivo: "Cancelás con anticipación: se devuelve todo lo pagado." };
    }
    if (reembolso > 0) {
        return {
            pagado, reembolso, medio,
            motivo: reserva.reembolsoTotalHasta
                ? `Se devuelve el valor de la seña. La devolución total era hasta el ${formatFechaHora(reserva.reembolsoTotalHasta)}.`
                : "Se devuelve el valor de la seña.",
        };
    }
    return {
        pagado, reembolso: 0,
        motivo: reserva.reembolsoSeniaHasta
            ? `Ya pasó el plazo de devolución: la seña se devolvía hasta el ${formatFechaHora(reserva.reembolsoSeniaHasta)}.`
            : "Faltan pocas horas para el turno: ya no hay devolución.",
    };
}

/** Estado de la devolución de una reserva cancelada (null si no hubo reembolso). */
export function estadoReembolso(reserva: ReservaResponse): {
    etiqueta: string;
    monto: number;
    tono: "ok" | "pendiente" | "apagado";
} | null {
    // Con el detalle de devoluciones (por línea, parciales): se suma cada una con su estado
    const devoluciones = reserva.pagos.filter(p => p.estado !== "ANULADO").flatMap(p => p.devoluciones ?? []);
    if (devoluciones.length > 0) {
        // Mientras falte algo se muestra lo que falta (no lo que ya se devolvió); si no, el total devuelto
        const suma = (estado?: string) => devoluciones.filter(d => !estado || d.estado === estado).reduce((s, d) => s + n(d.monto), 0);
        if (devoluciones.some(d => d.estado === "REEMBOLSO_PENDIENTE")) return { etiqueta: "Reembolso en proceso", monto: suma("REEMBOLSO_PENDIENTE"), tono: "pendiente" };
        if (devoluciones.some(d => d.estado === "A_REEMBOLSAR")) return { etiqueta: "A devolver por el club", monto: suma("A_REEMBOLSAR"), tono: "pendiente" };
        return { etiqueta: "Reembolsado", monto: suma(), tono: "ok" };
    }
    const conReembolso = reserva.pagos.filter(p =>
        p.estado === "REEMBOLSO_PENDIENTE" || p.estado === "DEVUELTO" || p.estado === "A_REEMBOLSAR");
    if (conReembolso.length === 0) return null;
    const monto = conReembolso.reduce((s, p) => s + n(p.montoReembolsado ?? p.monto), 0);
    // Lo más atrasado define el estado: en proceso > a devolver por el club > reembolsado
    if (conReembolso.some(p => p.estado === "REEMBOLSO_PENDIENTE")) return { etiqueta: "Reembolso en proceso", monto, tono: "pendiente" };
    if (conReembolso.some(p => p.estado === "A_REEMBOLSAR")) return { etiqueta: "A devolver por el club", monto, tono: "pendiente" };
    return { etiqueta: "Reembolsado", monto, tono: "ok" };
}

/**
 * Lo pagado más lo bonificado por el club: es lo que confirma la reserva y define lo que falta
 * (igual que getMontoCubierto del backend). montoPagado solo es plata.
 */
export function montoCubierto(reserva: ReservaResponse): number {
    return n(reserva.montoPagado) + n(reserva.montoBonificado);
}

/** Lo que falta para completar la seña (0 si ya está cubierta, con pagos o bonificación). */
export function faltaParaSenia(reserva: ReservaResponse): number {
    return Math.max(0, Math.min(n(reserva.montoSenia) - montoCubierto(reserva), n(reserva.montoPendiente)));
}

/** Pago iniciado y todavía sin cobrar (si el usuario recargó la página). */
export function pagoIniciado(reserva: ReservaResponse): PagoResponse | undefined {
    return reserva.pagos.find(p => p.estado === "PENDIENTE" && p.provider === "MERCADO_PAGO");
}

export type ResultadoPago = "aprobado" | "rechazado" | "a_reembolsar" | "pendiente";

/**
 * Resultado de un pago puntual. Se mira el pago y no solo el estado de la reserva:
 * al pagar el saldo de una reserva SEÑADA, la reserva nunca estuvo PENDIENTE.
 */
export function resultadoDePago(pago: PagoResponse | undefined): ResultadoPago {
    switch (pago?.estado) {
        case "APROBADO": return "aprobado";
        case "RECHAZADO":
        case "EXPIRADO": return "rechazado";
        case "A_REEMBOLSAR":
        case "REEMBOLSO_PENDIENTE":
        case "DEVUELTO": return "a_reembolsar";
        default: return "pendiente"; // PENDIENTE o EN_PROCESO: Mercado Pago todavía no avisó
    }
}

/**
 * Pago que corresponde a una vuelta de Mercado Pago: el que tiene ese payment_id
 * o, si el webhook todavía no lo registró, el último pago online.
 */
export function pagoDeMercadoPago(reserva: ReservaResponse, paymentId?: string | null): PagoResponse | undefined {
    if (paymentId) {
        const exacto = reserva.pagos.find(p => p.externalPaymentId === paymentId);
        if (exacto) return exacto;
    }
    return [...reserva.pagos].reverse().find(p => p.provider === "MERCADO_PAGO");
}

/** Título de la pantalla de pago aprobado según cómo quedó la reserva */
export function tituloPagoAprobado(estado: EstadoReserva | undefined): string {
    if (estado === "PAGADA" || estado === "COMPLETADA") return "Turno pagado";
    if (estado === "SEÑADA") return "Turno señado";
    return "Pago recibido"; // PARCIALMENTE_PAGADA: se pagó menos que la seña
}

/** La reserva no puede cambiar más: no tiene sentido seguir consultándola. */
export function esEstadoFinal(estado: EstadoReserva): boolean {
    return estado === "CANCELADA" || estado === "EXPIRADA" || estado === "COMPLETADA" || estado === "PAGADA";
}

/** Un partido lo arma el ADMIN: el jugador lo ve, pero se paga en el club y lo cancela el club */
export const esPartido = (reserva: ReservaResponse) => reserva.tipo === "PARTIDO";
