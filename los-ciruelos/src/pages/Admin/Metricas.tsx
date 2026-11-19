import type { ReactNode } from "react";
import { MessageCircle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ClienteMetrica, Comparado, DiaSemanaIngles, MetricasClub } from "../../types/admin.types";
import { formatFecha, formatMonto } from "../../utils/fechas";
import { formatTelefono } from "../../utils/telefono";
import { AYUDA_DEUDA_TOTAL, AYUDA_INGRESOS_TOTAL, AYUDA_KPI, AYUDA_SECCION } from "./ayudasResumen";
import { Ayuda, Vacio } from "./comunes";

/*
 * Métricas del club para el ADMIN (GET /admin/metricas), repartidas en las pestañas del Resumen. Cada
 * cifra comparada muestra el cambio contra el período anterior de igual duración. Los gráficos son de
 * un solo color (verde de la marca, más intenso cuanto más alto el valor) y cada barra o celda dice su
 * valor: no hay series que distinguir por color.
 */

const numero = (n: number, decimales = 0) => n.toLocaleString("es-AR", { maximumFractionDigits: decimales, minimumFractionDigits: 0 });
const porciento = (n: number) => `${numero(n, 1)} %`;
const horas = (n: number) => `${numero(n, 1)} h`;

const DIAS: Record<DiaSemanaIngles, string> = {
    MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié", THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom",
};
const DIAS_LARGO: Record<DiaSemanaIngles, string> = {
    MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles", THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};
const FRANJAS = { MANIANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" } as const;
const DETALLE_FRANJA = { MANIANA: "Antes de las 12", TARDE: "De 12 a 18", NOCHE: "Desde las 18" } as const;

/* ─── Piezas ─────────────────────────────────────── */

/** El cambio contra el período anterior: flecha, % y el valor de antes. Verde si mejora, rojo si empeora. */
function Variacion({ c, formato, menosEsMejor = false }: { c: Comparado; formato: (n: number) => string; menosEsMejor?: boolean }) {
    if (c.variacion === null) {
        return <span className="metrica-var metrica-var--neutra">Sin datos del período anterior</span>;
    }
    const sube = c.variacion > 0, baja = c.variacion < 0;
    const bien = (sube && !menosEsMejor) || (baja && menosEsMejor);
    const tono = !sube && !baja ? "neutra" : bien ? "bien" : "mal";
    const Icono = sube ? TrendingUp : baja ? TrendingDown : Minus;
    return (
        <span className={`metrica-var metrica-var--${tono}`} title={`Período anterior: ${formato(c.anterior)}`}>
            <Icono size={13} aria-hidden="true" />
            {sube ? "+" : ""}{numero(c.variacion, 1)} %
            <span className="metrica-var__antes">vs. {formato(c.anterior)}</span>
        </span>
    );
}

interface ItemKpi {
    etiqueta: string;
    c?: Comparado;
    /** Un valor sin comparación (lo que es "a hoy", como la deuda) */
    valor?: ReactNode;
    formato?: (n: number) => string;
    menosEsMejor?: boolean;
    principal?: boolean;
    alerta?: boolean;
    detalle?: ReactNode;
    /** Qué representa (por defecto, el de su etiqueta en ayudasResumen) */
    ayuda?: string;
}

/** Tarjetas de cifras (las mismas del resumen), con la comparación debajo */
function Kpis({ items }: { items: ItemKpi[] }) {
    return (
        <div className="admin-kpis">
            {items.map(k => {
                const formato = k.formato ?? (n => numero(n));
                const ayuda = k.ayuda ?? AYUDA_KPI[k.etiqueta];
                return (
                    <div key={k.etiqueta} className={`admin-kpi${k.principal ? " admin-kpi--principal" : ""}${k.alerta ? " admin-kpi--alerta" : ""}`}>
                        {ayuda && <Ayuda>{ayuda}</Ayuda>}
                        <span className="admin-kpi__etiqueta">{k.etiqueta}</span>
                        <span className="admin-kpi__valor">{k.c ? formato(k.c.actual) : k.valor}</span>
                        {k.c && <Variacion c={k.c} formato={formato} menosEsMejor={k.menosEsMejor} />}
                        {k.detalle && <span className="admin-kpi__detalle">{k.detalle}</span>}
                    </div>
                );
            })}
        </div>
    );
}

/** Una sección con título, su ayuda (i) y una explicación corta */
function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: ReactNode; children: ReactNode }) {
    const ayuda = AYUDA_SECCION[titulo];
    return (
        <section className="resumen-grupo">
            <div className="resumen-grupo__cabecera">
                <h2 className="resumen-grupo__titulo">{titulo}{ayuda && <Ayuda>{ayuda}</Ayuda>}</h2>
                {descripcion && <p className="resumen-grupo__desc">{descripcion}</p>}
            </div>
            {children}
        </section>
    );
}

interface FilaBarra {
    clave: string;
    etiqueta: ReactNode;
    valor: number;
    /** Lo que se lee al lado de la barra */
    texto: string;
    detalle?: string;
}

/** Barras horizontales de un color, cada una con su valor escrito (también sirve de tabla) */
function Barras({ filas, maximo, etiqueta }: { filas: FilaBarra[]; maximo?: number; etiqueta: string }) {
    const tope = maximo ?? Math.max(1, ...filas.map(f => f.valor));
    if (filas.length === 0) return <p className="resumen-nota">Sin datos en el período.</p>;
    return (
        <ul className="metrica-barras" aria-label={etiqueta}>
            {filas.map(f => (
                <li key={f.clave} className="metrica-barras__fila" title={`${typeof f.etiqueta === "string" ? f.etiqueta : ""} ${f.texto}${f.detalle ? ` · ${f.detalle}` : ""}`.trim()}>
                    <span className="metrica-barras__etiqueta">{f.etiqueta}</span>
                    <span className="metrica-barras__pista" aria-hidden="true">
                        <span className="metrica-barras__barra" style={{ width: `${Math.max(f.valor > 0 ? 2 : 0, (f.valor / tope) * 100)}%` }} />
                    </span>
                    <span className="metrica-barras__valor">
                        {f.texto}
                        {f.detalle && <small>{f.detalle}</small>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** Mapa de calor día × hora: cuanto más verde, más ocupado. Las horas en que no abre van rayadas. */
function MapaCalor({ mapa }: { mapa: MetricasClub["ocupacion"]["mapa"] }) {
    const horasMapa = mapa[0]?.franjas.map(f => f.hora) ?? [];
    if (horasMapa.length === 0) return <p className="resumen-nota">Sin horario cargado.</p>;
    return (
        <div className="metrica-mapa-contenedor">
            <table className="metrica-mapa">
                <caption className="sr-only">Ocupación por día de la semana y hora</caption>
                <thead>
                    <tr>
                        <th scope="col"><span className="sr-only">Día</span></th>
                        {horasMapa.map(h => <th key={h} scope="col">{h.slice(0, 2)}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {mapa.map(d => (
                        <tr key={d.dia}>
                            <th scope="row">{DIAS[d.dia]}</th>
                            {d.franjas.map(f => (
                                <td key={f.hora}
                                    className={f.porcentaje === null ? "metrica-mapa__cerrado" : undefined}
                                    style={f.porcentaje === null ? undefined : { "--intensidad": `${Math.round(8 + f.porcentaje * 0.82)}%` } as React.CSSProperties}
                                    title={`${DIAS_LARGO[d.dia]} a las ${f.hora}: ${f.porcentaje === null ? "el club está cerrado" : `${porciento(f.porcentaje)} de las canchas reservadas`}`}>
                                    {f.porcentaje === null
                                        ? <span className="sr-only">cerrado</span>
                                        : <span className="metrica-mapa__valor">{numero(f.porcentaje)}%</span>}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="metrica-mapa__leyenda" aria-hidden="true">
                <span>0 %</span>
                <span className="metrica-mapa__escala" />
                <span>100 %</span>
                <span className="metrica-mapa__muestra-cerrado" /> <span>Cerrado</span>
            </div>
        </div>
    );
}

/** Teléfono con link a WhatsApp (para contactar a un cliente) */
function Contacto({ telefono }: { telefono: string | null }) {
    if (!telefono) return <span className="admin-tabla__secundario">Sin celular</span>;
    return (
        <a className="metrica-contacto" href={`https://wa.me/${telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
            <MessageCircle size={13} aria-hidden="true" /> {formatTelefono(telefono)}
        </a>
    );
}

function TablaClientes({ clientes, orden }: { clientes: ClienteMetrica[]; orden: "reservas" | "gasto" }) {
    if (clientes.length === 0) return <p className="resumen-nota">Ningún cliente en el período.</p>;
    return (
        <div className="admin-tabla-contenedor">
            <table className="admin-tabla">
                <thead><tr><th>#</th><th>Cliente</th><th>Reservas</th><th>Gasto</th></tr></thead>
                <tbody>
                    {clientes.map((c, i) => (
                        <tr key={c.clienteId}>
                            <td data-label="#" className="admin-tabla__num">{i + 1}</td>
                            <td className="admin-tabla__titulo-celda"><span className="admin-tabla__principal">{c.nombre}</span></td>
                            <td data-label="Reservas" className="admin-tabla__num">{orden === "reservas" ? <strong>{c.reservas}</strong> : c.reservas}</td>
                            <td data-label="Gasto" className="admin-tabla__num">{orden === "gasto" ? <strong>{formatMonto(c.gasto)}</strong> : formatMonto(c.gasto)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ─── Pestañas ───────────────────────────────────── */

/** General: lo esencial para saber cómo va el club y lo que viene */
export function MetricasGeneral({ m }: { m: MetricasClub }) {
    return (
        <>
            <Seccion titulo="Cómo va el club" descripcion={<>Comparado con el período anterior ({formatFecha(m.anterior.desde)} al {formatFecha(m.anterior.hasta)}).</>}>
                <Kpis items={[
                    { etiqueta: "Ingresos", c: m.ingresos.total, formato: formatMonto, principal: true, detalle: "Cancha, productos y ventas" },
                    { etiqueta: "Ocupación", c: m.ocupacion.porcentaje, formato: porciento, detalle: `${horas(m.ocupacion.horasOcupadas.actual)} de ${horas(m.ocupacion.horasAbiertas.actual)}` },
                    { etiqueta: "Clientes activos", c: m.clientes.activos, detalle: `${numero(m.clientes.nuevos.actual)} nuevos` },
                    { etiqueta: "Cancelaciones", c: m.cancelaciones.tasa, formato: porciento, menosEsMejor: true, detalle: `${numero(m.cancelaciones.canceladas.actual)} canceladas` },
                ]} />
            </Seccion>
            <Seccion titulo="Lo que viene" descripcion="Turnos confirmados que todavía no empezaron (a hoy, no depende del período).">
                <Kpis items={[
                    { etiqueta: "Asegurado", valor: formatMonto(m.futuro.asegurado), principal: true, detalle: "Ya cobrado de turnos futuros" },
                    {
                        etiqueta: "Por cobrar", valor: formatMonto(m.futuro.porCobrar),
                        detalle: `${m.futuro.turnos} ${m.futuro.turnos === 1 ? "turno" : "turnos"} en los próximos ${m.futuro.dias} días`,
                        ayuda: `Lo que falta cobrar de los turnos ya reservados de hoy hasta donde se puede reservar (${m.futuro.dias} días, según la anticipación de la Configuración).`,
                    },
                    { etiqueta: "Deuda de turnos jugados", valor: formatMonto(m.deuda.total), alerta: m.deuda.total > 0, detalle: `${m.deuda.deudores.length} ${m.deuda.deudores.length === 1 ? "cliente" : "clientes"}` },
                ]} />
            </Seccion>
        </>
    );
}

/** Ocupación: horas pico y muertas, por cancha y por franja (para decidir precios y promociones) */
export function MetricasOcupacion({ m }: { m: MetricasClub }) {
    const o = m.ocupacion;
    return (
        <>
            <Seccion titulo="Ocupación" descripcion={<>Qué tanto se usaron las canchas en el <strong>período elegido arriba a la derecha</strong> (un día, un mes o un rango): todo lo de esta pestaña es de ese período, salvo «Próximos 7 días», que siempre mira la semana que viene desde hoy.</>}>
                <Kpis items={[
                    { etiqueta: "Ocupación", c: o.porcentaje, formato: porciento, principal: true },
                    { etiqueta: "Horas ocupadas", c: o.horasOcupadas, formato: horas },
                    { etiqueta: "Horas abiertas", c: o.horasAbiertas, formato: horas },
                ]} />
            </Seccion>
            <Seccion titulo="Día y hora" descripcion="Cada celda dice qué parte de las canchas estuvo reservada ese día de la semana a esa hora, juntando todas las semanas del período. Cuanto más verde, más se pide ese horario.">
                <MapaCalor mapa={o.mapa} />
            </Seccion>
            <Seccion titulo="Por franja" descripcion="La ocupación y lo que deja cada hora ocupada de cancha: una franja con poca ocupación es candidata a una promoción; una llena, a un precio más alto.">
                <div className="admin-kpis">
                    {o.porFranja.map(f => (
                        <div key={f.franja} className="admin-kpi">
                            <span className="admin-kpi__etiqueta">{FRANJAS[f.franja]} · {DETALLE_FRANJA[f.franja]}</span>
                            <span className="admin-kpi__valor">{porciento(f.porcentaje)}</span>
                            <span className="admin-kpi__detalle">{horas(f.horasOcupadas)} · {formatMonto(f.ingresoPorHora)} por hora</span>
                        </div>
                    ))}
                </div>
            </Seccion>
            <div className="metrica-dos">
                <Seccion titulo="Por cancha" descripcion="Ocupación y lo facturado de cancha.">
                    <Barras etiqueta="Ocupación por cancha" maximo={100} filas={o.porCancha.map(c => ({
                        clave: String(c.canchaId), etiqueta: `Cancha ${c.numero}`, valor: c.porcentaje,
                        texto: porciento(c.porcentaje), detalle: `${horas(c.horasOcupadas)} · ${formatMonto(c.ingresos)}`,
                    }))} />
                </Seccion>
                <Seccion titulo="Próximos 7 días" descripcion="Lo ya reservado (confirmadas y pendientes de pago vigentes).">
                    <Barras etiqueta="Ocupación de los próximos 7 días" maximo={100} filas={o.proximos7Dias.map(d => ({
                        clave: d.fecha, etiqueta: <span style={{ textTransform: "capitalize" }}>{formatFecha(d.fecha).split(" ").slice(0, 2).join(" ")}</span>,
                        valor: d.porcentaje, texto: porciento(d.porcentaje),
                        detalle: d.horasAbiertas > 0 ? `${horas(d.horasOcupadas)} de ${horas(d.horasAbiertas)}` : "Cerrado",
                    }))} />
                </Seccion>
            </div>
        </>
    );
}

/** Ingresos: de dónde viene la plata */
export function MetricasIngresos({ m }: { m: MetricasClub }) {
    const i = m.ingresos;
    const total = Math.max(1, i.cancha.actual + i.productosDeReservas.actual + i.ventasSueltas.actual);
    return (
        <>
            <Seccion titulo="Ingresos" descripcion="Lo facturado: la cancha y los productos de las reservas confirmadas, más las ventas sueltas (netas de devoluciones).">
                <Kpis items={[
                    { etiqueta: "Total", c: i.total, formato: formatMonto, principal: true, ayuda: AYUDA_INGRESOS_TOTAL },
                    { etiqueta: "Cancha", c: i.cancha, formato: formatMonto },
                    { etiqueta: "Productos en reservas", c: i.productosDeReservas, formato: formatMonto },
                    { etiqueta: "Ventas sueltas", c: i.ventasSueltas, formato: formatMonto },
                ]} />
            </Seccion>
            <div className="metrica-dos">
                <Seccion titulo="De dónde viene" descripcion="Parte de cada fuente en el total.">
                    <Barras etiqueta="Ingresos por fuente" maximo={100} filas={[
                        { clave: "cancha", etiqueta: "Cancha", valor: (i.cancha.actual / total) * 100, texto: porciento((i.cancha.actual / total) * 100), detalle: formatMonto(i.cancha.actual) },
                        { clave: "productos", etiqueta: "Productos en reservas", valor: (i.productosDeReservas.actual / total) * 100, texto: porciento((i.productosDeReservas.actual / total) * 100), detalle: formatMonto(i.productosDeReservas.actual) },
                        { clave: "ventas", etiqueta: "Ventas sueltas", valor: (i.ventasSueltas.actual / total) * 100, texto: porciento((i.ventasSueltas.actual / total) * 100), detalle: formatMonto(i.ventasSueltas.actual) },
                    ]} />
                </Seccion>
                <Seccion titulo="Cómo se cobró" descripcion="Lo cobrado de las reservas, sin bonificaciones.">
                    <Kpis items={[
                        { etiqueta: "Online", c: i.online, formato: formatMonto, detalle: "Mercado Pago desde la web" },
                        { etiqueta: "En el club", c: i.enElClub, formato: formatMonto, detalle: "Efectivo, QR, transferencia, Cuenta DNI" },
                    ]} />
                </Seccion>
            </div>
            <Seccion titulo="Rendimiento" descripcion="Cuánto deja cada reserva y cada hora de cancha ocupada.">
                <Kpis items={[
                    { etiqueta: "Ticket promedio", c: i.ticketPromedio, formato: formatMonto, detalle: "Cancha y productos por reserva" },
                    { etiqueta: "Por hora ocupada", c: i.porHoraOcupada, formato: formatMonto, detalle: "Solo cancha" },
                ]} />
            </Seccion>
        </>
    );
}

/** Clientes: quién juega, quién es nuevo y a quién hay que volver a llamar */
export function MetricasClientes({ m }: { m: MetricasClub }) {
    const c = m.clientes;
    return (
        <>
            <Seccion titulo="Clientes" descripcion="Activos: con al menos una reserva confirmada en el período. Nuevos: su primera reserva fue en este período.">
                <Kpis items={[
                    { etiqueta: "Activos", c: c.activos, principal: true },
                    { etiqueta: "Nuevos", c: c.nuevos },
                    { etiqueta: "Recurrentes", c: c.recurrentes },
                    { etiqueta: "Frecuencia", c: c.frecuencia, formato: n => `${numero(n, 1)} reservas`, detalle: "Por cliente activo" },
                ]} />
            </Seccion>
            <Seccion titulo="Dejaron de venir" descripcion="Tenían 3 o más reservas en los 90 días anteriores a los últimos 30, y ninguna en los últimos 30 (contado desde hoy). Vale la pena escribirles.">
                {c.dejaronDeVenir.length === 0 ? <p className="resumen-nota">Nadie dejó de venir.</p> : (
                    <div className="admin-tabla-contenedor">
                        <table className="admin-tabla">
                            <thead><tr><th>Cliente</th><th>Reservas antes</th><th>Última</th><th>Contacto</th></tr></thead>
                            <tbody>
                                {c.dejaronDeVenir.map(x => (
                                    <tr key={x.clienteId}>
                                        <td className="admin-tabla__titulo-celda"><span className="admin-tabla__principal">{x.nombre}</span></td>
                                        <td data-label="Reservas antes" className="admin-tabla__num">{x.reservasAntes}</td>
                                        <td data-label="Última" style={{ textTransform: "capitalize" }}>{formatFecha(x.ultimaReserva)}</td>
                                        <td data-label="Contacto"><Contacto telefono={x.telefono} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Seccion>
            <div className="metrica-dos">
                <Seccion titulo="Los que más juegan"><TablaClientes clientes={c.topPorReservas} orden="reservas" /></Seccion>
                <Seccion titulo="Los que más gastan"><TablaClientes clientes={c.topPorGasto} orden="gasto" /></Seccion>
            </div>
        </>
    );
}

/** Reservas: cómo y cuándo se reserva, y las cancelaciones */
export function MetricasReservas({ m }: { m: MetricasClub }) {
    const r = m.reservas, k = m.cancelaciones;
    const duracion = (min: number) => min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`;
    return (
        <>
            <Seccion titulo="Cómo se reserva" descripcion="Reservas creadas en el período (sin los partidos que genera solo un turno fijo).">
                <Kpis items={[
                    { etiqueta: "Creadas", c: r.creadas, principal: true },
                    { etiqueta: "Anticipación promedio", c: r.anticipacionPromedioHoras, formato: n => n >= 48 ? `${numero(n / 24, 1)} días` : horas(n) },
                    { etiqueta: "Desde la web", valor: numero(r.porOrigen.cliente), detalle: `${numero(r.porOrigen.personal)} las cargó el personal` },
                ]} />
            </Seccion>
            <div className="metrica-dos">
                <Seccion titulo="Con cuánta anticipación" descripcion="Días entre que se reserva y el turno.">
                    <Barras etiqueta="Anticipación" filas={[
                        { clave: "0", etiqueta: "El mismo día", valor: r.anticipacion.mismoDia, texto: numero(r.anticipacion.mismoDia) },
                        { clave: "1", etiqueta: "1 a 2 días", valor: r.anticipacion.unoADosDias, texto: numero(r.anticipacion.unoADosDias) },
                        { clave: "3", etiqueta: "3 a 7 días", valor: r.anticipacion.tresASieteDias, texto: numero(r.anticipacion.tresASieteDias) },
                        { clave: "8", etiqueta: "Más de 7 días", valor: r.anticipacion.masDeSieteDias, texto: numero(r.anticipacion.masDeSieteDias) },
                    ]} />
                </Seccion>
                <Seccion titulo="Duración y tipo" descripcion="De las confirmadas.">
                    <Barras etiqueta="Duraciones" filas={r.duraciones.map(d => ({ clave: String(d.minutos), etiqueta: duracion(d.minutos), valor: d.cantidad, texto: numero(d.cantidad) }))} />
                    <p className="resumen-nota">
                        {numero(r.porTipo.normales)} reservas · {numero(r.porTipo.partidos)} partidos sueltos · {numero(r.porTipo.turnosFijos)} de turnos fijos
                    </p>
                </Seccion>
            </div>
            <Seccion titulo="Cancelaciones" descripcion="De las reservas del período. Tasa: canceladas sobre canceladas más confirmadas.">
                <Kpis items={[
                    { etiqueta: "Tasa", c: k.tasa, formato: porciento, menosEsMejor: true, principal: true },
                    { etiqueta: "Canceladas", c: k.canceladas, menosEsMejor: true, detalle: `${k.porCliente} por el cliente · ${k.porClub} por el club${k.sinDato > 0 ? ` · ${k.sinDato} sin dato` : ""}` },
                    { etiqueta: "El club retuvo", c: k.retenido, formato: formatMonto, detalle: "Lo pagado que no se devolvió" },
                    { etiqueta: "Vencidas sin pagar", c: k.vencidasSinPagar, menosEsMejor: true },
                ]} />
                <Barras etiqueta="Con cuánta anticipación se cancela" filas={[
                    { clave: "a", etiqueta: "Menos de 2 h antes", valor: k.anticipacion.menosDe2Horas, texto: numero(k.anticipacion.menosDe2Horas) },
                    { clave: "b", etiqueta: "2 a 24 h antes", valor: k.anticipacion.de2a24Horas, texto: numero(k.anticipacion.de2a24Horas) },
                    { clave: "c", etiqueta: "1 a 3 días antes", valor: k.anticipacion.de1a3Dias, texto: numero(k.anticipacion.de1a3Dias) },
                    { clave: "d", etiqueta: "Más de 3 días antes", valor: k.anticipacion.masDe3Dias, texto: numero(k.anticipacion.masDe3Dias) },
                ]} />
            </Seccion>
        </>
    );
}

/** Deuda: turnos jugados que no se terminaron de pagar, a hoy */
export function MetricasDeuda({ m }: { m: MetricasClub }) {
    const d = m.deuda;
    return (
        <>
            <Seccion titulo="Deuda" descripcion="A hoy (no depende del período): turnos ya jugados que deben saldo, por antigüedad del turno. Se cobra desde Reservas, con el filtro &quot;Por cobrar&quot;.">
                <Kpis items={[
                    { etiqueta: "Total", valor: formatMonto(d.total), principal: d.total === 0, alerta: d.total > 0, ayuda: AYUDA_DEUDA_TOTAL },
                    { etiqueta: "Hasta 7 días", valor: formatMonto(d.hasta7Dias) },
                    { etiqueta: "8 a 30 días", valor: formatMonto(d.de8a30Dias) },
                    { etiqueta: "Más de 30 días", valor: formatMonto(d.masDe30Dias), alerta: d.masDe30Dias > 0 },
                ]} />
            </Seccion>
            <Seccion titulo="Quién debe" descripcion="De mayor a menor deuda.">
                {d.deudores.length === 0 ? <Vacio icono={<TrendingUp size={28} />}>Nadie debe nada.</Vacio> : (
                    <div className="admin-tabla-contenedor">
                        <table className="admin-tabla">
                            <thead><tr><th>Cliente</th><th>Debe</th><th>Turnos</th><th>El más viejo</th><th>Contacto</th></tr></thead>
                            <tbody>
                                {d.deudores.map(x => (
                                    <tr key={x.clienteId}>
                                        <td className="admin-tabla__titulo-celda"><span className="admin-tabla__principal">{x.nombre}</span></td>
                                        <td data-label="Debe" className="admin-tabla__num"><strong>{formatMonto(x.monto)}</strong></td>
                                        <td data-label="Turnos" className="admin-tabla__num">{x.reservas}</td>
                                        <td data-label="El más viejo" style={{ textTransform: "capitalize" }}>{formatFecha(x.masVieja)}</td>
                                        <td data-label="Contacto"><Contacto telefono={x.telefono} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Seccion>
        </>
    );
}

/** Productos: lo que más sale, lo que se pierde y lo que hay que reponer */
export function MetricasProductos({ m }: { m: MetricasClub }) {
    const p = m.productos;
    return (
        <>
            <div className="metrica-dos">
                <Seccion titulo="Más vendidos" descripcion="En reservas y ventas sueltas.">
                    <Barras etiqueta="Productos más vendidos" filas={p.masVendidos.map(x => ({ clave: String(x.productoId), etiqueta: x.nombre, valor: x.cantidad, texto: numero(x.cantidad), detalle: formatMonto(x.monto) }))} />
                </Seccion>
                <Seccion titulo="Alquilados" descripcion="En reservas.">
                    <Barras etiqueta="Productos alquilados" filas={p.alquilados.map(x => ({ clave: String(x.productoId), etiqueta: x.nombre, valor: x.cantidad, texto: numero(x.cantidad), detalle: formatMonto(x.monto) }))} />
                </Seccion>
            </div>
            <Seccion titulo="Alquileres que no volvieron" descripcion="Unidades con la devolución registrada que no volvieron (roturas o pérdidas), y turnos terminados donde no se registró la devolución.">
                <Kpis items={[
                    { etiqueta: "Unidades", valor: numero(p.noDevueltos.unidades), alerta: p.noDevueltos.unidades > 0, detalle: `En ${p.noDevueltos.reservas} ${p.noDevueltos.reservas === 1 ? "reserva" : "reservas"}` },
                    { etiqueta: "Se cobró de alquiler", valor: formatMonto(p.noDevueltos.montoAlquiler) },
                    { etiqueta: "Sin registrar la devolución", valor: numero(p.noDevueltos.sinRegistrar), alerta: p.noDevueltos.sinRegistrar > 0, detalle: "Turnos terminados" },
                ]} />
            </Seccion>
            <Seccion titulo="Stock bajo" descripcion="Productos de venta activos con 5 unidades o menos (a hoy).">
                {p.stockBajo.length === 0 ? <p className="resumen-nota">Ningún producto con stock bajo.</p> : (
                    <ul className="metrica-stock">
                        {p.stockBajo.map(x => (
                            <li key={x.productoId} className={x.stock === 0 ? "metrica-stock--sin" : undefined}>
                                {x.nombre} <strong>{x.stock === 0 ? "sin stock" : `${x.stock} u.`}</strong>
                            </li>
                        ))}
                    </ul>
                )}
            </Seccion>
        </>
    );
}
