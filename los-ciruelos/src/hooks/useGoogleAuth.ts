import { useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { extraerErrores, primerError } from "../utils/apiErrors";
import type { LoginResponse } from "../types/auth.types";

export interface ErroresGoogle {
    general?: string;
}

export function useGoogleAuth() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresGoogle>({});
    const { iniciarSesion } = useAuth();

    const loginConGoogle = async (credentialResponse: CredentialResponse, recordar = true): Promise<LoginResponse> => {
        if (!credentialResponse.credential) {
            setErroresApi({ general: "No se recibió el token de Google." });
            throw new Error("Sin token");
        }
        setCargando(true);
        setErroresApi({});
        try {
            const respuesta = await authService.loginGoogle(credentialResponse.credential);
            iniciarSesion(respuesta, recordar);
            return respuesta;
        } catch (error) {
            setErroresApi({
                general: primerError(extraerErrores(error, "Ocurrió un error inesperado, intentá de nuevo.")),
            });
            throw error;
        } finally {
            setCargando(false);
        }
    };

    const handleGoogleError = () => {
        setErroresApi({ general: "No se pudo conectar con Google." });
    };

    return { loginConGoogle, handleGoogleError, cargando, erroresApi, setErroresApi };
}
