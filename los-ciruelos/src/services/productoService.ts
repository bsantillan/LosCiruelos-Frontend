import api from "../api/axiosInstance";
import type { ProductoDisponible } from "../types/reserva.types";

export const productoService = {
    // GET /productos/disponibilidad?fecha=&horaInicio=&horaFin=
    // Unidades de cada producto que se pueden pedir en ese horario (stock en todas las canchas)
    disponibilidad: async (
        fecha: string,
        horaInicio: string,
        horaFin: string,
        signal?: AbortSignal
    ): Promise<ProductoDisponible[]> => {
        const res = await api.get<ProductoDisponible[]>("/productos/disponibilidad", {
            params: { fecha, horaInicio, horaFin },
            signal,
        });
        return res.data;
    },
};
