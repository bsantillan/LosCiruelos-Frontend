import { useEffect, useState } from "react";

/** Letras mínimas para buscar en el backend (con menos, no se pide nada) */
export const MINIMO_BUSQUEDA = 3;
/** Espera después de la última tecla antes de buscar */
const ESPERA_MS = 500;

/**
 * Texto de un buscador que consulta al backend. `termino` es lo que se busca: cambia medio segundo
 * después de dejar de escribir, o en el momento con Enter (`buscarYa`), y solo si tiene al
 * menos 3 letras (o está vacío, para volver a ver todo). Así no se hace un pedido por cada tecla.
 */
export function useBusqueda(minimo = MINIMO_BUSQUEDA, espera = ESPERA_MS) {
    const [texto, setTexto] = useState("");
    const [termino, setTermino] = useState("");
    const limpio = texto.trim();
    const corto = limpio.length > 0 && limpio.length < minimo;

    useEffect(() => {
        if (corto || limpio === termino) return;
        const t = setTimeout(() => setTermino(limpio), limpio === "" ? 0 : espera);
        return () => clearTimeout(t);
    }, [limpio, corto, termino, espera]);

    return {
        texto,
        setTexto,
        termino,
        /** Faltan letras para buscar */
        corto,
        minimo,
        buscarYa: () => { if (!corto) setTermino(limpio); },
        limpiar: () => { setTexto(""); setTermino(""); },
    };
}

export type Busqueda = ReturnType<typeof useBusqueda>;
