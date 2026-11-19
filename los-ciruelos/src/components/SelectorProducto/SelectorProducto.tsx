import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import type { ProductoDisponible } from "../../types/reserva.types";
import { formatMonto } from "../../utils/fechas";
import { detalleTipo, MAXIMO_POR_PRODUCTO, type Cantidades } from "../../utils/productos";
import "./SelectorProducto.css";

interface SelectorProductoProps {
    /** Disponibilidad para el horario (GET /productos/disponibilidad) */
    producto: ProductoDisponible;
    cantidad: number;
    /**
     * Unidades que ya tiene tomadas esta misma reserva (al editar una reserva pendiente).
     * La disponibilidad del backend no las cuenta como libres, pero se pueden volver a pedir.
     */
    reservadas?: number;
    cargando: boolean;
    onChange: (n: number) => void;
}

/** Selector de cantidad de un producto, limitado por el stock (si lo controla) y el tope del backend. */
export default function SelectorProducto({ producto, cantidad, reservadas = 0, cargando, onChange }: SelectorProductoProps) {
    const conPrecio = Number(producto.precio) > 0;
    // disponibles null: el producto no controla stock
    const libres = producto.disponibles === null ? MAXIMO_POR_PRODUCTO : producto.disponibles + reservadas;
    // Sin precio cargado por el club no se puede pedir (aunque haya stock)
    const tope = conPrecio ? Math.min(libres, MAXIMO_POR_PRODUCTO) : 0;
    const nombre = producto.nombre.toLowerCase();

    return (
        <div className="selector-producto">
            <div className="selector-producto__info">
                <span className="selector-producto__nombre">{producto.nombre}</span>
                <span className="selector-producto__detalle">
                    {cargando
                        ? "Consultando stock..."
                        : tope > 0
                            ? `${formatMonto(Number(producto.precio))} c/u · ${detalleTipo(producto)}`
                            : libres > 0
                                ? "Todavía no disponible" // hay stock pero el club no cargó el precio
                                : "Sin stock para este horario"}
                </span>
            </div>
            <div className="selector-producto__cantidad">
                <button
                    type="button"
                    className="selector-producto__btn"
                    onClick={() => onChange(cantidad - 1)}
                    disabled={cantidad <= 0}
                    aria-label={`Quitar ${nombre}`}
                >
                    <Minus size={14} />
                </button>
                <span className="selector-producto__valor" aria-live="polite">{cantidad}</span>
                <button
                    type="button"
                    className="selector-producto__btn"
                    onClick={() => onChange(cantidad + 1)}
                    disabled={cargando || cantidad >= tope}
                    aria-label={`Agregar ${nombre}`}
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
}

/**
 * Para el personal: los productos que se ofrecen al reservar y, plegados en "Más productos", el
 * resto del catálogo. Si ya se eligió algún extra, se muestran abiertos.
 */
export function ListaProductosPersonal({ ofrecidos, extras, cantidades, reservadas, cargando, onChange }: {
    ofrecidos: ProductoDisponible[];
    extras: ProductoDisponible[];
    cantidades: Cantidades;
    reservadas?: Cantidades;
    cargando: boolean;
    onChange: (cantidades: Cantidades) => void;
}) {
    const [abierto, setAbierto] = useState(false);
    const conExtras = extras.some(p => (cantidades[p.id] ?? 0) > 0);
    const verExtras = abierto || conExtras;

    return (
        <>
            <ListaProductos productos={ofrecidos} cantidades={cantidades} reservadas={reservadas} cargando={cargando} onChange={onChange} />
            {extras.length > 0 && (
                <>
                    <button type="button" className="selector-producto__mas" aria-expanded={verExtras}
                        onClick={() => setAbierto(!verExtras)} disabled={conExtras}>
                        {verExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {verExtras ? "Menos productos" : `Más productos (${extras.length})`}
                    </button>
                    {verExtras && (
                        <div className="selector-producto__extras">
                            <ListaProductos productos={extras} cantidades={cantidades} cargando={false} onChange={onChange} />
                        </div>
                    )}
                </>
            )}
        </>
    );
}

/** Un selector por cada producto que se ofrece al reservar */
export function ListaProductos({ productos, cantidades, reservadas, cargando, onChange }: {
    productos: ProductoDisponible[];
    cantidades: Cantidades;
    /** Las que ya tiene la reserva que se edita */
    reservadas?: Cantidades;
    cargando: boolean;
    onChange: (cantidades: Cantidades) => void;
}) {
    if (cargando && productos.length === 0) {
        return <p className="selector-producto__detalle">Consultando productos...</p>;
    }
    return (
        <>
            {productos.map(p => (
                <SelectorProducto
                    key={p.id}
                    producto={p}
                    cantidad={cantidades[p.id] ?? 0}
                    reservadas={reservadas?.[p.id] ?? 0}
                    cargando={cargando}
                    onChange={n => onChange({ ...cantidades, [p.id]: Math.max(0, n) })}
                />
            ))}
        </>
    );
}
