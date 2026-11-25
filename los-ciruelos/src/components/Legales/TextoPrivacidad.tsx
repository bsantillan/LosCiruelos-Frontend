import { DATOS_LEGALES as D } from "../../config/legales";

/** Política de privacidad (Ley 25.326 de Protección de Datos Personales): el texto, que se muestra en su página y en el modal */
export default function TextoPrivacidad() {
    return (
        <>
            <section>
                <h2>1. Quién es el responsable de tus datos</h2>
                <p>
                    El responsable de la base de datos es {D.titular} (CUIT {D.cuit}), titular de <strong>{D.nombre}</strong>,
                    con domicilio en {D.domicilio}. Para cualquier consulta sobre tus datos escribinos a {D.email}.
                </p>
            </section>

            <section>
                <h2>2. Qué datos guardamos</h2>
                <ul>
                    <li><strong>Tu cuenta:</strong> nombre, apellido, mail y contraseña. La contraseña se guarda cifrada: nadie del club la puede ver. Si entrás con Google, recibimos tu nombre y tu mail; no tenemos acceso a tu cuenta de Google.</li>
                    <li><strong>Tu perfil de jugador:</strong> celular, categoría y posición de juego, y cómo preferís recibir los avisos.</li>
                    <li><strong>Tus reservas y pagos:</strong> canchas, días, horarios, productos, montos, medio de pago y estado. Los datos de tu tarjeta los procesa Mercado Pago: el club no los ve ni los guarda.</li>
                    <li><strong>Los avisos que te mandamos</strong> (por mail o WhatsApp) y los códigos de verificación.</li>
                    <li><strong>Datos técnicos:</strong> registros de acceso (por ejemplo, la dirección IP) que usamos solo por seguridad, para frenar abusos.</li>
                </ul>
                <p>
                    El sitio no usa cookies de publicidad ni herramientas de analítica. Tu navegador guarda tu sesión y el
                    turno que estabas eligiendo, solo para que no tengas que volver a empezar. Mercado Pago y Google usan
                    sus propias cookies cuando pagás o entrás con Google.
                </p>
            </section>

            <section>
                <h2>3. Para qué los usamos</h2>
                <ul>
                    <li>Crear y administrar tu cuenta y tus reservas.</li>
                    <li>Cobrar, devolver lo que corresponda y llevar la caja del club.</li>
                    <li>Avisarte sobre tus reservas: confirmaciones, recordatorios y cancelaciones.</li>
                    <li>Mandarte novedades y promociones del club, solo si lo aceptás en tu perfil.</li>
                    <li>Cuidar la seguridad del sitio y cumplir las obligaciones legales, contables y fiscales del club.</li>
                </ul>
                <p>No vendemos ni alquilamos tus datos, y no los usamos para nada distinto de lo que dice esta política.</p>
            </section>

            <section>
                <h2>4. Con quién los compartimos</h2>
                <p>Solo con quienes nos ayudan a prestar el servicio, y solo lo necesario:</p>
                <ul>
                    <li><strong>El personal del club</strong>, para gestionar tus reservas y cobros.</li>
                    <li><strong>Mercado Pago</strong>, para procesar los pagos y las devoluciones.</li>
                    <li><strong>Meta (WhatsApp)</strong>, para mandarte los avisos y el código de verificación si elegís WhatsApp.</li>
                    <li><strong>Google</strong>, si entrás con tu cuenta de Google, y para el envío de los mails.</li>
                    <li><strong>El proveedor del servidor</strong> donde funciona el sitio, que guarda los datos por cuenta del club.</li>
                    <li>Las autoridades, cuando una ley o una orden judicial lo exija.</li>
                </ul>
                <p>
                    Algunos de estos proveedores guardan los datos en servidores fuera de la Argentina. En esos casos el club
                    les exige un nivel de protección adecuado, como pide la ley.
                </p>
            </section>

            <section>
                <h2>5. Cuánto tiempo los guardamos</h2>
                <p>
                    Mientras tengas tu cuenta. Si pedís darla de baja, borramos o anonimizamos tus datos, salvo los de pagos y
                    reservas que la ley nos obliga a conservar (por ejemplo, por razones contables o fiscales), que se
                    guardan solo por el plazo que corresponde.
                </p>
            </section>

            <section>
                <h2>6. Tus derechos</h2>
                <p>
                    Podés pedir <strong>acceder</strong> a tus datos, <strong>corregirlos</strong>, <strong>actualizarlos</strong> o
                    que los <strong>borremos</strong>, y retirar tu consentimiento para las promociones en cualquier momento.
                    Muchos datos los cambiás vos desde tu perfil; para el resto, escribinos a {D.email} desde el mail de tu
                    cuenta. Respondemos en los plazos de la Ley 25.326: 10 días corridos para el acceso y 5 días hábiles
                    para corregir o borrar.
                </p>
                <p className="legales-recuadro">
                    El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en
                    forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al
                    efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A
                    LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de
                    atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por
                    incumplimiento de las normas vigentes en materia de protección de datos personales.
                </p>
            </section>

            <section>
                <h2>7. Cómo los cuidamos</h2>
                <p>
                    El sitio funciona con conexión cifrada (HTTPS), las contraseñas se guardan cifradas, cada persona del club
                    accede solo a lo que necesita para su tarea y hacemos copias de seguridad. Ningún sistema es infalible:
                    si detectamos un problema que afecte tus datos, te avisamos.
                </p>
            </section>

            <section>
                <h2>8. Menores de edad</h2>
                <p>
                    Si sos menor de 18 años, necesitás la autorización de tu madre, padre o tutor para crear una cuenta. Si
                    un adulto responsable cree que un menor nos dio datos sin autorización, puede escribirnos para borrarlos.
                </p>
            </section>

            <section>
                <h2>9. Cambios en esta política</h2>
                <p>
                    Si cambiamos esta política, publicamos la versión nueva en el sitio con su fecha y, si el cambio es
                    importante, te avisamos por mail.
                </p>
            </section>
        </>
    );
}
