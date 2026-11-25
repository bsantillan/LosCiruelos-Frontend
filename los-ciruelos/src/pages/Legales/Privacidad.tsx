import TextoPrivacidad from "../../components/Legales/TextoPrivacidad";
import { DATOS_LEGALES as D } from "../../config/legales";
import "../../components/Legales/Legales.css";

/** Política de privacidad (público: /privacidad). Es la URL que piden Google y Meta; en el sitio se abre en un modal */
export default function Privacidad() {
    return (
        <div className="legales-pagina">
            <article className="legales-pagina__contenedor">
                <header>
                    <p className="etiqueta-pagina">Legales</p>
                    <h1 className="titulo-pagina">POLÍTICA DE <em>PRIVACIDAD</em></h1>
                    <p className="legales-vigencia">Vigente desde: {D.vigencia}</p>
                </header>
                <div className="legales-texto">
                    <TextoPrivacidad />
                </div>
            </article>
        </div>
    );
}
