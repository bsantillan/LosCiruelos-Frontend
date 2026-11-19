# API del backend consumida por el frontend

Base: `VITE_API_URL`. Todas las requests van con JSON y, si hay sesión, con `Authorization: Bearer <accessToken>`. Los tipos están en [src/types/](../src/types/). La referencia completa del backend está en `LosCiruelos-Backend/docs/api.md`.

## Formato de errores

`utils/apiErrors.ts` normaliza las respuestas de error:

```jsonc
{ "errors": { "email": "El correo ya existe" } }   // por campo → debajo de cada input
{ "error": "El turno ya está reservado" }            // general → alerta
```

| HTTP | Significado | Cómo lo muestra el front |
|---|---|---|
| 400 | Validación, horario o duración inválidos, datos de tarjeta | Mensaje del backend o errores por campo |
| 401 | Token ausente o vencido (el interceptor refresca y reintenta) o credenciales inválidas | Mensaje / vuelve a `/login` si el refresh falla |
| 403 | Rol, cuenta desactivada, email sin verificar (`errors.email_verificado`), perfil incompleto, categoría no editable | Mensaje |
| 404 | No existe o es ajena (reservas) | "No encontramos esta reserva" |
| 409 | Turno ocupado, sin stock, estado que no permite la operación, cuenta ya verificada (`errors.cuenta_verificada`) | Mensaje (y recarga de turnos al reservar) |
| 429 | Demasiados intentos en `/auth` | "Esperá N segundos…" (usa `Retry-After`) |
| 502 | Falla de Mercado Pago | Mensaje del backend o "Mercado Pago no respondió" |

Claves especiales: `email_verificado` redirige a verificar el código, `cuenta_verificada` va a Login con aviso, `terminos` se mapea a `termsAccepted` y `password` (en el reset) se mapea a `nuevaPassword`.

## Auth (`services/authService.ts`)

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `{nombre, apellido, email, password, telefono, categoria, posicion, termsAccepted}` | 201 sin body (envía el código por email) |
| POST | `/auth/login` | `{email, password}` | `LoginResponse` |
| POST | `/auth/google` | `{idToken}` | `LoginResponse` |
| POST | `/auth/verificar-token` | `{email, codigo, tipo_codigo}` | 200 (5 intentos fallidos bloquean el código) |
| POST | `/auth/resend-token` | `{email, tipo_codigo}` | 200 |
| POST | `/auth/refresh` | `{refreshToken}` | `LoginResponse` (rota el token; lo llama solo el interceptor) |
| POST | `/auth/logout` | `{refreshToken}` | 200 |
| POST | `/auth/password-reset/request` | `{email}` | 200 |
| PUT | `/auth/password-reset/confirm` | `{email, nuevaPassword}` | 200 (cierra todas las sesiones) |

`LoginResponse`: `{ accessToken, refreshToken, id, nombre, apellido, email, perfilCompleto, rol: "ADMIN" | "CLIENTE" | "EMPLEADO" | "PROFESOR" }`.

## Perfil (`services/perfilService.ts`)

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| GET | `/perfil` | — | `PerfilResponse` |
| PUT | `/perfil` | `{nombre, apellido, telefono, posicion, categoria}` (`posicion` y `categoria` en `null` si no es CLIENTE) | `PerfilResponse` |
| DELETE | `/perfil/desactivar` | — (sin body) | 200 (solo CLIENTE) |

`PerfilResponse`: `nombre, apellido, email, telefono, categoria, posicion, cantDiasMiembro, cantPartidos, diasDesdeUltimoPartido (null si nunca jugó), cantPartidosEsteMes, categoriaActualizadaAt, categoriaEditable`.

## Canchas (`services/canchaService.ts`)

| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/canchas` | `[{ id, numero, descripcion }]` |
| GET | `/canchas/:id/disponibilidad?fecha=YYYY-MM-DD[&duracion=90]` | `DisponibilidadResponse` |

`DisponibilidadResponse`: `{ horarioApertura, horarioCierre, duracionMinimaTurno, duracionMaximaTurno, duracion, horarioMinimoInicio, slotsOcupados: Turno[], turnosDisponibles: Turno[] }`, donde `Turno = { horaInicio, horaFin }`. `duracion` es opcional: sin ella el backend usa la mínima configurada y la informa en `duracion`. Las horas llegan como `"HH:MM:SS"` y los `LocalDateTime` con hasta 7 decimales (`utils/fechas.ts` → `horaCorta`, `parseFechaHora`).

## Productos (`services/productoService.ts`)

| Método | Endpoint | Respuesta |
|---|---|---|
| GET | `/productos/disponibilidad?fecha=&horaInicio=&horaFin=` | `[{ id, codigo: "PELOTAS" \| "PALETAS" \| null, nombre, tipo: "VENTA" \| "ALQUILER", precio, disponibles }]` |

## Reservas (`services/reservaService.ts`)

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| POST | `/reservas` | `{canchaId, fechaReserva, horaInicio, horaFin, cantidadPelotas, cantidadPaletas}` | 201 `ReservaResponse` (`PENDIENTE`, vence en 15 min) |
| GET | `/reservas/mias` | — | `ReservaResponse[]` (más nueva primero) |
| GET | `/reservas/:id` | — | `ReservaResponse` con sus pagos (404 si es ajena) |
| DELETE | `/reservas/:id/cancelar` | — | 200 (`PENDIENTE` sin pagos aprobados ni en proceso) |
| POST | `/reservas/:id/expirar` | — | 200 (409 si todavía está en plazo) |

`ReservaResponse`: `id, canchaId, canchaNumero, fechaReserva, horaInicio, horaFin, montoCancha, montoProductos, montoTotal, montoSenia, montoPagado, montoPendiente, cantidadPelotas, cantidadPaletas, productos[{productoId, codigo, nombre, tipo, cantidad, precioUnitario, subtotal, cantidadDevuelta, devueltaAt}], estado, clienteId, clienteNombre, createdAt, expiresAt, pagos: PagoResponse[]`.

## Pagos (`services/pagoService.ts`)

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| POST | `/pagos/:reservaId/iniciar?pagarTotal=bool` | — | `PagoResponse` `PENDIENTE`. `false` = lo que falta para la seña, `true` = todo el saldo. Idempotente por monto |
| POST | `/pagos/:reservaId/pago` | formData del Card Payment Brick (`token`, `payment_method_id`, `installments`, `issuer_id`, `payer`) | `PagoResponse` con `estado` `APROBADO`, `RECHAZADO` o `EN_PROCESO`, `estadoReserva` y `detalle` (timeout de 30 s) |

`PagoResponse`: `id, reservaId, monto, estado, provider, paymentToken (id de preferencia), externalPaymentId, createdAt, paidAt, estadoReserva, detalle`.

Estados del pago: `PENDIENTE`, `APROBADO`, `RECHAZADO`, `EN_PROCESO`, `DEVUELTO`, `EXPIRADO`, `A_REEMBOLSAR`.
