# Los Ciruelos Pádel · Frontend

SPA del club de pádel **Los Ciruelos** (La Plata). Incluye:

- **Landing pública**: historia del club, canchas, torneos, noticias, testimonios y ubicación.
- **Autenticación completa**: registro en 3 pasos, verificación de email con código, login con email/contraseña o Google, recuperación de contraseña y refresh automático de tokens.
- **Perfil del jugador**: edición de datos y nivel de juego, estadísticas, desactivación de cuenta.
- **Reservas de canchas y pago online**: elección de cancha, fecha, duración y turno libre, pelotas y paletas con stock, y pago de la seña, el total o el saldo con tarjeta mediante Mercado Pago (Card Payment Brick).
- **Mis reservas**: próximos turnos e historial, con pago del saldo y cancelación.

## Stack

| | |
|---|---|
| UI | React 19, TypeScript (strict), CSS propio con tokens en `src/globals.css` |
| Build / dev | Vite 8 (`@vitejs/plugin-react`) |
| Ruteo | React Router 7 (`BrowserRouter`) |
| HTTP | axios, con una instancia centralizada e interceptores |
| Auth Google | `@react-oauth/google` |
| Pagos | `@mercadopago/sdk-react` (Card Payment Brick) |
| Animaciones / íconos | framer-motion, lucide-react, react-icons |

## Requisitos

- Node.js 20 o superior y npm
- Backend de Los Ciruelos corriendo y accesible
- Un Client ID de Google OAuth (solo para el login con Google)
- La Public Key de Mercado Pago (solo para pagar reservas)

## Puesta en marcha

```bash
cd los-ciruelos
npm install
cp .env.example .env    # y completar los valores
npm run dev             # http://localhost:5173
```

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR. Envía los headers COOP/COEP que necesita el popup de Google |
| `npm run build` | Typecheck (`tsc --noEmit`) y build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente (con los mismos headers COOP) |
| `npm run lint` | ESLint con `typescript-eslint` y las reglas de React Hooks |
| `npm run typecheck` | Solo el typecheck |

## Variables de entorno

Se leen en [src/config/env.ts](src/config/env.ts), que avisa en la consola del navegador si falta alguna. Tienen que empezar con `VITE_`.

| Variable | Dónde se usa | Para qué |
|---|---|---|
| `VITE_API_URL` | [src/api/axiosInstance.ts](src/api/axiosInstance.ts) | URL del backend (ej. `http://localhost:8080`); la barra final se quita sola |
| `VITE_GOOGLE_CLIENT_ID` | [src/main.tsx](src/main.tsx) | `clientId` del login con Google |
| `VITE_MP_PUBLIC_KEY` | [src/config/mercadoPago.ts](src/config/mercadoPago.ts) | Public Key de Mercado Pago para el formulario de tarjeta. Tiene que ser de la misma cuenta y el mismo entorno (prueba/producción) que el access token del backend | `.env` está en `.gitignore`; la plantilla es [.env.example](.env.example).

> Las variables `VITE_*` se incrustan en el JS público en tiempo de build. No pongas secretos ahí. Además, cambiar el `.env` requiere reiniciar `npm run dev` o volver a buildear.

## Estructura

```
los-ciruelos/
├── index.html              Entry HTML (monta #root)
├── vite.config.js          Plugins + headers COOP/COEP del dev server
├── public/                 favicon e íconos estáticos
└── src/
    ├── main.tsx            Providers + definición de rutas
    ├── globals.css         Tokens de diseño y estilos compartidos
    ├── api/                Instancia de axios + interceptores (token / refresh)
    ├── utils/              Sesión, fechas, errores de la API, reglas de reserva, mensajes de MP
    ├── services/           Una función por endpoint del backend
    ├── hooks/              Lógica de cada pantalla (estado, carga, errores)
    ├── context/            AuthContext: sesión del usuario
    ├── routes/             Guards PublicRoute / ProtectedRoute
    ├── layouts/            MainLayout (navbar+footer), AuthLayout y AuthPanelLayout
    ├── pages/              Home, Login, Register, VerificarCodigo, OlvideContrasena,
    │                       NuevaContrasena, Perfil, Reservas, Pago, MisReservas
    ├── components/         NavBar, Footer y componentes UI (Boton, CampoInput,
    │                       CampoSelect, CampoToggle, ModalConfirmacion)
    ├── config/             env.ts (variables), mercadoPago.ts (SDK), sections.ts (navbar/footer)
    ├── types/              Tipos de requests y responses del backend
    └── assets/             Imágenes
```

## Documentación

- [Arquitectura](docs/arquitectura.md): capas, providers, layouts, componentes y estilos
- [Rutas y pantallas](docs/rutas-y-pantallas.md): qué hace cada página y quién puede verla
- [Autenticación](docs/autenticacion.md): login, registro, verificación, Google, tokens y refresh
- [Reservas y pagos](docs/reservas.md): flujo completo de reserva y pago con Mercado Pago
- [API consumida](docs/api.md): endpoints del backend que usa el front
- [Especificaciones para el backend](docs/especificaciones-backend.md): paginación de Mis reservas, cancelación de reservas pagas y precio en la disponibilidad
- [Errores conocidos](docs/errores-conocidos.md): qué se corrigió, qué queda pendiente y problemas del backend
