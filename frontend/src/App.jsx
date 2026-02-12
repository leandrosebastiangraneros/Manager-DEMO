import React, { Suspense, lazy, useState } from 'react';
import Layout from './components/Layout';
import { DialogProvider } from './context/DialogContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy-loaded route components — only loaded when the tab is activated
const Dashboard = lazy(() => import('./components/Dashboard'));
const Ventas = lazy(() => import('./components/Ventas'));
const Stock = lazy(() => import('./components/Stock'));
const Reportes = lazy(() => import('./components/Reportes'));
const Historial = lazy(() => import('./components/Historial'));
const Configuracion = lazy(() => import('./components/Configuracion'));

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-[50vh] animate-pulse">
    <span className="material-icons text-4xl mb-4 animate-spin text-accent">sync</span>
    <div className="font-mono text-xs uppercase tracking-widest font-bold text-txt-primary">Cargando módulo...</div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('caja');

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return <Dashboard />;
      case 'caja':
        return <Ventas />;
      case 'inventario':
        return <Stock />;
      case 'gastos':
        return <Reportes />;
      case 'movimientos':
        return <Historial />;
      case 'ajustes':
        return <Configuracion />;
      default:
        return <Ventas />;
    }
  };

  return (
    <DialogProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            {renderContent()}
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </DialogProvider>
  );
}

export default App;
