import React, { useState } from 'react';
import Attendance from './Attendance';
import ActiveTrips from './ActiveTrips';
import TripStart from './TripStart';
import ConfigPanel from './ConfigPanel';
import Modal from './common/Modal';
import Button from './common/Button';
import FleetManager from './FleetManager';
import OperationsMap from './OperationsMap'; // New Map Component

const Operaciones = () => {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'new_trip'
    const [activeSection, setActiveSection] = useState('OPS'); // 'OPS' (Operations) or 'FLEET' (Fleet Manager)
    const [showConfig, setShowConfig] = useState(false);
    const [showMap, setShowMap] = useState(false); // Map Modal Toggle

    return (
        <div className="flex flex-col h-full animate-[fadeIn_0.5s_ease-out] overflow-hidden">
            {/* Header (Fixed) */}
            <header className="flex-none flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-wide mb-1 flex items-center gap-3">
                        OPERACIONES <span className="text-accent">DIARIAS</span>
                        <button
                            onClick={() => setShowConfig(true)}
                            className="text-txt-dim hover:text-accent transition-colors opacity-50 hover:opacity-100"
                            title="Configuración Global"
                        >
                            <span className="material-icons text-xl">settings</span>
                        </button>
                    </h1>

                    {/* Navigation Tabs (Sub-header) */}
                    <div className="flex gap-4 mt-2">
                        <button
                            onClick={() => setActiveSection('OPS')}
                            className={`text-sm font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeSection === 'OPS' ? 'text-white border-accent' : 'text-txt-dim border-transparent hover:text-white'
                                }`}
                        >
                            Centro Logístico
                        </button>
                        <button
                            onClick={() => setActiveSection('FLEET')}
                            className={`text-sm font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeSection === 'FLEET' ? 'text-white border-accent' : 'text-txt-dim border-transparent hover:text-white'
                                }`}
                        >
                            Control de Flota
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Live Map Toggle */}
                    {activeSection === 'OPS' && viewMode === 'list' && (
                        <Button
                            variant="ghost"
                            onClick={() => setShowMap(true)}
                            icon={<span className="material-icons">map</span>}
                            className="border-accent/30 text-accent hover:bg-accent hover:text-black"
                        >
                            Mapa en Vivo
                        </Button>
                    )}

                    {viewMode === 'list' && activeSection === 'OPS' && (
                        <Button
                            variant="neon"
                            onClick={() => setViewMode('new_trip')}
                            icon={<span className="material-icons">local_shipping</span>}
                        >
                            Nuevo Envío
                        </Button>
                    )}
                    {viewMode === 'new_trip' && (
                        <Button
                            variant="secondary"
                            onClick={() => setViewMode('list')}
                            icon={<span className="material-icons">arrow_back</span>}
                        >
                            Volver
                        </Button>
                    )}
                </div>
            </header>

            {/* Config Modal */}
            <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} className="max-w-md bg-transparent border-0 shadow-none p-0 backdrop-blur-none">
                <ConfigPanel />
            </Modal>

            {/* Live Map Modal (Full Screen Overlay) */}
            {showMap && (
                <div className="absolute inset-0 z-50 flex flex-col pt-20 md:pt-0 animate-[fadeIn_0.3s_ease-out]">
                    <div className="relative w-full h-full bg-black/50 backdrop-blur-sm overflow-hidden shadow-2xl">

                        {/* Close Button - Always visible, top right of the map container */}
                        <button
                            onClick={() => setShowMap(false)}
                            className="absolute top-4 right-4 z-[1000] bg-red-600 hover:bg-red-500 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 border border-white/20"
                            title="Cerrar Mapa"
                        >
                            <span className="material-icons font-bold">close</span>
                        </button>

                        <OperationsMap />
                    </div>
                </div>
            )}

            {/* Content Body (Flex Grow) */}
            <div className="flex-1 min-h-0 relative">
                {activeSection === 'OPS' ? (
                    /* OPS SECTION */
                    viewMode === 'list' ? (
                        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* LEFT PANEL: Attendance (4 Cols) */}
                            <section className="lg:col-span-4 flex flex-col min-h-0">
                                <div className="flex-none flex items-center gap-2 mb-2 text-white/50 uppercase tracking-widest text-xs font-bold font-mono">
                                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                                    Personal
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                    <Attendance />
                                </div>
                            </section>

                            {/* RIGHT PANEL: Active Trips (8 Cols) */}
                            <section className="lg:col-span-8 flex flex-col min-h-0">
                                <div className="flex-none flex items-center gap-2 mb-2 text-white/50 uppercase tracking-widest text-xs font-bold font-mono">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    Logística Activa
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <ActiveTrips />
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto custom-scrollbar animate-[slideUp_0.3s_ease-out]">
                            <TripStart onSuccess={() => setViewMode('list')} />
                        </div>
                    )
                ) : (
                    /* FLEET SECTION */
                    <div className="h-full animate-[fadeIn_0.3s_ease-out]">
                        <FleetManager />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Operaciones;
