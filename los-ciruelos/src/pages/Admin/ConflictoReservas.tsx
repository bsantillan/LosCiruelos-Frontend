import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import type { CancelacionesResultado, FueraDeHorario } from "../../types/admin.types";
import { formatFecha, horaCorta } from "../../utils/fechas";
import { Mensaje } from "./comunes";
import { DIA } from "./turnosFijos";
import "./Configuracion.css";

/*
 * Reservas y turnos fijos que quedan afuera de un cambio (horario nuevo, día cerrado, cancha dada de
 * baja): el backend responde 409 con la lista y, si se confirma, las cancela con reembolso total.
 */

/* ─── Lo que el horario nuevo deja afuera (409) ──── */
export function ModalFueraDeHorario({ fuera, guardando, onCerrar, onConfirmar, titulo = "El horario nuevo deja reservas afuera",
    textoConfirmar = "Guardar y cancelarlas", explicacion }: {
    fuera: FueraDeHorario;
    guardando: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
    titulo?: string;
    textoConfirmar?: string;
    /** Qué pasa si se confirma (por defecto, lo del cambio de horario) */
    explicacion?: ReactNode;
}) {
    return (
        <ModalConfirmacion
            titulo={titulo}
            icono={<AlertTriangle size={22} />}
            textoConfirmar={textoConfirmar}
            textoCancelar="Volver"
            variante="danger"
            cargando={guardando}
            onCerrar={onCerrar}
            onConfirmar={onConfirmar}
        >
            <div className="admin-form config-fuera">
                <p className="modal__descripcion">
                    {explicacion ?? <>
                        Si confirmás, <strong>estas reservas se cancelan</strong> con reembolso total (por Mercado Pago, o para devolver a mano
                        si se cobró en el club) y se le avisa a cada cliente y a los jugadores. Los turnos fijos de la lista no crean partidos
                        en ese horario.
                    </>}
                </p>
                {fuera.reservasFueraDeHorario.length > 0 && (
                    <div>
                        <h4 className="detalle-reserva__subtitulo">Reservas ({fuera.reservasFueraDeHorario.length})</h4>
                        <ul className="config-fuera__lista">
                            {fuera.reservasFueraDeHorario.map(r => (
                                <li key={r.id}>
                                    <span style={{ textTransform: "capitalize" }}>{formatFecha(r.fecha)}</span>, {horaCorta(r.horaInicio)} a {horaCorta(r.horaFin)}
                                    <span className="admin-tabla__secundario">
                                        Cancha {r.canchaNumero} · {r.clienteNombre} · {r.tipo === "PARTIDO" ? "partido" : "reserva"} #{r.id}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {fuera.turnosFijosFueraDeHorario.length > 0 && (
                    <div>
                        <h4 className="detalle-reserva__subtitulo">Turnos fijos ({fuera.turnosFijosFueraDeHorario.length})</h4>
                        <ul className="config-fuera__lista">
                            {fuera.turnosFijosFueraDeHorario.map(t => (
                                <li key={t.id}>
                                    {DIA[t.diaSemana]}, {horaCorta(t.horaInicio)} a {horaCorta(t.horaFin)}
                                    <span className="admin-tabla__secundario">Cancha {t.canchaNumero} · turno fijo #{t.id}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </ModalConfirmacion>
    );
}

/** Lo que no se pudo cancelar solo (por ejemplo, un pago en proceso): hay que cancelarlo a mano */
export function SinCancelar({ resultado }: { resultado: CancelacionesResultado | null | undefined }) {
    if (!resultado?.sinCancelar.length) return null;
    return (
        <Mensaje fijo tipo="error">
            No se pudieron cancelar: {resultado.sinCancelar.map(s => `#${s.reservaId} (${s.motivo})`).join("; ")}. Cancelalas a mano desde Reservas.
        </Mensaje>
    );
}
