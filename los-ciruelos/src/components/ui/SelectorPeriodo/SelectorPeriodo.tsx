import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { hoyISO } from "../../../utils/fechas";
import {
    DIAS_SEMANA, NOMBRES_DIAS, aFecha, diasDelMes, limitesDelMes, nombreMes, nombreMesCorto,
} from "../../../utils/calendario";
import "../SelectorFecha/SelectorFecha.css";
import "./SelectorPeriodo.css";

export interface Periodo {
    /** "YYYY-MM-DD" (sin valor = sin límite) */
    desde?: string;
    hasta?: string;
}

type Modo = "dia" | "mes" | "rango";

interface SelectorPeriodoProps {
    valor: Periodo;
    onChange: (periodo: Periodo) => void;
    /**
     * Primera fecha que se puede elegir (por ejemplo, hoy para el EMPLEADO, que no ve el pasado): los
     * días y meses anteriores quedan deshabilitados y "Todo el período" es "desde esa fecha"
     */
    min?: string;
    /** Siempre hay un período elegido: sin la X ni la opción "Todo el período" (el Resumen) */
    obligatorio?: boolean;
    /**
     * De qué fecha a qué fecha va "Todo el período" en esta lista (la primera y la última que hay): se
     * muestra debajo del texto del botón y en la opción del calendario. null mientras se averigua.
     */
    rangoTodo?: { desde: string | null; hasta: string | null } | null;
}

/** "3 Oct 2026 – 20 Dic 2026", o que no hay nada cargado */
function textoRango(rango: { desde: string | null; hasta: string | null }): string {
    if (!rango.desde && !rango.hasta) return "Todavía no hay nada cargado";
    if (rango.desde && rango.hasta) return rango.desde === rango.hasta ? `El ${corta(rango.desde)}` : `Del ${corta(rango.desde)} al ${corta(rango.hasta)}`;
    return rango.desde ? `Desde el ${corta(rango.desde)}` : `Hasta el ${corta(rango.hasta!)}`;
}

/** Fecha corta: "16 oct 2026" (sin año si `conAnio` es false) */
function corta(iso: string, conAnio = true): string {
    const d = aFecha(iso);
    return `${d.getDate()} ${nombreMesCorto(d.getMonth())}${conAnio ? ` ${d.getFullYear()}` : ""}`;
}

/** Texto del botón según el período elegido */
function etiquetaPeriodo({ desde, hasta }: Periodo): string {
    if (!desde && !hasta) return "Todo el período";
    if (desde && hasta) {
        if (desde === hasta) return corta(desde);
        const d = aFecha(desde);
        const mes = limitesDelMes(d.getFullYear(), d.getMonth());
        if (mes.desde === desde && mes.hasta === hasta) return nombreMes(d.getFullYear(), d.getMonth());
        const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
        return `${corta(desde, !mismoAnio)} – ${corta(hasta)}`;
    }
    return desde ? `Desde ${corta(desde)}` : `Hasta ${corta(hasta!)}`;
}

/** Modo con el que se abre el calendario según el valor actual */
function modoDe({ desde, hasta }: Periodo): Modo {
    if (desde && hasta && desde === hasta) return "dia";
    if (desde && hasta) {
        const d = aFecha(desde);
        const mes = limitesDelMes(d.getFullYear(), d.getMonth());
        if (mes.desde === desde && mes.hasta === hasta) return "mes";
    }
    return "rango";
}

/** Ancho del calendario (el mismo del CSS) */
const ANCHO_POPOVER = 300;

const MODOS: { id: Modo; etiqueta: string }[] = [
    { id: "dia", etiqueta: "Día" },
    { id: "mes", etiqueta: "Mes" },
    { id: "rango", etiqueta: "Rango" },
];

export default function SelectorPeriodo({ valor, onChange, min, obligatorio = false, rangoTodo }: SelectorPeriodoProps) {
    const [abierto, setAbierto] = useState(false);
    const [aDerecha, setADerecha] = useState(false);
    const [modo, setModo] = useState<Modo>("dia");
    const [mesVisible, setMesVisible] = useState({ anio: 0, mes: 0 });
    const [anioVisible, setAnioVisible] = useState(0);
    /** En modo rango: el inicio ya elegido, esperando el fin */
    const [inicioRango, setInicioRango] = useState<string | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const disparadorRef = useRef<HTMLButtonElement>(null);
    const hoy = hoyISO();
    // Con mínimo, "sin filtro" es "desde el mínimo" (no hay período anterior para elegir)
    const todo: Periodo = min ? { desde: min } : {};
    const activo = Boolean(valor.hasta || (valor.desde && valor.desde !== min));
    const antes = (fecha: string) => min !== undefined && fecha < min;

    const abrir = () => {
        // Si abajo a la derecha no entra el calendario (el selector está pegado al borde derecho), se
        // abre alineado a la derecha del botón, para que no se corte
        const caja = contenedorRef.current?.getBoundingClientRect();
        setADerecha(caja !== undefined && caja.left + ANCHO_POPOVER > window.innerWidth - 16);
        const base = aFecha(valor.desde ?? valor.hasta ?? hoy);
        setMesVisible({ anio: base.getFullYear(), mes: base.getMonth() });
        setAnioVisible(base.getFullYear());
        setModo(modoDe(valor));
        setInicioRango(null);
        setHover(null);
        setAbierto(true);
    };

    const cerrar = (devolverFoco = true) => {
        setAbierto(false);
        setInicioRango(null);
        if (devolverFoco) disparadorRef.current?.focus();
    };

    const elegir = (periodo: Periodo) => {
        onChange(periodo);
        cerrar();
    };

    // Cerrar con click afuera o Escape
    useEffect(() => {
        if (!abierto) return;
        const click = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) cerrar(false);
        };
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
        document.addEventListener("mousedown", click);
        document.addEventListener("keydown", tecla);
        return () => {
            document.removeEventListener("mousedown", click);
            document.removeEventListener("keydown", tecla);
        };
    }, [abierto]);

    const cambiarMes = (delta: number) => {
        setMesVisible(({ anio, mes }) => {
            const f = new Date(anio, mes + delta, 1);
            return { anio: f.getFullYear(), mes: f.getMonth() };
        });
    };

    const clickDia = (fecha: string) => {
        if (modo === "dia") {
            elegir({ desde: fecha, hasta: fecha });
            return;
        }
        // Rango: primer click = inicio, segundo = fin (en cualquier orden)
        if (!inicioRango) {
            setInicioRango(fecha);
            return;
        }
        const [desde, hasta] = fecha < inicioRango ? [fecha, inicioRango] : [inicioRango, fecha];
        elegir({ desde, hasta });
    };

    // Tramo resaltado: el rango en curso (inicio + hover) o el valor guardado
    const tramo: Periodo = modo === "rango"
        ? inicioRango
            ? { desde: [inicioRango, hover ?? inicioRango].sort()[0], hasta: [inicioRango, hover ?? inicioRango].sort()[1] }
            : valor
        : modo === "dia" ? valor : {};

    const { anio, mes } = mesVisible;

    return (
        <div className="selector-periodo" ref={contenedorRef}>
            <button
                type="button"
                ref={disparadorRef}
                className={`selector-periodo__disparador${activo ? " selector-periodo__disparador--activo" : ""}`}
                onClick={() => (abierto ? cerrar() : abrir())}
                aria-haspopup="dialog"
                aria-expanded={abierto}
            >
                <Calendar size={15} />
                <span className="selector-periodo__textos">
                    <span className="selector-periodo__texto">{etiquetaPeriodo(valor)}</span>
                    {!activo && rangoTodo && <span className="selector-periodo__rango">{textoRango(rangoTodo)}</span>}
                </span>
                <ChevronDown size={14} className="selector-fecha__chevron" />
            </button>
            {activo && !obligatorio && (
                <button
                    type="button"
                    className="selector-periodo__limpiar"
                    onClick={() => onChange(todo)}
                    aria-label="Quitar el filtro de período"
                >
                    <X size={14} />
                </button>
            )}

            {abierto && (
                <div className={`selector-fecha__popover selector-periodo__popover${aDerecha ? " selector-periodo__popover--derecha" : ""}`} role="dialog" aria-label="Elegir período">
                    {/* Día | Mes | Rango */}
                    <div className="selector-periodo__modos" role="tablist" aria-label="Tipo de período">
                        {MODOS.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                role="tab"
                                aria-selected={modo === m.id}
                                className={`selector-periodo__modo${modo === m.id ? " selector-periodo__modo--activo" : ""}`}
                                onClick={() => { setModo(m.id); setInicioRango(null); }}
                            >
                                {m.etiqueta}
                            </button>
                        ))}
                    </div>

                    {modo === "mes" ? (
                        <>
                            <div className="selector-fecha__cabecera">
                                <button type="button" className="selector-fecha__flecha" onClick={() => setAnioVisible(a => a - 1)} aria-label="Año anterior">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="selector-fecha__mes">{anioVisible}</span>
                                <button type="button" className="selector-fecha__flecha" onClick={() => setAnioVisible(a => a + 1)} aria-label="Año siguiente">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="selector-periodo__meses">
                                {Array.from({ length: 12 }, (_, m) => {
                                    const limites = limitesDelMes(anioVisible, m);
                                    // Un mes que empieza antes del mínimo se toma desde el mínimo
                                    const deshabilitado = antes(limites.hasta);
                                    const elegible = antes(limites.desde) && min ? { desde: min, hasta: limites.hasta } : limites;
                                    const elegido = valor.desde === limites.desde && valor.hasta === limites.hasta;
                                    const esActual = hoy.slice(0, 7) === limites.desde.slice(0, 7);
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            className={[
                                                "selector-periodo__mes",
                                                elegido && "selector-fecha__dia--elegido",
                                                esActual && !elegido && "selector-fecha__dia--hoy",
                                            ].filter(Boolean).join(" ")}
                                            onClick={() => elegir(elegible)}
                                            disabled={deshabilitado}
                                            aria-pressed={elegido}
                                            aria-label={nombreMes(anioVisible, m)}
                                        >
                                            {nombreMesCorto(m)}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="selector-fecha__cabecera">
                                <button type="button" className="selector-fecha__flecha" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="selector-fecha__mes" aria-live="polite">{nombreMes(anio, mes)}</span>
                                <button type="button" className="selector-fecha__flecha" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {modo === "rango" && (
                                <p className="selector-periodo__ayuda" aria-live="polite">
                                    {inicioRango ? `Desde ${corta(inicioRango)}: elegí el día de fin` : "Elegí el día de inicio"}
                                </p>
                            )}

                            <div className="selector-fecha__semana" aria-hidden="true">
                                {DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}
                            </div>
                            <div className="selector-fecha__grilla" onMouseLeave={() => setHover(null)}>
                                {diasDelMes(anio, mes).map((fecha, i) => {
                                    if (!fecha) return <span key={`vacio-${i}`} />;
                                    const extremo = fecha === tramo.desde || fecha === tramo.hasta;
                                    const enTramo = !!tramo.desde && !!tramo.hasta && fecha > tramo.desde && fecha < tramo.hasta;
                                    return (
                                        <button
                                            key={fecha}
                                            type="button"
                                            className={[
                                                "selector-fecha__dia",
                                                extremo && "selector-fecha__dia--elegido",
                                                enTramo && "selector-periodo__dia--en-rango",
                                                fecha === hoy && !extremo && "selector-fecha__dia--hoy",
                                            ].filter(Boolean).join(" ")}
                                            onClick={() => clickDia(fecha)}
                                            disabled={antes(fecha)}
                                            onMouseEnter={() => setHover(fecha)}
                                            onFocus={() => setHover(fecha)}
                                            aria-pressed={extremo}
                                            aria-label={`${NOMBRES_DIAS[i % 7]} ${aFecha(fecha).getDate()} de ${nombreMes(anio, mes)}`}
                                        >
                                            {aFecha(fecha).getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {!obligatorio && (
                        <div className="selector-fecha__pie selector-periodo__pie">
                            <button type="button" className="accion accion--chica selector-fecha__hoy" onClick={() => elegir(todo)}>
                                {min ? "Desde hoy en adelante" : "Todo el período"}
                            </button>
                            {rangoTodo && <span className="selector-periodo__rango">{textoRango(rangoTodo)}</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
