import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import type { HorariosClub, HorarioDia } from "../types/admin.types";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const CORTOS: Record<string, string> = { Lunes: "Lun", Martes: "Mar", "Miércoles": "Mié", Jueves: "Jue", Viernes: "Vie", "Sábado": "Sáb", Domingo: "Dom" };

/** Si el backend no responde (por ejemplo, se cayó): el horario de siempre */
const RESPALDO = { largo: ["Lunes a Sábados · 08:00 a 23:00"], corto: ["Lun–Sáb · 08:00 a 23:00"] };

/** 23:59 es "hasta la medianoche": se muestra 24:00 */
const hora = (h: string) => (h.slice(0, 5) === "23:59" ? "24:00" : h.slice(0, 5));

/**
 * El horario de la semana en renglones: los días seguidos con el mismo horario van juntos
 * ("Martes a Jueves · 08:00 a 24:00"); los días que no abre no aparecen.
 */
export function renglonesHorario(horarios: HorarioDia[], corto = false): string[] {
    const porDia = new Map(horarios.map(h => [h.dia, h]));
    const grupos: { desde: string; hasta: string; rango: string }[] = [];
    for (const dia of DIAS) {
        const h = porDia.get(dia);
        const ultimo = grupos[grupos.length - 1];
        if (!h) { grupos.push({ desde: "", hasta: "", rango: "" }); continue; } // corta la seguidilla
        const rango = `${hora(h.apertura)} a ${hora(h.cierre)}`;
        if (ultimo && ultimo.rango === rango && DIAS.indexOf(ultimo.hasta) === DIAS.indexOf(dia) - 1) ultimo.hasta = dia;
        else grupos.push({ desde: dia, hasta: dia, rango });
    }
    const nombre = (d: string) => (corto ? CORTOS[d] : d);
    return grupos.filter(g => g.rango).map(g => g.desde === g.hasta
        ? `${nombre(g.desde)} · ${g.rango}`
        : `${nombre(g.desde)}${corto ? "–" : " a "}${nombre(g.hasta)} · ${g.rango}`);
}

let pedido: Promise<HorarioDia[] | null> | null = null;

/**
 * El horario del club para mostrar en el sitio (GET /club/horarios, público), en renglones. Mientras
 * carga, o si el backend no responde, el horario de siempre (Lunes a Sábados · 08:00 a 23:00).
 */
export function useHorariosClub(corto = false): string[] {
    const [horarios, setHorarios] = useState<HorarioDia[] | null>(null);
    useEffect(() => {
        let activo = true;
        pedido ??= api.get<HorariosClub>("/club/horarios").then(r => r.data.horarios).catch(() => { pedido = null; return null; });
        void pedido.then(h => { if (activo && h) setHorarios(h); });
        return () => { activo = false; };
    }, []);
    if (!horarios || horarios.length === 0) return corto ? RESPALDO.corto : RESPALDO.largo;
    return renglonesHorario(horarios, corto);
}
