import { useEffect, useState } from "react";
import { isCancel } from "axios";
import { adminService } from "../services/adminService";
import type { ProductoDisponible } from "../types/reserva.types";
import { extraerErrores, primerError } from "../utils/apiErrors";

interface Resultado {
    clave: string;
    productos?: ProductoDisponible[];
    error?: string;
}

const SIN_PRODUCTOS: ProductoDisponible[] = [];

/**
 * Productos que el personal puede pedir al armar una reserva, un partido o un turno fijo, con las
 * unidades libres en ese horario (GET /admin/configuracion/productos/disponibilidad):
 *  - ofrecidos: los que se ofrecen al reservar (los que ve el cliente);
 *  - extras: el resto del catálogo activo.
 * Todos con el mismo tope que valida el backend al guardar. Al editar una reserva o partido,
 * `excluirReservaId` hace que sus propias unidades cuenten como libres. Sin inicio/fin todavía no se
 * eligió el horario.
 */
export function useProductosPersonal(fecha: string, inicio: string | null, fin: string | null, excluirReservaId?: number) {
    const clave = inicio && fin ? `${fecha}|${inicio}|${fin}|${excluirReservaId ?? ""}` : null;
    const [resultado, setResultado] = useState<Resultado | null>(null);

    useEffect(() => {
        if (!clave || !inicio || !fin) return;
        const controller = new AbortController();
        adminService.disponibilidadProductos(fecha, inicio, fin, excluirReservaId, controller.signal)
            .then(productos => setResultado({ clave, productos }))
            .catch(error => {
                if (isCancel(error)) return;
                setResultado({ clave, error: primerError(extraerErrores(error, "No se pudo consultar el stock.")) });
            });
        return () => controller.abort();
    }, [clave, fecha, inicio, fin, excluirReservaId]);

    const actual = resultado?.clave === clave ? resultado : null;
    const todos = actual?.productos ?? SIN_PRODUCTOS;

    return {
        ofrecidos: todos.filter(p => p.ofrecerAlReservar !== false),
        extras: todos.filter(p => p.ofrecerAlReservar === false),
        /** Todos juntos, para calcular el total */
        todos,
        cargando: clave !== null && actual === null,
        error: actual?.error ?? null,
    };
}
