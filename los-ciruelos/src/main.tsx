import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ENV } from './config/env';
import './globals.css'
import { AuthProvider } from './context/AuthContext';
import { AvisosProvider } from './components/ui/Avisos/Avisos';
import MainLayout from "./layouts/MainLayout";
import AuthLayout from './layouts/AuthLayout/AuthLayout';
import PublicRoute from './routes/PublicRoute';
import ProtectedRoute from './routes/ProtectedRoute';
import Home from './pages/Home/Home';

// El resto de las páginas se descarga recién cuando se visita
// (por ejemplo, el SDK de Mercado Pago solo se carga al entrar al pago).
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const VerificarCodigo = lazy(() => import('./pages/VerificarCodigo/VerificarCodigo'));
const OlvideContrasena = lazy(() => import('./pages/OlvideContrasena/OlvideContrasena'));
const NuevaContrasena = lazy(() => import('./pages/NuevaContrasena/NuevaContrasena'));
const Perfil = lazy(() => import('./pages/Perfil/Perfil'));
const Reservas = lazy(() => import('./pages/Reservas/Reservas'));
const Pago = lazy(() => import('./pages/Pago/Pago'));
const MisReservas = lazy(() => import('./pages/MisReservas/MisReservas'));
const PagoResultado = lazy(() => import('./pages/PagoResultado/PagoResultado'));
// Panel del personal del club
const AdminLayout = lazy(() => import('./layouts/AdminLayout/AdminLayout'));
const AdminResumen = lazy(() => import('./pages/Admin/Resumen'));
const AdminReservas = lazy(() => import('./pages/Admin/ReservasAdmin'));
const AdminVentas = lazy(() => import('./pages/Admin/Ventas'));
const AdminConfiguracion = lazy(() => import('./pages/Admin/Configuracion'));
const AdminUsuarios = lazy(() => import('./pages/Admin/Usuarios'));
const AdminProductos = lazy(() => import('./pages/Admin/Productos'));
const AdminAvisos = lazy(() => import('./pages/Admin/Avisos'));
const AdminCanchas = lazy(() => import('./pages/Admin/Canchas'));
const AdminNovedades = lazy(() => import('./pages/Admin/Novedades'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={ENV.GOOGLE_CLIENT_ID ?? ""}>
      <AuthProvider>
        <BrowserRouter>
          <AvisosProvider>
          <Suspense fallback={<div className="pagina-cargando" aria-busy="true" />}>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verificar-codigo" element={<VerificarCodigo />} />
                  <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
                  <Route path="/nueva-contrasena" element={<NuevaContrasena />} />
                </Route>
              </Route>
  
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
              </Route>
  
              {/* Perfil del sitio: el personal tiene el suyo en el panel (/admin/cuenta) */}
              <Route element={<ProtectedRoute roles={["CLIENTE", "PROFESOR"]} />}>
                <Route element={<MainLayout />}>
                  <Route path="/perfil" element={<Perfil />} />
                </Route>
              </Route>
  
              {/* La disponibilidad la ve cualquiera; con sesión, solo los clientes (el personal reserva desde el panel) */}
              <Route element={<ProtectedRoute roles={["CLIENTE"]} permitirInvitado />}>
                <Route element={<MainLayout />}>
                  <Route path="/reservas" element={<Reservas />} />
                </Route>
              </Route>

              {/* Solo los clientes reservan y pagan desde la web (así lo exige el backend) */}
              <Route element={<ProtectedRoute roles={["CLIENTE"]} />}>
                <Route element={<MainLayout />}>
                  <Route path="/reservas/:id/pago" element={<Pago />} />
                  <Route path="/mis-reservas" element={<MisReservas />} />
                  {/* Vuelta de Mercado Pago: además exige venir de MP (ver PagoResultado) */}
                  <Route path="/pago/resultado" element={<PagoResultado />} />
                </Route>
              </Route>

              {/* Panel del personal del club: sidebar propio, sin la barra ni el footer del sitio */}
              <Route element={<ProtectedRoute roles={["ADMIN", "EMPLEADO"]} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminResumen />} />
                  <Route path="reservas" element={<AdminReservas />} />
                  {/* Crear y editar reservas, partidos y turnos fijos es un popup dentro de Reservas */}
                  <Route path="nueva/*" element={<Navigate to="/admin/reservas" replace />} />
                  <Route path="reservas/:tipo/:id" element={<Navigate to="/admin/reservas" replace />} />
                  <Route path="ventas" element={<AdminVentas />} />
                  <Route path="productos" element={<AdminProductos />} />
                  <Route path="cuenta" element={<Perfil enPanel />} />
                  <Route path="avisos" element={<AdminAvisos />} />
                  {/* El EMPLEADO ve los usuarios en modo lectura */}
                  <Route path="usuarios" element={<AdminUsuarios />} />
                  <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                    <Route path="configuracion" element={<AdminConfiguracion />} />
                    <Route path="canchas" element={<AdminCanchas />} />
                    <Route path="novedades" element={<AdminNovedades />} />
                  </Route>
                  {/* Partidos y turnos fijos son pestañas de Reservas; la nueva reserva es un asistente */}
                  <Route path="partidos" element={<Navigate to="/admin/reservas?tipo=partido" replace />} />
                  <Route path="turnos-fijos" element={<Navigate to="/admin/reservas?tipo=turnos-fijos" replace />} />
                  <Route path="reservar" element={<Navigate to="/admin/reservas" replace />} />
                  {/* La devolución de paletas se registra desde el detalle de la reserva */}
                  <Route path="devoluciones" element={<Navigate to="/admin/reservas" replace />} />
                  {/* "Saldos pendientes" ahora es el filtro "Por cobrar" de Reservas */}
                  <Route path="saldos" element={<Navigate to="/admin/reservas?filtro=por-cobrar" replace />} />
                </Route>
                <Route path="/saldos-pendientes" element={<Navigate to="/admin/reservas?filtro=por-cobrar" replace />} />
              </Route>
  
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </AvisosProvider>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
