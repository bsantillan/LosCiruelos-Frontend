import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
});

// ── Request: adjunta accessToken ──────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response: maneja token vencido ────────────────
let refrescando = false;

api.interceptors.response.use(
    response => response,
    async error => {

        const original = error.config;

        const refreshToken = localStorage.getItem("refreshToken");

        if (
            error.response?.status === 401 &&
            !original._retry &&
            refreshToken
        ) {
            original._retry = true;

            try {
                const { data } = await axios.post(
                    `${import.meta.env.VITE_API_URL}/auth/refresh`,
                    { refreshToken }
                );

                localStorage.setItem("accessToken", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);

                original.headers.Authorization =
                    `Bearer ${data.accessToken}`;

                return api(original);

            } catch {
                localStorage.clear();
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default api;