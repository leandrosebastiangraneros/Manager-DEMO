import React, { useState } from 'react';
import Layout from './components/Layout';
import { DialogProvider } from './context/DialogContext';
import ErrorBoundary from './components/common/ErrorBoundary';
// Components
import Dashboard from './components/Dashboard';
import Historial from './components/Historial';
import Reportes from './components/Reportes';
import Stock from './components/Stock';
import Configuracion from './components/Configuracion';
import Ventas from './components/Ventas';

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
          {renderContent()}
        </ErrorBoundary>
      </Layout>
    </DialogProvider>
  );
}

export default App;
