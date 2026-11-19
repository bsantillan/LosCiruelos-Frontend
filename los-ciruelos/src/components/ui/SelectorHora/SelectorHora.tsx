import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { HORAS_MEDIA_HORA } from "../../../utils/horas";
import "./SelectorHora.css";


/**
 * Selector de hora propio (en lugar del nativo del navegador): un botón con la hora y, al tocarlo,
 * una grilla con las horas posibles. Se elige con el mouse o con las flechas y Enter; Escape cierra.
 */
export default function SelectorHora({ valor, onChange, opciones = HORAS_MEDIA_HORA, etiqueta }: {
    valor: string;
    onChange: (hora: string) => void;
    opciones?: string[];
    /** Para lectores de pantalla (por ejemplo, "Lunes, abre") */
    etiqueta: string;
}) {
    const [abierto, setAbierto] = useState(false);
    const [foco, setFoco] = useState(Math.max(0, opciones.indexOf(valor)));
    const contenedor = useRef<HTMLDivElement>(null);
    const grilla = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => { if (!contenedor.current?.contains(e.target as Node)) setAbierto(false); };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, [abierto]);

    // El foco de teclado sigue a la hora marcada (y la lista se desliza hasta ella)
    useEffect(() => {
        if (!abierto) return;
        grilla.current?.querySelector<HTMLButtonElement>(`[data-i="${foco}"]`)?.focus();
    }, [abierto, foco]);

    const abrir = () => { setFoco(Math.max(0, opciones.indexOf(valor))); setAbierto(true); };
    const elegir = (hora: string) => { onChange(hora); setAbierto(false); };
    const COLUMNAS = 4;
    const teclas = (e: React.KeyboardEvent) => {
        const mover: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNAS, ArrowUp: -COLUMNAS };
        if (e.key in mover) {
            e.preventDefault();
            setFoco(f => Math.min(opciones.length - 1, Math.max(0, f + mover[e.key])));
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setAbierto(false);
        }
    };

    return (
        <div className="selector-hora" ref={contenedor}>
            <button type="button" className={`selector-hora__boton${abierto ? " selector-hora__boton--abierto" : ""}`}
                onClick={() => (abierto ? setAbierto(false) : abrir())} aria-haspopup="listbox" aria-expanded={abierto}
                aria-label={`${etiqueta}: ${valor}`}>
                <Clock size={14} />
                <span>{valor}</span>
                <ChevronDown size={13} className="selector-hora__chevron" />
            </button>
            {abierto && (
                <div className="selector-hora__popover" role="listbox" aria-label={etiqueta} ref={grilla} onKeyDown={teclas}>
                    {opciones.map((h, i) => (
                        <button key={h} type="button" role="option" data-i={i} aria-selected={h === valor}
                            tabIndex={i === foco ? 0 : -1}
                            className={`selector-hora__opcion${h === valor ? " selector-hora__opcion--elegida" : ""}${h.endsWith(":00") ? " selector-hora__opcion--entera" : ""}`}
                            onClick={() => elegir(h)}>
                            {h}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
