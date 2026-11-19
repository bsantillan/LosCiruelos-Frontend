import { useEffect, useState } from "react";
import { isCancel } from "axios";
import { productoService } from "../services/productoService";
import type { ProductoDisponible } from "../types/reserva.types";
import { extraerErrores, primerError } from "../utils/apiErrors";

interface Resultado {
    clave: string;
    productos?: ProductoDisponible[];
    error?: string;
}

const SIN_PRODUCTOS: ProductoDisponible[] = [];

/**
 * Productos que se ofrecen al reservar y cuántas unidades se pueden pedir en un horario (el
 * stock se comparte entre todas las canchas). Sin inicio/fin todavía no se eligió turno.
 */
export function useProductosDisponibles(fecha: string, inicio: string | null, fin: string | null) {
    const clave = inicio && fin ? `${fecha}|${inicio}|${fin}` : null;
    const [resultado, setResultado] = useState<Resultado | null>(null);

    useEffect(() => {
        if (!clave || !inicio || !fin) return;
        const controller = new AbortController();
        productoService.disponibilidad(fecha, inicio, fin, controller.signal)
            .then(productos => setResultado({ clave, productos }))
            .catch(error => {
                if (isCancel(error)) return;
                setResultado({ clave, error: primerError(extraerErrores(error, "No se pudo consultar el stock.")) });
            });
        return () => controller.abort();
    }, [clave, fecha, inicio, fin]);

    const actual = resultado?.clave === clave ? resultado : null;

    return {
        productos: actual?.productos ?? SIN_PRODUCTOS,
        cargando: clave !== null && actual === null,
        error: actual?.error ?? null,
    };
}
