import { AlertCircle } from "lucide-react";
import PhoneInput, { type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import es from "react-phone-number-input/locale/es";
import "react-phone-number-input/style.css";
import "../CampoInput/CampoInput.css";
import SelectorPais from "./SelectorPais";
import "./CampoTelefono.css";

/** Argentina y los países cercanos primero; después, todos en orden alfabético */
const PRIMEROS: (Country | "|" | "...")[] = ["AR", "UY", "CL", "PY", "BR", "BO", "|", "..."];

interface CampoTelefonoProps {
    id: string;
    name: string;
    label: string;
    /** En formato internacional ("+5491123456789"), o "" vacío (ver aInternacional en utils/telefono) */
    value: string;
    onChange: (valor: string) => void;
    required?: boolean;
    error?: string;
    disabled?: boolean;
}

/**
 * Un celular con el selector de país: la bandera y el código (+54) quedan fijos a la izquierda y el
 * número se escribe con el formato de ese país. La lista de países (SelectorPais) tiene buscador y la
 * estética del sitio. Devuelve el número en formato internacional
 * ("+5491123456789"), que el backend normaliza al de WhatsApp. Por defecto, Argentina.
 */
export default function CampoTelefono({ id, name, label, value, onChange, required, error, disabled }: CampoTelefonoProps) {
    return (
        <div className="campo">
            <label className="campo__etiqueta" htmlFor={id}>{label}</label>
            <PhoneInput
                className={`campo-telefono${error ? " campo-telefono--error" : ""}${disabled ? " campo-telefono--deshabilitado" : ""}`}
                id={id}
                name={name}
                value={value || undefined}
                onChange={v => onChange(v ?? "")}
                defaultCountry="AR"
                international
                countryCallingCodeEditable={false}
                countryOptionsOrder={PRIMEROS}
                addInternationalOption={false}
                flags={flags}
                labels={es}
                countrySelectComponent={SelectorPais}
                focusInputOnCountrySelection
                autoComplete="tel"
                required={required}
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
            />
            {error && (
                <div className="campo__error" id={`${id}-error`} role="alert">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
