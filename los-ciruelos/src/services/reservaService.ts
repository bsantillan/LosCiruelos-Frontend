import api from "../api/axiosInstance";
import type { CrearReservaRequest, FiltrosMisReservas, Pagina, ReservaResponse } from "../types/reserva.types";

/** Qué devuelve el personal al cancelar una reserva con dinero cobrado */
export type OpcionReembolso = "TOTAL" | "SENIA" | "NADA";

export const reservaService = {
    // POST /reservas → 201 ReservaResponse (queda PENDIENTE 15 minutos)
    crear: async (datos: CrearReservaRequest): Promise<ReservaResponse> => {
        const res = await api.post<ReservaResponse>("/reservas", datos);
        return res.data;
    },

    // GET /reservas/mias?tipo&estado&desde&hasta&page&size → página de reservas del usuario.
    // proximas: por fecha ascendente; historial o sin tipo: descendente.
    mias: async (filtros: FiltrosMisReservas = {}, signal?: AbortSignal): Promise<Pagina<ReservaResponse>> => {
        const res = await api.get<Pagina<ReservaResponse>>("/reservas/mias", {
            params: {
                ...filtros,
                estado: filtros.estado?.length ? filtros.estado.join(",") : undefined,
            },
            signal,
        });
        return res.data;
    },

    // GET /reservas/:id → detalle con los pagos (404 si no existe o es ajena)
    obtener: async (id: number | string): Promise<ReservaResponse> => {
        const res = await api.get<ReservaResponse>(`/reservas/${id}`);
        return res.data;
    },

    // DELETE /reservas/:id/cancelar → 200 con la reserva CANCELADA y los reembolsos que correspondan.
    // El cliente no elige el reembolso (se aplica la política). ADMIN y EMPLEADO lo indican con
    // `reembolso` (obligatorio si la reserva tiene dinero cobrado; si falta, 400).
    // Si Mercado Pago no acepta el reembolso en el momento se cancela igual y el pago queda REEMBOLSO_PENDIENTE.
    cancelar: async (id: number, reembolso?: OpcionReembolso): Promise<ReservaResponse> => {
        const res = await api.delete<ReservaResponse>(`/reservas/${id}/cancelar`, {
            params: reembolso ? { reembolso } : undefined,
            timeout: 30000,
        });
        return res.data;
    },

    // POST /reservas/:id/expirar → libera el turno cuando el contador llega a cero
    expirar: async (id: number): Promise<void> => {
        await api.post(`/reservas/${id}/expirar`);
    },
};
