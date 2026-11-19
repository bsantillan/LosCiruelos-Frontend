/*
 * Turno elegido antes de poder reservar (sin sesión o con el perfil incompleto).
 * Se guarda al ir a iniciar sesión, registrarse o completar el perfil, y Reservas lo
 * retoma al volver. Vive en sessionStorage: sobrevive a la navegación y al registro
 * en la misma pestaña, pero no queda para otro día.
 */

import type { ProductoPedido } from "../types/reserva.types";
import { esPersonal } from "./roles";

export interface SeleccionReserva {
    canchaId: number;
    fecha: string;
    /** "HH:mm" */
    horaInicio: string;
    horaFin: string;
    /** Puede faltar en una selección guardada con la versión anterior */
    productos?: ProductoPedido[];
    guardadaEn: number;
}

const CLAVE = "seleccionReserva";
/** Pasado este tiempo la selección ya no sirve (el turno pudo haberse ocupado o pasado) */
const VIGENCIA_MS = 2 * 60 * 60 * 1000;

export function guardarSeleccion(seleccion: Omit<SeleccionReserva, "guardadaEn">): void {
    try {
        sessionStorage.setItem(CLAVE, JSON.stringify({ ...seleccion, guardadaEn: Date.now() }));
    } catch {
        // sin storage (modo privado estricto): simplemente no se retoma
    }
}

export function leerSeleccion(): SeleccionReserva | null {
    try {
        const valor = sessionStorage.getItem(CLAVE);
        if (!valor) return null;
        const seleccion = JSON.parse(valor) as SeleccionReserva;
        if (Date.now() - seleccion.guardadaEn > VIGENCIA_MS) {
            sessionStorage.removeItem(CLAVE);
            return null;
        }
        return seleccion;
    } catch {
        return null;
    }
}

export function borrarSeleccion(): void {
    try {
        sessionStorage.removeItem(CLAVE);
    } catch {
        // nada que borrar
    }
}

/**
 * A dónde ir después de iniciar sesión: el personal del club, a su panel; un cliente que había
 * elegido un turno, a terminar la reserva (o antes a completar el perfil, porque sin perfil
 * completo el backend responde 403).
 */
export function destinoDespuesDelLogin(perfilCompleto: boolean, rol?: string): string {
    if (esPersonal(rol)) return "/admin";
    if (!leerSeleccion()) return "/";
    return perfilCompleto ? "/reservas" : "/perfil";
}
