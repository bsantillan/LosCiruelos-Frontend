import { ENV } from "../config/env";

/** Lo que el backend acepta en una foto o imagen (fotos de cancha, imagen de una novedad) */
export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
/** Lo que acepta el backend por imagen (ya achicada en el navegador) */
export const MAXIMO_IMAGEN_MB = 5;
/** Lo que se puede elegir: una foto del celular pesa más, pero se achica antes de subirla */
export const MAXIMO_ORIGINAL_MB = 25;
/** El backend guarda hasta 1600 px de lado: no hace falta subir más */
const LADO_MAXIMO = 1600;
const CALIDAD_JPG = 0.85;

/** La url de un archivo del backend (GET /archivos/{nombre}): si viene relativa, se completa con la de la API */
export function urlArchivo(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//.test(url)) return url;
    return `${ENV.API_URL ?? ""}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Revisa una imagen antes de subirla: el error para mostrar, o null si va */
export function errorDeImagen(archivo: File): string | null {
    if (!TIPOS_IMAGEN.includes(archivo.type)) return "La imagen tiene que ser JPG, PNG o WEBP.";
    if (archivo.size > MAXIMO_ORIGINAL_MB * 1024 * 1024) return `La imagen puede pesar hasta ${MAXIMO_ORIGINAL_MB} MB.`;
    return null;
}

/** Si algún píxel no es opaco (un logo con fondo transparente) */
function tieneTransparencia(contexto: CanvasRenderingContext2D, ancho: number, alto: number): boolean {
    const datos = contexto.getImageData(0, 0, ancho, alto).data;
    for (let i = 3; i < datos.length; i += 4) {
        if (datos[i] < 255) return true;
    }
    return false;
}

/**
 * Achica la imagen en el navegador antes de subirla: hasta 1600 px de lado, como JPG al 85 % (PNG si
 * tiene partes transparentes), girada según la cámara y sin los metadatos (la ubicación GPS de una foto
 * del celular). Así una foto de 5 MB sube en un segundo en vez de 20 con 4G. El backend la vuelve a
 * procesar igual (no confía en esto); si el navegador no puede, se sube la original.
 */
export async function prepararImagen(archivo: File): Promise<File> {
    try {
        const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
        const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
        const ancho = Math.round(imagen.width * escala);
        const alto = Math.round(imagen.height * escala);
        const lienzo = document.createElement("canvas");
        lienzo.width = ancho;
        lienzo.height = alto;
        const contexto = lienzo.getContext("2d");
        if (!contexto) return archivo;
        contexto.imageSmoothingQuality = "high";
        contexto.drawImage(imagen, 0, 0, ancho, alto);
        imagen.close();

        const png = archivo.type !== "image/jpeg" && tieneTransparencia(contexto, ancho, alto);
        const tipo = png ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>(listo => lienzo.toBlob(listo, tipo, png ? undefined : CALIDAD_JPG));
        // Si achicarla no ahorra nada (ya venía chica y comprimida), va la original
        if (!blob || blob.size >= archivo.size) return archivo;
        const nombre = archivo.name.replace(/\.[^.]+$/, "") + (png ? ".png" : ".jpg");
        return new File([blob], nombre, { type: tipo });
    } catch {
        return archivo;
    }
}
