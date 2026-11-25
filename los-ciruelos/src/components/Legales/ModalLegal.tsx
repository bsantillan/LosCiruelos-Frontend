import { useEffect } from "react";
import { X } from "lucide-react";
import Boton from "../ui/Boton/Boton";
import TextoTerminos from "./TextoTerminos";
import TextoPrivacidad from "./TextoPrivacidad";
import { DATOS_LEGALES } from "../../config/legales";
import "../ui/ModalConfirmacion/ModalConfirmacion.css";
import "./Legales.css";

export type DocumentoLegal = "terminos" | "privacidad";

const TITULOS: Record<DocumentoLegal, string> = {
    terminos: "Términos y condiciones",
    privacidad: "Política de privacidad",
};

interface ModalLegalProps {
    documento: DocumentoLegal;
    onCerrar: () => void;
    /** Si está, el modal ofrece "Leí y acepto" (en el registro); si no, solo se lee y se cierra */
    onAceptar?: () => void;
}

/** Los términos o la política de privacidad en un modal, sin salir de la pantalla en la que se está */
export default function ModalLegal({ documento, onCerrar, onAceptar }: ModalLegalProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onCerrar]);

    // Con el modal abierto la página de fondo no scrollea
    useEffect(() => {
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = anterior; };
    }, []);

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div
                className="modal modal--confirmacion modal-legal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-legal-titulo"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-legal__cabecera">
                    <div>
                        <h3 className="modal__titulo" id="modal-legal-titulo">{TITULOS[documento]}</h3>
                        <p className="legales-vigencia">Vigente desde: {DATOS_LEGALES.vigencia}</p>
                    </div>
                    <button type="button" className="modal-legal__cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>
                <div className="modal__cuerpo legales-texto">
                    {documento === "terminos" ? <TextoTerminos /> : <TextoPrivacidad />}
                </div>
                <div className="modal__acciones">
                    {onAceptar ? (
                        <>
                            <Boton variante="fantasma" ancho="auto" onClick={onCerrar}><span>Cerrar</span></Boton>
                            <Boton variante="primario" ancho="auto" onClick={() => { onAceptar(); onCerrar(); }}>
                                <span>Leí y acepto</span>
                            </Boton>
                        </>
                    ) : (
                        <Boton variante="primario" ancho="auto" onClick={onCerrar}><span>Cerrar</span></Boton>
                    )}
                </div>
            </div>
        </div>
    );
}
