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
            .then(data => {
                setTransactions(Array.isArray(data) ? data : []);
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
                    <h1 className="text-3xl font-sans font-extrabold text-black tracking-tight mb-1">
                        Historial de Transacciones
                    </h1>
                    <p className="text-gray-500 text-sm max-w-md font-medium">
                        Registro completo de movimientos financieros.
                    </p>
                </div>

                <div className="flex p-1 gap-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === 'ALL' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('INCOME')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === 'INCOME' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-green-700 hover:bg-green-50'}`}
                    >
                        Ingresos
                    </button>
                    <button
                        onClick={() => setFilter('EXPENSE')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === 'EXPENSE' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:text-red-700 hover:bg-red-50'}`}
                    >
                        Egresos
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-100">
                                <th className="p-4 pl-6 font-medium">Fecha</th>
                                <th className="p-4 font-medium">Categoría</th>
                                <th className="p-4 font-medium">Descripción</th>
                                <th className="p-4 text-right font-medium">Monto</th>
                                <th className="p-4 text-center font-medium pr-6">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-400 font-medium">
                                        No se encontraron movimientos.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 pl-6 text-gray-700 font-mono text-sm whitespace-nowrap">
                                            {formatDate(t.date)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.type === 'INCOME'
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                                }`}>
                                                {t.category ? t.category.name : '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-black font-medium max-w-xs truncate" title={t.description}>
                                            {t.description || '-'}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold whitespace-nowrap text-sm ${t.type === 'INCOME' ? 'text-green-600' : 'text-black'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'} {formatMoney(t.amount)}
                                        </td>
                                        <td className="p-4 text-center pr-6">
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="text-gray-400 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
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
                <div className="md:hidden space-y-4 p-4 bg-gray-50">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center text-gray-400 p-8">No se encontraron movimientos.</div>
                    ) : (
                        filteredTransactions.map(t => (
                            <div key={t.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-mono mb-1">{formatDate(t.date)}</div>
                                        <div className={`text-xl font-mono font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-black'}`}>
                                            {t.type === 'INCOME' ? '+ ' : '- '}{formatMoney(t.amount)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${t.type === 'INCOME' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {t.category ? t.category.name : 'General'}
                                    </span>
                                    <p className="text-sm text-gray-600">
                                        {t.description || "Sin descripción"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Historial;
