import type { ConceptoCuenta, Imputacion, PagoResponse, ReservaProducto, ReservaResponse } from "../../types/reserva.types";
import { hoyISO, sumarDias } from "../../utils/fechas";
import { montoCubierto } from "../../utils/reservas";

/**
 * La cuenta de una reserva o partido, línea por línea: la cancha y cada producto, con lo que tiene
 * cobrado (o bonificado) y lo que falta.
 *
 * Cada pago dice qué líneas cubre (imputación). Mientras el backend no mande los montos por línea,
 * se reparte lo cubierto como lo hará él con los pagos sin imputar: primero la cancha y después los
 * productos, en el orden en que se agregaron.
 */
export interface LineaCuenta {
    /** Identifica la línea en la pantalla ("CANCHA" o "P<productoId>") */
    clave: string;
    concepto: ConceptoCuenta;
    /** id de la línea en el backend (null para la cancha) */
    lineaId: number | null;
    nombre: string;
    subtotal: number;
    pagado: number;
    pendiente: number;
    /** Solo en las líneas de producto */
    producto: ReservaProducto | null;
}

const n = (v: number | null | undefined) => Number(v ?? 0);
const redondear = (v: number) => Math.round(v * 100) / 100;

/** El backend ya manda lo cobrado por línea (y acepta imputaciones al cobrar) */
export const conImputacion = (r: ReservaResponse) => r.montoCanchaPagado !== undefined && r.montoCanchaPagado !== null;

export function lineasCuenta(r: ReservaResponse): LineaCuenta[] {
    const lineas: LineaCuenta[] = [
        { clave: "CANCHA", concepto: "CANCHA", lineaId: null, nombre: "Cancha", subtotal: n(r.montoCancha), pagado: 0, pendiente: 0, producto: null },
        ...r.productos.filter(p => p.cantidad > 0).map(p => ({
            clave: `P${p.productoId}`, concepto: "PRODUCTO" as const, lineaId: p.lineaId ?? p.productoId,
            nombre: p.nombre, subtotal: n(p.subtotal), pagado: 0, pendiente: 0, producto: p,
        })),
    ];
    if (conImputacion(r)) {
        lineas[0].pagado = n(r.montoCanchaPagado);
        for (const l of lineas.slice(1)) l.pagado = n(l.producto?.montoPagado);
    } else {
        let resto = montoCubierto(r);
        for (const l of lineas) {
            l.pagado = redondear(Math.min(l.subtotal, Math.max(0, resto)));
            resto -= l.pagado;
        }
    }
    for (const l of lineas) l.pendiente = redondear(Math.max(0, l.subtotal - l.pagado));
    return lineas;
}

export const imputacionDe = (l: LineaCuenta, monto: number): Imputacion => ({ concepto: l.concepto, lineaId: l.lineaId, monto: redondear(monto) });

/**
 * La parte de una línea cuando la cuenta se divide: el subtotal entre las partes (no lo que falta,
 * así cada uno paga lo mismo aunque otro ya haya pagado la suya), sin pasarse de lo que falta.
 */
export function parteDe(l: LineaCuenta, partes: number, dividir: boolean): number {
    if (!dividir || partes <= 1) return l.pendiente;
    return Math.min(l.pendiente, Math.round(l.subtotal / partes));
}

/** Se puede sacar una unidad sin tocar lo que ya está cobrado de esa línea */
export function puedeSacarUnidad(l: LineaCuenta): boolean {
    const precio = n(l.producto?.precioUnitario);
    return l.pagado <= redondear(l.subtotal - precio);
}

/** Nombre de la línea que cubre una imputación (el backend lo manda; si no, se busca en la reserva) */
export function nombreImputacion(i: Imputacion, r: ReservaResponse): string {
    if (i.nombre) return i.nombre;
    if (i.concepto === "CANCHA") return "Cancha";
    return r.productos.find(p => (p.lineaId ?? p.productoId) === i.lineaId)?.nombre ?? "Producto";
}

/** Lo que todavía cubre el pago (lo cobrado menos lo devuelto) */
export function vigenteDePago(p: PagoResponse): number {
    if (p.imputaciones) return redondear(p.imputaciones.reduce((s, i) => s + n(i.monto), 0));
    return redondear(n(p.monto) - n(p.montoReembolsado));
}

/** Cargado a mano por el personal en el club (no un pago online de Mercado Pago ni el QR) */
export function cobradoEnClub(p: PagoResponse): boolean {
    if (p.canal) return p.canal === "EFECTIVO" || p.canal === "TRANSFERENCIA_MP" || p.canal === "TARJETA_MP"
        || p.canal === "CUENTA_DNI" || p.canal === "TARJETA";
    if (p.provider === "MERCADO_PAGO") return !p.externalPaymentId;
    return p.provider !== "BONIFICACION";
}

/**
 * Se puede anular: un cobro aprobado y cargado en el club, sin devoluciones. Una bonificación, solo
 * el ADMIN. El EMPLEADO, los de la jornada: acá se aproxima con hoy o ayer, y el backend decide con
 * la hora de apertura.
 */
export function pagoAnulable(p: PagoResponse, esAdmin: boolean): boolean {
    if (p.estado !== "APROBADO" || (p.devoluciones?.length ?? 0) > 0 || n(p.montoReembolsado) > 0) return false;
    if (p.provider === "BONIFICACION") return esAdmin;
    if (!cobradoEnClub(p)) return false;
    return esAdmin || deLaJornada(p);
}

/** Aproximación de "registrado en la jornada": hoy o ayer (el backend decide con la hora de apertura) */
function deLaJornada(p: PagoResponse): boolean {
    const fecha = (p.paidAt ?? p.createdAt).slice(0, 10);
    const hoy = hoyISO();
    return fecha === hoy || fecha === sumarDias(hoy, -1);
}

/**
 * Se puede devolver: plata cobrada que todavía cubre algo. El ADMIN, cualquiera; el EMPLEADO, los
 * cobros de su jornada (con motivo, y queda para que el ADMIN la revise). Se devuelve por línea,
 * así que hace falta que el backend mande las imputaciones del pago.
 */
export function pagoDevolvible(p: PagoResponse, esAdmin: boolean): boolean {
    return (esAdmin || deLaJornada(p)) && p.estado === "APROBADO" && p.provider !== "BONIFICACION"
        && (p.imputaciones?.length ?? 0) > 0 && vigenteDePago(p) > 0;
}
