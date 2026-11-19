import { useState, useEffect } from "react";
import { canchaService } from "../services/canchaService";
import type { CanchaResponse } from "../types/reserva.types";
import { extraerErrores, primerError } from "../utils/apiErrors";

export function useCanchas() {
    const [canchas, setCanchas] = useState<CanchaResponse[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;
        canchaService.listar()
            .then(data => { if (activo) setCanchas([...data].sort((a, b) => a.numero - b.numero)); })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar las canchas.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, []);

    return { canchas, cargando, error };
}
