import api from "../api/axiosInstance";
import type { DatosTarjetaMP, PagoResponse } from "../types/reserva.types";

export const pagoService = {
    // POST /pagos/:reservaId/iniciar?pagarTotal=bool
    // false = lo que falta para la seña; true = todo el saldo.
    // Idempotente: si ya hay un pago iniciado por ese monto lo devuelve; si era por otro, lo reemplaza.
    iniciar: async (reservaId: number, pagarTotal: boolean): Promise<PagoResponse> => {
        const res = await api.post<PagoResponse>(`/pagos/${reservaId}/iniciar`, null, {
            params: { pagarTotal },
        });
        return res.data;
    },

    // POST /pagos/:reservaId/pago → cobra con el token del Brick. El monto lo define el servidor.
    procesar: async (reservaId: number, datos: DatosTarjetaMP): Promise<PagoResponse> => {
        // El cobro puede demorar más que el timeout por defecto
        const res = await api.post<PagoResponse>(`/pagos/${reservaId}/pago`, datos, { timeout: 30000 });
        return res.data;
    },
};
