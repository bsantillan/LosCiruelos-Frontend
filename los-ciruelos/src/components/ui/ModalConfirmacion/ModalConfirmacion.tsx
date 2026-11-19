import { useEffect, type ReactNode } from "react";
import Boton from "../Boton/Boton";
import { AvisoTransitorio } from "../Avisos/Avisos";
import "./ModalConfirmacion.css";

interface ModalConfirmacionProps {
    titulo: string;
    descripcion?: string;
    /** Contenido propio debajo del título (en lugar de, o además de, la descripción) */
    children?: ReactNode;
    icono: ReactNode;
    variante?: "danger" | "default";
    textoConfirmar?: string;
    textoCancelar?: string;
    cargando?: boolean;
    /** Va en el lugar reservado arriba de los botones (como los avisos de adentro) y se va solo */
    error?: string | null;
    /** Cerrar sin hacer nada: click afuera, Escape o el botón secundario si no hay onCancelar */
    onCerrar: () => void;
    onConfirmar: () => void;
    /** Acción del botón secundario cuando tiene que hacer algo distinto de cerrar */
    onCancelar?: () => void;
    /** Clase extra del modal (por ejemplo, para hacerlo más ancho) */
    clase?: string;
}

export default function ModalConfirmacion({
    titulo,
    descripcion,
    children,
    icono,
    variante = "default",
    textoConfirmar = "Confirmar",
    textoCancelar = "Volver",
    cargando = false,
    error,
    onCerrar,
    onConfirmar,
    onCancelar,
    clase,
}: ModalConfirmacionProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !cargando) onCerrar();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [cargando, onCerrar]);

    // Con el modal abierto la página de fondo no scrollea (en el celular se movía por detrás)
    useEffect(() => {
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = anterior; };
    }, []);

    // Todo "Cancelar…" y toda acción destructiva va en rojo. Si uno de los dos botones
    // es rojo, el otro es la opción primaria (verde).
    const confirmarEsPeligro = variante === "danger";
    const secundarioEsPeligro = textoCancelar.startsWith("Cancelar");
    const varianteConfirmar = confirmarEsPeligro ? "peligro" : "primario";
    const varianteSecundario = secundarioEsPeligro ? "peligro" : confirmarEsPeligro ? "primario" : "fantasma";

    return (
        <div className="modal-overlay" onClick={() => !cargando && onCerrar()}>
            <div
                className={clase ? `modal modal--confirmacion ${clase}` : "modal modal--confirmacion"}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-titulo"
                onClick={e => e.stopPropagation()}
            >
                <div className={`modal__icono${variante === "danger" ? " modal__icono--danger" : ""}`}>
                    {icono}
                </div>
                <h3 className="modal__titulo" id="modal-titulo">{titulo}</h3>
                    {/* El ícono, el título y los botones quedan fijos; si no entra, scrollea solo esto */}
                    <div className="modal__cuerpo">
                        {descripcion && <p className="modal__descripcion">{descripcion}</p>}
                        {children}
                    </div>
                    {error && <AvisoTransitorio tipo="error">{error}</AvisoTransitorio>}
                <div className="modal__acciones">
                    <Boton
                        variante={varianteSecundario}
                        ancho="auto"
                        onClick={onCancelar ?? onCerrar}
                        disabled={cargando}
                        type="button"
                    >
                        <span>{textoCancelar}</span>
                    </Boton>
                    <Boton variante={varianteConfirmar} ancho="auto" onClick={onConfirmar} cargando={cargando} type="button">
                        <span>{textoConfirmar}</span>
                    </Boton>
                </div>
            </div>
        </div>
    );
}
