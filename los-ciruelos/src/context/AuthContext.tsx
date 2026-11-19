import { createContext, useCallback, useContext, useState } from "react";
import type { Usuario, LoginResponse } from "../types/auth.types";
import { authService } from "../services/authService";
import { getRefreshToken, getUsuario, guardarSesion, guardarUsuario, limpiarSesion } from "../utils/sesion";

interface AuthContextType {
    usuario: Usuario | null;
    iniciarSesion: (respuesta: LoginResponse, recordar?: boolean) => void;
    actualizarUsuario: (cambios: Partial<Usuario>) => void;
    cerrarSesion: () => Promise<void>;
    cargando: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // La sesión se restaura de forma síncrona: no hace falta esperar un efecto
    const [usuario, setUsuario] = useState<Usuario | null>(getUsuario);
    const cargando = false;

    const iniciarSesion = (respuesta: LoginResponse, recordar = true) => {
        const nuevoUsuario: Usuario = {
            id: respuesta.id,
            nombre: respuesta.nombre,
            apellido: respuesta.apellido,
            email: respuesta.email,
            perfilCompleto: respuesta.perfilCompleto,
            rol: respuesta.rol,
        };
        guardarSesion({
            accessToken: respuesta.accessToken,
            refreshToken: respuesta.refreshToken,
            usuario: nuevoUsuario,
        }, recordar);
        setUsuario(nuevoUsuario);
    };

    // Estable: se usa como dependencia de efectos (Perfil sincroniza perfilCompleto con el servidor)
    const actualizarUsuario = useCallback((cambios: Partial<Usuario>) => {
        setUsuario(prev => {
            if (!prev) return prev;
            const actualizado = { ...prev, ...cambios };
            guardarUsuario(actualizado);
            return actualizado;
        });
    }, []);

    const cerrarSesion = async () => {
        try {
            const refreshToken = getRefreshToken();
            if (refreshToken) await authService.logout(refreshToken);
        } catch {
            // Si falla el logout en el server igual limpiamos localmente
        } finally {
            limpiarSesion();
            setUsuario(null);
        }
    };

    return (
        <AuthContext.Provider value={{ usuario, iniciarSesion, actualizarUsuario, cerrarSesion, cargando }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return context;
}
