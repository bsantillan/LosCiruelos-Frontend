import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
    const { usuario } = useAuth();

    useEffect(() => {
        if (!usuario?.perfilCompleto) {
            console.log("Perfil Incompleto: " + usuario?.perfilCompleto)
        } else {
            console.log("Perfil Completo: " + usuario?.perfilCompleto)
        };
    }, []);
    return (
        <span className="badge-sistema__punto"></span>
    );
}