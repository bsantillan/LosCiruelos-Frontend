import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import type { HorariosClub } from "../types/admin.types";

export type DiaCerradoPublico = HorariosClub["cierres"][number];

/** Se pide una sola vez por sesión (los cierres cambian muy de vez en cuando) */
let pedido: Promise<DiaCerradoPublico[]> | null = null;

/**
 * Los próximos días en que el club no abre (feriados, obras), con el motivo que pone el ADMIN
 * (GET /club/horarios, público). Si no se pueden consultar, la lista queda vacía: el backend igual
 * rechaza reservar esos días.
 */
export function useCierresClub() {
    const [cierres, setCierres] = useState<DiaCerradoPublico[]>([]);

    useEffect(() => {
        let activo = true;
        pedido ??= api.get<HorariosClub>("/club/horarios").then(r => r.data.cierres ?? []).catch(() => { pedido = null; return []; });
        pedido.then(c => { if (activo) setCierres(c); });
        return () => { activo = false; };
    }, []);

    return { cierres, cierreDe: (fecha: string) => cierres.find(c => c.fecha === fecha) ?? null };
}
