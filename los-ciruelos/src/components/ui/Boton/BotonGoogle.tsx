import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

interface BotonGoogleProps {
    onSuccess: (credentialResponse: CredentialResponse) => void;
    onError: () => void;
    texto?: string;
}

export default function BotonGoogle({ onSuccess, onError, texto = "Continuar con Google" }: BotonGoogleProps) {
    return (
        <GoogleLogin
            onSuccess={onSuccess}
            onError={onError}
            theme="filled_black"
            shape="rectangular"
            size="large"
            width="400"
            text="continue_with"
        />
    );
}