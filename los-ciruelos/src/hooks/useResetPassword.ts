import { useState } from "react";
import { authService } from "../services/authService";

export interface ErroresResetPassword {
    email?: string;
    nuevaPassword?: string;
    repeatNuevaPassword?: string;
    general?: string;
}

export function useResetPassword() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresResetPassword>({});

    const solicitarReset = async (email: string): Promise<void> => {
        setCargando(true);
        setErroresApi({});
        try {
            await authService.solicitarResetPassword(email);
        } catch (error: any) {
            const data = error.response?.data;
            if (data?.errors && typeof data.errors === "object") {
                setErroresApi(data.errors as ErroresResetPassword);
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

    const confirmarReset = async (email: string, nuevaPassword: string): Promise<void> => {
        setCargando(true);
        setErroresApi({});
        try {
            await authService.confirmarResetPassword(email, nuevaPassword);
        } catch (error: any) {
            const data = error.response?.data;
            if (data?.errors && typeof data.errors === "object") {
                setErroresApi(data.errors as ErroresResetPassword);
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

    return { solicitarReset, confirmarReset, cargando, erroresApi, setErroresApi };
}