import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from './pages/Login/Login';
import './globals.css'
import AuthLayout from './layouts/AuthLayout';
import Register from './pages/Register/Register';
import { AuthProvider } from './context/AuthContext';
import VerificarCodigo from './pages/VerificarCodigo/VerificarCodigo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verificar-codigo" element={<VerificarCodigo />} />

          </Route>

          <Route element={<MainLayout />}>

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)