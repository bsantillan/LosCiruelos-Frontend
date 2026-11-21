import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Mail, Pencil, Power, User, UserPlus, Users, X } from "lucide-react";
import CampoBusqueda from "../../components/ui/CampoBusqueda/CampoBusqueda";
import { useBusqueda } from "../../hooks/useBusqueda";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoTelefono from "../../components/ui/CampoTelefono/CampoTelefono";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import { adminService } from "../../services/adminService";
import type { FiltrosUsuarios, RolGestionable, UsuarioAdmin, UsuarioAdminRequest } from "../../types/admin.types";
import { CATEGORIAS, POSICIONES, etiquetaDe } from "../../config/opcionesJugador";
import { extraerErrores, primerError, type ErroresApi } from "../../utils/apiErrors";
import { aInternacional, celularValido, formatTelefono } from "../../utils/telefono";
import { BotonActualizar, Cargando, Encabezado, Mensaje, Vacio } from "./comunes";

const ROLES: { valor: RolGestionable; etiqueta: string }[] = [
    { valor: "CLIENTE", etiqueta: "Cliente" },
    { valor: "EMPLEADO", etiqueta: "Empleado" },
    { valor: "PROFESOR", etiqueta: "Profesor" },
];
const etiquetaRol = (rol: string) => ROLES.find(r => r.valor === rol)?.etiqueta ?? rol;

/* ─── Alta y edición ─────────────────────────────── */
function ModalUsuario({ usuario, soloCliente = false, onCerrar, onGuardado }: {
    /** null: alta */
    usuario: UsuarioAdmin | null;
    /** El EMPLEADO da de alta solo clientes: sin elegir el rol */
    soloCliente?: boolean;
    onCerrar: () => void;
    onGuardado: (u: UsuarioAdmin, nuevo: boolean) => void;
}) {
    const nuevo = usuario === null;
    const [datos, setDatos] = useState({
        email: usuario?.email ?? "",
        nombre: usuario?.nombre ?? "",
        apellido: usuario?.apellido ?? "",
        telefono: aInternacional(usuario?.telefono),
        rol: (usuario?.rol ?? "CLIENTE") as RolGestionable,
        categoria: usuario?.categoria ?? "",
        posicion: usuario?.posicion ?? "",
    });
    const [errores, setErrores] = useState<ErroresApi>({});
    const [guardando, setGuardando] = useState(false);
    const esCliente = datos.rol === "CLIENTE";

    const cambiar = (campo: keyof typeof datos) => (e: { target: { value: string | number } }) => {
        setDatos(d => ({ ...d, [campo]: String(e.target.value) }));
        setErrores(er => ({ ...er, [campo]: undefined, general: undefined }));
    };

    const validar = () => {
        const e: ErroresApi = {};
        if (nuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) e.email = "Ingresá un email válido.";
        if (datos.nombre.trim().length < 2) e.nombre = "Mínimo 2 caracteres.";
        if (datos.apellido.trim().length < 2) e.apellido = "Mínimo 2 caracteres.";
        if (!celularValido(datos.telefono)) e.telefono = "Ingresá un celular válido, con el código de área.";
        // Al crear un cliente son opcionales (las completa él); al editarlo, obligatorias
        if (esCliente && !nuevo && !datos.categoria) e.categoria = "Elegí la categoría.";
        if (esCliente && !nuevo && !datos.posicion) e.posicion = "Elegí la posición.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const guardar = async () => {
        if (!validar()) return;
        setGuardando(true);
        const req: UsuarioAdminRequest = {
            ...(nuevo ? { email: datos.email.trim() } : {}),
            nombre: datos.nombre.trim(),
            apellido: datos.apellido.trim(),
            telefono: datos.telefono,
            rol: datos.rol,
            categoria: esCliente ? datos.categoria || null : null,
            posicion: esCliente ? datos.posicion || null : null,
        };
        try {
            const guardado = nuevo
                ? await adminService.crearUsuario(req)
                : await adminService.editarUsuario(usuario.id, req);
            onGuardado(guardado, nuevo);
        } catch (e) {
            setErrores(extraerErrores(e, "No se pudo guardar el usuario."));
            setGuardando(false);
        }
    };

    // Los errores de campos que no se ven (o el general) van abajo del formulario
    const visibles = ["email", "nombre", "apellido", "telefono", "categoria", "posicion"];
    const errorGeneral = errores.general ?? Object.entries(errores).find(([k, v]) => v && !visibles.includes(k))?.[1];

    return (
        <ModalConfirmacion
            titulo={nuevo ? (soloCliente ? "Nuevo cliente" : "Nuevo usuario") : `Editar a ${usuario.nombre} ${usuario.apellido}`}
            icono={nuevo ? <UserPlus size={22} /> : <Pencil size={22} />}
            textoConfirmar={nuevo ? (soloCliente ? "Crear cliente" : "Crear usuario") : "Guardar cambios"}
            textoCancelar="Volver"
            cargando={guardando}
            error={errorGeneral ?? null}
            onCerrar={onCerrar}
            onConfirmar={() => void guardar()}
        >
            <div className="admin-form">
                {nuevo ? (
                    <>
                        <CampoInput id="u-email" name="email" label="Email" type="email" value={datos.email}
                            onChange={cambiar("email")} icono={<Mail size={16} />} required error={errores.email} />
                        <p className="modal__descripcion">Le llega un mail con una contraseña temporal y el código para verificar la cuenta.</p>
                    </>
                ) : (
                    <p className="modal__descripcion">{usuario.email}</p>
                )}
                <div className="admin-form__fila">
                    <CampoInput id="u-nombre" name="nombre" label="Nombre" value={datos.nombre}
                        onChange={cambiar("nombre")} icono={<User size={16} />} required error={errores.nombre} />
                    <CampoInput id="u-apellido" name="apellido" label="Apellido" value={datos.apellido}
                        onChange={cambiar("apellido")} icono={<User size={16} />} required error={errores.apellido} />
                </div>
                <CampoTelefono id="u-telefono" name="telefono" label="Celular" value={datos.telefono}
                    onChange={telefono => cambiar("telefono")({ target: { value: telefono } })} required error={errores.telefono} />
                {!soloCliente && <CampoSelect id="u-rol" name="rol" label="Rol" value={datos.rol} onChange={cambiar("rol")} opciones={ROLES} />}
                {esCliente && (
                    <div className="admin-form__fila">
                        <CampoSelect id="u-categoria" name="categoria" label="Categoría" value={datos.categoria}
                            onChange={cambiar("categoria")} opciones={CATEGORIAS} placeholder="Elegí" error={errores.categoria} />
                        <CampoSelect id="u-posicion" name="posicion" label="Posición" value={datos.posicion}
                            onChange={cambiar("posicion")} opciones={POSICIONES} placeholder="Elegí" error={errores.posicion} />
                    </div>
                )}
                {!nuevo && usuario.rol === "CLIENTE" && !esCliente && (
                    <Mensaje fijo tipo="error">Al dejar de ser cliente se borra su perfil de jugador (categoría y posición).</Mensaje>
                )}
            </div>
        </ModalConfirmacion>
    );
}

/* ─── Página ─────────────────────────────────────── */
export default function Usuarios() {
    // El EMPLEADO solo los ve: crear, editar y desactivar es del ADMIN
    const { usuario: sesion } = useAuth();
    const esAdmin = sesion?.rol === "ADMIN";
    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [version, setVersion] = useState(0);

    // Filtros: el texto se busca con 3 letras o más, al dejar de escribir, con Enter o con la lupa
    const campo = useBusqueda();
    const busqueda = campo.termino;
    const [rol, setRol] = useState<RolGestionable | "">("");
    const [estado, setEstado] = useState<"" | "activos" | "inactivos">("");
    const hayFiltros = campo.texto !== "" || rol !== "" || estado !== "";
    const limpiarFiltros = () => { campo.limpiar(); setRol(""); setEstado(""); };

    // El texto busca en nombre/apellido, o en el email si tiene "@"
    const filtros: FiltrosUsuarios = {
        ...(busqueda.includes("@") ? { email: busqueda } : busqueda ? { nombre: busqueda } : {}),
        ...(rol ? { rol } : {}),
        ...(estado ? { enabled: estado === "activos" } : {}),
    };
    const claveFiltros = JSON.stringify(filtros);

    const [claveCargada, setClaveCargada] = useState<string | null>(null);
    if (claveCargada !== `${claveFiltros}|${version}`) {
        setClaveCargada(`${claveFiltros}|${version}`);
        setCargando(true);
        setError(null);
    }

    useEffect(() => {
        let activo = true;
        adminService.usuarios(JSON.parse(claveFiltros) as FiltrosUsuarios)
            .then(u => { if (activo) setUsuarios(u); })
            .catch(e => { if (activo) setError(primerError(extraerErrores(e, "No se pudieron cargar los usuarios.")) ?? null); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [claveFiltros, version]);

    const [editando, setEditando] = useState<UsuarioAdmin | null | undefined>(undefined); // null = alta
    const [cambiandoEstado, setCambiandoEstado] = useState<UsuarioAdmin | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [errorEstado, setErrorEstado] = useState<string | null>(null);

    const cambiarEstado = async () => {
        if (!cambiandoEstado) return;
        setProcesando(true);
        setErrorEstado(null);
        try {
            if (cambiandoEstado.enabled) await adminService.desactivarUsuario(cambiandoEstado.id);
            else await adminService.reactivarUsuario(cambiandoEstado.id);
            setMensaje(`${cambiandoEstado.nombre} ${cambiandoEstado.apellido} quedó ${cambiandoEstado.enabled ? "desactivado" : "activo"}.`);
            setCambiandoEstado(null);
            setVersion(v => v + 1);
        } catch (e) {
            setErrorEstado(primerError(extraerErrores(e, "No se pudo cambiar el estado.")) ?? null);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="admin-pagina">
            {editando !== undefined && (
                <ModalUsuario
                    usuario={editando}
                    soloCliente={!esAdmin}
                    onCerrar={() => setEditando(undefined)}
                    onGuardado={(u, nuevo) => {
                        setMensaje(nuevo
                            ? `Usuario creado: le mandamos a ${u.email} la contraseña temporal y el código de verificación.`
                            : `Se guardaron los cambios de ${u.nombre} ${u.apellido}.`);
                        setEditando(undefined);
                        setVersion(v => v + 1);
                    }}
                />
            )}
            {cambiandoEstado && (
                <ModalConfirmacion
                    titulo={cambiandoEstado.enabled ? "¿Desactivar la cuenta?" : "¿Reactivar la cuenta?"}
                    descripcion={cambiandoEstado.enabled
                        ? `${cambiandoEstado.nombre} ${cambiandoEstado.apellido} no va a poder iniciar sesión y se cierran sus sesiones abiertas.`
                        : `${cambiandoEstado.nombre} ${cambiandoEstado.apellido} va a poder volver a iniciar sesión.`}
                    icono={<Power size={22} />}
                    variante={cambiandoEstado.enabled ? "danger" : "default"}
                    textoConfirmar={cambiandoEstado.enabled ? "Sí, desactivar" : "Sí, reactivar"}
                    cargando={procesando}
                    error={errorEstado}
                    onCerrar={() => { setCambiandoEstado(null); setErrorEstado(null); }}
                    onConfirmar={() => void cambiarEstado()}
                />
            )}

            <Encabezado
                titulo="Usuarios"
                descripcion={esAdmin
                    ? "Clientes, empleados y profesores del club. Los administradores no aparecen en esta lista."
                    : "Clientes, empleados y profesores del club. Podés dar de alta clientes; los demás cambios los hace el ADMIN."}
                acciones={<>
                    <BotonActualizar onClick={() => setVersion(v => v + 1)} cargando={cargando} />
                    <button type="button" className="accion accion--primaria" onClick={() => { setMensaje(null); setEditando(null); }}>
                        <UserPlus size={15} />
                        {esAdmin ? "Nuevo usuario" : "Nuevo cliente"}
                    </button>
                </>}
            />

            <div className="admin-filtros">
                <CampoBusqueda id="buscar-usuario" label="Buscar" placeholder="Nombre, apellido o email" busqueda={campo} />
                <CampoSelect id="filtro-rol" name="rol" label="Rol" value={rol}
                    onChange={e => setRol(e.target.value as RolGestionable | "")}
                    opciones={[{ valor: "", etiqueta: "Todos" }, ...ROLES]} />
                <CampoSelect id="filtro-estado" name="estado" label="Estado" value={estado}
                    onChange={e => setEstado(e.target.value as "" | "activos" | "inactivos")}
                    opciones={[{ valor: "", etiqueta: "Todos" }, { valor: "activos", etiqueta: "Activos" }, { valor: "inactivos", etiqueta: "Desactivados" }]} />
                <button type="button" className="accion admin-filtros__fijo admin-filtros__limpiar" onClick={limpiarFiltros} disabled={!hayFiltros}>
                    <X size={15} /> Limpiar filtros
                </button>
            </div>

            {mensaje && <Mensaje tipo="ok">{mensaje}</Mensaje>}
            {error && <Mensaje tipo="error">{error}</Mensaje>}

            {cargando && usuarios.length === 0 ? <Cargando /> : usuarios.length === 0 && !error ? (
                <Vacio icono={<Users size={32} />}>No hay usuarios con esos filtros.</Vacio>
            ) : (
                <>
                    <p className="admin-resumen-lista">{usuarios.length} {usuarios.length === 1 ? "usuario" : "usuarios"}</p>
                    <div className="admin-tabla-contenedor">
                        <table className="admin-tabla">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Celular</th>
                                    <th>Nivel</th>
                                    <th>Estado</th>
                                    {esAdmin && <th className="admin-tabla__acciones" aria-label="Acciones" />}
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id} className={u.enabled ? undefined : "admin-tabla__inactiva"}>
                                        <td className="admin-tabla__titulo-celda">
                                            <span className="admin-tabla__principal">{u.nombre} {u.apellido}</span>
                                            <span className="admin-tabla__secundario">{u.email}</span>
                                        </td>
                                        <td data-label="Rol">{etiquetaRol(u.rol)}</td>
                                        <td data-label="Celular" className="admin-tabla__num">
                                            <div>
                                                {u.telefono ? formatTelefono(u.telefono) : "—"}
                                                {u.telefono && (
                                                    <span className="admin-tabla__secundario">{u.telefonoVerificado ? "Verificado" : "Sin verificar"}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Nivel">
                                            {u.rol === "CLIENTE" && u.categoria
                                                ? <div>{etiquetaDe(CATEGORIAS, u.categoria)}<span className="admin-tabla__secundario">{etiquetaDe(POSICIONES, u.posicion)}</span></div>
                                                : "—"}
                                        </td>
                                        <td data-label="Estado">
                                            {!u.enabled ? <span className="admin-chip admin-chip--error">Desactivado</span>
                                                : !u.emailVerificado ? <span className="admin-chip admin-chip--alerta">Email sin verificar</span>
                                                    : <span className="admin-chip admin-chip--ok">Activo</span>}
                                        </td>
                                        {esAdmin && <td className="admin-tabla__acciones">
                                            <span className="admin-tabla__acciones-grupo">
                                                <button type="button" className="accion accion--chica" onClick={() => { setMensaje(null); setEditando(u); }}>
                                                    <Pencil size={14} />
                                                    Editar
                                                </button>
                                                <button type="button"
                                                    className={`accion accion--chica${u.enabled ? " accion--peligro" : " accion--primaria"}`}
                                                    onClick={() => { setMensaje(null); setCambiandoEstado(u); }}>
                                                    <Power size={14} />
                                                    {u.enabled ? "Desactivar" : "Reactivar"}
                                                </button>
                                            </span>
                                        </td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
