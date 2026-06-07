import { useState } from "react";
import { authService } from "../services/authService";
import { VerificarEmailRequest } from "../types/auth.types";

export class CuentaVerificadoError extends Error {
    constructor() { super("cuenta_verificada"); }
}

export interface ErroresVerificacion {
    codigo?: string;
    general?: string;
}

export function useVerificacion() {
    const [cargando, setCargando] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresVerificacion>({});

    const verificarCodigo = async (datos: VerificarEmailRequest) => {
        setCargando(true);
        setErroresApi({});
        try {
            await authService.verificarEmail(datos);
        } catch (error: any) {
            const data = error.response?.data;

            if (data?.errors?.cuenta_verificada) {
                throw new CuentaVerificadoError();
            }

            if (data?.errors && typeof data.errors === "object") {
                setErroresApi(data.errors as ErroresVerificacion);
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

    const reenviarCodigo = async (email: string, tipo_codigo: "VERIFY_EMAIL" | "PASSWORD_RESET") => {
        setReenviando(true);
        setErroresApi({});
        try {
            await authService.reenviarToken(email, tipo_codigo);
        } catch (error: any) {
            const data = error.response?.data;

            if (data?.errors?.cuenta_verificada) {
                throw new CuentaVerificadoError();
            }

            if (data?.errors && typeof data.errors === "object") {
                setErroresApi(data.errors as ErroresVerificacion);
            } else if (typeof data?.error === "string") {
                setErroresApi({ general: data.error });
            } else {
                setErroresApi({ general: "Ocurrió un error inesperado, intentá de nuevo." });
            }

            throw error;

        } finally {
            setReenviando(false);
        }
    };

    return { verificarCodigo, reenviarCodigo, cargando, reenviando, erroresApi, setErroresApi };
}