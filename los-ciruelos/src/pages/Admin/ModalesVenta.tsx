import { useEffect, useState } from "react";
import { Ban, Receipt, RotateCcw, UserRound, X } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import { useAuth } from "../../context/AuthContext";
import { useMediosVenta } from "../../hooks/useMediosVenta";
import { adminService } from "../../services/adminService";
import type { ClienteBusqueda, Venta } from "../../types/admin.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFechaHora, formatMonto } from "../../utils/fechas";
import BuscadorCliente from "./BuscadorCliente";
import { Mensaje, VerificacionCuentaDni } from "./comunes";
import {
    ETIQUETA_ESTADO_VENTA, TONO_ESTADO_VENTA, netoVenta, puedeAnular, puedeCambiarCliente,
    puedeDevolver, quedanPorDevolver,
} from "./reglasVenta";
import "./ReservasAdmin.css";
import "./Ventas.css";

type Vista = "detalle" | "anular" | "devolver" | "cliente";

/** Lo que se devuelve de cada producto: unidades (texto del input) y si vuelve al stock */
type Devolucion = Record<number, { cantidad: string; vuelveAlStock: boolean }>;

/**
 * Detalle de una venta suelta: productos (con lo devuelto), medio, cliente, la anulación y las
 * devoluciones. Desde acá se cambia el cliente, se anula (con motivo) y, solo el ADMIN, se registra
 * una devolución de todo o una parte. Una venta no se edita ni se borra.
 */
export function ModalDetalleVenta({ venta, onCerrar, onCambio }: {
    venta: Venta;
    onCerrar: () => void;
    /** La venta cambió (anulada, devuelta, otro cliente, verificada) */
    onCambio: (v: Venta, mensaje: string) => void;
}) {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const { etiqueta: etiquetaMedio } = useMediosVenta();
    const [v, setV] = useState(venta);
    const [vista, setVista] = useState<Vista>("detalle");
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [motivo, setMotivo] = useState("");
    const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
    const [devolucion, setDevolucion] = useState<Devolucion>(() => Object.fromEntries(
        venta.items.map(i => [i.productoId, { cantidad: "0", vuelveAlStock: true }])));

    useEffect(() => {
        const alApretar = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
        document.addEventListener("keydown", alApretar);
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", alApretar); document.body.style.overflow = anterior; };
    }, [onCerrar]);

    // Cobrada con el QR de la caja: al anular o devolver, Mercado Pago le devuelve la plata al cliente
    const conQr = v.qr !== null;
    const devuelto = Number(v.montoDevuelto ?? 0);

    const ir = (nueva: Vista) => { setVista(nueva); setError(null); setMotivo(""); };

    /** Corre una operación que devuelve la venta actualizada */
    const operar = async (accion: () => Promise<Venta>, ok: string, fallo: string) => {
        setOcupado(true);
        setError(null);
        try {
            const nueva = await accion();
            setV(nueva);
            setVista("detalle");
            setMotivo("");
            onCambio(nueva, ok);
        } catch (e) {
            setError(primerError(extraerErrores(e, fallo)) ?? fallo);
        } finally {
            setOcupado(false);
        }
    };

    const anular = () => {
        if (!motivo.trim()) { setError("Indicá por qué se anula la venta."); return; }
        void operar(() => adminService.anularVenta(v.id, motivo.trim()),
            `Venta #${v.id} anulada: no cuenta en la caja y el stock volvió.${conQr ? " Mercado Pago le devuelve el total al cliente." : " La plata se le devuelve a mano."}`,
            "No se pudo anular la venta.");
    };

    const itemsADevolver = v.items
        .map(i => ({ item: i, pedido: devolucion[i.productoId] }))
        .filter(({ pedido }) => pedido && Number(pedido.cantidad) > 0);
    const montoADevolver = itemsADevolver.reduce((t, { item, pedido }) => t + Number(item.precioUnitario) * Number(pedido.cantidad), 0);

    const devolver = () => {
        if (itemsADevolver.length === 0) { setError("Indicá cuántas unidades se devuelven."); return; }
        for (const { item, pedido } of itemsADevolver) {
            const n = Number(pedido.cantidad);
            if (!Number.isInteger(n) || n > quedanPorDevolver(item)) {
                setError(`${item.nombre}: se pueden devolver hasta ${quedanPorDevolver(item)} unidades.`);
                return;
            }
        }
        if (!motivo.trim()) { setError("Indicá por qué se devuelve."); return; }
        void operar(() => adminService.devolverVenta(v.id, {
            motivo: motivo.trim(),
            items: itemsADevolver.map(({ item, pedido }) => ({ productoId: item.productoId, cantidad: Number(pedido.cantidad), vuelveAlStock: pedido.vuelveAlStock })),
        }), `Devolución registrada en la venta #${v.id}: ${formatMonto(montoADevolver)}.${conQr ? " Mercado Pago se lo devuelve al cliente." : " La plata se le devuelve a mano."}`,
        "No se pudo registrar la devolución.");
    };

    const cambiarCliente = (nuevo: ClienteBusqueda | null) => void operar(
        () => adminService.cambiarClienteVenta(v.id, nuevo?.id ?? null),
        nuevo ? `La venta #${v.id} quedó a nombre de ${nuevo.nombre} ${nuevo.apellido}.` : `La venta #${v.id} quedó como venta al público.`,
        "No se pudo cambiar el cliente.");

    const verificar = (verificada: boolean) => void operar(() => adminService.verificarVenta(v.id, verificada),
        verificada ? `Venta #${v.id} verificada.` : `Se quitó la verificación de la venta #${v.id}.`, "No se pudo cambiar la verificación.");


    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal detalle-reserva" role="dialog" aria-modal="true" aria-labelledby="venta-titulo" onClick={e => e.stopPropagation()}>
                <div className="detalle-reserva__cabecera">
                    <div>
                        <h3 className="modal__titulo" id="venta-titulo">Venta #{v.id}</h3>
                        <span className={`admin-chip ${TONO_ESTADO_VENTA[v.estado]}`}>{ETIQUETA_ESTADO_VENTA[v.estado]}</span>
                    </div>
                    <button type="button" className="detalle-reserva__cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
                </div>

                <ul className="detalle-reserva__datos">
                    <li><Receipt size={15} /> {formatFechaHora(v.fecha)} · {etiquetaMedio(v.medio)}</li>
                    <li><UserRound size={15} /> {v.clienteNombre ?? "Venta al público"} · registró {v.registradaPor}</li>
                </ul>

                {v.medio === "CUENTA_DNI" && v.estado === "COBRADA" && (
                    <VerificacionCuentaDni verificado={v.verificada === true} verificadoAt={v.verificadaAt}
                        puedeCambiar={esAdmin} ocupado={ocupado} onCambiar={verificar} />
                )}

                <div>
                    <h4 className="detalle-reserva__subtitulo">Productos</h4>
                    <dl className="detalle-reserva__montos">
                        {v.items.map(i => (
                            <div key={i.productoId}>
                                <dt>
                                    {i.cantidad} × {i.nombre}
                                    {(i.devueltas ?? 0) > 0 && <span className="ventas-devueltas"> · {i.devueltas} {i.devueltas === 1 ? "devuelta" : "devueltas"}</span>}
                                </dt>
                                <dd>{formatMonto(Number(i.subtotal))}</dd>
                            </div>
                        ))}
                        <div className="detalle-reserva__total"><dt>Total</dt><dd className={v.estado === "ANULADA" ? "ventas-tachado" : undefined}>{formatMonto(Number(v.total))}</dd></div>
                        {devuelto > 0 && <div><dt>Devuelto</dt><dd>− {formatMonto(devuelto)}</dd></div>}
                        {v.estado === "COBRADA" && devuelto > 0 && <div className="detalle-reserva__total"><dt>Queda en la caja</dt><dd>{formatMonto(netoVenta(v))}</dd></div>}
                    </dl>
                </div>

                {v.estado === "ANULADA" && (
                    <div className="detalle-reserva__bloque">
                        <h4 className="detalle-reserva__subtitulo"><Ban size={13} /> Anulada</h4>
                        <p className="modal__descripcion">
                            {v.anuladaAt && formatFechaHora(v.anuladaAt)}{v.anuladaPor && ` · por ${v.anuladaPor}`}. Motivo: {v.motivoAnulacion}
                        </p>
                    </div>
                )}

                {v.devoluciones.length > 0 && (
                    <div>
                        <h4 className="detalle-reserva__subtitulo"><RotateCcw size={13} /> Devoluciones</h4>
                        <ul className="detalle-reserva__pagos">
                            {v.devoluciones.map(d => (
                                <li key={d.id}>
                                    <div>
                                        <span className="detalle-reserva__pago-monto">{formatMonto(Number(d.monto))}</span>
                                        <span className="detalle-reserva__pago-detalle">
                                            {d.items.map(i => `${i.cantidad} × ${i.nombre}${i.vuelveAlStock ? "" : " (no vuelve al stock)"}`).join(" · ")}
                                        </span>
                                        <span className="detalle-reserva__pago-detalle">{formatFechaHora(d.fecha)} · {d.registradaPor} · {d.motivo}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {v.estado === "ESPERANDO_PAGO" && v.qr && (
                    <Mensaje fijo tipo="ok">El QR de la caja espera el pago hasta el {formatFechaHora(v.qr.venceAt)}.</Mensaje>
                )}

                {/* ── Anular ── */}
                {vista === "anular" && (
                    <div className="detalle-reserva__bloque">
                        <h4 className="detalle-reserva__subtitulo"><Ban size={13} /> Anular la venta</h4>
                        <p className="modal__descripcion">
                            Deja de contar en la caja y el stock vuelve. {conQr
                                ? "Como se cobró con el QR, Mercado Pago le devuelve el total al cliente."
                                : "La plata se le devuelve a mano, por el mismo medio."}
                        </p>
                        <CampoInput id="venta-motivo" name="motivo" label="Motivo" value={motivo} required
                            onChange={e => { setMotivo(e.target.value.slice(0, 200)); setError(null); }} placeholder="Ej. error de carga, se cobró por otro medio" />
                    </div>
                )}

                {/* ── Devolver (ADMIN) ── */}
                {vista === "devolver" && (
                    <div className="detalle-reserva__bloque">
                        <h4 className="detalle-reserva__subtitulo"><RotateCcw size={13} /> Devolución</h4>
                        {v.items.filter(i => quedanPorDevolver(i) > 0).map(i => {
                            const pedido = devolucion[i.productoId] ?? { cantidad: "0", vuelveAlStock: true };
                            const cambiar = (cambios: Partial<typeof pedido>) => {
                                setDevolucion(d => ({ ...d, [i.productoId]: { ...pedido, ...cambios } }));
                                setError(null);
                            };
                            return (
                                <div key={i.productoId} className="ventas-devolucion__item">
                                    <CampoInput id={`dev-${i.productoId}`} name="cantidad" type="number" entero min={0} max={quedanPorDevolver(i)}
                                        label={`${i.nombre} (hasta ${quedanPorDevolver(i)})`} value={pedido.cantidad}
                                        onChange={e => cambiar({ cantidad: e.target.value })} />
                                    {Number(pedido.cantidad) > 0 && (
                                        <CampoToggle id={`dev-stock-${i.productoId}`} name="vuelveAlStock" label="Vuelve al stock"
                                            descripcion="Apagado si no sirve (abierto, roto)."
                                            checked={pedido.vuelveAlStock} onChange={e => cambiar({ vuelveAlStock: e.target.checked })} />
                                    )}
                                </div>
                            );
                        })}
                        <CampoInput id="venta-motivo" name="motivo" label="Motivo" value={motivo} required
                            onChange={e => { setMotivo(e.target.value.slice(0, 200)); setError(null); }} placeholder="Ej. producto vencido, se cobró de más" />
                        {montoADevolver > 0 && (
                            <p className="modal__descripcion">
                                Se devuelven <strong>{formatMonto(montoADevolver)}</strong> (cuenta en la caja de hoy). {conQr
                                    ? "Mercado Pago se lo devuelve al cliente."
                                    : "La plata se le devuelve a mano."}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Cambiar el cliente ── */}
                {vista === "cliente" && (
                    <div className="detalle-reserva__bloque">
                        <h4 className="detalle-reserva__subtitulo"><UserRound size={13} /> Cliente de la venta</h4>
                        <BuscadorCliente id="venta-nuevo-cliente" label="Nuevo cliente" cliente={cliente} onElegir={setCliente} avisarPerfilIncompleto={false} />
                    </div>
                )}

                {error && <Mensaje tipo="error">{error}</Mensaje>}

                <div className="detalle-reserva__acciones">
                    {vista === "detalle" ? <>
                        {puedeCambiarCliente(v) && (
                            <button type="button" className="accion accion--chica" onClick={() => ir("cliente")}><UserRound size={14} /> Cambiar cliente</button>
                        )}
                        {puedeDevolver(v, esAdmin) && (
                            <button type="button" className="accion accion--chica" onClick={() => ir("devolver")}><RotateCcw size={14} /> Devolución</button>
                        )}
                        {puedeAnular(v, esAdmin) && (
                            <button type="button" className="accion accion--chica accion--peligro" onClick={() => ir("anular")}><Ban size={14} /> Anular</button>
                        )}
                    </> : <>
                        <button type="button" className="accion accion--chica" onClick={() => ir("detalle")} disabled={ocupado}>Volver</button>
                        {vista === "anular" && (
                            <button type="button" className="accion accion--chica accion--peligro" onClick={anular} disabled={ocupado}>
                                {ocupado ? "Anulando..." : "Sí, anular"}
                            </button>
                        )}
                        {vista === "devolver" && (
                            <button type="button" className="accion accion--chica accion--primaria" onClick={devolver} disabled={ocupado}>
                                {ocupado ? "Registrando..." : "Registrar devolución"}
                            </button>
                        )}
                        {vista === "cliente" && <>
                            {v.clienteId !== null && (
                                <button type="button" className="accion accion--chica" onClick={() => cambiarCliente(null)} disabled={ocupado}>Dejar al público</button>
                            )}
                            <button type="button" className="accion accion--chica accion--primaria" onClick={() => cliente && cambiarCliente(cliente)} disabled={ocupado || !cliente}>
                                Guardar cliente
                            </button>
                        </>}
                    </>}
                </div>
            </div>
        </div>
    );
}
