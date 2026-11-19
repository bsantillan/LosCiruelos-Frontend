# Reservas y pagos

Solo los usuarios con rol **CLIENTE** reservan y pagan desde la web. Las rutas `/reservas`, `/reservas/:id/pago` y `/mis-reservas` usan `ProtectedRoute roles={["CLIENTE"]}`. El backend también deja reservar a ADMIN y EMPLEADO, pero indicando un `clienteId`; eso queda para un futuro panel del club.

Las reglas salen de `LosCiruelos-Backend/docs/flujos-de-negocio.md`. El frontend las replica en `utils/reservas.ts` para decidir qué botones mostrar, pero **el backend valida todo** y sus mensajes de error se muestran tal cual.

## Resumen del flujo

```
/reservas
  1. Fecha, cancha y duración       ── GET /canchas, GET /canchas/:id/disponibilidad?fecha&duracion
  2. Turno libre (lo calcula el backend: turnosDisponibles)
  3. Pelotas y paletas (cantidad)   ── GET /productos/disponibilidad?fecha&horaInicio&horaFin
  4. "Continuar al pago"            ── POST /reservas → PENDIENTE por 15 min
        │
        ▼
/reservas/:id/pago                  ── GET /reservas/:id (el estado siempre viene del servidor)
  5. Seña o total (o saldo)         ── POST /pagos/:id/iniciar?pagarTotal=… → monto + preferencia (paymentToken)
  6a. Tarjeta (Payment Brick)       ── POST /pagos/:id/pago con el formData del Brick
        ├─ APROBADO   → "¡Turno confirmado!" (SEÑADA o PAGADA)
        ├─ RECHAZADO  → motivo (status_detail de MP) + "Intentar de nuevo" (nuevo /iniciar)
        └─ EN_PROCESO → se consulta GET /reservas/:id cada 3,5 s hasta que MP resuelva
  6b. Cuenta de MP (Wallet Brick)   ── abre Mercado Pago en otra pestaña (redirectMode "blank")
        └─ esta pestaña consulta GET /reservas/:id cada 3,5 s hasta que el webhook resuelva el pago

/pago/resultado?reservaId=…       ── a donde vuelve la pestaña de Mercado Pago (back_urls)
  Consulta GET /reservas/:id (no confía en el parámetro `resultado`) y muestra el resultado

/mis-reservas                       ── GET /reservas/mias
  Próximas e historial; completar pago, pagar saldo, ver pago en revisión o cancelar
```

## Estados de la reserva

| Estado | Cuándo | Qué puede hacer el cliente |
|---|---|---|
| `PENDIENTE` | Recién creada; vence a los 15 min sin pago | Pagar seña o total, cancelar |
| `CONFIRMADA` | Partido armado por el club, sin nada pagado (no vence) | Nada: se paga en el club |
| `PARCIALMENTE_PAGADA` | Pagó menos que la seña | Completar la seña o pagar el saldo |
| `SEÑADA` | Pagó la seña | Pagar el saldo online o en el club |
| `PAGADA` | Pagó todo | Nada (pasa a `COMPLETADA` cuando termina el turno) |
| `COMPLETADA` | Turno jugado y pago | Cuenta para las estadísticas del perfil |
| `CANCELADA` / `EXPIRADA` | Cancelada o vencida | Nada; el turno quedó libre |

Una reserva `PENDIENTE` con un pago **en proceso** no vence mientras Mercado Pago decide.

## 1. Elegir turno (`pages/Reservas/Reservas.tsx`)

**Fecha.** Selector propio (`components/ui/SelectorFecha`), no el `<input type="date">` nativo. Las flechas pasan al día anterior o siguiente, y un clic en la fecha abre un calendario del mes (semana de lunes a domingo, con botones "Hoy" y "Mañana"). Arranca en hoy y no deja elegir días pasados. Se maneja con teclado: flechas, Re Pág/Av Pág, Enter y Escape. Las fechas se calculan en hora local (`utils/fechas.ts`).

**Cancha.** Hay un tab por cancha y la primera queda elegida por defecto.

**Duración.** La primera consulta va **sin duración**: el backend usa la mínima configurada y la devuelve en `disponibilidad.duracion`, que es la que se muestra. Los botones −30 y +30 se mueven entre `duracionMinimaTurno` y `duracionMaximaTurno`, y cada cambio vuelve a consultar con la duración elegida.

**Turnos libres.** Los calcula el **backend** (`turnosDisponibles`) con las mismas reglas que usa al crear la reserva:
- Cada 30 min desde la apertura.
- Sin superponerse con turnos ocupados.
- Si es hoy, desde el próximo bloque libre (`horarioMinimoInicio`; `null` = no quedan turnos hoy).

El frontend ya no calcula turnos. Si se cambia de cancha o de día rápido, se cancela la request anterior (`AbortController`).

**Pelotas y paletas** (`hooks/useProductosDisponibles.ts`). Al elegir un turno se consulta `GET /productos/disponibilidad` para ese horario, que devuelve precio y unidades disponibles. Hay un selector de cantidad por producto:
- **Pelotas** se venden: el stock baja con cada reserva. Máximo 50.
- **Paletas** se alquilan: el stock se comparte entre todas las canchas en ese horario. Máximo 20.
- El "+" se deshabilita al llegar a lo disponible. Sin unidades libres se muestra "Sin stock para este horario"; con stock pero sin precio cargado por el admin, "Todavía no disponible".
- **Precio en el resumen**: cancha (para la duración elegida), cada producto (`cantidad × Pelotas/Paletas (precio unitario)`) y el **total**. Se actualiza al sumar o quitar pelotas y paletas. El precio de la cancha sale de `montoCancha` en la disponibilidad (si no viniera, muestra "Al confirmar").

**Perfil incompleto.** Si falta teléfono, categoría o posición, aparece un aviso con un link a `/perfil` (el backend responde 403).

**Confirmar.** `POST /reservas` con `{ canchaId, fechaReserva, horaInicio, horaFin, cantidadPelotas, cantidadPaletas }`:
- Crea la reserva `PENDIENTE` con `expiresAt` = ahora + 15 min y **reserva el stock** de los productos.
- Si el cliente vuelve a pedir la misma cancha, fecha e inicio, el backend **actualiza** su reserva pendiente (otra hora de fin u otras cantidades).
- Si pide otro horario en esa cancha y fecha, el backend cancela sus otras pendientes.
- Si el turno se ocupó o no hay stock (409), se muestra el mensaje y **se recargan los turnos**.

**Reserva pendiente.** Al entrar se consulta `GET /reservas/mias`. Si hay una `PENDIENTE` vigente, aparece un modal:
- **Completar pago**, o **Ver estado** si hay un pago en revisión.
- **Cancelar reserva**, solo si no tiene pagos aprobados ni en proceso.

Cerrarlo no cancela nada; queda un aviso para retomarla. Como el dato viene del servidor, funciona desde cualquier dispositivo.

## 2. Pagar (`pages/Pago/Pago.tsx` + `hooks/usePago.ts`)

**Carga.** Se pide `GET /reservas/:id`; la reserva que llega desde `/reservas` se muestra mientras tanto. Si responde 404 (no existe o es de otro usuario), se muestra "No encontramos esta reserva". Recargar la página retoma el mismo punto:
- Si hay un pago iniciado (`PENDIENTE`), va directo a la tarjeta con ese monto.
- Si hay un pago `EN_PROCESO`, va a la pantalla de revisión.

**Resumen ("Tu reserva").** Cancha, fecha y horario, y el **desglose**: precio de la cancha, cada producto con cantidad y precio unitario, y el total. La seña no se muestra ahí: se ve recién al elegirla, en "Seña a pagar". Si ya hubo pagos, se agregan pagado y pendiente. Si la reserva está `PENDIENTE`, se muestra una cuenta regresiva hasta `expiresAt` (en rojo en los últimos 2 min).

**Cambiar pelotas y paletas.** En el paso de elegir seña o total (también al retomar una reserva `PENDIENTE` desde Mis reservas o desde el aviso en `/reservas`), la tarjeta "Tu reserva" tiene el botón **"Editar pelotas y paletas"** (o "Agregar…" si no tiene). Una vez elegido cuánto pagar, el monto queda fijo y el botón desaparece; para cambiar los extras hay que volver a ese paso con "Volver".
- Abre los mismos selectores de cantidad (`components/SelectorProducto`, compartido con `/reservas`) con el nuevo total, y los botones "Volver" y "Guardar cambios".
- **Stock:** el máximo suma lo que ya tiene tomado esta reserva, porque la disponibilidad del backend no lo cuenta como libre.
- **Cómo se guarda:** `POST /reservas` con la misma cancha, fecha y horario. El backend actualiza **la misma reserva** (mismo id) y, si cambió el monto, descarta el pago iniciado (`EXPIRADO`).

**Paso 1: cuánto pagar.** Los montos salen del servidor (`montoSenia`, `montoPagado`, `montoPendiente`):
- Si falta completar la seña, hay dos opciones con su monto en el título: **Seña · $X** (lo que falta para completarla) o **Total · $Y** (todo el saldo).
- Si la seña ya está paga (`SEÑADA`), queda una sola opción: **Saldo**.

"Continuar al pago" llama a `POST /pagos/:id/iniciar?pagarTotal=…`, que devuelve el `monto` y la **preferencia** de Mercado Pago (`paymentToken`). Es **idempotente**: si ya existe un pago iniciado por ese monto lo devuelve, y si era por otro monto lo reemplaza (el anterior queda `EXPIRADO`). Por eso se puede **cambiar entre seña y total** volviendo al paso anterior.

**Volver.** Arriba de la pantalla hay siempre un botón "Volver" que lleva al paso anterior: desde "elegí cómo pagar" (o desde un rechazo) vuelve a elegir seña o total, y desde ahí a la página anterior (reservar; si se entró directo por URL, a `/reservas`).

**Desde Mis reservas.** Se navega con `state: { reserva, desde: "mis-reservas", pagarTotal? }`. "Pagar" no lleva `pagarTotal`, así que se ve el paso de elegir seña o total. "Pagar saldo" (una sola opción) lleva `pagarTotal: true`: la pantalla inicia el pago sola ("Preparando el pago…") y va directo al medio de pago. "Volver" va al paso anterior y desde el primero vuelve a Mis reservas. Si `/iniciar` falla, se muestra el error con las opciones para elegir a mano.

**Cancelar.** Todos los botones de cancelar (cancelar la reserva acá, en el modal de reserva pendiente y en Mis reservas) usan el estilo rojo de acción destructiva, y también la confirmación "Sí, cancelar" de esos modales.

**Paso 2: elegir cómo pagar.** Dos opciones una al lado de la otra (**Tarjeta** | **Mercado Pago**); el contenido de la elegida se muestra abajo. Por defecto queda elegida Tarjeta.

*Tarjeta (crédito o débito)*: **Card Payment Brick** (`components/BrickTarjeta`), con `{ amount, payer.email }`.
- Es un solo formulario para crédito y débito: el tipo se detecta por el número. Se prefirió al Payment Brick, que las muestra como dos opciones separadas.
- Los datos de la tarjeta no pasan por nuestro servidor: el Brick genera un `token`, que va con el resto del `formData` a `POST /pagos/:id/pago`.
- El backend cobra **el monto del pago iniciado** (ignora el `transaction_amount` del navegador) y usa una clave de idempotencia, así un doble clic no cobra dos veces.

*Mercado Pago (con la cuenta)*: **Wallet Brick** (`components/BotonMercadoPago`), con `{ preferenceId, redirectMode: "blank" }`.
- Abre Mercado Pago en una **pestaña nueva** (en el celular, la app). La pestaña de la reserva queda abierta.
- Mercado Pago discontinuó el modo modal el 21/12/2023 y no hay forma oficial de abrirlo en una ventana emergente.
- El tiempo que queda se ve en la cuenta regresiva del resumen. Si la reserva vence, también vence la preferencia (`expiration_date_to`).
- Con `preferenceId`, el Wallet no tiene un callback para el clic, y el botón está dentro de un iframe. El clic se detecta porque la ventana pierde el foco hacia ese iframe o porque la pestaña queda oculta.
- Desde ese momento, la pestaña muestra "Esperando la confirmación de Mercado Pago…" y consulta `GET /reservas/:id` cada 3,5 s, siguiendo **ese pago** hasta que deja de estar `PENDIENTE`. Se sigue el pago y no el estado de la reserva porque, al pagar el saldo de una reserva `SEÑADA`, la reserva nunca está `PENDIENTE`.
- Al volver a la pestaña, consulta en el acto.
- La consulta se corta un minuto después de `expiresAt`, o a los 15 minutos si la reserva ya estaba confirmada. En ese caso avisa que el resultado se va a ver en Mis reservas.
- Al mostrar el botón (y al detectar el clic) se guarda en `localStorage` la marca `pagoMercadoPago` (`utils/retornoMercadoPago.ts`), con la reserva y el `preference_id`. Es lo que habilita `/pago/resultado`.

*Detalles técnicos*:
- Los componentes del SDK vuelven a crear el formulario cada vez que cambia alguno de sus props. Por eso `BrickTarjeta` y `BotonMercadoPago` están memorizados y reciben objetos y callbacks estables; si no, la cuenta regresiva (que re-renderiza la página cada segundo) los reiniciaba sin parar.
- Si Mercado Pago informa un error crítico al cargar el formulario de tarjeta, se muestra un mensaje con el botón "Reintentar".
- Un pago nuevo (otro monto o un reintento) monta Bricks nuevos (`key = pago.id`).

**Paso 3: resultado.**

| `estado` del pago | Pantalla |
|---|---|
| `APROBADO` | "Turno pagado" si quedó pago completo, "Turno señado" si se pagó la seña ("Pago recibido" si fue un pago parcial): lo pagado y, si fue seña, lo que falta abonar (en el club o desde Mis reservas). Se recarga la reserva para mostrar los montos actualizados |
| `RECHAZADO` | El motivo traducido desde `detalle` (`utils/mercadoPago.ts`: fondos insuficientes, código de seguridad, vencimiento, autorizar con el banco, …) y **Intentar de nuevo**, que inicia un pago nuevo con la misma opción |
| `EN_PROCESO` | "Estamos procesando tu pago". Se consulta `GET /reservas/:id` cada 3,5 s; cuando el webhook de MP lo resuelve, la pantalla pasa sola a aprobado o rechazado. También se ve en Mis reservas |
| `A_REEMBOLSAR` | El pago llegó con la reserva ya vencida o cancelada: "Recibimos el pago, pero la reserva ya no estaba activa", y el club devuelve el dinero |
| Error (400/409/502) | El mensaje del backend; el formulario de tarjeta queda habilitado para reintentar |

**Vencimiento.** Cuando el contador llega a 0, el frontend llama **una vez** a `POST /reservas/:id/expirar`. El turno y el stock se liberan en el acto, sin esperar al job del backend (que corre cada minuto). Si responde 409 (el reloj del servidor todavía no llegó) se ignora. Se muestra "Se venció el tiempo para pagar".

**Cancelar.** Disponible mientras la reserva esté `PENDIENTE`, sin pagos aprobados ni en proceso: `DELETE /reservas/:id/cancelar`. Los pagos iniciados pasan a `EXPIRADO` y el stock vuelve.

## 3. Vuelta de Mercado Pago (`/pago/resultado`, `pages/PagoResultado`)

Al terminar en la pestaña de Mercado Pago, se vuelve a `FRONTEND_URL/pago/resultado?reservaId=…&resultado=aprobado|rechazado|pendiente`, más los parámetros que agrega Mercado Pago (`payment_id`, `status`, `external_reference`, …). `FRONTEND_URL` es una variable del backend; por defecto es `http://localhost:5173`.

- **Acceso**: solo con sesión de CLIENTE (`ProtectedRoute`) y **solo volviendo de Mercado Pago**. La URL tiene que traer el `preference_id` (y el `reservaId`, más `external_reference` si viene) que coincidan con la marca `pagoMercadoPago` que guardó la pantalla de pago. La marca dura 30 minutos y se borra cuando ya hay un resultado. Sin marca válida (la URL escrita a mano, una recarga posterior u otro navegador), redirige al inicio.
- **No se confía en `resultado`**: cualquiera puede escribirlo en la URL. Se consulta `GET /reservas/:id` y se toma el pago con ese `payment_id` (`externalPaymentId`) o, si el webhook todavía no lo registró, el último pago de Mercado Pago. Mientras siga pendiente, se consulta cada 3,5 s durante 2 minutos.
- **Resultados posibles**:
  - "¡Pago recibido! Ya podés cerrar esta pestaña", con el saldo a abonar en el club si fue seña.
  - "El pago no se pudo completar", con un link para volver a intentar.
  - "Recibimos el pago, pero la reserva ya no estaba activa".
  - "Mercado Pago todavía está procesando el pago".
- **Sin "Recordarme"**: la sesión vive solo en la pestaña original (`sessionStorage`), así que la pestaña de regreso no tiene sesión y va a `/login`. El resultado igual se ve en la pestaña original, que lo detecta sola.

## 4. Mis reservas (`pages/MisReservas/MisReservas.tsx`)

Usa `GET /reservas/mias` paginado (`hooks/useMisReservas.ts`):
- **Próximas**: `tipo=proximas&size=50`, ordenadas por fecha de juego, sin paginador.
- **Historial**: `tipo=historial&size=10`, con filtros y paginado ("Anterior · Página X de Y · Siguiente"):
  - **Estado:** Todas, Jugadas (`COMPLETADA`), Con saldo pendiente (`SEÑADA` / `PARCIALMENTE_PAGADA` ya jugadas) y Canceladas (`CANCELADA` + `EXPIRADA`, unidas porque para el cliente la diferencia no importa).
  - **Descartadas:** el cliente ve solo las canceladas y vencidas que **tuvieron un pago** (con su reembolso). Las que nunca movieron plata son intentos abandonados: el backend las oculta y siguen en la base. Esto vale también al filtrar por estado.
  - **Período** (`components/ui/SelectorPeriodo`): el mismo calendario que la fecha de reserva, con tres modos.
    - **Día:** un clic.
    - **Mes:** grilla de 12 meses con flechas de año.
    - **Rango:** primer clic marca el inicio y segundo clic el fin, en cualquier orden; el tramo se resalta mientras se mueve el mouse.

    Envía `desde` y `hasta`. El botón muestra lo elegido ("16 oct 2026", "octubre de 2026", "1 oct – 15 oct 2026"), y la "×" o "Todo el período" quita el filtro.
  - Cambiar un filtro vuelve a la primera página. Mientras carga otra página, la lista anterior queda visible y atenuada.

Cada reserva es una fila de ancho completo; en pantallas angostas se reacomoda en dos o una columna:
- **Cancha y estado** (badge; "Pago en revisión" si hay un pago `EN_PROCESO`).
- **Datos**, cada uno con su ícono: fecha, rango horario, duración y extras.
- **Lo pagado**, solo lo que corresponde: "Pagado total", "Seña pagada" (y "Resta $X"), "Pago parcial" o "Sin pagar".
  - **Turno jugado que debe saldo** (`debeSaldo`): la etiqueta dice "Jugada · saldo pendiente" y se muestra "Saldo pendiente $X" (`montoPendiente`), con un botón "Pagar".
  - **Canceladas con reembolso:** "Reembolso en proceso" (`REEMBOLSO_PENDIENTE`; el backend lo reintenta cada 2 minutos), "Reembolsado" (`DEVUELTO`) o "A devolver por el club" (`A_REEMBOLSAR`), con el monto.
  - **Canceladas y vencidas sin reembolso:** lo pagado o "Sin pagos".
- **Acciones**:
  - **Pagar**: con seña y total disponibles, lleva al paso de elegirlos; con una sola opción (saldo), directo al medio de pago.
  - **Ver estado**: si hay un pago en revisión.
  - **Cancelar** (rojo): cuando el backend dice `cancelable`.

## 5. Cancelar una reserva

El backend decide si se puede (`cancelable`) y cuánto se devuelve (`montoReembolso`), con la política de la configuración:

| Cuándo se cancela | Qué se devuelve |
|---|---|
| `PENDIENTE` (sin pagos) | Nada (no hay nada cobrado) |
| Confirmada, faltando ≥ 24 h (`minutosReembolsoTotal`) | Todo lo pagado |
| Confirmada, faltando ≥ 12 h (`minutosReembolsoSenia`) | Hasta el valor de la seña |
| Confirmada, faltando menos de 12 h (hasta que empieza el turno) | Nada |

- **Dónde:** se puede cancelar desde Mis reservas y desde la pantalla de pago (botón rojo en el encabezado).
- **Modal:** `descripcionCancelacion` (`utils/reservas.ts`) explica lo que se devuelve ahora. Si se pierde parte del reembolso, también dice hasta cuándo se devolvía más (`reembolsoTotalHasta` / `reembolsoSeniaHasta`).
- **Medios de pago:** lo pagado online vuelve por Mercado Pago; lo pagado en el club lo devuelve el club.
- **Reembolso que Mercado Pago todavía no acepta** (el pago recién se acreditó): la reserva **se cancela igual** y el pago queda `REEMBOLSO_PENDIENTE` ("Reembolso en proceso"). El backend reintenta cada 2 minutos; a las 24 h sin éxito pasa a `A_REEMBOLSAR` para que lo devuelva el club.

## Configuración necesaria
- `VITE_MP_PUBLIC_KEY`: de la **misma cuenta y el mismo entorno** (prueba o producción) que el `MP_ACCESS_TOKEN` del backend.
- En el backend: precio y stock de **Pelotas** y **Paletas** (`/admin/configuracion/productos`). Arrancan en 0 y, mientras tanto, no se pueden pedir.

### Probar pagos con tarjeta (automático)

`npm run probar:pagos` (`scripts/probar-pagos.mjs`) recorre el flujo real contra el backend y Mercado Pago sandbox, sin navegador:
1. **Turno y pago iniciado:** login, una reserva en un turno libre a más de 10 días y `/pagos/:id/iniciar`.
2. **Token de tarjeta:** lo pide a Mercado Pago (`/v1/card_tokens` con la `VITE_MP_PUBLIC_KEY`), igual que el Card Payment Brick.
3. **Cobro:** `POST /pagos/:id/pago`, y compara el estado y el motivo con lo esperado para el titular.
4. **Limpieza:** cancela las reservas. En los pagos aprobados eso prueba el reembolso: devuelve todo, porque faltan más de 24 h.

Las tarjetas y los titulares de prueba están en `scripts/tarjetas-prueba.json`; el nombre del titular define el resultado (APRO, OTHE, CONT, CALL, FUND, SECU, EXPI, FORM).

| Comando | Qué prueba |
|---|---|
| `npm run probar:pagos` | APRO con las 5 tarjetas y el resto de los titulares con Mastercard (12 casos) |
| `npm run probar:pagos -- --todas` | Todos los titulares con todas las tarjetas (40 casos) |
| `npm run probar:pagos -- --escenarios=APRO,FUND --tarjetas=visa,amex` | Una combinación puntual |
| `npm run probar:pagos -- --total` | Paga el total en lugar de la seña |
| `npm run probar:pagos -- --sin-limpiar` | Deja las reservas creadas para verlas en la web |

**Requisitos:**
- Credenciales `TEST-` en el backend y en el frontend.
- Un CLIENTE con el perfil completo: por defecto el usuario de prueba del backend (`APP_SEED_USUARIO_PRUEBA=true`), o `PRUEBA_EMAIL` / `PRUEBA_PASSWORD`.
- Opcional: `PRUEBA_ADMIN_EMAIL` / `PRUEBA_ADMIN_PASSWORD`, para cancelar sin reembolso como admin si un reembolso falla.

El script devuelve código 1 si algún pago o reembolso no dio lo esperado.

**Resultados (17/10/2026):** los 12 casos por defecto dieron lo esperado.

| Titular | Resultado del pago |
|---|---|
| APRO | Aprobado (`accredited`) con Mastercard, Visa, Amex, Mastercard Débito y Visa Débito |
| OTHE | `cc_rejected_other_reason` |
| CONT | Rechazado `cc_rejected_other_reason`, no "pendiente": el backend cobra con `binary_mode` |
| CALL | `cc_rejected_call_for_authorize` |
| FUND | `cc_rejected_insufficient_amount` |
| SECU | `cc_rejected_bad_filled_security_code` |
| EXPI | `cc_rejected_bad_filled_date` |
| FORM | `cc_rejected_bad_filled_other` |

- **Pago del total:** también se probó; la reserva queda `PAGADA` y el reembolso devuelve los $15.000.
- **Reembolso inmediato:** Mercado Pago **no deja reembolsar un pago apenas aprobado** (la cancelación responde 502 "Mercado Pago no pudo hacer el reembolso") y a los pocos segundos o minutos sí. El script reintenta; en la web, el usuario ve ese mensaje en el modal y puede reintentar (ver [errores-conocidos.md](errores-conocidos.md)).

## Bonificaciones del club

El ADMIN puede no cobrarle al cliente una reserva, completa o una parte (socio, torneo, cortesía). Queda como un pago con `provider: "BONIFICACION"` y su `motivo`, y la reserva trae `montoBonificado`.

- `montoPagado` es solo plata cobrada. Lo que cubre el turno es lo pagado más lo bonificado (`montoCubierto` en `utils/reservas.ts`, igual que en el backend). Con eso se calcula lo que falta para la seña y si se ofrece "Pagá el saldo".
- `montoPendiente` ya viene descontando lo bonificado.
- **Pago:** el resumen muestra "Bonificado por el club" además de "Pagado".
- **Mis reservas:** una reserva bonificada completa se ve como "Bonificado por el club"; una parcial, como "Seña cubierta" o "Pago parcial", con el detalle de lo bonificado.
- **Cancelación:** lo bonificado no se devuelve; solo se devuelve la plata cobrada.

## Partidos (vista del jugador)

Un **partido** (`tipo: "PARTIDO"`) lo arma el ADMIN con 4 jugadores; el jugador 1 es el responsable y es el cliente de la reserva. Los jugadores registrados lo ven en Mis reservas con la etiqueta "Partido" y los nombres de los cuatro, pero **no lo pueden pagar ni cancelar**: no tiene seña ni vence, se paga en el club como un todo y lo cancela el club. Sin nada pagado queda `CONFIRMADA` ("Confirmado", "Sin pagar · Se paga en el club"). Si un jugador entra a `/reservas/{id}/pago` de un partido, la pantalla le dice que se paga en el club (`admitePagoOnline` y `admiteCancelacion` devuelven `false` para un partido).
