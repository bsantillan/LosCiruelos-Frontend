import { useState, useEffect } from "react";
import { ErroresPerfil, PerfilRequest, PerfilResponse } from "../types/perfil.types";
import { perfilService } from "../services/perfilService";

export function usePerfil() {
    const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresPerfil>({});
    const [exitoso, setExitoso] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                const data = await perfilService.getPerfil();
                setPerfil(data);
            } catch {
                setErroresApi({ general: "No se pudo cargar el perfil." });
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, []);

    const actualizar = async (datos: PerfilRequest): Promise<boolean> => {
        setGuardando(true);
        setErroresApi({});
        setExitoso(false);
        try {
            const actualizado = await perfilService.updatePerfil(datos);
            setPerfil(actualizado);
            setExitoso(true);
            setTimeout(() => setExitoso(false), 3000);
            return true;
        } catch (error: any) {
            const data = error.response?.data;
            if (data?.errors && typeof data.errors === "object") {
                setErroresApi(data.errors as ErroresPerfil);
            } else if (typeof data?.error === "string") {
                setErroresApi({ general: data.error });
            } else {
                setErroresApi({ general: "No se pudo actualizar el perfil." });
            }
            return false;
        } finally {
            setGuardando(false);
        }
    };

    return { perfil, cargando, guardando, erroresApi, exitoso, actualizar, setErroresApi };
}