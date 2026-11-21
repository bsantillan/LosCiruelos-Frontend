import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Ban, CalendarDays, Clock, Minus, Package, Plus, Receipt, RotateCcw, Undo2, User, Users, Wallet, X } from "lucide-react";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import { useAuth } from "../../context/AuthContext";
import { useCatalogo } from "../../hooks/useCatalogo";
import { adminService, type Reembolso } from "../../services/adminService";
import type { ProductoAdmin, ProductoAgregado } from "../../types/admin.types";
import type { CanalDePago, EstadoDevolucion, EstadoPago, Imputacion, PagoResponse, PaymentProvider, ReservaResponse } from "../../types/reserva.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatFechaHora, formatMonto, horaCorta } from "../../utils/fechas";
import { esPartido } from "../../utils/reservas";
import { formatTelefono } from "../../utils/telefono";
import { Mensaje, VerificacionCuentaDni } from "./comunes";
import { cobradoEnClub, lineasCuenta, nombreImputacion, pagoAnulable, pagoDevolvible, puedeSacarUnidad, vigenteDePago, type LineaCuenta } from "./cuentaReserva";
import { admiteCambiarProductos, admiteCobro, deuda, etiquetaEstado, tonoEstado, turnoEmpezado } from "./estadoReserva";
import FormProducto, { type AccionFormProducto } from "./FormProducto";
import MontoLinea from "./MontoLinea";

const ETIQUETA_PAGO: Record<EstadoPago, string> = {
    PENDIENTE: "Iniciado, sin cobrar",
    APROBADO: "Cobrado",
    RECHAZADO: "Rechazado",
    EN_PROCESO: "En revisión",
    DEVUELTO: "Devuelto",
    EXPIRADO: "Descartado",
    A_REEMBOLSAR: "A devolver por el club",
    REEMBOLSO_PENDIENTE: "Reembolso en proceso",
    ANULADO: "Anulado",
};

/**
 * Por dónde se pagó: MANUAL es efectivo en el club; CUENTA_DNI, TRANSFERENCIA_MP y las tarjetas
 * (TARJETA_MP, TARJETA), cargados a mano en el club; un pago de Mercado Pago con id externo es online (o el QR de la caja); sin id
 * externo, si se cobró es Mercado Pago cargado en el club, y si no, un pago online que se inició y
 * nunca se completó.
 */
const ETIQUETA_CANAL: Record<CanalDePago, string> = {
    EFECTIVO: "Efectivo (club)",
    MERCADO_PAGO_ONLINE: "Mercado Pago online",
    MERCADO_PAGO_QR: "QR de la caja",
    TRANSFERENCIA_MP: "Transferencia a Mercado Pago (club)",
    TARJETA_MP: "Tarjeta en el posnet de Mercado Pago (club)",
    CUENTA_DNI: "Cuenta DNI (club)",
    TARJETA: "Tarjeta en otro posnet (club)",
    BONIFICACION: "Bonificación del club",
};

function medio(provider: PaymentProvider, externo: string | null, estado: EstadoPago, motivo?: string | null, canal?: CanalDePago): string {
    if (canal) return canal === "BONIFICACION" && motivo ? `${ETIQUETA_CANAL[canal]} · ${motivo}` : ETIQUETA_CANAL[canal];
    if (provider === "BONIFICACION") return motivo ? `Bonificación del club · ${motivo}` : "Bonificación del club";
    if (provider === "MANUAL") return "Efectivo (club)";
    if (provider === "CUENTA_DNI") return "Cuenta DNI (club)";
    if (provider === "TRANSFERENCIA_MP") return "Transferencia a Mercado Pago (club)";
    if (provider === "TARJETA_MP") return "Tarjeta en el posnet de Mercado Pago (club)";
    if (provider === "TARJETA") return "Tarjeta en otro posnet (club)";
    if (externo) return "Mercado Pago online";
    return estado === "APROBADO" || estado === "DEVUELTO" || estado === "A_REEMBOLSAR" || estado === "ANULADO"
        ? "Mercado Pago (club)" : "Mercado Pago online";
}

const tonoPago = (estado: EstadoPago | EstadoDevolucion) => estado === "APROBADO" ? "admin-chip--ok"
    : estado === "RECHAZADO" || estado === "EXPIRADO" || estado === "ANULADO" ? "" : "admin-chip--alerta";

/* ─── Detalle ────────────────────────────────────── */
/**
 * Detalle de una reserva o partido para el personal, armado como una cuenta:
 *  - la cuenta línea por línea (cancha y productos), con lo cobrado de cada una; los productos se
 *    suman y se sacan acá mismo, pero lo que ya está cobrado no se saca: primero se anula o se
 *    devuelve ese cobro;
 *  - los pagos, con qué cubre cada uno, y las acciones para anular un cobro mal cargado, devolver
 *    (todo o por línea, solo ADMIN) y marcar como entregado lo que el club tenía que devolver;
 *  - la devolución de las paletas alquiladas, una vez que empezó el turno;
 *  - la verificación de los pagos con Cuenta DNI (solo ADMIN).
 * Cada cambio se avisa a la pantalla con onCambio.
 */
/** Agregar un producto a la cuenta: popup encima del detalle (al sumarlo se cierra y se vuelve al detalle) */
function ModalAgregarProducto({ productos, guardando, onAgregar, onCerrar }: {
    productos: ProductoAdmin[];
    guardando: boolean;
    onAgregar: (producto: ProductoAgregado, etiqueta: string) => Promise<string | null>;
    onCerrar: () => void;
}) {
    const form = useRef<AccionFormProducto>(null);
    return createPortal(
        <ModalConfirmacion
            titulo="Agregar producto"
            icono={<Package size={22} />}
            clase="modal-agregar-producto"
            textoConfirmar="Sumar a la cuenta"
            cargando={guardando}
            onCerrar={onCerrar}
            onConfirmar={() => void form.current?.agregar()}
        >
            <FormProducto accion={form} productos={productos} guardando={guardando} onAgregar={onAgregar} />
        </ModalConfirmacion>,
        document.body,
    );
}

export function ModalDetalleReserva({ reserva, onCerrar, onCambio, onCobrar, acciones }: {
    reserva: ReservaResponse;
    onCerrar: () => void;
    onCambio?: (r: ReservaResponse) => void;
    /** Botón Cobrar al pie de la cuenta (se muestra solo si se puede cobrar) */
    onCobrar?: (r: ReservaResponse) => void;
    /** Botones al pie (bonificar, editar, cancelar...), con la reserva actualizada */
    acciones?: (r: ReservaResponse) => ReactNode;
}) {
    useEffect(() => {
        // Con otro popup abierto encima (cobrar, editar, anular...), Escape cierra solo ese
        const alApretar = (e: KeyboardEvent) => {
            if (e.key === "Escape" && document.querySelectorAll(".modal-overlay").length <= 1) onCerrar();
        };
        document.addEventListener("keydown", alApretar);
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", alApretar); document.body.style.overflow = anterior; };
    }, [onCerrar]);

    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const [r, setR] = useState(reserva);
    // La pantalla la vuelve a pedir después de cobrar o editar desde un popup de arriba
    const [recibida, setRecibida] = useState(reserva);
    if (reserva !== recibida) { setRecibida(reserva); setR(reserva); }
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [sumando, setSumando] = useState(false);
    const [devueltas, setDevueltas] = useState<string | null>(null);
    const catalogo = useCatalogo();

    const editable = admiteCambiarProductos(r);
    const activa = r.estado !== "CANCELADA" && r.estado !== "EXPIRADA";
    const lineas = lineasCuenta(r);
    const saldo = deuda(r);
    const paletas = r.productos.find(p => p.codigo === "PALETAS" && p.cantidad > 0);
    const devolucionPendiente = paletas !== undefined && paletas.cantidadDevuelta === null
        && turnoEmpezado(r) && activa && r.estado !== "PENDIENTE";

    /** Corre una operación; con lo que devuelve (o volviendo a pedir la reserva) se actualiza todo */
    const operar = async (accion: () => Promise<ReservaResponse | null>, ok: string, fallo: string): Promise<string | null> => {
        setOcupado(true);
        setError(null);
        setAviso(null);
        try {
            const nueva = (await accion()) ?? await adminService.reserva(r.id);
            setR(nueva);
            setAviso(ok);
            onCambio?.(nueva);
            return null;
        } catch (e) {
            const mensaje = primerError(extraerErrores(e, fallo)) ?? fallo;
            setError(mensaje);
            return mensaje;
        } finally {
            setOcupado(false);
        }
    };

    const verificar = (pago: PagoResponse, verificado: boolean) => operar(
        async () => {
            const actualizado = await adminService.verificarPago(r.id, pago.id, verificado);
            return { ...r, pagos: r.pagos.map(p => p.id === pago.id ? { ...p, ...actualizado } : p) };
        },
        verificado ? "Pago con Cuenta DNI verificado." : "Se quitó la verificación del pago.",
        "No se pudo cambiar la verificación.",
    );

    const sumarUnidad = (l: LineaCuenta) => l.producto && void operar(
        () => adminService.agregarProducto(r.id, { productoId: l.producto!.productoId, cantidad: 1 }),
        `Se sumó 1 ${l.nombre.toLowerCase()}.`, "No se pudo sumar el producto.",
    );
    const sacarUnidad = (l: LineaCuenta) => l.producto && void operar(
        () => adminService.quitarProducto(r.id, l.producto!.productoId, 1),
        `Se sacó 1 ${l.nombre.toLowerCase()}.`, "No se pudo sacar el producto.",
    );

    const registrarDevolucion = () => {
        if (!paletas || devueltas === null) return;
        const n = Number(devueltas);
        if (!Number.isInteger(n) || n < 0 || n > paletas.cantidad) { setError(`Ingresá un número entre 0 y ${paletas.cantidad}.`); return; }
        const faltan = paletas.cantidad - n;
        void operar(
            () => adminService.registrarDevolucion(r.id, n),
            faltan > 0
                ? `Devolución registrada. ${faltan === 1 ? "Faltó 1 paleta" : `Faltaron ${faltan} paletas`}: se descontó del stock.`
                : "Devolución registrada: volvieron todas las paletas.",
            "No se pudo registrar la devolución.",
        ).then(f => { if (!f) setDevueltas(null); });
    };

    const jugadores = [...r.jugadores].sort((a, b) => a.posicion - b.posicion);

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal detalle-reserva" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo" onClick={e => e.stopPropagation()}>
                <div className="detalle-reserva__cabecera">
                    <div>
                        <h3 className="modal__titulo" id="detalle-titulo">{esPartido(r) ? "Partido" : "Reserva"} #{r.id}</h3>
                        <span className="detalle-reserva__chips">
                            <span className={`admin-chip ${tonoEstado(r)}`}>{etiquetaEstado(r)}</span>
                            {r.turnoFijoId !== null && <span className="admin-chip">Turno fijo</span>}
                        </span>
                    </div>
                    <button type="button" className="detalle-reserva__cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
                </div>

                {aviso && <Mensaje tipo="ok">{aviso}</Mensaje>}
                {error && <Mensaje tipo="error">{error}</Mensaje>}

                <div className="detalle-reserva__cuerpo">
                    <div className="detalle-reserva__principal">
                    {/* La cuenta, línea por línea */}
                    <section className="cuenta">
                        <div className="cuenta__cabecera">
                            <h4 className="detalle-reserva__subtitulo"><Receipt size={14} /> Cuenta</h4>
                            {editable && (
                                <button type="button" className="accion accion--chica" onClick={() => { setSumando(true); setAviso(null); setError(null); }}>
                                    <Plus size={14} /> Agregar producto
                                </button>
                            )}
                        </div>

                        {sumando && (
                            <ModalAgregarProducto
                                productos={catalogo.productos}
                                guardando={ocupado}
                                onCerrar={() => setSumando(false)}
                                onAgregar={async (producto, etiqueta) => {
                                    const fallo = await operar(() => adminService.agregarProducto(r.id, producto),
                                        `Se sumó ${etiqueta.toLowerCase()} a la cuenta.`, "No se pudo sumar el producto.");
                                    // El error se ve en el popup de agregar, no también en el detalle
                                    if (fallo) setError(null); else setSumando(false);
                                    return fallo;
                                }}
                            />
                        )}

                        <ul className="cuenta__lineas">
                            {lineas.map(l => {
                                const p = l.producto;
                                const conDevolucion = p !== null && p.cantidadDevuelta !== null;
                                const sacable = puedeSacarUnidad(l);
                                return (
                                    <li key={l.clave} className="cuenta__linea">
                                        <div className="cuenta__concepto">
                                            <span className="cuenta__nombre">{p ? <Package size={14} /> : <Clock size={14} />} {l.nombre}</span>
                                            <span className="cuenta__detalle">
                                                {p ? `${formatMonto(Number(p.precioUnitario))} c/u` : `${horaCorta(r.horaInicio)} a ${horaCorta(r.horaFin)} hs`}
                                                {conDevolucion && ` · devueltas ${p.cantidadDevuelta}`}
                                            </span>
                                        </div>
                                        {p && (editable && !conDevolucion ? (
                                            <span className="cuenta__cantidad">
                                                <button type="button" disabled={ocupado || !sacable} onClick={() => sacarUnidad(l)}
                                                    aria-label={`Sacar 1 ${l.nombre.toLowerCase()}`}
                                                    title={sacable ? `Sacar 1 ${l.nombre.toLowerCase()}`
                                                        : `Tiene ${formatMonto(l.pagado)} cobrados: anulá o devolvé ese cobro para sacarlo`}>
                                                    <Minus size={13} />
                                                </button>
                                                <strong>{p.cantidad}</strong>
                                                <button type="button" disabled={ocupado} onClick={() => sumarUnidad(l)}
                                                    aria-label={`Sumar 1 ${l.nombre.toLowerCase()}`} title={`Sumar 1 ${l.nombre.toLowerCase()}`}>
                                                    <Plus size={13} />
                                                </button>
                                            </span>
                                        ) : <span className="cuenta__cantidad"><strong>{p.cantidad}</strong></span>)}
                                        <span className="cuenta__importe">{formatMonto(l.subtotal)}</span>
                                        {activa && (
                                            <span className={`admin-chip cuenta__estado ${l.pendiente <= 0 ? "admin-chip--ok" : l.pagado > 0 ? "admin-chip--alerta" : ""}`}>
                                                {l.pendiente <= 0 ? "Pagado" : l.pagado > 0 ? `Falta ${formatMonto(l.pendiente)}` : "Pendiente"}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="cuenta__pie">
                            <dl className="cuenta__totales">
                                <div><dt>Total</dt><dd>{formatMonto(Number(r.montoTotal))}</dd></div>
                                {!esPartido(r) && Number(r.montoSenia) > 0 && <div><dt>Seña</dt><dd>{formatMonto(Number(r.montoSenia))}</dd></div>}
                                <div><dt>Pagado</dt><dd>{formatMonto(Number(r.montoPagado))}</dd></div>
                                {Number(r.montoBonificado ?? 0) > 0 && <div><dt>Bonificado</dt><dd>{formatMonto(Number(r.montoBonificado))}</dd></div>}
                                <div className={saldo > 0 ? "cuenta__saldo cuenta__saldo--debe" : "cuenta__saldo"}>
                                    <dt>{saldo > 0 ? "Saldo" : "Sin saldo"}</dt><dd>{formatMonto(saldo)}</dd>
                                </div>
                            </dl>
                            {onCobrar && admiteCobro(r) && (
                                <button type="button" className="accion accion--primaria" onClick={() => onCobrar(r)}>
                                    <Wallet size={15} /> Cobrar
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Devolución de las paletas alquiladas: una vez que empezó el turno */}
                    {devolucionPendiente && (
                        <div className="detalle-reserva__bloque">
                            <h4 className="detalle-reserva__subtitulo"><RotateCcw size={14} /> Devolución de paletas</h4>
                            {devueltas === null ? (
                                <>
                                    <p className="modal__descripcion">
                                        Alquiló {paletas.cantidad === 1 ? "1 paleta" : `${paletas.cantidad} paletas`} y todavía no se registró la devolución.
                                    </p>
                                    <button type="button" className="accion accion--chica accion--primaria" onClick={() => setDevueltas(String(paletas.cantidad))}>
                                        <RotateCcw size={14} /> Registrar devolución
                                    </button>
                                </>
                            ) : (
                                <>
                                    <CampoInput id="paletas-devueltas" name="paletasDevueltas" label="Paletas devueltas"
                                        type="number" entero min={0} max={paletas.cantidad} value={devueltas}
                                        onChange={e => { setDevueltas(e.target.value); setError(null); }} />
                                    {Number.isInteger(Number(devueltas)) && paletas.cantidad - Number(devueltas) > 0 && Number(devueltas) >= 0 && (
                                        <p className="modal__descripcion">
                                            {paletas.cantidad - Number(devueltas) === 1 ? "Falta 1 paleta: se descuenta" : `Faltan ${paletas.cantidad - Number(devueltas)} paletas: se descuentan`} del stock.
                                        </p>
                                    )}
                                    <span className="admin-tabla__acciones-grupo">
                                        <button type="button" className="accion accion--chica" onClick={() => setDevueltas(null)} disabled={ocupado}>Volver</button>
                                        <button type="button" className="accion accion--chica accion--primaria" onClick={registrarDevolucion} disabled={ocupado}>
                                            {ocupado ? "Guardando..." : "Registrar"}
                                        </button>
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    </div>
                    <aside className="detalle-reserva__lateral">
                    <ul className="detalle-reserva__datos">
                        <li><User size={15} /> {r.clienteNombre}{esPartido(r) && " (responsable)"}</li>
                        <li><CalendarDays size={15} /> <span style={{ textTransform: "capitalize" }}>{formatFecha(r.fechaReserva)}</span></li>
                        <li><Clock size={15} /> Cancha {r.canchaNumero} · {horaCorta(r.horaInicio)} a {horaCorta(r.horaFin)} hs</li>
                    </ul>

                    {esPartido(r) && jugadores.length > 0 && (
                        <section>
                            <h4 className="detalle-reserva__subtitulo"><Users size={14} /> Jugadores</h4>
                            <ul className="detalle-reserva__jugadores">
                                {jugadores.map(j => (
                                    <li key={j.id} title={j.telefono ? formatTelefono(j.telefono) : undefined}>
                                        <span className="detalle-reserva__posicion">{j.posicion}</span>
                                        {j.nombre}
                                        {j.invitado && <span className="admin-chip">Invitado</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section className="detalle-reserva__seccion-pagos">
                        <h4 className="detalle-reserva__subtitulo"><Wallet size={14} /> Pagos</h4>
                        {r.pagos.length === 0 ? (
                            <p className="modal__descripcion">Sin pagos.</p>
                        ) : (
                            <ul className="detalle-reserva__pagos">
                                {r.pagos.map(p => (
                                    <PagoItem key={p.id} reserva={r} pago={p} esAdmin={esAdmin} ocupado={ocupado}
                                        onVerificar={v => void verificar(p, v)}
                                        onAnular={motivo => operar(() => adminService.anularPago(r.id, p.id, motivo),
                                            `Se anuló el cobro de ${formatMonto(Number(p.monto))}.`, "No se pudo anular el cobro.")}
                                        onDevolver={(lineasDev, motivo, entregada) => {
                                            const total = formatMonto(lineasDev.reduce((s, i) => s + i.monto, 0));
                                            return operar(() => adminService.devolverPago(r.id, p.id, lineasDev, motivo, entregada),
                                                !cobradoEnClub(p) ? `Se devolvieron ${total} por Mercado Pago.`
                                                    : entregada ? `Se devolvieron ${total} en el club.`
                                                    : `Se registró la devolución de ${total}: queda para entregar en el club.`,
                                                "No se pudo registrar la devolución.");
                                        }}
                                        onRevisar={(devolucionId, revisada) => void operar(
                                            () => adminService.revisarDevolucion(r.id, devolucionId, revisada).then(() => null),
                                            revisada ? "Devolución revisada." : "Se quitó la revisión.", "No se pudo cambiar la revisión.")}
                                        onEntregar={devolucionId => void operar(() => adminService.entregarDevolucion(r.id, devolucionId),
                                            "Devolución marcada como entregada.", "No se pudo marcar como entregada.")}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                    </aside>
                </div>
                {acciones && <div className="detalle-reserva__acciones">{acciones(r)}</div>}
            </div>
        </div>
    );
}

/**
 * Un pago de la cuenta: qué cubre, sus devoluciones y las acciones. Anular y devolver se abren en
 * un popup encima del detalle (en document.body, para que no quede dentro del modal animado).
 */
function PagoItem({ reserva, pago: p, esAdmin, ocupado, onVerificar, onAnular, onDevolver, onEntregar, onRevisar }: {
    reserva: ReservaResponse;
    pago: PagoResponse;
    esAdmin: boolean;
    ocupado: boolean;
    onVerificar: (verificado: boolean) => void;
    onAnular: (motivo: string) => Promise<string | null>;
    onDevolver: (lineas: Imputacion[], motivo: string, entregada: boolean) => Promise<string | null>;
    onEntregar: (devolucionId: number) => void;
    onRevisar: (devolucionId: number, revisada: boolean) => void;
}) {
    const [abierto, setAbierto] = useState<"anular" | "devolver" | null>(null);
    const [motivo, setMotivo] = useState("");
    // Devolución de un cobro del club: se le da la plata ahora o queda para entregar
    const [entregada, setEntregada] = useState(true);
    // Devolver: qué líneas (por índice de la imputación) y, si no es todo, cuánto de cada una
    const [elegidas, setElegidas] = useState<Set<number>>(new Set());
    const [ajustes, setAjustes] = useState<Record<number, string>>({});
    const [editando, setEditando] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const anulado = p.estado === "ANULADO";
    const imputaciones = p.imputaciones ?? [];
    const anulable = pagoAnulable(p, esAdmin);
    const devolvible = pagoDevolvible(p, esAdmin);

    const abrirDevolver = () => {
        setElegidas(new Set(imputaciones.map((_, k) => k))); setAjustes({}); setEditando(null); setEntregada(true);
        setMotivo(""); setError(null); setAbierto("devolver");
    };
    /** Lo que se devuelve de una línea: todo lo que cubre, o lo ajustado (sin pasarse) */
    const montoDevolucion = (k: number) => {
        if (!elegidas.has(k)) return 0;
        const tope = Number(imputaciones[k].monto);
        return ajustes[k] !== undefined ? Math.max(0, Math.min(tope, Number(ajustes[k]) || 0)) : tope;
    };
    const lineasDevolucion = imputaciones
        .map((i, k) => ({ ...i, monto: montoDevolucion(k) }))
        .filter(i => i.monto > 0);
    const totalDevolucion = Math.round(lineasDevolucion.reduce((s, i) => s + i.monto, 0) * 100) / 100;
    const alternarLinea = (k: number) => {
        setElegidas(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
        setAjustes(a => { const n = { ...a }; delete n[k]; return n; });
        setEditando(null); setError(null);
    };

    const confirmarAnular = async () => {
        if (motivo.trim().length < 3) { setError("Escribí el motivo (por ejemplo, \"se cargó dos veces\")."); return; }
        if (!(await onAnular(motivo.trim()))) setAbierto(null);
    };
    const confirmarDevolver = async () => {
        if (totalDevolucion <= 0) { setError("Elegí qué se devuelve."); return; }
        if (!esAdmin && motivo.trim().length < 3) { setError("Escribí el motivo de la devolución."); return; }
        const lineas = lineasDevolucion.map(({ concepto, lineaId, monto }) => ({ concepto, lineaId, monto }));
        if (!(await onDevolver(lineas, motivo.trim(), entregada))) setAbierto(null);
    };

    return (
        <li className={`pago${anulado ? " pago--anulado" : ""}`}>
            <div className="pago__fila">
                <div className="pago__datos">
                    <span className="detalle-reserva__pago-monto">{formatMonto(Number(p.monto))}</span>
                    <span className="detalle-reserva__pago-detalle">
                        {medio(p.provider, p.externalPaymentId, p.estado, p.motivo, p.canal)}
                        {p.paidAt && ` · ${formatFechaHora(p.paidAt)}`}
                    </span>
                </div>
                <span className={`admin-chip ${tonoPago(p.estado)}`}>
                    {p.provider === "BONIFICACION" && p.estado === "APROBADO" ? "Bonificado" : ETIQUETA_PAGO[p.estado]}
                </span>
            </div>

            {/* Qué cubre */}
            {imputaciones.length > 0 && !anulado && (
                <p className="pago__cubre">
                    Cubre: {imputaciones.map(i => `${nombreImputacion(i, reserva)} ${formatMonto(Number(i.monto))}`).join(" · ")}
                </p>
            )}
            {anulado && (
                <p className="pago__cubre">
                    Anulado{p.anuladoAt && ` el ${formatFechaHora(p.anuladoAt)}`}{p.anuladoPor && ` por ${p.anuladoPor}`}
                    {p.motivoAnulacion && ` · ${p.motivoAnulacion}`}
                </p>
            )}
            {!p.devoluciones?.length && Number(p.montoReembolsado ?? 0) > 0 && (
                <p className="pago__cubre">Devuelto {formatMonto(Number(p.montoReembolsado))}</p>
            )}

            {/* Devoluciones de este pago */}
            {(p.devoluciones ?? []).map(d => (
                <div key={d.id} className="pago__devolucion">
                    <span>
                        <Undo2 size={13} /> Devolución {formatMonto(Number(d.monto))}
                        {d.lineas.length > 0 && ` (${d.lineas.map(i => nombreImputacion(i, reserva)).join(", ")})`}
                        {d.motivo && ` · ${d.motivo}`}
                        {d.entregadoAt && ` · entregada ${formatFechaHora(d.entregadoAt)}${d.entregadoPor ? ` por ${d.entregadoPor}` : ""}`}
                    </span>
                    <span className="pago__devolucion-estado">
                        {d.estado === "A_REEMBOLSAR" ? (
                            <button type="button" className="accion accion--chica" disabled={ocupado} onClick={() => onEntregar(d.id)}>
                                Marcar entregada
                            </button>
                        ) : (
                            <span className={`admin-chip ${d.estado === "DEVUELTO" ? "admin-chip--ok" : tonoPago(d.estado)}`}>
                                {d.estado === "DEVUELTO" ? (cobradoEnClub(p) ? "Entregada" : "Devuelta") : ETIQUETA_PAGO[d.estado]}
                            </span>
                        )}
                        {/* Las que registró el EMPLEADO (sin revisar, o revisadas después por el ADMIN) */}
                        {(d.revisada === false || (d.revisada === true && Boolean(d.revisadaPor))) && (
                            <VerificacionCuentaDni
                                verificado={d.revisada === true}
                                verificadoAt={d.revisadaAt ?? null}
                                puedeCambiar={esAdmin}
                                ocupado={ocupado}
                                onCambiar={v => onRevisar(d.id, v)}
                                textos={{ si: "Revisada", no: "Sin revisar", marcar: "Marcar revisada", quitar: "Quitar revisión" }}
                            />
                        )}
                    </span>
                </div>
            ))}

            {/* Cuenta DNI: el ADMIN controla en la cuenta del club que la plata entró */}
            {p.provider === "CUENTA_DNI" && p.estado === "APROBADO" && (
                <VerificacionCuentaDni
                    verificado={p.verificado === true}
                    verificadoAt={p.verificadoAt ?? null}
                    puedeCambiar={esAdmin}
                    ocupado={ocupado}
                    onCambiar={onVerificar}
                />
            )}

            {(anulable || devolvible) && (
                <div className="pago__acciones">
                    {anulable && (
                        <button type="button" className="accion accion--chica accion--peligro" disabled={ocupado}
                            title="Se cargó por error: el cobro se da de baja y no cuenta en la caja"
                            onClick={() => { setMotivo(""); setError(null); setAbierto("anular"); }}>
                            <Ban size={13} /> Anular
                        </button>
                    )}
                    {devolvible && (
                        <button type="button" className="accion accion--chica" disabled={ocupado}
                            title="La plata entró y se le devuelve al cliente (todo o por línea)" onClick={abrirDevolver}>
                            <Undo2 size={13} /> Devolver
                        </button>
                    )}
                </div>
            )}

            {abierto === "anular" && createPortal(
                <ModalConfirmacion
                    titulo={`¿Anular el cobro de ${formatMonto(Number(p.monto))}?`}
                    icono={<Ban size={22} />}
                    variante="danger"
                    textoConfirmar="Anular cobro"
                    cargando={ocupado}
                    error={error}
                    onCerrar={() => setAbierto(null)}
                    onConfirmar={() => void confirmarAnular()}
                >
                    <div className="admin-form">
                        <p className="modal__descripcion">
                            {medio(p.provider, p.externalPaymentId, p.estado, p.motivo, p.canal)}{p.paidAt && ` · ${formatFechaHora(p.paidAt)}`}.
                            El cobro se da de baja: no cuenta en la caja y {imputaciones.length > 0
                                ? `vuelve a quedar pendiente ${imputaciones.map(i => `${nombreImputacion(i, reserva)} (${formatMonto(Number(i.monto))})`).join(", ")}`
                                : "su monto vuelve a quedar pendiente"}. Queda en el historial con el motivo.
                        </p>
                        <CampoInput id={`motivo-anular-${p.id}`} name="motivo" label="Motivo" placeholder="Se cargó dos veces, monto equivocado..."
                            value={motivo} onChange={e => { setMotivo(e.target.value.slice(0, 200)); setError(null); }} />
                    </div>
                </ModalConfirmacion>,
                document.body,
            )}

            {abierto === "devolver" && createPortal(
                <ModalConfirmacion
                    titulo={`Devolver del cobro de ${formatMonto(Number(p.monto))}`}
                    icono={<Undo2 size={22} />}
                    clase="modal-cobro"
                    textoConfirmar={totalDevolucion > 0 ? `Devolver ${formatMonto(totalDevolucion)}` : "Devolver"}
                    cargando={ocupado}
                    error={error}
                    onCerrar={() => setAbierto(null)}
                    onConfirmar={() => void confirmarDevolver()}
                >
                    <div className="admin-form">
                        <p className="modal__descripcion">
                            {cobradoEnClub(p)
                                ? "Se cobró en el club: la plata se le da en mano."
                                : "Se pagó por Mercado Pago: la plata vuelve sola a la cuenta del cliente."}{" "}
                            Elegí qué se devuelve y cuánto de cada línea.
                            {!esAdmin && " Queda registrada para que el ADMIN la revise."}
                        </p>
                        <div className="cobro-lineas">
                            <div className="cobro-lineas__atajos">
                                <span className="cobro-lineas__titulo">Qué se devuelve</span>
                                {imputaciones.length > 1 && (
                                    <button type="button" className="ra-chip" onClick={abrirDevolver}>Todo</button>
                                )}
                            </div>
                            <ul>
                                {imputaciones.map((i, k) => {
                                    const tildada = elegidas.has(k);
                                    const nombre = nombreImputacion(i, reserva);
                                    return (
                                        <li key={k} className={`cobro-linea${tildada ? " cobro-linea--activa" : ""}`}>
                                            <label className="cobro-linea__nombre">
                                                <input type="checkbox" checked={tildada} onChange={() => alternarLinea(k)} />
                                                <span>
                                                    {nombre}
                                                    <small>este cobro cubre {formatMonto(Number(i.monto))}</small>
                                                </span>
                                            </label>
                                            <MontoLinea id={`dev-${p.id}-${k}`} monto={montoDevolucion(k)} valor={ajustes[k]} maximo={Number(i.monto)}
                                                editando={editando === k} deshabilitado={!tildada}
                                                etiqueta={`Monto de ${nombre.toLowerCase()}`} titulo="Devolver otro monto de esta línea (devolución parcial)"
                                                onEditar={() => setEditando(k)}
                                                onCambio={v => { setAjustes(a => ({ ...a, [k]: v })); setError(null); }}
                                                onListo={() => setEditando(null)} />
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <div className="cobro-total">
                            <span>Total a devolver</span>
                            <strong>{formatMonto(totalDevolucion)}</strong>
                        </div>
                        {cobradoEnClub(p) && (
                            <div className="admin-opciones" role="radiogroup" aria-label="Entrega de la plata">
                                <label className={`admin-opcion${entregada ? " admin-opcion--activa" : ""}`}>
                                    <input type="radio" name={`entrega-${p.id}`} checked={entregada} onChange={() => setEntregada(true)} />
                                    Se la di ahora
                                </label>
                                <label className={`admin-opcion${!entregada ? " admin-opcion--activa" : ""}`}>
                                    <input type="radio" name={`entrega-${p.id}`} checked={!entregada} onChange={() => setEntregada(false)} />
                                    Queda para entregar
                                </label>
                            </div>
                        )}
                        {cobradoEnClub(p) && !entregada && (
                            <p className="modal__descripcion">Queda &quot;A devolver&quot; y aparece en el aviso de Reservas hasta que alguien le da la plata.</p>
                        )}
                        <CampoInput id={`motivo-dev-${p.id}`} name="motivo" label={esAdmin ? "Motivo (opcional)" : "Motivo"} placeholder="No se le dio el producto..."
                            value={motivo} onChange={e => setMotivo(e.target.value.slice(0, 200))} />
                        {vigenteDePago(p) > totalDevolucion && totalDevolucion > 0 && (
                            <p className="modal__descripcion">El resto del pago ({formatMonto(vigenteDePago(p) - totalDevolucion)}) sigue cubriendo la cuenta.</p>
                        )}
                    </div>
                </ModalConfirmacion>,
                document.body,
            )}
        </li>
    );
}

/* ─── Cancelar como personal ─────────────────────── */
export function ModalCancelarReserva({ reserva, onCerrar, onCancelada }: {
    reserva: ReservaResponse;
    onCerrar: () => void;
    onCancelada: (r: ReservaResponse) => void;
}) {
    // Solo la plata cobrada se puede devolver: lo bonificado no es plata
    const pagado = Number(reserva.montoPagado);
    const bonificado = Number(reserva.montoBonificado ?? 0);
    const conDinero = pagado > 0;
    const senia = Math.min(pagado, Number(reserva.montoSenia));
    const [reembolso, setReembolso] = useState<Reembolso | null>(conDinero ? null : "NADA");
    // Lo cobrado en el club: se le da ahora o queda "A devolver"
    const [entregada, setEntregada] = useState(true);
    const [cancelando, setCancelando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pagosEnClub = reserva.pagos.some(p =>
        p.estado === "APROBADO" && p.provider !== "BONIFICACION" && !p.externalPaymentId);

    const opciones: { valor: Reembolso; etiqueta: string; monto: number }[] = [
        { valor: "TOTAL", etiqueta: "Todo lo pagado", monto: pagado },
        ...(senia > 0 && senia < pagado ? [{ valor: "SENIA" as const, etiqueta: "La seña", monto: senia }] : []),
        { valor: "NADA", etiqueta: "Nada", monto: 0 },
    ];

    const cancelar = async () => {
        if (conDinero && !reembolso) { setError("Elegí qué se le devuelve."); return; }
        setCancelando(true);
        setError(null);
        try {
            const devuelve = conDinero && reembolso && reembolso !== "NADA";
            onCancelada(await adminService.cancelarReserva(reserva.id, conDinero ? reembolso ?? undefined : undefined,
                devuelve && pagosEnClub ? entregada : undefined));
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo cancelar la reserva.")) ?? null);
            setCancelando(false);
        }
    };

    return (
        <ModalConfirmacion
            titulo={`¿Cancelar ${esPartido(reserva) ? "el partido" : "la reserva"} #${reserva.id}?`}
            icono={<Ban size={22} />}
            variante="danger"
            textoConfirmar="Sí, cancelar"
            textoCancelar="Volver"
            cargando={cancelando}
            error={error}
            onCerrar={onCerrar}
            onConfirmar={() => void cancelar()}
        >
            <div className="admin-form">
                <p className="modal__descripcion">
                    {reserva.clienteNombre} · Cancha {reserva.canchaNumero} · <span style={{ textTransform: "capitalize" }}>{formatFecha(reserva.fechaReserva)}</span>,{" "}
                    {horaCorta(reserva.horaInicio)} hs. Se libera el turno y se avisa {esPartido(reserva) ? "a los jugadores registrados" : "al cliente"}.
                </p>
                {conDinero ? (
                    <>
                        <p className="modal__descripcion">Pagó <strong>{formatMonto(pagado)}</strong>. ¿Qué se le devuelve?</p>
                        <div className="admin-opciones" role="radiogroup" aria-label="Reembolso">
                            {opciones.map(o => (
                                <label key={o.valor} className={`admin-opcion${reembolso === o.valor ? " admin-opcion--activa" : ""}`}>
                                    <input type="radio" name="reembolso" checked={reembolso === o.valor}
                                        onChange={() => { setReembolso(o.valor); setError(null); }} />
                                    {o.etiqueta}{o.monto > 0 && ` · ${formatMonto(o.monto)}`}
                                </label>
                            ))}
                        </div>
                        {reembolso && reembolso !== "NADA" && (
                            <Mensaje fijo tipo="ok">
                                Lo pagado online vuelve solo por Mercado Pago.
                                {pagosEnClub && " Lo cobrado en el club se le da en mano:"}
                            </Mensaje>
                        )}
                        {reembolso && reembolso !== "NADA" && pagosEnClub && (
                            <div className="admin-opciones" role="radiogroup" aria-label="Entrega de la plata">
                                <label className={`admin-opcion${entregada ? " admin-opcion--activa" : ""}`}>
                                    <input type="radio" name="entrega-cancelacion" checked={entregada} onChange={() => setEntregada(true)} />
                                    Se la di ahora
                                </label>
                                <label className={`admin-opcion${!entregada ? " admin-opcion--activa" : ""}`}>
                                    <input type="radio" name="entrega-cancelacion" checked={!entregada} onChange={() => setEntregada(false)} />
                                    Queda para entregar
                                </label>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="modal__descripcion">No pagó nada: no hay nada que devolver.</p>
                )}
                {bonificado > 0 && (
                    <p className="modal__descripcion">El club le había bonificado {formatMonto(bonificado)}: eso no se devuelve.</p>
                )}
            </div>
        </ModalConfirmacion>
    );
}
