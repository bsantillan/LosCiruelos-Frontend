import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import Boton from "../../components/ui/Boton/Boton";
import "./Perfil.css";
import { usePerfil } from "../../hooks/usePerfil";
import { perfilService } from "../../services/perfilService";
import ModalConfirmacion from "../../components/ui/ModalConfirmacion/ModalConfirmacion";

/* ─── OPCIONES ───────────────────────────────────── */
const POSICIONES = [
    { valor: "Drive", etiqueta: "Drive" },
    { valor: "Reves", etiqueta: "Revés" },
    { valor: "Ambos", etiqueta: "Ambos" },
];

const CATEGORIAS = [
    { valor: "Principiante", etiqueta: "Principiante" },
    { valor: "Septima", etiqueta: "Séptima" },
    { valor: "Sexta", etiqueta: "Sexta" },
    { valor: "Quinta", etiqueta: "Quinta" },
    { valor: "Cuarta", etiqueta: "Cuarta" },
    { valor: "Tercera", etiqueta: "Tercera" },
    { valor: "Segunda", etiqueta: "Segunda" },
    { valor: "Primera", etiqueta: "Primera" },
];

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Perfil() {
    const navigate = useNavigate();
    const { usuario, cerrarSesion } = useAuth();
    const { perfil, cargando, guardando, erroresApi, exitoso, actualizar, setErroresApi } = usePerfil();
    const [perfilModificado, setPerfilModificado] = useState(true);

    const [datos, setDatos] = useState({
        nombre: "",
        apellido: "",
        telefono: "",
        posicion: "",
        categoria: ""
    });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [modalDesactivar, setModalDesactivar] = useState(false);
    const [desactivando, setDesactivando] = useState(false);

    // Cargar datos del perfil cuando llegan
    useEffect(() => {
        if (perfil) {
            setDatos({
                nombre: perfil.nombre ?? "",
                apellido: perfil.apellido ?? "",
                telefono: perfil.telefono ?? "",
                posicion: perfil.posicion ?? "",
                categoria: perfil.categoria ?? "",
            });
        }
        console.log(perfil);
    }, [perfil]);

    const puedeEditarCategoria = (): boolean => {
        if (!perfil?.categoriaActualizadaAt) return true; // nunca la editó
        const vence = new Date(perfil.categoriaActualizadaAt);
        vence.setHours(vence.getHours() + 24);
        return new Date() < vence;
    };

    const vencimientoCategoria = (): string => {
        if (!perfil?.categoriaActualizadaAt) return "";
        const vence = new Date(perfil.categoriaActualizadaAt);
        vence.setHours(vence.getHours() + 24);
        return vence.toLocaleString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const cambiarInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDatos(p => ({ ...p, [name]: value }));
        setErrores(p => ({ ...p, [name]: "" }));
        setErroresApi({});

        setPerfilModificado(datos == perfil);
    };

    const cambiarSelect = (name: string) => (e: { target: { value: string | number } }) => {
        setDatos(p => ({ ...p, [name]: e.target.value as string }));
        setErrores(p => ({ ...p, [name]: "" }));
        setErroresApi({});

        setPerfilModificado(datos == perfil);
    };

    const validar = (): boolean => {
        const e: Record<string, string> = {};
        if (!datos.nombre) e.nombre = "El nombre es obligatorio.";
        else if (datos.nombre.length < 2) e.nombre = "Mínimo 2 caracteres.";
        else if (datos.nombre.length > 50) e.nombre = "Máximo 50 caracteres.";
        if (!datos.apellido) e.apellido = "El apellido es obligatorio.";
        else if (datos.apellido.length < 2) e.apellido = "Mínimo 2 caracteres.";
        else if (datos.apellido.length > 50) e.apellido = "Máximo 50 caracteres.";
        if (!datos.telefono) e.telefono = "El teléfono es obligatorio.";
        else if (!/^\+?[0-9]{8,15}$/.test(datos.telefono)) e.telefono = "Formato inválido. Ej: +5491123456789";
        if (!datos.posicion) e.posicion = "La posición es obligatoria.";
        if (!datos.categoria) e.categoria = "La categoría es obligatoria.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validar()) return;
        await actualizar({
            nombre: datos.nombre,
            apellido: datos.apellido,
            telefono: datos.telefono,
            posicion: datos.posicion,
            categoria: datos.categoria,
        });

        setPerfilModificado(true);
    };

    const handleDesactivar = async () => {
        setDesactivando(true);
        try {
            const refreshToken = localStorage.getItem("refreshToken") ?? "";
            await perfilService.desactivarPerfil(refreshToken)
            await cerrarSesion();
            navigate("/login");
        } catch {
            setModalDesactivar(false);
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

                {/* Alerta perfil incompleto */}
                {!usuario?.perfilCompleto && !perfil && (
                    <div className="perfil-alerta">
                        <AlertCircle size={16} />
                        <span>Tu perfil está incompleto. Completá los campos para poder reservar canchas.</span>
                    </div>
                )}

                {/* Éxito */}
                {exitoso && (
                    <div className="perfil-exito">
                        <CheckCircle2 size={16} />
                        <span>Perfil actualizado correctamente.</span>
                    </div>
                )}

                {/* Error general */}
                {erroresApi.general && (
                    <div className="perfil-error-general">
                        <AlertCircle size={16} />
                        <span>{erroresApi.general}</span>
                    </div>
                )}

                <div className="perfil-grid">

                    {/* ── Datos personales ── */}
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
                                <CampoInput
                                    id="telefono" name="telefono" label="Teléfono"
                                    type="tel" value={datos.telefono} onChange={cambiarInput}
                                    placeholder="+5491123456789" icono={<Phone size={16} />}
                                    required error={errores.telefono || erroresApi.telefono}
                                />
                            </div>

                            {/* ── Nivel de juego ── */}
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

                                {perfil?.categoriaActualizadaAt && puedeEditarCategoria() && (
                                    <p className="perfil-categoria__nota">
                                        Podés modificar tu categoría hasta el {vencimientoCategoria()}
                                    </p>
                                )}

                                {!puedeEditarCategoria() && (
                                    <div className="perfil-categoria__expirada">
                                        <AlertCircle size={13} />
                                        El período para modificar tu categoría expiró. Contactá al club para realizar cambios.
                                    </div>
                                )}
                            </div>

                            <div className="perfil-acciones">
                                <Boton variante="primario" type="submit" ancho="auto" cargando={guardando} disabled={perfilModificado}>
                                    <span>Guardar cambios</span>
                                </Boton>
                            </div>
                        </form>
                    </section>

                    {/* ── Cuenta ── */}
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
                                    {perfil?.cantDiasMiembro} Días
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
                                    Hace {perfil?.diasDesdeUltimoPartido} días
                                </span>
                            </div>
                            <div className="perfil-cuenta-item">
                                <span className="perfil-cuenta-item__label">Partidos este mes</span>
                                <span className="perfil-cuenta-item__valor">
                                    {perfil?.cantPartidosEsteMes}
                                </span>
                            </div>
                        </div>

                        <div className="perfil-zona-peligro">
                            <h3 className="perfil-zona-peligro__titulo">Zona de peligro</h3>
                            <p className="perfil-zona-peligro__descripcion">
                                Al desactivar tu cuenta no podrás iniciar sesión. Contactá al club para reactivarla.
                            </p>
                            <Boton
                                variante="fantasma"
                                ancho="auto"
                                onClick={() => setModalDesactivar(true)}
                                type="button"
                            >
                                <Trash2 size={15} />
                                Desactivar cuenta
                            </Boton>
                        </div>
                    </section>

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
                    onCerrar={() => setModalDesactivar(false)}
                    onConfirmar={handleDesactivar}
                />
            )}
        </div>
    );
}