/**
 * Los datos del responsable que aparecen en los Términos y en la Política de privacidad. Antes de salir
 * a producción hay que reemplazar los "[COMPLETAR …]" con los datos reales del titular del club.
 */
export const DATOS_LEGALES = {
    /** Nombre comercial */
    nombre: "Los Ciruelos Pádel",
    /** Persona humana o jurídica titular del club (como figura en ARCA/AFIP) */
    titular: "[COMPLETAR: nombre o razón social del titular]",
    cuit: "[COMPLETAR: CUIT]",
    domicilio: "Calle 34 e/ 25 y 26 Nº 1527, La Plata, provincia de Buenos Aires",
    /** Mail donde se reciben las consultas y los pedidos sobre datos personales */
    email: "[COMPLETAR: mail de contacto del club]",
    /** Servicio de emergencias médicas (área protegida) que cubre el club */
    servicioSalud: "[COMPLETAR: nombre del servicio de emergencias médicas]",
    /** Cuándo empiezan a regir estos textos (la fecha en que se publican) */
    vigencia: "[COMPLETAR: fecha de publicación]",
} as const;
