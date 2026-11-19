import { initMercadoPago } from "@mercadopago/sdk-react";
import { ENV } from "./env";

/** true si se pudo inicializar el SDK (hay public key configurada) */
export const mercadoPagoDisponible = Boolean(ENV.MP_PUBLIC_KEY);

if (ENV.MP_PUBLIC_KEY) {
    initMercadoPago(ENV.MP_PUBLIC_KEY, { locale: "es-AR" });
}
