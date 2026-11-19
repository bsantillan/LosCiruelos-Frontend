import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardPayment } from "@mercadopago/sdk-react";
import { AlertCircle } from "lucide-react";
import type { DatosTarjetaMP } from "../../types/reserva.types";

interface BrickTarjetaProps {
    monto: number;
    email?: string;
    /** Cobra con el token. Si rechaza, el Brick queda habilitado para corregir los datos. */
    onPagar: (datos: DatosTarjetaMP) => Promise<void>;
}

/*
 * Card Payment Brick de Mercado Pago: un solo formulario para tarjetas de crédito y
 * débito (detecta el tipo por el número). Se prefiere al Payment Brick, que las muestra
 * como dos opciones separadas. Pagar con la cuenta de Mercado Pago va por BotonMercadoPago.
 *
 * <CardPayment> desmonta y vuelve a crear el formulario cada vez que cambia
 * cualquiera de sus props (initialization, customization u onReady/onSubmit/onError).
 * Por eso todas son estables y el componente está memorizado: la página de pago se
 * vuelve a renderizar cada segundo por la cuenta regresiva.
 */
function BrickTarjeta({ monto, email, onPagar }: BrickTarjetaProps) {
    const [listo, setListo] = useState(false);
    const [errorCritico, setErrorCritico] = useState<string | null>(null);
    const [intento, setIntento] = useState(0);

    // Siempre la última versión de onPagar, sin cambiar la identidad del callback
    const onPagarRef = useRef(onPagar);
    useEffect(() => { onPagarRef.current = onPagar; }, [onPagar]);

    const initialization = useMemo(() => ({ amount: monto, payer: { email } }), [monto, email]);
    const customization = useMemo(() => ({
        visual: {
            hideFormTitle: true,
            style: { theme: "dark" as const, customVariables: { baseColor: "#8fd400" } },
        },
    }), []);

    const onReady = useCallback(() => setListo(true), []);
    const onSubmit = useCallback(
        (datos: unknown) => onPagarRef.current(datos as DatosTarjetaMP),
        []
    );
    const onError = useCallback((error: { type: string; message?: string; cause?: string }) => {
        console.error("Mercado Pago Card Payment Brick:", error);
        // Los errores no críticos (por ejemplo, un campo mal cargado) los muestra el propio Brick
        if (error.type === "critical") {
            setErrorCritico("No se pudo cargar el formulario de pago de Mercado Pago.");
        }
    }, []);

    const reintentar = () => {
        setErrorCritico(null);
        setListo(false);
        setIntento(i => i + 1);
    };

    if (errorCritico) {
        return (
            <div className="pago-error" role="alert">
                <AlertCircle size={15} />
                <span>{errorCritico}</span>
                <button type="button" className="accion accion--chica" onClick={reintentar}>Reintentar</button>
            </div>
        );
    }

    return (
        <div className="pago-brick">
            {!listo && (
                <div className="pago-cargando">
                    <div className="reservas-cargando__spinner" />
                    <span>Cargando formulario seguro...</span>
                </div>
            )}
            <CardPayment
                key={intento}
                initialization={initialization}
                customization={customization}
                onReady={onReady}
                onSubmit={onSubmit}
                onError={onError}
            />
        </div>
    );
}

export default memo(BrickTarjeta);
