import { useImperativeHandle, useState, type Ref } from "react";
import { Plus } from "lucide-react";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoAutocompletar from "../../components/ui/CampoAutocompletar/CampoAutocompletar";
import type { ProductoAdmin, ProductoAgregado } from "../../types/admin.types";
import { formatMonto } from "../../utils/fechas";
import { MAXIMO_POR_PRODUCTO } from "../../utils/productos";

const OTRO = "otro";

/**
 * Elegir un producto del catálogo o escribir uno que no está (nombre y precio): si no existe, el
 * backend lo da de alta como producto de venta, sin control de stock y sin ofrecerse al reservar.
 */
/** Para usar el formulario dentro de un popup: el botón del popup llama a agregar() */
export interface AccionFormProducto {
    agregar: () => Promise<void>;
}

export default function FormProducto({ productos, textoBoton = "Agregar", guardando = false, onAgregar, accion }: {
    productos: ProductoAdmin[];
    textoBoton?: string;
    guardando?: boolean;
    /** Devuelve un error para mostrar, o null si se agregó */
    onAgregar: (producto: ProductoAgregado, etiqueta: string) => Promise<string | null> | string | null;
    /** Con accion, el formulario no tiene botón propio: lo dispara quien lo contiene */
    accion?: Ref<AccionFormProducto>;
}) {
    const [elegido, setElegido] = useState<number | typeof OTRO | "">("");
    const [nombre, setNombre] = useState("");
    const [precio, setPrecio] = useState("");
    const [cantidad, setCantidad] = useState("1");
    const [error, setError] = useState<string | null>(null);

    const agregar = async () => {
        const n = Number(cantidad);
        if (elegido === "") { setError("Buscá y elegí un producto."); return; }
        if (!Number.isInteger(n) || n < 1 || n > MAXIMO_POR_PRODUCTO) { setError(`La cantidad va de 1 a ${MAXIMO_POR_PRODUCTO}.`); return; }
        let producto: ProductoAgregado;
        let etiqueta: string;
        if (elegido === OTRO) {
            const p = Number(precio);
            if (nombre.trim().length < 2) { setError("Escribí el nombre del producto."); return; }
            if (precio === "" || !(p >= 0)) { setError("Ingresá el precio por unidad."); return; }
            producto = { nombre: nombre.trim(), precio: Math.round(p * 100) / 100, cantidad: n };
            etiqueta = nombre.trim();
        } else {
            producto = { productoId: elegido, cantidad: n };
            etiqueta = productos.find(p => p.id === elegido)?.nombre ?? "Producto";
        }
        setError(null);
        const fallo = await onAgregar(producto, etiqueta);
        if (fallo) { setError(fallo); return; }
        setElegido(""); setNombre(""); setPrecio(""); setCantidad("1");
    };
    useImperativeHandle(accion, () => ({ agregar }));

    return (
        <div className="form-producto">
            <div className="form-producto__fila">
                {elegido === OTRO ? (
                    <div className="form-producto__otro">
                        <span>Producto nuevo</span>
                        <button type="button" className="accion accion--chica" onClick={() => { setElegido(""); setError(null); }}>Elegir del catálogo</button>
                    </div>
                ) : (
                    <CampoAutocompletar
                        id="fp-producto" label="Producto" placeholder="Buscá el producto"
                        valor={elegido === "" ? null : elegido}
                        onElegir={v => { setElegido(v ?? ""); setError(null); }}
                        opciones={productos.map(p => {
                            const sinStock = !p.controlaStock || p.stock <= 0;
                            return {
                                valor: p.id,
                                etiqueta: p.nombre,
                                detalle: `${formatMonto(Number(p.precio))} · ${sinStock ? "sin stock" : `stock ${p.stock}`}`,
                                deshabilitado: sinStock,
                            };
                        })}
                        extra={{
                            etiqueta: texto => texto ? `Otro: "${texto}" (escribirlo)` : "Otro (escribirlo)",
                            onElegir: texto => { setElegido(OTRO); setNombre(texto); setError(null); },
                        }}
                    />
                )}
                <CampoInput id="fp-cantidad" name="cantidad" label="Cantidad" type="number" entero min={1} max={MAXIMO_POR_PRODUCTO}
                    value={cantidad} onChange={e => { setCantidad(e.target.value); setError(null); }} />
            </div>
            {elegido === OTRO && (
                <div className="form-producto__fila">
                    <CampoInput id="fp-nombre" name="nombre" label="Nombre" value={nombre} placeholder="Por ejemplo, Gatorade"
                        onChange={e => { setNombre(e.target.value); setError(null); }} />
                    <CampoInput id="fp-precio" name="precio" label="Precio por unidad" type="number" prefijo="$" min={0} paso={0.01}
                        value={precio} onChange={e => { setPrecio(e.target.value); setError(null); }} />
                </div>
            )}
            {error && <AvisoTransitorio tipo="error">{error}</AvisoTransitorio>}
            {!accion && (
                <button type="button" className="accion accion--chica accion--primaria form-producto__boton" onClick={() => void agregar()} disabled={guardando}>
                    <Plus size={14} />
                    {guardando ? "Guardando..." : textoBoton}
                </button>
            )}
        </div>
    );
}
