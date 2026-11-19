import { useEffect, useState } from "react";
import { adminService } from "../services/adminService";
import type { ProductoAdmin } from "../types/admin.types";
import { extraerErrores, primerError } from "../utils/apiErrors";

/**
 * Productos activos del club para el personal (GET /admin/configuracion/productos): también los que
 * no se ofrecen al reservar, para sumarlos a una reserva o venderlos sueltos.
 */
export function useCatalogo(version = 0) {
    const [productos, setProductos] = useState<ProductoAdmin[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        adminService.productos()
            .then(p => { if (activo) { setProductos(p.filter(x => x.activo)); setError(null); } })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar los productos.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [version]);

    return { productos, error, cargando };
}
