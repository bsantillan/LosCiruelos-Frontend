import { Banknote, CreditCard, Gift, Landmark, Smartphone, type LucideIcon } from "lucide-react";
import type { GrupoMedio } from "../../types/admin.types";
import "./ReservasAdmin.css";

/** Cómo se muestra cada grupo de medios (el backend los manda en `grupo`) */
const GRUPOS: Record<GrupoMedio, { etiqueta: string; icono: LucideIcon }> = {
    EFECTIVO: { etiqueta: "Efectivo", icono: Banknote },
    MERCADO_PAGO: { etiqueta: "Mercado Pago", icono: Smartphone },
    CUENTA_DNI: { etiqueta: "Cuenta DNI", icono: Landmark },
    TARJETA: { etiqueta: "Tarjeta", icono: CreditCard },
    BONIFICACION: { etiqueta: "Bonificación", icono: Gift },
};

/** Un medio que se puede elegir: su grupo y cómo se llama dentro de él */
export interface OpcionMedio<V extends string> {
    valor: V;
    grupo: GrupoMedio;
    /** Dentro del grupo ("Transferencia" en Mercado Pago) */
    opcion: string;
    disponible: boolean;
    /** Por qué no está disponible, o una aclaración */
    detalle?: string | null;
}

/**
 * Medio de cobro en dos niveles: Efectivo · Mercado Pago · Cuenta DNI · Tarjeta (y Bonificación para
 * el ADMIN) y, si el grupo tiene más de una opción (Mercado Pago: QR de la caja, transferencia o
 * tarjeta en su posnet), una segunda fila para elegirla. Al tocar un grupo queda elegida su primera
 * opción disponible.
 */
export default function SelectorMedio<V extends string>({ medios, valor, onChange, nombre }: {
    medios: OpcionMedio<V>[];
    valor: V;
    onChange: (valor: V) => void;
    /** name de los radios (único en la pantalla) */
    nombre: string;
}) {
    const grupos = medios.reduce<GrupoMedio[]>((g, m) => (g.includes(m.grupo) ? g : [...g, m.grupo]), []);
    const actual = medios.find(m => m.valor === valor);
    const opcionesDelGrupo = actual ? medios.filter(m => m.grupo === actual.grupo) : [];

    const elegirGrupo = (grupo: GrupoMedio) => {
        if (actual?.grupo === grupo) return;
        const primera = medios.find(m => m.grupo === grupo && m.disponible);
        if (primera) onChange(primera.valor);
    };

    return (
        <div className="selector-medio">
            <div className="admin-opciones admin-opciones--dos" role="radiogroup" aria-label="Medio de pago">
                {grupos.map(g => {
                    const { etiqueta, icono: Icono } = GRUPOS[g];
                    const deshabilitado = !medios.some(m => m.grupo === g && m.disponible);
                    const motivo = deshabilitado ? medios.find(m => m.grupo === g)?.detalle ?? "No disponible" : undefined;
                    return (
                        <label key={g} title={motivo}
                            className={`admin-opcion${actual?.grupo === g ? " admin-opcion--activa" : ""}${deshabilitado ? " admin-opcion--deshabilitada" : ""}`}>
                            <input type="radio" name={nombre} checked={actual?.grupo === g} disabled={deshabilitado}
                                onChange={() => elegirGrupo(g)} />
                            <Icono size={18} />
                            {etiqueta}
                        </label>
                    );
                })}
            </div>

            {opcionesDelGrupo.length > 1 && actual && (
                <div className="ra-chips selector-medio__opciones" role="radiogroup" aria-label={`Cómo se cobró con ${GRUPOS[actual.grupo].etiqueta}`}>
                    {opcionesDelGrupo.map(m => (
                        <button key={m.valor} type="button" role="radio" aria-checked={m.valor === valor} disabled={!m.disponible}
                            title={!m.disponible ? m.detalle ?? "No disponible" : m.detalle ?? undefined}
                            className={`ra-chip${m.valor === valor ? " ra-chip--activo" : ""}`}
                            onClick={() => onChange(m.valor)}>
                            {m.opcion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
