import { useState } from "react";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import type { CredentialResponse } from "@react-oauth/google";

export interface ErroresGoogle {
    general?: string;
}

export function useGoogleAuth() {
    const [cargando, setCargando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresGoogle>({});
    const { iniciarSesion } = useAuth();

    const loginConGoogle = async (credentialResponse: CredentialResponse): Promise<void> => {
        if (!credentialResponse.credential) {
            setErroresApi({ general: "No se recibió el token de Google." });
            throw new Error("Sin token");
        }
        setCargando(true);
        setErroresApi({});
        try {
            const respuesta = await authService.loginGoogle(credentialResponse.credential);
            iniciarSesion(respuesta);
        } catch (error: any) {
            const data = error.response?.data;
            if (data?.errors && typeof data.errors === "object") {
                setErroresApi({ general: Object.values(data.errors)[0] as string });
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

    const handleGoogleError = () => {
        setErroresApi({ general: "No se pudo conectar con Google." });
    };

    return { loginConGoogle, handleGoogleError, cargando, erroresApi, setErroresApi };
}