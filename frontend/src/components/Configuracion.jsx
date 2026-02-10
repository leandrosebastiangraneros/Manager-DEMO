import React, { useState, useEffect } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const Configuracion = () => {
    const [loading, setLoading] = useState(false);
    const [apiStatus, setApiStatus] = useState('CHECKING');
    const [latency, setLatency] = useState(0);
    const { showAlert, showConfirm } = useDialog();

    useEffect(() => {
        checkSystemHealth();
        const interval = setInterval(checkSystemHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkSystemHealth = async () => {
        const start = Date.now();
        try {
            await fetch(`${API_URL}/categories?type=INCOME`);
            const end = Date.now();
            setLatency(end - start);
            setApiStatus('ONLINE');
        } catch (err) {
            console.error("Health check failed:", err);
            setApiStatus('OFFLINE');
            setLatency(0);
        }
    };

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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-sans font-extrabold text-txt-primary tracking-tight mb-2">
                        Ajustes del Sistema
                    </h1>
                    <p className="text-txt-dim text-sm font-medium">
                        Configuración global y mantenimiento técnico.
                    </p>
                </div>
            </header>

            {/* System Metrics */}
            <div className="bg-surface rounded-xl shadow-sm border border-gray-100/10 p-8">
                <h2 className="text-lg font-bold text-txt-primary flex items-center gap-2 mb-6 font-sans">
                    <span className="material-icons text-gray-400">terminal</span>
                    Métricas en Tiempo Real
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-surface-highlight/10 rounded-lg border border-gray-100/10 flex flex-col items-center justify-center text-center">
                        <span className="text-txt-dim text-[10px] uppercase font-bold tracking-wider mb-2">Versión del Sistema</span>
                        <span className="font-mono text-txt-primary text-lg font-bold">VERSION ALPHA</span>
                    </div>
                    <div className="p-6 bg-surface-highlight/10 rounded-lg border border-gray-100/10 flex flex-col items-center justify-center text-center">
                        <span className="text-txt-dim text-[10px] uppercase font-bold tracking-wider mb-2">Estado API</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${apiStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-txt-primary font-mono font-bold text-sm">
                                {apiStatus === 'ONLINE' ? 'ONLINE (P-8000)' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                    <div className="p-6 bg-surface-highlight/10 rounded-lg border border-gray-100/10 flex flex-col items-center justify-center text-center">
                        <span className="text-txt-dim text-[10px] uppercase font-bold tracking-wider mb-2">Latencia de Red</span>
                        <span className={`font-mono text-lg font-bold ${latency < 100 ? 'text-green-600' : latency < 300 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {latency > 0 ? `${latency} ms` : '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface rounded-xl shadow-sm border border-red-900/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <span className="material-icons text-9xl text-red-500">dangerous</span>
                </div>

                <div className="p-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h2 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-2 font-sans">
                            <span className="material-icons">warning</span>
                            Zona de Peligro
                        </h2>
                        <p className="text-txt-dim text-sm max-w-xl leading-relaxed">
                            Estas acciones son destructivas e irreversibles. El reinicio de fábrica eliminará permanentemente todo el historial de ventas, inventario y comprobantes.
                        </p>
                    </div>

                    <div className="flex-shrink-0">
                        <Button
                            onClick={handleReset}
                            disabled={loading}
                            variant="secondary"
                            className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-none hover:shadow-lg"
                            icon={<span className="material-icons">delete_forever</span>}
                        >
                            {loading ? 'REINICIANDO...' : 'REINICIO DE FÁBRICA'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Configuracion;
