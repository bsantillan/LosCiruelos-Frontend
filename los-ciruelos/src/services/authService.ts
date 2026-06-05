import api from "../api/axiosInstance";
import type { LoginRequest, LoginResponse, VerificarEmailRequest, ResetPasswordRequest } from "../types/auth.types";
import type { RegisterRequest } from "../types/register.types";

export const authService = {

    // POST /auth/register → 201 No Content
    register: async (datos: RegisterRequest): Promise<void> => {
        await api.post("/auth/register", datos);
    },

    // POST /auth/login → LoginResponse
    login: async (datos: LoginRequest): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/login", datos);
        return response.data;
    },

    // POST /auth/verificar-token
    verificarEmail: async (datos: VerificarEmailRequest): Promise<void> => {
        await api.post("/auth/verificar-token", datos);
    },

    // POST /auth/resend-token
    reenviarToken: async (email: string, tipo_codigo: "VERIFY_EMAIL" | "PASSWORD_RESET"): Promise<void> => {
        await api.post("/auth/resend-token", { email, tipo_codigo });
    },

    // POST /auth/refresh
    refresh: async (refreshToken: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/refresh", { refreshToken });
        return response.data;
    },

    // POST /auth/logout
    logout: async (refreshToken: string): Promise<void> => {
        await api.post("/auth/logout", { refreshToken });
    },

    // POST /auth/password-reset/request
    solicitarResetPassword: async (email: string): Promise<void> => {
        await api.post("/auth/password-reset/request", { email });
    },

    // PUT /auth/password-reset/confirm
    confirmarResetPassword: async (datos: ResetPasswordRequest): Promise<void> => {
        await api.put("/auth/password-reset/confirm", datos);
    },

    // POST /auth/google
    loginGoogle: async (idToken: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/google", { idToken });
        return response.data;
    },

};