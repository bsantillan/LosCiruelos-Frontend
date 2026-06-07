import { useState } from "react";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import type { LoginRequest } from "../types/auth.types";

export class EmailNoVerificadoError extends Error {
    constructor() { super("email_no_verificado"); }
}

export interface ErroresLogin {
    email?: string;
    password?: string;
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

            if (data?.errors?.email_verificado) {
                throw new EmailNoVerificadoError();
            }

            if (data?.errors && typeof data.errors === "object") {
                setErroresApi(data.errors as ErroresLogin);
            } else if (typeof data?.error === "string") {
                setErroresApi({ general: data.error });
            } else {
                setErroresApi({ general: "Ocurrió un error inesperado, intentá de nuevo." });
            }

            throw error;

        } finally {
            setCargando(false);
        }
    };

    return { login, cargando, erroresApi, setErroresApi };
}