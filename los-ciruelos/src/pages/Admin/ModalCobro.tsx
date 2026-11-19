import { useEffect, useMemo, useState } from "react";
import { Banknote, Gift, Landmark, Minus, Plus, QrCode, Smartphone, Wallet } from "lucide-react";
import MontoLinea from "./MontoLinea";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import { COBRO_QR_HABILITADO } from "../../config/adminSecciones";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";
import type { CobroQr, MedioCobro } from "../../types/admin.types";
import type { Imputacion, ReservaResponse } from "../../types/reserva.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatHora, formatMonto, horaCorta } from "../../utils/fechas";
import { faltaParaSenia } from "../../utils/reservas";
import { Mensaje } from "./comunes";
import { conImputacion, imputacionDe, lineasCuenta, parteDe } from "./cuentaReserva";

type Medio = MedioCobro | "qr" | "bonificacion";

const MEDIOS: { valor: Medio; etiqueta: string; icono: typeof Banknote; ayuda: string; soloAdmin?: boolean }[] = [
    { valor: "efectivo", etiqueta: "Efectivo", icono: Banknote, ayuda: "" },
    {
        valor: "transferencia", etiqueta: "Transferencia MP", icono: Smartphone,
        ayuda: "Una transferencia que ya entró a la cuenta de Mercado Pago del club.",
    },
    {
        valor: "cuenta-dni", etiqueta: "Cuenta DNI", icono: Landmark,
        ayuda: "Cobralo desde la app del banco y registralo acá. Queda sin verificar hasta que el ADMIN lo controle en la cuenta.",
    },
    {
        valor: "qr", etiqueta: "QR de la caja", icono: QrCode,
        ayuda: "Se le asigna el monto al QR del mostrador: el cliente lo escanea con Mercado Pago y el cobro se registra solo.",
    },
    {
        valor: "bonificacion", etiqueta: "Bonificación", icono: Gift, soloAdmin: true,
        ayuda: "No se le cobra al cliente: cubre lo elegido, pero no es plata cobrada y no se devuelve si se cancela.",
    },
];

/** Cada cuánto se consulta el cobro con QR mientras el cliente paga */
const CONSULTA_QR_MS = 3000;
const MAX_PARTES = 12;

/**
 * Cobrar en el club: efectivo, Mercado Pago cargado a mano, Cuenta DNI, el QR de la caja o (solo
 * ADMIN) bonificación. El monto no se escribe: sale de lo que se tilda (la cancha, cada producto)
 * y, si la cuenta se divide, de en cuántas partes y qué líneas entran en la división. Para un
 * pago parcial se ajusta el monto de una línea, así el cobro siempre dice qué cubre. Dividiendo,
 * se cobra una parte tras otra sin cerrar.
 */
export default function ModalCobro({ reserva: inicial, titulo = "Cobrar", onCerrar, onCobrado }: {
    reserva: ReservaResponse;
    titulo?: string;
    onCerrar: () => void;
    /** cobrado: plata cobrada; bonificado: lo cubierto sin cobrar; completo: la reserva quedó sin saldo */
    onCobrado: (resultado: { cobrado: number; bonificado: number; completo: boolean }) => void;
}) {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const [reserva, setReserva] = useState(inicial);
    const pendiente = Number(reserva.montoPendiente);
    const senia = reserva.tipo === "PARTIDO" ? 0 : faltaParaSenia(reserva);
    const lineas = useMemo(() => lineasCuenta(reserva).filter(l => l.pendiente > 0), [reserva]);

    // Qué se cobra y cómo se divide
    const [elegidas, setElegidas] = useState<Set<string>>(() => new Set(lineasCuenta(inicial).filter(l => l.pendiente > 0).map(l => l.clave)));
    const [partes, setPartes] = useState(1);
    // Por defecto se divide la cancha; los productos suelen ser de uno solo
    const [divididas, setDivididas] = useState<Set<string>>(() => new Set(["CANCHA"]));
    // Monto ajustado a mano en una línea (pago parcial de esa línea)
    const [ajustes, setAjustes] = useState<Record<string, string>>({});
    const [editando, setEditando] = useState<string | null>(null);

    const [medio, setMedio] = useState<Medio>("efectivo");
    const [motivo, setMotivo] = useState("");
    const [cobrando, setCobrando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Dividiendo: lo cubierto hasta ahora y cuántas partes
    const [acumulado, setAcumulado] = useState({ cobrado: 0, bonificado: 0, partes: 0 });
    // Cobro con QR asignado a la caja, esperando que el cliente pague
    const [qr, setQr] = useState<CobroQr | null>(null);
    const esperandoQr = qr?.estado === "EN_PROCESO";

    const montoLinea = (clave: string) => {
        const l = lineas.find(x => x.clave === clave);
        if (!l || !elegidas.has(clave)) return 0;
        if (ajustes[clave] !== undefined) return Math.max(0, Math.min(l.pendiente, Number(ajustes[clave]) || 0));
        return parteDe(l, partes, divididas.has(clave));
    };
    const valor = Math.round(lineas.reduce((s, l) => s + montoLinea(l.clave), 0) * 100) / 100;

    const cambiar = (accion: () => void) => { accion(); setAjustes({}); setEditando(null); setError(null); };
    const alternar = (set: Set<string>, clave: string) => {
        const nuevo = new Set(set);
        if (nuevo.has(clave)) nuevo.delete(clave); else nuevo.add(clave);
        return nuevo;
    };
    const soloCancha = () => cambiar(() => setElegidas(new Set(["CANCHA"])));
    const todo = () => cambiar(() => setElegidas(new Set(lineas.map(l => l.clave))));
    const sena = () => {
        setElegidas(new Set(["CANCHA"])); setPartes(1); setAjustes({ CANCHA: String(senia) }); setEditando(null); setError(null);
    };

    /** Las líneas que cubre el cobro (solo si el backend ya las acepta) */
    const imputaciones = (): Imputacion[] | undefined => conImputacion(reserva)
        ? lineas.filter(l => montoLinea(l.clave) > 0).map(l => imputacionDe(l, montoLinea(l.clave)))
        : undefined;

    const cobrar = async () => {
        if (!(valor > 0)) { setError("Tildá qué se cobra."); return; }
        setCobrando(true);
        setError(null);
        try {
            const esBonificacion = medio === "bonificacion";
            if (medio === "qr") {
                setQr(await adminService.iniciarCobroQr(reserva.id, valor, imputaciones()));
                setCobrando(false);
                return;
            }
            if (esBonificacion) await adminService.bonificar(reserva.id, { monto: valor, motivo: motivo.trim() || null, imputaciones: imputaciones() });
            else await adminService.registrarCobro(reserva.id, valor, medio, imputaciones());
            const total = {
                cobrado: acumulado.cobrado + (esBonificacion ? 0 : valor),
                bonificado: acumulado.bonificado + (esBonificacion ? valor : 0),
                partes: acumulado.partes + 1,
            };
            // Dividiendo y con saldo: se queda abierto para la parte siguiente
            if (partes > 1 && valor < pendiente) {
                const actualizada = await adminService.reserva(reserva.id);
                setReserva(actualizada);
                setAcumulado(total);
                setAjustes({});
                setEditando(null);
                setElegidas(prev => new Set(lineasCuenta(actualizada).filter(l => l.pendiente > 0 && prev.has(l.clave)).map(l => l.clave)));
                setCobrando(false);
                return;
            }
            onCobrado({ cobrado: total.cobrado, bonificado: total.bonificado, completo: valor >= pendiente });
        } catch (e) {
            setError(primerError(extraerErrores(e, medio === "bonificacion" ? "No se pudo bonificar." : "No se pudo registrar el cobro.")) ?? null);
            setCobrando(false);
        }
    };

    /** Cerrar después de haber cobrado alguna parte: se avisa lo cubierto */
    const terminar = () => acumulado.partes > 0
        ? onCobrado({ cobrado: acumulado.cobrado, bonificado: acumulado.bonificado, completo: false })
        : onCerrar();

    // Mientras la caja espera, se consulta el estado (el webhook de Mercado Pago lo registra)
    const reservaId = reserva.id;
    useEffect(() => {
        if (!esperandoQr) return;
        const intervalo = setInterval(() => {
            adminService.estadoCobroQr(reservaId).then(setQr).catch(() => { /* se reintenta en la próxima vuelta */ });
        }, CONSULTA_QR_MS);
        return () => clearInterval(intervalo);
    }, [esperandoQr, reservaId]);

    // Cobrado: se avisa a la pantalla y se cierra
    const montoQr = qr ? Number(qr.monto) : 0;
    const qrCobrado = qr?.estado === "APROBADO";
    const restanteQr = qr ? Number(qr.montoPendiente) : pendiente;
    const { cobrado: previoCobrado, bonificado: previoBonificado } = acumulado;
    useEffect(() => {
        if (qrCobrado) onCobrado({ cobrado: previoCobrado + montoQr, bonificado: previoBonificado, completo: restanteQr <= 0 });
    }, [qrCobrado, montoQr, restanteQr, previoCobrado, previoBonificado, onCobrado]);

    // Cerrar con un QR esperando cancela el cobro y libera la caja (si ya se pagó, queda cobrado)
    const cerrar = async () => {
        if (!esperandoQr) { terminar(); return; }
        setCobrando(true);
        try {
            const final = await adminService.cancelarCobroQr(reserva.id);
            if (final.estado === "APROBADO") setQr(final);
            else terminar();
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo cancelar el cobro con QR.")) ?? null);
            setCobrando(false);
        }
    };

    if (qr && !qrCobrado) {
        return (
            <ModalConfirmacion
                titulo={esperandoQr ? "Esperando el pago en la caja" : "El cobro con QR no se completó"}
                icono={<QrCode size={22} />}
                textoConfirmar={esperandoQr ? "Cancelar cobro" : "Intentar de nuevo"}
                variante={esperandoQr ? "danger" : "default"}
                textoCancelar="Cerrar"
                cargando={cobrando}
                error={error}
                onCerrar={() => void cerrar()}
                onConfirmar={() => esperandoQr ? void cerrar() : setQr(null)}
            >
                <div className="admin-form">
                    {esperandoQr ? (
                        <p className="modal__descripcion">
                            El QR del mostrador tiene asignados <strong>{formatMonto(montoQr)}</strong>. Pedile al cliente que
                            lo escanee con la app de Mercado Pago: el cobro se registra solo. Vence a
                            las {formatHora(qr.venceAt)} hs.
                        </p>
                    ) : qr.estado === "A_REEMBOLSAR" ? (
                        <Mensaje fijo tipo="error">
                            Mercado Pago cobró otro monto o la reserva ya no estaba activa: hay que devolverle la plata al cliente.
                        </Mensaje>
                    ) : (
                        <Mensaje fijo tipo="error">El cobro venció o se canceló: no se cobró nada.</Mensaje>
                    )}
                </div>
            </ModalConfirmacion>
        );
    }

    const medios = MEDIOS.filter(m => !m.soloAdmin || esAdmin);
    const ayuda = MEDIOS.find(m => m.valor === medio)?.ayuda;
    const hayDivision = partes > 1 && lineas.some(l => elegidas.has(l.clave) && divididas.has(l.clave) && ajustes[l.clave] === undefined);
    const textoConfirmar = medio === "qr" ? "Asignar al QR"
        : medio === "bonificacion" ? (valor > 0 ? `Bonificar ${formatMonto(valor)}` : "Bonificar")
        : valor > 0 ? `Cobrar ${formatMonto(valor)}` : "Cobrar";

    return (
        <ModalConfirmacion
            titulo={titulo}
            icono={<Wallet size={22} />}
            clase="modal-cobro modal-cobro--columnas"
            textoConfirmar={textoConfirmar}
            textoCancelar={acumulado.partes > 0 ? "Listo" : "Volver"}
            cargando={cobrando}
            error={error}
            onCerrar={() => void cerrar()}
            onConfirmar={() => void cobrar()}
        >
            <div className="admin-form cobro">
                <p className="modal__descripcion">
                    {reserva.clienteNombre} · Cancha {reserva.canchaNumero} · <span style={{ textTransform: "capitalize" }}>{formatFecha(reserva.fechaReserva)}</span>,{" "}
                    {horaCorta(reserva.horaInicio)} a {horaCorta(reserva.horaFin)} hs. Falta cobrar <strong>{formatMonto(pendiente)}</strong>.
                </p>
                {acumulado.partes > 0 && (
                    <Mensaje fijo tipo="ok">
                        {acumulado.partes === 1 ? "Se cubrió 1 parte" : `Se cubrieron ${acumulado.partes} partes`} ({formatMonto(acumulado.cobrado + acumulado.bonificado)}).
                        Seguí con la próxima o tocá Listo.
                    </Mensaje>
                )}

                <div className="cobro__columnas">
                <div className="cobro__columna">
                {/* Qué se cobra */}
                <div className="cobro-lineas">
                    <div className="cobro-lineas__atajos">
                        <span className="cobro-lineas__titulo">Qué se cobra</span>
                        <button type="button" className="ra-chip" onClick={todo}>Todo</button>
                        {lineas.some(l => l.clave === "CANCHA") && lineas.length > 1 && (
                            <button type="button" className="ra-chip" onClick={soloCancha}>Solo la cancha</button>
                        )}
                        {senia > 0 && senia < pendiente && (
                            <button type="button" className="ra-chip" onClick={sena}>Seña · {formatMonto(senia)}</button>
                        )}
                    </div>
                    <ul>
                        {lineas.map(l => {
                            const tildada = elegidas.has(l.clave);
                            const dividida = divididas.has(l.clave);
                            const ajustada = ajustes[l.clave] !== undefined;
                            return (
                                <li key={l.clave} className={`cobro-linea${tildada ? " cobro-linea--activa" : ""}`}>
                                    <label className="cobro-linea__nombre">
                                        <input type="checkbox" checked={tildada} onChange={() => cambiar(() => setElegidas(s => alternar(s, l.clave)))} />
                                        <span>
                                            {l.producto ? `${l.producto.cantidad} × ${l.nombre}` : l.nombre}
                                            <small>{l.pagado > 0 ? `falta ${formatMonto(l.pendiente)} de ${formatMonto(l.subtotal)}` : formatMonto(l.subtotal)}</small>
                                        </span>
                                    </label>
                                    {partes > 1 && !ajustada && (
                                        <button type="button" className={`cobro-linea__dividir${dividida ? " cobro-linea__dividir--activa" : ""}`}
                                            aria-pressed={dividida} disabled={!tildada}
                                            title={dividida ? `Se divide en ${partes}` : "No se divide (lo paga uno)"}
                                            onClick={() => cambiar(() => setDivididas(s => alternar(s, l.clave)))}>
                                            {dividida ? `÷ ${partes}` : "Entero"}
                                        </button>
                                    )}
                                    <MontoLinea id={`monto-${l.clave}`} monto={montoLinea(l.clave)} valor={ajustes[l.clave]} maximo={l.pendiente}
                                        editando={editando === l.clave} deshabilitado={!tildada}
                                        etiqueta={`Monto de ${l.nombre.toLowerCase()}`} titulo="Cobrar otro monto de esta línea (pago parcial)"
                                        onEditar={() => setEditando(l.clave)}
                                        onCambio={v => { setAjustes(a => ({ ...a, [l.clave]: v })); setError(null); }}
                                        onListo={() => setEditando(null)} />
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* En cuántas partes se divide */}
                <div className="cobro-partes">
                    <span>Dividir en</span>
                    <div className="cobro-partes__control">
                        <button type="button" aria-label="Menos partes" disabled={partes <= 1} onClick={() => cambiar(() => setPartes(p => p - 1))}><Minus size={14} /></button>
                        <strong aria-live="polite">{partes === 1 ? "Sin dividir" : `${partes} partes`}</strong>
                        <button type="button" aria-label="Más partes" disabled={partes >= MAX_PARTES} onClick={() => cambiar(() => setPartes(p => p + 1))}><Plus size={14} /></button>
                    </div>
                </div>
                {hayDivision && (
                    <p className="modal__descripcion">
                        Cada parte paga lo dividido entre {partes}; lo marcado como <em>Entero</em> lo paga solo esta persona.
                    </p>
                )}
                </div>

                <div className="cobro__columna">
                <div className="cobro-total">
                    <span>{medio === "bonificacion" ? "Total a bonificar" : "Total a cobrar"}</span>
                    <strong>{formatMonto(valor)}</strong>
                </div>

                <div className="admin-opciones admin-opciones--dos" role="radiogroup" aria-label="Medio de pago">
                    {medios.map(m => {
                        const deshabilitado = m.valor === "qr" && !COBRO_QR_HABILITADO;
                        return (
                            <label key={m.valor} title={deshabilitado ? "El cobro con QR todavía no está habilitado" : undefined}
                                className={`admin-opcion${medio === m.valor ? " admin-opcion--activa" : ""}${deshabilitado ? " admin-opcion--deshabilitada" : ""}`}>
                                <input type="radio" name="medio" checked={medio === m.valor} disabled={deshabilitado}
                                    onChange={() => { setMedio(m.valor); setError(null); }} />
                                <m.icono size={18} />
                                {m.etiqueta}
                            </label>
                        );
                    })}
                </div>
                {!COBRO_QR_HABILITADO && <p className="modal__descripcion">El cobro con el QR de la caja todavía no está habilitado.</p>}
                {ayuda && <p className="modal__descripcion">{ayuda}</p>}
                {medio === "bonificacion" && (
                    <CampoInput id="motivo-bonificacion" name="motivo" label="Motivo (opcional)" value={motivo}
                        onChange={e => setMotivo(e.target.value.slice(0, 200))} placeholder="Ej. socio, torneo, cortesía" />
                )}
                </div>
                </div>
            </div>
        </ModalConfirmacion>
    );
}
