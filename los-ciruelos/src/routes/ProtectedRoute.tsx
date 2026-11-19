import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Rol } from "../types/auth.types";
import { esPersonal } from "../utils/roles";

/**
 * Exige sesión y, si se indican `roles`, que el usuario tenga uno de ellos.
 * Con un rol que no corresponde se lo lleva a su lugar: el personal (ADMIN, EMPLEADO) al panel
 * y los demás al inicio. Así un cliente no entra al panel ni el personal a las pantallas del
 * cliente (reservar, pagar, Mis reservas, perfil).
 * Con `permitirInvitado` también deja pasar sin sesión (los roles solo se exigen a quien
 * inició sesión): por ejemplo, la disponibilidad la puede mirar cualquiera.
 */
export default function ProtectedRoute({ roles, permitirInvitado = false }: { roles?: Rol[]; permitirInvitado?: boolean }) {
    const { usuario, cargando } = useAuth();

    if (cargando) return null;
    if (!usuario) return permitirInvitado ? <Outlet /> : <Navigate to="/login" replace />;
    if (roles && !roles.includes(usuario.rol)) {
        return <Navigate to={esPersonal(usuario.rol) ? "/admin" : "/"} replace />;
    }

    return <Outlet />;
}
