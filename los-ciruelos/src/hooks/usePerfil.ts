import { useState, useEffect, useCallback } from "react";
import type { ErroresPerfil, PerfilRequest, PerfilResponse } from "../types/perfil.types";
import { perfilService } from "../services/perfilService";
import { extraerErrores } from "../utils/apiErrors";

export function usePerfil() {
    const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [erroresApi, setErroresApi] = useState<ErroresPerfil>({});
    const [exitoso, setExitoso] = useState(false);

    useEffect(() => {
        let activo = true;
        perfilService.getPerfil()
            .then(data => { if (activo) setPerfil(data); })
            .catch(e => { if (activo) setErroresApi(extraerErrores(e, "No se pudo cargar el perfil.")); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, []);

    useEffect(() => {
        if (!exitoso) return;
        const timer = setTimeout(() => setExitoso(false), 3000);
        return () => clearTimeout(timer);
    }, [exitoso]);

    const actualizar = async (datos: PerfilRequest): Promise<PerfilResponse | null> => {
        setGuardando(true);
        setErroresApi({});
        setExitoso(false);
        try {
            const actualizado = await perfilService.updatePerfil(datos);
            setPerfil(actualizado);
            setExitoso(true);
            return actualizado;
        } catch (error) {
            setErroresApi(extraerErrores(error, "No se pudo actualizar el perfil."));
            return null;
        } finally {
            setGuardando(false);
        }
    };

    /** Vuelve a pedir el perfil (por ejemplo, después de verificar el celular cambia perfilCompleto). */
    const recargar = useCallback(async () => {
        try {
            setPerfil(await perfilService.getPerfil());
        } catch {
            // se mantiene el perfil que había
        }
    }, []);

    return { perfil, cargando, guardando, erroresApi, exitoso, actualizar, recargar, setErroresApi };
}
