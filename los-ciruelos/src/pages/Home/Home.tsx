import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowRight, MapPin, Clock,
    Newspaper, Users, CalendarDays,
    CheckCircle2, UserPlus, Layers, Star, Phone,
} from "lucide-react";
import { canchaService } from "../../services/canchaService";
import { useHorariosClub } from "../../hooks/useHorariosClub";
import { useCanchasPublicas } from "../../hooks/useCanchasPublicas";
import { NOVEDADES_EN_INICIO, PIE_NOVEDAD } from "../../config/novedades";
import type { Novedad } from "../../types/admin.types";
import { urlArchivo } from "../../utils/archivos";
import { formatFecha } from "../../utils/fechas";
import { CELULAR_CLUB } from "../../config/contactoClub";
import padelBg from "../../assets/padel-bg.webp";
import "./Home.css";
import Boton from "../../components/ui/Boton/Boton";

/* ─── ANIMACIONES ────────────────────────────────── */
const variantes = {
    oculto: { opacity: 0, y: 48 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" as const }
    }
};

const variantesHijos = {
    oculto: { opacity: 0, y: 32 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" as const, delay: i * 0.1 }
    })
};

/* ─── DATOS ──────────────────────────────────────── */
/**
 * Cifras del club: canchas, años de trayectoria y reservas online. La cantidad de canchas sale del
 * backend (GET /canchas, las activas), así cambia sola; si no responde, 4.
 */
const CANCHAS_POR_DEFECTO = 4;
const ESTADISTICAS_FIJAS = [
    { numero: "+15", etiqueta: "Años de trayectoria" },
    { numero: "24/7", etiqueta: "Reservas online" },
];

/** Ficha del club en Google Maps (el mismo lugar del mapa de Ubicación) */
const GOOGLE_MAPS_CLUB = "https://maps.google.com/?cid=10109990305233723795";

/** Si el backend no responde: las canchas de siempre */
const CANCHAS_RESPALDO = [
    { nombre: "Cancha 1", tipo: "Techada", superficie: "Cemento", iluminacion: true },
    { nombre: "Cancha 2", tipo: "Techada", superficie: "Cemento", iluminacion: true },
    { nombre: "Cancha 3", tipo: "Techada", superficie: "Cemento", iluminacion: true },
    { nombre: "Cancha 4", tipo: "Al aire libre", superficie: "Césped sintético · Blidex", iluminacion: true },
];

/** Reseñas reales del club en Google Maps, copiadas tal cual (sin fecha) */
const TESTIMONIOS = [
    {
        id: 1, nombre: "Walter Amado", estrellas: 4,
        texto: "Las canchas están buenas pero la atención de Alejandro es lo mejor. Después de jugar siempre me quedo un rato mas.. indumentaria, palas, comida, bebidas muy completo.",
    },
    {
        id: 2, nombre: "Ariel Mendoza", estrellas: 5,
        texto: "Las canchas un 10 pero las empanadas despues de jugar son un 11!! Recomiendo las de carne y roquefort.",
    },
    {
        id: 3, nombre: "santiago gotelli", estrellas: 5,
        texto: "El mejor complejo de padel de la plata, excelente atencion la de alejandro, siempre dispuesto para armar partidos, si te falta gente el te lo arma por whatsapp, siempre contesta rapido.tiene 3 canchas cerradas y una de blindex al aire libre. Tambien tiene un excelente buffet podes pedir antes de jugar y ya lo tienen preparado para cuando terminas el turno.",
    },
];

/* ─── HERO ───────────────────────────────────────── */
function Hero({ logueado, puedeReservar }: { logueado: boolean; puedeReservar: boolean }) {
    const navigate = useNavigate();

    return (
        <section className="home-hero" id="inicio">
            <div className="home-hero__fondo" style={{ backgroundImage: `url(${padelBg})` }} aria-hidden="true" />
            <div className="home-hero__overlay" aria-hidden="true" />
            <motion.div
                className="home-hero__contenido"
                initial={{ opacity: 0, y: 48 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
            >
                <motion.span
                    className="etiqueta"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                >
                    Club de Pádel · La Plata
                </motion.span>
                <motion.h1
                    className="home-hero__titular"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                >
                    EL PÁDEL ES<br />
                    MUCHO MÁS<br />
                    QUE UN <em data-text="DEPORTE">DEPORTE</em>
                </motion.h1>
                <motion.p
                    className="home-hero__descripcion"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                >
                    En Los Ciruelos encontrás canchas, una comunidad apasionada y todo lo que necesitás para disfrutar del pádel en La Plata.
                </motion.p>
                <motion.div
                    className="home-hero__acciones"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                >
                    {logueado ? (
                        puedeReservar && (
                            <Boton variante="primario" ancho="auto" onClick={() => navigate("/reservas")}>
                                <span>Reservar cancha</span>
                                <CalendarDays size={17} />
                            </Boton>
                        )
                    ) : (
                        // Sin sesión se pueden ver los turnos libres; para reservar se pide cuenta
                        <>
                            <Boton variante="primario" ancho="auto" onClick={() => navigate("/reservas")}>
                                <span>Ver turnos libres</span>
                                <CalendarDays size={17} />
                            </Boton>
                            <Boton variante="secundario" ancho="auto" onClick={() => navigate("/register")}>
                                <span>Sumate al club</span>
                                <ArrowRight size={17} />
                            </Boton>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </section>
    );
}

/* ─── ESTADÍSTICAS ───────────────────────────────── */
function Estadisticas() {
    const lista = useCanchasPublicas();
    const canchas = lista ? lista.filter(c => c.activa !== false).length || CANCHAS_POR_DEFECTO : CANCHAS_POR_DEFECTO;
    const estadisticas = [{ numero: String(canchas), etiqueta: canchas === 1 ? "Cancha" : "Canchas" }, ...ESTADISTICAS_FIJAS];
    return (
        <section className="home-estadisticas" id="club">
            <div className="home-container">
                <motion.div
                    className="estadisticas-grid"
                    style={{ "--estadisticas": estadisticas.length } as React.CSSProperties}
                    variants={variantes}
                    initial="oculto"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                >
                    {estadisticas.map((e, i) => (
                        <motion.div
                            key={e.etiqueta}
                            className="estadistica-item"
                            custom={i}
                            variants={variantesHijos}
                            initial="oculto"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <span className="estadistica-item__numero">{e.numero}</span>
                            <span className="estadistica-item__etiqueta">{e.etiqueta}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

/* ─── SOBRE EL CLUB ──────────────────────────────── */
function SobreElClub() {
    return (
        <motion.section
            className="home-seccion home-container"
            id="historia"
            variants={variantes}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="home-seccion__badge">
                <Users size={14} />
                Nuestra historia
            </div>
            <div className="sobre-grid">
                <div className="sobre-texto">
                    <h2 className="home-seccion__titulo">
                        UNA PASIÓN QUE<br />
                        SE CONVIRTIÓ<br />
                        EN <em data-text="COMUNIDAD">COMUNIDAD</em>
                    </h2>
                    <div className="sobre-parrafos">
                        <p>Los Ciruelos nació de una pasión que comenzó mucho antes de la construcción de sus canchas. Detrás del club está <strong>Alejandro Santillan</strong>, un amante del pádel que desde muy joven encontró en este deporte mucho más que una competencia: una forma de vida.</p>
                        <p>Así nació Los Ciruelos, en La Plata, con el objetivo de ofrecer un lugar donde jugadores de todas las edades y niveles pudieran sentirse parte de una comunidad.</p>
                        <p>Hoy, Los Ciruelos es mucho más que un club de pádel. Es un lugar donde se crean amistades, se comparten momentos y se vive el deporte con la misma pasión que inspiró su nacimiento.</p>
                    </div>
                </div>
                <motion.div
                    className="sobre-imagen"
                    // Entra desde abajo: desde el costado quedaba fuera de la pantalla y generaba scroll horizontal
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    aria-hidden="true"
                >
                    <div className="sobre-imagen__placeholder">
                        <span>Foto del club</span>
                    </div>
                </motion.div>
            </div>
        </motion.section>
    );
}

/* ─── CÓMO FUNCIONA ──────────────────────────────── */
function ComoFunciona() {
    const navigate = useNavigate();
    const pasos = [
        { icono: <UserPlus size={22} />, numero: "01", titulo: "Registrate", descripcion: "Creá tu cuenta gratis en minutos y completá tu perfil de jugador." },
        { icono: <CalendarDays size={22} />, numero: "02", titulo: "Reservá", descripcion: "Elegí cancha, día y horario desde la app. Simple y rápido." },
        { icono: <CheckCircle2 size={22} />, numero: "03", titulo: "Jugá", descripcion: "Llegá al club y disfrutá. Así de fácil." },
    ];

    return (
        <motion.section
            className="home-como home-container"
            id="como-funciona"
            variants={variantes}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="home-seccion__badge">
                <Layers size={14} />
                Tres pasos
            </div>
            <h2 className="home-seccion__titulo home-seccion__titulo--centrado">
                ¿CÓMO <em data-text="FUNCIONA?">FUNCIONA?</em>
            </h2>
            <div className="como-grid">
                {pasos.map((paso, i) => (
                    <motion.div
                        key={i}
                        className="como-card"
                        custom={i}
                        variants={variantesHijos}
                        initial="oculto"
                        whileInView="visible"
                        viewport={{ once: true }}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    >
                        <div className="como-card__numero">{paso.numero}</div>
                        <div className="como-card__icono">{paso.icono}</div>
                        <h3 className="como-card__titulo">{paso.titulo}</h3>
                        <p className="como-card__descripcion">{paso.descripcion}</p>
                    </motion.div>
                ))}
            </div>
            <div className="como-cta">
                <button className="home-hero__cta" onClick={() => navigate("/register")}>
                    <span>Empezar ahora</span>
                    <ArrowRight size={17} />
                </button>
            </div>
        </motion.section>
    );
}

/* ─── CANCHAS ────────────────────────────────────── */
interface CanchaVitrina {
    clave: string;
    nombre: string;
    tipo: string;
    superficie: string;
    iluminacion: boolean;
    descripcion: string | null;
    activa: boolean;
    /** grande: la foto en foco (1600 px); mini: miniaturas y la lista (480 px) */
    fotos: { grande: string; mini: string }[];
}

/**
 * Canchas del club como vitrina: la elegida se ve grande, con todas sus fotos (se cambia de foto con
 * las miniaturas), y al costado las demás para elegir. Las desactivadas también se muestran, apagadas
 * y con "No disponible por el momento". Si el backend no responde, las 4 de siempre, sin fotos.
 */
function Canchas() {
    const desdeBackend = useCanchasPublicas();
    // El backend viejo no manda tipo: en ese caso, las de siempre
    const canchas: CanchaVitrina[] = desdeBackend && desdeBackend.every(c => c.tipo)
        ? desdeBackend.map(c => ({
            clave: String(c.id),
            nombre: `Cancha ${c.numero}${c.nombre ? ` · ${c.nombre}` : ""}`,
            tipo: c.tipo === "AIRE_LIBRE" ? "Al aire libre" : "Techada",
            superficie: c.superficie ?? "",
            iluminacion: c.iluminacion,
            descripcion: c.descripcion,
            activa: c.activa !== false,
            fotos: [...c.fotos].sort((x, y) => x.orden - y.orden)
                .map(f => ({ grande: urlArchivo(f.url) ?? "", mini: urlArchivo(f.miniaturaUrl ?? f.url) ?? "" }))
                .filter(f => f.grande),
        }))
        : CANCHAS_RESPALDO.map(c => ({ ...c, clave: c.nombre, descripcion: null, activa: true, fotos: [] }));
    const [elegida, setElegida] = useState(0);
    const [foto, setFoto] = useState(0);
    const actual = canchas[Math.min(elegida, canchas.length - 1)];
    const fotoActual = actual?.fotos[Math.min(foto, Math.max(0, actual.fotos.length - 1))];
    const elegir = (i: number) => { setElegida(i); setFoto(0); };

    return (
        <section className="home-canchas" id="canchas">
            <div className="home-container">
                <motion.div
                    variants={variantes}
                    initial="oculto"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <div className="home-seccion__badge">
                        <Layers size={14} />
                        Instalaciones
                    </div>
                    <h2 className="home-seccion__titulo">
                        NUESTRAS <em data-text="CANCHAS">CANCHAS</em>
                    </h2>
                </motion.div>

                {actual && (
                    <div className="vitrina">
                        {/* La cancha elegida, en foco */}
                        <article className={`vitrina__foco${actual.activa ? "" : " vitrina__foco--inactiva"}`} aria-live="polite">
                            <div className="vitrina__foto">
                                {fotoActual
                                    ? <img key={fotoActual.grande} src={fotoActual.grande} alt={`${actual.nombre}, foto ${foto + 1} de ${actual.fotos.length}`} />
                                    : <span className="vitrina__sin-foto" aria-hidden="true">{actual.nombre}</span>}
                                {!actual.activa && <span className="vitrina__estado">No disponible por el momento</span>}
                            </div>
                            {actual.fotos.length > 1 && (
                                <div className="vitrina__miniaturas" role="group" aria-label={`Fotos de ${actual.nombre}`}>
                                    {actual.fotos.map((f, i) => (
                                        <button key={f.grande} type="button" aria-pressed={i === foto} aria-label={`Ver la foto ${i + 1}`}
                                            className={`vitrina__miniatura${i === foto ? " vitrina__miniatura--activa" : ""}`} onClick={() => setFoto(i)}>
                                            <img src={f.mini} alt="" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="vitrina__info">
                                <h3 className="vitrina__nombre">{actual.nombre}</h3>
                                <div className="vitrina__datos">
                                    <span className={`cancha-item__tipo${actual.tipo === "Al aire libre" ? " cancha-item__tipo--exterior" : ""}`}>{actual.tipo}</span>
                                    {actual.superficie && <span className="vitrina__dato">{actual.superficie}</span>}
                                    {actual.iluminacion && <span className="vitrina__dato"><CheckCircle2 size={12} /> Iluminación LED</span>}
                                </div>
                                {actual.descripcion && <p className="vitrina__descripcion">{actual.descripcion}</p>}
                            </div>
                        </article>

                        {/* Las demás, para elegir */}
                        <div className="vitrina__lista" role="group" aria-label="Elegí una cancha">
                            {canchas.map((c, i) => (
                                <button key={c.clave} type="button" aria-pressed={i === elegida} onClick={() => elegir(i)}
                                    className={`vitrina__opcion${i === elegida ? " vitrina__opcion--activa" : ""}${c.activa ? "" : " vitrina__opcion--inactiva"}`}>
                                    <span className="vitrina__opcion-foto">
                                        {c.fotos[0] ? <img src={c.fotos[0].mini} alt="" loading="lazy" /> : <Layers size={18} aria-hidden="true" />}
                                    </span>
                                    <span className="vitrina__opcion-texto">
                                        <span className="vitrina__opcion-nombre">{c.nombre}</span>
                                        <span className="vitrina__opcion-detalle">{c.activa ? c.tipo : "No disponible por el momento"}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ─── NOTICIAS ───────────────────────────────────── */
function Noticias() {
    // null: cargando; [] también si el backend no responde (se muestra un aviso, no noticias viejas)
    const [novedades, setNovedades] = useState<Novedad[] | null>(null);
    useEffect(() => {
        let activo = true;
        canchaService.novedades(NOVEDADES_EN_INICIO)
            .then(n => { if (activo) setNovedades(n); })
            .catch(() => { if (activo) setNovedades([]); });
        return () => { activo = false; };
    }, []);
    return (
        <section className="home-noticias" id="noticias">
            <div className="home-container">
                <motion.div
                    variants={variantes}
                    initial="oculto"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <div className="home-seccion__badge">
                        <Newspaper size={14} />
                        Novedades
                    </div>
                    <h2 className="home-seccion__titulo">
                        ÚLTIMAS <em data-text="NOTICIAS">NOTICIAS</em>
                    </h2>
                </motion.div>
                {novedades && novedades.length === 0 && (
                    <p className="noticias-vacio">Muy pronto vas a ver acá las novedades del club: torneos, clases y más.</p>
                )}
                <div className="noticias-grid">
                    {(novedades ?? []).map((noticia, i) => (
                        <motion.article
                            key={noticia.id}
                            className="noticia-card"
                            custom={i}
                            variants={variantesHijos}
                            initial="oculto"
                            whileInView="visible"
                            viewport={{ once: true }}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        >
                            <div className="noticia-card__imagen" aria-hidden="true">
                                {noticia.imagenUrl && <img src={urlArchivo(noticia.imagenMiniaturaUrl ?? noticia.imagenUrl)} alt="" loading="lazy" />}
                            </div>
                            <div className="noticia-card__contenido">
                                <div className="noticia-card__header">
                                    {noticia.etiqueta && <span className="noticia-card__etiqueta">{noticia.etiqueta}</span>}
                                    {noticia.publicadaAt && <span className="noticia-card__fecha">{formatFecha(noticia.publicadaAt.slice(0, 10))}</span>}
                                </div>
                                <h3 className="noticia-card__titulo">{noticia.titulo}</h3>
                                <p className="noticia-card__descripcion">{noticia.descripcion}</p>
                                <a className="noticia-card__pie" href="#contacto">{PIE_NOVEDAD}</a>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── TESTIMONIOS ────────────────────────────────── */
function Testimonios() {
    return (
        <motion.section
            className="home-seccion home-container"
            id="testimonios"
            variants={variantes}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="home-seccion__badge">
                <Users size={14} />
                Comunidad
            </div>
            <h2 className="home-seccion__titulo home-seccion__titulo--centrado">
                LO QUE DICEN<br />
                LOS QUE <em data-text="JUEGAN">JUEGAN</em>
            </h2>
            <div className="testimonios-grid">
                {TESTIMONIOS.map((t, i) => (
                    <motion.div
                        key={t.id}
                        className="testimonio-card"
                        custom={i}
                        variants={variantesHijos}
                        initial="oculto"
                        whileInView="visible"
                        viewport={{ once: true }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                        <span className="testimonio-card__estrellas" role="img" aria-label={`${t.estrellas} de 5 estrellas`}>
                            {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} className={n <= t.estrellas ? "testimonio-card__estrella--llena" : undefined} aria-hidden="true" />)}
                        </span>
                        <p className="testimonio-card__texto">"{t.texto}"</p>
                        <div className="testimonio-card__autor">
                            <div className="testimonio-card__avatar">{t.nombre[0]}</div>
                            <div>
                                <span className="testimonio-card__nombre">{t.nombre}</span>
                                <span className="testimonio-card__categoria">Reseña de Google</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="testimonios-pie">
                <a className="testimonios-pie__link" href={GOOGLE_MAPS_CLUB} target="_blank" rel="noreferrer">
                    Ver todas las reseñas en Google Maps <ArrowRight size={15} />
                </a>
            </div>
        </motion.section>
    );
}

/* ─── UBICACIÓN ──────────────────────────────────── */
function Ubicacion() {
    // El horario sale del backend; si no responde, Lunes a Sábados · 08:00 a 23:00
    const horario = useHorariosClub();
    return (
        <motion.section
            className="home-ubicacion"
            id="contacto"
            variants={variantes}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="home-container">
                <div className="ubicacion-grid">
                    <div className="ubicacion-info">
                        <div className="home-seccion__badge">
                            <MapPin size={14} />
                            Dónde estamos
                        </div>
                        <h2 className="home-seccion__titulo">
                            VISITANOS EN<br />
                            <em data-text="LA PLATA">LA PLATA</em>
                        </h2>
                        <div className="ubicacion-detalles">
                            <div className="ubicacion-detalle">
                                <MapPin size={16} />
                                <div>
                                    <span className="ubicacion-detalle__titulo">Dirección</span>
                                    <span className="ubicacion-detalle__valor">Calle 34 e/ 25 y 26 Nº 1527, La Plata</span>
                                </div>
                            </div>
                            <div className="ubicacion-detalle">
                                <Clock size={16} />
                                <div>
                                    <span className="ubicacion-detalle__titulo">Horarios</span>
                                    {horario.map(r => <span key={r} className="ubicacion-detalle__valor">{r}</span>)}
                                </div>
                            </div>
                            {/* Celular: se carga en src/config/contactoClub.ts (vacío no se muestra en el sitio publicado) */}
                            {(CELULAR_CLUB.mostrar || import.meta.env.DEV) && (
                                <div className="ubicacion-detalle">
                                    <Phone size={16} />
                                    <div>
                                        <span className="ubicacion-detalle__titulo">Celular</span>
                                        {CELULAR_CLUB.mostrar ? (
                                            <a href={`https://wa.me/${CELULAR_CLUB.whatsapp}`} target="_blank" rel="noopener noreferrer" className="ubicacion-detalle__link">
                                                {CELULAR_CLUB.mostrar}
                                            </a>
                                        ) : (
                                            <span className="ubicacion-detalle__valor">Completalo en src/config/contactoClub.ts</span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="ubicacion-detalle">
                                <div>
                                    <span className="ubicacion-detalle__titulo">Instagram</span>
                                    <a href="https://www.instagram.com/losciruelospadel/" target="_blank" rel="noopener noreferrer" className="ubicacion-detalle__link">
                                        @losciruelospadel
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <motion.div
                        className="ubicacion-mapa"
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    >
                        <iframe
                            title="Ubicación Los Ciruelos Pádel"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d104679.9604013804!2d-57.97699498988854!3d-34.9252976092477!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a2e7eab549ef49%3A0x8c4de69e1a196193!2sLos%20Ciruelos!5e0!3m2!1ses-419!2sar!4v1781472236989!5m2!1ses-419!2sar"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                        />
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────── */
export default function Home() {
    const { usuario } = useAuth();
    const { hash } = useLocation();

    // Links tipo "/#canchas" desde otras páginas: scroll a la sección al llegar
    useEffect(() => {
        if (!hash) return;
        const id = decodeURIComponent(hash.slice(1));
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [hash]);

    return (
        <div className="pagina-home">
            <Hero logueado={!!usuario} puedeReservar={usuario?.rol === "CLIENTE"} />
            <Estadisticas />
            <SobreElClub />
            {!usuario ? <ComoFunciona /> : null}
            <Canchas />
            <Testimonios />
            <Noticias />
            <Ubicacion />
        </div>
    );
}