import type { EstadoVenta, MedioVenta, Venta } from "../../types/admin.types";

export const ETIQUETA_MEDIO_VENTA: Record<MedioVenta, string> = {
    EFECTIVO: "Efectivo", MERCADO_PAGO: "Mercado Pago", TRANSFERENCIA_MP: "Transferencia MP", TARJETA_MP: "Tarjeta MP",
    CUENTA_DNI: "Cuenta DNI", TARJETA: "Tarjeta",
};

export const ETIQUETA_ESTADO_VENTA: Record<EstadoVenta, string> = {
    COBRADA: "Cobrada", ANULADA: "Anulada", ESPERANDO_PAGO: "Esperando el pago", NO_COBRADA: "No cobrada",
};

export const TONO_ESTADO_VENTA: Record<EstadoVenta, string> = {
    COBRADA: "admin-chip--ok", ANULADA: "admin-chip--error", ESPERANDO_PAGO: "admin-chip--alerta", NO_COBRADA: "",
};

/** Lo que la venta deja en la caja: solo las cobradas, menos lo devuelto */
export const netoVenta = (v: Venta) => v.estado === "COBRADA" ? Number(v.total) - Number(v.montoDevuelto ?? 0) : 0;

/** Unidades de un ítem que todavía se pueden devolver */
export const quedanPorDevolver = (i: { cantidad: number; devueltas?: number | null }) => i.cantidad - (i.devueltas ?? 0);

/*
 * El EMPLEADO solo ve las ventas de su jornada (el backend filtra el listado: de la apertura de un día
 * a la del siguiente, así que una venta de las 00:30 es de la jornada anterior). Todo lo que ve es de
 * su jornada; el backend vuelve a validar cada acción.
 */

/**
 * Anular: una venta cobrada y sin devoluciones (con devoluciones, se devuelve lo que queda). El ADMIN,
 * cualquiera; el EMPLEADO, las de su jornada sin verificar.
 */
export const puedeAnular = (v: Venta, esAdmin: boolean) =>
    v.estado === "COBRADA" && (v.devoluciones ?? []).length === 0 && (esAdmin || v.verificada !== true);

/** Devolver (solo ADMIN): una venta cobrada a la que le quedan unidades por devolver */
export const puedeDevolver = (v: Venta, esAdmin: boolean) =>
    esAdmin && v.estado === "COBRADA" && v.items.some(i => quedanPorDevolver(i) > 0);

/** Cambiar el cliente: una venta cobrada (el EMPLEADO, las de su jornada) */
export const puedeCambiarCliente = (v: Venta) => v.estado === "COBRADA";
