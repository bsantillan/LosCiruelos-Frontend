import { useState } from "react";
import { authService } from "../services/authService";
import type { RegisterRequest } from "../types/register.types";
import { extraerErrores } from "../utils/apiErrors";

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
    /** Solo del formulario: el backend recibe una sola aceptación (termsAccepted) */
    privacidadAceptada?: string;
    aceptarNotificacion?: string;
    general?: string;
}

export function useRegister() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresRegister>({});

    /** Si falla, lanza los errores normalizados para que la página vuelva al paso correcto. */
    const register = async (datos: RegisterRequest) => {
        setCargando(true);
        setErroresApi({});
        try {
            await authService.register(datos);
        } catch (error) {
            const { terminos, ...resto } = extraerErrores(error, "Ocurrió un error inesperado.");
            // El backend informa los términos como "terminos"
            const errores: ErroresRegister = terminos ? { ...resto, termsAccepted: terminos } : resto;
            setErroresApi(errores);
            throw errores;
        } finally {
            setCargando(false);
        }
    };

    return { register, cargando, erroresApi, setErroresApi };
}
