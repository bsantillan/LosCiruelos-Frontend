import { useEffect, useState } from "react";
import { ArchiveRestore, Ban, Minus, Package, PackagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";
import type { ProductoAdmin, ProductoRequest } from "../../types/admin.types";
import type { TipoProducto } from "../../types/reserva.types";
import { extraerErrores, primerError, type ErroresApi } from "../../utils/apiErrors";
import { formatMonto } from "../../utils/fechas";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Vacio } from "./comunes";
import { STOCK_BAJO } from "../../config/adminSecciones";
import "./ReservasAdmin.css";

const TIPOS: { valor: TipoProducto; etiqueta: string; desc: string }[] = [
    { valor: "VENTA", etiqueta: "Venta", desc: "El stock baja con cada reserva o venta (por ejemplo, pelotas o bebidas)." },
    { valor: "ALQUILER", etiqueta: "Alquiler", desc: "El stock es el total; se controla cuántas están en uso en cada horario (por ejemplo, paletas)." },
];

interface Filtros {
    nombre: string;
    tipo: TipoProducto | "";
    estado: "" | "activos" | "inactivos";
    stockMin: string;
    stockMax: string;
}
const SIN_FILTROS: Filtros = { nombre: "", tipo: "", estado: "", stockMin: "", stockMax: "" };

/** Sin tildes ni mayúsculas, para buscar por nombre */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function cumple(p: ProductoAdmin, f: Filtros): boolean {
    if (f.nombre.trim() && !normalizar(`${p.nombre} ${p.descripcion ?? ""}`).includes(normalizar(f.nombre.trim()))) return false;
    if (f.tipo && p.tipo !== f.tipo) return false;
    if (f.estado === "activos" && !p.activo) return false;
    if (f.estado === "inactivos" && p.activo) return false;
    if (f.stockMin !== "" && p.stock < Number(f.stockMin)) return false;
    if (f.stockMax !== "" && p.stock > Number(f.stockMax)) return false;
    return true;
}

/* ─── Alta y edición (ADMIN) ─────────────────────── */
function ModalProducto({ producto, onCerrar, onGuardado }: {
    producto: ProductoAdmin | null;
    onCerrar: () => void;
    onGuardado: (p: ProductoAdmin, nuevo: boolean) => void;
}) {
    const nuevo = producto === null;
    const [datos, setDatos] = useState({
        nombre: producto?.nombre ?? "",
        descripcion: producto?.descripcion ?? "",
        tipo: producto?.tipo ?? "VENTA" as TipoProducto,
        precio: producto ? String(producto.precio) : "",
        stock: producto ? String(producto.stock) : "0",
        activo: producto?.activo ?? true,
        ofrecerAlReservar: producto?.ofrecerAlReservar ?? false,
    });
    const [errores, setErrores] = useState<ErroresApi>({});
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo: "nombre" | "descripcion" | "precio" | "stock") => (e: React.ChangeEvent<HTMLInputElement>) => {
        setDatos(d => ({ ...d, [campo]: e.target.value }));
        setErrores(er => ({ ...er, [campo]: undefined, general: undefined }));
    };

    const guardar = async () => {
        const e: ErroresApi = {};
        const precio = Number(datos.precio);
        const stock = Number(datos.stock);
        if (!datos.nombre.trim()) e.nombre = "El nombre es obligatorio.";
        if (datos.precio === "" || !(precio >= 0)) e.precio = "Ingresá un precio (0 o más).";
        if (datos.stock === "" || !Number.isInteger(stock) || stock < 0) e.stock = "Ingresá un número entero (0 o más).";
        setErrores(e);
        if (Object.keys(e).length) return;

        setGuardando(true);
        // El backend pide el tipo también al editar (no se puede cambiar: se manda el que tiene)
        const req: ProductoRequest = {
            nombre: datos.nombre.trim(),
            descripcion: datos.descripcion.trim() || null,
            tipo: datos.tipo,
            precio: Math.round(precio * 100) / 100,
            stock,
            activo: datos.activo,
            ofrecerAlReservar: datos.ofrecerAlReservar,
            controlaStock: true,
        };
        try {
            const p = nuevo ? await adminService.crearProducto(req) : await adminService.editarProducto(producto.id, req);
            onGuardado(p, nuevo);
        } catch (err) {
            setErrores(extraerErrores(err, "No se pudo guardar el producto."));
            setGuardando(false);
        }
    };

    const visibles = ["nombre", "precio", "stock"];
    const errorGeneral = errores.general ?? Object.entries(errores).find(([k, v]) => v && !visibles.includes(k))?.[1];

    return (
        <ModalConfirmacion
            titulo={nuevo ? "Nuevo producto" : `Editar ${producto.nombre}`}
            icono={nuevo ? <PackagePlus size={22} /> : <Pencil size={22} />}
            textoConfirmar={nuevo ? "Crear producto" : "Guardar cambios"}
            textoCancelar="Volver"
            cargando={guardando}
            error={errorGeneral ?? null}
            onCerrar={onCerrar}
            onConfirmar={() => void guardar()}
        >
            <div className="admin-form">
                <CampoInput id="p-nombre" name="nombre" label="Nombre" value={datos.nombre} onChange={cambiar("nombre")} required error={errores.nombre} />
                <CampoInput id="p-desc" name="descripcion" label="Descripción" value={datos.descripcion} onChange={cambiar("descripcion")} placeholder="Opcional" />
                {nuevo ? (
                    <div className="admin-opciones" role="radiogroup" aria-label="Tipo">
                        {TIPOS.map(t => (
                            <label key={t.valor} className={`admin-opcion${datos.tipo === t.valor ? " admin-opcion--activa" : ""}`}>
                                <input type="radio" name="tipo" checked={datos.tipo === t.valor} onChange={() => setDatos(d => ({ ...d, tipo: t.valor }))} />
                                {t.etiqueta}
                            </label>
                        ))}
                    </div>
                ) : null}
                <p className="modal__descripcion">
                    {TIPOS.find(t => t.valor === datos.tipo)?.desc}{!nuevo && " El tipo no se puede cambiar."}
                </p>
                <div className="admin-form__fila">
                    <CampoInput id="p-precio" name="precio" label="Precio por unidad" type="number" prefijo="$" min={0} paso={0.01}
                        value={datos.precio} onChange={cambiar("precio")} required error={errores.precio} />
                    <CampoInput id="p-stock" name="stock" label={datos.tipo === "ALQUILER" ? "Unidades en total" : "Stock"} type="number" entero min={0}
                        value={datos.stock} onChange={cambiar("stock")} required error={errores.stock} />
                </div>
                <CampoToggle id="p-ofrecer" name="ofrecerAlReservar" label="Ofrecer al reservar"
                    descripcion="El cliente lo ve y lo puede pedir al reservar. Apagado: solo lo carga el personal (en una reserva, un partido o una venta)."
                    checked={datos.ofrecerAlReservar} onChange={e => setDatos(d => ({ ...d, ofrecerAlReservar: e.target.checked }))} />
                <CampoToggle id="p-activo" name="activo" label="Activo"
                    descripcion="Inactivo: no se puede pedir ni vender (las reservas existentes lo conservan)."
                    checked={datos.activo} onChange={e => setDatos(d => ({ ...d, activo: e.target.checked }))} />
            </div>
        </ModalConfirmacion>
    );
}

/* ─── Ajuste de stock (ADMIN y EMPLEADO) ─────────── */
function ModalStock({ producto, onCerrar, onAjustado }: {
    producto: ProductoAdmin;
    onCerrar: () => void;
    onAjustado: (p: ProductoAdmin, ajuste: number) => void;
}) {
    const [sentido, setSentido] = useState<"suma" | "resta">("suma");
    const [cantidad, setCantidad] = useState("1");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const n = Number(cantidad);
    const ajuste = sentido === "suma" ? n : -n;
    const resultado = producto.stock + ajuste;

    const ajustar = async () => {
        if (!Number.isInteger(n) || n <= 0) { setError("Ingresá una cantidad entera mayor a 0."); return; }
        if (resultado < 0) { setError(`No se pueden restar más de ${producto.stock} unidades.`); return; }
        setGuardando(true);
        setError(null);
        try {
            onAjustado(await adminService.ajustarStock(producto.id, ajuste), ajuste);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo ajustar el stock.")) ?? null);
            setGuardando(false);
        }
    };

    return (
        <ModalConfirmacion
            titulo={`Stock de ${producto.nombre}`}
            icono={<Package size={22} />}
            textoConfirmar="Ajustar stock"
            textoCancelar="Volver"
            cargando={guardando}
            error={error}
            onCerrar={onCerrar}
            onConfirmar={() => void ajustar()}
        >
            <div className="admin-form">
                <div className="admin-opciones" role="radiogroup" aria-label="Tipo de ajuste">
                    <label className={`admin-opcion${sentido === "suma" ? " admin-opcion--activa" : ""}`}>
                        <input type="radio" name="sentido" checked={sentido === "suma"} onChange={() => setSentido("suma")} />
                        <Plus size={16} /> Reposición
                    </label>
                    <label className={`admin-opcion${sentido === "resta" ? " admin-opcion--activa" : ""}`}>
                        <input type="radio" name="sentido" checked={sentido === "resta"} onChange={() => setSentido("resta")} />
                        <Minus size={16} /> Rotura o pérdida
                    </label>
                </div>
                <CampoInput id="ajuste-cantidad" name="cantidad" label="Unidades" type="number" entero min={1}
                    value={cantidad} onChange={e => { setCantidad(e.target.value); setError(null); }} />
                {Number.isInteger(n) && n > 0 && (
                    <p className="modal__descripcion">
                        Stock: {producto.stock} → <strong>{resultado}</strong> {resultado === 1 ? "unidad" : "unidades"}
                    </p>
                )}
            </div>
        </ModalConfirmacion>
    );
}

/* ─── Página ─────────────────────────────────────── */
export default function Productos() {
    const { usuario } = useAuth();
    const esAdmin = usuario?.rol === "ADMIN";
    const [productos, setProductos] = useState<ProductoAdmin[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [version, setVersion] = useState(0);

    const [editando, setEditando] = useState<ProductoAdmin | null | undefined>(undefined); // null = alta
    const [ajustando, setAjustando] = useState<ProductoAdmin | null>(null);
    const [bajando, setBajando] = useState<ProductoAdmin | null>(null);
    const [eliminando, setEliminando] = useState<ProductoAdmin | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [errorBaja, setErrorBaja] = useState<string | null>(null);

    const recargar = () => { setCargando(true); setVersion(v => v + 1); };

    // ── Filtros (sobre la lista completa, en el front) ──
    const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
    const cambiarFiltro = <K extends keyof Filtros>(campo: K, valor: Filtros[K]) => setFiltros(f => ({ ...f, [campo]: valor }));
    const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);
    const visibles = productos.filter(p => cumple(p, filtros));

    useEffect(() => {
        let activo = true;
        adminService.productos()
            .then(p => { if (activo) { setProductos(p); setError(null); } })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar los productos.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [version]);

    const darDeBaja = async () => {
        if (!bajando) return;
        setProcesando(true);
        setErrorBaja(null);
        try {
            await adminService.bajaProducto(bajando.id);
            setMensaje(`${bajando.nombre} quedó desactivado: ya no se puede pedir en reservas ni ventas nuevas.`);
            setBajando(null);
            recargar();
        } catch (e) {
            setErrorBaja(primerError(extraerErrores(e, "No se pudo desactivar.")) ?? null);
        } finally {
            setProcesando(false);
        }
    };

    const eliminar = async () => {
        if (!eliminando) return;
        setProcesando(true);
        setErrorBaja(null);
        try {
            await adminService.eliminarProducto(eliminando.id);
            setMensaje(`${eliminando.nombre} se eliminó.`);
            setEliminando(null);
            recargar();
        } catch (e) {
            setErrorBaja(primerError(extraerErrores(e, "No se pudo eliminar el producto.")) ?? null);
        } finally {
            setProcesando(false);
        }
    };

    const reactivar = async (p: ProductoAdmin) => {
        setMensaje(null);
        try {
            await adminService.reactivarProducto(p.id);
            setMensaje(`${p.nombre} está disponible otra vez.`);
            recargar();
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo reactivar.")) ?? null);
        }
    };

    return (
        <div className="admin-pagina">
            {editando !== undefined && (
                <ModalProducto
                    producto={editando}
                    onCerrar={() => setEditando(undefined)}
                    onGuardado={(p, nuevo) => {
                        setMensaje(nuevo ? `Producto creado: ${p.nombre}.` : `Se guardaron los cambios de ${p.nombre}.`);
                        setEditando(undefined);
                        recargar();
                    }}
                />
            )}
            {ajustando && (
                <ModalStock
                    producto={ajustando}
                    onCerrar={() => setAjustando(null)}
                    onAjustado={(p, ajuste) => {
                        setMensaje(`${p.nombre}: ${ajuste > 0 ? `+${ajuste}` : ajuste} ${Math.abs(ajuste) === 1 ? "unidad" : "unidades"}. Stock actual: ${p.stock}.`);
                        setAjustando(null);
                        recargar();
                    }}
                />
            )}
            {eliminando && (
                <ModalConfirmacion
                    titulo={`¿Eliminar ${eliminando.nombre}?`}
                    descripcion="Se borra para siempre, por ejemplo si se cargó mal. Solo se puede si nunca se usó en una reserva o una venta: si ya se usó, desactivalo (queda en el historial y se puede reactivar)."
                    icono={<Trash2 size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, eliminar"
                    cargando={procesando}
                    error={errorBaja}
                    onCerrar={() => { setEliminando(null); setErrorBaja(null); }}
                    onConfirmar={() => void eliminar()}
                />
            )}
            {bajando && (
                <ModalConfirmacion
                    titulo={`¿Desactivar ${bajando.nombre}?`}
                    descripcion="Deja de poder pedirse en reservas y ventas nuevas. Las que ya lo tienen lo conservan. Se puede reactivar después."
                    icono={<Ban size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, desactivar"
                    cargando={procesando}
                    error={errorBaja}
                    onCerrar={() => { setBajando(null); setErrorBaja(null); }}
                    onConfirmar={() => void darDeBaja()}
                />
            )}

            <Encabezado
                titulo="Productos y stock"
                descripcion="Lo que se agrega a una reserva o se vende suelto, con su precio por unidad. El precio queda fijo en las reservas y ventas ya hechas."
                acciones={<>
                    <BotonActualizar onClick={recargar} cargando={cargando} />
                    {esAdmin && (
                        <button type="button" className="accion accion--primaria" onClick={() => { setMensaje(null); setEditando(null); }}>
                            <PackagePlus size={15} />
                            Nuevo producto
                        </button>
                    )}
                </>}
            />

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            {error && <Mensaje tipo="error">{error}</Mensaje>}

            {productos.length > 0 && (
                <div className="ra-filtros">
                    <div className="admin-filtros">
                        <CampoInput id="pf-nombre" name="nombre" label="Producto" value={filtros.nombre}
                            onChange={e => cambiarFiltro("nombre", e.target.value)} placeholder="Buscar por nombre" icono={<Search size={16} />} />
                        <CampoSelect id="pf-tipo" name="tipo" label="Tipo" value={filtros.tipo}
                            onChange={e => cambiarFiltro("tipo", e.target.value as Filtros["tipo"])}
                            opciones={[{ valor: "", etiqueta: "Todos" }, { valor: "VENTA", etiqueta: "Venta" }, { valor: "ALQUILER", etiqueta: "Alquiler" }]} />
                        <CampoSelect id="pf-estado" name="estado" label="Estado" value={filtros.estado}
                            onChange={e => cambiarFiltro("estado", e.target.value as Filtros["estado"])}
                            opciones={[{ valor: "", etiqueta: "Todos" }, { valor: "activos", etiqueta: "Activos" }, { valor: "inactivos", etiqueta: "Inactivos" }]} />
                        <CampoInput id="pf-stock-min" name="stockMin" label="Stock desde" type="number" entero min={0}
                            value={filtros.stockMin} onChange={e => cambiarFiltro("stockMin", e.target.value)} placeholder="0" />
                        <CampoInput id="pf-stock-max" name="stockMax" label="Stock hasta" type="number" entero min={0}
                            value={filtros.stockMax} onChange={e => cambiarFiltro("stockMax", e.target.value)} placeholder="Sin límite" />
                        <button type="button" className="accion admin-filtros__fijo admin-filtros__limpiar" onClick={() => setFiltros(SIN_FILTROS)} disabled={!hayFiltros}>
                            <X size={15} /> Limpiar filtros
                        </button>
                    </div>
                    <div className="ra-filtros__fila">
                        <div className="productos-filtros__pie">
                            <span>{visibles.length === productos.length ? `${productos.length} productos` : `${visibles.length} de ${productos.length} productos`}</span>
                        </div>
                    </div>
                </div>
            )}

            {cargando && productos.length === 0 ? <Cargando /> : productos.length === 0 && !error ? (
                <Vacio icono={<Package size={32} />}>Todavía no hay productos.</Vacio>
            ) : visibles.length === 0 ? (
                <Vacio icono={<Package size={32} />}>Ningún producto coincide con los filtros.</Vacio>
            ) : (
                <div className="admin-tabla-contenedor">
                    <table className="admin-tabla">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Tipo</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th className="admin-tabla__acciones" aria-label="Acciones" />
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map(p => (
                                <tr key={p.id} className={p.activo ? undefined : "admin-tabla__inactiva"}>
                                    <td className="admin-tabla__titulo-celda">
                                        <span className="admin-tabla__principal">{p.nombre}</span>
                                        {p.descripcion && <span className="admin-tabla__secundario">{p.descripcion}</span>}
                                    </td>
                                    <td data-label="Tipo">{p.tipo === "VENTA" ? "Venta" : "Alquiler"}</td>
                                    <td data-label="Precio" className="admin-tabla__num">{formatMonto(Number(p.precio))}</td>
                                    <td data-label="Stock" className="admin-tabla__num">
                                        <div>
                                            <strong>{p.stock}</strong>
                                            {p.activo && p.stock < STOCK_BAJO && <> <span className="admin-chip admin-chip--alerta">Bajo</span></>}
                                        </div>
                                    </td>
                                    <td data-label="Estado">
                                        <span className="admin-tabla__acciones-grupo">
                                            <span className={`admin-chip ${p.activo ? "admin-chip--ok" : "admin-chip--error"}`}>{p.activo ? "Activo" : "Inactivo"}</span>
                                            {p.activo && p.ofrecerAlReservar && <span className="admin-chip">Al reservar</span>}
                                        </span>
                                    </td>
                                    <td className="admin-tabla__acciones">
                                        <span className="admin-tabla__acciones-grupo">
                                            <button type="button" className="accion accion--chica accion--primaria" onClick={() => { setMensaje(null); setAjustando(p); }}>
                                                <Package size={14} />
                                                Stock
                                            </button>
                                            {esAdmin && (
                                                <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setEditando(p); }}>
                                                    <Pencil size={14} />
                                                    Editar
                                                </button>
                                            )}
                                            {esAdmin && (p.activo ? (
                                                <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setBajando(p); }}>
                                                    <Ban size={14} />
                                                    Desactivar
                                                </button>
                                            ) : (
                                                <button type="button" className="accion accion--chica" onClick={() => void reactivar(p)}>
                                                    <ArchiveRestore size={14} />
                                                    Activar
                                                </button>
                                            ))}
                                            {esAdmin && (
                                                <button type="button" className="accion accion--chica accion--peligro" onClick={() => { setMensaje(null); setEliminando(p); }}>
                                                    <Trash2 size={14} />
                                                    Eliminar
                                                </button>
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
