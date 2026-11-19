import { useState } from "react";
import { Ban } from "lucide-react";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import { adminService, type Reembolso } from "../../services/adminService";
import type { PartidoDeTurnoFijo, TurnoFijo } from "../../types/admin.types";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatMonto } from "../../utils/fechas";

/** Lo cobrado (o bonificado) de un partido que todavía no se jugó */
const cubierto = (p: PartidoDeTurnoFijo) => p.estado === "CANCELADA" ? 0 : Number(p.montoTotal) - Number(p.montoPendiente);

/* ─── Baja general o de una fecha ────────────────── */
export default function ModalBajaTurnoFijo({ turno, partido, onCerrar, onHecho }: {
    turno: TurnoFijo;
    /** Sin partido: baja general */
    partido: PartidoDeTurnoFijo | null;
    onCerrar: () => void;
    onHecho: (texto: string) => void;
}) {
    const afectados = partido ? [partido] : turno.proximosPartidos;
    const cobrado = afectados.reduce((t, p) => t + cubierto(p), 0);
    const conPlata = cobrado > 0;
    const [reembolso, setReembolso] = useState<Reembolso | null>(conPlata ? null : "NADA");
    // Un partido se cobra en el club: si se devuelve, se da en mano (ahora o después)
    const [entregada, setEntregada] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirmar = async () => {
        if (conPlata && !reembolso) { setError("Elegí qué se devuelve de lo cobrado."); return; }
        setProcesando(true);
        setError(null);
        try {
            const r = conPlata ? reembolso ?? undefined : undefined;
            const devuelve = r === "TOTAL";
            const entrega = devuelve ? entregada : undefined;
            const plata = devuelve ? ` Se devuelven ${formatMonto(cobrado)}${entregada ? "" : " (quedan para entregar)"}.` : "";
            if (partido) {
                await adminService.bajaFechaTurnoFijo(turno.id, partido.fecha, r, entrega);
                onHecho(`Se dio de baja el ${formatFecha(partido.fecha)}: ese horario queda libre.${plata}`);
            } else {
                await adminService.bajaTurnoFijo(turno.id, r, entrega);
                onHecho(`Turno fijo dado de baja: se cancelaron los partidos que no empezaron y el horario quedó libre.${plata}`);
            }
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo dar de baja.")) ?? null);
            setProcesando(false);
        }
    };

    return (
        <ModalConfirmacion
            titulo={partido ? `¿Dar de baja el ${formatFecha(partido.fecha)}?` : "¿Dar de baja el turno fijo?"}
            icono={<Ban size={22} />}
            variante="danger"
            textoConfirmar="Sí, dar de baja"
            cargando={procesando}
            error={error}
            onCerrar={onCerrar}
            onConfirmar={() => void confirmar()}
        >
            <div className="admin-form">
                <p className="modal__descripcion">
                    {partido
                        ? "Esa semana no vienen: se cancela el partido, se avisa a los jugadores y el horario queda libre para otros."
                        : "Deja de bloquear el horario y se cancelan los partidos que todavía no empezaron (se avisa a los jugadores). Los ya jugados no cambian."}
                </p>
                {conPlata ? (
                    <>
                        <p className="modal__descripcion">
                            {partido ? "Ese partido tiene" : "Los partidos que se cancelan tienen"} <strong>{formatMonto(cobrado)}</strong> cobrados. ¿Qué se devuelve?
                        </p>
                        <div className="admin-opciones" role="radiogroup" aria-label="Reembolso">
                            {([["TOTAL", `Todo lo cobrado · ${formatMonto(cobrado)}`], ["NADA", "Nada"]] as const).map(([valor, etiqueta]) => (
                                <label key={valor} className={`admin-opcion${reembolso === valor ? " admin-opcion--activa" : ""}`}>
                                    <input type="radio" name="reembolso" checked={reembolso === valor}
                                        onChange={() => { setReembolso(valor); setError(null); }} />
                                    {etiqueta}
                                </label>
                            ))}
                        </div>
                        {reembolso === "TOTAL" && (
                            <>
                                <p className="modal__descripcion">Un partido se cobra en el club: la plata se devuelve en mano.</p>
                                <div className="admin-opciones" role="radiogroup" aria-label="Entrega de la plata">
                                    <label className={`admin-opcion${entregada ? " admin-opcion--activa" : ""}`}>
                                        <input type="radio" name="entrega-baja" checked={entregada} onChange={() => setEntregada(true)} />
                                        Se la di ahora
                                    </label>
                                    <label className={`admin-opcion${!entregada ? " admin-opcion--activa" : ""}`}>
                                        <input type="radio" name="entrega-baja" checked={!entregada} onChange={() => setEntregada(false)} />
                                        Queda para entregar
                                    </label>
                                </div>
                            </>
                        )}
                        {reembolso === "NADA" && <p className="modal__descripcion">No se devuelve nada de lo cobrado.</p>}
                    </>
                ) : (
                    <p className="modal__descripcion">No hay nada cobrado: no hay nada que devolver.</p>
                )}
            </div>
        </ModalConfirmacion>
    );
}
