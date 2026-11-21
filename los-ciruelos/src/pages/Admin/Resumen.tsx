import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Package } from "lucide-react";
import SelectorPeriodo, { type Periodo } from "../../components/ui/SelectorPeriodo/SelectorPeriodo";
import { adminService } from "../../services/adminService";
import type { MetricasClub, ResumenAdmin } from "../../types/admin.types";
import { MetricasClientes, MetricasDeuda, MetricasGeneral, MetricasIngresos, MetricasOcupacion, MetricasProductos, MetricasReservas } from "./Metricas";
import { useAuth } from "../../context/AuthContext";
import CajaJornada from "./CajaJornada";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatMonto, hoyISO } from "../../utils/fechas";
import { AYUDA_KPI, AYUDA_SECCION } from "./ayudasResumen";
import { Ayuda, BotonActualizar, Cargando, Encabezado, Mensaje, Pestanas, Vacio } from "./comunes";
import "./ReservasAdmin.css";
import "./Resumen.css";

interface Kpi {
    etiqueta: string;
    valor: ReactNode;
    detalle?: ReactNode;
    tono?: "principal" | "alerta" | "error";
}

/** Un grupo de cifras, con su título y qué cuenta (las tarjetas cambian según la pestaña) */
function Grupo({ titulo, descripcion, kpis }: { titulo?: string; descripcion?: ReactNode; kpis: Kpi[] }) {
    return (
        <section className="resumen-grupo">
            {(titulo || descripcion) && (
                <div className="resumen-grupo__cabecera">
                    {titulo && <h2 className="resumen-grupo__titulo">{titulo}{AYUDA_SECCION[titulo] && <Ayuda>{AYUDA_SECCION[titulo]}</Ayuda>}</h2>}
                    {descripcion && <p className="resumen-grupo__desc">{descripcion}</p>}
                </div>
            )}
            <div className="admin-kpis">
                {kpis.map(k => (
                    <div key={k.etiqueta} className={`admin-kpi${k.tono ? ` admin-kpi--${k.tono}` : ""}`}>
                        {AYUDA_KPI[k.etiqueta] && <Ayuda>{AYUDA_KPI[k.etiqueta]}</Ayuda>}
                        <span className="admin-kpi__etiqueta">{k.etiqueta}</span>
                        <span className="admin-kpi__valor">{k.valor}</span>
                        {k.detalle && <span className="admin-kpi__detalle">{k.detalle}</span>}
                    </div>
                ))}
            </div>
        </section>
    );
}

interface Resultado {
    clave: string;
    datos?: ResumenAdmin;
    error?: string;
}

type Pestana = "general" | "caja" | "ocupacion" | "ingresos" | "clientes" | "reservas" | "deuda" | "ventas";
const PESTANAS: { id: Pestana; etiqueta: string }[] = [
    { id: "general", etiqueta: "General" },
    { id: "caja", etiqueta: "Caja" },
    { id: "ocupacion", etiqueta: "Ocupación" },
    { id: "ingresos", etiqueta: "Ingresos" },
    { id: "clientes", etiqueta: "Clientes" },
    { id: "reservas", etiqueta: "Reservas" },
    { id: "deuda", etiqueta: "Deuda" },
    { id: "ventas", etiqueta: "Ventas y productos" },
];

const menos = (n: number) => n > 0 ? `− ${formatMonto(n)}` : formatMonto(0);

/**
 * Resumen del club para un día, un mes o un rango (GET /admin/reservas/resumen), en pestañas. Cada
 * pestaña tiene sus propias cifras y ninguna se repite en la misma pantalla:
 *  - General: lo esencial (saldo de caja, por cobrar, reservas y ventas).
 *  - Caja: lo que entró y salió por FECHA DE PAGO, por medio, y las devoluciones.
 *  - Reservas: turnos jugados, por jugar y cancelados (por fecha del TURNO).
 *  - Ventas y productos: las ventas sueltas y lo vendido o alquilado de cada producto.
 * Las métricas para decidir (GET /admin/metricas, comparadas con el período anterior) se suman en
 * General, Ocupación, Ingresos, Clientes, Reservas, Deuda y Ventas y productos (ver Metricas.tsx).
 */
function ResumenClub() {
    const soloHoy = false;
    const jornada = hoyISO();
    const [periodo, setPeriodo] = useState<Periodo>(() => ({ desde: hoyISO(), hasta: hoyISO() }));
    // Siempre hay un período (el selector no se puede vaciar). Con solo el inicio elegido, va hasta hoy;
    // con solo el fin, es ese día.
    const desde = soloHoy ? jornada : periodo.desde ?? periodo.hasta ?? hoyISO();
    const hasta = soloHoy ? jornada : periodo.hasta ?? (periodo.desde && periodo.desde < hoyISO() ? hoyISO() : periodo.desde) ?? hoyISO();
    const [version, setVersion] = useState(0);
    const clave = `${desde}|${hasta}|${version}`;
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [metricas, setMetricas] = useState<{ clave: string; datos?: MetricasClub; error?: string } | null>(null);

    useEffect(() => {
        let activo = true;
        adminService.metricas(desde, hasta)
            .then(datos => { if (activo) setMetricas({ clave, datos }); })
            .catch(e => { if (activo) setMetricas({ clave, error: primerError(extraerErrores(e, "No se pudieron cargar las métricas.")) }); });
        return () => { activo = false; };
    }, [clave, desde, hasta]);
    const metricasActuales = metricas?.clave === clave ? metricas : null;
    const m = metricasActuales?.datos ?? metricas?.datos;
    /** Lo de métricas de una pestaña: cargando, el error o las métricas */
    const conMetricas = (contenido: (m: MetricasClub) => ReactNode) =>
        metricasActuales?.error ? <Mensaje fijo tipo="error">{metricasActuales.error}</Mensaje> : m ? contenido(m) : <Cargando />;

    useEffect(() => {
        let activo = true;
        adminService.resumen(desde, hasta)
            .then(datos => { if (activo) setResultado({ clave, datos }); })
            .catch(e => {
                if (!activo) return;
                setResultado({ clave, error: primerError(extraerErrores(e, "No se pudo cargar el resumen.")) });
            });
        return () => { activo = false; };
    }, [clave, desde, hasta]);

    const actual = resultado?.clave === clave ? resultado : null;
    // Al actualizar se conservan los datos anteriores hasta que llegan los nuevos (sin parpadeo)
    const r = actual?.datos ?? resultado?.datos;
    const hoy = hoyISO();
    const esHoy = desde === hoy && hasta === hoy;
    const textoPeriodo = esHoy ? "hoy" : desde === hasta ? "ese día" : "el período";

    // Pestaña elegida (queda en la URL: ?tab=caja)
    const [searchParams, setSearchParams] = useSearchParams();
    const pestana = PESTANAS.find(p => p.id === searchParams.get("tab"))?.id ?? "general";
    const elegir = (id: Pestana) => setSearchParams(id === "general" ? {} : { tab: id }, { replace: true });

    return (
        <div className="admin-pagina">
            <Encabezado
                titulo="Resumen"
                descripcion={soloHoy
                    ? <>Caja, reservas y ventas de hoy, <span style={{ textTransform: "capitalize" }}>{formatFecha(hoy)}</span>.</>
                    : "Cómo va el club en el período elegido, comparado con el período anterior de igual duración."}
                acciones={<BotonActualizar onClick={() => setVersion(v => v + 1)} cargando={(resultado !== null && actual === null) || (metricas !== null && metricasActuales === null)} />}
            />

            <div className="ra-cabecera-vista">
                <Pestanas etiqueta="Qué ver del resumen" opciones={PESTANAS} valor={pestana} onChange={elegir} />
                {!soloHoy && <SelectorPeriodo valor={periodo} onChange={setPeriodo} obligatorio />}
            </div>

            {!actual && !r ? <Cargando /> : actual?.error ? (
                <Mensaje fijo tipo="error">{actual.error}</Mensaje>
            ) : r && (
                <>
                    {/* ── General: lo esencial ── */}
                    {pestana === "general" && (
                        <Grupo kpis={[
                            {
                                etiqueta: "Saldo de caja", valor: formatMonto(r.caja.neto), tono: r.caja.neto < 0 ? "error" : "principal",
                                detalle: `Lo que entró ${textoPeriodo}, menos las devoluciones`,
                            },
                            {
                                etiqueta: "Por cobrar", valor: formatMonto(r.jugados.deuda + r.porJugar.aCobrar), tono: r.jugados.deuda > 0 ? "alerta" : undefined,
                                detalle: r.jugados.deuda > 0 ? `${formatMonto(r.jugados.deuda)} de turnos ya jugados` : "Saldo de los turnos por jugar",
                            },
                            {
                                etiqueta: "Reservas", valor: r.jugados.turnos + r.porJugar.turnos,
                                detalle: `${r.jugados.turnos} jugadas · ${r.porJugar.turnos} por jugar${r.cancelaciones.turnos > 0 ? ` · ${r.cancelaciones.turnos} canceladas` : ""}`,
                            },
                            { etiqueta: "Ventas", valor: r.ventas.cantidad, detalle: `${formatMonto(r.ventas.total)} vendidos sin reserva` },
                        ]} />
                    )}
                    {pestana === "general" && conMetricas(m => <MetricasGeneral m={m} />)}
                    {pestana === "ocupacion" && conMetricas(m => <MetricasOcupacion m={m} />)}
                    {pestana === "ingresos" && conMetricas(m => <MetricasIngresos m={m} />)}
                    {pestana === "clientes" && conMetricas(m => <MetricasClientes m={m} />)}
                    {pestana === "deuda" && conMetricas(m => <MetricasDeuda m={m} />)}

                    {/* ── Caja: por fecha de pago ── */}
                    {pestana === "caja" && (
                        <>
                            <Grupo
                                descripcion={<>La plata que entró y salió {textoPeriodo}, por fecha de pago (sea cual sea la fecha del turno), con las ventas sueltas. Las bonificaciones no son plata y no entran.</>}
                                kpis={[
                                    {
                                        etiqueta: "Saldo de caja", valor: formatMonto(r.caja.neto), tono: r.caja.neto < 0 ? "error" : "principal",
                                        detalle: `Cobrado ${formatMonto(r.caja.total)} menos devoluciones`,
                                    },
                                    { etiqueta: "Efectivo", valor: formatMonto(r.caja.efectivo) },
                                    { etiqueta: "Mercado Pago", valor: formatMonto(r.caja.mercadoPago), detalle: "Online, QR, transferencia y tarjeta en su posnet" },
                                    { etiqueta: "Cuenta DNI", valor: formatMonto(r.caja.cuentaDni) },
                                    { etiqueta: "Tarjeta", valor: formatMonto(r.caja.tarjeta ?? 0), detalle: "Otro posnet (Clover…)" },
                                    {
                                        etiqueta: "Devoluciones", valor: menos(r.caja.devoluciones), tono: r.caja.devoluciones > 0 ? "error" : undefined,
                                        detalle: Number(r.ventas.devoluciones ?? 0) > 0
                                            ? `Reservas ${formatMonto(r.caja.devoluciones - r.ventas.devoluciones)} · ventas ${formatMonto(r.ventas.devoluciones)}`
                                            : undefined,
                                    },
                                ]}
                            />
                            <p className="resumen-nota">
                                Las devoluciones cuentan cuando se entregan: lo que queda para entregar no se descuenta hasta que se marca entregado.
                            </p>
                        </>
                    )}

                    {/* ── Reservas: por fecha del turno ── */}
                    {pestana === "reservas" && (
                        <>
                            <Grupo
                                titulo="Turnos jugados"
                                descripcion={<>Turnos de {textoPeriodo} que ya terminaron: lo que se tendría que haber cobrado y lo que quedó debiendo. La deuda se cobra desde Reservas, con el filtro "Por cobrar".</>}
                                kpis={[
                                    { etiqueta: "Deuda", valor: formatMonto(r.jugados.deuda), tono: r.jugados.deuda > 0 ? "alerta" : "principal" },
                                    { etiqueta: "Turnos", valor: r.jugados.turnos },
                                    { etiqueta: "Total", valor: formatMonto(r.jugados.montoTotal) },
                                    { etiqueta: "Cobrado", valor: formatMonto(r.jugados.montoCobrado) },
                                    ...(r.jugados.montoBonificado > 0 ? [{ etiqueta: "Bonificado", valor: formatMonto(r.jugados.montoBonificado) }] : []),
                                ]}
                            />
                            <Grupo
                                titulo="Turnos por jugar"
                                descripcion={<>Turnos de {textoPeriodo} que todavía no se jugaron: lo cobrado por adelantado y el saldo que se cobra el día del turno.</>}
                                kpis={[
                                    { etiqueta: "A cobrar el día del turno", valor: formatMonto(r.porJugar.aCobrar), tono: "principal" },
                                    { etiqueta: "Turnos", valor: r.porJugar.turnos },
                                    { etiqueta: "Total reservado", valor: formatMonto(r.porJugar.montoTotal) },
                                    { etiqueta: "Cobrado por adelantado", valor: formatMonto(r.porJugar.cobradoAnticipado) },
                                    ...(r.porJugar.montoBonificado > 0 ? [{ etiqueta: "Bonificado", valor: formatMonto(r.porJugar.montoBonificado) }] : []),
                                ]}
                            />
                            {conMetricas(m => <MetricasReservas m={m} />)}
                        </>
                    )}

                    {/* ── Ventas y productos ── */}
                    {pestana === "ventas" && (
                        <>
                            <Grupo
                                descripcion={<>Ventas sueltas de {textoPeriodo} (sin las anuladas). Lo devuelto se descuenta en la caja.</>}
                                kpis={[
                                    { etiqueta: "Ventas", valor: r.ventas.cantidad, tono: "principal" },
                                    { etiqueta: "Cobrado", valor: formatMonto(r.ventas.total) },
                                    ...(Number(r.ventas.devoluciones ?? 0) > 0
                                        ? [{ etiqueta: "Devuelto", valor: menos(r.ventas.devoluciones), tono: "error" as const }]
                                        : []),
                                ]}
                            />
                            <section className="admin-tarjeta">
                                <h2 className="admin-tarjeta__titulo">Productos</h2>
                                <p className="resumen-grupo__desc resumen-productos__desc">Lo vendido y alquilado de cada producto {textoPeriodo}, en las ventas sueltas y en las reservas.</p>
                                {r.productos.length === 0 ? (
                                    <Vacio icono={<Package size={28} />}>No se vendieron ni alquilaron productos {textoPeriodo}.</Vacio>
                                ) : (
                                    <div className="admin-tabla-contenedor resumen-productos">
                                        <table className="admin-tabla">
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th>Tipo</th>
                                                    <th>Cantidad</th>
                                                    <th>Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {r.productos.map(p => (
                                                    <tr key={`${p.productoId}-${p.tipo}`}>
                                                        <td className="admin-tabla__titulo-celda"><span className="admin-tabla__principal">{p.nombre}</span></td>
                                                        <td data-label="Tipo">{p.tipo === "VENTA" ? "Vendidas" : "Alquiladas"}</td>
                                                        <td data-label="Cantidad" className="admin-tabla__num"><strong>{p.cantidad}</strong></td>
                                                        <td data-label="Monto" className="admin-tabla__num">{formatMonto(p.monto)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="resumen-productos__total">
                                                    <td className="admin-tabla__titulo-celda"><span className="admin-tabla__principal">Total</span></td>
                                                    <td data-label="" />
                                                    <td data-label="Cantidad" className="admin-tabla__num"><strong>{r.productos.reduce((t, p) => t + p.cantidad, 0)}</strong></td>
                                                    <td data-label="Monto" className="admin-tabla__num"><strong>{formatMonto(r.productos.reduce((t, p) => t + Number(p.monto), 0))}</strong></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                            {conMetricas(m => <MetricasProductos m={m} />)}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Inicio del panel: el ADMIN ve el Resumen del club (métricas para decidir); el EMPLEADO, la caja de
 * su jornada (para contar la plata al cerrar). Las métricas del club no le sirven para su trabajo.
 */
export default function InicioPanel() {
    const { usuario } = useAuth();
    return usuario?.rol === "ADMIN" ? <ResumenClub /> : <CajaJornada />;
}
