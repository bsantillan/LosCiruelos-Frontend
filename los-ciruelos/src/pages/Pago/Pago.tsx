import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Clock, CreditCard,
    Hourglass, Pencil, ShieldCheck, Trash2, Wallet, XCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePago } from "../../hooks/usePago";
import { useReserva } from "../../hooks/useReserva";
import { mercadoPagoDisponible } from "../../config/mercadoPago";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import DetalleCancelacion from "../../components/DetalleCancelacion/DetalleCancelacion";
import Boton from "../../components/ui/Boton/Boton";
import BrickTarjeta from "../../components/BrickTarjeta/BrickTarjeta";
import EditorExtras from "../../components/EditorExtras/EditorExtras";
import BotonMercadoPago from "../../components/BotonMercadoPago/BotonMercadoPago";
import { reservaService } from "../../services/reservaService";
import type { ProductoPedido, ReservaResponse } from "../../types/reserva.types";
import { formatFecha, formatMonto, horaCorta, parseFechaHora } from "../../utils/fechas";
import {
    ETIQUETA_ESTADO, admiteCancelacion, estadoReembolso, tituloPagoAprobado, admitePagoOnline, esPartido, faltaParaSenia,
    montoCubierto, pagoEnProceso,
} from "../../utils/reservas";
import { marcarPagoEnMercadoPago } from "../../utils/retornoMercadoPago";
import "./Pago.css";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";

/* ─── CUENTA REGRESIVA ───────────────────────────── */
function segundosHasta(fecha: string | null): number | null {
    if (!fecha) return null;
    return Math.max(0, Math.floor((parseFechaHora(fecha).getTime() - Date.now()) / 1000));
}

function useSegundosRestantes(expiresAt: string | null): number | null {
    const [segundos, setSegundos] = useState(() => segundosHasta(expiresAt));
    const [expiresAnterior, setExpiresAnterior] = useState(expiresAt);
    if (expiresAt !== expiresAnterior) {
        setExpiresAnterior(expiresAt);
        setSegundos(segundosHasta(expiresAt));
    }

    useEffect(() => {
        if (!expiresAt) return;
        const timer = setInterval(() => {
            const restantes = segundosHasta(expiresAt) ?? 0;
            setSegundos(restantes);
            if (restantes === 0) clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    return segundos;
}

function formatReloj(segundos: number): string {
    const m = Math.floor(segundos / 60).toString().padStart(2, "0");
    const s = (segundos % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

/* ─── RESUMEN DE LA RESERVA ──────────────────────── */
interface EdicionExtras {
    guardando: boolean;
    error: string | null;
    onGuardar: (productos: ProductoPedido[]) => Promise<boolean>;
    limpiarError: () => void;
}

function ResumenReserva({ reserva, segundos, edicion }: {
    reserva: ReservaResponse;
    segundos: number | null;
    /** Si se pueden cambiar los productos (reserva PENDIENTE, antes de pagar) */
    edicion?: EdicionExtras;
}) {
    const pagado = Number(reserva.montoPagado);
    const bonificado = Number(reserva.montoBonificado ?? 0);
    const [editando, setEditando] = useState(false);

    return (
        <aside className="pago-resumen">
            <div className="pago-resumen__fila-titulo">
                <p className="pago-resumen__etiqueta">Tu reserva</p>
                <span className={`estado-reserva estado-reserva--${reserva.estado.toLowerCase()}`}>
                    {ETIQUETA_ESTADO[reserva.estado]}
                </span>
            </div>
            <p className="pago-resumen__cancha">Cancha {reserva.canchaNumero}</p>
            <p className="pago-resumen__fecha">
                <CalendarDays size={14} />
                {formatFecha(reserva.fechaReserva)}
            </p>
            <p className="pago-resumen__horario">
                {horaCorta(reserva.horaInicio)} – {horaCorta(reserva.horaFin)} hs
            </p>
            <dl className="pago-resumen__detalle">
                <div>
                    <dt>Cancha</dt>
                    <dd>{formatMonto(Number(reserva.montoCancha))}</dd>
                </div>
                {reserva.productos.map(p => (
                    <div key={p.productoId}>
                        <dt>
                            {p.nombre}
                            <span className="pago-resumen__cantidad">
                                {p.cantidad} × {formatMonto(Number(p.precioUnitario))}
                            </span>
                        </dt>
                        <dd>{formatMonto(Number(p.subtotal))}</dd>
                    </div>
                ))}
                <div className="pago-resumen__total">
                    <dt>Total</dt>
                    <dd>{formatMonto(Number(reserva.montoTotal))}</dd>
                </div>
                {(pagado > 0 || bonificado > 0) && (
                    <>
                        {pagado > 0 && (
                            <div className="pago-resumen__secundario">
                                <dt>Pagado</dt>
                                <dd>{formatMonto(pagado)}</dd>
                            </div>
                        )}
                        {bonificado > 0 && (
                            <div className="pago-resumen__secundario">
                                <dt>Bonificado por el club</dt>
                                <dd>{formatMonto(bonificado)}</dd>
                            </div>
                        )}
                        <div className="pago-resumen__secundario">
                            <dt>Pendiente</dt>
                            <dd>{formatMonto(Number(reserva.montoPendiente))}</dd>
                        </div>
                    </>
                )}
            </dl>

            {/* Los productos se pueden cambiar mientras la reserva no esté paga */}
            {edicion && !editando && (
                <button type="button" className="accion accion--chica pago-resumen__editar" onClick={() => setEditando(true)}>
                    <Pencil size={13} />
                    {reserva.productos.length > 0 ? "Editar productos" : "Agregar pelotas, paletas u otros"}
                </button>
            )}
            {edicion && editando && (
                <EditorExtras
                    reserva={reserva}
                    guardando={edicion.guardando}
                    error={edicion.error}
                    onGuardar={async productos => {
                        const ok = await edicion.onGuardar(productos);
                        if (ok) setEditando(false);
                        return ok;
                    }}
                    onVolver={() => { setEditando(false); edicion.limpiarError(); }}
                />
            )}

            {segundos !== null && segundos > 0 && (
                <div className={`pago-reloj${segundos <= 120 ? " pago-reloj--urgente" : ""}`} role="timer" aria-live="off">
                    <Clock size={15} />
                    <span>Turno reservado por <strong>{formatReloj(segundos)}</strong></span>
                </div>
            )}
        </aside>
    );
}

/* ─── PANTALLA DE ESTADO ─────────────────────────── */
function Estado({ icono, variante, titulo, children }: {
    icono: React.ReactNode;
    variante: "exito" | "info" | "error";
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div className="pago-estado">
            <div className={`pago-estado__icono pago-estado__icono--${variante}`}>{icono}</div>
            <h2 className="pago-estado__titulo">{titulo}</h2>
            {children}
        </div>
    );
}

function PaginaCentrada({ children }: { children: React.ReactNode }) {
    return (
        <div className="pago-pagina">
            <div className="pago-contenedor pago-contenedor--centrado">{children}</div>
        </div>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Pago() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario } = useAuth();

    // La reserva que viene de /reservas se muestra al instante; igual se pide al servidor
    // Desde Mis reservas se llega con la opción ya elegida (seña o total): se salta ese paso
    // y "Volver" regresa a Mis reservas
    const estadoNavegacion = location.state as {
        reserva?: ReservaResponse;
        pagarTotal?: boolean;
        desde?: "mis-reservas";
    } | null;
    const desdeState = estadoNavegacion?.reserva;
    const desdeMisReservas = estadoNavegacion?.desde === "mis-reservas";
    const opcionInicial = estadoNavegacion?.pagarTotal;
    const {
        reserva, cargando, noEncontrada, etapa, pago, resultado, motivoRechazo,
        iniciando, error, iniciar, procesar, reintentar, cambiarOpcion, recargar,
        esperarMercadoPago, esperandoMercadoPago, esperaAgotada,
        modificarExtras, guardandoExtras, errorExtras, setErrorExtras,
    } = usePago(id, desdeState && String(desdeState.id) === id ? desdeState : null);
    const { cancelar, cancelando, error: errorCancelar, setError: setErrorCancelar } = useReserva();
    const [opcionElegida, setOpcionElegida] = useState<boolean | null>(null);
    const [metodo, setMetodo] = useState<"tarjeta" | "mercadopago">("tarjeta");
    const [modalCancelar, setModalCancelar] = useState(false);

    const esPendiente = reserva?.estado === "PENDIENTE";
    const segundos = useSegundosRestantes(esPendiente ? reserva?.expiresAt ?? null : null);
    const finalizado = etapa === "aprobado" || etapa === "en_proceso";
    const vencida = reserva !== null && !finalizado && resultado?.estado !== "A_REEMBOLSAR" && (
        reserva.estado === "EXPIRADA" ||
        (esPendiente && segundos === 0 && !pagoEnProceso(reserva))
    );

    // Cuando el contador llega a cero se libera el turno en el acto (el job lo haría en ≤ 1 min).
    // Un solo intento por reserva: si el servidor responde 409 no hay que insistir.
    const expiracionPedida = useRef<number | null>(null);
    useEffect(() => {
        if (!vencida || !reserva || reserva.estado !== "PENDIENTE") return;
        if (expiracionPedida.current === reserva.id) return;
        expiracionPedida.current = reserva.id;
        reservaService.expirar(reserva.id)
            .catch(() => undefined) // 409 si el reloj del servidor todavía no llegó: lo hará el job
            .finally(() => { void recargar().catch(() => undefined); });
    }, [vencida, reserva, recargar]);

    // /pago/resultado solo acepta el regreso de la preferencia que se mostró acá.
    // Se marca al mostrar el botón de Mercado Pago (además del clic), por si no se detecta el clic.
    const preferenciaVisible = etapa === "pagar" && metodo === "mercadopago" ? pago?.preferenceId ?? null : null;
    useEffect(() => {
        if (reserva && preferenciaVisible) marcarPagoEnMercadoPago(reserva.id, preferenciaVisible);
    }, [reserva, preferenciaVisible]);

    // Con la opción elegida en Mis reservas se inicia el pago directamente (una sola vez)
    const autoIniciado = useRef(false);
    const saltarEleccion = desdeMisReservas && opcionInicial !== undefined;
    useEffect(() => {
        if (!saltarEleccion || autoIniciado.current || cargando || !reserva || etapa !== "eleccion") return;
        if (!admitePagoOnline(reserva)) return;
        autoIniciado.current = true;
        void iniciar(opcionInicial!);
    }, [saltarEleccion, cargando, reserva, etapa, iniciar, opcionInicial]);

    /*
     * "Volver" siempre lleva al paso anterior:
     *   elegir cómo pagar (o rechazado) → elegir seña / total
     *   elegir seña / total             → la página anterior (reservar o Mis reservas)
     */
    const volver = () => {
        // Medio de pago (o rechazo) → elegir seña / total, salvo que esa elección se haya hecho
        // antes de entrar (Pagar saldo desde Mis reservas)
        if ((etapa === "pagar" || etapa === "rechazado") && !saltarEleccion && reserva && admitePagoOnline(reserva)) {
            cambiarOpcion();
            return;
        }
        if (desdeMisReservas) navigate("/mis-reservas");
        // Si se entró directo por URL no hay página anterior de la app: se va a reservar
        else if (location.key !== "default") navigate(-1);
        else navigate("/reservas");
    };

    const handleCancelar = async () => {
        if (!reserva) return;
        if (await cancelar(reserva.id)) navigate(desdeMisReservas ? "/mis-reservas" : "/reservas", { replace: true });
    };

    /* ── Cargando / no encontrada ── */
    if (!reserva) {
        if (cargando) {
            return (
                <PaginaCentrada>
                    <div className="pago-cargando">
                        <div className="reservas-cargando__spinner" />
                        <span>Cargando tu reserva...</span>
                    </div>
                </PaginaCentrada>
            );
        }
        return (
            <PaginaCentrada>
                <Estado icono={<AlertCircle size={28} />} variante="error" titulo="No encontramos esta reserva">
                    <p className="pago-estado__texto">
                        {noEncontrada ? "La reserva no existe o no es tuya." : error ?? "Intentá de nuevo en unos minutos."}
                    </p>
                    <Boton ancho="auto" onClick={() => navigate("/mis-reservas")}>
                        <span>Ver mis reservas</span>
                    </Boton>
                </Estado>
            </PaginaCentrada>
        );
    }

    // Opciones de monto: seña (lo que falta para completarla) o todo el saldo
    const pendiente = Number(reserva.montoPendiente);
    const faltaSenia = faltaParaSenia(reserva);
    const hayDosOpciones = faltaSenia > 0 && faltaSenia < pendiente;
    const pagarTotal = hayDosOpciones ? opcionElegida ?? false : true;
    const puedePagar = admitePagoOnline(reserva);
    const puedeCancelar = admiteCancelacion(reserva) && !finalizado;
    // Productos: solo en el paso de elegir seña o total (después el monto ya está fijado)
    const puedeEditarExtras = reserva.estado === "PENDIENTE" && etapa === "eleccion"
        && !vencida && !iniciando && !pagoEnProceso(reserva);

    const yaPaga = !finalizado && (reserva.estado === "PAGADA" || reserva.estado === "COMPLETADA");
    const cancelada = !finalizado && reserva.estado === "CANCELADA";
    const reembolso = cancelada ? estadoReembolso(reserva) : null;
    // Un partido lo arma el club y se paga ahí, entre los cuatro: no tiene pago online
    const partidoEnClub = !finalizado && esPartido(reserva) && !yaPaga && !cancelada;

    return (
        <div className="pago-pagina">
            {modalCancelar && (
                <ModalConfirmacion
                    titulo="¿Cancelar la reserva?"
                    icono={<Trash2 size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, cancelar"
                    textoCancelar="Volver"
                    cargando={cancelando}
                    error={errorCancelar}
                    onCerrar={() => { setModalCancelar(false); setErrorCancelar(null); }}
                    onConfirmar={handleCancelar}
                >
                    <DetalleCancelacion reserva={reserva} />
                </ModalConfirmacion>
            )}

            <div className="pago-contenedor">
                <div className="pago-header">
                    {/* Volver a la izquierda; Cancelar reserva a la derecha, siempre a la vista */}
                    <div className="pago-header__acciones">
                        {!finalizado && (
                            <button type="button" className="accion accion--chica" onClick={volver}>
                                <ArrowLeft size={14} />
                                Volver
                            </button>
                        )}
                        {!vencida && puedeCancelar && !esperandoMercadoPago && (
                            <button type="button" className="accion accion--chica accion--peligro" onClick={() => setModalCancelar(true)}>
                                <Trash2 size={14} />
                                Cancelar reserva
                            </button>
                        )}
                    </div>
                    <p className="etiqueta-pagina">Pago</p>
                    <h1 className="titulo-pagina">
                        {reserva.estado === "PENDIENTE" ? <>CONFIRMÁ TU <em>TURNO</em></> : <>TU <em>TURNO</em></>}
                    </h1>
                </div>

                <div className="pago-grid">
                    <ResumenReserva
                        reserva={reserva}
                        segundos={finalizado || vencida ? null : segundos}
                        edicion={puedeEditarExtras ? {
                            guardando: guardandoExtras,
                            error: errorExtras,
                            onGuardar: modificarExtras,
                            limpiarError: () => setErrorExtras(null),
                        } : undefined}
                    />

                    <section className="pago-panel" aria-live="polite">

                        {/* ── Reserva vencida ── */}
                        {vencida && (
                            <Estado icono={<Hourglass size={28} />} variante="error" titulo="Se venció el tiempo para pagar">
                                <p className="pago-estado__texto">
                                    El turno se liberó porque pasaron 15 minutos sin completar el pago.
                                    Si el horario sigue libre, podés reservarlo de nuevo.
                                </p>
                                <Boton ancho="auto" onClick={() => navigate("/reservas", { replace: true })}>
                                    <span>Elegir turno</span>
                                </Boton>
                            </Estado>
                        )}

                        {/* ── Cancelada / ya paga ── */}
                        {cancelada && (
                            <Estado icono={<XCircle size={28} />} variante="error" titulo="Esta reserva está cancelada">
                                {reembolso && (
                                    <p className="pago-estado__texto">
                                        {reembolso.etiqueta}: <strong>{formatMonto(reembolso.monto)}</strong>
                                    </p>
                                )}
                                <Boton ancho="auto" onClick={() => navigate("/reservas")}>
                                    <span>Elegir turno</span>
                                </Boton>
                            </Estado>
                        )}
                        {yaPaga && (
                            <Estado icono={<CheckCircle2 size={28} />} variante="exito" titulo="Esta reserva ya está paga">
                                <Boton ancho="auto" onClick={() => navigate("/mis-reservas")}>
                                    <span>Ver mis reservas</span>
                                </Boton>
                            </Estado>
                        )}
                        {partidoEnClub && (
                            <Estado icono={<CheckCircle2 size={28} />} variante="exito" titulo="Este partido se paga en el club">
                                <p className="pago-estado__texto">
                                    Lo armó el club: se paga ahí, como un todo, y lo dividen entre los jugadores.
                                    Faltan <strong>{formatMonto(Number(reserva.montoPendiente))}</strong>.
                                </p>
                                <Boton ancho="auto" onClick={() => navigate("/mis-reservas")}>
                                    <span>Ver mis reservas</span>
                                </Boton>
                            </Estado>
                        )}

                        {/* Desde Mis reservas: se está iniciando el pago con la opción ya elegida */}
                        {!vencida && etapa === "eleccion" && puedePagar && saltarEleccion && !error && (
                            <div className="pago-cargando">
                                <div className="reservas-cargando__spinner" />
                                <span>Preparando el pago...</span>
                            </div>
                        )}

                        {/* ── 1. Elegir cuánto pagar ── */}
                        {!vencida && etapa === "eleccion" && puedePagar && (!saltarEleccion || error) && (
                            <>
                                <h2 className="pago-panel__titulo">
                                    {montoCubierto(reserva) > 0 ? "Pagá el saldo" : "¿Cuánto querés pagar ahora?"}
                                </h2>
                                <div className="pago-opciones" role="radiogroup" aria-label="Monto a pagar">
                                    {hayDosOpciones && (
                                        <label className={`pago-opcion${!pagarTotal ? " pago-opcion--activa" : ""}`}>
                                            <input type="radio" name="monto" checked={!pagarTotal} onChange={() => setOpcionElegida(false)} />
                                            <span className="pago-opcion__titulo">Seña · {formatMonto(faltaSenia)}</span>
                                            <span className="pago-opcion__desc">
                                                Pagás una parte ahora para confirmar el turno y el resto en el club o desde Mis reservas.
                                            </span>
                                        </label>
                                    )}
                                    <label className={`pago-opcion${pagarTotal ? " pago-opcion--activa" : ""}`}>
                                        <input type="radio" name="monto" checked={pagarTotal} onChange={() => setOpcionElegida(true)} />
                                        <span className="pago-opcion__titulo">
                                            {montoCubierto(reserva) > 0 ? "Saldo" : "Total"} · {formatMonto(pendiente)}
                                        </span>
                                        <span className="pago-opcion__desc">Dejás el turno pago y no abonás nada en el club.</span>
                                    </label>
                                </div>

                                {error && <AvisoTransitorio tipo="error">{error}</AvisoTransitorio>}

                                <Boton cargando={iniciando} onClick={() => void iniciar(pagarTotal)}>
                                    <CreditCard size={17} />
                                    <span>Continuar al pago</span>
                                </Boton>
                            </>
                        )}

                        {/* Hay algo que impide pagar (por ejemplo, la seña ya se pagó en el club) */}
                        {!vencida && etapa === "eleccion" && !puedePagar && !yaPaga && !cancelada && error && (
                            <div className="pago-error" role="alert"><AlertCircle size={15} />{error}</div>
                        )}

                        {/* ── 2. Pagar: tarjeta (Card Payment Brick) o cuenta de Mercado Pago (Wallet Brick) ── */}
                        {!vencida && etapa === "pagar" && pago && (
                            <>
                                <div className="pago-monto">
                                    <span>{pago.pagarTotal ? "Total a pagar" : "Seña a pagar"}</span>
                                    <strong>{formatMonto(pago.monto)}</strong>
                                </div>
                                {error && <AvisoTransitorio tipo="error">{error}</AvisoTransitorio>}

                                {esperandoMercadoPago && (
                                    <div className="pago-esperando" role="status">
                                        <div className="reservas-cargando__spinner" />
                                        <div>
                                            <strong>Esperando la confirmación de Mercado Pago…</strong>
                                            <p>Completá el pago en la pestaña que se abrió. Esta pantalla se actualiza sola.</p>
                                        </div>
                                    </div>
                                )}
                                {esperaAgotada && (
                                    <div className="pago-error" role="alert">
                                        <AlertCircle size={15} />
                                        Todavía no recibimos la confirmación del pago. Si ya pagaste, revisá Mis reservas en unos minutos.
                                    </div>
                                )}

                                {mercadoPagoDisponible ? (
                                    <>
                                        {/* Selector de método: uno al lado del otro, el contenido abajo */}
                                        <div className="pago-metodos" role="tablist" aria-label="Medio de pago">
                                            <button
                                                type="button"
                                                role="tab"
                                                id="tab-tarjeta"
                                                aria-selected={metodo === "tarjeta"}
                                                aria-controls="panel-metodo"
                                                className={`pago-metodo${metodo === "tarjeta" ? " pago-metodo--activo" : ""}`}
                                                onClick={() => setMetodo("tarjeta")}
                                            >
                                                <CreditCard size={20} />
                                                <span className="pago-metodo__nombre">Tarjeta</span>
                                                <span className="pago-metodo__desc">Crédito o débito</span>
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                id="tab-mercadopago"
                                                aria-selected={metodo === "mercadopago"}
                                                aria-controls="panel-metodo"
                                                className={`pago-metodo${metodo === "mercadopago" ? " pago-metodo--activo" : ""}`}
                                                onClick={() => setMetodo("mercadopago")}
                                                disabled={!pago.preferenceId}
                                            >
                                                <Wallet size={20} />
                                                <span className="pago-metodo__nombre">Mercado Pago</span>
                                                <span className="pago-metodo__desc">Con tu cuenta</span>
                                            </button>
                                        </div>

                                        <div
                                            className="pago-metodo__panel"
                                            role="tabpanel"
                                            id="panel-metodo"
                                            aria-labelledby={metodo === "tarjeta" ? "tab-tarjeta" : "tab-mercadopago"}
                                        >
                                            {/* key: un pago nuevo (otro monto o reintento) crea formularios nuevos */}
                                            {metodo === "tarjeta" && (
                                                <BrickTarjeta
                                                    key={`tarjeta-${pago.id}`}
                                                    monto={pago.monto}
                                                    email={usuario?.email}
                                                    onPagar={procesar}
                                                />
                                            )}
                                            {metodo === "mercadopago" && pago.preferenceId && (
                                                <>
                                                    <p className="pago-metodo__ayuda">
                                                        Se abre Mercado Pago en otra pestaña (o la app en el celular). Podés pagar
                                                        con tu dinero disponible o con las tarjetas guardadas en tu cuenta.
                                                    </p>
                                                    <BotonMercadoPago
                                                        key={`wallet-${pago.id}`}
                                                        preferenceId={pago.preferenceId}
                                                        onAbrir={esperarMercadoPago}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="pago-error" role="alert">
                                        <AlertCircle size={15} />
                                        El pago online no está configurado (falta VITE_MP_PUBLIC_KEY).
                                    </div>
                                )}

                                <p className="pago-seguro">
                                    <ShieldCheck size={14} />
                                    Procesado por Mercado Pago. No guardamos los datos de tu tarjeta.
                                </p>
                            </>
                        )}

                        {/* ── 3a'. Cobrado pero la reserva ya no estaba activa (A_REEMBOLSAR) ── */}
                        {etapa === "rechazado" && resultado?.estado === "A_REEMBOLSAR" && (
                            <Estado icono={<AlertCircle size={28} />} variante="error" titulo="Recibimos el pago, pero la reserva ya no estaba activa">
                                <p className="pago-estado__texto">
                                    El pago llegó cuando la reserva ya había vencido o se había cancelado.
                                    El club te va a devolver el dinero; si tenés dudas, contactanos.
                                </p>
                                <Boton ancho="auto" onClick={() => navigate("/reservas")}>
                                    <span>Elegir otro turno</span>
                                </Boton>
                            </Estado>
                        )}

                        {/* ── 3a. Rechazado ── */}
                        {!vencida && etapa === "rechazado" && resultado?.estado !== "A_REEMBOLSAR" && (
                            <Estado icono={<XCircle size={28} />} variante="error" titulo="El pago fue rechazado">
                                <p className="pago-estado__texto">
                                    {motivoRechazo ?? "No se realizó ningún cobro. Revisá los datos o probá con otra tarjeta."}
                                    {esPendiente && " Tu turno sigue reservado mientras corra el tiempo."}
                                </p>
                                {error && <AvisoTransitorio tipo="error">{error}</AvisoTransitorio>}
                                <Boton ancho="auto" cargando={iniciando} onClick={reintentar}>
                                    <span>Intentar de nuevo</span>
                                </Boton>
                            </Estado>
                        )}

                        {/* ── 3b. Aprobado ── */}
                        {etapa === "aprobado" && (
                            <Estado icono={<CheckCircle2 size={28} />} variante="exito" titulo={tituloPagoAprobado(resultado?.estadoReserva ?? reserva.estado)}>
                                <p className="pago-estado__texto">
                                    {resultado && <>Pagaste <strong>{formatMonto(Number(resultado.monto))}</strong>. </>}
                                    {pendiente > 0
                                        ? <>Te queda abonar <strong>{formatMonto(pendiente)}</strong> en el club o desde Mis reservas.</>
                                        : "El turno está pago en su totalidad."}
                                </p>
                                <div className="pago-estado__acciones">
                                    <Boton ancho="auto" variante="secundario" onClick={() => navigate("/mis-reservas")}>
                                        <span>Mis reservas</span>
                                    </Boton>
                                    <Boton ancho="auto" onClick={() => navigate("/reservas")}>
                                        <span>Reservar otro turno</span>
                                    </Boton>
                                </div>
                            </Estado>
                        )}

                        {/* ── 3c. En revisión ── */}
                        {etapa === "en_proceso" && (
                            <Estado icono={<Hourglass size={28} />} variante="info" titulo="Estamos procesando tu pago">
                                <p className="pago-estado__texto">
                                    {mensajeEnProceso(resultado?.detalle)}
                                    {" "}Tu turno queda reservado mientras tanto. Esta pantalla se actualiza sola;
                                    también podés ver el resultado en Mis reservas.
                                </p>
                                <Boton ancho="auto" onClick={() => navigate("/mis-reservas")}>
                                    <span>Ir a mis reservas</span>
                                </Boton>
                            </Estado>
                        )}

                    </section>
                </div>
            </div>
        </div>
    );
}

function mensajeEnProceso(detalle: string | null | undefined): string {
    if (detalle === "pending_review_manual" || detalle === "pending_contingency") {
        return "Mercado Pago está revisando el pago; puede demorar hasta 2 días hábiles.";
    }
    return "Mercado Pago todavía está procesando el pago.";
}
