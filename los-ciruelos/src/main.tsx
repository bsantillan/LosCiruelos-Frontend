import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from './pages/Login/Login';
import './globals.css'
import AuthLayout from './layouts/AuthLayout/AuthLayout';
import Register from './pages/Register/Register';
import { AuthProvider } from './context/AuthContext';
import VerificarCodigo from './pages/VerificarCodigo/VerificarCodigo';
import OlvideContrasena from './pages/OlvideContrasena/OlvideContrasena';
import NuevaContrasena from './pages/NuevaContrasena/NuevaContrasena';
import { GoogleOAuthProvider } from "@react-oauth/google";
import Home from './pages/Home/Home';
import PublicRoute from './routes/PublicRoute';
import ProtectedRoute from './routes/ProtectedRoute';

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <AuthProvider>
      <BrowserRouter>
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

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>

            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </GoogleOAuthProvider>
)