import logoLosCiruelos from "../../assets/LogoSinFondo.png";
import padelBg from "../../assets/padel-bg.png";
import "./AuthPanelLayout.css";

/* ─── LOGO ───────────────────────────────────────── */
export function Logo() {
    return (
        <div className="logo">
            <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo__imagen" />
            <span className="logo-texto">LOS CIRUELOS</span>
        </div>
    );
}

/* ─── PANEL VISUAL ───────────────────────────────── */
interface PanelVisualProps {
    titular: React.ReactNode;
}

export function PanelVisual({ titular }: PanelVisualProps) {
    return (
        <aside className="panel-visual">
            <div className="panel-visual__fondo" />
            <div className="panel-visual__brillo" />
            <div className="panel-visual__grain" aria-hidden="true" />
            <div
                className="panel-visual__imagen"
                style={{ backgroundImage: `url(${padelBg})` }}
                aria-hidden="true"
            />
            <div className="panel-visual__logo animar-subir"><Logo /></div>
            <div className="panel-visual__contenido">
                <span className="etiqueta animar-subir demora-1">Club de Pádel · La Plata</span>
                <h1 className="titular animar-subir demora-2">{titular}</h1>
            </div>
        </aside>
    );
}

/* ─── LAYOUT COMPLETO ────────────────────────────── */
interface AuthPanelLayoutProps {
    titular: React.ReactNode;
    children: React.ReactNode;
    ariaLabel?: string;
}

export function AuthPanelLayout({ titular, children, ariaLabel }: AuthPanelLayoutProps) {
    return (
        <main className="pagina-login">
            <PanelVisual titular={titular} />
            <section className="panel-formulario" aria-label={ariaLabel}>
                <div
                    className="panel-formulario__imagen"
                    style={{ backgroundImage: `url(${padelBg})` }}
                    aria-hidden="true"
                />
                <div className="formulario-contenedor">
                    <div className="logo-mobile">
                        <img src={logoLosCiruelos} alt="Los Ciruelos Pádel" className="logo-mobile__imagen" />
                        <span className="logo-mobile__texto">LOS CIRUELOS</span>
                    </div>
                    {children}
                </div>
            </section>
        </main>
    );
}