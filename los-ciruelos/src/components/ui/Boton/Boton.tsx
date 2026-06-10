import "./Boton.css";

interface BotonProps {
    children: React.ReactNode;
    type?: "submit" | "button";
    variante?: "primario" | "secundario" | "fantasma";
    cargando?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    ancho?: "completo" | "auto";
}

export default function Boton({
    children, type = "button", variante = "primario",
    cargando = false, disabled = false, onClick, ancho = "completo"
}: BotonProps) {
    return (
        <button
            type={type}
            className={`boton boton--${variante} boton--${ancho}`}
            disabled={disabled || cargando}
            onClick={onClick}
            aria-busy={cargando}
        >
            {cargando
                ? <span className="boton__spinner" aria-label="Cargando" />
                : children
            }
        </button>
    );
}