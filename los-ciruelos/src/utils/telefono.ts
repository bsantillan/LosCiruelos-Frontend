import { isPossiblePhoneNumber } from "react-phone-number-input";

/**
 * Teléfonos. El backend acepta el número con espacios, guiones o paréntesis, con o sin
 * 0, 15 o +54 9 ("011 15-1234-5678"), y lo guarda normalizado al formato de WhatsApp
 * ("5491112345678").
 */

/** Misma regla que el backend: ^[0-9+() -]{8,25}$ */
export const TELEFONO_VALIDO = /^[0-9+() -]{8,25}$/;

export function telefonoValido(valor: string): boolean {
    return TELEFONO_VALIDO.test(valor.trim()) && (valor.match(/\d/g)?.length ?? 0) >= 8;
}

/**
 * "5491112345678" → "+54 9 11 1234-5678"; "5492214551234" → "+54 9 221 455-1234".
 * Buenos Aires (11) tiene código de área de 2 dígitos; para el resto se usa el de 3,
 * el más común (221 La Plata, 223, 261, 341, 351…). Lo que no está normalizado se
 * muestra tal cual.
 */
export function formatTelefono(valor: string | null | undefined): string {
    if (!valor) return "";
    const digitos = valor.replace(/\D/g, "");
    if (!/^549\d{10}$/.test(digitos)) return valor;
    const resto = digitos.slice(3);
    const area = resto.startsWith("11") ? resto.slice(0, 2) : resto.slice(0, 3);
    const local = resto.slice(area.length);
    const corte = local.length - 4;
    return `+54 9 ${area} ${local.slice(0, corte)}-${local.slice(corte)}`;
}

/**
 * Para el selector de país (CampoTelefono): el número guardado ("5491112345678") en formato
 * internacional ("+5491112345678"); "" si no hay.
 */
export function aInternacional(valor: string | null | undefined): string {
    if (!valor) return "";
    const digitos = valor.replace(/\D/g, "");
    return digitos ? `+${digitos}` : "";
}

/** Lo que devuelve el selector de país ("+5491112345678"): un número posible para ese país */
export function celularValido(valor: string): boolean {
    return Boolean(valor) && isPossiblePhoneNumber(valor);
}

/** Si dos números son el mismo, sin importar el formato ("+54 9 11…" y "54911…") */
export const mismoTelefono = (a: string | null | undefined, b: string | null | undefined) =>
    (a ?? "").replace(/\D/g, "") === (b ?? "").replace(/\D/g, "");
