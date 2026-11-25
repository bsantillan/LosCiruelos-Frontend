import { DATOS_LEGALES as D } from "../../config/legales";

/** Términos y condiciones de uso del sitio y de las reservas: el texto, que se muestra en su página y en el modal */
export default function TextoTerminos() {
    return (
        <>
            <section>
                <h2>1. Quiénes somos</h2>
                <p>
                    Este sitio es de <strong>{D.nombre}</strong>, cuyo titular es {D.titular} (CUIT {D.cuit}), con domicilio
                    en {D.domicilio}. Para cualquier consulta escribinos a {D.email} o acercate al club.
                </p>
            </section>

            <section>
                <h2>2. Aceptación</h2>
                <p>
                    Al crear una cuenta, iniciar sesión (también con Google) o reservar, aceptás estos términos y
                    la Política de privacidad. Si no estás de acuerdo, no uses el sitio:
                    podés reservar comunicándote con el club.
                </p>
            </section>

            <section>
                <h2>3. Tu cuenta</h2>
                <ul>
                    <li>La cuenta es personal. Los datos que cargás tienen que ser verdaderos y estar actualizados.</li>
                    <li>Cuidá tu contraseña: lo que se haga con tu cuenta se considera hecho por vos. Si sospechás que alguien la usa, cambiala y avisanos.</li>
                    <li>Para reservar necesitás completar tu perfil: nombre, apellido, celular, categoría y posición. El club puede pedirte que verifiques el celular con un código.</li>
                    <li>Si sos menor de 18 años, necesitás la autorización de tu madre, padre o tutor para usar el sitio.</li>
                </ul>
            </section>

            <section>
                <h2>4. Reservas y pagos</h2>
                <ul>
                    <li>Las reservas dependen de la disponibilidad de las canchas. Podés reservar hasta la cantidad de días de anticipación que fija el club, que ves en el calendario.</li>
                    <li>El precio es el vigente al momento de reservar y se muestra antes de confirmar. Si el club cambia los precios, las reservas ya hechas conservan el suyo.</li>
                    <li>Para confirmar una reserva se paga la seña o el total, online con Mercado Pago o en el club con los medios que acepte. Una reserva sin pagar se libera sola a los pocos minutos (el plazo se muestra en pantalla) o al empezar el turno, lo que pase primero.</li>
                    <li>Lo que falte pagar se abona en el club antes o después de jugar, con los medios disponibles.</li>
                    <li>Los pagos online los procesa Mercado Pago, con sus propios términos. El club no ve ni guarda los datos de tu tarjeta.</li>
                </ul>
            </section>

            <section>
                <h2>5. Cancelaciones y devoluciones</h2>
                <ul>
                    <li>Podés cancelar tu reserva desde <strong>Mis reservas</strong> hasta que empiece el turno.</li>
                    <li>Lo que se te devuelve depende de con cuánta anticipación cancelás: con más anticipación se devuelve todo lo pagado; con menos, solo la seña; y sobre la hora, nada. Los plazos vigentes se muestran antes de confirmar la reserva y en el detalle de cada reserva, y son los que rigen para esa reserva.</li>
                    <li>Lo pagado online se devuelve por Mercado Pago al mismo medio de pago; el tiempo en que lo ves depende de Mercado Pago y de tu banco. Lo pagado en el club se devuelve en el club.</li>
                    <li>Si el club cancela tu reserva (por ejemplo, por un cierre o un problema en la cancha), te avisamos por mail o WhatsApp y te devolvemos lo que pagaste.</li>
                </ul>
            </section>

            <section>
                <h2>6. Cambios en el servicio</h2>
                <p>
                    El club puede cambiar precios, horarios y días de apertura, cerrar días puntuales o pausar por un tiempo
                    las reservas online (en ese caso se reserva comunicándose con el club). Esos cambios no afectan las
                    reservas ya hechas, salvo un cierre: si cae en un día que reservaste, se cancela con aviso y devolución.
                </p>
            </section>

            <section>
                <h2>7. Avisos</h2>
                <p>
                    Te avisamos sobre tus reservas por mail o, si elegís WhatsApp y verificás tu celular, por WhatsApp.
                    Las cancelaciones se avisan siempre. Los recordatorios y las novedades o promociones son opcionales:
                    los elegís en tu perfil y los podés desactivar cuando quieras.
                </p>
            </section>

            <section>
                <h2>8. Uso de las instalaciones</h2>
                <ul>
                    <li>Respetá el horario reservado: el turno empieza y termina a la hora indicada, aunque llegues tarde.</li>
                    <li>Cuidá las canchas, el equipamiento que alquiles y las instalaciones, y respetá a los demás jugadores y al personal. Los daños causados a propósito o por descuido se cobran.</li>
                    <li>La práctica deportiva implica un esfuerzo físico: jugás bajo tu responsabilidad y declarás estar en condiciones de hacerlo.</li>
                    <li>El club cuenta con un servicio de emergencias médicas (área protegida) de <strong>{D.servicioSalud}</strong>: ante una urgencia dentro del club, avisale al personal, que da aviso al servicio.</li>
                    <li>El club no se hace cargo de los objetos personales que se olviden o se dejen sin cuidado.</li>
                </ul>
            </section>

            <section>
                <h2>9. Suspensión de cuentas</h2>
                <p>
                    El club puede suspender o dar de baja una cuenta que use datos falsos, haga reservas que no se usan de
                    manera reiterada, intente perjudicar al sitio o no respete estos términos. Las reservas pagadas de una
                    cuenta suspendida se resuelven según la sección 5.
                </p>
            </section>

            <section>
                <h2>10. Cambios en estos términos</h2>
                <p>
                    Podemos actualizar estos términos. La versión vigente es siempre la publicada en el sitio, con su
                    fecha. Si el cambio es importante, te avisamos por mail. Las reservas ya hechas se rigen por los
                    términos vigentes al momento de reservar.
                </p>
            </section>

            <section>
                <h2>11. Ley aplicable</h2>
                <p>
                    Estos términos se rigen por las leyes de la República Argentina, incluida la Ley 24.240 de Defensa del
                    Consumidor. Ante cualquier reclamo, escribinos primero a {D.email}: queremos resolverlo. También podés
                    hacer tu reclamo ante la autoridad de defensa del consumidor que corresponda a tu domicilio.
                </p>
            </section>
        </>
    );
}
