import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Plus, QrCode, ShoppingBag, Trash2, X } from "lucide-react";
import CampoBusqueda from "../../components/ui/CampoBusqueda/CampoBusqueda";
import { useBusqueda } from "../../hooks/useBusqueda";
import CampoAutocompletar from "../../components/ui/CampoAutocompletar/CampoAutocompletar";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import SelectorPeriodo, { type Periodo } from "../../components/ui/SelectorPeriodo/SelectorPeriodo";
import { useAuth } from "../../context/AuthContext";
import { useJornada } from "../../hooks/useJornada";
import { COBRO_QR_HABILITADO } from "../../config/adminSecciones";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useMediosVenta } from "../../hooks/useMediosVenta";
import SelectorMedio from "./SelectorMedio";
import { adminService } from "../../services/adminService";
import type { ClienteBusqueda, EstadoVenta, FiltrosVentasApi, ListadoVentas, MedioVenta, ProductoAgregado, Venta } from "../../types/admin.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatFechaHora, formatHora, formatMonto, hoyISO } from "../../utils/fechas";
import BuscadorCliente from "./BuscadorCliente";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Vacio, VerificacionCuentaDni } from "./comunes";
import FormProducto from "./FormProducto";
import { ModalDetalleVenta } from "./ModalesVenta";
import { ETIQUETA_ESTADO_VENTA, TONO_ESTADO_VENTA } from "./reglasVenta";
import "./ReservasAdmin.css";
import "./Ventas.css";

/** Ícono de cada medio (los medios y sus nombres los da el backend) */
/** Cada cuánto se consulta la venta mientras el QR de la caja espera el pago */
const CONSULTA_QR_MS = 3000;

/** Un ítem del carrito, con lo que se muestra (el precio final lo pone el backend) */
interface ItemCarrito {
    clave: number;
    producto: ProductoAgregado;
    etiqueta: string;
    precio: number;
}

/* ─── Registrar una venta ────────────────────────── */
function NuevaVenta({ onRegistrada, onEsperando }: {
    onRegistrada: (v: Venta) => void;
    /** La venta con QR que espera el pago (null cuando ya no espera): al cerrar el panel se cancela */
    onEsperando: (ventaId: number | null) => void;
}) {
    const catalogo = useCatalogo();
    const { medios } = useMediosVenta();
    // Los alquileres van con un turno: no se venden sueltos
    const vendibles = catalogo.productos.filter(p => p.tipo === "VENTA");
    const [items, setItems] = useState<ItemCarrito[]>([]);
    const [medio, setMedio] = useState<MedioVenta>("EFECTIVO");
    const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Con Mercado Pago: la venta esperando que el cliente pague con el QR de la caja
    const [esperando, setEsperando] = useState<Venta | null>(null);

    // Mientras la caja espera, se consulta la venta (el webhook de Mercado Pago la marca cobrada)
    const idEsperando = esperando?.id ?? null;
    useEffect(() => {
        if (idEsperando === null) return;
        const intervalo = setInterval(() => {
            adminService.venta(idEsperando).then(v => {
                if (v.estado === "COBRADA") { setEsperando(null); onEsperando(null); onRegistrada(v); }
                else if (v.estado === "NO_COBRADA") {
                    setEsperando(null); onEsperando(null);
                    setError("El QR venció o se canceló sin que se pagara: la venta no se cobró y el stock volvió.");
                }
            }).catch(() => { /* se reintenta en la próxima vuelta */ });
        }, CONSULTA_QR_MS);
        return () => clearInterval(intervalo);
    }, [idEsperando, onEsperando, onRegistrada]);

    const cancelarQr = async () => {
        if (!esperando) return;
        setGuardando(true);
        try {
            const v = await adminService.cancelarQrVenta(esperando.id);
            setEsperando(null);
            onEsperando(null);
            if (v.estado === "COBRADA") onRegistrada(v);
            else setError("Se canceló el cobro con QR: la venta no se cobró. Podés cobrarla por otro medio.");
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo cancelar el cobro con QR.")) ?? null);
        } finally {
            setGuardando(false);
        }
    };

    const total = items.reduce((t, i) => t + i.precio * i.producto.cantidad, 0);

    const agregar = (producto: ProductoAgregado, etiqueta: string) => {
        if (items.length >= 20) return "Una venta lleva hasta 20 productos.";
        const precio = "productoId" in producto
            ? Number(vendibles.find(p => p.id === producto.productoId)?.precio ?? 0)
            : producto.precio;
        setItems(actual => [...actual, { clave: Date.now(), producto, etiqueta, precio }]);
        setError(null);
        return null;
    };

    const registrar = async () => {
        if (items.length === 0) { setError("Agregá al menos un producto."); return; }
        setGuardando(true);
        setError(null);
        try {
            const venta = await adminService.registrarVenta({
                medio, clienteId: cliente?.id ?? null, items: items.map(i => i.producto),
            });
            if (venta.estado === "ESPERANDO_PAGO") {
                // El carrito se conserva por si el cliente no paga y se cobra por otro medio
                setEsperando(venta);
                onEsperando(venta.id);
                return;
            }
            setItems([]); setCliente(null); setMedio("EFECTIVO");
            onRegistrada(venta);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo registrar la venta.")) ?? null);
        } finally {
            setGuardando(false);
        }
    };

    if (esperando) {
        return (
            <section className="ventas-nueva ventas-qr">
                <QrCode size={40} className="ventas-qr__icono" />
                <h3 className="ventas-qr__titulo">Esperando el pago en la caja</h3>
                <p className="modal__descripcion">
                    El QR del mostrador tiene asignados <strong>{formatMonto(Number(esperando.total))}</strong>. Pedile al cliente
                    que lo escanee con la app de Mercado Pago: la venta se registra sola.
                    {esperando.qr && <> Vence a las {formatHora(esperando.qr.venceAt)} hs.</>}
                </p>
                <p className="nr-ayuda"><span className="admin-spinner ventas-qr__spinner" aria-hidden="true" /> Consultando el pago…</p>
                {error && <Mensaje tipo="error">{error}</Mensaje>}
                <button type="button" className="accion accion--peligro" onClick={() => void cancelarQr()} disabled={guardando}>
                    {guardando ? "Cancelando..." : "Cancelar cobro"}
                </button>
            </section>
        );
    }

    return (
        <section className="ventas-nueva">
            {catalogo.error && <Mensaje tipo="error">{catalogo.error}</Mensaje>}
            <FormProducto productos={vendibles} textoBoton="Agregar a la venta" onAgregar={agregar} />

            {items.length > 0 && (
                <ul className="ventas-carrito">
                    {items.map(i => (
                        <li key={i.clave}>
                            <span>{i.producto.cantidad} × {i.etiqueta}</span>
                            <span className="ventas-carrito__monto">
                                {formatMonto(i.precio * i.producto.cantidad)}
                                <button type="button" className="ventas-carrito__quitar" aria-label={`Quitar ${i.etiqueta}`} title="Quitar de la venta"
                                    onClick={() => setItems(actual => actual.filter(x => x.clave !== i.clave))}>
                                    <Trash2 size={14} />
                                </button>
                            </span>
                        </li>
                    ))}
                    <li className="ventas-carrito__total"><span>Total</span><strong>{formatMonto(total)}</strong></li>
                </ul>
            )}

            <SelectorMedio nombre="medio-venta" valor={medio} onChange={m => { setMedio(m); setError(null); }}
                medios={medios.map(m => ({
                    valor: m.medio, grupo: m.grupo, opcion: m.opcion, detalle: m.detalle,
                    // Un medio con QR se apaga si el front tiene el QR apagado o el backend lo marca no disponible
                    disponible: m.disponible && !(m.conQr && !COBRO_QR_HABILITADO),
                }))} />
            {medios.find(m => m.medio === medio)?.conQr && (
                <p className="modal__descripcion">Se le asigna el total al QR de la caja: el cliente lo escanea con Mercado Pago y la venta se registra sola.</p>
            )}
            {medio === "CUENTA_DNI" && (
                <p className="modal__descripcion">Cobralo desde la app del banco. Queda sin verificar hasta que el ADMIN lo controle en la cuenta.</p>
            )}
            {medio === "TRANSFERENCIA_MP" && (
                <p className="modal__descripcion">Una transferencia que ya entró a la cuenta de Mercado Pago del club. Queda sin verificar hasta que el ADMIN la controle.</p>
            )}
            {(medio === "TARJETA_MP" || medio === "TARJETA") && (
                <p className="modal__descripcion">
                    Débito o crédito {medio === "TARJETA_MP" ? "en el posnet de Mercado Pago" : "en otro posnet (Clover u otro)"}, ya aprobada.
                </p>
            )}

            <BuscadorCliente id="venta-cliente" label="Cliente (opcional)" cliente={cliente} onElegir={setCliente} avisarPerfilIncompleto={false} />

            {error && <Mensaje tipo="error">{error}</Mensaje>}
            <button type="button" className="accion accion--primaria ventas-nueva__registrar" onClick={() => void registrar()}
                disabled={guardando || items.length === 0}>
                <ShoppingBag size={15} />
                {guardando ? "Registrando..." : items.length > 0 ? `Registrar venta · ${formatMonto(total)}` : "Registrar venta"}
            </button>
            <p className="modal__descripcion">
                Se cobra el precio de hoy y baja el stock. Lo que se consume en un turno se suma a la reserva (desde su detalle), no acá.
            </p>
        </section>
    );
}

/* ─── Alta en un popup ───────────────────────────── */
function PanelNuevaVenta({ onCerrar: cerrarPanel, onRegistrada }: { onCerrar: () => void; onRegistrada: (v: Venta) => void }) {
    const [esperandoId, setEsperandoId] = useState<number | null>(null);
    // Cerrar con el QR esperando cancela el cobro y libera la caja (si ya se pagó, queda registrada)
    const onCerrar = useCallback(() => {
        if (esperandoId === null) { cerrarPanel(); return; }
        adminService.cancelarQrVenta(esperandoId)
            .then(v => { if (v.estado === "COBRADA") onRegistrada(v); else cerrarPanel(); })
            .catch(() => cerrarPanel());
    }, [esperandoId, cerrarPanel, onRegistrada]);

    useEffect(() => {
        const alApretar = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
        document.addEventListener("keydown", alApretar);
        // La página de atrás no se desliza mientras el panel está abierto
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", alApretar);
            document.body.style.overflow = overflow;
        };
    }, [onCerrar]);

    return (
        <div className="modal-overlay">
            <div className="modal venta-modal" role="dialog" aria-modal="true" aria-labelledby="nueva-venta-titulo">
                <div className="detalle-reserva__cabecera">
                    <h3 id="nueva-venta-titulo" className="modal__titulo">Nueva venta</h3>
                    <button type="button" className="detalle-reserva__cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>
                    <NuevaVenta onRegistrada={onRegistrada} onEsperando={setEsperandoId} />
            </div>
        </div>
    );
}

/* ─── Filtros ────────────────────────────────────── */
type EstadoFiltro = "" | "cobradas" | "anuladas" | "sin-cobrar";
interface FiltrosVentas {
    /** id del producto del catálogo ("" = todos) */
    producto: string;
    medio: MedioVenta | "";
    estado: EstadoFiltro;
}
const SIN_FILTROS: FiltrosVentas = { producto: "", medio: "", estado: "" };
const ESTADOS: Record<Exclude<EstadoFiltro, "">, EstadoVenta[]> = {
    cobradas: ["COBRADA"], anuladas: ["ANULADA"], "sin-cobrar": ["ESPERANDO_PAGO", "NO_COBRADA"],
};
const POR_PAGINA = 20;
/** Antes de la primera venta del sistema: "todo el período" */
const DESDE_SIEMPRE = "2020-01-01";

/* ─── Página ─────────────────────────────────────── */
/**
 * Ventas sueltas: lo que el club vende sin reserva (una bebida, un tubo de pelotas). Se consultan
 * paginadas con filtros en el backend (GET /admin/ventas): período (solo ADMIN; el EMPLEADO ve su
 * jornada), producto, medio, estado y cliente, con los totales de todo el filtro. La venta nueva se
 * carga en un popup. Se cobran en el momento y entran en la caja de la jornada.
 */
export default function Ventas() {
    const { usuario } = useAuth();
    const { medios, etiqueta: etiquetaMedio } = useMediosVenta();
    const catalogo = useCatalogo();
    const esAdmin = usuario?.rol === "ADMIN";
    const [periodo, setPeriodo] = useState<Periodo>(() => ({ desde: hoyISO(), hasta: hoyISO() }));
    // El EMPLEADO ve su jornada (pasada la medianoche, sigue siendo el día anterior hasta la apertura):
    // no manda fechas y el backend usa la jornada en curso
    const jornada = useJornada();
    // "Todo el período" (sin fechas) son todas las ventas: el backend, sin ninguna fecha, devuelve las de
    // hoy, así que se pide desde el principio y sin tope. Con una sola fecha, sin límite del otro lado.
    const todo = !periodo.desde && !periodo.hasta;
    const desde = esAdmin ? (todo ? DESDE_SIEMPRE : periodo.desde) : undefined;
    const hasta = esAdmin ? periodo.hasta : undefined;
    const [filtros, setFiltros] = useState<FiltrosVentas>(SIN_FILTROS);
    const cambiarFiltro = <K extends keyof FiltrosVentas>(campo: K, valor: FiltrosVentas[K]) => setFiltros(f => ({ ...f, [campo]: valor }));
    const cliente = useBusqueda();
    const [pagina, setPagina] = useState(0);
    const [version, setVersion] = useState(0);

    const pedido: FiltrosVentasApi = {
        desde, hasta,
        productoId: filtros.producto ? Number(filtros.producto) : undefined,
        medio: filtros.medio ? [filtros.medio] : undefined,
        estado: filtros.estado ? ESTADOS[filtros.estado] : undefined,
        cliente: cliente.termino || undefined,
        page: pagina, size: POR_PAGINA,
    };
    // Con otro filtro se vuelve a la primera página (ajuste durante el render)
    const claveSinPagina = JSON.stringify({ ...pedido, page: 0 });
    const [claveAnterior, setClaveAnterior] = useState(claveSinPagina);
    if (claveAnterior !== claveSinPagina) {
        setClaveAnterior(claveSinPagina);
        if (pagina !== 0) setPagina(0);
    }
    const clave = `${JSON.stringify(pedido)}|${version}`;
    const [resultado, setResultado] = useState<{ clave: string; listado?: ListadoVentas; error?: string } | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [verificando, setVerificando] = useState<number | null>(null);
    const [cargandoVenta, setCargandoVenta] = useState(false);
    const [detalle, setDetalle] = useState<Venta | null>(null);

    useEffect(() => {
        let activo = true;
        adminService.ventas(JSON.parse(clave.slice(0, clave.lastIndexOf("|"))) as FiltrosVentasApi)
            .then(listado => { if (activo) setResultado({ clave, listado }); })
            .catch(e => { if (activo) setResultado({ clave, error: primerError(extraerErrores(e, "No se pudieron cargar las ventas.")) }); });
        return () => { activo = false; };
    }, [clave]);

    const actual = resultado?.clave === clave ? resultado : null;
    // Mientras llega la página nueva se ve la anterior (sin parpadeo)
    const listado = actual?.listado ?? resultado?.listado;
    const ventas = listado?.contenido ?? [];
    const totales = listado?.totales;
    const cargando = resultado !== null && actual === null;
    const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS) || cliente.texto !== ""
        || (esAdmin && (desde !== hoyISO() || hasta !== hoyISO()));
    const esHoy = !esAdmin || (desde === hoyISO() && hasta === hoyISO());
    const vendibles = catalogo.productos.filter(p => p.tipo === "VENTA");

    // Una venta cambió (anulada, devuelta, otro cliente, verificada): se reemplaza en la página y se
    // vuelven a pedir los totales
    const reemplazar = (v: Venta) => setResultado(r => r?.listado
        ? { ...r, listado: { ...r.listado, contenido: r.listado.contenido.map(x => x.id === v.id ? v : x) } } : r);

    const verificar = async (v: Venta, verificada: boolean) => {
        setVerificando(v.id);
        setMensaje(null);
        setError(null);
        try {
            reemplazar(await adminService.verificarVenta(v.id, verificada));
            setMensaje(verificada ? `Venta #${v.id} verificada.` : `Se quitó la verificación de la venta #${v.id}.`);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo cambiar la verificación.")) ?? null);
        } finally {
            setVerificando(null);
        }
    };

    return (
        <div className="admin-pagina">
            {detalle && (
                <ModalDetalleVenta
                    venta={detalle}
                    onCerrar={() => setDetalle(null)}
                    onCambio={(v, texto) => { reemplazar(v); setMensaje(texto); setVersion(n => n + 1); }}
                />
            )}
            {cargandoVenta && (
                <PanelNuevaVenta
                    onCerrar={() => setCargandoVenta(false)}
                    onRegistrada={v => {
                        setCargandoVenta(false);
                        setMensaje(`Venta #${v.id} registrada: ${formatMonto(Number(v.total))} en ${etiquetaMedio(v.medio).toLowerCase()}.`);
                        setVersion(n => n + 1);
                    }}
                />
            )}

            <Encabezado
                titulo="Ventas"
                descripcion={esAdmin
                    ? "Lo que se vende sin reserva, cobrado en el momento. Entra en la caja de la jornada."
                    : <>Lo que se vende sin reserva, cobrado en el momento. Ventas de tu jornada, <span style={{ textTransform: "capitalize" }}>{formatFecha(jornada)}</span> (hasta la apertura del día siguiente).</>}
                acciones={<>
                    <BotonActualizar onClick={() => setVersion(n => n + 1)} cargando={cargando} />
                    <button type="button" className="accion accion--primaria" onClick={() => { setMensaje(null); setCargandoVenta(true); }}>
                        <Plus size={15} /> Nueva venta
                    </button>
                </>}
            />

            <div className="ra-filtros">
                <div className="ra-filtros__fila">
                    <div className="ra-chips" role="radiogroup" aria-label="Medio de pago">
                        {[{ valor: "" as const, etiqueta: "Todos los medios" }, ...medios.map(m => ({ valor: m.medio, etiqueta: m.etiqueta }))].map(m => (
                            <button key={m.valor} type="button" role="radio" aria-checked={filtros.medio === m.valor}
                                className={`ra-chip${filtros.medio === m.valor ? " ra-chip--activo" : ""}`}
                                onClick={() => cambiarFiltro("medio", m.valor)}>
                                {m.etiqueta}
                            </button>
                        ))}
                    </div>
                    {esAdmin && <SelectorPeriodo valor={periodo} onChange={setPeriodo} rangoTodo={listado?.rango ?? null} />}
                </div>
                <div className="admin-filtros">
                    <CampoAutocompletar id="vf-producto" label="Producto" placeholder="Todos los productos"
                        valor={filtros.producto ? Number(filtros.producto) : null} onElegir={v => cambiarFiltro("producto", v === null ? "" : String(v))}
                        opciones={vendibles.map(p => ({ valor: p.id, etiqueta: p.nombre }))} />
                    <CampoBusqueda id="vf-cliente" label="Cliente" placeholder="Nombre, apellido o email" busqueda={cliente} />
                    <CampoSelect id="vf-estado" name="estado" label="Estado" value={filtros.estado}
                        onChange={e => cambiarFiltro("estado", e.target.value as EstadoFiltro)}
                        opciones={[
                            { valor: "", etiqueta: "Todas" }, { valor: "cobradas", etiqueta: "Cobradas" },
                            { valor: "anuladas", etiqueta: "Anuladas" }, { valor: "sin-cobrar", etiqueta: "Sin cobrar (QR)" },
                        ]} />
                    <button type="button" className="accion admin-filtros__fijo admin-filtros__limpiar" disabled={!hayFiltros}
                        onClick={() => { setFiltros(SIN_FILTROS); cliente.limpiar(); setPeriodo({ desde: hoyISO(), hasta: hoyISO() }); }}>
                        <X size={15} /> Limpiar filtros
                    </button>
                </div>
            </div>

            {totales && (
                <div className="admin-kpis">
                    <div className="admin-kpi admin-kpi--principal">
                        <span className="admin-kpi__etiqueta">Total</span>
                        <span className="admin-kpi__valor">{formatMonto(Number(totales.total))}</span>
                        <span className="admin-kpi__detalle">
                            {totales.ventas} {totales.ventas === 1 ? "cobrada" : "cobradas"}{totales.anuladas > 0 && ` · ${totales.anuladas} ${totales.anuladas === 1 ? "anulada" : "anuladas"}`}
                            {Number(totales.devuelto) > 0 && <><br />Devuelto {formatMonto(Number(totales.devuelto))}</>}
                        </span>
                    </div>
                    {medios.map(m => (
                        <div key={m.medio} className="admin-kpi">
                            <span className="admin-kpi__etiqueta">{m.etiqueta}</span>
                            <span className="admin-kpi__valor">{formatMonto(Number(totales.porMedio[m.medio] ?? 0))}</span>
                        </div>
                    ))}
                </div>
            )}

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {actual?.error && listado && <Mensaje tipo="error">{actual.error}</Mensaje>}

            {!resultado ? <Cargando /> : !listado ? (
                <Mensaje fijo tipo="error">{resultado.error}</Mensaje>
            ) : ventas.length === 0 ? (
                <Vacio icono={<ShoppingBag size={28} />}>
                    {hayFiltros && (filtros.producto || filtros.medio || filtros.estado || cliente.termino)
                        ? "Ninguna venta coincide con los filtros."
                        : `No hay ventas ${esHoy ? (esAdmin ? "hoy" : "en tu jornada") : "en el período"}.`}
                </Vacio>
            ) : (
                <>
                    <div className="admin-tabla-contenedor">
                        <table className="admin-tabla">
                            <thead>
                                <tr>
                                    <th>Venta</th>
                                    <th>Productos</th>
                                    <th>Cliente</th>
                                    <th>Medio</th>
                                    <th>Estado</th>
                                    <th>Total</th>
                                    <th className="admin-tabla__acciones" aria-label="Acciones" />
                                </tr>
                            </thead>
                            <tbody>
                                {ventas.map(v => (
                                    <tr key={v.id} className={v.estado === "COBRADA" || v.estado === "ESPERANDO_PAGO" ? undefined : "admin-tabla__inactiva"}>
                                        <td className="admin-tabla__titulo-celda">
                                            <span className="admin-tabla__principal">{formatFechaHora(v.fecha)}</span>
                                            <span className="admin-tabla__secundario">#{v.id} · {v.registradaPor}</span>
                                        </td>
                                        <td data-label="Productos">
                                            <span className="ventas-tabla__items">{v.items.map(i => `${i.cantidad} × ${i.nombre}`).join(" · ")}</span>
                                        </td>
                                        <td data-label="Cliente">{v.clienteNombre ?? <span className="admin-tabla__secundario">—</span>}</td>
                                        <td data-label="Medio">
                                            <div>
                                                <span className="admin-chip">{etiquetaMedio(v.medio)}</span>
                                                {v.medio === "CUENTA_DNI" && v.estado === "COBRADA" && (
                                                    <VerificacionCuentaDni
                                                        verificado={v.verificada === true}
                                                        verificadoAt={v.verificadaAt}
                                                        puedeCambiar={esAdmin}
                                                        ocupado={verificando === v.id}
                                                        onCambiar={x => void verificar(v, x)}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Estado"><span className={`admin-chip ${TONO_ESTADO_VENTA[v.estado]}`}>{ETIQUETA_ESTADO_VENTA[v.estado]}</span></td>
                                        <td data-label="Total" className="admin-tabla__num">
                                            <div>
                                                <strong className={v.estado === "ANULADA" || v.estado === "NO_COBRADA" ? "ventas-tachado" : undefined}>{formatMonto(Number(v.total))}</strong>
                                                {Number(v.montoDevuelto ?? 0) > 0 && <span className="admin-tabla__secundario">− {formatMonto(Number(v.montoDevuelto))} devuelto</span>}
                                            </div>
                                        </td>
                                        <td className="admin-tabla__acciones">
                                            <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setDetalle(v); }}>
                                                <Eye size={14} /> Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {listado.totalPaginas > 1 && (
                        <nav className="ra-paginado" aria-label="Páginas">
                            <button type="button" className="accion accion--chica" disabled={pagina === 0 || cargando}
                                onClick={() => setPagina(p => p - 1)}>
                                <ChevronLeft size={14} /> Anterior
                            </button>
                            <span>Página {listado.pagina + 1} de {listado.totalPaginas}</span>
                            <button type="button" className="accion accion--chica" disabled={pagina + 1 >= listado.totalPaginas || cargando}
                                onClick={() => setPagina(p => p + 1)}>
                                Siguiente <ChevronRight size={14} />
                            </button>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
