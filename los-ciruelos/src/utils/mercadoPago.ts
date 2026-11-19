/**
 * Traduce el status_detail de Mercado Pago (campo `detalle` de PagoResponse)
 * a un mensaje para el usuario.
 * https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/additional-content/possible-errors
 */
const MENSAJES: Record<string, string> = {
    cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
    cc_rejected_bad_filled_security_code: "El código de seguridad es incorrecto.",
    cc_rejected_bad_filled_date: "La fecha de vencimiento es incorrecta.",
    cc_rejected_bad_filled_card_number: "El número de tarjeta es incorrecto.",
    cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
    cc_rejected_call_for_authorize: "Tenés que autorizar el pago con el banco emisor de la tarjeta.",
    cc_rejected_card_disabled: "La tarjeta está inhabilitada. Llamá al banco para activarla o usá otra.",
    cc_rejected_duplicated_payment: "Ya hiciste un pago por este monto. Si necesitás volver a pagar, usá otra tarjeta.",
    cc_rejected_high_risk: "El pago fue rechazado por seguridad. Probá con otra tarjeta.",
    cc_rejected_max_attempts: "Llegaste al límite de intentos con esta tarjeta. Probá con otra.",
    cc_rejected_blacklist: "No pudimos procesar el pago con esta tarjeta. Probá con otra.",
    cc_rejected_card_type_not_allowed: "Este tipo de tarjeta no está permitido. Probá con otra.",
    cc_rejected_other_reason: "El banco rechazó el pago. Probá con otra tarjeta.",
    pending_contingency: "Mercado Pago está procesando el pago. En menos de 2 días hábiles te avisamos el resultado.",
    pending_review_manual: "Mercado Pago está revisando el pago. En menos de 2 días hábiles te avisamos el resultado.",
};

export function mensajeDetallePago(detalle: string | null | undefined): string | null {
    return detalle ? MENSAJES[detalle] ?? null : null;
}
