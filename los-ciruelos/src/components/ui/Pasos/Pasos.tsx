import { Check } from "lucide-react";
import "./Pasos.css";

/**
 * Indicador de los pasos de un asistente. Los pasos ya hechos se pueden tocar para volver a ellos;
 * hacia adelante se avanza con el botón "Siguiente" del asistente (que valida el paso actual).
 */
export default function Pasos({ pasos, actual, onIr }: {
    pasos: string[];
    /** Índice del paso actual */
    actual: number;
    onIr: (indice: number) => void;
}) {
    return (
        <ol className="pasos" aria-label="Pasos">
            {pasos.map((nombre, i) => {
                const estado = i < actual ? "hecho" : i === actual ? "actual" : "pendiente";
                return (
                    <li key={nombre} className={`pasos__paso pasos__paso--${estado}`} aria-current={i === actual ? "step" : undefined}>
                        <button type="button" className="pasos__boton" disabled={i >= actual} onClick={() => onIr(i)}
                            aria-label={`Paso ${i + 1}: ${nombre}${estado === "hecho" ? " (volver)" : ""}`}>
                            <span className="pasos__numero">{estado === "hecho" ? <Check size={14} /> : i + 1}</span>
                            <span className="pasos__nombre">{nombre}</span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}
