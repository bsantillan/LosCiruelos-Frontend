import { useState } from "react";
import type { ProductoPedido, ReservaResponse } from "../../types/reserva.types";
import { useProductosDisponibles } from "../../hooks/useProductosDisponibles";
import { formatMonto, horaCorta } from "../../utils/fechas";
import { aPedido, cantidadesDe, sinCambios, type Cantidades } from "../../utils/productos";
import { ListaProductos } from "../SelectorProducto/SelectorProducto";
import "./EditorExtras.css";
import { AvisoTransitorio } from "../ui/Avisos/Avisos";

interface EditorExtrasProps {
    reserva: ReservaResponse;
    guardando: boolean;
    error: string | null;
    /** Devuelve true si se guardó (el editor se cierra) */
    onGuardar: (productos: ProductoPedido[]) => Promise<boolean>;
    onVolver: () => void;
}

/** Cambiar los productos de una reserva PENDIENTE, con el total actualizado. */
export default function EditorExtras({ reserva, guardando, error, onGuardar, onVolver }: EditorExtrasProps) {
    const [reservadas] = useState(() => cantidadesDe(reserva.productos));
    const [cantidades, setCantidades] = useState<Cantidades>(reservadas);
    const stock = useProductosDisponibles(reserva.fechaReserva, horaCorta(reserva.horaInicio), horaCorta(reserva.horaFin));

    // Precio: el vigente si cambia la cantidad (el backend congela el precio al guardar)
    const precio = (id: number) => {
        const actual = stock.productos.find(p => p.id === id)?.precio;
        const congelado = reserva.productos.find(p => p.productoId === id)?.precioUnitario;
        return Number(actual ?? congelado ?? 0);
    };
    const nuevoTotal = Number(reserva.montoCancha)
        + Object.entries(cantidades).reduce((total, [id, n]) => total + n * precio(Number(id)), 0);

    return (
        <div className="editor-extras">
            <ListaProductos
                productos={stock.productos}
                cantidades={cantidades}
                reservadas={reservadas}
                cargando={stock.cargando}
                onChange={setCantidades}
            />

            <p className="editor-extras__total">
                <span>Nuevo total</span>
                <strong>{formatMonto(nuevoTotal)}</strong>
            </p>

            {(error || stock.error) && <AvisoTransitorio tipo="error">{error ?? stock.error}</AvisoTransitorio>}

            <div className="editor-extras__acciones">
                <button type="button" className="accion accion--chica" onClick={onVolver} disabled={guardando}>
                    Volver
                </button>
                <button
                    type="button"
                    className="accion accion--chica accion--primaria"
                    onClick={() => void onGuardar(aPedido(cantidades))}
                    disabled={guardando || stock.cargando || sinCambios(cantidades, reservadas)}
                >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
            </div>
        </div>
    );
}
