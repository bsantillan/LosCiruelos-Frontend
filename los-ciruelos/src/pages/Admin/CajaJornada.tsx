import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { adminService } from "../../services/adminService";
import type { CajaJornada as Caja, MovimientoCaja, TipoMovimientoCaja } from "../../types/admin.types";
import { useJornada } from "../../hooks/useJornada";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import { formatFecha, formatFechaHora, formatHora, formatMonto } from "../../utils/fechas";
import { AYUDA_KPI, AYUDA_SECCION } from "./ayudasResumen";
import { Ayuda, BotonActualizar, Cargando, Encabezado, Mensaje, Vacio } from "./comunes";
import "./ReservasAdmin.css";
import "./Resumen.css";

const ETIQUETA_MEDIO: Record<string, string> = {
    EFECTIVO: "Efectivo", MERCADO_PAGO: "Mercado Pago", CUENTA_DNI: "Cuenta DNI", TARJETA: "Tarjeta",
};
const ETIQUETA_TIPO: Record<TipoMovimientoCaja, string> = { COBRO: "Cobro", VENTA: "Venta", DEVOLUCION: "Devolución", ANULACION: "Anulación" };

/**
 * Caja de la jornada (EMPLEADO): para contar la plata al cerrar. Cuánto efectivo tiene que haber, lo
 * cobrado por cada medio, lo devuelto y lo que queda para entregar, y cada movimiento con su hora.
 * La jornada va de la apertura de un día a la del siguiente: un cobro de las 00:30 es de la anterior.
 */
export default function CajaJornada() {
    // Se pide sin fecha: el backend usa la jornada en curso (a las 00:30 sigue siendo la del día anterior).
    // La fecha de useJornada solo se usa para volver a pedir cuando cambia la jornada.
    const jornada = useJornada();
    const [version, setVersion] = useState(0);
    const clave = `${jornada}|${version}`;
    const [resultado, setResultado] = useState<{ clave: string; caja?: Caja; error?: string } | null>(null);

    useEffect(() => {
        let activo = true;
        adminService.caja()
            .then(caja => { if (activo) setResultado({ clave, caja }); })
            .catch(e => { if (activo) setResultado({ clave, error: primerError(extraerErrores(e, "No se pudo cargar la caja.")) }); });
        return () => { activo = false; };
    }, [clave]);

    const actual = resultado?.clave === clave ? resultado : null;
    const c = actual?.caja ?? resultado?.caja;

    return (
        <div className="admin-pagina">
            <Encabezado
                titulo="Caja de la jornada"
                descripcion={<>
                    Lo que entró y salió en tu jornada, <span style={{ textTransform: "capitalize" }}>{formatFecha(c?.fecha ?? jornada)}</span>
                    {c?.inicio && c.fin ? <>, de las {formatHora(c.inicio)} a las {formatHora(c.fin)} del día siguiente</> : " (hasta la apertura del día siguiente)"}.
                    Usalo para contar la plata al cerrar.
                </>}
                acciones={<BotonActualizar onClick={() => setVersion(v => v + 1)} cargando={resultado !== null && actual === null} />}
            />

            {!c && !actual?.error ? <Cargando /> : !c ? (
                <Mensaje fijo tipo="error">{actual?.error}</Mensaje>
            ) : (
                <>
                    <section className="resumen-grupo">
                        <div className="admin-kpis">
                            <div className="admin-kpi admin-kpi--principal">
                                {AYUDA_KPI["Efectivo en la caja"] && <Ayuda>{AYUDA_KPI["Efectivo en la caja"]}</Ayuda>}
                                <span className="admin-kpi__etiqueta">Efectivo en la caja</span>
                                <span className="admin-kpi__valor">{formatMonto(c.efectivoEnCaja)}</span>
                                <span className="admin-kpi__detalle">
                                    Cobrado {formatMonto(c.cobrado.efectivo)}{c.devuelto.efectivo > 0 && ` − devuelto ${formatMonto(c.devuelto.efectivo)}`}
                                </span>
                            </div>
                            <div className="admin-kpi">
                                {AYUDA_KPI["Mercado Pago"] && <Ayuda>{AYUDA_KPI["Mercado Pago"]}</Ayuda>}
                                <span className="admin-kpi__etiqueta">Mercado Pago</span>
                                <span className="admin-kpi__valor">{formatMonto(c.cobrado.mercadoPago)}</span>
                                <span className="admin-kpi__detalle">Online, QR, transferencia y tarjeta en su posnet</span>
                            </div>
                            <div className="admin-kpi">
                                {AYUDA_KPI["Cuenta DNI"] && <Ayuda>{AYUDA_KPI["Cuenta DNI"]}</Ayuda>}
                                <span className="admin-kpi__etiqueta">Cuenta DNI</span>
                                <span className="admin-kpi__valor">{formatMonto(c.cobrado.cuentaDni)}</span>
                            </div>
                            <div className="admin-kpi">
                                {AYUDA_KPI["Tarjeta"] && <Ayuda>{AYUDA_KPI["Tarjeta"]}</Ayuda>}
                                <span className="admin-kpi__etiqueta">Tarjeta</span>
                                <span className="admin-kpi__valor">{formatMonto(c.cobrado.tarjeta ?? 0)}</span>
                                <span className="admin-kpi__detalle">Otro posnet (Clover…)</span>
                            </div>
                            <div className={`admin-kpi${c.devuelto.total > 0 ? " admin-kpi--error" : ""}`}>
                                {AYUDA_KPI["Devuelto"] && <Ayuda>{AYUDA_KPI["Devuelto"]}</Ayuda>}
                                <span className="admin-kpi__etiqueta">Devuelto</span>
                                <span className="admin-kpi__valor">{c.devuelto.total > 0 ? `− ${formatMonto(c.devuelto.total)}` : formatMonto(0)}</span>
                                <span className="admin-kpi__detalle">Devoluciones entregadas</span>
                            </div>
                            <div className={`admin-kpi${c.aEntregar.cantidad > 0 ? " admin-kpi--alerta" : ""}`}>
                                {AYUDA_KPI["Para entregar"] && <Ayuda>{AYUDA_KPI["Para entregar"]}</Ayuda>}
                                <span className="admin-kpi__etiqueta">Para entregar</span>
                                <span className="admin-kpi__valor">{formatMonto(c.aEntregar.monto)}</span>
                                <span className="admin-kpi__detalle">
                                    {c.aEntregar.cantidad === 0 ? "No queda nada por devolver"
                                        : `${c.aEntregar.cantidad === 1 ? "1 devolución" : `${c.aEntregar.cantidad} devoluciones`}: están en Reservas`}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="resumen-grupo">
                        <div className="resumen-grupo__cabecera">
                            <h2 className="resumen-grupo__titulo">Movimientos<Ayuda>{AYUDA_SECCION["Movimientos"]}</Ayuda></h2>
                            <p className="resumen-grupo__desc">Cada cobro, venta, devolución y anulación de la jornada, en orden.</p>
                        </div>
                        {c.movimientos.length === 0 ? (
                            <Vacio icono={<Wallet size={28} />}>Todavía no hubo movimientos en esta jornada.</Vacio>
                        ) : (
                            <TablaMovimientos movimientos={c.movimientos} />
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function TablaMovimientos({ movimientos }: { movimientos: MovimientoCaja[] }) {
    return (
        <div className="admin-tabla-contenedor">
            <table className="admin-tabla">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Movimiento</th>
                        <th>Medio</th>
                        <th>Registró</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
                    {movimientos.map((m, i) => (
                        <tr key={i} className={m.tipo === "ANULACION" ? "admin-tabla__inactiva" : undefined}>
                            <td className="admin-tabla__titulo-celda">
                                <span className="admin-tabla__principal">{formatHora(m.fecha)}</span>
                                <span className="admin-tabla__secundario">{formatFechaHora(m.fecha).split(" a las ")[0]}</span>
                            </td>
                            <td data-label="Movimiento">
                                <span className="admin-chip">{ETIQUETA_TIPO[m.tipo]}</span> {m.detalle}
                            </td>
                            <td data-label="Medio">{ETIQUETA_MEDIO[m.medio] ?? m.medio}</td>
                            <td data-label="Registró">{m.registradoPor ?? <span className="admin-tabla__secundario">—</span>}</td>
                            <td data-label="Monto" className="admin-tabla__num">
                                <strong className={m.monto < 0 ? "caja-salida" : undefined}>
                                    {m.monto < 0 ? `− ${formatMonto(-m.monto)}` : formatMonto(m.monto)}
                                </strong>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
