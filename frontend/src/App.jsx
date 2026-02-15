/**
 * App.jsx — Main application with React Router.
 *
 * Uses BrowserRouter with lazy-loaded route components.
 * Layout wraps all routes with sidebar navigation.
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { DialogProvider } from './context/DialogContext';

// Lazy-loaded page components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Ventas = lazy(() => import('./components/Ventas'));
const Stock = lazy(() => import('./components/Stock'));
const Reportes = lazy(() => import('./components/Reportes'));
const Historial = lazy(() => import('./components/Historial'));
const Configuracion = lazy(() => import('./components/Configuracion'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <span className="material-icons text-4xl animate-spin text-txt-dim">autorenew</span>
  </div>
);

function App() {
  return (
    <DialogProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/inventario" element={<Stock />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/movimientos" element={<Historial />} />
              <Route path="/ajustes" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </DialogProvider>
  );
}

export default App;
