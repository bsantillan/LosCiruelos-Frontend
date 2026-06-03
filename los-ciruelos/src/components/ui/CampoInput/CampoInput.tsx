import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./CampoInput.css";

interface CampoInputProps {
    id: string;
    name: string;
    label: string;
    type?: "text" | "email" | "password";
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    icono?: React.ReactNode;
    required?: boolean;
}

export default function CampoInput({
    id, name, label, type = "text", value,
    onChange, placeholder, autoComplete,
    icono, required
}: CampoInputProps) {
    const [verContrasena, setVerContrasena] = useState(false);
    const esPassword = type === "password";
    const tipoReal = esPassword ? (verContrasena ? "text" : "password") : type;

    return (
        <div className="campo">
            <label className="campo__etiqueta" htmlFor={id}>{label}</label>
            <div className="campo__contenedor">
                {icono && (
                    <span className="campo__icono">{icono}</span>
                )}
                <input
                    className="campo__input"
                    id={id}
                    name={name}
                    type={tipoReal}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                />
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
        </div>
    );
}