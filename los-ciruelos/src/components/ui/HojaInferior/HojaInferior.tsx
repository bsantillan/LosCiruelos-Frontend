import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import "./HojaInferior.css";

interface HojaInferiorProps {
    /** Nombre del diálogo para lectores de pantalla */
    titulo: string;
    children: ReactNode;
    onCerrar: () => void;
    /** Mientras se procesa algo no se puede cerrar */
    bloqueada?: boolean;
}

/**
 * Panel que sube desde abajo de la pantalla (bottom sheet), para celulares: muestra
 * contenido que en escritorio va en una columna lateral. Se cierra con la X, tocando
 * afuera o con Escape, y mientras está abierta la página de fondo no scrollea.
 * Usar dentro de <AnimatePresence> para que también se anime al cerrarse.
 */
export default function HojaInferior({ titulo, children, onCerrar, bloqueada = false }: HojaInferiorProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !bloqueada) onCerrar();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [bloqueada, onCerrar]);

    useEffect(() => {
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = anterior; };
    }, []);

    return (
        <motion.div
            className="hoja-overlay"
            onClick={() => !bloqueada && onCerrar()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="hoja"
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                onClick={e => e.stopPropagation()}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
            >
                <div className="hoja__barra" aria-hidden="true" />
                <button
                    type="button"
                    className="hoja__cerrar"
                    onClick={onCerrar}
                    disabled={bloqueada}
                    aria-label="Cerrar"
                >
                    <X size={18} />
                </button>
                <div className="hoja__contenido">{children}</div>
            </motion.div>
        </motion.div>
    );
}
