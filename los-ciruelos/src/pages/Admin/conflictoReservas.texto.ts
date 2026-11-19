import type { CancelacionesResultado } from "../../types/admin.types";

/** " Se cancelaron N reservas…" (vacío si no se canceló ninguna) */
export const textoCanceladas = (r: CancelacionesResultado | null | undefined) => {
    const n = r?.canceladas.length ?? 0;
    return n === 0 ? "" : ` Se ${n === 1 ? "canceló 1 reserva" : `cancelaron ${n} reservas`} con reembolso total y se avisó a cada cliente.`;
};
