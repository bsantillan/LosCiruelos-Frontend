import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { ArchiveRestore, ArrowLeft, ArrowRight, Ban, ImagePlus, LayoutGrid, Lightbulb, Pencil, Plus, Trash2, X } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoTexto from "../../components/ui/CampoTexto/CampoTexto";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import { adminService } from "../../services/adminService";
import type { CanchaRequest, FueraDeHorario } from "../../types/admin.types";
import type { CanchaResponse, TipoCancha } from "../../types/reserva.types";
import { extraerErrores, primerError, type ErroresApi } from "../../utils/apiErrors";
import { errorDeImagen, MAXIMO_ORIGINAL_MB, TIPOS_IMAGEN, urlArchivo } from "../../utils/archivos";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Vacio } from "./comunes";
import { ModalFueraDeHorario, SinCancelar } from "./ConflictoReservas";
import { textoCanceladas } from "./conflictoReservas.texto";
import "./Canchas.css";

const TIPOS: { valor: TipoCancha; etiqueta: string }[] = [
    { valor: "TECHADA", etiqueta: "Techada" },
    { valor: "AIRE_LIBRE", etiqueta: "Al aire libre" },
];
const ETIQUETA_TIPO: Record<TipoCancha, string> = { TECHADA: "Techada", AIRE_LIBRE: "Al aire libre" };
const MAXIMO_FOTOS = 6;

const titulo = (c: CanchaResponse) => `Cancha ${c.numero}${c.nombre ? ` · ${c.nombre}` : ""}`;

/* ─── Fotos de una cancha (se guardan al momento) ── */
function FotosCancha({ cancha, onCambio }: { cancha: CanchaResponse; onCambio: (c: CanchaResponse) => void }) {
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const archivo = useRef<HTMLInputElement>(null);
    const fotos = [...cancha.fotos].sort((a, b) => a.orden - b.orden);

    const hacer = async (accion: () => Promise<CanchaResponse>, fallo: string) => {
        setOcupado(true);
        setError(null);
        try {
            onCambio(await accion());
        } catch (e) {
            setError(primerError(extraerErrores(e, fallo)) ?? fallo);
        } finally {
            setOcupado(false);
        }
    };

    const subir = (lista: FileList | null) => {
        const f = lista?.[0];
        if (archivo.current) archivo.current.value = "";
        if (!f) return;
        const problema = errorDeImagen(f);
        if (problema) { setError(problema); return; }
        void hacer(() => adminService.agregarFotoCancha(cancha.id, f), "No se pudo subir la foto.");
    };

    const mover = (i: number, delta: number) => {
        const ids = fotos.map(f => f.id);
        [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
        void hacer(() => adminService.ordenarFotosCancha(cancha.id, ids), "No se pudo cambiar el orden.");
    };

    return (
        <section className="cancha-fotos">
            <div className="cancha-fotos__cabecera">
                <h4 className="detalle-reserva__subtitulo">Fotos ({fotos.length} de {MAXIMO_FOTOS})</h4>
                <span className="admin-tabla__secundario">La primera es la que se ve en la página. JPG, PNG o WEBP, hasta {MAXIMO_ORIGINAL_MB} MB: se achica sola antes de subirla.</span>
            </div>
            <ul className="cancha-fotos__grilla">
                {fotos.map((f, i) => (
                    <li key={f.id} className="cancha-fotos__foto">
                        <img src={urlArchivo(f.miniaturaUrl)} alt={`Foto ${i + 1} de la cancha ${cancha.numero}`} loading="lazy" />
                        {i === 0 && <span className="cancha-fotos__portada">Portada</span>}
                        <div className="cancha-fotos__acciones">
                            <button type="button" disabled={ocupado || i === 0} onClick={() => mover(i, -1)} aria-label="Mover antes" title="Mover antes"><ArrowLeft size={14} /></button>
                            <button type="button" disabled={ocupado || i === fotos.length - 1} onClick={() => mover(i, 1)} aria-label="Mover después" title="Mover después"><ArrowRight size={14} /></button>
                            <button type="button" className="cancha-fotos__sacar" disabled={ocupado}
                                onClick={() => void hacer(() => adminService.sacarFotoCancha(cancha.id, f.id), "No se pudo sacar la foto.")}
                                aria-label="Sacar la foto" title="Sacar la foto"><X size={14} /></button>
                        </div>
                    </li>
                ))}
                {fotos.length < MAXIMO_FOTOS && (
                    <li>
                        <button type="button" className="cancha-fotos__agregar" disabled={ocupado} onClick={() => archivo.current?.click()}>
                            <ImagePlus size={20} />
                            {ocupado ? "Subiendo..." : "Agregar foto"}
                        </button>
                        <input ref={archivo} type="file" accept={TIPOS_IMAGEN.join(",")} hidden onChange={e => subir(e.target.files)} />
                    </li>
                )}
            </ul>
            {error && <Mensaje tipo="error">{error}</Mensaje>}
        </section>
    );
}

/* ─── Fotos elegidas en el alta (se suben al crear la cancha) ── */
interface FotoPendiente { clave: number; archivo: File; url: string }

function FotosNuevas({ fotos, onAgregar, onSacar, error }: {
    fotos: FotoPendiente[];
    onAgregar: (archivos: FileList | null) => void;
    onSacar: (clave: number) => void;
    error: string | null;
}) {
    const entrada = useRef<HTMLInputElement>(null);
    return (
        <section className="cancha-fotos">
            <div className="cancha-fotos__cabecera">
                <h4 className="detalle-reserva__subtitulo">Fotos ({fotos.length} de {MAXIMO_FOTOS})</h4>
                <span className="admin-tabla__secundario">Se suben al crear la cancha. La primera es la que se ve en la página. JPG, PNG o WEBP, hasta {MAXIMO_ORIGINAL_MB} MB.</span>
            </div>
            <ul className="cancha-fotos__grilla">
                {fotos.map((f, i) => (
                    <li key={f.clave} className="cancha-fotos__foto">
                        <img src={f.url} alt={`Foto ${i + 1} elegida`} />
                        {i === 0 && <span className="cancha-fotos__portada">Portada</span>}
                        <div className="cancha-fotos__acciones">
                            <button type="button" className="cancha-fotos__sacar" onClick={() => onSacar(f.clave)} aria-label="Sacar la foto" title="Sacar la foto"><X size={14} /></button>
                        </div>
                    </li>
                ))}
                {fotos.length < MAXIMO_FOTOS && (
                    <li>
                        <button type="button" className="cancha-fotos__agregar" onClick={() => entrada.current?.click()}>
                            <ImagePlus size={20} />
                            Agregar foto
                        </button>
                        <input ref={entrada} type="file" accept={TIPOS_IMAGEN.join(",")} multiple hidden
                            onChange={e => { onAgregar(e.target.files); e.target.value = ""; }} />
                    </li>
                )}
            </ul>
            {error && <Mensaje tipo="error">{error}</Mensaje>}
        </section>
    );
}

/* ─── Alta y edición ─────────────────────────────── */
function ModalCancha({ cancha, onCerrar, onGuardada, onCambio }: {
    /** null: alta */
    cancha: CanchaResponse | null;
    onCerrar: () => void;
    /** fallidas: fotos del alta que no se pudieron subir */
    onGuardada: (c: CanchaResponse, nueva: boolean, fallidas?: number) => void;
    /** Cambió algo al momento (las fotos) */
    onCambio: (c: CanchaResponse) => void;
}) {
    const nueva = cancha === null;
    const [datos, setDatos] = useState({
        numero: cancha ? String(cancha.numero) : "",
        nombre: cancha?.nombre ?? "",
        descripcion: cancha?.descripcion ?? "",
        tipo: cancha?.tipo ?? "TECHADA" as TipoCancha,
        superficie: cancha?.superficie ?? "",
        iluminacion: cancha?.iluminacion ?? true,
    });
    const [errores, setErrores] = useState<ErroresApi>({});
    const [guardando, setGuardando] = useState(false);
    // Alta: las fotos elegidas (con su vista previa local), que se suben después de crear la cancha
    const [pendientes, setPendientes] = useState<FotoPendiente[]>([]);
    const [errorFotos, setErrorFotos] = useState<string | null>(null);
    const vistas = useRef<string[]>([]);
    useEffect(() => () => vistas.current.forEach(u => URL.revokeObjectURL(u)), []);
    const agregarPendientes = (lista: FileList | null) => {
        setErrorFotos(null);
        const nuevas: FotoPendiente[] = [];
        for (const archivo of Array.from(lista ?? [])) {
            const problema = errorDeImagen(archivo);
            if (problema) { setErrorFotos(`${archivo.name}: ${problema}`); continue; }
            if (pendientes.length + nuevas.length >= MAXIMO_FOTOS) { setErrorFotos(`Una cancha puede tener hasta ${MAXIMO_FOTOS} fotos.`); break; }
            const url = URL.createObjectURL(archivo);
            vistas.current.push(url);
            nuevas.push({ clave: Date.now() + Math.random(), archivo, url });
        }
        setPendientes(p => [...p, ...nuevas]);
    };
    const cambiar = <K extends keyof typeof datos>(campo: K, valor: (typeof datos)[K]) => {
        setDatos(d => ({ ...d, [campo]: valor }));
        setErrores(e => ({ ...e, [campo]: undefined, general: undefined }));
    };

    const guardar = async () => {
        const e: ErroresApi = {};
        const numero = Number(datos.numero);
        if (!Number.isInteger(numero) || numero < 1) e.numero = "Ingresá el número de la cancha (1 o más).";
        setErrores(e);
        if (Object.keys(e).length) return;
        setGuardando(true);
        const req: CanchaRequest = {
            numero,
            nombre: datos.nombre.trim() || null,
            descripcion: datos.descripcion.trim() || null,
            tipo: datos.tipo,
            superficie: datos.superficie.trim() || null,
            iluminacion: datos.iluminacion,
        };
        try {
            if (!nueva) {
                onGuardada(await adminService.editarCancha(cancha.id, req), false);
                return;
            }
            // Alta: se crea y después se suben las fotos elegidas, en orden (la primera queda de portada)
            let c = await adminService.crearCancha(req);
            let fallidas = 0;
            for (const p of pendientes) {
                try { c = await adminService.agregarFotoCancha(c.id, p.archivo); } catch { fallidas++; }
            }
            onGuardada(c, true, fallidas);
        } catch (err) {
            setErrores(extraerErrores(err, "No se pudo guardar la cancha."));
        } finally {
            setGuardando(false);
        }
    };

    const visibles = ["numero", "nombre", "superficie", "descripcion"];
    const errorGeneral = errores.general ?? Object.entries(errores).find(([k, v]) => v && !visibles.includes(k))?.[1];

    return (
        <ModalConfirmacion
            titulo={nueva ? "Nueva cancha" : `Editar ${titulo(cancha)}`}
            icono={nueva ? <Plus size={22} /> : <Pencil size={22} />}
            clase="modal-cancha"
            textoConfirmar={nueva ? "Crear cancha" : "Guardar cambios"}
            textoCancelar={nueva ? "Volver" : "Cerrar"}
            cargando={guardando}
            error={errorGeneral ?? null}
            onCerrar={onCerrar}
            onConfirmar={() => void guardar()}
        >
            <div className="admin-form">
                <div className="admin-form__fila">
                    <CampoInput id="c-numero" name="numero" label="Número" type="number" entero min={1} value={datos.numero}
                        onChange={e => cambiar("numero", e.target.value)} required error={errores.numero} />
                    <CampoInput id="c-nombre" name="nombre" label="Nombre (opcional)" value={datos.nombre} placeholder="Ej. Cancha central"
                        onChange={e => cambiar("nombre", e.target.value.slice(0, 40))} error={errores.nombre} />
                </div>
                <div className="admin-opciones" role="radiogroup" aria-label="Tipo de cancha">
                    {TIPOS.map(t => (
                        <label key={t.valor} className={`admin-opcion${datos.tipo === t.valor ? " admin-opcion--activa" : ""}`}>
                            <input type="radio" name="tipo" checked={datos.tipo === t.valor} onChange={() => cambiar("tipo", t.valor)} />
                            {t.etiqueta}
                        </label>
                    ))}
                </div>
                <CampoInput id="c-superficie" name="superficie" label="Superficie (opcional)" value={datos.superficie} placeholder="Ej. Cemento, césped sintético"
                    onChange={e => cambiar("superficie", e.target.value.slice(0, 60))} error={errores.superficie} />
                <CampoToggle id="c-luz" name="iluminacion" label="Iluminación" descripcion="Tiene luz para jugar de noche."
                    checked={datos.iluminacion} onChange={e => cambiar("iluminacion", e.target.checked)} />
                <CampoTexto id="c-descripcion" label="Descripción (opcional)" value={datos.descripcion} maximo={300}
                    placeholder="Lo que la hace especial: vidrio, medidas, vista…" onChange={v => cambiar("descripcion", v)} error={errores.descripcion} />
                {nueva
                    ? <FotosNuevas fotos={pendientes} error={errorFotos} onAgregar={agregarPendientes}
                        onSacar={clave => setPendientes(p => p.filter(x => x.clave !== clave))} />
                    : <FotosCancha cancha={cancha} onCambio={onCambio} />}
            </div>
        </ModalConfirmacion>
    );
}

/* ─── Página ─────────────────────────────────────── */
/**
 * Canchas del club (solo ADMIN): alta, edición con sus fotos, desactivar (si tiene reservas de hoy en
 * adelante o turnos fijos, el backend devuelve la lista y al confirmar las cancela con reembolso total),
 * activar y eliminar (solo si nunca se usó). Lo que se carga acá se ve en la página de inicio, en la
 * grilla y al reservar.
 */
export default function Canchas() {
    const [canchas, setCanchas] = useState<CanchaResponse[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState<CanchaResponse | null | undefined>(undefined); // null = alta
    const [bajando, setBajando] = useState<CanchaResponse | null>(null);
    const [fuera, setFuera] = useState<FueraDeHorario | null>(null);
    const [eliminando, setEliminando] = useState<CanchaResponse | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [errorAccion, setErrorAccion] = useState<string | null>(null);
    const [sinCancelar, setSinCancelar] = useState<Parameters<typeof SinCancelar>[0]["resultado"]>(null);

    useEffect(() => {
        let activo = true;
        adminService.canchasAdmin()
            .then(c => { if (activo) { setCanchas([...c].sort((a, b) => a.numero - b.numero)); setError(null); } })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar las canchas.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [version]);

    const recargar = () => { setCargando(true); setVersion(v => v + 1); };
    const reemplazar = (c: CanchaResponse) => {
        setCanchas(l => l?.map(x => x.id === c.id ? { ...x, ...c } : x) ?? l);
        setEditando(e => e && e.id === c.id ? { ...e, ...c } : e);
    };

    const darDeBaja = async (confirmar: boolean) => {
        if (!bajando) return;
        setProcesando(true);
        setErrorAccion(null);
        try {
            const r = await adminService.bajaCancha(bajando.id, confirmar);
            const fijos = r.turnosFijosDadosDeBaja?.length ?? 0;
            setMensaje(`${titulo(bajando)} quedó desactivada: ya no se puede reservar.${textoCanceladas(r.cancelaciones)}${fijos > 0 ? ` Se ${fijos === 1 ? "dio de baja 1 turno fijo" : `dieron de baja ${fijos} turnos fijos`}.` : ""}`);
            setSinCancelar(r.cancelaciones);
            setBajando(null);
            setFuera(null);
            recargar();
        } catch (e) {
            if (isAxiosError(e) && e.response?.status === 409 && e.response.data?.reservasFueraDeHorario) {
                setFuera(e.response.data as FueraDeHorario);
            } else {
                setErrorAccion(primerError(extraerErrores(e, "No se pudo desactivar la cancha.")) ?? null);
            }
        } finally {
            setProcesando(false);
        }
    };

    const activar = async (c: CanchaResponse) => {
        setMensaje(null);
        try {
            reemplazar(await adminService.reactivarCancha(c.id));
            setMensaje(`${titulo(c)} está activa otra vez: se puede reservar.`);
        } catch (e) {
            setError(primerError(extraerErrores(e, "No se pudo activar la cancha.")) ?? null);
        }
    };

    const eliminar = async () => {
        if (!eliminando) return;
        setProcesando(true);
        setErrorAccion(null);
        try {
            await adminService.eliminarCancha(eliminando.id);
            setMensaje(`${titulo(eliminando)} se eliminó.`);
            setEliminando(null);
            recargar();
        } catch (e) {
            setErrorAccion(primerError(extraerErrores(e, "No se pudo eliminar la cancha.")) ?? null);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="admin-pagina">
            {editando !== undefined && (
                <ModalCancha
                    cancha={editando}
                    onCerrar={() => setEditando(undefined)}
                    onCambio={reemplazar}
                    onGuardada={(c, nueva, fallidas = 0) => {
                        if (nueva) {
                            setCanchas(l => l ? [...l, c].sort((a, b) => a.numero - b.numero) : [c]);
                            const fotos = c.fotos.length;
                            if (fallidas > 0) {
                                // Alguna foto no se subió: queda abierta (en edición) para volver a intentarlo
                                setEditando(c);
                                setError(`${titulo(c)} se creó, pero ${fallidas === 1 ? "1 foto no se pudo subir" : `${fallidas} fotos no se pudieron subir`}. Volvé a agregarla${fallidas === 1 ? "" : "s"}.`);
                            } else {
                                setEditando(undefined);
                                setMensaje(`${titulo(c)} creada${fotos > 0 ? ` con ${fotos === 1 ? "1 foto" : `${fotos} fotos`}` : ""}.`);
                            }
                        } else {
                            reemplazar(c);
                            setEditando(undefined);
                            setMensaje(`Se guardaron los cambios de ${titulo(c)}.`);
                        }
                    }}
                />
            )}
            {bajando && !fuera && (
                <ModalConfirmacion
                    titulo={`¿Desactivar ${titulo(bajando)}?`}
                    descripcion="Deja de aparecer en la página, en la grilla y al reservar. Si tiene reservas de hoy en adelante o turnos fijos, antes te mostramos la lista. Se puede activar de nuevo cuando quieras."
                    icono={<Ban size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, desactivar"
                    cargando={procesando}
                    error={errorAccion}
                    onCerrar={() => { setBajando(null); setErrorAccion(null); }}
                    onConfirmar={() => void darDeBaja(false)}
                />
            )}
            {bajando && fuera && (
                <ModalFueraDeHorario
                    fuera={fuera}
                    guardando={procesando}
                    titulo={`${titulo(bajando)} tiene reservas`}
                    textoConfirmar="Desactivar y cancelarlas"
                    explicacion={<>
                        Si confirmás, la cancha se desactiva, <strong>estas reservas se cancelan</strong> con reembolso total (por Mercado Pago,
                        o para devolver a mano si se cobró en el club) y se le avisa a cada cliente y a los jugadores. Los turnos fijos de la
                        lista se dan de baja.
                    </>}
                    onCerrar={() => { setFuera(null); setBajando(null); }}
                    onConfirmar={() => void darDeBaja(true)}
                />
            )}
            {eliminando && (
                <ModalConfirmacion
                    titulo={`¿Eliminar ${titulo(eliminando)}?`}
                    descripcion="Se borra para siempre, con sus fotos. Solo se puede porque nunca tuvo reservas ni turnos fijos."
                    icono={<Trash2 size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, eliminar"
                    cargando={procesando}
                    error={errorAccion}
                    onCerrar={() => { setEliminando(null); setErrorAccion(null); }}
                    onConfirmar={() => void eliminar()}
                />
            )}

            <Encabezado
                titulo="Canchas"
                descripcion="Las canchas del club, con sus fotos y su descripción. Lo que cargás acá se ve en la página de inicio, en la grilla y al reservar."
                acciones={<>
                    <BotonActualizar onClick={recargar} cargando={cargando} />
                    <button type="button" className="accion accion--primaria" onClick={() => { setMensaje(null); setEditando(null); }}>
                        <Plus size={15} /> Nueva cancha
                    </button>
                </>}
            />

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            {error && <Mensaje tipo="error">{error}</Mensaje>}
            <SinCancelar resultado={sinCancelar} />

            {!canchas ? (cargando ? <Cargando /> : <Mensaje fijo tipo="error">{error ?? "No se pudieron cargar las canchas."}</Mensaje>) : canchas.length === 0 ? (
                <Vacio icono={<LayoutGrid size={28} />}>Todavía no hay canchas cargadas.</Vacio>
            ) : (
                <div className="canchas-admin">
                    {canchas.map(c => {
                        const portada = [...c.fotos].sort((a, b) => a.orden - b.orden)[0];
                        return (
                            <article key={c.id} className={`cancha-admin${c.activa ? "" : " cancha-admin--inactiva"}`}>
                                <div className="cancha-admin__foto">
                                    {portada
                                        ? <img src={urlArchivo(portada.miniaturaUrl)} alt={`Cancha ${c.numero}`} loading="lazy" />
                                        : <span className="cancha-admin__sin-foto">Sin fotos</span>}
                                    <span className={`admin-chip ${c.activa ? "admin-chip--ok" : ""} cancha-admin__estado`}>{c.activa ? "Activa" : "Desactivada"}</span>
                                </div>
                                <div className="cancha-admin__cuerpo">
                                    <h3 className="cancha-admin__titulo">{titulo(c)}</h3>
                                    <div className="cancha-admin__chips">
                                        <span className="admin-chip">{ETIQUETA_TIPO[c.tipo]}</span>
                                        {c.superficie && <span className="admin-chip">{c.superficie}</span>}
                                        {c.iluminacion && <span className="admin-chip"><Lightbulb size={12} /> Con luz</span>}
                                    </div>
                                    {c.descripcion && <p className="cancha-admin__descripcion">{c.descripcion}</p>}
                                    <span className="admin-tabla__secundario">{c.fotos.length === 1 ? "1 foto" : `${c.fotos.length} fotos`}</span>
                                </div>
                                <div className="cancha-admin__acciones">
                                    <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setEditando(c); }}>
                                        <Pencil size={14} /> Editar
                                    </button>
                                    {c.activa ? (
                                        <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setBajando(c); }}>
                                            <Ban size={14} /> Desactivar
                                        </button>
                                    ) : (
                                        <button type="button" className="accion accion--chica" onClick={() => void activar(c)}>
                                            <ArchiveRestore size={14} /> Activar
                                        </button>
                                    )}
                                    <button type="button" className="accion accion--chica accion--peligro" disabled={c.eliminable === false}
                                        title={c.eliminable === false ? "Tiene reservas o turnos fijos: desactivala en lugar de eliminarla" : undefined}
                                        onClick={() => { setMensaje(null); setEliminando(c); }}>
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
