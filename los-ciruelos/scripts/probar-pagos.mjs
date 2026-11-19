#!/usr/bin/env node
/*
 * Prueba automática de pagos con tarjeta contra el backend real y Mercado Pago (sandbox).
 *
 * Hace lo mismo que la pantalla de pago:
 *   1. login → POST /reservas (un turno libre) → POST /pagos/:id/iniciar
 *   2. pide un token de tarjeta a Mercado Pago (lo que hace el Card Payment Brick)
 *   3. POST /pagos/:id/pago con ese token → compara estado y motivo con lo esperado
 *   4. limpia: cancela la reserva (si el pago se aprobó, prueba también el reembolso)
 *
 * Uso (desde los-ciruelos/):
 *   npm run probar:pagos                         APRO con todas las tarjetas + el resto con Mastercard
 *   npm run probar:pagos -- --todas              todos los titulares con todas las tarjetas
 *   npm run probar:pagos -- --escenarios=APRO,FUND --tarjetas=visa,amex
 *   npm run probar:pagos -- --total              paga el total en lugar de la seña
 *   npm run probar:pagos -- --sin-limpiar        deja las reservas creadas (para verlas en la web)
 *
 * Limpieza: al final se cancelan las reservas. Las de pagos aprobados prueban el reembolso,
 * que Mercado Pago recién acepta unos minutos después de aprobar: se reintenta cada 20 s.
 * Si igual falla y hay credenciales de administrador
 * (PRUEBA_ADMIN_EMAIL / PRUEBA_ADMIN_PASSWORD), la reserva se cancela como admin con
 * ?reembolso=NADA para que no quede ocupando el turno (el fallo del reembolso se informa igual).
 *
 * Usuario: PRUEBA_EMAIL / PRUEBA_PASSWORD (o --email= / --password=). Por defecto, el
 * cliente de prueba del backend (APP_SEED_USUARIO_PRUEBA=true). Tiene que ser CLIENTE con
 * el perfil completo. Requiere credenciales TEST- de Mercado Pago en backend y frontend.
 * Datos de tarjetas y titulares: scripts/tarjetas-prueba.json.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const datos = JSON.parse(readFileSync(join(raiz, "scripts", "tarjetas-prueba.json"), "utf8"));

/* ── Configuración ───────────────────────────────── */
function leerEnv() {
    try {
        return Object.fromEntries(readFileSync(join(raiz, ".env"), "utf8")
            .split(/\r?\n/)
            .filter(l => l.trim() && !l.trim().startsWith("#") && l.includes("="))
            .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
    } catch {
        return {};
    }
}
const env = { ...leerEnv(), ...process.env };
const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
}));

const API = (env.VITE_API_URL ?? "").replace(/\/+$/, "");
const MP_KEY = env.VITE_MP_PUBLIC_KEY;
const EMAIL = args.email ?? env.PRUEBA_EMAIL ?? "user.prueba@losciruelos.com";
const PASSWORD = args.password ?? env.PRUEBA_PASSWORD ?? "UserPassword123!";
const ADMIN_EMAIL = env.PRUEBA_ADMIN_EMAIL;
const ADMIN_PASSWORD = env.PRUEBA_ADMIN_PASSWORD;
const PAGAR_TOTAL = Boolean(args.total);
const LIMPIAR = !args["sin-limpiar"];
const MP = "https://api.mercadopago.com";

if (!API || !MP_KEY) {
    console.error("Faltan VITE_API_URL o VITE_MP_PUBLIC_KEY en .env");
    process.exit(2);
}
if (!MP_KEY.startsWith("TEST-")) {
    console.error("La public key no es de prueba (TEST-…): no se cobra con tarjetas reales desde un script.");
    process.exit(2);
}

/* ── Casos a probar ──────────────────────────────── */
const elegir = (lista, clave, filtro) =>
    filtro ? lista.filter(x => filtro.split(",").map(s => s.trim().toUpperCase()).includes(x[clave].toUpperCase())) : lista;
const tarjetas = elegir(datos.tarjetas, "id", args.tarjetas);
const escenarios = elegir(datos.escenarios, "titular", args.escenarios);

const casos = [];
for (const esc of escenarios) {
    // Por defecto: APRO con todas las tarjetas (verifica cada marca) y el resto con la primera
    const conTodas = args.todas || args.tarjetas || esc.titular === "APRO";
    for (const tarjeta of conTodas ? tarjetas : tarjetas.slice(0, 1)) casos.push({ esc, tarjeta });
}

/* ── HTTP ────────────────────────────────────────── */
let token = null;
async function http(metodo, url, body, headers = {}) {
    const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const texto = await res.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { json = texto; }
    return { status: res.status, json };
}
const api = (metodo, ruta, body) =>
    http(metodo, API + ruta, body, token ? { Authorization: `Bearer ${token}` } : {});
const error = r => (r.json && (r.json.error ?? JSON.stringify(r.json.errors ?? r.json))) || `HTTP ${r.status}`;

let tokenAdmin = null;
/** Cancelación de respaldo como admin, sin reembolso (solo para limpiar datos de prueba) */
async function cancelarComoAdmin(reservaId) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
    if (!tokenAdmin) {
        const l = await http("POST", `${API}/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        if (l.status !== 200) return { status: l.status, json: { error: `login admin: ${error(l)}` } };
        tokenAdmin = l.json.accessToken;
    }
    return http("DELETE", `${API}/reservas/${reservaId}/cancelar?reembolso=NADA`, undefined,
        { Authorization: `Bearer ${tokenAdmin}` });
}

/* ── Mercado Pago: lo que hace el Brick ──────────── */
async function medioDePago(numero) {
    const r = await http("GET", `${MP}/v1/payment_methods/search?public_key=${MP_KEY}&bins=${numero.slice(0, 8)}&marketplace=NONE`);
    const pm = r.json?.results?.[0];
    if (!pm) throw new Error(`Mercado Pago no reconoce la tarjeta ${numero.slice(0, 6)}…`);
    return { paymentMethodId: pm.id, issuerId: pm.issuer?.id ? String(pm.issuer.id) : undefined };
}

async function tokenDeTarjeta(tarjeta, esc) {
    const [mes, anio] = tarjeta.vencimiento.split("/");
    const r = await http("POST", `${MP}/v1/card_tokens?public_key=${MP_KEY}`, {
        card_number: tarjeta.numero,
        expiration_month: Number(mes),
        expiration_year: 2000 + Number(anio),
        security_code: tarjeta.cvv,
        cardholder: { name: esc.titular, identification: { type: "DNI", number: esc.dni } },
    });
    if (!r.json?.id) throw new Error(`No se pudo tokenizar la tarjeta: ${error(r)}`);
    return r.json.id;
}

/* ── Backend ─────────────────────────────────────── */
const fechaISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function turnoLibre(canchas, offsetCaso) {
    // Turnos lejanos (desde dentro de 10 días): no molestan y se cancelan con reembolso total
    for (let dia = 10; dia < 60; dia++) {
        const fecha = fechaISO(new Date(Date.now() + dia * 86400000));
        for (let i = 0; i < canchas.length; i++) {
            const cancha = canchas[(i + offsetCaso) % canchas.length];
            const r = await api("GET", `/canchas/${cancha.id}/disponibilidad?fecha=${fecha}`);
            const turno = r.json?.turnosDisponibles?.[0];
            if (r.status === 200 && turno) {
                return { cancha, fecha, horaInicio: turno.horaInicio.slice(0, 5), horaFin: turno.horaFin.slice(0, 5) };
            }
        }
    }
    throw new Error("No se encontró ningún turno libre en los próximos 60 días");
}

async function probar({ esc, tarjeta }, canchas, n) {
    const fila = { titular: esc.titular, tarjeta: tarjeta.nombre, estado: "-", detalle: "-", reserva: "-", resultado: "", limpieza: "-" };
    let reservaId = null;
    try {
        const t = await turnoLibre(canchas, n);
        const r = await api("POST", "/reservas", {
            canchaId: t.cancha.id, fechaReserva: t.fecha, horaInicio: t.horaInicio, horaFin: t.horaFin,
            cantidadPelotas: 0, cantidadPaletas: 0,
        });
        if (r.status !== 201) throw new Error(`Crear reserva: ${error(r)}`);
        reservaId = r.json.id;
        fila.turno = `#${reservaId} C${t.cancha.numero} ${t.fecha} ${t.horaInicio}`;

        const ini = await api("POST", `/pagos/${reservaId}/iniciar?pagarTotal=${PAGAR_TOTAL}`);
        if (ini.status !== 200) throw new Error(`Iniciar pago: ${error(ini)}`);

        const { paymentMethodId, issuerId } = await medioDePago(tarjeta.numero);
        const tokenTarjeta = await tokenDeTarjeta(tarjeta, esc);

        const pago = await api("POST", `/pagos/${reservaId}/pago`, {
            token: tokenTarjeta,
            payment_method_id: paymentMethodId,
            issuer_id: issuerId,
            installments: 1,
            transaction_amount: ini.json.monto, // el backend lo ignora y cobra el monto del pago iniciado
            payer: { email: EMAIL, identification: { type: "DNI", number: esc.dni } },
        });
        if (pago.status !== 200) throw new Error(`Pagar: ${error(pago)}`);

        fila.estado = pago.json.estado;
        fila.detalle = pago.json.detalle ?? "-";
        fila.reserva = pago.json.estadoReserva;
        const ok = pago.json.estado === esc.esperado.estado
            && (!esc.esperado.detalle || pago.json.detalle === esc.esperado.detalle);
        fila.resultado = ok ? "OK" : `FALLA (esperado ${esc.esperado.estado}${esc.esperado.detalle ? ` / ${esc.esperado.detalle}` : ""})`;
    } catch (e) {
        fila.resultado = `ERROR: ${e.message}`;
    }

    fila.reservaId = reservaId;
    return fila;
}

/*
 * Limpieza. Mercado Pago no deja reembolsar un pago recién aprobado (la cancelación responde
 * 502 "no pudo hacer el reembolso"); unos minutos después funciona. Por eso las reservas con
 * pago aprobado se cancelan al final, reintentando cada 20 s hasta ~2 min.
 */
const ESPERA_REEMBOLSO_MS = 20000;
const INTENTOS_REEMBOLSO = 7;

async function cancelar(fila) {
    const c = await api("DELETE", `/reservas/${fila.reservaId}/cancelar`);
    if (c.status === 200) {
        const devuelto = (c.json.pagos ?? []).reduce((s, p) => s + Number(p.montoReembolsado ?? 0), 0);
        fila.limpieza = devuelto > 0 ? `cancelada, reembolso $${devuelto}` : "cancelada";
        return true;
    }
    fila.ultimoError = error(c);
    return false;
}

async function limpiar(filas) {
    const conReserva = filas.filter(f => f.reservaId);
    if (!LIMPIAR) {
        conReserva.forEach(f => { f.limpieza = "queda creada (--sin-limpiar)"; });
        return;
    }
    let pendientes = [];
    for (const f of conReserva) {
        if (!(await cancelar(f))) pendientes.push(f);
    }
    for (let intento = 1; pendientes.length && intento < INTENTOS_REEMBOLSO; intento++) {
        console.log(`  ${pendientes.length} reembolso(s) todavía no disponibles en Mercado Pago; reintento en ${ESPERA_REEMBOLSO_MS / 1000} s…`);
        await new Promise(r => setTimeout(r, ESPERA_REEMBOLSO_MS));
        const siguen = [];
        for (const f of pendientes) {
            if (await cancelar(f)) f.limpieza += ` (al intento ${intento + 1})`;
            else siguen.push(f);
        }
        pendientes = siguen;
    }
    for (const f of pendientes) {
        f.reembolsoFallido = true;
        f.limpieza = `reembolso FALLÓ: ${f.ultimoError}`;
        const admin = await cancelarComoAdmin(f.reservaId);
        f.limpieza += admin?.status === 200
            ? " → cancelada como admin sin reembolso"
            : admin ? ` → tampoco como admin: ${error(admin)}` : " → queda creada (sin credenciales de admin)";
    }
}

/* ── Main ────────────────────────────────────────── */
console.log(`Backend: ${API} · usuario: ${EMAIL} · pago: ${PAGAR_TOTAL ? "total" : "seña"} · ${casos.length} casos\n`);

const login = await http("POST", `${API}/auth/login`, { email: EMAIL, password: PASSWORD }).catch(e => ({ status: 0, json: { error: e.message } }));
if (login.status !== 200) {
    console.error(`No se pudo iniciar sesión: ${error(login)}`);
    process.exit(2);
}
token = login.json.accessToken;
if (login.json.rol !== "CLIENTE" || !login.json.perfilCompleto) {
    console.error("El usuario tiene que ser CLIENTE con el perfil completo.");
    process.exit(2);
}
const canchas = (await api("GET", "/canchas")).json ?? [];

const filas = [];
for (const [n, caso] of casos.entries()) {
    const fila = await probar(caso, canchas, n);
    filas.push(fila);
    const marca = fila.resultado === "OK" ? "✔" : "✘";
    console.log(`${marca} ${fila.titular.padEnd(5)} ${fila.tarjeta.padEnd(18)} ${String(fila.estado).padEnd(10)} ${String(fila.detalle).padEnd(38)} ${fila.resultado}`);
    if (caso.esc.nota && fila.resultado !== "OK") console.log(`    nota: ${caso.esc.nota}`);
}

console.log("\nLimpiando las reservas de prueba…");
await limpiar(filas);

console.log("\nDetalle:");
console.table(filas.map(f => ({
    Titular: f.titular, Tarjeta: f.tarjeta, Turno: f.turno ?? "-", Pago: f.estado, Motivo: f.detalle,
    Reserva: f.reserva, Resultado: f.resultado, Limpieza: f.limpieza,
})));

const fallas = filas.filter(f => f.resultado !== "OK").length;
const reembolsos = filas.filter(f => f.reembolsoFallido).length;
console.log(fallas ? `\n${fallas} de ${filas.length} pagos no dieron lo esperado.` : `\nLos ${filas.length} pagos dieron lo esperado.`);
if (reembolsos) {
    console.log(`${reembolsos} reembolsos fallaron al cancelar: revisá en el log del backend "Error de API de MP al reembolsar".`);
}
process.exit(fallas || reembolsos ? 1 : 0);
