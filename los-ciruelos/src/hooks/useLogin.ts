import { useState } from "react";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import type { LoginRequest, LoginResponse } from "../types/auth.types";
import { extraerErrores } from "../utils/apiErrors";

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

    const login = async (datos: LoginRequest, recordar: boolean): Promise<LoginResponse> => {
        setCargando(true);
        setErroresApi({});
        try {
            const respuesta = await authService.login(datos);
            iniciarSesion(respuesta, recordar);
            return respuesta;
        } catch (error) {
            const errores = extraerErrores(error, "Ocurrió un error inesperado, intentá de nuevo.");
            if (errores.email_verificado) throw new EmailNoVerificadoError();
            setErroresApi(errores);
            throw error;
        } finally {
            setCargando(false);
        }
    };

    return { login, cargando, erroresApi, setErroresApi };
}
