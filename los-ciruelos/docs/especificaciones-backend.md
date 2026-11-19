# Especificaciones para el backend

Cambios que pidió el frontend a `LosCiruelos-Backend`.

> **Estado (18/10/2026): la sección 8 (reembolsos) está pendiente.** Al 17/10, **las siete primeras secciones estaban implementadas** y verificadas contra el backend (fechas con `-03:00` y milisegundos, horas `HH:mm`, descartadas ocultas también con filtro de estado). Además, la migración V6 dejó 50 pelotas y 50 paletas de stock; **falta cargar sus precios** (siguen en $0). El backend agregó además `turnoTerminado` y `debeSaldo` en `ReservaResponse`, `incluirDescartadas` en `GET /reservas/mias` (oculta las canceladas y vencidas sin plata) y `GET /reservas/saldos-pendientes` (ADMIN/EMPLEADO). Las 1 a 3 están y verificados contra el backend en el puerto 9090.
> Diferencias con lo pedido:
> - La política de cancelación quedó con dos tiempos: faltando ≥ 24 h (`minutosReembolsoTotal`) se devuelve todo; ≥ 12 h (`minutosReembolsoSenia`), hasta la seña; con menos, se puede cancelar sin devolución hasta que empieza el turno. El tercer tiempo (W = 6 h) no se implementó.
> - `ReservaResponse` también trae `reembolsoTotalHasta` y `reembolsoSeniaHasta`, y `PagoResponse` trae `montoReembolsado`.
> - `DELETE /reservas/{id}/cancelar` acepta `?reembolso=TOTAL|SENIA|NADA` solo para ADMIN o EMPLEADO.

---

## 1. Mis reservas con filtros y paginación — `GET /reservas/mias`

**Hoy**: devuelve **todas** las reservas del usuario (`List<ReservaResponse>`), sin filtros. El historial crece sin límite y el frontend descarga todo en cada visita.

**Rol**: CLIENTE, sobre sus propias reservas, como hoy.

### Parámetros (query string, todos opcionales)

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `tipo` | `proximas` \| `historial` | — (todas) | Filtro base, la misma división que muestra la página (ver abajo) |
| `estado` | lista de `EstadoReserva`, separada por coma | — | Ej.: `estado=SEÑADA,PAGADA`. Se combina con `tipo` (AND) |
| `desde` | `LocalDate` (`YYYY-MM-DD`) | — | `fechaReserva >= desde` |
| `hasta` | `LocalDate` | — | `fechaReserva <= hasta` |
| `page` | int ≥ 0 | `0` | Página (base 0) |
| `size` | int 1–50 | `10` | Tamaño de página |

**Definición de `tipo`**, la misma que hoy aplica el frontend en `MisReservas.tsx` (`esProxima`):
- `proximas`: el turno **todavía no terminó** (`fechaReserva` > hoy, o es hoy y `horaFin` > ahora) y el estado es `SEÑADA`, `PARCIALMENTE_PAGADA`, `PAGADA` o `PENDIENTE` vigente (`expiresAt` > ahora, o con un pago `EN_PROCESO`). Usar el mismo criterio de "ocupa el turno" que la disponibilidad.
- `historial`: todo lo demás (`COMPLETADA`, `CANCELADA`, `EXPIRADA`, `PENDIENTE` vencida y turnos ya terminados).

**Orden**, fijo según `tipo`, sin parámetro `sort` para no exponer nombres de columnas:
- `proximas`: `fechaReserva ASC, horaInicio ASC` (la próxima a jugar primero).
- `historial` o sin `tipo`: `fechaReserva DESC, horaInicio DESC`.

### Respuesta `200`

DTO propio, en lugar de serializar `Page` de Spring. El formato JSON de `PageImpl` no es estable entre versiones y Spring Boot ya advierte al serializarlo.

```json
{
  "contenido": [ /* ReservaResponse, igual que hoy */ ],
  "pagina": 0,
  "tamanio": 10,
  "totalElementos": 37,
  "totalPaginas": 4
}
```

```java
public record PaginaResponse<T>(List<T> contenido, int pagina, int tamanio,
                                long totalElementos, int totalPaginas) {
    public static <T> PaginaResponse<T> de(Page<T> page) {
        return new PaginaResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
```

### Errores (formato habitual `{ "error": "…" }`)

| Caso | HTTP |
|---|---|
| `size` > 50 o < 1, `page` < 0 | 400 |
| `desde` > `hasta` | 400 "La fecha desde no puede ser posterior a hasta." |
| `estado` o `tipo` con un valor inexistente | 400 |

### Implementación sugerida
- **Filtros opcionales:** `JpaSpecificationExecutor<Reserva>` en `ReservaRepository`, una `Specification` por filtro y combinarlas con `and`.
- **`tipo=proximas` con "PENDIENTE vigente":** depende de `expiresAt` y de que haya pagos `EN_PROCESO`. Conviene una `Specification` que reutilice la condición de `findSolapadas` / "ocupa el turno", así las tres pantallas usan la misma definición.
- **Carga de pagos y productos:** `ReservaResponse` incluye `pagos` y `productos`. Para no caer en N+1, usar `@EntityGraph(attributePaths = {"pagos", "productos", "cancha"})` o dos consultas (ids paginados y después un fetch por ids). Con `JOIN FETCH` sobre colecciones, Hibernate pagina en memoria (`HHH90003004`).
- **Índice:** `(cliente_id, fecha_reserva DESC, hora_inicio DESC)` en `reservas`.
- **Compatibilidad:** la respuesta cambia de lista a página. Si se hace en el mismo release que el frontend, alcanza con cambiarlo. Si no, exponerlo como `GET /reservas/mias/paginadas` y retirar el viejo después.

### Uso en el frontend
- **Próximas:** `GET /reservas/mias?tipo=proximas&size=50`, sin paginador: suelen ser pocas.
- **Historial:** `GET /reservas/mias?tipo=historial&page=N&size=10`, con filtros de estado (Jugadas, Canceladas, Vencidas, …) y de rango de fechas.
- **El aviso de "reserva sin pagar" en `/reservas`:** puede pedir `tipo=proximas&estado=PENDIENTE&size=1`.

---

## 2. Cancelar reservas señadas o pagadas — `DELETE /reservas/{id}/cancelar`

**Hoy**: solo cancela reservas `PENDIENTE` sin pagos activos. Con cualquier otro estado responde `409 "Solo se pueden cancelar reservas PENDIENTE"`, así que una reserva **señada o pagada no se puede cancelar desde la web**. Los términos del registro dicen *"La cancelación debe realizarse con al menos 2 horas de anticipación"*, lo que implica que sí debería poder hacerse.

### Decisiones de negocio a definir antes de implementar
1. **Anticipación mínima:** ¿2 horas, como dicen los términos? Propuesta: un campo `horasMinimasCancelacion` en `Configuracion` (inicial 2).
2. **¿Qué se devuelve?**
   - a) todo lo pagado;
   - b) todo menos la seña, que el club retiene;
   - c) todo si se cancela con más de X horas y nada si es con menos.
3. **Pagos en efectivo o en el mostrador** (`MANUAL`): no se pueden devolver por API. ¿Se marcan `A_REEMBOLSAR` para que los devuelva el club?

### Comportamiento propuesto
- **`PENDIENTE`:** sin cambios respecto de hoy.
- **`SEÑADA`, `PARCIALMENTE_PAGADA` o `PAGADA`:**
  - Se permite si faltan al menos `horasMinimasCancelacion` horas para `fechaReserva + horaInicio`. Si no, `409 "Solo se puede cancelar hasta 2 h antes del turno."`.
  - Se calcula el monto a devolver según la decisión 2.
  - **Pagos de Mercado Pago:** se devuelven con `PaymentRefundClient().refund(paymentId, monto)`, con `X-Idempotency-Key`, y quedan `DEVUELTO`.
  - **Pagos manuales:** quedan `A_REEMBOLSAR`.
  - Si Mercado Pago falla, `502` y no se cancela nada, en una sola transacción y con el lock de la reserva, como el resto.
  - La reserva pasa a `CANCELADA` y se devuelve el stock (pelotas y paletas), igual que hoy.
- **`COMPLETADA`, `CANCELADA` o `EXPIRADA`:** `409`, igual que hoy.
- **Respuesta `200`:** `ReservaResponse` actualizado, con los pagos en su nuevo estado.

### Campos nuevos en `ReservaResponse`, para mostrar el botón y avisar antes de confirmar

| Campo | Tipo | Descripción |
|---|---|---|
| `cancelable` | boolean | Si hoy se puede cancelar (estado y anticipación) |
| `cancelableHasta` | `LocalDateTime` \| null | Límite para cancelar |
| `montoReembolso` | `BigDecimal` | Lo que se devolvería si se cancela ahora |

Con esto el frontend deja de replicar la regla (`admiteCancelacion` en `utils/reservas.ts`). El modal puede decir, por ejemplo, "Se te van a devolver $X a la tarjeta" o "Podés cancelar hasta el jueves 16 a las 16:00".

---

## 3. Precio de la cancha en la disponibilidad — `GET /canchas/{id}/disponibilidad`

Agregar `montoCancha` (`BigDecimal`) a `DisponibilidadResponse`, calculado para la `duracion` usada con la misma fórmula que al reservar: `montoReserva + montoXMediaHora × (duracion / 30)`. Conviene extraer el cálculo de `ReservaService` a un método compartido, para que el precio que ve el usuario sea siempre el que se cobra.

El frontend ya lo lee de `disponibilidad.montoCancha`. Mientras no venga, muestra "Al confirmar" para la cancha.

---

## 4. Cancelar aunque Mercado Pago todavía no permita el reembolso — `DELETE /reservas/{id}/cancelar`

**Hoy**: si el cliente cancela una reserva que pagó hace segundos o pocos minutos, Mercado Pago rechaza el reembolso (`PaymentRefundClient.refund` lanza `MPApiException`). `CancelacionService` responde **502 "Mercado Pago no pudo hacer el reembolso. Intentá de nuevo."** y **no cancela la reserva**. Verificado con `npm run probar:pagos` del frontend: falló en los 5 pagos aprobados y minutos después las mismas cancelaciones funcionaron.

**Por qué cambiarlo**: quien reserva, paga y se arrepiente enseguida recibe un error. Si no reintenta, el turno queda ocupado y su plata cobrada. La cancelación no debería depender de que Mercado Pago ya acepte el reembolso.

### Comportamiento propuesto
1. **Al cancelar**, se intenta el reembolso como hoy.
   - **Si funciona:** sin cambios (pago `DEVUELTO`).
   - **Si Mercado Pago lo rechaza:** la reserva **se cancela igual** (`CANCELADA`, el stock vuelve) y el pago pasa a un estado nuevo, **`REEMBOLSO_PENDIENTE`**, con `montoReembolsado` = lo que se tiene que devolver. Respuesta `200`, con la reserva cancelada.
2. **Job (cada 2 minutos, en `ReservaJobs`):** busca pagos `REEMBOLSO_PENDIENTE` y reintenta el reembolso, cada uno en su propia transacción y con el lock de la reserva, como el resto.
   - **Si funciona:** pasa a `DEVUELTO`.
   - **Si falla por algo que no es transitorio** (por ejemplo, el pago ya fue reembolsado en el panel de Mercado Pago), o después de N intentos (sugerido: 24 h), pasa a `A_REEMBOLSAR` y queda un `log.error`, para que lo resuelva el personal.
3. **Idempotencia:** usar la misma `X-Idempotency-Key` del pago (ver sección 5). Si un reintento repite un reembolso que Mercado Pago ya hizo, no se devuelve dos veces.

### Contrato
- `EstadoPago` suma `REEMBOLSO_PENDIENTE`.
- `DELETE /reservas/{id}/cancelar` ya no responde 502 por esta causa. El 502 queda para errores de Mercado Pago que no son de reembolso.
- El frontend muestra en el modal y en Mis reservas "Te vamos a devolver $X; puede demorar unos minutos" cuando un pago está `REEMBOLSO_PENDIENTE`.

### Alternativa mínima (si no se quiere el estado nuevo)
Reintentar el reembolso dos o tres veces con espera (por ejemplo, 2 s, 4 s y 8 s) antes de responder. Si sigue fallando, devolver **409** con `{ "error": "El pago todavía se está acreditando. Podés cancelar en unos minutos." }` en lugar de 502. Es más simple, pero el cliente sigue teniendo que reintentar.

---

## 5. Clave de idempotencia única por pago

**Hoy**: `MercadoPagoPaymentService.opciones` arma `X-Idempotency-Key` como `losciruelos-{operación}-{id del pago}`.

**Por qué cambiarlo**: el id de `Pago` es autoincremental de la base. Si se recrea la base (por ejemplo, con `docker compose down -v` en desarrollo, o al restaurar un backup), los ids vuelven a empezar y se repiten claves que Mercado Pago ya recibió. Ante una clave repetida, Mercado Pago **devuelve la respuesta guardada de la operación anterior**: un cobro nuevo podría figurar como aprobado o rechazado según lo que pasó con otro pago, y un reembolso podría no hacerse.

**Cambio**:
- Agregar a `Pago` una columna `clave_idempotencia` (`UUID`, `NOT NULL`, `UNIQUE`), generada al crear el pago y que no cambia.
- Usarla en las tres operaciones: `losciruelos-pref-{uuid}`, `losciruelos-cobro-{uuid}` y `losciruelos-reembolso-{uuid}`.
- En la migración, completar las filas existentes con `gen_random_uuid()`.

---

## 6. Fechas y horas: un solo formato, en hora de Argentina

**Hoy**: el backend ya fija la zona de Buenos Aires al arrancar (`TimeZone.setDefault` en `PadelClubApiApplication`) y Hibernate usa `jdbc.time_zone=America/Argentina/Buenos_Aires`, así que los cálculos están en hora argentina. Lo que no es uniforme es **lo que se envía**:

| Tipo | Cómo sale hoy | Problema |
|---|---|---|
| `LocalDateTime` (`expiresAt`, `createdAt`, `paidAt`, `cancelableHasta`, `reembolsoTotalHasta`, `reembolsoSeniaHasta`, `categoriaActualizadaAt`, `devueltaAt`) | `2026-10-15T21:05:34.4050946` | Sin zona: el navegador la interpreta en **su** hora local. Con el dispositivo en otra zona, la cuenta regresiva y los "podés cancelar hasta…" quedan corridos. Además, 7 decimales que Safari no interpreta |
| `LocalTime` (`horaInicio`, `horaFin`, `horarioApertura`, `horarioCierre`, `horarioMinimoInicio`, turnos) | `08:00:00` | Segundos que no se usan |
| `timestamp` de los errores (`Instant`) | `2026-10-17T01:59:30.157021600Z` | En UTC: un error de las 22:59 de Argentina sale con fecha del día siguiente |

### Formato único

| Tipo | Formato | Ejemplo |
|---|---|---|
| Fecha | `yyyy-MM-dd` | `2026-10-27` |
| Hora | `HH:mm` | `08:00` |
| Fecha y hora (todas, incluido el `timestamp` de los errores) | `yyyy-MM-dd'T'HH:mm:ss.SSSXXX`, con offset de Buenos Aires | `2026-10-15T21:05:34.405-03:00` |

- **Siempre con el offset de Argentina (`-03:00`), nunca en UTC ni sin zona.** Así el valor es inequívoco: cualquier navegador lo convierte bien y una persona lo lee en hora argentina.
- **Milisegundos (3 decimales), no microsegundos ni nanosegundos.**
- **Entrada:** se siguen aceptando `HH:mm` en `horaInicio` / `horaFin` y `yyyy-MM-dd` en las fechas de los requests y query params (`fecha`, `desde`, `hasta`), como hoy.

### Implementación sugerida
- **Configuración** (`application.properties`):
  ```properties
  spring.jackson.time-zone=America/Argentina/Buenos_Aires
  spring.jackson.serialization.write-dates-as-timestamps=false
  ```
- **Zona compartida:** una constante `ZONA = ZoneId.of("America/Argentina/Buenos_Aires")` en un solo lugar. Usarla en el `Clock` de `AppConfig` (`Clock.system(ZONA)` en lugar de `systemDefaultZone()`), así el backend no depende de que alguien llame a `TimeZone.setDefault`.
- **Serializadores** (un `Jackson2ObjectMapperBuilderCustomizer` o un `SimpleModule`):
  - `LocalDateTime` → `valor.atZone(ZONA).toOffsetDateTime()` con el patrón `yyyy-MM-dd'T'HH:mm:ss.SSSXXX`. Así no hay que cambiar el tipo de cada campo de las entidades.
  - `LocalTime` → `HH:mm`.
  - Como alternativa, cambiar los campos de los DTOs a `OffsetDateTime`, pero eso toca más código.
- **Errores:** `GlobalExceptionHandler` usa `OffsetDateTime.now(clock)` en lugar de `Instant.now()`.
- **Mercado Pago:** `expirationDateTo(reserva.getExpiresAt().atZone(ZONA)…)` también con la constante, en lugar de `ZoneId.systemDefault()`.
- **Token de verificación y refresh token:** pueden seguir en `Instant` internamente; no se envían al frontend.

### Impacto en el frontend
Ninguno que rompa: `utils/fechas.ts` (`parseFechaHora`, `horaCorta`, `timeToMin`) ya acepta los dos formatos. Con el offset, la cuenta regresiva queda exacta en cualquier zona horaria, y se puede quitar el recorte de decimales.

---

## Decisión registrada: `binary_mode` se mantiene

El cobro con tarjeta y la preferencia del botón de Mercado Pago usan `binaryMode(true)`: cada pago se aprueba o se rechaza en el momento. Se decidió **mantenerlo**, porque una reserva es sensible al tiempo:
- **Sin binary mode**, un pago puede quedar en revisión (`pending_contingency`, `pending_review_manual`) hasta 2 días hábiles. Mientras tanto la reserva no vence y bloquea el turno, que incluso podría pasar sin resolverse. Y si después se aprueba con la reserva ya vencida o cancelada, termina en `A_REEMBOLSAR`.
- **Con binary mode**, Mercado Pago rechaza esos casos dudosos, que son una minoría, y el cliente puede reintentar en el acto con otra tarjeta o con su cuenta de Mercado Pago.

Si en el futuro se quisiera aprobar más pagos, una opción intermedia es quitar `binary_mode` solo cuando el turno es dentro de más de 48 h, y vencer la reserva si el pago sigue en revisión cuando falten, por ejemplo, 24 h.

---

## 7. Las canceladas y vencidas sin pago no se muestran tampoco al filtrar — `GET /reservas/mias`

**Hoy**: el backend oculta las `CANCELADA` y `EXPIRADA` que nunca movieron plata, **salvo** cuando se filtra con `estado=CANCELADA` o `estado=EXPIRADA`. En ese caso aparecen todas.

**Por qué cambiarlo**: para el cliente, una cancelada o vencida sin pago es un intento abandonado (no pagó, cambió de horario o dejó vencer los 15 minutos) y no le aporta nada. Las que sí le importan son las que tuvieron un pago, porque le dicen cuánto se le devolvió y cómo va el reembolso. Además, hoy el historial es inconsistente: "Todas" las oculta pero el filtro "Canceladas" las muestra.

**Cambio**:
- La regla de ocultar las descartadas se aplica **siempre**, también con el filtro `estado`. Solo `incluirDescartadas=true` las trae (para un futuro panel de admin o para soporte).
- `totalElementos` y `totalPaginas` también las excluyen, para que el paginado sea correcto.
- **"Tuvo un pago"** = al menos un pago en `APROBADO`, `DEVUELTO`, `REEMBOLSO_PENDIENTE`, `A_REEMBOLSAR` o `EN_PROCESO`. Los pagos `PENDIENTE` (iniciados sin cobrar), `RECHAZADO` o `EXPIRADO` no cuentan, porque no movieron plata.

**Frontend**: el filtro "Canceladas" ya pide `estado=CANCELADA,EXPIRADA` (se unieron Canceladas y Vencidas). Con este cambio va a mostrar solo las que tuvieron un pago.

---

## 8. Reembolsos: detectar las fallas al instante y devolverlas a mano — **pendiente**

**Hoy**: la seguridad de los reembolsos está bien resuelta. Lo que falla es la parte operativa: cuando Mercado Pago no acepta un reembolso, nadie del club se entera.

Lo que ya está bien:
- El cliente no elige cuánto se le devuelve: lo calcula `PoliticaCancelacion` en el servidor.
- Nunca se devuelve más de lo retenido de cada pago (`getMontoRetenido`).
- Se trabaja con la reserva bloqueada, y la segunda cancelación falla porque ya está `CANCELADA`.
- La clave de idempotencia es por pago: un reintento nunca devuelve dos veces.
- El webhook vuelve a consultar el pago a MP con nuestro token y no confía en lo que recibe.
- Un CLIENTE solo opera sus propias reservas.

**Problema real** (prueba del 18/10, pago #52): MP respondió `401 Unauthorized use of live credentials` y el pago quedó `REEMBOLSO_PENDIENTE`. Hoy pasa esto:
1. **Todo error que no sea 404 se trata como transitorio.** Un 401 o 403 (credencial revocada, sin permisos) no se arregla reintentando, pero igual se reintenta cada 2 minutos durante **24 h**.
2. **`A_REEMBOLSAR` solo se avisa con un `log.error`.** No hay endpoint para que el personal vea qué hay que devolver, ni para marcar que ya lo devolvió, ni ninguna alerta. Un reembolso así se puede perder.
3. **No se detectan las devoluciones parciales hechas fuera del sistema.** En una devolución parcial, MP deja el pago en `approved` con `transaction_amount_refunded > 0`. `aplicarResultado` solo mira `status`, así que una devolución parcial desde el panel de MP pasa sin que nadie lo note.

### A. Clasificar el error de MP al reembolsar (`MercadoPagoPaymentService.reembolsar`)
| Respuesta de MP | Tipo | Qué hacer |
|---|---|---|
| 5xx, timeout, error de red, 409, 423, 429 | Transitorio | `REEMBOLSO_PENDIENTE`, el job reintenta. El plazo se lleva a configuración (`app.reembolsos.plazo-reintento`, 24 h por defecto) |
| 400 por saldo insuficiente en la cuenta | Transitorio | Igual que arriba, pero **con alerta en el primer fallo** (ver C) |
| 401, 403, 404 y cualquier otro 4xx | Definitivo | `A_REEMBOLSAR` **en el acto** y alerta |

Guardar en el pago el último error, en una columna nueva `reembolso_error`: código HTTP, `cause[].code` y descripción de MP. Así el personal sabe por qué falló sin leer los logs.

### B. Bandeja de reembolsos para el personal
**`GET /pagos/reembolsos`** (ADMIN, EMPLEADO)
- Parámetros: `estado` (por defecto `A_REEMBOLSAR,REEMBOLSO_PENDIENTE`), `pagina` y `tamanio`.
- Respuesta paginada, igual que `/reservas/mias`, con un ítem por pago:
```json
{
  "pagoId": 52, "reservaId": 43,
  "cliente": { "nombre": "User Prueba", "email": "…", "telefono": "…" },
  "turno": "2026-10-19T09:00:00.000-03:00", "canchaNumero": 1,
  "estado": "A_REEMBOLSAR", "provider": "MERCADO_PAGO", "externalPaymentId": "183876031625",
  "montoPagado": 7500.00, "montoADevolver": 7500.00,
  "pendienteDesde": "2026-10-18T20:56:00.000-03:00",
  "error": "401 · Unauthorized use of live credentials"
}
```

**`GET /pagos/reembolsos/resumen`** (ADMIN, EMPLEADO) → `{ "cantidad": 3, "monto": 22500.00 }`. Lo usa el navbar para mostrar un contador.

**`POST /pagos/{id}/reembolso-manual`** (ADMIN, EMPLEADO). Registra que el club ya devolvió la plata.
- Body: `{ "medio": "PANEL_MERCADO_PAGO" | "EFECTIVO" | "TRANSFERENCIA", "comprobante": "opcional", "nota": "opcional" }`.
- Solo acepta pagos en `A_REEMBOLSAR` o `REEMBOLSO_PENDIENTE`, con la reserva bloqueada.
- Con `PANEL_MERCADO_PAGO`, **antes de aceptar consulta el pago en MP**:
  - Si `transaction_amount_refunded` coincide con el monto a devolver → `DEVUELTO`.
  - Si es 0 o distinto → `409` con *"Mercado Pago todavía no registra la devolución de $X"*. Así no se puede marcar como devuelto algo que no se devolvió.
- Guarda quién, cuándo, el medio y el comprobante (columnas nuevas `reembolsado_por`, `reembolsado_at`, `medio_reembolso`, `comprobante_reembolso`) y escribe un `log.info` de auditoría.
- Errores: `404` si el pago no existe; `409` si el pago no está en uno de esos estados, o si MP no coincide.

### C. Alertas
- Un email a `ADMIN_EMAIL` cuando un pago pasa a `A_REEMBOLSAR` (el mail ya está configurado), con reserva, cliente, monto, motivo y link a la bandeja.
- Un email por día con los pagos en `A_REEMBOLSAR` sin resolver hace más de 24 h, hasta que se marquen como devueltos.
- El envío no puede romper la transacción: hacerlo después del commit (`@TransactionalEventListener(phase = AFTER_COMMIT)`).

### D. Ajustes de robustez
- **Devoluciones parciales externas**: en `aplicarResultado`, si MP informa `montoDevuelto > 0` y el pago está `APROBADO` sin reembolso registrado, escribir un `log.error` y mandar la alerta de C para que alguien lo revise. Esto cubre una devolución parcial desde el panel de MP y también el caso de que MP devuelva pero falle el commit de la cancelación.
- **Firma del webhook**: con `MP_WEBHOOK_SECRET` configurado, rechazar con 401 las notificaciones `type=payment` **sin** `x-signature`. Hoy, si falta el header, no se valida. No permite sacar plata, porque siempre se vuelve a consultar el pago, pero evita tráfico falso. Las IPN (`topic=payment`) no traen firma y pueden seguir aceptándose.
- **Producción**: configurar `MP_WEBHOOK_SECRET`. Hoy no está, y el backend lo avisa al arrancar.

### Nota sobre las pruebas
Con las credenciales `APP_USR-` de un vendedor de prueba, MP **no permite devoluciones por API** (devuelve 401, código 7). Por eso:
- Los reembolsos automáticos se prueban con credenciales `TEST-` (`npm run probar:pagos`).
- Los pagos hechos con cuenta de Mercado Pago se devuelven desde el panel del vendedor de prueba.
- Con este cambio, ese 401 pasaría a `A_REEMBOLSAR` en el acto y aparecería en la bandeja: sirve justamente para probar el circuito manual.

### Frontend (cuando esté el backend)
- Pantalla **Reembolsos** para ADMIN y EMPLEADO: la bandeja con un botón "Marcar como devuelto", que abre un modal para elegir el medio y cargar el comprobante, y el contador en el navbar.
- El cliente ya ve "Reembolso en proceso" (`REEMBOLSO_PENDIENTE`) y "A devolver por el club" (`A_REEMBOLSAR`).

---

## 9. El celular se edita en un solo lugar — `PUT /perfil` y teléfonos viejos — **implementado**

> **Estado (23/10/2026):** está en la rama `feature/whatsapp-factory` del backend (sin commitear al revisarlo). `telefono` es opcional en `PerfilRequest`. La migración Java `V13__NormalizarTelefonos` normaliza los teléfonos viejos sin tocar la verificación; si al normalizarlo coincide con el celular verificado de otra cuenta activa, lo deja sin verificar. `cambiarTelefono` compara contra el número normalizado, así el mismo número escrito de otra forma no pierde la verificación. El frontend ya no manda el teléfono en `PUT /perfil`.
>
> Cambios relacionados del mismo trabajo, que el frontend ya contempla:
> - Un celular verificado pertenece a una sola cuenta activa (`400 errors.telefono` o `409`).
> - Topes del código: 1 por minuto y 5 cada 24 h por usuario, 5 cada 24 h por número (`429` con el tiempo que falta). El botón "Reenviar" espera 60 s.

**Frontend:** el celular se carga y cambia solo en Perfil → "Celular y avisos", con `PUT /perfil/notificaciones` (`{ canal: <el actual>, telefono }`). La tab Datos ya no tiene el campo.

**Problema 1: `PUT /perfil` exige el teléfono** (`@NotBlank` en `PerfilRequest.telefono`). Hoy el frontend manda el guardado sin cambios, pero quien todavía no tiene celular (el ADMIN creado por `DataInitializer`, los que entran con Google) **no puede guardar nombre, categoría ni posición** hasta cargarlo. El frontend deshabilita "Guardar cambios" y avisa.

**Cambio:**
- `telefono` opcional en `PerfilRequest`: si no viene (o viene `null`), no se toca. Si viene, se valida y normaliza como hoy.
- El frontend va a dejar de mandarlo en `PUT /perfil`.
- Sigue siendo parte del perfil completo: lo exige `perfilCompleto`, no el `PUT`.

**Problema 2: teléfonos guardados antes de V8 sin normalizar** (en la base de desarrollo, los 3 clientes; por ejemplo `1122334455`).
- Un código de WhatsApp a ese número falla en Meta.
- Mientras el frontend siga mandando el teléfono en `PUT /perfil`, guardar el nombre lo normaliza (`5491122334455`) y, como "cambió", **lo marca sin verificar**.

**Cambio:** una migración de datos (por ejemplo, una migración Java de Flyway o una tarea al arrancar) que pase todos los `usuarios.telefono` por `Telefonos.normalizar`, sin tocar `telefono_verificado`. Los que no sean válidos quedan en `null` y sin verificar.

---

---

## 10. Panel del club: lo que falta en el backend — **A, B y E implementados**; C, D y F pendientes

> **Estado (23/10/2026):** el backend agregó `GET /admin/reservas` (A, con `pendientes`, `orden` y `totales`), `GET /admin/clientes` (B) y `GET /admin/resumen` (E; el EMPLEADO solo puede ver el día de hoy). El frontend los usa en Reservas, Nueva reserva (ahora también para el EMPLEADO) y Resumen. "Saldos pendientes" pasó a ser el filtro "Por cobrar" de Reservas.

El frontend tiene el panel del personal en `/admin` (sidebar con secciones). Con los endpoints actuales funcionan Resumen, Nueva reserva (solo ADMIN), Saldos pendientes, Devolución de paletas, Usuarios, Productos y stock, Avisos y Mi cuenta. Para completarlo falta, en orden de prioridad:

### A. Agenda de reservas — `GET /admin/reservas` (ADMIN, EMPLEADO)
Hoy el personal no puede ver las reservas del día ni buscar una reserva: solo existen `/reservas/mias` (las propias), `saldos-pendientes` y `devoluciones-pendientes`. Sin esto tampoco puede **cancelar** una reserva con `?reembolso=TOTAL|SENIA|NADA`, porque no tiene cómo encontrarla.
- Parámetros: `fecha` o `desde`/`hasta`, `canchaId`, `estado` (lista separada por coma), `cliente` (nombre, apellido o email, contiene), `page`, `size`.
- Respuesta paginada con el mismo formato de `/reservas/mias` (`PaginaResponse<ReservaResponse>`), ordenada por fecha y hora de inicio.
- Por defecto incluye todas, también las canceladas y vencidas (el personal necesita verlas).

### B. Buscar clientes siendo EMPLEADO
`POST /reservas` con `clienteId` ya acepta EMPLEADO, pero `GET /admin/usuarios` es solo ADMIN, así que el empleado no puede elegir el cliente. Opciones:
- permitir a EMPLEADO `GET /admin/usuarios` solo con `rol=CLIENTE`; o
- un endpoint liviano `GET /clientes?buscar=…` (ADMIN, EMPLEADO) que devuelva id, nombre, apellido, email, celular y si tiene el perfil completo.

Con cualquiera de las dos, "Nueva reserva" se habilita para EMPLEADO.

### C. Configuración del club — `GET/PUT /admin/configuracion` (ADMIN)
Horarios por día, duración mínima y máxima del turno, precio (`montoReserva`, `montoXMediaHora`), porcentaje de seña y política de cancelación (`minutosReembolsoTotal`, `minutosReembolsoSenia`). Hoy solo se cambian en la base.

### D. Canchas — `POST/PUT /admin/canchas`, baja lógica (ADMIN)
Alta, edición de la descripción y deshabilitar una cancha (por mantenimiento), sin borrar sus reservas.

### E. Resumen de un período — `GET /admin/resumen?desde=yyyy-MM-dd&hasta=yyyy-MM-dd` (ADMIN, EMPLEADO) — **el frontend ya lo usa**
La pantalla Resumen del panel elige un día, un mes o un rango (el EMPLEADO solo hoy; con otro período el backend responde `403`). Rediseñado (backend `2fbdfdd`) para no mezclar turnos futuros con deuda:
```json
{
  "desde": "2026-10-01", "hasta": "2026-10-31",
  "jugados":  { "turnos": 28, "montoTotal": 420000.00, "montoCobrado": 400000.00, "montoBonificado": 5000.00, "deuda": 15000.00 },
  "porJugar": { "turnos": 4, "montoTotal": 60000.00, "cobradoAnticipado": 20000.00, "montoBonificado": 0.00, "aCobrar": 40000.00 },
  "caja": { "total": 410000.00, "efectivo": 150000.00, "mercadoPagoOnline": 220000.00, "mercadoPagoPresencial": 40000.00, "devoluciones": 7500.00, "neto": 402500.00 },
  "cancelaciones": { "turnos": 3, "retenido": 7500.00 },
  "productos": [
    { "productoId": 1, "nombre": "Pelotas", "tipo": "VENTA", "cantidad": 40, "monto": 200000.00 }
  ]
}
```
- `jugados` y `porJugar`: reservas cuyo **turno** (`fechaReserva`) cae en el período (`SEÑADA`, `PARCIALMENTE_PAGADA`, `PAGADA`, `COMPLETADA`), separadas según si el turno ya terminó. La `deuda` es solo de los jugados; `aCobrar` es el saldo normal de los turnos que todavía no se jugaron.
- `caja`: cobros y devoluciones por **fecha de pago** (cierre de caja), sea cual sea la fecha del turno. Las bonificaciones no entran. Lo que queda `A_REEMBOLSAR` (a devolver a mano) no se descuenta. Para pagos anteriores a V16 la fecha de devolución es aproximada.
- `cancelaciones`: reservas `CANCELADA` con turno en el período (las `EXPIRADA` no cuentan) y lo pagado que el club no devolvió.
- `productos`: unidades y monto por producto de los turnos no cancelados, con el precio congelado. Solo los que tienen cantidad > 0.
- Errores: `400` si falta una fecha o `desde` > `hasta`; `403` para el EMPLEADO fuera de hoy.

### F. Bandeja de reembolsos (sección 8)
`GET /pagos/reembolsos` y `POST /pagos/{id}/reembolso-manual`, ya especificados en la sección 8.
