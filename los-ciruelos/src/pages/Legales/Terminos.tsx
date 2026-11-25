import TextoTerminos from "../../components/Legales/TextoTerminos";
import { DATOS_LEGALES as D } from "../../config/legales";
import "../../components/Legales/Legales.css";

/** Términos y condiciones (público: /terminos). Es la URL que piden Google y Meta; en el sitio se abren en un modal */
export default function Terminos() {
    return (
        <div className="legales-pagina">
            <article className="legales-pagina__contenedor">
                <header>
                    <p className="etiqueta-pagina">Legales</p>
                    <h1 className="titulo-pagina">TÉRMINOS Y <em>CONDICIONES</em></h1>
                    <p className="legales-vigencia">Vigente desde: {D.vigencia}</p>
                </header>
                <div className="legales-texto">
                    <TextoTerminos />
                </div>
            </article>
        </div>
    );
}
