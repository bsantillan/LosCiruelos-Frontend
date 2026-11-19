/*
 * Marca de "pago en curso en Mercado Pago". Se guarda al tocar el botón de Mercado Pago
 * y la exige /pago/resultado: así a esa página solo se llega volviendo de Mercado Pago,
 * no escribiendo la URL. Va en localStorage porque Mercado Pago vuelve en otra pestaña
 * (sessionStorage es por pestaña).
 */
export interface PagoEnMercadoPago {
    reservaId: number;
    preferenceId: string;
    desde: number;
}

const CLAVE = "pagoMercadoPago";
// La preferencia vence con la reserva (15 min); se deja margen para el regreso
const VIGENCIA_MS = 30 * 60 * 1000;

export function marcarPagoEnMercadoPago(reservaId: number, preferenceId: string) {
    try {
        const marca: PagoEnMercadoPago = { reservaId, preferenceId, desde: Date.now() };
        localStorage.setItem(CLAVE, JSON.stringify(marca));
    } catch {
        // sin storage, /pago/resultado no va a poder validar el regreso: se ve en Mis reservas
    }
}

export function obtenerPagoEnMercadoPago(): PagoEnMercadoPago | null {
    try {
        const valor = localStorage.getItem(CLAVE);
        if (!valor) return null;
        const marca = JSON.parse(valor) as PagoEnMercadoPago;
        if (Date.now() - marca.desde > VIGENCIA_MS) {
            localStorage.removeItem(CLAVE);
            return null;
        }
        return marca;
    } catch {
        return null;
    }
}

export function borrarPagoEnMercadoPago() {
    try {
        localStorage.removeItem(CLAVE);
    } catch {
        // nada que hacer
    }
}

/**
 * ¿La URL corresponde al regreso de Mercado Pago para el pago que se abrió desde acá?
 * Mercado Pago agrega a las back_urls `preference_id`, `external_reference` (= id de la
 * reserva), `payment_id`, `status`, etc.
 */
export function esRetornoValido(params: URLSearchParams, marca: PagoEnMercadoPago | null): boolean {
    if (!marca) return false;
    const reservaId = params.get("reservaId");
    const preferenceId = params.get("preference_id");
    const referencia = params.get("external_reference");
    return reservaId === String(marca.reservaId)
        && preferenceId === marca.preferenceId
        && (referencia === null || referencia === reservaId);
}
