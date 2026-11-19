import { useState } from "react";
import { authService } from "../services/authService";
import type { VerificarEmailRequest } from "../types/auth.types";
import { extraerErrores } from "../utils/apiErrors";

export class CuentaVerificadaError extends Error {
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

    const manejarError = (error: unknown): never => {
        const errores = extraerErrores(error, "Ocurrió un error inesperado, intentá de nuevo.");
        if (errores.cuenta_verificada) throw new CuentaVerificadaError();
        setErroresApi(errores);
        throw error;
    };

    const verificarCodigo = async (datos: VerificarEmailRequest) => {
        setCargando(true);
        setErroresApi({});
        try {
            await authService.verificarEmail(datos);
        } catch (error) {
            manejarError(error);
        } finally {
            setCargando(false);
        }
    };

    const reenviarCodigo = async (email: string, tipo_codigo: "VERIFY_EMAIL" | "PASSWORD_RESET") => {
        setReenviando(true);
        setErroresApi({});
        try {
            await authService.reenviarToken(email, tipo_codigo);
        } catch (error) {
            manejarError(error);
        } finally {
            setReenviando(false);
        }
    };

    return { verificarCodigo, reenviarCodigo, cargando, reenviando, erroresApi, setErroresApi };
}
