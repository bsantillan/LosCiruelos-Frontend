import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Wallet } from "@mercadopago/sdk-react";

interface BotonMercadoPagoProps {
    /** paymentToken del pago iniciado (id de la preferencia de Mercado Pago) */
    preferenceId: string;
    /** Se llama cuando el usuario hace clic en el botón (Mercado Pago se abre en otra pestaña) */
    onAbrir: () => void;
}

const ID_CONTENEDOR = "walletBrick_container";

/*
 * Wallet Brick: botón "Pagar con Mercado Pago". Abre Mercado Pago en una pestaña
 * nueva (o la app en el celular) con redirectMode "blank"; esta pestaña queda abierta
 * y se entera del resultado consultando la reserva (el backend recibe el webhook).
 * Mercado Pago discontinuó el modo modal en 2023: no hay forma oficial de abrirlo en un popup.
 *
 * Con preferenceId el Wallet no acepta onSubmit, y el botón vive dentro de un iframe
 * (los clics no llegan a esta página). El clic se detecta porque la ventana pierde el
 * foco hacia ese iframe, o porque la pestaña queda oculta al abrirse la nueva.
 */
function BotonMercadoPago({ preferenceId, onAbrir }: BotonMercadoPagoProps) {
    const [listo, setListo] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const onAbrirRef = useRef(onAbrir);
    useEffect(() => { onAbrirRef.current = onAbrir; }, [onAbrir]);

    const initialization = useMemo(() => ({ preferenceId, redirectMode: "blank" as const }), [preferenceId]);
    const onReady = useCallback(() => setListo(true), []);
    const onError = useCallback((error: unknown) => console.error("Mercado Pago Wallet Brick:", error), []);

    useEffect(() => {
        if (!listo) return;
        const alPerderFoco = () => {
            // el foco pasa al iframe recién después del evento blur
            setTimeout(() => {
                const activo = document.activeElement;
                if (activo?.tagName === "IFRAME" && contenedorRef.current?.contains(activo)) onAbrirRef.current();
            }, 0);
        };
        const alOcultarse = () => {
            if (document.visibilityState === "hidden" && contenedorRef.current?.contains(document.activeElement)) {
                onAbrirRef.current();
            }
        };
        window.addEventListener("blur", alPerderFoco);
        document.addEventListener("visibilitychange", alOcultarse);
        return () => {
            window.removeEventListener("blur", alPerderFoco);
            document.removeEventListener("visibilitychange", alOcultarse);
        };
    }, [listo]);

    return (
        // Por si el SDK renderiza el botón fuera de un iframe, también se escucha el clic directo
        <div className="pago-wallet" ref={contenedorRef} onClickCapture={() => onAbrirRef.current()}>
            {!listo && <div className="pago-wallet__placeholder" aria-hidden="true" />}
            <Wallet id={ID_CONTENEDOR} initialization={initialization} onReady={onReady} onError={onError} />
        </div>
    );
}

export default memo(BotonMercadoPago);
