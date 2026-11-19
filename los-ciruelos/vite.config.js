import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El popup de "Continuar con Google" necesita poder comunicarse con la ventana
// que lo abrió. En producción el hosting tiene que enviar estos mismos headers.
const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
}

// Dominios desde los que se puede abrir el servidor de desarrollo además de localhost.
// .ts.net = Tailscale Funnel, para probar Mercado Pago con una URL pública https.
const allowedHosts = ['.ts.net']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true escucha en todas las interfaces (no solo localhost): el contenedor de Tailscale
  // (tailscale-funnel) llega a Vite por host.docker.internal, que no es localhost
  server: { headers, allowedHosts, host: true },
  preview: { headers, allowedHosts },
})
