import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

/*
 * Avisos de éxito y error que se van solos y nunca corren nada de lugar: siempre flotan arriba a la
 * derecha de la ventana, encima de todo (también de los popups y en el celular).
 * Cada aviso se va a los DURACION ms (con el mouse encima espera) o con la X.
 */

export type TipoAviso = "ok" | "error";

/** Cuánto queda a la vista cada aviso */
export const DURACION: Record<TipoAviso, number> = { ok: 5000, error: 8000 };

export interface AvisoPublicado {
    id: number;
    tipo: TipoAviso;
    contenido: ReactNode;
}

export interface Canal {
    publicar: (tipo: TipoAviso, contenido: ReactNode) => number;
    retirar: (id: number) => void;
}

/** A dónde van los avisos: los flotantes (AvisosProvider) */
export const CanalAvisos = createContext<Canal | null>(null);

let siguienteId = 1;

/** Una lista de avisos con publicar y retirar */
export function useListaAvisos() {
    const [avisos, setAvisos] = useState<AvisoPublicado[]>([]);
    const publicar = useCallback((tipo: TipoAviso, contenido: ReactNode) => {
        const id = siguienteId++;
        setAvisos(a => [...a, { id, tipo, contenido }]);
        return id;
    }, []);
    const retirar = useCallback((id: number) => setAvisos(a => a.filter(x => x.id !== id)), []);
    const canal = useMemo<Canal>(() => ({ publicar, retirar }), [publicar, retirar]);
    return { avisos, canal, retirar };
}
