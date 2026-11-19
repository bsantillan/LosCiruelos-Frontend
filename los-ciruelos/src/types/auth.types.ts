
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

// ── Responses ─────────────────────────────────────
// Roles del backend (enum Role). "Invitado" no es un rol: es no tener sesión.
export type Rol = "ADMIN" | "CLIENTE" | "EMPLEADO" | "PROFESOR";

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