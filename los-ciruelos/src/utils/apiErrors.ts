import { isAxiosError } from "axios";

export type ErroresApi = Record<string, string | undefined> & { general?: string };

/**
 * Normaliza los errores del backend a { campo: mensaje, general?: mensaje }.
 *   { errors: { campo: "msg" } }   errores por campo (400 de validación, 403 email_verificado, …)
 *   { error: "msg" }               error general (401, 403, 404, 409, 502, …)
 *   { errors: "msg" }              formato viejo, se mantiene por compatibilidad
 */
export function extraerErrores(error: unknown, mensajePorDefecto: string): ErroresApi {
    if (!isAxiosError(error)) return { general: mensajePorDefecto };

    if (!error.response) {
        return { general: "No pudimos conectarnos con el servidor. Revisá tu conexión." };
    }

    const { status } = error.response;
    const data = error.response.data as { errors?: unknown; error?: unknown } | undefined;

    if (data?.errors && typeof data.errors === "object") {
        return data.errors as ErroresApi;
    }
    if (typeof data?.errors === "string") return { general: data.errors };
    if (typeof data?.error === "string") return { general: data.error };

    if (status === 429) {
        const segundos = Number(error.response.headers?.["retry-after"]);
        return {
            general: Number.isFinite(segundos) && segundos > 0
                ? `Demasiados intentos. Esperá ${segundos} segundos y volvé a probar.`
                : "Demasiados intentos. Esperá un minuto y volvé a probar.",
        };
    }
    if (status === 502) return { general: "Mercado Pago no respondió. Intentá de nuevo en unos minutos." };

    return { general: mensajePorDefecto };
}

/** Devuelve el primer mensaje disponible (útil cuando la pantalla no tiene campos). */
export function primerError(errores: ErroresApi): string | undefined {
    return errores.general ?? Object.values(errores).find(Boolean);
}

/** Código HTTP del error, si lo hay */
export function estadoHttp(error: unknown): number | undefined {
    return isAxiosError(error) ? error.response?.status : undefined;
}
