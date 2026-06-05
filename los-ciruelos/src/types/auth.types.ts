import type { RegisterRequest as RR } from "./register.types";

// ── Requests ──────────────────────────────────────
export interface LoginRequest {
    email: string;
    password: string;
    // recordar: boolean;
}

export interface VerificarEmailRequest {
    email: string;
    codigo: string;
    tipo_codigo: "VERIFY_EMAIL" | "PASSWORD_RESET";
}

export interface ResetPasswordRequest {
    email: string;
    nuevaPassword: string;
}

// ── Responses ─────────────────────────────────────
export type Rol = "ADMIN" | "SOCIO";

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    perfilCompleto: boolean;
    rol: Rol;
}

// ── Usuario en sesión ─────────────────────────────
export interface Usuario {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    perfilCompleto: boolean;
    rol: Rol;
}