import { Children, isValidElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { CanalAvisos, DURACION, useListaAvisos, type AvisoPublicado, type TipoAviso } from "./contexto";
import "./Avisos.css";

/** Un aviso: ícono, texto y X. Se va solo; con el mouse (o el foco) encima, espera. */
export function ItemAviso({ aviso, retirar }: { aviso: AvisoPublicado; retirar: (id: number) => void }) {
    const [pausado, setPausado] = useState(false);
    const restante = useRef(DURACION[aviso.tipo]);
    const { id } = aviso;
    useEffect(() => {
        if (pausado) return;
        const desde = Date.now();
        const t = setTimeout(() => retirar(id), restante.current);
        return () => { clearTimeout(t); restante.current = Math.max(1500, restante.current - (Date.now() - desde)); };
    }, [pausado, retirar, id]);
    const onCerrar = () => retirar(id);

    return (
        <div className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : "status"}
            onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}
            onFocus={() => setPausado(true)} onBlur={() => setPausado(false)}>
            {aviso.tipo === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="aviso__texto">{aviso.contenido}</span>
            <button type="button" className="aviso__cerrar" aria-label="Cerrar aviso" onClick={onCerrar}>
                <X size={14} />
            </button>
        </div>
    );
}

/** Los avisos flotantes de toda la app (fuera de los popups). Va una vez, alrededor de las rutas. */
export function AvisosProvider({ children }: { children: ReactNode }) {
    const { avisos, canal, retirar } = useListaAvisos();
    return (
        <CanalAvisos.Provider value={canal}>
            {children}
            {createPortal(
                <div className="avisos-flotantes" aria-live="polite">
                    {avisos.map(a => <ItemAviso key={a.id} aviso={a} retirar={retirar} />)}
                </div>,
                document.body,
            )}
        </CanalAvisos.Provider>
    );
}

/** El texto de un contenido (para saber si el aviso cambió sin depender de la identidad del JSX) */
function textoDe(nodo: ReactNode): string {
    if (nodo === null || nodo === undefined || typeof nodo === "boolean") return "";
    if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
    if (Array.isArray(nodo)) return nodo.map(textoDe).join("");
    if (isValidElement<{ children?: ReactNode }>(nodo)) return Children.toArray(nodo.props.children).map(textoDe).join("");
    return "";
}

/**
 * Publica un aviso mientras está montado: flota arriba a la derecha de la ventana (también desde un popup).
 * No dibuja nada en su lugar. Un aviso con el mismo texto no se vuelve a mostrar hasta que se
 * desmonta y se vuelve a montar (por ejemplo, el error de un segundo intento).
 */
export function AvisoTransitorio({ tipo, children }: { tipo: TipoAviso; children: ReactNode }) {
    const canal = useContext(CanalAvisos);
    const clave = `${tipo}|${textoDe(children)}`;
    // Se vuelve a publicar solo si cambia el texto (el JSX es otro en cada render)
    useEffect(() => {
        if (!canal) return;
        const id = canal.publicar(tipo, children);
        return () => canal.retirar(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canal, clave, tipo]);
    return null;
}
