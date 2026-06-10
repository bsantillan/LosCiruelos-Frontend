import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PublicRoute() {
    const { usuario, cargando } = useAuth();

    if (cargando) return null;

    return usuario ? <Navigate to="/" replace /> : <Outlet />;
}