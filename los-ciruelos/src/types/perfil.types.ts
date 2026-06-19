export interface PerfilResponse {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    categoria: string | null;
    posicion: string | null;
    categoriaActualizadaAt: string | null;
}

export interface PerfilRequest {
    nombre: string;
    apellido: string;
    telefono: string;
    posicion: string | null;
    categoria: string | null;
}

export interface ErroresPerfil {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    posicion?: string;
    categoria?: string;
    general?: string;
}