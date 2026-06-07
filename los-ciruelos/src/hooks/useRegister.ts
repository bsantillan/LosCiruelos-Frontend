import { useState } from "react";
import { authService } from "../services/authService";
import type { RegisterRequest } from "../types/register.types";

export class EmailError extends Error {
    constructor() { super("email"); }
}

export interface ErroresRegister {
    nombre?: string;
    apellido?: string;
    email?: string;
    password?: string;
    confirmarPassword?: string;
    telefono?: string;
    categoria?: string;
    posicion?: string;
    termsAccepted?: string;
    general?: string;
}

export function useRegister() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresRegister>({});

    const register = async (datos: RegisterRequest) => {
        setCargando(true);
        setErroresApi({});
        try {
            await authService.register(datos);
        } catch (error: any) {
            const data = error.response?.data;

            let errores: ErroresRegister = {};

            if (data?.errors && typeof data.errors === "object") {
                errores = data.errors;
            } else if (typeof data?.error === "string") {
                errores = { general: data.error };
            } else {
                errores = {
                    general: "Ocurrió un error inesperado."
                };
            }

            setErroresApi(errores);

            throw errores;

        } finally {
            setCargando(false);
        }
    };

    return { register, cargando, erroresApi, setErroresApi };
}