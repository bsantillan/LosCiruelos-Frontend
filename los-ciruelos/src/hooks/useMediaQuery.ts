import { useCallback, useSyncExternalStore } from "react";

/** Punto de corte de la app entre celular/tablet chica y escritorio (el mismo de los CSS) */
export const MEDIA_MOVIL = "(max-width: 860px)";

/** true mientras la media query se cumple; se actualiza al rotar o cambiar el tamaño de la ventana. */
export function useMediaQuery(query: string): boolean {
    const suscribir = useCallback((avisar: () => void) => {
        const mql = window.matchMedia(query);
        mql.addEventListener("change", avisar);
        return () => mql.removeEventListener("change", avisar);
    }, [query]);
    return useSyncExternalStore(suscribir, () => window.matchMedia(query).matches, () => false);
}
