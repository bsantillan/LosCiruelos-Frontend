import { AlertCircle } from "lucide-react";
import "./CampoToggle.css";

interface CampoToggleProps {
    id: string;
    name: string;
    label: string;
    descripcion?: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    disabled?: boolean;
}

export default function CampoToggle({
    id, name, label, descripcion,
    checked, onChange, error, disabled
}: CampoToggleProps) {
    return (
        <div className="campo-toggle">
            <label className="campo-toggle__label" htmlFor={id}>
                <div className="campo-toggle__textos">
                    <span className="campo-toggle__titulo">{label}</span>
                    {descripcion && (
                        <span className="campo-toggle__descripcion">{descripcion}</span>
                    )}
                </div>
                <div className={`campo-toggle__pista${checked ? " campo-toggle__pista--activa" : ""}${disabled ? " campo-toggle__pista--deshabilitada" : ""}`}>
                    <input
                        type="checkbox"
                        id={id}
                        name={name}
                        checked={checked}
                        onChange={onChange}
                        disabled={disabled}
                        className="campo-toggle__input"
                        aria-describedby={error ? `${id}-error` : undefined}
                    />
                    <span className="campo-toggle__pulgar" />
                </div>
            </label>
            {error && (
                <div className="campo__error" id={`${id}-error`} role="alert">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}