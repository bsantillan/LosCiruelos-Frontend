import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { hoyISO, parseFechaHora } from "../utils/fechas";

/** GET /admin/jornada: la jornada de trabajo en curso (de la apertura de un día a la del siguiente) */
interface Jornada {
    fecha: string;
    inicio: string;
    fin: string;
}

/** Se pide una vez y se vuelve a pedir cuando termina (a la hora de apertura del día siguiente) */
let guardada: Jornada | null = null;
let pedido: Promise<Jornada | null> | null = null;

const vigente = (j: Jornada | null) => j !== null && parseFechaHora(j.fin).getTime() > Date.now();

function pedir(): Promise<Jornada | null> {
    pedido ??= api.get<Jornada>("/admin/jornada")
        .then(r => { guardada = r.data; return r.data; })
        .catch(() => null)
        .finally(() => { pedido = null; });
    return pedido;
}

/**
 * La fecha que el EMPLEADO puede ver y operar ("hoy" para él): la de su jornada, que dura hasta la
 * apertura del día siguiente. Pasada la medianoche sigue siendo la del día anterior. Para el ADMIN
 * (y mientras no se pudo consultar) es la fecha de hoy.
 */
export function useJornada(): string {
    const { usuario } = useAuth();
    const esEmpleado = usuario?.rol === "EMPLEADO";
    const [jornada, setJornada] = useState<Jornada | null>(() => vigente(guardada) ? guardada : null);

    useEffect(() => {
        if (!esEmpleado || vigente(jornada)) return;
        let activo = true;
        void pedir().then(j => { if (activo && j) setJornada(j); });
        return () => { activo = false; };
    }, [esEmpleado, jornada]);

    // Cuando termina la jornada, se pide la siguiente
    useEffect(() => {
        if (!esEmpleado || !jornada) return;
        const falta = parseFechaHora(jornada.fin).getTime() - Date.now();
        if (falta <= 0 || falta > 2 ** 31 - 1) return;
        const t = setTimeout(() => setJornada(null), falta + 1000);
        return () => clearTimeout(t);
    }, [esEmpleado, jornada]);

    return esEmpleado && jornada ? jornada.fecha : hoyISO();
}
