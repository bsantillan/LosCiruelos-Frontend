import type { ProductoDisponible, ProductoPedido, ReservaProducto, ReservaResponse } from "../types/reserva.types";

/** Cantidad elegida de cada producto, por id (los que no están, 0) */
export type Cantidades = Record<number, number>;

/** Tope por producto del backend (cada ítem lleva de 1 a 99 unidades) */
export const MAXIMO_POR_PRODUCTO = 99;

/** Lo que se manda en el body: solo los productos con cantidad > 0 */
export const aPedido = (cantidades: Cantidades): ProductoPedido[] =>
    Object.entries(cantidades)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([id, cantidad]) => ({ productoId: Number(id), cantidad }));

/** Las cantidades que ya tiene una reserva (o una selección guardada) */
export const cantidadesDe = (productos: (ProductoPedido | ReservaProducto)[]): Cantidades =>
    Object.fromEntries(productos.map(p => [p.productoId, p.cantidad]));

export const sinCambios = (a: Cantidades, b: Cantidades) => {
    const ids = new Set([...Object.keys(a), ...Object.keys(b)].map(Number));
    return [...ids].every(id => (a[id] ?? 0) === (b[id] ?? 0));
};

/** "se venden" / "se alquilan" */
export const detalleTipo = (p: Pick<ProductoDisponible, "tipo">) => p.tipo === "VENTA" ? "se venden" : "se alquilan";

/** Líneas del desglose (cantidad × precio) de los productos elegidos, con el precio vigente */
export function lineasProductos(productos: ProductoDisponible[], cantidades: Cantidades) {
    return productos
        .filter(p => (cantidades[p.id] ?? 0) > 0)
        .map(p => {
            const cantidad = cantidades[p.id];
            const precio = Number(p.precio);
            return { id: p.id, nombre: p.nombre, cantidad, precio, subtotal: cantidad * precio };
        });
}

export const totalProductos = (productos: ProductoDisponible[], cantidades: Cantidades) =>
    lineasProductos(productos, cantidades).reduce((total, l) => total + l.subtotal, 0);

/** Paletas alquiladas en la reserva (las que se registran en la devolución) */
export const paletasDe = (reserva: ReservaResponse) =>
    reserva.productos.find(p => p.codigo === "PALETAS")?.cantidad ?? 0;
