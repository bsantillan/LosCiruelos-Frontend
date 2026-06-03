import { useState, useRef, useEffect } from "react";
import { ChevronDown, AlertCircle, Check } from "lucide-react";
import "./CampoSelect.css";

interface OpcionSelect {
    valor: string | number;
    etiqueta: string;
}

interface CampoSelectProps {
    id: string;
    name: string;
    label: string;
    value: string | number;
    onChange: (e: { target: { name: string; value: string | number } }) => void;
    opciones: OpcionSelect[];
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function CampoSelect({
    id, name, label, value, onChange,
    opciones, placeholder, error, required, disabled
}: CampoSelectProps) {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const etiquetaSeleccionada = opciones.find(o => o.valor === value)?.etiqueta;

    // Cerrar al hacer click afuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const seleccionar = (valor: string | number) => {
        onChange({ target: { name, value: valor } });
        setAbierto(false);
    };

    return (
        <div className="campo" ref={ref}>
            <label className="campo__etiqueta" htmlFor={id}>
                {label}{required && <span className="campo__requerido">*</span>}
            </label>

            <div
                className={`campo__select-trigger${abierto ? " campo__select-trigger--abierto" : ""}${error ? " campo__select-trigger--error" : ""}${disabled ? " campo__select-trigger--deshabilitado" : ""}`}
                onClick={() => !disabled && setAbierto(v => !v)}
                role="combobox"
                aria-expanded={abierto}
                aria-haspopup="listbox"
                aria-controls={`${id}-lista`}
                aria-labelledby={id}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAbierto(v => !v); }
                    if (e.key === "Escape") setAbierto(false);
                }}
            >
                <span className={`campo__select-valor${!etiquetaSeleccionada ? " campo__select-valor--placeholder" : ""}`}>
                    {etiquetaSeleccionada ?? placeholder ?? "Seleccioná una opción"}
                </span>
                <span className={`campo__select-chevron${abierto ? " campo__select-chevron--rotado" : ""}`}>
                    <ChevronDown size={16} />
                </span>
            </div>

            {abierto && (
                <ul
                    className="campo__select-lista"
                    id={`${id}-lista`}
                    role="listbox"
                    aria-label={label}
                >
                    {opciones.map(op => {
                        const seleccionada = op.valor === value;
                        return (
                            <li
                                key={op.valor}
                                className={`campo__select-opcion${seleccionada ? " campo__select-opcion--seleccionada" : ""}`}
                                role="option"
                                aria-selected={seleccionada}
                                onClick={() => seleccionar(op.valor)}
                                onKeyDown={e => e.key === "Enter" && seleccionar(op.valor)}
                                tabIndex={0}
                            >
                                <span>{op.etiqueta}</span>
                                {seleccionada && <Check size={14} />}
                            </li>
                        );
                    })}
                </ul>
            )}

            {error && (
                <div className="campo__error" id={`${id}-error`} role="alert">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}