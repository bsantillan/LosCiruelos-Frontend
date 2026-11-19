import { useState } from "react";
import { reservaService } from "../services/reservaService";
import type { ReservaResponse, CrearReservaRequest } from "../types/reserva.types";
import { estadoHttp, extraerErrores, primerError } from "../utils/apiErrors";
import { useAuth } from "../context/AuthContext";

export function useReserva() {
    const { actualizarUsuario } = useAuth();
    const [cargando, setCargando] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const crear = async (datos: CrearReservaRequest): Promise<ReservaResponse | null> => {
        setCargando(true);
        setError(null);
        try {
            return await reservaService.crear(datos);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo crear la reserva. Intentá de nuevo.")) ?? null);
            // 403 = perfil incompleto (por ejemplo, el celular sin verificar): la sesión podía decir
            // lo contrario si se inició antes de un cambio; así aparece el aviso para completarlo
            if (estadoHttp(e) === 403) actualizarUsuario({ perfilCompleto: false });
            return null;
        } finally {
            setCargando(false);
        }
    };

    const cancelar = async (id: number): Promise<boolean> => {
        setCancelando(true);
        setError(null);
        try {
            await reservaService.cancelar(id);
            return true;
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo cancelar la reserva.")) ?? null);
            return false;
        } finally {
            setCancelando(false);
        }
    };

    return { crear, cancelar, cargando, cancelando, error, setError };
}
