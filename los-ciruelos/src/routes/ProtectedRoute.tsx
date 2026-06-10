import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
    const { usuario, cargando } = useAuth();

    if (cargando) return null;

    return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}