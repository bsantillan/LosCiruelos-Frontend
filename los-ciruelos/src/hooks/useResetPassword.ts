import { useState } from "react";
import { authService } from "../services/authService";
import { extraerErrores } from "../utils/apiErrors";

export interface ErroresResetPassword {
    email?: string;
    nuevaPassword?: string;
    repeatNuevaPassword?: string;
    general?: string;
}

export function useResetPassword() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresResetPassword>({});

    const ejecutar = async (accion: () => Promise<void>) => {
        setCargando(true);
        setErroresApi({});
        try {
            await accion();
        } catch (error) {
            const { password, ...resto } = extraerErrores(error, "Ocurrió un error inesperado, intentá de nuevo.");
            // El backend informa la contraseña inválida como "password"
            setErroresApi(password ? { ...resto, nuevaPassword: password } : resto);
            throw error;
        } finally {
            setCargando(false);
        }
    };

    const solicitarReset = (email: string) =>
        ejecutar(() => authService.solicitarResetPassword(email));

    const confirmarReset = (email: string, nuevaPassword: string) =>
        ejecutar(() => authService.confirmarResetPassword(email, nuevaPassword));

    return { solicitarReset, confirmarReset, cargando, erroresApi, setErroresApi };
}
