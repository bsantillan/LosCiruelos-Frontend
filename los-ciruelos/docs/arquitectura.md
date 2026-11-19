# Arquitectura

## Árbol de la aplicación

[src/main.tsx](../src/main.tsx) monta todo en `#root`:

```
StrictMode
└── GoogleOAuthProvider (clientId = VITE_GOOGLE_CLIENT_ID)
    └── AuthProvider                     sesión del usuario (context/AuthContext.tsx)
        └── BrowserRouter
            └── Suspense                 páginas cargadas bajo demanda (React.lazy)
                └── Routes               ver rutas-y-pantallas.md
                    ├── PublicRoute → AuthLayout → login, registro, verificación, reset
                    ├── MainLayout → /  (Home, incluido en el bundle principal)
                    ├── ProtectedRoute → MainLayout → /perfil
                    └── ProtectedRoute[CLIENTE] → MainLayout → /reservas, /reservas/:id/pago, /mis-reservas
```

Todas las páginas salvo Home se cargan con `React.lazy`. Así, por ejemplo, el SDK de Mercado Pago solo se descarga cuando el usuario entra a pagar.

## Capas

```
pages/X.tsx          UI, validación de formularios y navegación
   │ usa
hooks/useX.ts        estado de carga, errores normalizados y llamada al service
   │ usa
services/xService    una función por endpoint, devuelve response.data tipado
   │ usa
api/axiosInstance    baseURL, timeout de 10 s, JSON, Bearer token, refresh en 401
   │
Backend REST (VITE_API_URL)
```

### `config/`
| Archivo | Qué hace |
|---|---|
| `env.ts` | Lee las variables `VITE_*`, quita la barra final de `VITE_API_URL` y avisa en la consola si falta alguna |
| `mercadoPago.ts` | `initMercadoPago(VITE_MP_PUBLIC_KEY, { locale: "es-AR" })` y exporta `mercadoPagoDisponible` |
| `sections.ts` | Ítems del navbar por rol y links del footer |

### `utils/` (funciones puras, sin React)
| Archivo | Qué hace |
|---|---|
| `sesion.ts` | Guarda y lee los tokens y el usuario en `localStorage` ("Recordarme") o en `sessionStorage` |
| `apiErrors.ts` | `extraerErrores` normaliza los errores del backend (incluye 429 y 502); también `primerError` y `estadoHttp` |
| `fechas.ts` | Fechas en hora **local** (`hoyISO`, `sumarDias`, `formatFecha`), conversión entre minutos y `HH:MM`, `formatMonto` (ARS) |
| `calendario.ts` | Helpers de los calendarios propios (`SelectorFecha` y `SelectorPeriodo`): grilla del mes, nombres de meses y días, límites del mes |
| `reservas.ts` | Reglas de negocio de la reserva (las mismas que aplica el backend): etiquetas de estado, si está vencida, si se puede pagar o cancelar, cuánto falta para la seña |
| `mercadoPago.ts` | Traduce el `status_detail` de Mercado Pago a mensajes para el usuario |

### `api/axiosInstance.ts`
- `baseURL: VITE_API_URL`, `timeout: 10000`, `Content-Type: application/json`.
- **Request:** agrega `Authorization: Bearer <accessToken>`.
- **Response 401:** si hay refresh token, hace **un único** `POST /auth/refresh` compartido entre todas las requests que fallaron a la vez (el backend rota el refresh token en cada uso), guarda los tokens nuevos y reintenta. Si el refresh falla, limpia la sesión y redirige a `/login`. No intenta refrescar en `/auth/login`, `/auth/google` ni `/auth/refresh`, donde un 401 significa credenciales inválidas.

### Hooks
| Hook | Responsabilidad |
|---|---|
| `useLogin` | Login con email/contraseña (con o sin "Recordarme"); lanza `EmailNoVerificadoError` |
| `useGoogleAuth` | Envía el ID token de Google al backend y abre la sesión |
| `useRegister` | Alta de usuario; lanza los errores normalizados para volver al paso correcto |
| `useVerificacion` | Verificar y reenviar código; lanza `CuentaVerificadaError` |
| `useResetPassword` | Pedir y confirmar el reset de contraseña |
| `usePerfil` | Cargar y actualizar el perfil (aviso de éxito durante 3 s) |
| `useCanchas` | Lista de canchas ordenada por número |
| `useDisponibilidad` | Disponibilidad y turnos libres (calculados por el backend) para cancha, fecha y duración; cancela requests viejas y permite recargar |
| `useProductosDisponibles` | Precio y unidades disponibles de pelotas y paletas para un horario |
| `useMisReservas` | `GET /reservas/mias`, con recarga |
| `useReserva` | Crear y cancelar reservas, con sus errores |
| `usePago` | Lee la reserva del servidor y maneja el pago: `eleccion → tarjeta → aprobado / rechazado / en_proceso`, con consulta periódica mientras está en proceso |

### `context/AuthContext.tsx`
Expone `usuario`, `cargando`, `iniciarSesion(respuesta, recordar)`, `actualizarUsuario(cambios)` y `cerrarSesion()`. La sesión se restaura de forma síncrona al arrancar. Detalle en [autenticacion.md](autenticacion.md).

## Layouts

| Layout | Uso |
|---|---|
| `MainLayout` | `Navbar`, `<main><Outlet/></main>` y `Footer` |
| `AuthLayout` | `<main>` de alto completo para las pantallas de autenticación |
| `AuthPanelLayout` | Pantalla dividida (panel visual + formulario). También exporta `Logo` y `PanelVisual` |

## Componentes

| Componente | Descripción |
|---|---|
| `NavBar` | Ítems según el rol; en Home resalta la sección visible (`IntersectionObserver`) y hace scroll suave; menú mobile que se cierra con click afuera, Escape o al cambiar de ruta |
| `Footer` | Marca, Instagram, secciones del club, links según haya sesión y contacto |
| `ui/Boton` | Variantes `primario`, `secundario` y `fantasma`; ancho `completo` o `auto`; spinner mientras carga |
| `ui/BotonGoogle` | `<GoogleLogin>` con tema oscuro; `texto`: `continue_with`, `signup_with` o `signin_with` |
| `ui/CampoInput` | Input con label, ícono, prefijo/sufijo, ver contraseña y error accesible |
| `ui/CampoSelect` | Select propio con dropdown en un portal |
| `ui/CampoToggle` | Checkbox con estilo de switch |
| `ui/ModalConfirmacion` | Modal accesible (`role="dialog"`). Click afuera o Escape llaman a `onCerrar` (nunca ejecutan la acción). El botón secundario usa `onCancelar` si se pasa. Puede mostrar un `error` |

## Estilos

- [src/globals.css](../src/globals.css) define los tokens (`--verde-lima`, `--fondo`, `--superficie-*`, `--texto*`, `--error*`, `--radio-*`…) y las clases compartidas.
- Cada página o componente tiene su `.css` al lado, con nombres tipo BEM en español.
- No se usa Tailwind: se eliminó junto con postcss y autoprefixer.
- La imagen de fondo es `padel-bg.webp` (63 KB; antes era un PNG de 1,4 MB).

## Calidad

- `npm run lint`: ESLint con `typescript-eslint`, React Hooks (incluidas las reglas del React Compiler) y React Refresh.
- `npm run build`: corre `tsc --noEmit` antes de `vite build`.
