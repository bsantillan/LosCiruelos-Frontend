import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, Package, Timer, Trash2, Users } from "lucide-react";
import { useMisReservas } from "../../hooks/useMisReservas";
import { useReserva } from "../../hooks/useReserva";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import DetalleCancelacion from "../../components/DetalleCancelacion/DetalleCancelacion";
import Boton from "../../components/ui/Boton/Boton";
import SelectorPeriodo, { type Periodo } from "../../components/ui/SelectorPeriodo/SelectorPeriodo";
import type { EstadoReserva, ReservaResponse } from "../../types/reserva.types";
import { formatDuracion, formatFecha, formatMonto, horaCorta, timeToMin } from "../../utils/fechas";
import {
    ETIQUETA_ESTADO, admiteCancelacion, admitePagoOnline, esPartido, esPendienteVigente, estadoReembolso,
    faltaParaSenia, pagoEnProceso,
} from "../../utils/reservas";
// Reutiliza reservas-cargando, reservas-error y reservas-panel-vacio
import "../Reservas/Reservas.css";
import "./MisReservas.css";

/** Solo lo que importa del pago, según el estado: lo pagado y, si falta, cuánto resta. */
function resumenPago(reserva: ReservaResponse, estado: EstadoReserva): {
    etiqueta: string;
    monto: number | null;
    detalle?: string;
    tono: "ok" | "pendiente" | "apagado";
} {
    const total = Number(reserva.montoTotal);
    const pagado = Number(reserva.montoPagado);
    // Lo que el club no le cobró: cubre el turno pero el cliente no lo pagó
    const bonificado = Number(reserva.montoBonificado ?? 0);
    const cubierto = pagado + bonificado;
    const resta = Number(reserva.montoPendiente);
    const conBonificacion = bonificado > 0 ? `Bonificado ${formatMonto(bonificado)} · ` : "";
    const enProceso = pagoEnProceso(reserva);

    if (enProceso) return { etiqueta: "Pago en revisión", monto: Number(enProceso.monto), tono: "pendiente" };
    // Turno jugado que todavía debe plata: lo que importa es el saldo
    if (reserva.debeSaldo) {
        return { etiqueta: "Saldo pendiente", monto: resta, detalle: `${conBonificacion}Pagaste ${formatMonto(pagado)}`, tono: "pendiente" };
    }
    switch (estado) {
        case "PAGADA":
        case "COMPLETADA":
            if (bonificado >= total) return { etiqueta: "Bonificado por el club", monto: total, tono: "ok" };
            return {
                etiqueta: "Pagado total", monto: total, tono: "ok",
                detalle: bonificado > 0 ? `Bonificado ${formatMonto(bonificado)}` : undefined,
            };
        case "SEÑADA":
            return {
                etiqueta: bonificado > 0 ? "Seña cubierta" : "Seña pagada", monto: cubierto,
                detalle: `${conBonificacion}Resta ${formatMonto(resta)}`, tono: "ok",
            };
        case "PARCIALMENTE_PAGADA":
            return { etiqueta: "Pago parcial", monto: cubierto, detalle: `${conBonificacion}Resta ${formatMonto(resta)}`, tono: "pendiente" };
        case "PENDIENTE":
            return { etiqueta: "Sin pagar", monto: total, detalle: "Total del turno", tono: "pendiente" };
        case "CONFIRMADA": // partido sin nada pagado
            return { etiqueta: "Sin pagar", monto: total, detalle: "Se paga en el club", tono: "pendiente" };
        default: { // CANCELADA, EXPIRADA
            const reembolso = estadoReembolso(reserva);
            if (reembolso) return { ...reembolso, detalle: "Reserva cancelada" };
            return pagado > 0
                ? { etiqueta: "Pagado", monto: pagado, tono: "apagado" }
                : { etiqueta: "Sin pagos", monto: null, tono: "apagado" };
        }
    }
}

function TarjetaReserva({ reserva, onCancelar }: {
    reserva: ReservaResponse;
    onCancelar: (r: ReservaResponse) => void;
}) {
    const navigate = useNavigate();
    const enProceso = pagoEnProceso(reserva) !== undefined;
    const pendiente = Number(reserva.montoPendiente);
    // Una PENDIENTE vencida que el job todavía no marcó se muestra como vencida
    const estado = reserva.estado === "PENDIENTE" && !esPendienteVigente(reserva) ? "EXPIRADA" : reserva.estado;
    const faltaSenia = faltaParaSenia(reserva);
    const dosOpciones = faltaSenia > 0 && faltaSenia < pendiente;
    const duracion = timeToMin(reserva.horaFin) - timeToMin(reserva.horaInicio);
    const pago = resumenPago(reserva, estado);

    /*
     * Con dos opciones (seña o total) va al paso de elegir cuánto pagar.
     * Con una sola (saldo o total) va directo a elegir el medio de pago.
     * En los dos casos "Volver" termina en Mis reservas.
     */
    const irAPagar = (pagarTotal?: boolean) => navigate(`/reservas/${reserva.id}/pago`, {
        state: { reserva, pagarTotal, desde: "mis-reservas" },
    });

    return (
        <article className={`mis-reservas__item${pago.tono === "apagado" ? " mis-reservas__item--inactiva" : ""}`}>
            <div className="mis-reservas__cancha-col">
                <p className="mis-reservas__cancha">Cancha {reserva.canchaNumero}</p>
                {esPartido(reserva) && <span className="mis-reservas__tipo">Partido</span>}
                <span className={`estado-reserva estado-reserva--${reserva.debeSaldo ? "parcialmente_pagada" : estado.toLowerCase()}`}>
                    {enProceso ? "Pago en revisión" : reserva.debeSaldo ? "Jugada · saldo pendiente" : ETIQUETA_ESTADO[estado]}
                </span>
            </div>

            <ul className="mis-reservas__datos">
                <li>
                    <CalendarDays size={15} aria-hidden="true" />
                    <span className="mis-reservas__fecha">{formatFecha(reserva.fechaReserva)}</span>
                </li>
                <li>
                    <Clock size={15} aria-hidden="true" />
                    <span>{horaCorta(reserva.horaInicio)} – {horaCorta(reserva.horaFin)} hs</span>
                </li>
                <li>
                    <Timer size={15} aria-hidden="true" />
                    <span>{formatDuracion(duracion)}</span>
                </li>
                {/* Partido armado por el club: sus jugadores (sin los teléfonos de los demás) */}
                {esPartido(reserva) && reserva.jugadores.length > 0 && (
                    <li>
                        <Users size={15} aria-hidden="true" />
                        <span>{[...reserva.jugadores].sort((a, b) => a.posicion - b.posicion).map(j => j.nombre).join(" · ")}</span>
                    </li>
                )}
                {reserva.productos.length > 0 && (
                    <li>
                        <Package size={15} aria-hidden="true" />
                        <span>{reserva.productos.map(p => `${p.cantidad} ${p.nombre.toLowerCase()}`).join(" · ")}</span>
                    </li>
                )}
            </ul>

            <div className={`mis-reservas__pago mis-reservas__pago--${pago.tono}`}>
                <span className="mis-reservas__pago-etiqueta">{pago.etiqueta}</span>
                {pago.monto !== null && <strong className="mis-reservas__pago-monto">{formatMonto(pago.monto)}</strong>}
                {pago.detalle && <span className="mis-reservas__pago-detalle">{pago.detalle}</span>}
            </div>

            <div className="mis-reservas__acciones">
                {enProceso && (
                    <Boton ancho="auto" variante="secundario" onClick={() => irAPagar()}>
                        <span>Ver estado</span>
                    </Boton>
                )}
                {!enProceso && admitePagoOnline(reserva) && (
                    <Boton ancho="auto" onClick={() => irAPagar(dosOpciones ? undefined : true)}>
                        <span>Pagar</span>
                    </Boton>
                )}
                {admiteCancelacion(reserva) && (
                    <Boton ancho="auto" variante="peligro" onClick={() => onCancelar(reserva)}>
                        <span>Cancelar</span>
                    </Boton>
                )}
            </div>
        </article>
    );
}

/* ─── FILTROS DEL HISTORIAL ──────────────────────── */
const FILTROS_ESTADO: { id: string; etiqueta: string; estados?: EstadoReserva[] }[] = [
    { id: "todas", etiqueta: "Todas" },
    { id: "jugadas", etiqueta: "Jugadas", estados: ["COMPLETADA"] },
    // Turnos jugados que siguen señados o con pago parcial (el historial solo trae turnos pasados)
    { id: "saldo", etiqueta: "Con saldo pendiente", estados: ["CONFIRMADA", "SEÑADA", "PARCIALMENTE_PAGADA"] },
    // Canceladas y vencidas juntas: para el cliente la diferencia no importa. El backend solo
    // devuelve las que tuvieron un pago (las demás son intentos abandonados y se ocultan)
    { id: "canceladas", etiqueta: "Canceladas", estados: ["CANCELADA", "EXPIRADA"] },
];

const TAMANIO_HISTORIAL = 10;
// Las próximas suelen ser pocas: se piden todas (máximo del backend) sin paginador
const FILTRO_PROXIMAS = { tipo: "proximas" as const, size: 50 };

function GrupoFiltro({ etiqueta, opciones, activa, onChange }: {
    etiqueta: string;
    opciones: { id: string; etiqueta: string }[];
    activa: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="mis-reservas__filtro" role="radiogroup" aria-label={etiqueta}>
            <span className="mis-reservas__filtro-etiqueta">{etiqueta}</span>
            <div className="mis-reservas__chips">
                {opciones.map(o => (
                    <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={activa === o.id}
                        className={`mis-reservas__chip${activa === o.id ? " mis-reservas__chip--activo" : ""}`}
                        onClick={() => onChange(o.id)}
                    >
                        {o.etiqueta}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function MisReservas() {
    const [filtroEstado, setFiltroEstado] = useState("todas");
    const [periodo, setPeriodo] = useState<Periodo>({});
    const [pagina, setPagina] = useState(0);

    const proximas = useMisReservas(FILTRO_PROXIMAS);
    const historial = useMisReservas({
        tipo: "historial",
        estado: FILTROS_ESTADO.find(f => f.id === filtroEstado)?.estados,
        desde: periodo.desde,
        hasta: periodo.hasta,
        page: pagina,
        size: TAMANIO_HISTORIAL,
    });

    const { cancelar, cancelando, error: errorCancelar, setError: setErrorCancelar } = useReserva();
    const [aCancelar, setACancelar] = useState<ReservaResponse | null>(null);

    const cambiarEstado = (id: string) => { setFiltroEstado(id); setPagina(0); };
    const cambiarPeriodo = (p: Periodo) => { setPeriodo(p); setPagina(0); };

    const confirmarCancelacion = async () => {
        if (!aCancelar) return;
        if (await cancelar(aCancelar.id)) {
            setACancelar(null);
            proximas.recargar();
            historial.recargar();
        }
    };

    const totalPaginas = historial.pagina?.totalPaginas ?? 0;
    const hayFiltros = filtroEstado !== "todas" || Boolean(periodo.desde || periodo.hasta);

    return (
        <div className="mis-reservas">
            {aCancelar && (
                <ModalConfirmacion
                    titulo="¿Cancelar la reserva?"
                    icono={<Trash2 size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, cancelar"
                    textoCancelar="Volver"
                    cargando={cancelando}
                    error={errorCancelar}
                    onCerrar={() => { setACancelar(null); setErrorCancelar(null); }}
                    onConfirmar={confirmarCancelacion}
                >
                    <DetalleCancelacion reserva={aCancelar} />
                </ModalConfirmacion>
            )}

            <div className="mis-reservas__contenedor">
                <div className="mis-reservas__header">
                    <div>
                        <p className="etiqueta-pagina">Mis reservas</p>
                        <h1 className="titulo-pagina">TUS <em>TURNOS</em></h1>
                    </div>
                    <Link to="/reservas" className="accion accion--primaria">
                        <CalendarPlus size={16} />
                        Reservar cancha
                    </Link>
                </div>

                {/* ── Próximas ── */}
                <section aria-labelledby="titulo-proximas">
                    <h2 className="mis-reservas__seccion" id="titulo-proximas">Próximas</h2>
                    {proximas.error && (
                        <div className="reservas-error" role="alert"><AlertCircle size={15} />{proximas.error}</div>
                    )}
                    {proximas.cargaInicial ? (
                        <div className="reservas-cargando">
                            <div className="reservas-cargando__spinner" />
                            <span>Cargando tus reservas...</span>
                        </div>
                    ) : proximas.reservas.length === 0 ? (
                        <div className="reservas-panel-vacio">
                            <CalendarDays size={28} />
                            <p>No tenés turnos reservados.</p>
                            <Link to="/reservas" className="accion accion--primaria">Reservá una cancha</Link>
                        </div>
                    ) : (
                        <div className="mis-reservas__lista">
                            {proximas.reservas.map(r => <TarjetaReserva key={r.id} reserva={r} onCancelar={setACancelar} />)}
                        </div>
                    )}
                </section>

                {/* ── Historial: filtros + paginado ── */}
                <section aria-labelledby="titulo-historial">
                    <div className="mis-reservas__historial-header">
                        <h2 className="mis-reservas__seccion" id="titulo-historial">Historial</h2>
                        {historial.pagina && (
                            <span className="mis-reservas__total">
                                {historial.pagina.totalElementos} {historial.pagina.totalElementos === 1 ? "reserva" : "reservas"}
                            </span>
                        )}
                    </div>

                    <div className="mis-reservas__filtros">
                        <GrupoFiltro etiqueta="Estado" opciones={FILTROS_ESTADO} activa={filtroEstado} onChange={cambiarEstado} />
                        <div className="mis-reservas__filtro">
                            <span className="mis-reservas__filtro-etiqueta">Período</span>
                            <SelectorPeriodo valor={periodo} onChange={cambiarPeriodo} rangoTodo={historial.pagina?.rango ?? null} />
                        </div>
                    </div>

                    {historial.error && (
                        <div className="reservas-error" role="alert"><AlertCircle size={15} />{historial.error}</div>
                    )}

                    {historial.cargaInicial ? (
                        <div className="reservas-cargando">
                            <div className="reservas-cargando__spinner" />
                        </div>
                    ) : historial.reservas.length === 0 ? (
                        <div className="reservas-panel-vacio">
                            <p>{hayFiltros ? "No hay reservas con estos filtros." : "Todavía no tenés reservas en el historial."}</p>
                        </div>
                    ) : (
                        <div className={`mis-reservas__lista${historial.cargando ? " mis-reservas__lista--cargando" : ""}`} aria-busy={historial.cargando}>
                            {historial.reservas.map(r => <TarjetaReserva key={r.id} reserva={r} onCancelar={setACancelar} />)}
                        </div>
                    )}

                    {totalPaginas > 1 && (
                        <nav className="mis-reservas__paginado" aria-label="Páginas del historial">
                            <button
                                type="button"
                                className="accion accion--chica"
                                onClick={() => setPagina(p => p - 1)}
                                disabled={pagina === 0 || historial.cargando}
                            >
                                <ChevronLeft size={14} />
                                Anterior
                            </button>
                            <span className="mis-reservas__pagina-actual">Página {pagina + 1} de {totalPaginas}</span>
                            <button
                                type="button"
                                className="accion accion--chica"
                                onClick={() => setPagina(p => p + 1)}
                                disabled={pagina + 1 >= totalPaginas || historial.cargando}
                            >
                                Siguiente
                                <ChevronRight size={14} />
                            </button>
                        </nav>
                    )}
                </section>
            </div>
        </div>
    );
}
