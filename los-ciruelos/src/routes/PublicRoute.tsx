import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { destinoDespuesDelLogin } from "../utils/seleccionReserva";

/** Solo sin sesión (login, registro, …). Con sesión va al inicio o a retomar el turno elegido. */
export default function PublicRoute() {
    const { usuario, cargando } = useAuth();

    if (cargando) return null;

    return usuario
        ? <Navigate to={destinoDespuesDelLogin(usuario.perfilCompleto, usuario.rol)} replace />
        : <Outlet />;
}
