import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { reservaService } from "../../services/reservaService";
import type { ReservaResponse } from "../../types/reserva.types";
import { estadoHttp } from "../../utils/apiErrors";
import { formatFecha, formatMonto, horaCorta } from "../../utils/fechas";
import { pagoDeMercadoPago, resultadoDePago, tituloPagoAprobado, type ResultadoPago } from "../../utils/reservas";
import { borrarPagoEnMercadoPago, esRetornoValido, obtenerPagoEnMercadoPago } from "../../utils/retornoMercadoPago";
import "../Reservas/Reservas.css";
import "../Pago/Pago.css";

/*
 * Página a la que vuelve la pestaña de Mercado Pago (back_urls de la preferencia):
 *   /pago/resultado?reservaId=…&resultado=aprobado|rechazado|pendiente&payment_id=…&preference_id=…
 *
 * Solo se puede entrar con sesión (ProtectedRoute, rol CLIENTE) y volviendo de Mercado Pago:
 * la URL tiene que traer el preference_id que esta app abrió para esa reserva
 * (utils/retornoMercadoPago). Escribir la URL a mano redirige al inicio.
 *
 * El parámetro `resultado` NO se usa para decidir nada: cualquiera puede escribirlo en la URL.
 * La fuente de verdad es GET /reservas/:id, que el backend actualiza al recibir el webhook
 * (puede tardar unos segundos), así que se consulta hasta que el pago tenga resultado.
 */
const INTERVALO_MS = 3500;
const MAX_ESPERA_MS = 2 * 60 * 1000;

type Vista =
    | { tipo: "cargando" }
    | { tipo: "no_encontrada" }
    | { tipo: "resultado"; resultado: ResultadoPago; reserva: ReservaResponse; agotado: boolean };

export default function PagoResultado() {
    const [params] = useSearchParams();
    // Se valida una sola vez al entrar: después la marca se borra
    const [retornoValido] = useState(() => esRetornoValido(params, obtenerPagoEnMercadoPago()));
    const reservaId = params.get("reservaId");
    const paymentId = params.get("payment_id") ?? params.get("collection_id");
    const [vista, setVista] = useState<Vista>({ tipo: "cargando" });

    useEffect(() => {
        if (!retornoValido || !reservaId) return;
        let activo = true;
        const desde = Date.now();
        let timer: ReturnType<typeof setTimeout> | undefined;

        const consultar = async () => {
            try {
                const r = await reservaService.obtener(reservaId);
                if (!activo) return;
                const resultado = resultadoDePago(pagoDeMercadoPago(r, paymentId));
                const agotado = Date.now() - desde > MAX_ESPERA_MS;
                setVista({ tipo: "resultado", resultado, reserva: r, agotado });
                if (resultado === "pendiente" && !agotado) timer = setTimeout(consultar, INTERVALO_MS);
                else borrarPagoEnMercadoPago(); // ya hay resultado: la URL deja de servir
            } catch (e) {
                if (!activo) return;
                if (estadoHttp(e) === 404) setVista({ tipo: "no_encontrada" });
                else timer = setTimeout(consultar, INTERVALO_MS); // error de red: reintentar
            }
        };
        void consultar();
        return () => { activo = false; clearTimeout(timer); };
    }, [retornoValido, reservaId, paymentId]);

    if (!retornoValido) return <Navigate to="/" replace />;

    return (
        <div className="pago-pagina">
            <div className="pago-contenedor pago-contenedor--centrado">
                <section className="pago-panel" aria-live="polite">
                    <Contenido vista={vista} reservaId={reservaId} />
                </section>
            </div>
        </div>
    );
}

function Contenido({ vista, reservaId }: { vista: Vista; reservaId: string | null }) {
    switch (vista.tipo) {
        case "cargando":
            return (
                <div className="pago-cargando">
                    <div className="reservas-cargando__spinner" />
                    <span>Confirmando el pago con Mercado Pago...</span>
                </div>
            );

        case "no_encontrada":
            return (
                <Estado icono={<AlertCircle size={28} />} variante="error" titulo="No encontramos la reserva">
                    <p className="pago-estado__texto">Revisá el estado de tus pagos en Mis reservas.</p>
                    <Link to="/mis-reservas" className="accion accion--primaria">Ir a mis reservas</Link>
                </Estado>
            );

        case "resultado": {
            const { reserva, resultado, agotado } = vista;
            const turno = `Cancha ${reserva.canchaNumero}, ${formatFecha(reserva.fechaReserva)} de ${horaCorta(reserva.horaInicio)} a ${horaCorta(reserva.horaFin)} hs.`;
            const pendiente = Number(reserva.montoPendiente);

            if (resultado === "aprobado") {
                return (
                    <Estado icono={<CheckCircle2 size={28} />} variante="exito" titulo={tituloPagoAprobado(reserva.estado)}>
                        <p className="pago-estado__texto">
                            {turno}{" "}
                            {pendiente > 0
                                ? <>Te queda abonar <strong>{formatMonto(pendiente)}</strong> en el club.</>
                                : "El turno está pago en su totalidad."}
                        </p>
                        <p className="pago-estado__texto">Ya podés cerrar esta pestaña.</p>
                        <Link to="/mis-reservas" className="accion accion--primaria">Ver mis reservas</Link>
                    </Estado>
                );
            }
            if (resultado === "a_reembolsar") {
                return (
                    <Estado icono={<AlertCircle size={28} />} variante="error" titulo="Recibimos el pago, pero la reserva ya no estaba activa">
                        <p className="pago-estado__texto">
                            El pago llegó cuando la reserva ya había vencido o se había cancelado. El club te va a
                            devolver el dinero; si tenés dudas, contactanos.
                        </p>
                        <Link to="/reservas" className="accion accion--primaria">Elegir otro turno</Link>
                    </Estado>
                );
            }
            if (resultado === "rechazado") {
                return (
                    <Estado icono={<XCircle size={28} />} variante="error" titulo="El pago no se pudo completar">
                        <p className="pago-estado__texto">
                            No se realizó ningún cobro. {reserva.estado === "PENDIENTE" && "Podés intentarlo de nuevo mientras el turno siga reservado."}
                        </p>
                        {reserva.estado === "PENDIENTE" || reserva.estado === "SEÑADA" || reserva.estado === "PARCIALMENTE_PAGADA"
                            ? <Link to={`/reservas/${reservaId}/pago`} className="accion accion--primaria">Volver a intentar</Link>
                            : <Link to="/reservas" className="accion accion--primaria">Elegir otro turno</Link>}
                    </Estado>
                );
            }
            return (
                <Estado icono={<Hourglass size={28} />} variante="info" titulo={agotado ? "Mercado Pago todavía está procesando el pago" : "Confirmando el pago..."}>
                    <p className="pago-estado__texto">
                        {agotado
                            ? "La confirmación puede demorar. Vas a ver el resultado en Mis reservas."
                            : "Estamos esperando la confirmación de Mercado Pago. Esto puede tardar unos segundos."}
                    </p>
                    {agotado
                        ? <Link to="/mis-reservas" className="accion accion--primaria">Ir a mis reservas</Link>
                        : <div className="reservas-cargando__spinner" />}
                </Estado>
            );
        }
    }
}

function Estado({ icono, variante, titulo, children }: {
    icono: React.ReactNode;
    variante: "exito" | "info" | "error";
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div className="pago-estado">
            <div className={`pago-estado__icono pago-estado__icono--${variante}`}>{icono}</div>
            <h1 className="pago-estado__titulo">{titulo}</h1>
            {children}
        </div>
    );
}
