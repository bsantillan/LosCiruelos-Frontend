import api from "../api/axiosInstance";
import type { PerfilResponse, PerfilRequest } from "../types/perfil.types";

export const perfilService = {
    getPerfil: async (): Promise<PerfilResponse> => {
        const response = await api.get<PerfilResponse>("/perfil");
        return response.data;
    },

    updatePerfil: async (datos: PerfilRequest): Promise<PerfilResponse> => {
        const response = await api.put<PerfilResponse>("/perfil", datos);
        return response.data;
    },

    desactivarPerfil: async (refreshToken: string): Promise<void> => {
        const response = await api.delete("/perfil/desactivar", { data: { refreshToken } });
        return response.data;
    },
};