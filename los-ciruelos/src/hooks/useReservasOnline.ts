import { useEffect, useState } from "react";
import api from "../api/axiosInstance";

/** GET /club/reservas-online (público) */
export interface ReservasOnline {
    habilitadas: boolean;
    /** Pausadas: lo que escribió el ADMIN para los clientes (null si no escribió nada) */
    mensaje: string | null;
}

/**
 * Si los clientes pueden reservar desde la web (el ADMIN las puede pausar, por ejemplo mientras cambia
 * los precios). Se consulta cada vez que se entra a reservar. Mientras carga, o si no se puede
 * consultar, se muestran habilitadas: el backend igual rechaza la reserva si están pausadas.
 */
export function useReservasOnline(): ReservasOnline {
    const [estado, setEstado] = useState<ReservasOnline>({ habilitadas: true, mensaje: null });

    useEffect(() => {
        let activo = true;
        api.get<ReservasOnline>("/club/reservas-online")
            .then(r => { if (activo) setEstado(r.data); })
            .catch(() => { /* se queda habilitado: decide el backend */ });
        return () => { activo = false; };
    }, []);

    return estado;
}
