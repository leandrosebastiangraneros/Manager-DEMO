import React, { useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import ConfigPanel from './ConfigPanel';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const Configuracion = () => {
    const [loading, setLoading] = useState(false);
    const { showAlert, showConfirm } = useDialog();

    const handleReset = async () => {
        const firstConfirm = await showConfirm(
            "¡ADVERTENCIA! Esto eliminará TODOS los envíos, movimientos de stock y categorías. No se puede deshacer. ¿Estás seguro?",
            "PELIGRO: Reinicio de Base de Datos"
        );
        if (!firstConfirm) return;

        const secondConfirm = await showConfirm(
            "¿Estás absolutamente seguro? Esta es la última advertencia. Se borrará TODO.",
            "Confirmación Final"
        );
        if (!secondConfirm) return;

        setLoading(true);
        fetch(`${API_URL}/reset-db`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                setLoading(false);
                showAlert("Base de datos reiniciada. Recargando sistema...", "success");
                setTimeout(() => window.location.reload(), 2000);
            })
            .catch(err => {
                console.error("Error resetting:", err);
                setLoading(false);
                showAlert("Error al reiniciar la base de datos.", "error");
            });
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <header className="text-white">
                <h1 className="text-3xl font-display font-black tracking-wide mb-1">CONFIGURACIÓN DEL <span className="text-txt-dim">SISTEMA</span></h1>
                <p className="text-txt-dim text-sm font-mono uppercase tracking-widest">Ajustes Globales y Estado del Sistema</p>
            </header>

            {/* Global Price Panel */}
            <ConfigPanel />

            {/* Danger Zone */}
            <GlassContainer className="p-4 md:p-8 border-error/30 shadow-[0_0_20px_rgba(255,0,60,0.05)] relative overflow-hidden group hover:bg-error/5 transition-colors">

                {/* Background Stripe */}
                <div className="absolute inset-0 repeating-linear-gradient-45 from-transparent to-transparent via-error/5 bg-[length:20px_20px] opacity-20 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-error flex items-center gap-3 font-display tracking-wide mb-2">
                            <span className="material-icons animate-pulse">warning_amber</span>
                            ZONA DE PELIGRO
                        </h2>
                        <p className="text-txt-dim text-sm max-w-xl">
                            Estas acciones son destructivas y no se pueden deshacer. Proceda con extrema precaución.
                            Reiniciar la base de datos borrará todo el historial registrado.
                        </p>
                    </div>

                    <div className="flex-shrink-0">
                        <Button
                            onClick={handleReset}
                            disabled={loading}
                            variant="primary" // Let's use a custom style or primary which we can assume is distinct, or just manual class
                            className="bg-error/10 hover:bg-error text-error hover:text-white border-error/50 hover:border-error shadow-[0_0_15px_rgba(255,0,60,0.1)] hover:shadow-[0_0_20px_rgba(255,0,60,0.4)]"
                            icon={<span className="material-icons">delete_forever</span>}
                        >
                            {loading ? 'BORRANDO SISTEMA...' : 'REINICIO DE FÁBRICA'}
                        </Button>
                    </div>
                </div>
            </GlassContainer>

            {/* System Info */}
            <GlassContainer className="p-4 md:p-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 font-display tracking-wide mb-6">
                    <span className="material-icons text-blue-400">info</span>
                    ESTADO DEL SISTEMA
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-txt-dim text-[10px] uppercase font-bold tracking-widest mb-1">Versión</span>
                        <span className="font-mono text-white text-lg">v1.2.0-beta</span>
                    </div>
                    <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center group">
                        <span className="text-txt-dim text-[10px] uppercase font-bold tracking-widest mb-1">Conectividad Backend</span>
                        <span className="text-success font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                            ONLINE (Port 8001)
                        </span>
                    </div>
                    <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-txt-dim text-[10px] uppercase font-bold tracking-widest mb-1">Motor de Base de Datos</span>
                        <span className="text-white font-mono">SQLite (Local)</span>
                    </div>
                </div>
            </GlassContainer>
        </div>
    );
};

export default Configuracion;
