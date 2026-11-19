import type { Usuario } from "../types/auth.types";

/*
 * La sesión se guarda en localStorage ("Recordarme" activado) o en
 * sessionStorage (se borra al cerrar el navegador).
 */

const CLAVES = {
    accessToken: "accessToken",
    refreshToken: "refreshToken",
    usuario: "usuario",
} as const;

function storageActivo(): Storage {
    return sessionStorage.getItem(CLAVES.refreshToken) ? sessionStorage : localStorage;
}

export function guardarSesion(
    datos: { accessToken: string; refreshToken: string; usuario: Usuario },
    recordar: boolean
) {
    limpiarSesion();
    const storage = recordar ? localStorage : sessionStorage;
    storage.setItem(CLAVES.accessToken, datos.accessToken);
    storage.setItem(CLAVES.refreshToken, datos.refreshToken);
    storage.setItem(CLAVES.usuario, JSON.stringify(datos.usuario));
}

export function actualizarTokens(accessToken: string, refreshToken: string) {
    const storage = storageActivo();
    storage.setItem(CLAVES.accessToken, accessToken);
    storage.setItem(CLAVES.refreshToken, refreshToken);
}

export function guardarUsuario(usuario: Usuario) {
    storageActivo().setItem(CLAVES.usuario, JSON.stringify(usuario));
}

export const getAccessToken = () => storageActivo().getItem(CLAVES.accessToken);
export const getRefreshToken = () => storageActivo().getItem(CLAVES.refreshToken);

export function getUsuario(): Usuario | null {
    const guardado = storageActivo().getItem(CLAVES.usuario);
    if (!guardado) return null;
    try {
        return JSON.parse(guardado) as Usuario;
    } catch {
        return null;
    }
}

export function limpiarSesion() {
    for (const storage of [localStorage, sessionStorage]) {
        Object.values(CLAVES).forEach(clave => storage.removeItem(clave));
    }
}
