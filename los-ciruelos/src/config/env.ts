export const ENV = {
    // Sin barra final: "http://host/" + "/auth/refresh" daría "//", que Spring Security rechaza
    API_URL: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, ""),
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined,
    MP_PUBLIC_KEY: import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined,
};

const faltantes = Object.entries({
    VITE_API_URL: ENV.API_URL,
    VITE_GOOGLE_CLIENT_ID: ENV.GOOGLE_CLIENT_ID,
    VITE_MP_PUBLIC_KEY: ENV.MP_PUBLIC_KEY,
}).filter(([, valor]) => !valor).map(([nombre]) => nombre);

if (faltantes.length > 0) {
    console.error(
        `[Los Ciruelos] Faltan variables de entorno: ${faltantes.join(", ")}. ` +
        "Copiá .env.example como .env, completalo y reiniciá el servidor."
    );
}
