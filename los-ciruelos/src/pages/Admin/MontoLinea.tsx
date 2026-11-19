import { useEffect, useRef } from "react";
import { Check, Pencil } from "lucide-react";
import { formatMonto } from "../../utils/fechas";

/**
 * El monto de una línea del cobro o de la devolución. Se toca para cambiarlo y se edita en el mismo
 * lugar (un campo del mismo alto): la fila no crece ni empuja nada. Enter, Escape, el tilde o salir
 * del campo lo dejan como quedó.
 */
export default function MontoLinea({ id, monto, valor, maximo, editando, deshabilitado, etiqueta, titulo, onEditar, onCambio, onListo }: {
    id: string;
    /** Lo que se cobra o devuelve de la línea ahora */
    monto: number;
    /** Lo escrito a mano (undefined: el monto calculado) */
    valor: string | undefined;
    maximo: number;
    editando: boolean;
    deshabilitado: boolean;
    /** Para lectores de pantalla: "Monto de cancha" */
    etiqueta: string;
    titulo: string;
    onEditar: () => void;
    onCambio: (valor: string) => void;
    onListo: () => void;
}) {
    const campo = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (editando) campo.current?.select();
    }, [editando]);

    if (deshabilitado) return <span className="cobro-linea__monto cobro-linea__monto--vacio">—</span>;

    if (!editando) {
        return (
            <button type="button" className="cobro-linea__monto" title={titulo} onClick={onEditar}>
                {formatMonto(monto)}
                <Pencil size={12} />
            </button>
        );
    }

    const excede = valor !== undefined && Number(valor) > maximo;
    return (
        <span className={`cobro-linea__editor${excede ? " cobro-linea__editor--error" : ""}`}>
            <span aria-hidden="true">$</span>
            <input id={id} ref={campo} type="number" inputMode="decimal" min={1} max={maximo} step="0.01"
                aria-label={`${etiqueta} (hasta ${formatMonto(maximo)})`} title={`Hasta ${formatMonto(maximo)}`}
                value={valor ?? String(monto)}
                onChange={e => onCambio(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onListo(); } }}
                onBlur={onListo} />
            <button type="button" aria-label="Listo" onMouseDown={e => e.preventDefault()} onClick={onListo}><Check size={14} /></button>
        </span>
    );
}
