import api from "../api/axiosInstance";
import type {
    AvisosAdmin, MensajesWhatsApp, NotificacionesRequest, NotificacionesResponse, PerfilRequest, PerfilResponse,
    PruebaAvisoResponse, SuscripcionesRequest, SuscripcionesResponse,
} from "../types/perfil.types";

export const perfilService = {
    getPerfil: async (): Promise<PerfilResponse> => {
        const response = await api.get<PerfilResponse>("/perfil");
        return response.data;
    },

    // Si el teléfono cambia queda sin verificar (hay que pedir otro código)
    updatePerfil: async (datos: PerfilRequest): Promise<PerfilResponse> => {
        const response = await api.put<PerfilResponse>("/perfil", datos);
        return response.data;
    },

    // DELETE /perfil/desactivar (solo CLIENTE): desactiva la cuenta y cierra todas las sesiones
    desactivarPerfil: async (): Promise<void> => {
        await api.delete("/perfil/desactivar");
    },

    // ── Notificaciones y verificación del celular ──

    getNotificaciones: async (): Promise<NotificacionesResponse> => {
        const response = await api.get<NotificacionesResponse>("/perfil/notificaciones");
        return response.data;
    },

    // Elegir WHATSAPP sin el celular verificado manda el código y canalEnUso sigue en EMAIL
    updateNotificaciones: async (datos: NotificacionesRequest): Promise<NotificacionesResponse> => {
        const response = await api.put<NotificacionesResponse>("/perfil/notificaciones", datos);
        return response.data;
    },

    // Manda (o reenvía) el código de 6 dígitos por WhatsApp. Vence en 10 min; máximo 3 por minuto (429).
    // 400 sin teléfono · 409 ya verificado o WhatsApp no disponible
    enviarCodigoTelefono: async (): Promise<void> => {
        await api.post("/perfil/telefono/codigo");
    },

    // 400 errors.codigo: inválido, vencido o bloqueado después de 5 intentos
    verificarTelefono: async (codigo: string): Promise<NotificacionesResponse> => {
        const response = await api.post<NotificacionesResponse>("/perfil/telefono/verificar", { codigo });
        return response.data;
    },

    // ── Avisos que elige el CLIENTE ──

    getSuscripciones: async (): Promise<SuscripcionesResponse> => {
        const response = await api.get<SuscripcionesResponse>("/perfil/suscripciones");
        return response.data;
    },

    // 403 con el perfil incompleto (celular sin verificar)
    updateSuscripciones: async (datos: SuscripcionesRequest): Promise<SuscripcionesResponse> => {
        const response = await api.put<SuscripcionesResponse>("/perfil/suscripciones", datos);
        return response.data;
    },

    // ── Avisos que recibe el ADMIN ──

    getAvisos: async (): Promise<AvisosAdmin> => {
        const response = await api.get<AvisosAdmin>("/perfil/avisos");
        return response.data;
    },

    updateAvisos: async (datos: AvisosAdmin): Promise<AvisosAdmin> => {
        const response = await api.put<AvisosAdmin>("/perfil/avisos", datos);
        return response.data;
    },

    probarAviso: async (): Promise<PruebaAvisoResponse> => {
        const response = await api.post<PruebaAvisoResponse>("/perfil/avisos/prueba");
        return response.data;
    },

    /** Cuántos WhatsApp mandó el club en el período (sin fechas: el mes en curso). Solo ADMIN. */
    getMensajesWhatsApp: async (desde?: string, hasta?: string): Promise<MensajesWhatsApp> => {
        const res = await api.get<MensajesWhatsApp>("/perfil/avisos/whatsapp", { params: { desde, hasta } });
        return res.data;
    },
};
