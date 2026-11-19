import { useEffect, useState } from "react";
import { adminService } from "../services/adminService";
import type { MedioVentaInfo } from "../types/admin.types";

/**
 * Respaldo mientras el backend no tenga GET /admin/ventas/medios (los medios del enum MedioDePago).
 * Cuando el endpoint exista, se usan los que devuelve y este respaldo queda sin uso.
 */
const RESPALDO: MedioVentaInfo[] = [
    { medio: "EFECTIVO", etiqueta: "Efectivo", disponible: true, conQr: false, detalle: null },
    { medio: "MERCADO_PAGO", etiqueta: "Mercado Pago", disponible: true, conQr: true, detalle: "Con el QR de la caja" },
    { medio: "CUENTA_DNI", etiqueta: "Cuenta DNI", disponible: true, conQr: false, detalle: null },
];

let enCache: MedioVentaInfo[] | null = null;
/** Se pide una sola vez por sesión (si falla, queda el respaldo sin volver a pedir) */
let pedido: Promise<MedioVentaInfo[] | null> | null = null;

/** Los medios de pago de las ventas sueltas, como los devuelve el backend (con respaldo local) */
export function useMediosVenta() {
    const [medios, setMedios] = useState<MedioVentaInfo[]>(enCache ?? RESPALDO);
    const [deRespaldo, setDeRespaldo] = useState(enCache === null);

    useEffect(() => {
        if (enCache) return;
        let activo = true;
        pedido ??= adminService.mediosVenta().then(m => (enCache = m)).catch(() => null);
        pedido.then(m => { if (activo && m) { setMedios(m); setDeRespaldo(false); } });
        return () => { activo = false; };
    }, []);

    return { medios, deRespaldo, etiqueta: (m: string) => medios.find(x => x.medio === m)?.etiqueta ?? m };
}
