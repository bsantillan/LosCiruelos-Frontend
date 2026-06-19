import type { ReactNode } from "react";
import Boton from "../Boton/Boton";
import "./ModalConfirmacion.css";

interface ModalConfirmacionProps {
    titulo: string;
    descripcion: string;
    icono: ReactNode;
    variante?: "danger" | "default";
    textoConfirmar?: string;
    textoCancelar?: string;
    cargando?: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export default function ModalConfirmacion({
    titulo,
    descripcion,
    icono,
    variante = "default",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    cargando = false,
    onCerrar,
    onConfirmar,
}: ModalConfirmacionProps) {
    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className={`modal__icono${variante === "danger" ? " modal__icono--danger" : ""}`}>
                    {icono}
                </div>
                <h3 className="modal__titulo">{titulo}</h3>
                <p className="modal__descripcion">{descripcion}</p>
                <div className="modal__acciones">
                    <Boton variante="fantasma" ancho="auto" onClick={onCerrar} type="button">
                        <span>{textoCancelar}</span>
                    </Boton>
                    <Boton variante="primario" ancho="auto" onClick={onConfirmar} cargando={cargando} type="button">
                        <span>{textoConfirmar}</span>
                    </Boton>
                </div>
            </div>
        </div>
    );
}