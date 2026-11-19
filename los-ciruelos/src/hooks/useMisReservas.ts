import { useCallback, useEffect, useState } from "react";
import { isCancel } from "axios";
import { reservaService } from "../services/reservaService";
import type { FiltrosMisReservas, Pagina, ReservaResponse } from "../types/reserva.types";
import { extraerErrores, primerError } from "../utils/apiErrors";

interface Resultado {
    clave: string;
    pagina?: Pagina<ReservaResponse>;
    error?: string;
}

/**
 * GET /reservas/mias con filtros y paginación. Vuelve a consultar cuando cambian los
 * filtros (se cancela la consulta anterior) o al llamar a recargar().
 * Con `habilitado` en false no consulta (sin sesión respondería 401) y devuelve una lista vacía.
 */
export function useMisReservas(filtros: FiltrosMisReservas, habilitado = true) {
    const [version, setVersion] = useState(0);
    // Los filtros llegan como objeto nuevo en cada render: la clave detecta cambios reales
    const claveFiltros = JSON.stringify(filtros);
    const clave = `${claveFiltros}|${version}`;
    const [resultado, setResultado] = useState<Resultado | null>(null);

    useEffect(() => {
        if (!habilitado) return;
        const controller = new AbortController();
        reservaService.mias(JSON.parse(claveFiltros) as FiltrosMisReservas, controller.signal)
            .then(pagina => setResultado({ clave, pagina }))
            .catch(e => {
                if (isCancel(e)) return;
                setResultado({ clave, error: primerError(extraerErrores(e, "No se pudieron cargar tus reservas.")) });
            });
        return () => controller.abort();
    }, [clave, claveFiltros, habilitado]);

    const recargar = useCallback(() => setVersion(v => v + 1), []);

    if (!habilitado) {
        return { reservas: [], pagina: null, cargando: false, cargaInicial: false, error: null, recargar };
    }

    const actual = resultado?.clave === clave ? resultado : null;
    // Mientras se carga otra página se conserva la anterior (sin parpadeo)
    const pagina = actual?.pagina ?? resultado?.pagina ?? null;

    return {
        reservas: pagina?.contenido ?? [],
        pagina,
        cargando: actual === null,
        cargaInicial: resultado === null,
        error: actual?.error ?? null,
        recargar,
    };
}
