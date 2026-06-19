import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import {
    ArrowRight, MapPin, Clock,
    Trophy, Newspaper, Users, CalendarDays,
    CheckCircle2, UserPlus, Layers
} from "lucide-react";
import padelBg from "../../assets/padel-bg.png";
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
const ESTADISTICAS = [
    { numero: "4", etiqueta: "Canchas" },
    { numero: "+500", etiqueta: "Socios" },
    { numero: "+15", etiqueta: "Años de trayectoria" },
    { numero: "24/7", etiqueta: "Reservas online" },
];

const CANCHAS = [
    { nombre: "Cancha 1", tipo: "Techada", superficie: "Cemento", iluminacion: true },
    { nombre: "Cancha 2", tipo: "Techada", superficie: "Cemento", iluminacion: true },
    { nombre: "Cancha 3", tipo: "Techada", superficie: "Cemento", iluminacion: true },
    { nombre: "Cancha 4", tipo: "Al aire libre", superficie: "Césped sintético · Blidex", iluminacion: true },
];

const TORNEOS = [
    { id: 1, nombre: "Torneo de Invierno 2025", fecha: "Julio 2025", categoria: "Todas las categorías", estado: "Próximamente" },
    { id: 2, nombre: "Copa Los Ciruelos", fecha: "Agosto 2025", categoria: "Primera y Segunda", estado: "Próximamente" },
    { id: 3, nombre: "Torneo de Menores", fecha: "Septiembre 2025", categoria: "Escuela de menores", estado: "Próximamente" },
];

const NOTICIAS = [
    { id: 1, titulo: "Nuevos horarios de clases", descripcion: "Arranca una nueva tanda de clases grupales para principiantes. Cupos limitados.", fecha: "10 Jun 2025", etiqueta: "Clases" },
    { id: 2, titulo: "Mejoras en las instalaciones", descripcion: "Renovamos los vestuarios y la zona de descanso para mejorar tu experiencia en el club.", fecha: "5 Jun 2025", etiqueta: "Novedades" },
    { id: 3, titulo: "Escuela de menores", descripcion: "Inscripciones abiertas para la escuela de menores. Formamos jugadores desde los 6 años.", fecha: "1 Jun 2025", etiqueta: "Escuela" },
];

const TESTIMONIOS = [
    { id: 1, nombre: "Martín G.", texto: "El mejor club de pádel de La Plata. Las canchas están impecables y el ambiente es increíble.", categoria: "Socio desde 2020" },
    { id: 2, nombre: "Laura P.", texto: "Empecé desde cero en la escuela de adultos y hoy jugo torneos. El nivel de las clases es excelente.", categoria: "Socia desde 2022" },
    { id: 3, nombre: "Diego M.", texto: "Un lugar donde el pádel y la buena onda van de la mano. Me siento parte de una comunidad real.", categoria: "Socio desde 2019" },
];

/* ─── HERO ───────────────────────────────────────── */
function Hero(props: { isLooged: boolean }) {
    const isLogged = props.isLooged;
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
                    En Los Ciruelos encontrás canchas de primer nivel, una comunidad apasionada y todo lo que necesitás para disfrutar del pádel en La Plata.
                </motion.p>
                <motion.div
                    className="home-hero__acciones"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                >
                    {isLogged ? (
                        <Boton variante="primario" ancho="auto" onClick={() => navigate("/reservas")}>
                            <span>Reservar cancha</span>
                            <CalendarDays size={17} />
                        </Boton>
                    ) : (
                        <>
                            <Boton variante="primario" ancho="auto" onClick={() => navigate("/register")}>
                                <span>Sumate al club</span>
                                <ArrowRight size={17} />
                            </Boton>
                            <Boton variante="secundario" ancho="auto" onClick={() => navigate("/login")}>
                                Iniciar sesión
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
    return (
        <section className="home-estadisticas" id="club">
            <div className="home-container">
                <motion.div
                    className="estadisticas-grid"
                    variants={variantes}
                    initial="oculto"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                >
                    {ESTADISTICAS.map((e, i) => (
                        <motion.div
                            key={i}
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
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
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
function Canchas() {
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
                <div className="canchas-grid">
                    {CANCHAS.map((cancha, i) => (
                        <motion.div
                            key={i}
                            className="cancha-item"
                            custom={i}
                            variants={variantesHijos}
                            initial="oculto"
                            whileInView="visible"
                            viewport={{ once: true }}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        >
                            <div className="cancha-item__imagen" aria-hidden="true">
                                <span className="cancha-item__imagen-placeholder">{cancha.nombre}</span>
                            </div>
                            <div className="cancha-item__info">
                                <div className="cancha-item__header">
                                    <h3 className="cancha-item__nombre">{cancha.nombre}</h3>
                                    <span className={`cancha-item__tipo${cancha.tipo === "Al aire libre" ? " cancha-item__tipo--exterior" : ""}`}>
                                        {cancha.tipo}
                                    </span>
                                </div>
                                <p className="cancha-item__superficie">{cancha.superficie}</p>
                                {cancha.iluminacion && (
                                    <span className="cancha-item__badge">
                                        <CheckCircle2 size={11} />
                                        Iluminación LED
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── TORNEOS ────────────────────────────────────── */
function Torneos() {
    return (
        <motion.section
            className="home-seccion home-container"
            id="torneos"
            variants={variantes}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="home-seccion__badge">
                <Trophy size={14} />
                Competencia
            </div>
            <h2 className="home-seccion__titulo">
                PRÓXIMOS <em data-text="TORNEOS">TORNEOS</em>
            </h2>
            <div className="torneos-grid">
                {TORNEOS.map((torneo, i) => (
                    <motion.div
                        key={torneo.id}
                        className="torneo-card"
                        custom={i}
                        variants={variantesHijos}
                        initial="oculto"
                        whileInView="visible"
                        viewport={{ once: true }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                        <div className="torneo-card__estado">{torneo.estado}</div>
                        <h3 className="torneo-card__nombre">{torneo.nombre}</h3>
                        <div className="torneo-card__detalles">
                            <span><CalendarDays size={13} />{torneo.fecha}</span>
                            <span><Users size={13} />{torneo.categoria}</span>
                        </div>
                        <div className="torneo-card__aviso">
                            Las inscripciones estarán disponibles próximamente
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.section>
    );
}

/* ─── NOTICIAS ───────────────────────────────────── */
function Noticias() {
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
                <div className="noticias-grid">
                    {NOTICIAS.map((noticia, i) => (
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
                            <div className="noticia-card__imagen" aria-hidden="true" />
                            <div className="noticia-card__contenido">
                                <div className="noticia-card__header">
                                    <span className="noticia-card__etiqueta">{noticia.etiqueta}</span>
                                    <span className="noticia-card__fecha">{noticia.fecha}</span>
                                </div>
                                <h3 className="noticia-card__titulo">{noticia.titulo}</h3>
                                <p className="noticia-card__descripcion">{noticia.descripcion}</p>
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
                NUESTROS <em data-text="SOCIOS">SOCIOS</em>
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
                        <p className="testimonio-card__texto">"{t.texto}"</p>
                        <div className="testimonio-card__autor">
                            <div className="testimonio-card__avatar">{t.nombre[0]}</div>
                            <div>
                                <span className="testimonio-card__nombre">{t.nombre}</span>
                                <span className="testimonio-card__categoria">{t.categoria}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.section>
    );
}

/* ─── UBICACIÓN ──────────────────────────────────── */
function Ubicacion() {
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
                                    <span className="ubicacion-detalle__valor">Lunes a Sábados · 08:00 a 23:00</span>
                                </div>
                            </div>
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
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
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
    return (
        <div className="pagina-home">
            <Hero isLooged={usuario ? true : false}></Hero>
            <Estadisticas />
            <SobreElClub />
            {!usuario ? <ComoFunciona /> : null}
            <Canchas />
            <Torneos />
            <Noticias />
            <Testimonios />
            <Ubicacion />
        </div>
    );
}