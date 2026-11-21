import { useState, useEffect } from "react";
import { canchaService } from "../services/canchaService";
import type { CanchaResponse } from "../types/reserva.types";
import { extraerErrores, primerError } from "../utils/apiErrors";

/**
 * Las canchas del club, por número. Por defecto solo las activas (para crear reservas); con
 * incluirInactivas, también las dadas de baja (para mostrarlas y consultar sus reservas pasadas).
 */
export function useCanchas(incluirInactivas = false) {
    const [canchas, setCanchas] = useState<CanchaResponse[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;
        canchaService.listar(incluirInactivas)
            .then(data => { if (activo) setCanchas([...data].sort((a, b) => a.numero - b.numero)); })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar las canchas.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [incluirInactivas]);

    return { canchas, cargando, error };
}
