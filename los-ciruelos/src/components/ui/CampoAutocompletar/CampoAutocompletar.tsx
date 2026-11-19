import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import "./CampoAutocompletar.css";

export interface OpcionAutocompletar<T extends string | number> {
    valor: T;
    etiqueta: string;
    /** Línea chica debajo (precio, stock…) */
    detalle?: string;
    /** Se ve pero no se puede elegir (por ejemplo, sin stock) */
    deshabilitado?: boolean;
}

/** Sin tildes ni mayúsculas, para buscar */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Cuántas sugerencias se muestran a la vez (la lista se desliza) */
const MAXIMO = 50;

/**
 * Buscador con sugerencias sobre una lista que ya está cargada (filtra en el navegador, sin pedidos):
 * se escribe, aparecen las coincidencias y se elige con el mouse o con ↑ ↓ y Enter. Con algo elegido,
 * la X lo saca. `extra` agrega una opción al final (por ejemplo, "Otro: escribirlo") con lo escrito.
 */
export default function CampoAutocompletar<T extends string | number>({
    id, label, opciones, valor, onElegir, placeholder = "Buscar", extra,
}: {
    id: string;
    label: string;
    opciones: OpcionAutocompletar<T>[];
    valor: T | null;
    onElegir: (valor: T | null) => void;
    placeholder?: string;
    extra?: { etiqueta: (texto: string) => string; onElegir: (texto: string) => void };
}) {
    const elegida = opciones.find(o => o.valor === valor) ?? null;
    const [texto, setTexto] = useState("");
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const contenedor = useRef<HTMLDivElement>(null);
    const listaId = useId();

    const buscado = normalizar(texto.trim());
    const coincidencias = opciones.filter(o => !buscado || normalizar(o.etiqueta).includes(buscado)).slice(0, MAXIMO);
    const items: ({ tipo: "opcion"; opcion: OpcionAutocompletar<T> } | { tipo: "extra" })[] = [
        ...coincidencias.map(opcion => ({ tipo: "opcion" as const, opcion })),
        ...(extra ? [{ tipo: "extra" as const }] : []),
    ];

    // Cerrar al tocar afuera
    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => { if (!contenedor.current?.contains(e.target as Node)) setAbierto(false); };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, [abierto]);

    const elegir = (i: number) => {
        const item = items[i];
        if (!item) return;
        if (item.tipo === "extra") { extra?.onElegir(texto.trim()); setTexto(""); setAbierto(false); return; }
        if (item.opcion.deshabilitado) return;
        onElegir(item.opcion.valor);
        setTexto("");
        setAbierto(false);
    };

    const teclas = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo(a => Math.min(a + 1, items.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
        else if (e.key === "Enter" && abierto) { e.preventDefault(); elegir(activo); }
        // Con la lista abierta, Escape cierra solo la lista (no el popup donde está el campo)
        else if (e.key === "Escape" && abierto) { e.stopPropagation(); setAbierto(false); }
    };

    return (
        <div className="campo autocompletar" ref={contenedor}>
            <label className="campo__etiqueta" htmlFor={id}>{label}</label>
            <div className="campo__contenedor autocompletar__contenedor">
                <span className="campo__icono"><Search size={16} /></span>
                <input
                    id={id}
                    className="campo__input campo__input--con-izq autocompletar__input"
                    role="combobox"
                    aria-expanded={abierto}
                    aria-controls={listaId}
                    aria-autocomplete="list"
                    aria-activedescendant={abierto && items[activo] ? `${listaId}-${activo}` : undefined}
                    autoComplete="off"
                    placeholder={elegida ? undefined : placeholder}
                    value={abierto || !elegida ? texto : elegida.etiqueta}
                    onFocus={() => { setAbierto(true); setActivo(0); }}
                    onChange={e => { setTexto(e.target.value); setAbierto(true); setActivo(0); if (elegida) onElegir(null); }}
                    onKeyDown={teclas}
                />
                {(elegida || texto) && (
                    <button type="button" className="autocompletar__limpiar" aria-label="Sacar"
                        onClick={() => { setTexto(""); onElegir(null); setAbierto(false); }}>
                        <X size={14} />
                    </button>
                )}
            </div>
            {abierto && (
                <ul className="autocompletar__lista" id={listaId} role="listbox" aria-label={label}>
                    {items.length === 0 && <li className="autocompletar__vacio">Ningún resultado.</li>}
                    {items.map((item, i) => item.tipo === "extra" ? (
                        <li key="extra" id={`${listaId}-${i}`} role="option" aria-selected={i === activo}
                            className={`autocompletar__opcion autocompletar__opcion--extra${i === activo ? " autocompletar__opcion--activa" : ""}`}
                            onMouseDown={e => { e.preventDefault(); elegir(i); }} onMouseEnter={() => setActivo(i)}>
                            {extra!.etiqueta(texto.trim())}
                        </li>
                    ) : (
                        <li key={String(item.opcion.valor)} id={`${listaId}-${i}`} role="option" aria-selected={i === activo}
                            aria-disabled={item.opcion.deshabilitado}
                            className={`autocompletar__opcion${i === activo ? " autocompletar__opcion--activa" : ""}${item.opcion.deshabilitado ? " autocompletar__opcion--deshabilitada" : ""}`}
                            onMouseDown={e => { e.preventDefault(); elegir(i); }} onMouseEnter={() => setActivo(i)}>
                            <span>{item.opcion.etiqueta}</span>
                            {item.opcion.detalle && <small>{item.opcion.detalle}</small>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
