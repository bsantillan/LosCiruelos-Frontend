import api from "../api/axiosInstance";
import type { CanchaResponse, DisponibilidadResponse } from "../types/reserva.types";
import type { Novedad } from "../types/admin.types";

export const canchaService = {
    // GET /novedades (público): las publicadas y vigentes, de la más nueva a la más vieja
    novedades: async (limite = 6): Promise<Novedad[]> => {
        const res = await api.get<Novedad[]>("/novedades", { params: { limite } });
        return res.data;
    },


    // GET /canchas: las activas (grilla, Reservar). Con incluirInactivas, también las desactivadas
    // (la página de inicio las muestra como "No disponible por el momento").
    listar: async (incluirInactivas = false): Promise<CanchaResponse[]> => {
        const res = await api.get<CanchaResponse[]>("/canchas", { params: incluirInactivas ? { incluirInactivas: true } : undefined });
        return res.data;
    },

    // GET /canchas/:id/disponibilidad?fecha=YYYY-MM-DD[&duracion=90]
    // Sin duración el backend usa la mínima configurada.
    getDisponibilidad: async (
        id: number,
        fecha: string,
        duracion: number | null,
        signal?: AbortSignal
    ): Promise<DisponibilidadResponse> => {
        const res = await api.get<DisponibilidadResponse>(`/canchas/${id}/disponibilidad`, {
            params: duracion ? { fecha, duracion } : { fecha },
            signal,
        });
        return res.data;
    },
};
