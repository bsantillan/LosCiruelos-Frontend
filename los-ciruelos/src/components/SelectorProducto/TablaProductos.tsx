import { useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import type { ProductoDisponible } from "../../types/reserva.types";
import { formatMonto } from "../../utils/fechas";
import { MAXIMO_POR_PRODUCTO, type Cantidades } from "../../utils/productos";
import "./TablaProductos.css";

/** Sin tildes ni mayúsculas, para buscar por nombre */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Desde cuántos productos aparece el buscador */
const CON_BUSCADOR = 6;

/**
 * Para el personal: todo el catálogo en una tabla compacta (una fila por producto: precio, libres en
 * el horario y cantidad, con − / + o escribiéndola), que se desliza dentro de su recuadro. Con muchos
 * productos aparece un buscador; "Solo elegidos" deja ver lo pedido. Abajo, el total de lo elegido.
 * Los que se ofrecen al reservar van primero y llevan la marca "Al reservar".
 */
export default function TablaProductos({ ofrecidos, extras, cantidades, reservadas, cargando, onChange }: {
    ofrecidos: ProductoDisponible[];
    extras: ProductoDisponible[];
    cantidades: Cantidades;
    /** Las que ya tiene lo que se edita: cuentan como libres */
    reservadas?: Cantidades;
    cargando: boolean;
    onChange: (cantidades: Cantidades) => void;
}) {
    const [texto, setTexto] = useState("");
    const [soloElegidos, setSoloElegidos] = useState(false);
    const todos = [...ofrecidos.map(p => ({ p, ofrecido: true })), ...extras.map(p => ({ p, ofrecido: false }))];
    const elegidos = todos.filter(({ p }) => (cantidades[p.id] ?? 0) > 0);
    const visibles = todos
        .filter(({ p }) => !texto.trim() || normalizar(p.nombre).includes(normalizar(texto.trim())))
        .filter(({ p }) => !soloElegidos || (cantidades[p.id] ?? 0) > 0);
    const total = elegidos.reduce((t, { p }) => t + Number(p.precio) * cantidades[p.id], 0);

    /**
     * Hasta cuántas unidades se pueden pedir: las libres en el horario. Sin precio cargado, ninguna; y
     * tampoco un producto sin control de stock (disponibles null): todos controlan stock, y uno viejo
     * que quedó sin control no se puede pedir hasta que se le cargue el stock en Productos.
     */
    const topeDe = (p: ProductoDisponible) => {
        if (!(Number(p.precio) > 0) || p.disponibles === null) return 0;
        return Math.min(p.disponibles + (reservadas?.[p.id] ?? 0), MAXIMO_POR_PRODUCTO);
    };
    const poner = (p: ProductoDisponible, n: number) =>
        onChange({ ...cantidades, [p.id]: Math.max(0, Math.min(topeDe(p), Number.isFinite(n) ? Math.trunc(n) : 0)) });

    if (cargando && todos.length === 0) return <p className="tabla-productos__ayuda">Consultando productos...</p>;
    if (todos.length === 0) return <p className="tabla-productos__ayuda">No hay productos activos.</p>;

    return (
        <div className="tabla-productos">
            {(todos.length >= CON_BUSCADOR || elegidos.length > 0) && (
                <div className="tabla-productos__barra">
                    {todos.length >= CON_BUSCADOR && (
                        <label className="tabla-productos__buscar">
                            <Search size={15} aria-hidden="true" />
                            <input type="search" value={texto} onChange={e => setTexto(e.target.value)}
                                placeholder="Buscar producto" aria-label="Buscar producto" />
                        </label>
                    )}
                    <button type="button" className={`ra-chip${soloElegidos ? " ra-chip--activo" : ""}`} aria-pressed={soloElegidos}
                        onClick={() => setSoloElegidos(!soloElegidos)} disabled={elegidos.length === 0 && !soloElegidos}>
                        Solo elegidos ({elegidos.length})
                    </button>
                </div>
            )}

            <div className="tabla-productos__lista" role="table" aria-label="Productos">
                <div className="tabla-productos__fila tabla-productos__fila--cabecera" role="row">
                    <span role="columnheader">Producto</span>
                    <span role="columnheader">Precio</span>
                    <span role="columnheader">Libres</span>
                    <span role="columnheader">Cantidad</span>
                </div>
                {visibles.length === 0 && <p className="tabla-productos__ayuda">Ningún producto coincide.</p>}
                {visibles.map(({ p, ofrecido }) => {
                    const cantidad = cantidades[p.id] ?? 0;
                    const tope = topeDe(p);
                    const nombre = p.nombre.toLowerCase();
                    return (
                        <div key={p.id} role="row" className={`tabla-productos__fila${cantidad > 0 ? " tabla-productos__fila--elegida" : ""}${tope === 0 ? " tabla-productos__fila--sin" : ""}`}>
                            <span role="cell" className="tabla-productos__nombre">
                                {p.nombre}
                                <small>{p.tipo === "VENTA" ? "Venta" : "Alquiler"}{ofrecido && " · al reservar"}</small>
                            </span>
                            <span role="cell" className="tabla-productos__num">{Number(p.precio) > 0 ? formatMonto(Number(p.precio)) : "Sin precio"}</span>
                            <span role="cell" className="tabla-productos__num">
                                {cargando ? "…" : p.disponibles === null ? <span title="Cargale el stock en Productos">Sin stock cargado</span>
                                    : tope === 0 && Number(p.precio) > 0 ? "Sin stock" : p.disponibles + (reservadas?.[p.id] ?? 0)}
                            </span>
                            <span role="cell" className="tabla-productos__cantidad">
                                <button type="button" onClick={() => poner(p, cantidad - 1)} disabled={cantidad <= 0} aria-label={`Quitar ${nombre}`}>
                                    <Minus size={13} />
                                </button>
                                <input type="number" inputMode="numeric" min={0} max={tope} value={cantidad} disabled={tope === 0 && cantidad === 0}
                                    aria-label={`Cantidad de ${nombre}`} onFocus={e => e.target.select()}
                                    onChange={e => poner(p, Number(e.target.value))} />
                                <button type="button" onClick={() => poner(p, cantidad + 1)} disabled={cargando || cantidad >= tope} aria-label={`Agregar ${nombre}`}>
                                    <Plus size={13} />
                                </button>
                            </span>
                        </div>
                    );
                })}
            </div>

            <p className="tabla-productos__total">
                {elegidos.length === 0
                    ? "Ningún producto elegido (es opcional)."
                    : <>{elegidos.length} {elegidos.length === 1 ? "producto" : "productos"} · <strong>{formatMonto(total)}</strong></>}
            </p>
        </div>
    );
}
