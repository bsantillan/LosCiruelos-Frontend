import { useId, type ReactNode } from "react";
import { AlertCircle, BadgeCheck, CheckCircle2, CircleDashed, Info, RefreshCw } from "lucide-react";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";
import { formatFechaHora } from "../../utils/fechas";
import "./Admin.css";

/**
 * Icono de ayuda (i): al pasar el mouse, o al tocarlo en el celular, muestra qué representa una
 * tarjeta o un gráfico, en palabras simples (no cómo se calcula).
 */
export function Ayuda({ children }: { children: ReactNode }) {
    const id = useId();
    return (
        <span className="ayuda">
            <button type="button" className="ayuda__boton" aria-label="Qué representa" aria-describedby={id}>
                <Info size={14} />
            </button>
            <span role="tooltip" id={id} className="ayuda__popup">{children}</span>
        </span>
    );
}

/** Título de la sección del panel, con su descripción y acciones a la derecha */
export function Encabezado({ titulo, descripcion, acciones }: {
    titulo: string;
    descripcion?: ReactNode;
    acciones?: ReactNode;
}) {
    return (
        <div className="admin-encabezado">
            <div>
                <h1 className="admin-encabezado__titulo">{titulo}</h1>
                {descripcion && <p className="admin-encabezado__desc">{descripcion}</p>}
            </div>
            {acciones && <div className="admin-encabezado__acciones">{acciones}</div>}
        </div>
    );
}

/**
 * Botón "Actualizar" de las secciones (Resumen, Reservas, Ventas, Usuarios): el mismo en todas.
 * Mientras se vuelve a pedir la lista, el ícono gira y el botón queda deshabilitado.
 */
export function BotonActualizar({ onClick, cargando = false }: { onClick: () => void; cargando?: boolean }) {
    return (
        <button type="button" className="accion" onClick={onClick} disabled={cargando} aria-busy={cargando}>
            <RefreshCw size={15} className={cargando ? "accion__girando" : undefined} />
            Actualizar
        </button>
    );
}

/**
 * Mensaje de éxito o de error de una operación: se va solo y no corre nada de lugar (flota en la
 * página o va al lugar reservado del popup; ver components/ui/Avisos). Con `fijo` es una nota que
 * queda en su lugar mientras se cumple lo que explica (un perfil incompleto, un QR esperando).
 */
export function Mensaje({ tipo, fijo = false, children }: { tipo: "ok" | "error"; fijo?: boolean; children: ReactNode }) {
    if (!fijo) return <AvisoTransitorio tipo={tipo}>{children}</AvisoTransitorio>;
    return (
        <p className={`admin-mensaje admin-mensaje--${tipo}`} role={tipo === "error" ? "alert" : "status"}>
            {tipo === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{children}</span>
        </p>
    );
}

export function Cargando() {
    return (
        <div className="admin-vacio">
            <div className="admin-spinner" aria-label="Cargando" />
        </div>
    );
}

export function Vacio({ icono, children }: { icono: ReactNode; children: ReactNode }) {
    return (
        <div className="admin-vacio">
            {icono}
            <p>{children}</p>
        </div>
    );
}

/** Barra de pestañas de una sección. Las flechas izquierda y derecha mueven entre pestañas. */
export function Pestanas<T extends string>({ opciones, valor, onChange, etiqueta }: {
    opciones: { id: T; etiqueta: string; icono?: ReactNode }[];
    valor: T;
    onChange: (id: T) => void;
    etiqueta: string;
}) {
    const mover = (e: React.KeyboardEvent, i: number) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const siguiente = opciones[(i + (e.key === "ArrowRight" ? 1 : opciones.length - 1)) % opciones.length];
        onChange(siguiente.id);
        const barra = e.currentTarget.parentElement;
        requestAnimationFrame(() => barra?.querySelector<HTMLButtonElement>("[aria-selected=true]")?.focus());
    };
    return (
        <div className="admin-tabs" role="tablist" aria-label={etiqueta}>
            {opciones.map((o, i) => (
                <button key={o.id} type="button" role="tab" aria-selected={valor === o.id} tabIndex={valor === o.id ? 0 : -1}
                    className={`admin-tab${valor === o.id ? " admin-tab--activa" : ""}`}
                    onClick={() => onChange(o.id)} onKeyDown={e => mover(e, i)}>
                    {o.icono}
                    {o.etiqueta}
                </button>
            ))}
        </div>
    );
}

/**
 * Estado de verificación de un cobro con Cuenta DNI (no tiene API: el ADMIN controla en la cuenta
 * del club que la plata entró). El ADMIN lo marca o desmarca; el EMPLEADO solo lo ve.
 */
const TEXTOS_VERIFICACION = { si: "Verificado", no: "Sin verificar", marcar: "Marcar verificado", quitar: "Quitar verificación" };

export function VerificacionCuentaDni({ verificado, verificadoAt, puedeCambiar, ocupado = false, onCambiar, textos = TEXTOS_VERIFICACION }: {
    verificado: boolean;
    verificadoAt: string | null;
    puedeCambiar: boolean;
    ocupado?: boolean;
    onCambiar: (verificado: boolean) => void;
    /** Para usarlo en otro control (por ejemplo, la revisión de una devolución) */
    textos?: typeof TEXTOS_VERIFICACION;
}) {
    return (
        <span className="verificacion-dni">
            <span className={`admin-chip ${verificado ? "admin-chip--ok" : "admin-chip--alerta"}`}
                title={verificado && verificadoAt ? `${textos.si} el ${formatFechaHora(verificadoAt)}` : undefined}>
                {verificado ? <BadgeCheck size={12} /> : <CircleDashed size={12} />}
                {verificado ? textos.si : textos.no}
            </span>
            {puedeCambiar && (
                <button type="button" className="verificacion-dni__boton" disabled={ocupado} onClick={() => onCambiar(!verificado)}>
                    {verificado ? textos.quitar : textos.marcar}
                </button>
            )}
        </span>
    );
}
