import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import "./CampoInput.css";

interface CampoInputProps {
    id: string;
    name: string;
    label: string;
    type?: "text" | "email" | "password" | "number" | "tel";
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    icono?: React.ReactNode;
    required?: boolean;
    error?: string;
    min?: number;
    max?: number;
    paso?: number;
    prefijo?: string;       // ej: "$"
    sufijo?: string;        // ej: "ARS"
    disabled?: boolean;
    entero?: boolean;
}

export default function CampoInput({
    id, name, label, type = "text", value, onChange,
    placeholder, autoComplete, icono, required,
    error, min, max, paso, prefijo, sufijo, disabled, entero
}: CampoInputProps) {
    const [verContrasena, setVerContrasena] = useState(false);
    const esPassword = type === "password";
    const tipoReal = esPassword ? (verContrasena ? "text" : "password") : type;
    const tieneIconoIzq = !!icono || !!prefijo;
    const tieneIconoDer = esPassword || !!sufijo;

    const bloquearDecimales = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (entero && (e.key === "." || e.key === "," || e.key === "e" || e.key === "E")) {
            e.preventDefault();
        }
    };

    return (
        <div className="campo">
            <label className="campo__etiqueta" htmlFor={id}>{label}</label>
            <div className={`campo__contenedor${error ? " campo__contenedor--error" : ""}`}>

                {/* Ícono o prefijo izquierdo */}
                {prefijo && (
                    <span className="campo__prefijo">{prefijo}</span>
                )}
                {icono && !prefijo && (
                    <span className="campo__icono">{icono}</span>
                )}

                <input
                    className={`campo__input${tieneIconoIzq ? " campo__input--con-izq" : ""}${tieneIconoDer ? " campo__input--con-der" : ""}`}
                    id={id}
                    name={name}
                    type={tipoReal}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    min={min}
                    max={max}
                    step={paso}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onKeyDown={entero ? bloquearDecimales : undefined}
                />

                {/* Sufijo derecho */}
                {sufijo && (
                    <span className="campo__sufijo">{sufijo}</span>
                )}

                {/* Toggle contraseña */}
                {esPassword && (
                    <button
                        type="button"
                        className="campo__toggle"
                        onClick={() => setVerContrasena(v => !v)}
                        aria-label={verContrasena ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                        {verContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="campo__error" id={`${id}-error`} role="alert">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}