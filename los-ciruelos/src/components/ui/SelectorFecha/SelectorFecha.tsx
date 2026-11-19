import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { fechaISO, formatFecha, hoyISO, sumarDias } from "../../../utils/fechas";
import { DIAS_SEMANA, NOMBRES_DIAS, aFecha, diasDelMes, nombreMes } from "../../../utils/calendario";
import "./SelectorFecha.css";

interface SelectorFechaProps {
    /** Fecha elegida, "YYYY-MM-DD"; null si todavía no se eligió */
    valor: string | null;
    onChange: (fecha: string) => void;
    /** Primera fecha que se puede elegir (por defecto, hoy) */
    min?: string;
    /** Última fecha que se puede elegir (sin tope si no viene) */
    max?: string | null;
    /** Días en que el club no abre: se marcan en el calendario y no se pueden elegir */
    cerrados?: { fecha: string; motivo: string }[];
    /** Los días cerrados se marcan pero se pueden elegir (el panel, para ver qué había ese día) */
    elegirCerrados?: boolean;
}

export default function SelectorFecha({ valor, onChange, min = hoyISO(), max = null, cerrados = [], elegirCerrados = false }: SelectorFechaProps) {
    // Sin fecha elegida, el calendario abre en la primera que se puede elegir
    const base = valor ?? min;
    const fueraDeRango = (fecha: string) => fecha < min || (max !== null && fecha > max);
    const [abierto, setAbierto] = useState(false);
    // Mes visible en el calendario y día con foco de teclado
    const [mesVisible, setMesVisible] = useState(() => {
        const f = aFecha(base);
        return { anio: f.getFullYear(), mes: f.getMonth() };
    });
    const [enfocado, setEnfocado] = useState(base);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const disparadorRef = useRef<HTMLButtonElement>(null);
    const grillaRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const hoy = hoyISO();
    // El calendario flota (portal con posición fija): no agranda ni hace scrollear el popup o la
    // página donde está. Se abre debajo del botón o, si abajo no entra, arriba.
    const [posicion, setPosicion] = useState<CSSProperties>({ visibility: "hidden" });

    const abrir = () => {
        const f = aFecha(base);
        setMesVisible({ anio: f.getFullYear(), mes: f.getMonth() });
        setEnfocado(base);
        setPosicion({ visibility: "hidden" });
        setAbierto(true);
    };

    const cerrar = (devolverFoco = true) => {
        setAbierto(false);
        if (devolverFoco) disparadorRef.current?.focus();
    };

    const elegir = (fecha: string) => {
        if (fueraDeRango(fecha)) return;
        onChange(fecha);
        cerrar();
    };

    const cambiarMes = (delta: number) => {
        setMesVisible(({ anio, mes }) => {
            const f = new Date(anio, mes + delta, 1);
            return { anio: f.getFullYear(), mes: f.getMonth() };
        });
    };

    // Ubicar el calendario junto al botón (y seguirlo si se scrollea o cambia el tamaño de la ventana)
    useLayoutEffect(() => {
        if (!abierto) return;
        const ubicar = () => {
            const boton = disparadorRef.current?.getBoundingClientRect();
            const pop = popoverRef.current;
            if (!boton || !pop) return;
            const ancho = pop.offsetWidth, alto = pop.offsetHeight, margen = 8;
            const left = Math.min(Math.max(16, boton.left + boton.width / 2 - ancho / 2), window.innerWidth - ancho - 16);
            const abajo = window.innerHeight - boton.bottom - margen;
            const arriba = boton.top - margen;
            const top = abajo >= alto || abajo >= arriba
                ? Math.min(boton.bottom + margen, window.innerHeight - alto - margen)
                : Math.max(margen, boton.top - margen - alto);
            setPosicion({ left, top: Math.max(margen, top) });
        };
        ubicar();
        window.addEventListener("resize", ubicar);
        window.addEventListener("scroll", ubicar, true);
        return () => { window.removeEventListener("resize", ubicar); window.removeEventListener("scroll", ubicar, true); };
    }, [abierto, mesVisible]);

    // Cerrar con click afuera (el calendario está en un portal: también cuenta como adentro)
    useEffect(() => {
        if (!abierto) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (contenedorRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
            cerrar(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [abierto]);

    // El foco de teclado sigue al día enfocado
    useEffect(() => {
        if (!abierto) return;
        grillaRef.current?.querySelector<HTMLButtonElement>(`[data-fecha="${enfocado}"]`)?.focus();
    }, [abierto, enfocado, mesVisible]);

    const moverFoco = (dias: number) => {
        const nueva = sumarDias(enfocado, dias);
        const destino = nueva < min ? min : max !== null && nueva > max ? max : nueva;
        setEnfocado(destino);
        const f = aFecha(destino);
        setMesVisible({ anio: f.getFullYear(), mes: f.getMonth() });
    };

    const onTeclaGrilla = (e: React.KeyboardEvent) => {
        const acciones: Record<string, () => void> = {
            ArrowLeft: () => moverFoco(-1),
            ArrowRight: () => moverFoco(1),
            ArrowUp: () => moverFoco(-7),
            ArrowDown: () => moverFoco(7),
            PageUp: () => moverFoco(-30),
            PageDown: () => moverFoco(30),
            Enter: () => elegir(enfocado),
            " ": () => elegir(enfocado),
            Escape: () => cerrar(),
        };
        const accion = acciones[e.key];
        if (accion) {
            e.preventDefault();
            accion();
        }
    };

    const { anio, mes } = mesVisible;
    const celdas = diasDelMes(anio, mes);
    const mesAnteriorDeshabilitado = fechaISO(new Date(anio, mes, 0)) < min; // último día del mes anterior
    const mesSiguienteDeshabilitado = max !== null && fechaISO(new Date(anio, mes + 1, 1)) > max;

    return (
        <div className="selector-fecha" ref={contenedorRef}>
            <button
                type="button"
                className="selector-fecha__flecha"
                onClick={() => valor && onChange(sumarDias(valor, -1))}
                disabled={!valor || valor <= min}
                aria-label="Día anterior"
            >
                <ChevronLeft size={18} />
            </button>

            <button
                type="button"
                ref={disparadorRef}
                className={`selector-fecha__disparador${abierto ? " selector-fecha__disparador--abierto" : ""}`}
                onClick={() => (abierto ? cerrar() : abrir())}
                aria-haspopup="dialog"
                aria-expanded={abierto}
            >
                <Calendar size={15} />
                <span className={`selector-fecha__texto${valor ? "" : " selector-fecha__texto--vacio"}`}>{valor ? formatFecha(valor) : "Elegí la fecha"}</span>
                <ChevronDown size={14} className="selector-fecha__chevron" />
            </button>

            <button
                type="button"
                className="selector-fecha__flecha"
                onClick={() => onChange(valor ? sumarDias(valor, 1) : min)}
                disabled={valor !== null && max !== null && valor >= max}
                aria-label="Día siguiente"
            >
                <ChevronRight size={18} />
            </button>

            {abierto && createPortal(
                <div className="selector-fecha__popover selector-fecha__popover--flotante" role="dialog" aria-label="Elegir fecha"
                    ref={popoverRef} style={posicion}>
                    <div className="selector-fecha__cabecera">
                        <button
                            type="button"
                            className="selector-fecha__flecha"
                            onClick={() => cambiarMes(-1)}
                            disabled={mesAnteriorDeshabilitado}
                            aria-label="Mes anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="selector-fecha__mes" aria-live="polite">{nombreMes(anio, mes)}</span>
                        <button
                            type="button"
                            className="selector-fecha__flecha"
                            onClick={() => cambiarMes(1)}
                            disabled={mesSiguienteDeshabilitado}
                            aria-label="Mes siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="selector-fecha__semana" aria-hidden="true">
                        {DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="selector-fecha__grilla" role="grid" ref={grillaRef} onKeyDown={onTeclaGrilla}>
                        {celdas.map((fecha, i) => {
                            if (!fecha) return <span key={`vacio-${i}`} />;
                            const cierre = cerrados.find(c => c.fecha === fecha);
                            const deshabilitado = fueraDeRango(fecha) || (cierre !== undefined && !elegirCerrados);
                            const elegido = fecha === valor;
                            const esHoy = fecha === hoy;
                            return (
                                <button
                                    key={fecha}
                                    type="button"
                                    data-fecha={fecha}
                                    className={[
                                        "selector-fecha__dia",
                                        elegido && "selector-fecha__dia--elegido",
                                        esHoy && "selector-fecha__dia--hoy",
                                        cierre && "selector-fecha__dia--cerrado",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => elegir(fecha)}
                                    disabled={deshabilitado}
                                    tabIndex={fecha === enfocado ? 0 : -1}
                                    aria-selected={elegido}
                                    aria-current={esHoy ? "date" : undefined}
                                    aria-label={`${NOMBRES_DIAS[i % 7]} ${formatFecha(fecha)}${cierre ? `, el club está cerrado: ${cierre.motivo}` : ""}`}
                                    title={cierre ? `Cerrado: ${cierre.motivo}` : undefined}
                                >
                                    {aFecha(fecha).getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="selector-fecha__pie">
                        <button type="button" className="accion accion--chica selector-fecha__hoy" onClick={() => elegir(hoy)} disabled={hoy < min}>
                            Hoy
                        </button>
                        <button type="button" className="accion accion--chica selector-fecha__hoy" onClick={() => elegir(sumarDias(hoy, 1))} disabled={fueraDeRango(sumarDias(hoy, 1))}>
                            Mañana
                        </button>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
