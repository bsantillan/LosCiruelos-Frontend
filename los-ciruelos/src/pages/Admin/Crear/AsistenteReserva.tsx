import { useEffect, useRef, useState } from "react";
import {
    ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock, Package, Repeat, Swords, UserRound, Users, Wallet, X,
} from "lucide-react";
import Pasos from "../../../components/ui/Pasos/Pasos";
import CampoInput from "../../../components/ui/CampoInput/CampoInput";
import CampoToggle from "../../../components/ui/CampoToggle/CampoToggle";
import Boton from "../../../components/ui/Boton/Boton";
import TablaProductos from "../../../components/SelectorProducto/TablaProductos";
import "../ReservasAdmin.css";
import { useAuth } from "../../../context/AuthContext";
import { useCanchas } from "../../../hooks/useCanchas";
import { useProductosPersonal } from "../../../hooks/useProductosPersonal";
import { adminService } from "../../../services/adminService";
import type { ClienteBusqueda, TurnoFijo } from "../../../types/admin.types";
import type { ReservaResponse } from "../../../types/reserva.types";
import { extraerErrores, primerError } from "../../../utils/apiErrors";
import { formatFecha, formatMonto, minToTime, timeToMin } from "../../../utils/fechas";
import { aPedido, cantidadesDe, lineasProductos, totalProductos, type Cantidades } from "../../../utils/productos";
import BuscadorCliente from "../BuscadorCliente";
import { Mensaje } from "../comunes";
import EditorJugadores from "../EditorJugadores";
import ElegirTurno, { type TurnoElegido } from "../ElegirTurno";
import { JUGADORES_VACIOS, jugadoresDe, validarJugadores, type Jugador } from "../jugadores";
import ModalAltaCliente from "../ModalAltaCliente";
import { diaDe, fechaParaEditar, resultadoGuardado } from "../turnosFijos";
import "../NuevaReserva.css";
import "./AsistenteReserva.css";

/** Qué se crea: una reserva de un cliente o un partido (suelto o fijo, se arman igual) */
export type TipoAlta = "reserva" | "partido";

/** Lo que se edita (solo ADMIN): un partido suelto o de un turno fijo, o la serie de un turno fijo */
export type Edicion =
    | { tipo: "partido"; reserva: ReservaResponse }
    | { tipo: "turno-fijo"; turno: TurnoFijo };

type IdPaso = "tipo" | "turno" | "jugadores" | "productos" | "resumen";

const pasosDe = (tipo: TipoAlta | null, conTipo: boolean): IdPaso[] => [
    ...(conTipo ? ["tipo" as const] : []),
    "turno",
    ...(tipo === "partido" ? ["jugadores" as const] : []),
    "productos",
    "resumen",
];

function nombrePaso(id: IdPaso, tipo: TipoAlta | null): string {
    switch (id) {
        case "tipo": return "Qué crear";
        case "turno": return tipo === "reserva" ? "Turno y cliente" : "Turno";
        case "jugadores": return "Jugadores";
        case "productos": return "Productos";
        case "resumen": return "Resumen";
    }
}

/** El estado inicial del asistente, vacío o con lo que se edita */
function inicial(edicion: Edicion | undefined, turnoInicial: TurnoElegido | undefined) {
    if (edicion?.tipo === "partido") {
        const r = edicion.reserva;
        const turno: TurnoElegido = {
            canchaId: r.canchaId, fecha: r.fechaReserva,
            slot: { inicio: timeToMin(r.horaInicio), fin: timeToMin(r.horaFin) },
        };
        return { turno, jugadores: jugadoresDe(r.jugadores), cantidades: cantidadesDe(r.productos) };
    }
    if (edicion?.tipo === "turno-fijo") {
        const t = edicion.turno;
        const turno: TurnoElegido = {
            canchaId: t.canchaId, fecha: fechaParaEditar(t.desde),
            slot: { inicio: timeToMin(t.horaInicio), fin: timeToMin(t.horaFin) },
        };
        return { turno, jugadores: jugadoresDe(t.jugadores), cantidades: cantidadesDe(t.productos) };
    }
    // Sin fecha propuesta: la elige el personal (salvo que venga de un horario libre de la grilla)
    return { turno: turnoInicial ?? { canchaId: null, fecha: null, slot: null } as TurnoElegido, jugadores: JUGADORES_VACIOS, cantidades: {} as Cantidades };
}

/**
 * Asistente (en un popup) para crear una reserva normal, un partido suelto o un turno fijo (partido fijo), con pasos
 * y la posibilidad de volver atrás sin perder lo cargado. También edita partidos y turnos fijos.
 *  - Reserva: qué crear → turno y cliente → productos → resumen.
 *  - Partido (suelto o fijo): qué crear → turno → jugadores → productos → resumen.
 * El EMPLEADO solo crea reservas normales (no ve el paso "Qué crear"); al editar tampoco se ve.
 */
export default function AsistenteReserva({ tipoInicial = null, fijoInicial = false, edicion, turnoInicial, onCerrar, onTerminado, onCobrar }: {
    tipoInicial?: TipoAlta | null;
    fijoInicial?: boolean;
    edicion?: Edicion;
    /**
     * Cancha, fecha y hora de inicio ya elegidas (al tocar un horario libre de la grilla): el paso del
     * turno muestra solo la duración, con la opción de elegir otro horario
     */
    turnoInicial?: TurnoElegido;
    /** Cerrar sin guardar */
    onCerrar: () => void;
    /** Se guardó: la pantalla de atrás recarga y muestra el mensaje */
    onTerminado: (mensaje: string) => void;
    /** "Cobrar ahora" de una reserva recién creada: la pantalla cierra este popup y abre el cobro */
    onCobrar: (reserva: ReservaResponse) => void;
}) {
    const cuerpoRef = useRef<HTMLDivElement>(null);
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const { canchas } = useCanchas();

    // El ADMIN elige qué crear; el EMPLEADO solo reservas normales
    const conTipo = esAdmin && !edicion;
    const [tipo, setTipo] = useState<TipoAlta | null>(edicion ? "partido" : esAdmin ? tipoInicial : "reserva");
    const [fijo, setFijo] = useState(edicion ? edicion.tipo === "turno-fijo" : fijoInicial);
    const elegirTipo = (t: TipoAlta, f: boolean) => {
        setTipo(t);
        setFijo(f);
        setError(null);
    };
    const pasos = pasosDe(tipo ?? "reserva", conTipo);
    // Con el tipo ya elegido arranca en el turno (Atrás vuelve a elegir)
    const [indice, setIndice] = useState(conTipo && tipoInicial ? 1 : 0);
    const paso = pasos[Math.min(indice, pasos.length - 1)];

    const [datosIniciales] = useState(() => inicial(edicion, turnoInicial));
    const [turno, setTurno] = useState<TurnoElegido>(datosIniciales.turno);
    const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
    const [altaCliente, setAltaCliente] = useState<string | null>(null);
    const [jugadores, setJugadores] = useState<Jugador[]>(datosIniciales.jugadores);
    const [cantidades, setCantidades] = useState<Cantidades>(datosIniciales.cantidades);

    // Bonificación (solo ADMIN, reservas normales): se crea ya bonificada, toda o una parte
    const [bonificar, setBonificar] = useState(false);
    const [bonifTodo, setBonifTodo] = useState(true);
    const [bonifMonto, setBonifMonto] = useState("");
    const [bonifMotivo, setBonifMotivo] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [reservaCreada, setReservaCreada] = useState<ReservaResponse | null>(null);
    // Desde la grilla: la cancha, la fecha y la hora de inicio están elegidas; solo se elige la duración
    const [inicioFijo] = useState(turnoInicial?.slot?.inicio);

    // Escape cierra (si no se está guardando)
    useEffect(() => {
        const alApretar = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando) onCerrar(); };
        document.addEventListener("keydown", alApretar);
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", alApretar); document.body.style.overflow = anterior; };
    }, [onCerrar, guardando]);

    // Productos: los que se ofrecen al reservar y, como extras, el resto del catálogo, con el stock del
    // horario (en un turno fijo, el del primer día). Al editar un partido, sus unidades cuentan como libres.
    const reservaId = edicion?.tipo === "partido" ? edicion.reserva.id : undefined;
    const stock = useProductosPersonal(turno.fecha ?? "",
        turno.slot ? minToTime(turno.slot.inicio) : null, turno.slot ? minToTime(turno.slot.fin) : null, reservaId);
    // Al editar un turno fijo (no es una reserva), sus unidades se suman a las libres del primer día
    const reservadas = edicion?.tipo === "turno-fijo" ? datosIniciales.cantidades : undefined;

    const esReserva = tipo === "reserva";
    const fechaFija = edicion?.tipo === "partido" && edicion.reserva.turnoFijoId !== null;
    const cancha = canchas.find(c => c.id === (turno.canchaId ?? canchas[0]?.id));
    const lineas = lineasProductos(stock.todos, cantidades);
    const precioCancha = turno.precioCancha ?? null;
    const total = (precioCancha ?? 0) + totalProductos(stock.todos, cantidades);

    const irA = (i: number) => {
        setIndice(i);
        setError(null);
        cuerpoRef.current?.closest(".modal")?.scrollTo({ top: 0, behavior: "smooth" });
    };

    /** El error del paso, o null si se puede seguir */
    function validar(id: IdPaso): string | null {
        switch (id) {
            case "tipo":
                return tipo ? null : "Elegí qué querés crear.";
            case "turno":
                if (!turno.fecha) return "Elegí la fecha.";
                if (!turno.slot) return "Elegí el horario.";
                if (esReserva && !cliente) return "Elegí el cliente.";
                if (esReserva && cliente && !cliente.perfilCompleto) {
                    return `${cliente.nombre} tiene el perfil incompleto (${!cliente.telefonoVerificado ? "celular sin verificar" : "falta categoría o posición"}): el sistema no permite reservarle hasta que lo complete.`;
                }
                return null;
            case "jugadores":
                return validarJugadores(jugadores).error ?? null;
            case "productos":
                return stock.cargando ? "Esperá a que cargue el stock del horario." : null;
            default:
                return null;
        }
    }

    const siguiente = () => {
        const e = validar(paso);
        if (e) { setError(e); return; }
        irA(indice + 1);
    };

    const guardar = async () => {
        if (!turno.slot || !turno.fecha) return;
        const fecha = turno.fecha;
        const canchaId = turno.canchaId ?? cancha?.id;
        if (!canchaId) return;
        const horaInicio = minToTime(turno.slot.inicio);
        const horaFin = minToTime(turno.slot.fin);
        const productos = aPedido(cantidades);
        setGuardando(true);
        setError(null);
        try {
            if (esReserva) {
                if (!cliente) return;
                const montoBonif = Number(bonifMonto);
                if (bonificar && !bonifTodo && (!(montoBonif > 0) || montoBonif > total)) {
                    setError(`El monto a bonificar tiene que ser mayor a $0 y no superar ${formatMonto(total)}.`);
                    return;
                }
                setReservaCreada(await adminService.crearReserva({
                    clienteId: cliente.id, canchaId, fechaReserva: fecha, horaInicio, horaFin, productos,
                    ...(esAdmin && bonificar ? {
                        bonificacion: { monto: bonifTodo ? null : montoBonif, motivo: bonifMotivo.trim() || null },
                    } : {}),
                }));
                return;
            }

            const validados = validarJugadores(jugadores);
            if (!validados.jugadores) { setError(validados.error ?? "Revisá los jugadores."); return; }
            const base = { canchaId, horaInicio, horaFin, jugadores: validados.jugadores, productos };

            if (edicion?.tipo === "partido") {
                const r = await adminService.editarPartido(edicion.reserva.id, { ...base, fechaReserva: fecha });
                onTerminado(`Se guardaron los cambios del partido #${r.id}.`);
            } else if (edicion?.tipo === "turno-fijo") {
                const t = await adminService.editarTurnoFijo(edicion.turno.id, { ...base, desde: fecha });
                onTerminado(resultadoGuardado(t, false));
            } else if (fijo) {
                const t = await adminService.crearTurnoFijo({ ...base, desde: fecha });
                onTerminado(resultadoGuardado(t, true));
            } else {
                const r = await adminService.crearPartido({ ...base, fechaReserva: fecha });
                onTerminado(`Partido #${r.id} creado: ${formatFecha(r.fechaReserva)}, ${minToTime(turno.slot.inicio)} hs. Total ${formatMonto(Number(r.montoTotal))}. Se cobra en el club.`);
            }
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo guardar.")) ?? "No se pudo guardar.");
        } finally {
            setGuardando(false);
        }
    };

    /* ── Textos del encabezado ── */
    const titulo = edicion
        ? edicion.tipo === "partido" ? `Editar partido #${edicion.reserva.id}` : "Editar turno fijo"
        : tipo === "partido" ? (fijo ? "Nuevo turno fijo" : "Nuevo partido") : "Nueva reserva";
    const subtitulo = edicion?.tipo === "turno-fijo"
        ? "Los partidos futuros sin pagos se rehacen con los datos nuevos; los que tienen pagos quedan como estaban."
        : edicion
            ? "Cambiá jugadores, cancha, horario o productos. Se puede reemplazar a cualquier jugador aunque el partido tenga pagos."
            : tipo === "partido"
                ? fijo
                    ? "El mismo partido todas las semanas, desde la fecha elegida. El horario queda bloqueado y los partidos se crean solos."
                    : "Hasta cuatro jugadores: el 1 es el responsable y tiene que tener cuenta; los demás son opcionales. No vence ni tiene seña: se cobra en el club."
                : "Reservá un turno a nombre de un cliente (por ejemplo, si llama o viene al club) y cobrá en el momento.";

    /* ── Reserva creada: cobrar ahora (vence en 15 min si no se paga) ── */
    if (reservaCreada) {
        return (
            <div className="modal-overlay">
                <div className="modal asistente-modal" role="dialog" aria-modal="true" aria-label="Reserva creada">
                    <ReservaCreada reserva={reservaCreada}
                        onListo={() => onTerminado(`Reserva #${reservaCreada.id} creada para ${reservaCreada.clienteNombre}.`)}
                        onCobrar={() => onCobrar(reservaCreada)} />
                </div>
            </div>
        );
    }

    const datosTurno = (
        <dl className="nr-datos">
            <div><dt>Tipo</dt><dd>{tipo === "reserva" ? "Reserva" : tipo === "partido" ? (fijo ? "Partido fijo (turno fijo)" : "Partido suelto") : "—"}</dd></div>
            <div><dt>Cancha</dt><dd>{turno.slot && cancha ? `Cancha ${cancha.numero}` : "—"}</dd></div>
            <div>
                <dt>{fijo && tipo === "partido" ? "Día" : "Fecha"}</dt>
                <dd style={{ textTransform: fijo && tipo === "partido" ? undefined : "capitalize" }}>
                    {!turno.fecha ? "—" : fijo && tipo === "partido" ? `Todos los ${diaDe(turno.fecha)}, desde el ${formatFecha(turno.fecha)}` : formatFecha(turno.fecha)}
                </dd>
            </div>
            <div><dt>Horario</dt><dd>{turno.slot ? `${minToTime(turno.slot.inicio)} a ${minToTime(turno.slot.fin)} hs` : "—"}</dd></div>
            {esReserva && <div><dt>Cliente</dt><dd>{cliente ? `${cliente.nombre} ${cliente.apellido}` : "—"}</dd></div>}
            {tipo === "partido" && (
                <div>
                    <dt>Responsable</dt>
                    <dd>{jugadores[0]?.tipo === "cliente" && jugadores[0].cliente ? `${jugadores[0].cliente.nombre} ${jugadores[0].cliente.apellido}` : "—"}</dd>
                </div>
            )}
        </dl>
    );

    const desglose = (
        <>
            {lineas.length > 0 && (
                <dl className="nr-datos asistente__lineas">
                    {lineas.map(l => (
                        <div key={l.id}><dt>{l.cantidad} × {l.nombre}</dt><dd>{formatMonto(l.subtotal)}</dd></div>
                    ))}
                </dl>
            )}
            <div className="nr-total">
                <span>{fijo && tipo === "partido" ? "Total por partido" : "Total"}</span>
                <strong>{turno.slot ? formatMonto(total) : "—"}</strong>
            </div>
            {precioCancha === null && turno.slot && (
                <p className="nr-ayuda">El precio de la cancha se confirma al guardar.</p>
            )}
        </>
    );

    return (
        <div className="modal-overlay">
            <div className="modal asistente-modal" role="dialog" aria-modal="true" aria-labelledby="asistente-titulo">
            {altaCliente !== null && (
                <ModalAltaCliente
                    texto={altaCliente}
                    onCerrar={() => setAltaCliente(null)}
                    onCreado={c => { setCliente(c); setAltaCliente(null); setError(null); }}
                />
            )}

            <div className="asistente-modal__cabecera">
                <div>
                    <h2 className="asistente-modal__titulo" id="asistente-titulo">{titulo}</h2>
                    <p className="asistente-modal__subtitulo">{subtitulo}</p>
                </div>
                <button type="button" className="detalle-reserva__cerrar" onClick={onCerrar} disabled={guardando} aria-label="Cerrar">
                    <X size={18} />
                </button>
            </div>
            <Pasos pasos={pasos.map(p => nombrePaso(p, tipo ?? "reserva"))} actual={indice} onIr={irA} />

            <div className="asistente asistente--completo" ref={cuerpoRef}>
                <div className="asistente__paso">
                    {/* ── Qué crear ── */}
                    {paso === "tipo" && (
                        <section className="admin-tarjeta">
                            <h2 className="admin-tarjeta__titulo">¿Qué querés crear?</h2>
                            <div className="asistente-tipos" role="radiogroup" aria-label="Qué crear">
                                <button type="button" role="radio" aria-checked={tipo === "reserva"}
                                    className={`asistente-tipo${tipo === "reserva" ? " asistente-tipo--activo" : ""}`}
                                    onClick={() => elegirTipo("reserva", fijo)}>
                                    <CalendarDays size={22} />
                                    <span className="asistente-tipo__titulo">Reserva</span>
                                    <span className="asistente-tipo__desc">Un turno a nombre de un cliente. Tiene seña y vence si no se paga.</span>
                                </button>
                                <button type="button" role="radio" aria-checked={tipo === "partido"}
                                    className={`asistente-tipo${tipo === "partido" ? " asistente-tipo--activo" : ""}`}
                                    onClick={() => elegirTipo("partido", fijo)}>
                                    {fijo ? <Repeat size={22} /> : <Swords size={22} />}
                                    <span className="asistente-tipo__titulo">Partido</span>
                                    <span className="asistente-tipo__desc">De uno a cuatro jugadores que arma el club. Suelto, o fijo todas las semanas. Se cobra en el club.</span>
                                </button>
                            </div>
                            {tipo === "partido" && (
                                <div className="asistente-modo">
                                    <CampoToggle id="as-fijo" name="fijo" label="Partido fijo (turno fijo)"
                                        descripcion={fijo
                                            ? "El mismo partido todas las semanas: el horario queda bloqueado y los partidos se crean solos."
                                            : "Apagado: un partido suelto, para una sola fecha."}
                                        checked={fijo} onChange={e => elegirTipo("partido", e.target.checked)} />
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── Turno (y cliente en una reserva) ── */}
                    {paso === "turno" && (
                        <>
                            <section className="admin-tarjeta">
                                <h2 className="admin-tarjeta__titulo asistente__titulo">
                                    <CalendarDays size={15} /> {fijo && tipo === "partido" ? "Turno de cada semana" : "Cancha, fecha y horario"}
                                </h2>
                                <ElegirTurno
                                    valor={turno}
                                    onChange={t => { setTurno(t); setError(null); }}
                                    inicioFijo={inicioFijo}
                                    actual={edicion ? datosIniciales.turno : undefined}
                                    fechaFija={fechaFija}
                                    ayudaFecha={fijo && tipo === "partido" && turno.fecha
                                        ? `Desde el ${formatFecha(turno.fecha)}, todos los ${diaDe(turno.fecha)}. El horario queda bloqueado todas las semanas.`
                                        : fechaFija ? "Es un partido de un turno fijo: no cambia de fecha. Para otra fecha, dá de baja esta semana y armá un partido aparte." : undefined}
                                />
                            </section>
                            {esReserva && (
                                <section className="admin-tarjeta">
                                    <h2 className="admin-tarjeta__titulo asistente__titulo"><UserRound size={15} /> Cliente</h2>
                                    <BuscadorCliente cliente={cliente} onElegir={c => { setCliente(c); setError(null); }}
                                        onCrear={texto => setAltaCliente(texto)} />
                                    {cliente && !cliente.perfilCompleto && (
                                        <Mensaje fijo tipo="error">
                                            {cliente.nombre} tiene el perfil incompleto ({!cliente.telefonoVerificado ? "celular sin verificar" : "falta categoría o posición"}): el sistema no permite reservarle hasta que lo complete.
                                        </Mensaje>
                                    )}
                                </section>
                            )}
                        </>
                    )}

                    {/* ── Jugadores ── */}
                    {paso === "jugadores" && (
                        <section className="admin-tarjeta">
                            <h2 className="admin-tarjeta__titulo asistente__titulo"><Users size={15} /> Jugadores</h2>
                            <p className="nr-ayuda asistente__ayuda">El 1 es el responsable y tiene que tener cuenta. Los demás pueden ser clientes o invitados sin cuenta.</p>
                            <EditorJugadores jugadores={jugadores} onChange={j => { setJugadores(j); setError(null); }} />
                        </section>
                    )}

                    {/* ── Productos ── */}
                    {paso === "productos" && (
                        <section className="admin-tarjeta">
                            <h2 className="admin-tarjeta__titulo asistente__titulo">
                                <Package size={15} /> Productos {fijo && tipo === "partido" && "de cada partido"}
                            </h2>
                            {stock.error && <Mensaje tipo="error">{stock.error}</Mensaje>}
                            <p className="nr-ayuda asistente__ayuda">Opcional. El stock es el del horario elegido{fijo && tipo === "partido" ? " (el del primer día)" : ""}.</p>
                            <TablaProductos ofrecidos={stock.ofrecidos} extras={stock.extras} cantidades={cantidades}
                                reservadas={reservadas} cargando={stock.cargando} onChange={setCantidades} />
                        </section>
                    )}

                    {/* ── Resumen ── */}
                    {paso === "resumen" && (
                        <div className="asistente-resumen">
                            <section className="admin-tarjeta asistente-resumen__bloque">
                                <h2 className="admin-tarjeta__titulo asistente__titulo"><CalendarDays size={15} /> Turno</h2>
                                {datosTurno}
                                {tipo === "partido" && (
                                    <ul className="asistente__jugadores">
                                        {jugadores.map((j, i) => (
                                            <li key={i}>
                                                <span>Jugador {i + 1}{i === 0 && " · responsable"}</span>
                                                <strong>
                                                    {j.tipo === "cliente" ? (j.cliente ? `${j.cliente.nombre} ${j.cliente.apellido}` : "—") : `${j.nombre} (invitado)`}
                                                </strong>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                            <section className="admin-tarjeta asistente-resumen__bloque">
                                <h2 className="admin-tarjeta__titulo asistente__titulo"><Wallet size={15} /> Total</h2>
                                {lineas.length === 0 && <p className="nr-ayuda">Sin productos.</p>}
                                {desglose}

                                {/* Solo ADMIN: no cobrarle al cliente (socio, torneo, cortesía), todo o una parte */}
                                {esAdmin && esReserva && (
                                    <div className="nr-bonif">
                                        <CampoToggle id="nr-bonificar" name="bonificar" label="Bonificar este turno"
                                            descripcion="No se le cobra al cliente: cubre el turno pero no cuenta como cobrado."
                                            checked={bonificar} onChange={e => { setBonificar(e.target.checked); setError(null); }} />
                                        {bonificar && (
                                            <>
                                                <div className="admin-opciones" role="radiogroup" aria-label="Cuánto bonificar">
                                                    <label className={`admin-opcion${bonifTodo ? " admin-opcion--activa" : ""}`}>
                                                        <input type="radio" name="bonif-cuanto" checked={bonifTodo} onChange={() => setBonifTodo(true)} />
                                                        Todo
                                                    </label>
                                                    <label className={`admin-opcion${!bonifTodo ? " admin-opcion--activa" : ""}`}>
                                                        <input type="radio" name="bonif-cuanto" checked={!bonifTodo} onChange={() => setBonifTodo(false)} />
                                                        Una parte
                                                    </label>
                                                </div>
                                                {!bonifTodo && (
                                                    <CampoInput id="nr-bonif-monto" name="monto" label="Monto a bonificar" type="number" prefijo="$"
                                                        min={1} max={total} value={bonifMonto} onChange={e => { setBonifMonto(e.target.value); setError(null); }} />
                                                )}
                                                <CampoInput id="nr-bonif-motivo" name="motivo" label="Motivo (opcional)" value={bonifMotivo}
                                                    onChange={e => setBonifMotivo(e.target.value.slice(0, 200))} placeholder="Ej. socio, torneo, cortesía" />
                                            </>
                                        )}
                                    </div>
                                )}
                                {tipo === "partido" && !edicion && (
                                    <p className="nr-ayuda">
                                        <Clock size={14} /> {fijo ? "Cada partido se cobra aparte, desde Reservas." : "No vence ni tiene seña: se cobra en el club, desde Reservas."}
                                    </p>
                                )}
                            </section>
                        </div>
                    )}

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <div className="asistente__acciones">
                        {indice > 0 ? (
                            <button type="button" className="accion" onClick={() => irA(indice - 1)} disabled={guardando}>
                                <ArrowLeft size={15} /> Atrás
                            </button>
                        ) : (
                            <button type="button" className="accion" onClick={onCerrar} disabled={guardando}>Cancelar</button>
                        )}
                        {paso === "resumen" ? (
                            <button type="button" className="accion accion--primaria" onClick={() => void guardar()} disabled={guardando || stock.cargando}>
                                <CalendarPlus size={15} />
                                {guardando ? "Guardando..." : edicion ? "Guardar cambios"
                                    : esReserva ? "Crear reserva" : fijo ? "Crear turno fijo" : "Crear partido"}
                            </button>
                        ) : (
                            <button type="button" className="accion accion--primaria" onClick={siguiente}>
                                Siguiente <ArrowRight size={15} />
                            </button>
                        )}
                    </div>
                </div>

            </div>
            </div>
        </div>
    );
}

/* ─── Reserva creada: cobrar ahora ───────────────── */
function ReservaCreada({ reserva, onListo, onCobrar }: {
    reserva: ReservaResponse;
    onListo: () => void;
    /** "Cobrar ahora": se cierra este popup y se abre el de cobro (no quedan uno encima del otro) */
    onCobrar: () => void;
}) {
    const pendiente = Number(reserva.montoPendiente);

    return (
        <div className="nr-creada">
            <div className="nr-creada">
                <CheckCircle2 size={30} className="nr-creada__icono" />
                <h2 className="nr-creada__titulo">Reserva #{reserva.id} para {reserva.clienteNombre}</h2>
                <p className="nr-creada__detalle">
                    Cancha {reserva.canchaNumero} · <span style={{ textTransform: "capitalize" }}>{formatFecha(reserva.fechaReserva)}</span> ·{" "}
                    {reserva.horaInicio} a {reserva.horaFin} hs · Total {formatMonto(Number(reserva.montoTotal))}
                </p>
                {Number(reserva.montoBonificado ?? 0) > 0 && (
                    <p className="nr-creada__detalle">Bonificado: {formatMonto(Number(reserva.montoBonificado))}</p>
                )}
                {pendiente <= 0 ? (
                    <Mensaje fijo tipo="ok">La reserva quedó cubierta con la bonificación: no hay nada que cobrar.</Mensaje>
                ) : reserva.estado === "PENDIENTE" ? (
                    <p className="nr-ayuda">
                        <Clock size={14} /> Queda reservada 15 minutos: si no se cobra al menos la seña ({formatMonto(Number(reserva.montoSenia))}), vence y el turno se libera.
                    </p>
                ) : (
                    <p className="nr-ayuda">La reserva quedó confirmada. Falta cobrar {formatMonto(pendiente)}: ahora o después, en el club.</p>
                )}
                <div className="nr-creada__acciones">
                    {pendiente > 0 && (
                        <Boton ancho="auto" onClick={onCobrar}>
                            <Wallet size={16} />
                            <span>Cobrar ahora</span>
                        </Boton>
                    )}
                    <Boton ancho="auto" variante={pendiente <= 0 ? "primario" : "secundario"} onClick={onListo}>
                        <span>Listo</span>
                    </Boton>
                </div>
            </div>
        </div>
    );
}
