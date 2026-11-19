import { useEffect, useState } from "react";
import { canchaService } from "../services/canchaService";
import type { CanchaResponse } from "../types/reserva.types";

let pedido: Promise<CanchaResponse[] | null> | null = null;

/**
 * Las canchas del club para el sitio, también las desactivadas (GET /canchas?incluirInactivas=true,
 * público), pedidas una sola vez aunque las usen varias secciones. null mientras carga o si el backend
 * no responde (cada sección muestra lo de siempre).
 */
export function useCanchasPublicas(): CanchaResponse[] | null {
    const [canchas, setCanchas] = useState<CanchaResponse[] | null>(null);
    useEffect(() => {
        let activo = true;
        pedido ??= canchaService.listar(true)
            .then(c => [...c].sort((a, b) => a.numero - b.numero))
            .catch(() => { pedido = null; return null; });
        void pedido.then(c => { if (activo && c && c.length > 0) setCanchas(c); });
        return () => { activo = false; };
    }, []);
    return canchas;
}
