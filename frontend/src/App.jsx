import React, { useState } from 'react';
import Layout from './components/Layout';
import { DialogProvider } from './context/DialogContext';
// Components
import Dashboard from './components/Dashboard';
import Historial from './components/Historial';
import Reportes from './components/Reportes';
import Stock from './components/Stock';
import Configuracion from './components/Configuracion';
import Personal from './components/Personal';
import Operaciones from './components/Operaciones';
import CalendarView from './components/CalendarView';
import FleetManager from './components/FleetManager';
import ActiveTrips from './components/ActiveTrips';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Default

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'operaciones':
        return <Operaciones />;
      case 'calendario':
        return <CalendarView />;
      case 'movimientos':
        return <Historial />;
      case 'stock':
        return <Stock />;
      case 'fleet':
        return <FleetManager />;
      case 'trips':
        return <ActiveTrips />;
      case 'personal':
        return <Personal />;
      case 'reportes':
        return <Reportes />;
      case 'configuracion':
        return <Configuracion />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DialogProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
    </DialogProvider>
  );
}

export default App;
