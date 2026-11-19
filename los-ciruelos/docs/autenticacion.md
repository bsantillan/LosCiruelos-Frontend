# Autenticación y sesión

## Dónde se guarda la sesión

`utils/sesion.ts` guarda tres claves:

| Clave | Contenido |
|---|---|
| `accessToken` | JWT de 15 minutos que se envía como `Authorization: Bearer …` |
| `refreshToken` | Token para renovar el access token (el backend lo rota en cada uso) |
| `usuario` | JSON `{ id, nombre, apellido, email, perfilCompleto, rol }` |

- Con **Recordarme** tildado se guardan en `localStorage` (la sesión sobrevive al cerrar el navegador).
- Sin tildar se guardan en `sessionStorage` (se borran al cerrar la pestaña o el navegador).

`AuthProvider` ([src/context/AuthContext.tsx](../src/context/AuthContext.tsx)):
- Restaura `usuario` de forma síncrona al arrancar.
- `iniciarSesion(LoginResponse, recordar)`
- `actualizarUsuario(cambios)`: la usa Perfil después de guardar.
- `cerrarSesion()`: llama a `POST /auth/logout` y, aunque falle, limpia la sesión.

Roles: `CLIENTE`, `EMPLEADO`, `ADMIN` y `PROFESOR`.

## Flujos

### Registro y verificación de email
```
/register (3 pasos) ── POST /auth/register ──► /verificar-codigo {email, VERIFY_EMAIL}
   ── POST /auth/verificar-token ──► /login (aviso "cuenta verificada")
   ── POST /auth/resend-token (cooldown 60 s)
```
Si alguien con la cuenta sin verificar intenta loguearse, el backend responde `errors.email_verificado` y se lo manda a `/verificar-codigo`.

### Login con email
```
/login ── POST /auth/login ──► iniciarSesion(respuesta, recordar) ──► /
```

### Login y registro con Google
```
<GoogleLogin> (popup) ──► ID token ── POST /auth/google ──► iniciarSesion ──► /
```
- Disponible en Login ("Continuar con Google") y en Register ("Registrarse con Google").
- Requiere `VITE_GOOGLE_CLIENT_ID` y que el origen esté autorizado en Google Cloud Console.
- El popup necesita el header `Cross-Origin-Opener-Policy: same-origin-allow-popups`. Vite lo envía en `dev` y `preview`; en producción lo tiene que enviar el hosting.

### Recuperar contraseña
```
/olvide-contrasena ── POST /auth/password-reset/request
   └─► /verificar-codigo {email, PASSWORD_RESET} ── POST /auth/verificar-token
          └─► /nueva-contrasena ── PUT /auth/password-reset/confirm {email, nuevaPassword}
                 └─► /login (aviso "contraseña actualizada")
```
El backend solo acepta el `confirm` si el código `PASSWORD_RESET` se verificó antes (`token.verificado`), y después borra el token.

### Refresh de token
```
request ──► 401 ──► ¿hay refreshToken, no es /auth/login|google|refresh y no se reintentó?
   sí ──► un único POST /auth/refresh compartido ──► guarda los tokens ──► reintenta
            └─ falla ──► limpia la sesión ──► /login
   no ──► devuelve el error
```

## Validaciones del cliente

| Campo | Regla |
|---|---|
| Nombre y apellido | 2 a 50 caracteres |
| Email | `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| Teléfono | `^\+?[0-9]{8,15}$` |
| Contraseña | 8 a 30 caracteres, con al menos una mayúscula, una minúscula, un número y un símbolo |
| Código | 6 dígitos |
