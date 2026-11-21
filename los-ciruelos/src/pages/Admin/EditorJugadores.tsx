import { useState } from "react";
import { UserRound } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoTelefono from "../../components/ui/CampoTelefono/CampoTelefono";
import { aInternacional } from "../../utils/telefono";
import BuscadorCliente from "./BuscadorCliente";
import ModalAltaCliente from "./ModalAltaCliente";
import type { Jugador } from "./jugadores";
import "./ReservasAdmin.css";

/* ─── Los jugadores (hasta 4) ────────────────────── */
/**
 * El 1 es el responsable y es obligatorio (cliente registrado); del 2 al 4 son opcionales: clientes o
 * invitados sin cuenta, y los que quedan vacíos no se cargan.
 */
export default function EditorJugadores({ jugadores, onChange }: { jugadores: Jugador[]; onChange: (j: Jugador[]) => void }) {
    const [alta, setAlta] = useState<{ lugar: number; texto: string } | null>(null);
    const cambiar = (i: number, j: Jugador) => onChange(jugadores.map((x, k) => k === i ? j : x));

    return (
        <div className="jugadores">
            {alta && (
                <ModalAltaCliente
                    texto={alta.texto}
                    onCerrar={() => setAlta(null)}
                    onCreado={c => { cambiar(alta.lugar, { tipo: "cliente", cliente: c }); setAlta(null); }}
                />
            )}
            {jugadores.map((j, i) => (
                <div key={i} className="jugadores__lugar">
                    <div className="jugadores__cabecera">
                        <span className="jugadores__numero">
                            <UserRound size={14} /> Jugador {i + 1}{i === 0 ? " · responsable" : " · opcional"}
                        </span>
                        {i > 0 && (
                            <div className="ra-chips" role="radiogroup" aria-label={`Jugador ${i + 1}`}>
                                <button type="button" role="radio" aria-checked={j.tipo === "cliente"}
                                    className={`ra-chip${j.tipo === "cliente" ? " ra-chip--activo" : ""}`}
                                    onClick={() => j.tipo !== "cliente" && cambiar(i, { tipo: "cliente", cliente: null })}>
                                    Cliente
                                </button>
                                <button type="button" role="radio" aria-checked={j.tipo === "invitado"}
                                    className={`ra-chip${j.tipo === "invitado" ? " ra-chip--activo" : ""}`}
                                    onClick={() => j.tipo !== "invitado" && cambiar(i, { tipo: "invitado", nombre: "", telefono: "" })}>
                                    Invitado
                                </button>
                            </div>
                        )}
                    </div>
                    {j.tipo === "cliente" ? (
                        <BuscadorCliente
                            id={`jugador-${i + 1}`} label={i === 0 ? "Responsable" : "Cliente"}
                            cliente={j.cliente} onElegir={c => cambiar(i, { tipo: "cliente", cliente: c })}
                            avisarPerfilIncompleto={false}
                            onCrear={texto => setAlta({ lugar: i, texto })}
                        />
                    ) : (
                        <div className="admin-form__fila">
                            <CampoInput id={`invitado-${i + 1}`} name="nombre" label="Nombre" value={j.nombre}
                                onChange={e => cambiar(i, { ...j, nombre: e.target.value })} />
                            <CampoTelefono id={`invitado-tel-${i + 1}`} name="telefono" label="Celular (opcional)"
                                value={aInternacional(j.telefono)} onChange={telefono => cambiar(i, { ...j, telefono })} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
