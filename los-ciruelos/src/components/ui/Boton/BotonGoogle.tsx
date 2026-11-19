import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

interface BotonGoogleProps {
    onSuccess: (credentialResponse: CredentialResponse) => void;
    onError: () => void;
    /** Texto que muestra Google en el botón */
    texto?: "continue_with" | "signup_with" | "signin_with";
}

// Google acepta anchos de 200 a 400 px
const ANCHO_MIN = 200;
const ANCHO_MAX = 400;

export default function BotonGoogle({ onSuccess, onError, texto = "continue_with" }: BotonGoogleProps) {
    // Google dibuja el botón en un iframe de ancho fijo: se le pasa el ancho disponible
    // para que en el celular no se salga del formulario
    const contenedor = useRef<HTMLDivElement>(null);
    const [ancho, setAncho] = useState(ANCHO_MAX);

    useEffect(() => {
        const el = contenedor.current;
        if (!el) return;
        const medir = () => {
            const disponible = Math.floor(el.clientWidth);
            setAncho(Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, disponible)));
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(el);
        return () => observador.disconnect();
    }, []);

    return (
        <div className="boton-google" ref={contenedor}>
            <GoogleLogin
                key={ancho}
                onSuccess={onSuccess}
                onError={onError}
                theme="filled_black"
                shape="rectangular"
                size="large"
                width={String(ancho)}
                text={texto}
            />
        </div>
    );
}
