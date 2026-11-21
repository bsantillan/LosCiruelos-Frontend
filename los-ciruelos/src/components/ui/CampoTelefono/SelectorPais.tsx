import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

/** Lo que le pasa react-phone-number-input a un selector de país propio (countrySelectComponent) */
interface SelectorPaisProps {
    value?: Country;
    onChange: (pais?: Country) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    options: { value?: Country; label: string; divider?: boolean }[];
    disabled?: boolean;
    readOnly?: boolean;
}

/** Alto máximo del panel (buscador + lista): si abajo no entra, se abre hacia arriba */
const ALTO_PANEL = 320;

/** Sin tildes y en minúscula, para buscar "peru" y encontrar "Perú" */
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Bandera({ pais }: { pais?: Country }) {
    const Icono = pais ? flags[pais] : undefined;
    return (
        <span className="selector-pais__bandera" aria-hidden="true">
            {Icono ? <Icono title="" /> : null}
        </span>
    );
}

/**
 * Selector de país del campo de celular, con la estética del sitio (en vez del <select> del
 * navegador): la bandera en el campo y, al abrirlo, una lista con buscador (por nombre o código) con
 * la bandera, el país y su código. Se maneja con el teclado (flechas, Enter, Escape). El panel se
 * dibuja en el body (portal), pegado al campo: así no lo recorta un modal con scroll.
 */
export default function SelectorPais({ value, onChange, onFocus, onBlur, options, disabled, readOnly }: SelectorPaisProps) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [activo, setActivo] = useState(0);
    const raiz = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const lista = useRef<HTMLUListElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const [posicion, setPosicion] = useState<React.CSSProperties>({});

    /** Los países (sin el separador mientras se busca), con su código */
    const visibles = useMemo(() => {
        const q = normalizar(busqueda.trim()).replace(/^\+/, "");
        const paises = options.filter(o => !o.divider && o.value).map(o => ({
            pais: o.value as Country,
            nombre: o.label,
            codigo: getCountryCallingCode(o.value as Country),
        }));
        if (!q) {
            // Sin búsqueda: el orden de la lista, con la línea después de los primeros
            const corte = options.findIndex(o => o.divider);
            return paises.map((p, i) => ({ ...p, separador: corte > 0 && i === corte - 1 }));
        }
        return paises
            .filter(p => normalizar(p.nombre).includes(q) || p.codigo.startsWith(q))
            .map(p => ({ ...p, separador: false }));
    }, [options, busqueda]);

    const abrir = () => {
        if (disabled || readOnly) return;
        setBusqueda("");
        setActivo(Math.max(0, visibles.findIndex(p => p.pais === value)));
        setAbierto(true);
    };

    const cerrar = (volverAlBoton = false) => {
        setAbierto(false);
        if (volverAlBoton) boton.current?.focus();
    };

    const elegir = (pais: Country) => {
        onChange(pais);
        setAbierto(false);
    };

    // El panel va debajo de todo el campo (o arriba, si abajo no entra) y lo sigue al hacer scroll
    useLayoutEffect(() => {
        if (!abierto) return;
        const ubicar = () => {
            const campo = raiz.current?.closest(".campo-telefono") ?? raiz.current;
            if (!campo) return;
            const r = campo.getBoundingClientRect();
            const arriba = window.innerHeight - r.bottom < ALTO_PANEL + 12 && r.top > window.innerHeight - r.bottom;
            setPosicion(arriba
                ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6 }
                : { left: r.left, width: r.width, top: r.bottom + 6 });
        };
        ubicar();
        window.addEventListener("resize", ubicar);
        window.addEventListener("scroll", ubicar, true);
        return () => {
            window.removeEventListener("resize", ubicar);
            window.removeEventListener("scroll", ubicar, true);
        };
    }, [abierto]);

    // Se cierra al tocar afuera (del botón y del panel)
    useEffect(() => {
        if (!abierto) return;
        const afuera = (e: MouseEvent | TouchEvent) => {
            const t = e.target as Node;
            if (!raiz.current?.contains(t) && !panel.current?.contains(t)) setAbierto(false);
        };
        document.addEventListener("mousedown", afuera);
        document.addEventListener("touchstart", afuera);
        return () => {
            document.removeEventListener("mousedown", afuera);
            document.removeEventListener("touchstart", afuera);
        };
    }, [abierto]);

    // La opción activa siempre a la vista
    useEffect(() => {
        if (!abierto) return;
        lista.current?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
    }, [abierto, activo]);

    const teclas = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo(i => Math.min(i + 1, visibles.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (visibles[activo]) elegir(visibles[activo].pais);
        } else if (e.key === "Escape") {
            // Solo cierra la lista: no tiene que llegar al Escape del modal que la contiene
            e.preventDefault();
            e.stopPropagation();
            cerrar(true);
        } else if (e.key === "Tab") {
            setAbierto(false);
        }
    };

    const nombreActual = options.find(o => o.value === value)?.label ?? "País";
    const idLista = "selector-pais-lista";

    return (
        <div className="selector-pais" ref={raiz}>
            <button
                ref={boton}
                type="button"
                className={`selector-pais__boton${abierto ? " selector-pais__boton--abierto" : ""}`}
                onClick={() => (abierto ? cerrar() : abrir())}
                onKeyDown={e => { if (e.key === "ArrowDown" && !abierto) { e.preventDefault(); abrir(); } }}
                onFocus={onFocus}
                onBlur={onBlur}
                disabled={disabled || readOnly}
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-label={`País: ${nombreActual}. Cambiar`}
            >
                <Bandera pais={value} />
                <ChevronDown size={14} className="selector-pais__flecha" aria-hidden="true" />
            </button>

            {abierto && createPortal(
                <div className="selector-pais__panel" ref={panel} style={posicion}>
                    <div className="selector-pais__buscar">
                        <Search size={14} aria-hidden="true" />
                        <input
                            autoFocus
                            type="text"
                            value={busqueda}
                            onChange={e => { setBusqueda(e.target.value); setActivo(0); }}
                            onKeyDown={teclas}
                            placeholder="Buscar país o código"
                            aria-label="Buscar país o código"
                            aria-controls={idLista}
                            aria-activedescendant={visibles[activo] ? `pais-${visibles[activo].pais}` : undefined}
                        />
                    </div>
                    <ul className="selector-pais__lista" role="listbox" id={idLista} ref={lista} aria-label="Países">
                        {visibles.length === 0 && <li className="selector-pais__vacio">No hay ningún país con ese nombre o código.</li>}
                        {visibles.map((p, i) => (
                            <li
                                key={p.pais}
                                id={`pais-${p.pais}`}
                                data-indice={i}
                                role="option"
                                aria-selected={p.pais === value}
                                className={[
                                    "selector-pais__opcion",
                                    i === activo ? "selector-pais__opcion--activa" : "",
                                    p.pais === value ? "selector-pais__opcion--elegida" : "",
                                    p.separador ? "selector-pais__opcion--separador" : "",
                                ].filter(Boolean).join(" ")}
                                onMouseEnter={() => setActivo(i)}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => elegir(p.pais)}
                            >
                                <Bandera pais={p.pais} />
                                <span className="selector-pais__nombre">{p.nombre}</span>
                                <span className="selector-pais__codigo">+{p.codigo}</span>
                            </li>
                        ))}
                    </ul>
                </div>,
                document.body,
            )}
        </div>
    );
}
