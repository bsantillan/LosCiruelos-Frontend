import { useCallback, useEffect, useRef, useState } from "react";
import { pagoService } from "../services/pagoService";
import { reservaService } from "../services/reservaService";
import type { DatosTarjetaMP, PagoResponse, ProductoPedido, ReservaResponse } from "../types/reserva.types";
import { estadoHttp, extraerErrores, primerError } from "../utils/apiErrors";
import { horaCorta, parseFechaHora } from "../utils/fechas";
import { mensajeDetallePago } from "../utils/mercadoPago";
import { pagoEnProceso, pagoIniciado, resultadoDePago } from "../utils/reservas";
import { marcarPagoEnMercadoPago } from "../utils/retornoMercadoPago";

/*
 * Flujo de pago con Mercado Pago:
 *
 *   eleccion ──iniciar(seña|total)──► pagar
 *   pagar: Payment Brick (tarjeta)  ──procesar(formData)──► aprobado | rechazado | en_proceso
 *          Wallet Brick (cuenta MP) ──esperarMercadoPago()──► (consulta la reserva) ──► aprobado | rechazado
 *   pagar ──cambiarOpcion()──► eleccion    (iniciar con otro monto reemplaza el pago anterior)
 *   rechazado ──reintentar()──► pagar      (/iniciar crea un pago nuevo con la misma opción)
 *   en_proceso ──(consulta la reserva)──► aprobado | rechazado
 *
 * El resultado se toma del pago concreto en GET /reservas/:id (lo actualiza el webhook),
 * así que recargar la página o entrar desde otro dispositivo retoma el mismo estado.
 */
export type EtapaPago = "eleccion" | "pagar" | "aprobado" | "rechazado" | "en_proceso";

export interface PagoActual {
    id: number;
    monto: number;
    pagarTotal: boolean;
    /** id de la preferencia de Mercado Pago (para los Bricks) */
    preferenceId: string | null;
}

/** Seguimiento de un pago que resuelve Mercado Pago por webhook */
interface Seguimiento {
    pagoId: number;
    motivo: "en_proceso" | "mercadopago";
    desde: number;
}

const INTERVALO_CONSULTA_MS = 3500;
const MAX_ESPERA_MS = 15 * 60 * 1000;
// Margen después del vencimiento: el webhook de un pago hecho a último momento puede llegar tarde
const MARGEN_VENCIMIENTO_MS = 60 * 1000;

function aPagoActual(p: PagoResponse, reserva: ReservaResponse, pagarTotal?: boolean): PagoActual {
    const monto = Number(p.monto);
    return {
        id: p.id,
        monto,
        pagarTotal: pagarTotal ?? monto >= Number(reserva.montoPendiente),
        preferenceId: p.paymentToken,
    };
}

export function usePago(reservaId: string | undefined, reservaInicial: ReservaResponse | null) {
    const [reserva, setReserva] = useState<ReservaResponse | null>(reservaInicial);
    const [cargando, setCargando] = useState(true);
    const [noEncontrada, setNoEncontrada] = useState(false);
    const [etapa, setEtapa] = useState<EtapaPago>("eleccion");
    const [pago, setPago] = useState<PagoActual | null>(null);
    const [resultado, setResultado] = useState<PagoResponse | null>(null);
    const [iniciando, setIniciando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seguimiento, setSeguimiento] = useState<Seguimiento | null>(null);
    /** La espera de Mercado Pago terminó sin respuesta (venció o pasaron 15 min) */
    const [esperaAgotada, setEsperaAgotada] = useState(false);

    const recargar = useCallback(async () => {
        if (!reservaId) return null;
        const actualizada = await reservaService.obtener(reservaId);
        setReserva(actualizada);
        return actualizada;
    }, [reservaId]);

    // Carga inicial desde el servidor
    useEffect(() => {
        let activo = true;
        if (!reservaId) return;
        reservaService.obtener(reservaId)
            .then(r => {
                if (!activo) return;
                setReserva(r);
                const enProceso = pagoEnProceso(r);
                const iniciado = pagoIniciado(r);
                if (enProceso) {
                    setPago(aPagoActual(enProceso, r));
                    setEtapa("en_proceso");
                    setSeguimiento({ pagoId: enProceso.id, motivo: "en_proceso", desde: Date.now() });
                } else if (iniciado?.paymentToken) {
                    // Se recargó la página con un pago iniciado: se retoma directamente
                    setPago(aPagoActual(iniciado, r));
                    setEtapa("pagar");
                }
            })
            .catch(e => {
                if (!activo) return;
                if (estadoHttp(e) === 404) setNoEncontrada(true);
                else setError(primerError(extraerErrores(e, "No se pudo cargar la reserva.")) ?? null);
            })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [reservaId]);

    // Consulta periódica mientras Mercado Pago resuelve el pago (webhook)
    const reservaRef = useRef(reserva);
    useEffect(() => { reservaRef.current = reserva; }, [reserva]);

    useEffect(() => {
        if (!seguimiento || !reservaId) return;
        let detenido = false;

        const consultar = async () => {
            if (detenido) return;
            const vence = reservaRef.current?.estado === "PENDIENTE" && reservaRef.current.expiresAt
                ? parseFechaHora(reservaRef.current.expiresAt).getTime() + MARGEN_VENCIMIENTO_MS
                : Infinity;
            if (Date.now() > vence || Date.now() - seguimiento.desde > MAX_ESPERA_MS) {
                detenido = true;
                setEsperaAgotada(true);
                setSeguimiento(null);
                return;
            }
            try {
                const r = await reservaService.obtener(reservaId);
                if (detenido) return;
                setReserva(r);
                const p = r.pagos.find(x => x.id === seguimiento.pagoId);
                const res = resultadoDePago(p);
                if (res === "pendiente") return;
                detenido = true;
                setSeguimiento(null);
                setResultado({ ...p!, estadoReserva: r.estado });
                setEtapa(res === "aprobado" ? "aprobado" : "rechazado");
            } catch {
                // se reintenta en la próxima vuelta
            }
        };

        const timer = setInterval(consultar, INTERVALO_CONSULTA_MS);
        // Al volver a esta pestaña (después de pagar en la de Mercado Pago) se consulta en el acto
        const alVolver = () => { if (document.visibilityState === "visible") void consultar(); };
        document.addEventListener("visibilitychange", alVolver);
        window.addEventListener("focus", alVolver);
        return () => {
            detenido = true;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", alVolver);
            window.removeEventListener("focus", alVolver);
        };
    }, [seguimiento, reservaId]);

    const iniciar = async (pagarTotal: boolean) => {
        if (!reserva) return;
        setIniciando(true);
        setError(null);
        setEsperaAgotada(false);
        try {
            const p = await pagoService.iniciar(reserva.id, pagarTotal);
            setPago(aPagoActual(p, reserva, pagarTotal));
            setResultado(null);
            setEtapa("pagar");
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo iniciar el pago. Intentá de nuevo.")) ?? null);
            // El estado pudo haber cambiado (venció, se pagó en el club, …)
            void recargar().catch(() => undefined);
        } finally {
            setIniciando(false);
        }
    };

    /** Pago con tarjeta (Payment Brick). Si rechaza la promesa, el Brick queda habilitado para corregir datos. */
    const procesar = useCallback(async (datos: DatosTarjetaMP): Promise<void> => {
        if (!reservaId) return;
        setError(null);
        try {
            const respuesta = await pagoService.procesar(Number(reservaId), datos);
            setResultado(respuesta);
            switch (respuesta.estado) {
                case "APROBADO":
                    setEtapa("aprobado");
                    break;
                case "EN_PROCESO":
                    setEtapa("en_proceso");
                    setSeguimiento({ pagoId: respuesta.id, motivo: "en_proceso", desde: Date.now() });
                    break;
                default:
                    setEtapa("rechazado");
            }
            // Montos y estado actualizados para el resumen
            void recargar().catch(() => undefined);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo procesar el pago. Intentá de nuevo.")) ?? null);
            throw e;
        }
    }, [reservaId, recargar]);

    /** El usuario abrió Mercado Pago en otra pestaña (Wallet Brick): se espera el webhook. */
    const pagoId = pago?.id;
    const preferenceId = pago?.preferenceId;
    const esperarMercadoPago = useCallback(() => {
        if (!pagoId) return;
        // Habilita /pago/resultado para el regreso de esta preferencia (la borra esa página)
        if (reservaId && preferenceId) marcarPagoEnMercadoPago(Number(reservaId), preferenceId);
        setEsperaAgotada(false);
        setSeguimiento(actual => actual?.pagoId === pagoId ? actual : { pagoId, motivo: "mercadopago", desde: Date.now() });
    }, [pagoId, preferenceId, reservaId]);

    /*
     * Cambiar los productos de una reserva PENDIENTE. El backend interpreta un POST /reservas
     * con la misma cancha, fecha e inicio como una modificación de la reserva (mismo id) y, si
     * cambia el monto, descarta el pago iniciado. Solo se ofrece en el paso de elegir seña o
     * total: el pago se inicia después, con el monto nuevo.
     */
    const [guardandoExtras, setGuardandoExtras] = useState(false);
    const [errorExtras, setErrorExtras] = useState<string | null>(null);
    const modificarExtras = async (productos: ProductoPedido[]): Promise<boolean> => {
        if (!reserva) return false;
        setGuardandoExtras(true);
        setErrorExtras(null);
        try {
            const actualizada = await reservaService.crear({
                canchaId: reserva.canchaId,
                fechaReserva: reserva.fechaReserva,
                horaInicio: horaCorta(reserva.horaInicio),
                horaFin: horaCorta(reserva.horaFin),
                productos,
            });
            setReserva(actualizada);
            return true;
        } catch (e) {
            setErrorExtras(primerError(extraerErrores(e, "No se pudieron guardar los cambios.")) ?? null);
            return false;
        } finally {
            setGuardandoExtras(false);
        }
    };

    const reintentar = () => {
        if (pago) void iniciar(pago.pagarTotal);
        else setEtapa("eleccion");
    };

    const cambiarOpcion = () => {
        setError(null);
        setSeguimiento(null);
        setEtapa("eleccion");
    };

    const motivoRechazo = mensajeDetallePago(resultado?.detalle);
    const esperandoMercadoPago = seguimiento?.motivo === "mercadopago";

    return {
        reserva, cargando, noEncontrada, etapa, pago, resultado, motivoRechazo,
        iniciando, error, setError, iniciar, procesar, reintentar, cambiarOpcion, recargar,
        esperarMercadoPago, esperandoMercadoPago, esperaAgotada,
        modificarExtras, guardandoExtras, errorExtras, setErrorExtras,
    };
}
