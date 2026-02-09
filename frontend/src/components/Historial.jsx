import React, { useEffect, useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const Historial = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, INCOME, EXPENSE

    const { showAlert, showConfirm } = useDialog();

    const fetchTransactions = () => {
        setLoading(true);
        fetch(`${API_URL}/transactions?limit=200`)
            .then(res => res.json())
            .then(data => {
                setTransactions(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching transactions:", err);
                setLoading(false);
            });
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm("¿Seguro que deseas eliminar este movimiento?", "Eliminar Movimiento");
        if (!confirmed) return;

        fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
        })
            .then(res => {
                if (res.ok) {
                    showAlert("Movimiento eliminado correctamente", 'success');
                    fetchTransactions();
                } else {
                    showAlert("Error eliminando el movimiento", 'error');
                }
            })
            .catch(err => showAlert("Error network: " + err, 'error'));
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const formatMoney = (val) => val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'ALL') return true;
        return t.type === filter;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin">history</span>
            <div className="font-mono text-xs uppercase tracking-widest">Cargando Historial...</div>
        </div>
    );

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-wide mb-1">
                        HISTORIAL DE <span className="text-accent">TRANSACCIONES</span>
                    </h1>
                    <p className="text-txt-dim text-sm max-w-md">
                        Registro de todos los movimientos financieros.
                    </p>
                </div>

                <GlassContainer className="flex p-1 gap-1">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'ALL' ? 'bg-white/10 text-white shadow-sm' : 'text-txt-dim hover:text-white hover:bg-white/5'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('INCOME')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'INCOME' ? 'bg-success/20 text-success shadow-sm' : 'text-txt-dim hover:text-white hover:bg-white/5'}`}
                    >
                        Ingresos
                    </button>
                    <button
                        onClick={() => setFilter('EXPENSE')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'EXPENSE' ? 'bg-error/20 text-error shadow-sm' : 'text-txt-dim hover:text-white hover:bg-white/5'}`}
                    >
                        Egresos
                    </button>
                </GlassContainer>
            </header>

            <GlassContainer className="p-0 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-txt-secondary text-xs uppercase font-bold tracking-wider border-b border-glass-border">
                                <th className="p-6 font-mono">Fecha</th>
                                <th className="p-6 font-mono">Categoría</th>
                                <th className="p-6 font-mono">Descripción</th>
                                <th className="p-6 text-right font-mono">Monto</th>
                                <th className="p-6 text-center font-mono">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-txt-dim font-mono">
                                        No se encontraron movimientos.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6 text-txt-secondary font-mono text-sm whitespace-nowrap">
                                            {formatDate(t.date)}
                                        </td>
                                        <td className="p-6">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.type === 'INCOME'
                                                ? 'bg-success/10 text-success border border-success/20'
                                                : 'bg-error/10 text-error border border-error/20'
                                                }`}>
                                                {t.category ? t.category.name : '-'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-white font-medium max-w-xs truncate" title={t.description}>
                                            {t.description || '-'}
                                        </td>
                                        <td className={`p-6 text-right font-mono font-bold whitespace-nowrap text-sm ${t.type === 'INCOME' ? 'text-success' : 'text-error'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'} {formatMoney(t.amount)}
                                        </td>
                                        <td className="p-6 text-center">
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="text-txt-dim hover:text-error transition-all p-2 rounded-lg hover:bg-error/10 opacity-0 group-hover:opacity-100"
                                                title="Eliminar Movimiento"
                                            >
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-4 p-4">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center text-txt-dim p-8">No se encontraron movimientos.</div>
                    ) : (
                        filteredTransactions.map(t => (
                            <div key={t.id} className="bg-black/20 rounded-xl p-4 border border-white/5 relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-[10px] text-txt-dim font-mono mb-1">{formatDate(t.date)}</div>
                                        <div className={`text-xl font-mono font-bold ${t.type === 'INCOME' ? 'text-success' : 'text-error'}`}>
                                            {t.type === 'INCOME' ? '+ ' : '- '}{formatMoney(t.amount)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="text-txt-dim hover:text-error p-1"
                                    >
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${t.type === 'INCOME' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'
                                        }`}>
                                        {t.category ? t.category.name : 'General'}
                                    </span>
                                    <p className="text-sm text-txt-secondary">
                                        {t.description || "Sin descripción"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassContainer>
        </div>
    );
};

export default Historial;
