import { createBrowserRouter, Navigate } from "react-router";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Inventario } from "./pages/Inventario";
import { Servicios } from "./pages/Servicios";
import { Ventas } from "./pages/Ventas";
import { Gastos } from "./pages/Gastos";
import { Database } from "./pages/Database";
import { Perfil } from "./pages/Perfil";
import { Trabajadores } from "./pages/Trabajadores";
import { Promociones } from "./pages/Promociones";
import { Ofertas } from "./pages/Ofertas";
import { RecoverAccount } from "./pages/RecoverAccount";
import { Suscripcion } from "./pages/Suscripcion";
import { AdminPanel } from "./pages/AdminPanel";
import { Produccion } from "./pages/Produccion";
import * as React from "react";

// Helper to check if user is authenticated
const isAuthenticated = () => {
  return sessionStorage.getItem('currentUser') !== null;
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const role = currentUser.rol || 'jefe';
  
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'trabajador') {
      return <Navigate to="/ventas" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: "/recover",
    element: (
      <PublicRoute>
        <RecoverAccount />
      </PublicRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/inventario",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Inventario />
      </ProtectedRoute>
    ),
  },
  {
    path: "/servicios",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Servicios />
      </ProtectedRoute>
    ),
  },
  {
    path: "/produccion",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Produccion />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ventas",
    element: (
      <ProtectedRoute>
        <Ventas />
      </ProtectedRoute>
    ),
  },
  {
    path: "/gastos",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Gastos />
      </ProtectedRoute>
    ),
  },
  {
    path: "/database",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Database />
      </ProtectedRoute>
    ),
  },
  {
    path: "/perfil",
    element: (
      <ProtectedRoute>
        <Perfil />
      </ProtectedRoute>
    ),
  },
  {
    path: "/trabajadores",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Trabajadores />
      </ProtectedRoute>
    ),
  },
  {
    path: "/promociones",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Promociones />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ofertas",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe', 'subjefe']}>
        <Ofertas />
      </ProtectedRoute>
    ),
  },
  {
    path: "/suscripcion",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'jefe']}>
        <Suscripcion />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin-panel",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminPanel />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);