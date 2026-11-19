import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ENV } from "../config/env";
import { actualizarTokens, getAccessToken, getRefreshToken, limpiarSesion } from "../utils/sesion";

const api = axios.create({
    baseURL: ENV.API_URL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
});

// ── Request: adjunta accessToken ──────────────────
api.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Response: maneja token vencido ────────────────
// El backend rota el refresh token en cada uso, así que si varias requests
// reciben 401 a la vez tienen que compartir un único refresh.
let refreshEnCurso: Promise<string> | null = null;

function refrescarToken(refreshToken: string): Promise<string> {
    refreshEnCurso ??= axios
        .post(`${ENV.API_URL}/auth/refresh`, { refreshToken })
        .then(({ data }) => {
            actualizarTokens(data.accessToken, data.refreshToken);
            return data.accessToken as string;
        })
        .finally(() => { refreshEnCurso = null; });
    return refreshEnCurso;
}

// En estos endpoints un 401 significa credenciales inválidas, no token vencido
const SIN_REFRESH = ["/auth/login", "/auth/google", "/auth/refresh"];

/*
 * Lecturas públicas: canchas, disponibilidad, productos, horarios del club y novedades se ven sin
 * sesión. El token se
 * manda igual si lo hay (el backend lo ignora si venció), pero un 401 en ellas nunca
 * dispara el refresh ni manda a /login: un visitante tiene que poder seguir mirando.
 */
const LECTURAS_PUBLICAS = ["/canchas", "/productos", "/club/", "/novedades"];
const esLecturaPublica = (config: InternalAxiosRequestConfig) =>
    (config.method ?? "get").toLowerCase() === "get"
    && LECTURAS_PUBLICAS.some(url => config.url?.startsWith(url));

api.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const refreshToken = getRefreshToken();

        if (
            error.response?.status === 401 &&
            original &&
            !original._retry &&
            refreshToken &&
            !SIN_REFRESH.some(url => original.url?.startsWith(url)) &&
            !esLecturaPublica(original)
        ) {
            original._retry = true;
            try {
                const accessToken = await refrescarToken(refreshToken);
                original.headers.Authorization = `Bearer ${accessToken}`;
                return api(original);
            } catch {
                limpiarSesion();
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;
