# Errores conocidos

Última revisión: 13/10/2026. `npm run lint`, `npm run typecheck` y `npm run build` pasan sin errores.

## Corregido en el frontend (13/10/2026)

| # | Problema | Solución |
|---|---|---|
| 1 | La ruta `/reservas/:id/pago` no existía y el usuario terminaba en el Home | Nueva página de pago con el Brick de Mercado Pago ([reservas.md](reservas.md)) |
| 2 | `GET /canchas/:id/disponibilidad` sin el parámetro `duracion` que ahora exige el backend (400) | Se envía `duracion` |
| 3 | `GET /reservas/pendiente` no existe en el backend | La reserva pendiente se guarda en el navegador |
| 4 | Import `./Navbar.css` con mayúsculas incorrectas (rompía el build en Linux) | `./NavBar.css` |
| 5 | Línea de tiempo desordenada (comparaba minutos con `HHMM`) | Todo se ordena en minutos |
| 6 | Hacer click fuera del modal cancelaba la reserva pendiente | El modal separa "cerrar" de "cancelar" |
| 7 | "Hoy" calculado en UTC (desde las 21 hs daba mañana); se podían elegir días pasados | Fechas locales y `min` en el selector |
| 8 | Disponibilidad sin manejo de errores y con respuestas viejas que pisaban a las nuevas | Manejo de errores y `AbortController` |
| 9 | La duración inicial ignoraba el mínimo y el máximo del backend | Se ajusta al rango |
| 10 | Turnos de hoy que ya habían empezado; turnos desalineados si la apertura no es en punto | Se filtran y se alinean a la apertura |
| 11 | El botón "Guardar" del perfil comparaba objetos por referencia | Comparación campo por campo |
| 12 | `perfilCompleto` nunca se actualizaba en la sesión | `actualizarUsuario` en el contexto |
| 13 | Refresh de token concurrente: con la rotación de tokens cerraba la sesión sola | Un único refresh compartido entre requests |
| 14 | `VITE_API_URL` con barra final generaba `//auth/refresh`, que Spring rechaza (403) | La URL se normaliza |
| 15 | El botón "Registrate con Google" no hacía nada | Conectado a `useGoogleAuth` |
| 16 | "Recordarme" no hacía nada | Sin tildar, la sesión va a `sessionStorage` y se borra al cerrar el navegador |
| 17 | No se mostraban avisos después de cambiar la contraseña o verificar la cuenta | Alerta de éxito en Login |
| 18 | `CuentaVerificadaError` no se manejaba | Redirige a Login con aviso |
| 19 | Después de registrarse iba a Login en vez de a verificar el email | Va directo a `/verificar-codigo` |
| 20 | El error de términos venía como `terminos` y no se mostraba | Se mapea a `termsAccepted` |
| 21 | El error de contraseña inválida en el reset venía como `password` y no se mostraba | Se mapea a `nuevaPassword` |
| 22 | Errores del backend con formato `{ errors: "texto" }` se mostraban como genéricos | `utils/apiErrors.ts` normaliza los tres formatos |
| 23 | Rol `EMPLEADO` (existe en el backend) no contemplado: rompía el Navbar | Agregado al tipo `Rol` y al menú |
| 24 | Navbar de PROFESOR y ADMIN con links a rutas inexistentes; sin control de rol | Links ocultos hasta implementarlos; `ProtectedRoute roles` |
| 25 | Errores al cancelar una reserva o desactivar la cuenta no se mostraban | Se muestran en el modal |
| 26 | "Hace 0 días" en el perfil cuando nunca jugó | "Todavía ninguno" / "Hoy" / plural correcto |
| 27 | ESLint no revisaba TypeScript; el build no hacía typecheck | `typescript-eslint` y `tsc --noEmit && vite build` |
| 28 | No se avisaba si faltaban variables de entorno | `config/env.ts` lo informa en la consola |
| 29 | Headers COOP solo en `npm run dev` | También en `npm run preview` (en producción, ver abajo) |
| 30 | Links internos con `<a href>` recargaban toda la página | `<Link>` y scroll a la sección del Home |
| 31 | `index.html` con `main.jsx`, `lang="en"` y title genérico | Corregido |
| 32 | `console.log` olvidados, typo `isLooged`, `StrictMode` sin usar, `any` | Limpiado |
| 33 | Código, dependencias y assets muertos (Tailwind, clsx, postcss, mockData, imágenes) | Eliminados |
| 34 | `padel-bg.png` de 1,4 MB | `padel-bg.webp` de 63 KB |
| 35 | Bundle de más de 500 kB | Las páginas se cargan bajo demanda (`React.lazy`) |
| 36 | `package-lock.json` suelto en la raíz del repo | Eliminado |

## Pendiente en el frontend

- **Contenido del Home desactualizado.** Los torneos y noticias son de 2025, la foto del club es un placeholder y las estadísticas están hardcodeadas. Hace falta información real del club, o un endpoint para cargarla.
- **Paneles de PROFESOR, EMPLEADO y ADMIN** sin implementar.
- **Tokens en `localStorage`/`sessionStorage`.** Para protegerlos ante XSS, el backend tendría que usar una cookie `httpOnly` para el refresh token.
- **Headers COOP en producción.** El hosting tiene que enviar `Cross-Origin-Opener-Policy: same-origin-allow-popups` para que funcione el popup de Google.

## Adaptación a los cambios del backend (15/10/2026)

El backend corrigió los problemas que se habían reportado: webhook público y con firma, `@Value` de Spring, `external_reference`, monto definido por el servidor, control de dueño, endpoints de consulta y errores 400/404/409/502. El frontend se adaptó así:

| Cambio del backend | Adaptación en el frontend |
|---|---|
| Disponibilidad devuelve `turnosDisponibles`, `duracion` y `horarioMinimoInicio`; `duracion` es opcional (`@RequestParam(required = false)`) | Los turnos los calcula el backend (se eliminó `utils/turnos.ts`); la primera consulta va sin duración y se usa la mínima que devuelve el servidor |
| Pelotas y paletas son productos con precio y stock; `POST /reservas` pide `cantidadPelotas` / `cantidadPaletas` | Selectores de cantidad con stock y precio (`GET /productos/disponibilidad`). Antes se mandaban `pelotas`/`paletas` booleanos, que el backend ignora sin error |
| `GET /reservas/mias` y `GET /reservas/:id` | La reserva pendiente y el pago se leen del servidor (se eliminó `utils/reservaPendiente.ts`); nueva página **Mis reservas** |
| `ReservaResponse` con `montoCancha`, `montoProductos`, `montoSenia`, `productos` y `pagos` | Desglose de precios y seña exacta en la página de pago |
| `iniciar` es idempotente y reemplaza el pago si cambia el monto | Se puede cambiar entre seña y total; al recargar se retoma el pago iniciado |
| Se puede pagar el saldo de una reserva `SEÑADA` o `PARCIALMENTE_PAGADA` | Opción "Saldo" en el pago y botón "Pagar saldo" en Mis reservas |
| `PagoResponse` con `detalle` (status_detail) y `estadoReserva` | Motivo del rechazo traducido (`utils/mercadoPago.ts`) |
| Los pagos `EN_PROCESO` los resuelve el webhook | La pantalla consulta `GET /reservas/:id` cada 5 s durante 3 min |
| `POST /reservas/:id/expirar` | Se llama una vez cuando el contador llega a cero |
| `categoriaEditable`; `diasDesdeUltimoPartido` puede ser `null`; `DELETE /perfil/desactivar` sin body | Perfil usa el flag del backend, muestra "Todavía ninguno" y desactiva sin body |
| Otros roles no pueden enviar `categoria`/`posicion`; solo un CLIENTE puede desactivar su cuenta | Perfil oculta "Nivel de juego" y "Zona de peligro" a los demás roles y les envía `null` |
| Límite de intentos en `/auth` (429 + `Retry-After`) y 502 de Mercado Pago | Mensajes específicos en `utils/apiErrors.ts` |

## Verificación contra el backend real (15/10/2026, puerto 9090, usuario de prueba)

| Prueba | Resultado |
|---|---|
| Login, `GET /perfil` (`categoriaEditable`, `diasDesdeUltimoPartido: null`) | ✅ |
| `GET /canchas`, disponibilidad con duración, duración inválida (400), fecha pasada (400), cancha inexistente (404) | ✅ formato `{error}` |
| `GET /productos/disponibilidad` | ✅ (pelotas y paletas con precio y stock en 0) |
| `POST /reservas` | ✅ 201 con `montoCancha`, `montoSenia`, `productos`, `pagos` |
| Pedir 1 paleta sin stock | ✅ 409 "Paletas: hay 0 unidades disponibles para ese horario." |
| `GET /reservas/mias`, `GET /reservas/:id`, reserva inexistente (404) | ✅ |
| `POST /reservas/:id/expirar` en plazo | ✅ 409 (el frontend lo ignora) |
| `DELETE /reservas/:id/cancelar` | ✅ queda `CANCELADA` |
| `POST /pagos/:id/iniciar` | ❌ **502**: el backend no tiene un access token válido de Mercado Pago, así que el cobro con tarjeta no se pudo probar |

## Backend: pendiente que afecta al frontend

| Tema | Impacto |
|---|---|
| `binary_mode` en el cobro: Mercado Pago no deja pagos pendientes (el titular CONT termina rechazado) | Nunca se ve la pantalla "Estamos procesando tu pago" con tarjeta; sí puede pasar con la cuenta de Mercado Pago |
| Mercado Pago sin configurar en el entorno local (`MP_ACCESS_TOKEN`) | Iniciar un pago responde 502 hasta que se configure |
| Pelotas y paletas arrancan con precio y stock en 0 | Hasta que el admin los configure, se muestran como "Sin stock para este horario" |
| Los pagos `A_REEMBOLSAR` se devuelven a mano desde Mercado Pago | El cliente no ve ese estado en la web |
| `LocalDateTime` sin zona horaria (`expiresAt`, `createdAt`) | El navegador los interpreta en su hora local: el contador es exacto si el usuario está en la zona horaria del servidor (Argentina) |
