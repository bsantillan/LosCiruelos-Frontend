import { ENV } from "../config/env";

/** Lo que el backend acepta en una foto o imagen (fotos de cancha, imagen de una novedad) */
export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
export const MAXIMO_IMAGEN_MB = 5;

/** La url de un archivo del backend (GET /archivos/{nombre}): si viene relativa, se completa con la de la API */
export function urlArchivo(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//.test(url)) return url;
    return `${ENV.API_URL ?? ""}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Revisa una imagen antes de subirla: el error para mostrar, o null si va */
export function errorDeImagen(archivo: File): string | null {
    if (!TIPOS_IMAGEN.includes(archivo.type)) return "La imagen tiene que ser JPG, PNG o WEBP.";
    if (archivo.size > MAXIMO_IMAGEN_MB * 1024 * 1024) return `La imagen puede pesar hasta ${MAXIMO_IMAGEN_MB} MB.`;
    return null;
}
