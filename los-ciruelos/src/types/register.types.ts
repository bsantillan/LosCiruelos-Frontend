export interface RegisterRequest {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono: string;
    categoria: string;
    posicion: string;
    termsAccepted: boolean;
    /** Obligatorio en true: "Acepto recibir notificaciones del club" (arrancan por mail) */
    aceptarNotificacion: boolean;
}