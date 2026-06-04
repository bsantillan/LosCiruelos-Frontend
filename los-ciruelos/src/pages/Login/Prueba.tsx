import { useState } from "react";
import { Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { ArrowRight, Trash } from "lucide-react";
import CampoInput from "../../components/ui/CampoInput/CampoInput";
import CampoSelect from "../../components/ui/CampoSelect/CampoSelect";
import CampoToggle from "../../components/ui/CampoToggle/CampoToggle";
import Boton from "../../components/ui/Boton/Boton";

export default function Prueba() {
    const [email, setEmail] = useState("");
    const [precio, setPrecio] = useState("");
    const [edad, setEdad] = useState("");
    const [categoria, setCategoria] = useState("");
    const [activo, setActivo] = useState(false);
    const [notificaciones, setNotificaciones] = useState(true);

    return (
        <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>

            <CampoInput
                id="email" name="email" label="Correo electrónico"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vos@email.com"
                icono={<Mail size={16} />}
            />

            <CampoInput
                id="precio" name="precio" label="Precio por hora"
                type="number" value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0" prefijo="$" sufijo="ARS" min={0} paso={100}
            />

            <CampoInput
                id="edad" name="edad" label="Edad"
                type="number" value={edad}
                onChange={e => setEdad(e.target.value)}
                placeholder="0" min={0} max={99} paso={1} entero
            />

            <CampoSelect
                id="categoria"
                name="categoria"
                label="Categoría"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as string)}
                placeholder="Seleccioná una categoría"
                opciones={[
                    { valor: "primera", etiqueta: "Primera" },
                    { valor: "segunda", etiqueta: "Segunda" },
                    { valor: "tercera", etiqueta: "Tercera" },
                ]}
            />

            <CampoToggle
                id="activo" name="activo" label="Socio activo"
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
            />

            <CampoToggle
                id="notificaciones" name="notificaciones" label="Notificaciones"
                descripcion="Recibir alertas de reservas y torneos"
                checked={notificaciones}
                onChange={e => setNotificaciones(e.target.checked)}
            />

            <Boton variante="primario">
                <span>Guardar</span>
                <ArrowRight size={17} />
            </Boton>

            <Boton variante="secundario">
                <FcGoogle size={18} />
                Continuar con Google
            </Boton>

            <Boton variante="fantasma">
                <Trash size={16} />
                Eliminar
            </Boton>

        </div>
    );
}