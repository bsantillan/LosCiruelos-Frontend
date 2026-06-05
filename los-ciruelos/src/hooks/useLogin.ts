import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import type { LoginRequest } from "../types/auth.types";

export interface ErroresLogin {
    email?: string;
    password?: string;
    codigo?: string;
    email_verificado?: string;
    general?: string;
}

export function useLogin() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresLogin>({});
    const { iniciarSesion } = useAuth();

    const login = async (datos: LoginRequest): Promise<void> => {
        setCargando(true);
        setErroresApi({});
        try {
            const respuesta = await authService.login(datos);
            iniciarSesion(respuesta);
        } catch (error: any) {
            const data = error.response?.data;

            if (data?.errors) {
                setErroresApi(data.errors as ErroresLogin);
            } else {
                setErroresApi(
                    data?.error ??
                    { general: data?.error ?? "Ocurrió un error inesperado." }
                );
            }

            setErroresApi(
                data?.errors ??
                { general: data?.error ?? "Ocurrió un error inesperado." }
            );

            throw error;

        } finally {
            setCargando(false);
        }
    };

    return { login, cargando, erroresApi, setErroresApi };
}