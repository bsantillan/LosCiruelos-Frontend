import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import type { RegisterRequest } from "../types/register.types";

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
            return true;
        } catch (error: any) {
            const status = error.response?.status;

        } finally {
            setCargando(false);
        }
    };

    return { register, cargando, erroresApi };
}