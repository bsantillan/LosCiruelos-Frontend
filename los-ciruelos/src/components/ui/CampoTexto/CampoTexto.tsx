import "../CampoInput/CampoInput.css";
import "./CampoTexto.css";

/**
 * Texto largo (una descripción) con el mismo estilo que CampoInput y un contador de caracteres: no
 * deja pasar el máximo y avisa cuando falta poco.
 */
export default function CampoTexto({ id, label, value, onChange, maximo, placeholder, filas = 4, error }: {
    id: string;
    label: string;
    value: string;
    onChange: (valor: string) => void;
    maximo: number;
    placeholder?: string;
    filas?: number;
    error?: string;
}) {
    const quedan = maximo - value.length;
    return (
        <div className="campo campo-texto">
            <label className="campo__etiqueta" htmlFor={id}>{label}</label>
            <textarea
                id={id}
                className={`campo__input campo-texto__area${error ? " campo__input--error" : ""}`}
                value={value}
                rows={filas}
                placeholder={placeholder}
                maxLength={maximo}
                onChange={e => onChange(e.target.value.slice(0, maximo))}
                aria-describedby={`${id}-contador`}
                aria-invalid={Boolean(error)}
            />
            <div className="campo-texto__pie">
                {error ? <span className="campo-texto__error" role="alert">{error}</span> : <span />}
                <span id={`${id}-contador`} className={`campo-texto__contador${quedan <= 20 ? " campo-texto__contador--poco" : ""}`}>
                    {value.length} / {maximo}
                </span>
            </div>
        </div>
    );
}
