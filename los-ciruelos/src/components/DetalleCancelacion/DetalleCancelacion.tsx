import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { ReservaResponse } from "../../types/reserva.types";
import { formatFecha, formatMonto, horaCorta } from "../../utils/fechas";
import { infoCancelacion } from "../../utils/reservas";
import "./DetalleCancelacion.css";

/** El turno: cancha, fecha y horario, cada uno con su ícono (bloque común de los modales de reserva). */
export function DetalleTurno({ reserva }: { reserva: ReservaResponse }) {
    return (
        <ul className="detalle-cancelacion__turno">
            <li><MapPin size={14} aria-hidden="true" />Cancha {reserva.canchaNumero}</li>
            <li><CalendarDays size={14} aria-hidden="true" /><span className="detalle-cancelacion__fecha">{formatFecha(reserva.fechaReserva)}</span></li>
            <li><Clock size={14} aria-hidden="true" />{horaCorta(reserva.horaInicio)} – {horaCorta(reserva.horaFin)} hs</li>
        </ul>
    );
}

/** Contenido del modal "Tenés una reserva sin pagar": el turno, el total y qué se puede hacer. */
export function DetallePendiente({ reserva, enProceso }: { reserva: ReservaResponse; enProceso: boolean }) {
    return (
        <div className="detalle-cancelacion">
            <DetalleTurno reserva={reserva} />
            <dl className="detalle-cancelacion__montos detalle-cancelacion__montos--uno">
                <div>
                    <dt>Total del turno</dt>
                    <dd>{formatMonto(Number(reserva.montoTotal))}</dd>
                </div>
            </dl>
            <p className="detalle-cancelacion__motivo">
                {enProceso
                    ? "Mercado Pago está procesando el pago. Podés ver cómo va."
                    : "Podés completar el pago o cancelarla para elegir otro turno. No pagaste nada, así que cancelar no tiene costo."}
            </p>
        </div>
    );
}

/** Contenido del modal "¿Cancelar la reserva?": el turno, los montos y el motivo. */
export default function DetalleCancelacion({ reserva }: { reserva: ReservaResponse }) {
    const info = infoCancelacion(reserva);
    const hayPago = info.pagado > 0;

    return (
        <div className="detalle-cancelacion">
            <DetalleTurno reserva={reserva} />

            {hayPago && (
                <dl className="detalle-cancelacion__montos">
                    <div>
                        <dt>Pagaste</dt>
                        <dd>{formatMonto(info.pagado)}</dd>
                    </div>
                    <div className={info.reembolso > 0 ? "detalle-cancelacion__devolucion" : "detalle-cancelacion__sin-devolucion"}>
                        <dt>Te devolvemos</dt>
                        <dd>{formatMonto(info.reembolso)}</dd>
                    </div>
                </dl>
            )}

            <p className="detalle-cancelacion__motivo">{info.motivo}</p>
            {info.medio && info.reembolso > 0 && <p className="detalle-cancelacion__medio">{info.medio}</p>}
        </div>
    );
}
