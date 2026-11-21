import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ImagePlus, Newspaper, Pencil, Plus, Trash2, X } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoTexto from "../../components/ui/CampoTexto/CampoTexto";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import SelectorFecha from "../../components/ui/SelectorFecha/SelectorFecha";
import { adminService } from "../../services/adminService";
import type { EstadoNovedad, Novedad, NovedadRequest } from "../../types/admin.types";
import { extraerErrores, primerError, type ErroresApi } from "../../utils/apiErrors";
import { errorDeImagen, MAXIMO_ORIGINAL_MB, TIPOS_IMAGEN, urlArchivo } from "../../utils/archivos";
import { formatFecha, formatFechaHora, hoyISO } from "../../utils/fechas";
import { PIE_NOVEDAD } from "../../config/novedades";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Vacio } from "./comunes";
import "./Canchas.css";
import "./Novedades.css";

const MAXIMO_DESCRIPCION = 300;

const ESTADO: Record<EstadoNovedad, { etiqueta: string; tono: string }> = {
    BORRADOR: { etiqueta: "Borrador", tono: "" },
    PUBLICADA: { etiqueta: "Publicada", tono: "admin-chip--ok" },
    VENCIDA: { etiqueta: "Vencida", tono: "admin-chip--alerta" },
};

/** El estado (si el backend no lo manda: borrador, o publicada/vencida según visibleHasta) */
const estadoDe = (n: Novedad): EstadoNovedad =>
    n.estado ?? (!n.publicada ? "BORRADOR" : n.visibleHasta && n.visibleHasta < hoyISO() ? "VENCIDA" : "PUBLICADA");

/* ─── Cómo se ve en la página de inicio ──────────── */
function VistaPrevia({ titulo, descripcion, etiqueta, imagen }: { titulo: string; descripcion: string; etiqueta: string; imagen?: string }) {
    return (
        <div className="novedad-previa" aria-label="Vista previa">
            <span className="novedad-previa__rotulo">Así se ve en la página</span>
            <article className="novedad-previa__tarjeta">
                <div className="novedad-previa__imagen">{imagen ? <img src={imagen} alt="" /> : null}</div>
                <div className="novedad-previa__contenido">
                    <div className="novedad-previa__cabecera">
                        {etiqueta.trim() && <span className="novedad-previa__etiqueta">{etiqueta.trim()}</span>}
                        <span className="novedad-previa__fecha">{formatFecha(hoyISO())}</span>
                    </div>
                    <h3 className="novedad-previa__titulo">{titulo.trim() || "Título de la novedad"}</h3>
                    <p className="novedad-previa__descripcion">{descripcion.trim() || "La descripción va acá."}</p>
                    <p className="novedad-previa__pie">{PIE_NOVEDAD}</p>
                </div>
            </article>
        </div>
    );
}

/* ─── Alta y edición ─────────────────────────────── */
function ModalNovedad({ novedad, onCerrar, onGuardada }: {
    /** null: alta */
    novedad: Novedad | null;
    onCerrar: () => void;
    onGuardada: (n: Novedad, nueva: boolean) => void;
}) {
    const nueva = novedad === null;
    const [datos, setDatos] = useState({
        titulo: novedad?.titulo ?? "",
        etiqueta: novedad?.etiqueta ?? "",
        descripcion: novedad?.descripcion ?? "",
        visibleHasta: novedad?.visibleHasta ?? null as string | null,
        publicada: novedad?.publicada ?? false,
    });
    // La imagen se sube al guardar: la elegida (archivo) o sacar la que tenía
    const [archivo, setArchivo] = useState<File | null>(null);
    const [vista, setVista] = useState<string | undefined>(urlArchivo(novedad?.imagenUrl));
    const [sacarImagen, setSacarImagen] = useState(false);
    const entrada = useRef<HTMLInputElement>(null);
    const [errores, setErrores] = useState<ErroresApi>({});
    const [guardando, setGuardando] = useState(false);
    const cambiar = <K extends keyof typeof datos>(campo: K, valor: (typeof datos)[K]) => {
        setDatos(d => ({ ...d, [campo]: valor }));
        setErrores(e => ({ ...e, [campo]: undefined, general: undefined }));
    };

    // La vista previa de un archivo elegido (url local): se libera al elegir otro o al cerrar
    const local = useRef<string | null>(null);
    const liberar = () => { if (local.current) URL.revokeObjectURL(local.current); local.current = null; };
    useEffect(() => liberar, []);

    const elegirImagen = (lista: FileList | null) => {
        const f = lista?.[0];
        if (entrada.current) entrada.current.value = "";
        if (!f) return;
        const problema = errorDeImagen(f);
        if (problema) { setErrores(e => ({ ...e, general: problema })); return; }
        liberar();
        local.current = URL.createObjectURL(f);
        setArchivo(f);
        setVista(local.current);
        setSacarImagen(false);
    };

    const guardar = async () => {
        const e: ErroresApi = {};
        if (!datos.titulo.trim()) e.titulo = "Escribí el título.";
        if (!datos.descripcion.trim()) e.descripcion = "Escribí la descripción.";
        setErrores(e);
        if (Object.keys(e).length) return;
        setGuardando(true);
        const req: NovedadRequest = {
            titulo: datos.titulo.trim(),
            descripcion: datos.descripcion.trim(),
            etiqueta: datos.etiqueta.trim() || null,
            visibleHasta: datos.visibleHasta,
        };
        try {
            let n = nueva ? await adminService.crearNovedad(req) : await adminService.editarNovedad(novedad.id, req);
            if (archivo) n = await adminService.subirImagenNovedad(n.id, archivo);
            else if (sacarImagen && n.imagenUrl) n = await adminService.sacarImagenNovedad(n.id);
            if (n.publicada !== datos.publicada) n = await adminService.publicarNovedad(n.id, datos.publicada);
            onGuardada(n, nueva);
        } catch (err) {
            setErrores(extraerErrores(err, "No se pudo guardar la novedad."));
            setGuardando(false);
        }
    };

    const visibles = ["titulo", "etiqueta", "descripcion"];
    const errorGeneral = errores.general ?? Object.entries(errores).find(([k, v]) => v && !visibles.includes(k))?.[1];

    return (
        <ModalConfirmacion
            titulo={nueva ? "Nueva novedad" : "Editar novedad"}
            icono={nueva ? <Plus size={22} /> : <Pencil size={22} />}
            clase="modal-novedad"
            textoConfirmar={nueva ? (datos.publicada ? "Crear y publicar" : "Guardar borrador") : "Guardar cambios"}
            textoCancelar="Volver"
            cargando={guardando}
            error={errorGeneral ?? null}
            onCerrar={onCerrar}
            onConfirmar={() => void guardar()}
        >
            <div className="novedad-form">
                <div className="admin-form">
                    <CampoInput id="n-titulo" name="titulo" label="Título" value={datos.titulo} required error={errores.titulo}
                        onChange={e => cambiar("titulo", e.target.value.slice(0, 80))} placeholder="Ej. Torneo de verano" />
                    <CampoInput id="n-etiqueta" name="etiqueta" label="Etiqueta (opcional)" value={datos.etiqueta} error={errores.etiqueta}
                        onChange={e => cambiar("etiqueta", e.target.value.slice(0, 30))} placeholder="Ej. Torneo, Clases, Club" />
                    <CampoTexto id="n-descripcion" label="Descripción" value={datos.descripcion} maximo={MAXIMO_DESCRIPCION}
                        onChange={v => cambiar("descripcion", v)} error={errores.descripcion}
                        placeholder="Lo importante: qué es, cuándo y para quién." />
                    <p className="modal__descripcion">Al final de la novedad siempre se agrega: «{PIE_NOVEDAD}»</p>

                    <div className="novedad-form__fecha">
                        <span className="campo__etiqueta">Visible hasta (opcional)</span>
                        <div className="novedad-form__fecha-fila">
                            <SelectorFecha valor={datos.visibleHasta} onChange={f => cambiar("visibleHasta", f)} />
                            {datos.visibleHasta && (
                                <button type="button" className="accion accion--chica" onClick={() => cambiar("visibleHasta", null)}>
                                    <X size={14} /> Sin fecha
                                </button>
                            )}
                        </div>
                        <span className="admin-tabla__secundario">
                            {datos.visibleHasta
                                ? `Deja de mostrarse sola después del ${formatFecha(datos.visibleHasta)}.`
                                : "Sin fecha, se muestra hasta que la ocultes."}
                        </span>
                    </div>

                    <div className="novedad-form__imagen">
                        <span className="campo__etiqueta">Imagen (opcional)</span>
                        <div className="novedad-form__fecha-fila">
                            <button type="button" className="accion accion--chica" onClick={() => entrada.current?.click()}>
                                <ImagePlus size={14} /> {vista ? "Cambiar imagen" : "Elegir imagen"}
                            </button>
                            {vista && (
                                <button type="button" className="accion accion--chica accion--peligro"
                                    onClick={() => { liberar(); setArchivo(null); setVista(undefined); setSacarImagen(true); }}>
                                    <X size={14} /> Sacar
                                </button>
                            )}
                        </div>
                        <span className="admin-tabla__secundario">JPG, PNG o WEBP, hasta {MAXIMO_ORIGINAL_MB} MB.</span>
                        <input ref={entrada} type="file" accept={TIPOS_IMAGEN.join(",")} hidden onChange={e => elegirImagen(e.target.files)} />
                    </div>

                    <CampoToggle id="n-publicada" name="publicada" label="Publicada"
                        descripcion="Se ve en la página de inicio. Apagada, queda como borrador."
                        checked={datos.publicada} onChange={e => cambiar("publicada", e.target.checked)} />
                </div>
                <VistaPrevia titulo={datos.titulo} descripcion={datos.descripcion} etiqueta={datos.etiqueta} imagen={vista} />
            </div>
        </ModalConfirmacion>
    );
}

/* ─── Página ─────────────────────────────────────── */
/**
 * Novedades del club (solo ADMIN): lo que se publica en la página de inicio (torneos, clases, avisos).
 * Descripción de hasta 300 caracteres, imagen opcional y "visible hasta" opcional (después deja de
 * mostrarse sola). Todas terminan con "Para más información, comunicate con el club".
 */
export default function Novedades() {
    const [novedades, setNovedades] = useState<Novedad[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState<Novedad | null | undefined>(undefined); // null = alta
    const [eliminando, setEliminando] = useState<Novedad | null>(null);
    const [procesando, setProcesando] = useState<number | null>(null);
    const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;
        adminService.novedadesAdmin()
            .then(p => { if (activo) { setNovedades(p.contenido); setError(null); } })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar las novedades.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [version]);

    const recargar = () => { setCargando(true); setVersion(v => v + 1); };

    const publicar = async (n: Novedad, publicada: boolean) => {
        setProcesando(n.id);
        setMensaje(null);
        try {
            const nueva = await adminService.publicarNovedad(n.id, publicada);
            setNovedades(l => l?.map(x => x.id === n.id ? nueva : x) ?? l);
            setMensaje(publicada ? `«${n.titulo}» está publicada: se ve en la página.` : `«${n.titulo}» quedó oculta (borrador).`);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo cambiar la publicación.")) ?? null);
        } finally {
            setProcesando(null);
        }
    };

    const eliminar = async () => {
        if (!eliminando) return;
        setProcesando(eliminando.id);
        setErrorEliminar(null);
        try {
            await adminService.eliminarNovedad(eliminando.id);
            setMensaje(`«${eliminando.titulo}» se eliminó.`);
            setEliminando(null);
            recargar();
        } catch (e) {
            setErrorEliminar(primerError(extraerErrores(e, "No se pudo eliminar la novedad.")) ?? null);
        } finally {
            setProcesando(null);
        }
    };

    return (
        <div className="admin-pagina">
            {editando !== undefined && (
                <ModalNovedad
                    novedad={editando}
                    onCerrar={() => setEditando(undefined)}
                    onGuardada={(n, nueva) => {
                        setEditando(undefined);
                        setMensaje(nueva
                            ? (n.publicada ? `«${n.titulo}» está publicada.` : `«${n.titulo}» quedó guardada como borrador.`)
                            : `Se guardaron los cambios de «${n.titulo}».`);
                        recargar();
                    }}
                />
            )}
            {eliminando && (
                <ModalConfirmacion
                    titulo="¿Eliminar la novedad?"
                    descripcion={`«${eliminando.titulo}» se borra para siempre, con su imagen. Si solo querés que no se vea, ocultala.`}
                    icono={<Trash2 size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, eliminar"
                    cargando={procesando === eliminando.id}
                    error={errorEliminar}
                    onCerrar={() => { setEliminando(null); setErrorEliminar(null); }}
                    onConfirmar={() => void eliminar()}
                />
            )}

            <Encabezado
                titulo="Novedades"
                descripcion="Lo que se publica en la página de inicio: torneos, clases, avisos del club. Las publicadas y vigentes se ven ahí, de la más nueva a la más vieja."
                acciones={<>
                    <BotonActualizar onClick={recargar} cargando={cargando} />
                    <button type="button" className="accion accion--primaria" onClick={() => { setMensaje(null); setEditando(null); }}>
                        <Plus size={15} /> Nueva novedad
                    </button>
                </>}
            />

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            {error && novedades && <Mensaje tipo="error">{error}</Mensaje>}

            {!novedades ? (cargando ? <Cargando /> : <Mensaje fijo tipo="error">{error ?? "No se pudieron cargar las novedades."}</Mensaje>) : novedades.length === 0 ? (
                <Vacio icono={<Newspaper size={28} />}>Todavía no hay novedades. Creá la primera con «Nueva novedad».</Vacio>
            ) : (
                <div className="canchas-admin">
                    {novedades.map(n => {
                        const estado = estadoDe(n);
                        return (
                            <article key={n.id} className={`cancha-admin${estado === "PUBLICADA" ? "" : " cancha-admin--inactiva"}`}>
                                <div className="cancha-admin__foto">
                                    {n.imagenUrl
                                        ? <img src={urlArchivo(n.imagenMiniaturaUrl ?? n.imagenUrl)} alt="" loading="lazy" />
                                        : <span className="cancha-admin__sin-foto">Sin imagen</span>}
                                    <span className={`admin-chip ${ESTADO[estado].tono} cancha-admin__estado`}>{ESTADO[estado].etiqueta}</span>
                                </div>
                                <div className="cancha-admin__cuerpo">
                                    {n.etiqueta && <div className="cancha-admin__chips"><span className="admin-chip">{n.etiqueta}</span></div>}
                                    <h3 className="cancha-admin__titulo">{n.titulo}</h3>
                                    <p className="cancha-admin__descripcion">{n.descripcion}</p>
                                    <span className="admin-tabla__secundario">
                                        {n.publicadaAt ? `Publicada el ${formatFechaHora(n.publicadaAt)}` : "Sin publicar"}
                                        {n.visibleHasta && ` · visible hasta el ${formatFecha(n.visibleHasta)}`}
                                    </span>
                                </div>
                                <div className="cancha-admin__acciones">
                                    <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setEditando(n); }}>
                                        <Pencil size={14} /> Editar
                                    </button>
                                    {n.publicada ? (
                                        <button type="button" className="accion accion--chica" disabled={procesando === n.id} onClick={() => void publicar(n, false)}>
                                            <EyeOff size={14} /> Ocultar
                                        </button>
                                    ) : (
                                        <button type="button" className="accion accion--chica" disabled={procesando === n.id} onClick={() => void publicar(n, true)}>
                                            <Eye size={14} /> Publicar
                                        </button>
                                    )}
                                    <button type="button" className="accion accion--chica accion--peligro" onClick={() => { setMensaje(null); setEliminando(n); }}>
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
