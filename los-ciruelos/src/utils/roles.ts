import type { Rol } from "../types/auth.types";

/** El personal del club (ADMIN, EMPLEADO) trabaja en su panel; el resto de los roles, en el sitio */
export const esPersonal = (rol: Rol | string | undefined) => rol === "ADMIN" || rol === "EMPLEADO";
