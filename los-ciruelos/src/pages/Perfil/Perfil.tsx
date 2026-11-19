import { useEffect, useState } from "react";
import { User, Mail, Lock, AlertCircle, CheckCircle2, Trash2, BellRing } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import Boton from "../../components/ui/Boton/Boton";
import { formatFechaHora, parseFechaHora } from "../../utils/fechas";
import "./Perfil.css";
import { usePerfil } from "../../hooks/usePerfil";
import type { PerfilResponse } from "../../types/perfil.types";
import { perfilService } from "../../services/perfilService";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import { extraerErrores, primerError } from "../../utils/apiErrors";
import CelularYNotificaciones from "../../components/Notificaciones/CelularYNotificaciones";
import { leerSeleccion } from "../../utils/seleccionReserva";
import { CATEGORIAS, POSICIONES } from "../../config/opcionesJugador";
import { AvisoTransitorio } from "../../components/ui/Avisos/Avisos";

// Los avisos y el recordatorio del ADMIN están en el panel (/admin/avisos)
type TabPerfil = "datos" | "celular" | "cuenta";

const dias = (n: number | undefined) => `${n ?? 0} ${n === 1 ? "día" : "días"}`;

function datosDesdePerfil(perfil: PerfilResponse) {
    return {
        nombre: perfil.nombre ?? "",
        apellido: perfil.apellido ?? "",
        // El celular no está acá: se edita (y verifica) solo en "Celular y avisos"
        posicion: perfil.posicion ?? "",
        categoria: perfil.categoria ?? "",
    };
}

/** Qué le falta al perfil para estar completo (CLIENTE también categoría y posición). */
function faltantes(perfil: PerfilResponse, esCliente: boolean): string[] {
    const f: string[] = [];
    if (!perfil.nombre || !perfil.apellido) f.push("nombre y apellido");
    if (!perfil.telefono) f.push("tu celular");
    else if (!perfil.telefonoVerificado) f.push("verificar tu celular");
    if (esCliente && !perfil.categoria) f.push("categoría");
    if (esCliente && !perfil.posicion) f.push("posición");
    return f;
}

/** Lo que falta del celular se resuelve en la tab "Celular y avisos" */
const FALTANTES_CELULAR = ["tu celular", "verificar tu celular"];

const enLista = (items: string[]) =>
    items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
/**
 * @param enPanel "Mi cuenta" del panel del club: solo los datos personales. El celular y el
 *                medio de los avisos del personal están en la sección Avisos del panel.
 */
export default function Perfil({ enPanel = false }: { enPanel?: boolean }) {
    const navigate = useNavigate();
    const { usuario, cerrarSesion, actualizarUsuario } = useAuth();
    const { perfil, cargando, guardando, erroresApi, exitoso, actualizar, recargar, setErroresApi } = usePerfil();

    const [datos, setDatos] = useState({
        nombre: "",
        apellido: "",
        posicion: "",
        categoria: ""
    });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [modalDesactivar, setModalDesactivar] = useState(false);
    const [desactivando, setDesactivando] = useState(false);
    const [errorDesactivar, setErrorDesactivar] = useState<string | null>(null);

    const mesActual = new Date().toLocaleDateString("es-AR", {
        month: "long",
    });

    // Cargar el formulario cuando llega (o se actualiza) el perfil del servidor
    const [perfilCargado, setPerfilCargado] = useState(perfil);
    if (perfil !== perfilCargado) {
        setPerfilCargado(perfil);
        if (perfil) setDatos(datosDesdePerfil(perfil));
    }

    // Solo se puede guardar si algún campo difiere de lo guardado en el servidor
    const hayCambios = perfil !== null &&
        (Object.keys(datos) as (keyof typeof datos)[]).some(k => datos[k] !== datosDesdePerfil(perfil)[k]);

    // categoría y posición son datos de jugador: solo los tiene (y los acepta) un CLIENTE
    const esCliente = usuario?.rol === "CLIENTE";
    // Celular y medio de los avisos: en el sitio, acá (único lugar donde se edita el celular);
    // para el personal, en la sección Avisos del panel (/admin/avisos).
    const conNotificaciones = usuario !== null && !enPanel;

    // ── Tabs ── (la elegida queda en la URL: ?tab=celular). En el panel solo hay datos: sin tabs.
    const tabs: { id: TabPerfil; etiqueta: string; icono: React.ReactNode }[] = enPanel
        ? [{ id: "datos", etiqueta: "Datos", icono: <User size={15} /> }]
        : [
            { id: "datos", etiqueta: "Datos", icono: <User size={15} /> },
            { id: "celular", etiqueta: "Celular y avisos", icono: <BellRing size={15} /> },
            { id: "cuenta", etiqueta: "Cuenta", icono: <Lock size={15} /> },
        ];
    const [searchParams, setSearchParams] = useSearchParams();
    const tabPedida = searchParams.get("tab");
    // Sin tab elegida y con el perfil incompleto se abre lo que falta (si solo falta el celular, esa tab)
    const soloFaltaCelular = perfil !== null && !perfil.perfilCompleto
        && faltantes(perfil, esCliente).every(f => FALTANTES_CELULAR.includes(f));
    const tabPorDefecto: TabPerfil = soloFaltaCelular && tabs.some(t => t.id === "celular") ? "celular" : "datos";
    const tab: TabPerfil = tabs.find(t => t.id === tabPedida)?.id ?? tabPorDefecto;
    const elegirTab = (id: TabPerfil) => setSearchParams({ tab: id }, { replace: true });
    const tieneFaltante = (id: TabPerfil) => perfil !== null && !perfil.perfilCompleto && (
        id === "celular" ? faltantes(perfil, esCliente).some(f => FALTANTES_CELULAR.includes(f))
            : id === "datos" ? faltantes(perfil, esCliente).some(f => !FALTANTES_CELULAR.includes(f)) : false);
    // Llegó desde Reservas (turno guardado): al completar el perfil se ofrece volver a terminarla
    const [turnoGuardado] = useState(() => leerSeleccion() !== null);

    // La sesión guarda perfilCompleto del login: se mantiene al día con el servidor
    // (por ejemplo, ahora exige el celular verificado), que es el que decide si se puede reservar
    const perfilCompletoServidor = perfil?.perfilCompleto;
    useEffect(() => {
        if (perfilCompletoServidor !== undefined && perfilCompletoServidor !== usuario?.perfilCompleto) {
            actualizarUsuario({ perfilCompleto: perfilCompletoServidor });
        }
    }, [perfilCompletoServidor, usuario?.perfilCompleto, actualizarUsuario]);

    // La categoría se cambia una sola vez y dentro de las 24 h desde que se cargó.
    // Lo decide el backend (categoriaEditable); sin categoría cargada, la primera carga siempre se puede.
    const puedeEditarCategoria = (): boolean =>
        !perfil?.categoria || perfil.categoriaEditable !== false;

    const vencimientoCategoria = (): string => {
        if (!perfil?.categoriaActualizadaAt) return "";
        // 24 h después de cargada, en hora del club ("sábado 18 de octubre a las 10:30 hs")
        const vence = new Date(parseFechaHora(perfil.categoriaActualizadaAt).getTime() + 24 * 60 * 60 * 1000);
        return formatFechaHora(vence.toISOString());
    };

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDatos(p => ({ ...p, [name]: value }));
        setErrores(p => ({ ...p, [name]: "" }));
        setErroresApi({});
    };

    const cambiarSelect = (name: string) => (e: { target: { value: string | number } }) => {
        setDatos(p => ({ ...p, [name]: e.target.value as string }));
        setErrores(p => ({ ...p, [name]: "" }));
        setErroresApi({});
    };

    const validar = (): boolean => {
        const e: Record<string, string> = {};
        if (!datos.nombre) e.nombre = "El nombre es obligatorio.";
        else if (datos.nombre.length < 2) e.nombre = "Mínimo 2 caracteres.";
        else if (datos.nombre.length > 50) e.nombre = "Máximo 50 caracteres.";
        if (!datos.apellido) e.apellido = "El apellido es obligatorio.";
        else if (datos.apellido.length < 2) e.apellido = "Mínimo 2 caracteres.";
        else if (datos.apellido.length > 50) e.apellido = "Máximo 50 caracteres.";
        if (esCliente && !datos.posicion) e.posicion = "La posición es obligatoria.";
        if (esCliente && !datos.categoria) e.categoria = "La categoría es obligatoria.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validar()) return;
        // Sin teléfono: PUT /perfil no lo toca (el celular se cambia en "Celular y avisos")
        const actualizado = await actualizar({
            nombre: datos.nombre,
            apellido: datos.apellido,
            posicion: esCliente ? datos.posicion : null,
            categoria: esCliente ? datos.categoria : null,
        });
        if (actualizado) {
            // perfilCompleto lo decide el servidor
            actualizarUsuario({
                nombre: actualizado.nombre,
                apellido: actualizado.apellido,
                perfilCompleto: actualizado.perfilCompleto,
            });
        }
    };

    const handleDesactivar = async () => {
        setDesactivando(true);
        setErrorDesactivar(null);
        try {
            await perfilService.desactivarPerfil();
            await cerrarSesion();
            navigate("/login");
        } catch (e) {
            setErrorDesactivar(primerError(extraerErrores(e, "No se pudo desactivar la cuenta.")) ?? null);
        } finally {
            setDesactivando(false);
        }
    };

    if (cargando) {
        return (
            <div className="perfil-cargando">
                <div className="perfil-cargando__spinner" />
            </div>
        );
    }

    return (
        <div className="perfil-pagina">
            <div className="perfil-contenedor">

                {/* Header */}
                <div className="perfil-header">
                    <div className="perfil-avatar">
                        {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                    </div>
                    <div className="perfil-header__info">
                        <h1 className="perfil-header__nombre">
                            {usuario?.nombre} {usuario?.apellido}
                        </h1>
                        <span className="perfil-header__email">{usuario?.email}</span>
                    </div>
                </div>

                {/* Alerta perfil incompleto: qué falta, según el servidor. En el panel no se muestra:
                    el personal no reserva y el celular lo maneja desde Avisos */}
                {perfil && !perfil.perfilCompleto && !enPanel && (
                    <div className="perfil-alerta">
                        <AlertCircle size={16} />
                        <span>
                            Tu perfil está incompleto: falta {enLista(faltantes(perfil, esCliente)) || "completar tus datos"}.
                            {esCliente && " Lo necesitás para reservar canchas."}
                        </span>
                        {!perfil.telefonoVerificado && tab !== "celular" && (
                            <button type="button" className="accion accion--chica"
                                onClick={() => enPanel ? navigate("/admin/avisos") : elegirTab("celular")}>
                                {perfil.telefono ? "Verificar celular" : "Cargar celular"}
                            </button>
                        )}
                    </div>
                )}

                {/* Venía de elegir un turno: con el perfil completo ya puede terminar la reserva */}
                {turnoGuardado && esCliente && perfil?.perfilCompleto && (
                    <div className="perfil-exito perfil-exito--accion">
                        <CheckCircle2 size={16} />
                        <span>Tu perfil está completo. Ya podés terminar la reserva del turno que elegiste.</span>
                        <button type="button" className="accion accion--primaria accion--chica" onClick={() => navigate("/reservas")}>
                            Continuar con la reserva
                        </button>
                    </div>
                )}

                {/* Éxito */}
                {exitoso && <AvisoTransitorio tipo="ok">Perfil actualizado correctamente.</AvisoTransitorio>}

                {/* Error general */}
                {erroresApi.general && <AvisoTransitorio tipo="error">{erroresApi.general}</AvisoTransitorio>}

                {tabs.length > 1 && <div className="perfil-tabs" role="tablist" aria-label="Secciones del perfil">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            id={`tab-${t.id}`}
                            aria-selected={tab === t.id}
                            aria-controls={`panel-${t.id}`}
                            className={`perfil-tab${tab === t.id ? " perfil-tab--activa" : ""}`}
                            onClick={() => elegirTab(t.id)}
                        >
                            {t.icono}
                            {t.etiqueta}
                            {tieneFaltante(t.id) && <span className="perfil-tab__punto" aria-label="Falta completar" />}
                        </button>
                    ))}
                </div>}

                <div className="perfil-panel" {...(tabs.length > 1 ? { role: "tabpanel", id: `panel-${tab}`, "aria-labelledby": `tab-${tab}` } : {})}>

                    {/* ── Datos personales ── */}
                    {tab === "datos" && (
                    <section className="perfil-seccion">
                        <div className="perfil-seccion__header">
                            <User size={16} />
                            <h2 className="perfil-seccion__titulo">Datos personales</h2>
                        </div>

                        <form onSubmit={enviar} noValidate>
                            <div className="perfil-campos">
                                <div className="perfil-campos-fila">
                                    <CampoInput
                                        id="nombre" name="nombre" label="Nombre"
                                        value={datos.nombre} onChange={cambiarInput}
                                        placeholder="Juan" icono={<User size={16} />}
                                        required error={errores.nombre || erroresApi.nombre}
                                    />
                                    <CampoInput
                                        id="apellido" name="apellido" label="Apellido"
                                        value={datos.apellido} onChange={cambiarInput}
                                        placeholder="Pérez" icono={<User size={16} />}
                                        required error={errores.apellido || erroresApi.apellido}
                                    />
                                </div>
                                <CampoInput
                                    id="email" name="email" label="Correo electrónico"
                                    type="email" value={perfil?.email ?? ""}
                                    onChange={() => { }}
                                    icono={<Mail size={16} />}
                                    disabled
                                />
                            </div>

                            {/* ── Nivel de juego (solo jugadores) ── */}
                            {esCliente && (<>
                            <div className="perfil-seccion__header" style={{ marginTop: 32 }}>
                                <Lock size={16} />
                                <h2 className="perfil-seccion__titulo">Nivel de juego</h2>
                            </div>

                            <div className="perfil-campos">
                                <CampoSelect
                                    id="posicion" name="posicion" label="Posición en cancha"
                                    value={datos.posicion}
                                    onChange={cambiarSelect("posicion")}
                                    placeholder="Seleccioná tu posición"
                                    opciones={POSICIONES}
                                    error={errores.posicion || erroresApi.posicion}
                                />
                                <CampoSelect
                                    id="categoria" name="categoria" label="Categoría"
                                    value={datos.categoria}
                                    onChange={cambiarSelect("categoria")}
                                    placeholder="Seleccioná tu categoría"
                                    opciones={CATEGORIAS}
                                    error={errores.categoria || erroresApi.categoria}
                                    disabled={!puedeEditarCategoria()}
                                />

                                {perfil?.categoria && puedeEditarCategoria() && (
                                    <p className="perfil-categoria__nota">
                                        Podés cambiar tu categoría una sola vez
                                        {perfil.categoriaActualizadaAt && <>, hasta el {vencimientoCategoria()}</>}.
                                    </p>
                                )}

                                {!puedeEditarCategoria() && (
                                    <div className="perfil-categoria__expirada">
                                        <AlertCircle size={13} />
                                        Ya no podés cambiar tu categoría. Contactá al club para modificarla.
                                    </div>
                                )}
                            </div>
                            </>)}

                            <div className="perfil-acciones">
                                <Boton variante="primario" type="submit" ancho="auto" cargando={guardando} disabled={!hayCambios}>
                                    <span>Guardar cambios</span>
                                </Boton>
                            </div>
                        </form>
                    </section>
                    )}

                    {/* ── Celular y notificaciones ── (queda montada al cambiar de tab: no se pierde
                        el código que se pidió) */}
                    {conNotificaciones && perfil && (
                        <div hidden={tab !== "celular"}>
                            <CelularYNotificaciones
                                perfil={perfil}
                                esCliente={esCliente}
                                onPerfilCambio={() => void recargar()}
                            />
                        </div>
                    )}

                    {/* ── Cuenta ── */}
                    {tab === "cuenta" && (
                    <section className="perfil-seccion perfil-seccion--cuenta">
                        <div className="perfil-seccion__header">
                            <Lock size={16} />
                            <h2 className="perfil-seccion__titulo">Cuenta</h2>
                        </div>

                        <div className="perfil-cuenta-info">
                            <div className="perfil-cuenta-item">
                                <span className="perfil-cuenta-item__label">Tipo de cuenta</span>
                                <span className="perfil-cuenta-item__valor">
                                    {usuario?.rol}
                                </span>
                            </div>
                            <div className="perfil-cuenta-item">
                                <span className="perfil-cuenta-item__label">Miembro hace</span>
                                <span className="perfil-cuenta-item__valor">
                                    {dias(perfil?.cantDiasMiembro)}
                                </span>
                            </div>
                            <div className="perfil-cuenta-item">
                                <span className="perfil-cuenta-item__label">Partidos jugados</span>
                                <span className="perfil-cuenta-item__valor">
                                    {perfil?.cantPartidos}
                                </span>
                            </div>
                            <div className="perfil-cuenta-item">
                                <span className="perfil-cuenta-item__label">Último partido</span>
                                <span className="perfil-cuenta-item__valor">
                                    {perfil?.diasDesdeUltimoPartido == null
                                        ? "Todavía ninguno"
                                        : perfil.diasDesdeUltimoPartido === 0
                                            ? "Hoy"
                                            : `Hace ${dias(perfil.diasDesdeUltimoPartido)}`}
                                </span>
                            </div>
                            <div className="perfil-cuenta-item">
                                <span className="perfil-cuenta-item__label">Partidos en {mesActual}</span>
                                <span className="perfil-cuenta-item__valor">
                                    {perfil?.cantPartidosEsteMes}
                                </span>
                            </div>
                        </div>

                        {esCliente && <div className="perfil-zona-peligro">
                            <h3 className="perfil-zona-peligro__titulo">Zona de peligro</h3>
                            <p className="perfil-zona-peligro__descripcion">
                                Al desactivar tu cuenta no podrás iniciar sesión. Contactá al club para reactivarla.
                            </p>
                            <Boton
                                variante="peligro"
                                ancho="auto"
                                onClick={() => setModalDesactivar(true)}
                                type="button"
                            >
                                <Trash2 size={15} />
                                Desactivar cuenta
                            </Boton>
                        </div>}
                    </section>
                    )}
                </div>
            </div>

            {modalDesactivar && (
                <ModalConfirmacion
                    titulo="¿Desactivar cuenta?"
                    descripcion="Tu cuenta será desactivada y no podrás iniciar sesión. Esta acción no se puede deshacer fácilmente."
                    icono={<Trash2 size={22} />}
                    variante="danger"
                    textoConfirmar="Sí, desactivar"
                    cargando={desactivando}
                    error={errorDesactivar}
                    onCerrar={() => { setModalDesactivar(false); setErrorDesactivar(null); }}
                    onConfirmar={handleDesactivar}
                />
            )}
        </div>
    );
}