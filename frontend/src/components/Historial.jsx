import React, { useEffect, useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import { toast } from 'sonner';

const Historial = () => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, STOCK, VENTA, FINANZAS, SISTEMA

    const { showAlert, showConfirm } = useDialog();

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/movements?limit=100`);
            if (res.ok) {
                const data = await res.json();
                setMovements(Array.isArray(data) ? data : []);
            } else {
                toast.error("Error al cargar el historial");
            }
        } catch (err) {
            console.error("Error fetching movements:", err);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, []);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryStyles = (category) => {
        switch (category) {
            case 'STOCK': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'VENTA': return 'bg-green-50 text-green-700 border-green-100';
            case 'FINANZAS': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'SISTEMA': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getIcon = (category) => {
        switch (category) {
            case 'STOCK': return 'inventory_2';
            case 'VENTA': return 'shopping_cart';
            case 'FINANZAS': return 'payments';
            case 'SISTEMA': return 'settings';
            default: return 'info';
        }
    };

    const filteredMovements = movements.filter(m => {
        if (filter === 'ALL') return true;
        return m.category === filter;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin text-gray-400">history_toggle_off</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold">Sincronizando Log de Actividad...</div>
        </div>
    );

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-sans font-extrabold text-txt-primary tracking-tight mb-1">
                        Log de Actividad
                    </h1>
                    <p className="text-txt-secondary text-sm font-medium">
                        Trazabilidad completa de movimientos y operaciones del sistema.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 p-1 bg-surface border border-gray-100/10 rounded-xl shadow-sm">
                    {['ALL', 'STOCK', 'VENTA', 'FINANZAS', 'SISTEMA'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`
                                px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${filter === cat
                                    ? 'bg-black text-white shadow-md scale-[1.05]'
                                    : 'text-txt-dim hover:text-txt-primary hover:bg-gray-100/50'}
                            `}
                        >
                            {cat === 'ALL' ? 'Todos' : cat}
                        </button>
                    ))}
                </div>
            </header>

            <div className="bg-surface rounded-2xl shadow-xl shadow-black/5 border border-gray-100/10 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-txt-dim text-[10px] uppercase font-bold tracking-widest border-b border-gray-100/10">
                                <th className="p-3 md:p-5 pl-4 md:pl-8 text-[9px] md:text-[10px]">Timestamp</th>
                                <th className="p-3 md:p-5 text-[9px] md:text-[10px]">Módulo</th>
                                <th className="p-3 md:p-5 text-[9px] md:text-[10px]">Acción</th>
                                <th className="p-3 md:p-5 text-[9px] md:text-[10px]">Descripción Detallada</th>
                                <th className="p-3 md:p-5 text-right pr-4 md:pr-8 text-[9px] md:text-[10px]">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50/30">
                            {filteredMovements.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="flex flex-col items-center opacity-30">
                                            <span className="material-icons text-5xl mb-2">find_in_page</span>
                                            <p className="text-sm font-bold uppercase tracking-widest">No hay registros detectados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMovements.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50/5 transition-colors group">
                                        <td className="p-3 md:p-5 pl-4 md:pl-8 text-txt-dim font-mono text-[9px] md:text-xs whitespace-nowrap">
                                            {formatDate(m.created_at).split(',')[0]}<span className="hidden md:inline">,{formatDate(m.created_at).split(',')[1]}</span>
                                        </td>
                                        <td className="p-3 md:p-5">
                                            <span className={`
                                                inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 border rounded-full text-[8px] md:text-[10px] font-black tracking-tighter
                                                ${getCategoryStyles(m.category)}
                                            `}>
                                                <span className="material-icons text-[12px]">{getIcon(m.category)}</span>
                                                {m.category}
                                            </span>
                                        </td>
                                        <td className="p-3 md:p-5">
                                            <span className="text-txt-primary font-mono text-[9px] md:text-[11px] font-bold bg-surface-highlight p-1 px-1.5 rounded border border-panel-border">
                                                {m.action}
                                            </span>
                                        </td>
                                        <td className="p-3 md:p-5 text-txt-primary font-medium text-[11px] md:text-sm max-w-[150px] md:max-w-none break-words">
                                            {m.description}
                                        </td>
                                        <td className="p-3 md:p-5 text-right pr-4 md:pr-8">
                                            {m.metadata && Object.keys(m.metadata).length > 0 ? (
                                                <div className="flex justify-end gap-1 flex-wrap">
                                                    {Object.entries(m.metadata).map(([key, val]) => (
                                                        <span key={key} className="text-[8px] md:text-[9px] bg-surface-highlight text-txt-dim px-1.5 py-0.5 rounded font-mono border border-panel-border/50" title={`${key}: ${val}`}>
                                                            <span className="opacity-50 lowercase">{key}:</span> {typeof val === 'number' ? val.toLocaleString() : val}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] md:text-[10px] text-gray-300 italic font-mono">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Terminal Context Footer */}
            <footer className="flex justify-between items-center text-[10px] font-mono font-bold text-txt-dim uppercase tracking-widest px-2">
                <div>Database Activity Trace Online</div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Live Streaming Active
                </div>
            </footer>
        </div>
    );
};

export default Historial;
