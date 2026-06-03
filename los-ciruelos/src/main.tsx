import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from './pages/Login/Login';
import './globals.css'
import AuthLayout from './layouts/AuthLayout';
import Prueba from './pages/Login/Prueba';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/prueba" element={<Prueba />} />

        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)