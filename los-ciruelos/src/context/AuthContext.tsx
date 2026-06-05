import { createContext, useContext, useState, useEffect } from "react";
import type { Usuario, LoginResponse } from "../types/auth.types";
import { authService } from "../services/authService";

interface AuthContextType {
    usuario: Usuario | null;
    iniciarSesion: (respuesta: LoginResponse) => void;
    cerrarSesion: () => Promise<void>;
    cargando: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [cargando, setCargando] = useState(true);

    // Restaurar sesión al recargar
    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (usuarioGuardado) {
            setUsuario(JSON.parse(usuarioGuardado));
        }
        setCargando(false);
    }, []);

    const iniciarSesion = (respuesta: LoginResponse) => {
        const usuario: Usuario = {
            id: respuesta.id,
            nombre: respuesta.nombre,
            apellido: respuesta.apellido,
            email: respuesta.email,
            perfilCompleto: respuesta.perfilCompleto,
            rol: respuesta.rol,
        };
        localStorage.setItem("accessToken", respuesta.accessToken);
        localStorage.setItem("refreshToken", respuesta.refreshToken);
        localStorage.setItem("usuario", JSON.stringify(usuario));
        setUsuario(usuario);
    };

    const cerrarSesion = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) await authService.logout(refreshToken);
        } catch {
            // Si falla el logout en el server igual limpiamos localmente
        } finally {
            localStorage.clear();
            setUsuario(null);
        }
    };

    return (
        <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion, cargando }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return context;
}