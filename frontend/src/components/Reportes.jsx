import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const Reportes = () => {
    const { showAlert } = useDialog();
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Date Filter
    const [date, setDate] = useState(new Date());

    // Upload State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [file, setFile] = useState(null);

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        try {
            // 1. Summary (Now returns total_income, total_expense, net_balance)
            const sumRes = await fetch(`${API_URL}/finances/summary?month=${month}&year=${year}`);
            if (sumRes.ok) setSummary(await sumRes.json());

            // 2. Expenses (Documents)
            const expRes = await fetch(`${API_URL}/expenses?month=${month}&year=${year}`);
            if (expRes.ok) setExpenses(await expRes.json());

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !amount || !desc) {
            showAlert("Complete todos los campos", "error");
            return;
        }

        const formData = new FormData();
        formData.append("description", desc);
        formData.append("amount", amount);
        formData.append("date", new Date().toISOString().split('T')[0]);
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/expenses/upload`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                showAlert("Comprobante subido correctamente", "success");
                setUploadModalOpen(false);
                setDesc('');
                setAmount('');
                setFile(null);
                loadData();
            } else {
                showAlert("Error al subir", "error");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error de conexión", "error");
        }
    };

    const downloadPDF = async () => {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        window.open(`${API_URL}/reports/accounting/pdf?month=${month}&year=${year}`, '_blank');
    };

    const changeMonth = (delta) => {
        const newDate = new Date(date.setMonth(date.getMonth() + delta));
        setDate(new Date(newDate));
    };

    const formatMoney = (val) => val?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) || '$0,00';

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-sans font-extrabold text-black tracking-tight mb-2 flex items-center gap-2">
                        <span className="material-icons text-gray-400">analytics</span>
                        Reportes Financieros
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Balance Mensual y Gestión de Comprobantes</p>
                </div>

                <div className="flex items-center bg-white border border-gray-200 shadow-sm p-1 rounded-lg">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-black">
                        <span className="material-icons">chevron_left</span>
                    </button>
                    <span className="font-bold text-sm min-w-[150px] text-center capitalize text-black font-mono">
                        {date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-black">
                        <span className="material-icons">chevron_right</span>
                    </button>
                </div>
            </header>

            {/* FINANCIAL SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-icons text-6xl text-black">trending_up</span>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Ingresos Totales</div>
                        <div className="text-4xl font-mono font-bold text-black tracking-tighter">
                            {formatMoney(summary?.total_income)}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-icons text-6xl text-black">trending_down</span>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Egresos Totales</div>
                        <div className="text-4xl font-mono font-bold text-black tracking-tighter">
                            {formatMoney(summary?.total_expense)}
                        </div>
                    </div>
                </div>

                <div className="p-6 relative overflow-hidden flex flex-col justify-between bg-black text-white rounded-xl shadow-lg shadow-black/20">
                    <div>
                        <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Balance Neto del Período</div>
                        <div className="text-5xl font-mono font-black text-white tracking-tighter">
                            {formatMoney(summary?.net_balance)}
                        </div>
                    </div>
                    <Button
                        onClick={downloadPDF}
                        className="mt-6 w-full border border-white/20 hover:bg-white hover:text-black transition-colors"
                        variant="primary"
                        icon={<span className="material-icons">picture_as_pdf</span>}
                    >
                        DESCARGAR REPORTE
                    </Button>
                </div>
            </div>

            {/* EXPENSES LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-black flex items-center gap-2 font-display">
                        <span className="material-icons text-gray-400">receipt_long</span>
                        Libro de Gastos
                    </h2>
                    <Button
                        onClick={() => setUploadModalOpen(true)}
                        size="sm"
                        variant="primary"
                        icon={<span className="material-icons text-xs">add</span>}
                        className="shadow-sm border border-gray-200 bg-white text-black hover:bg-black hover:text-white transition-all"
                    >
                        REGISTRAR COMPROBANTE
                    </Button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white text-gray-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                                <th className="p-4 pl-6">Fecha</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4">Monto</th>
                                <th className="p-4 text-center pr-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-mono text-sm">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-gray-400 italic">No hay registros para este período.</td>
                                </tr>
                            ) : (
                                expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 pl-6 text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-black font-sans font-medium">{exp.description}</td>
                                        <td className="p-4 text-black font-bold">{formatMoney(exp.amount)}</td>
                                        <td className="p-4 text-center pr-6">
                                            <a
                                                href={`${API_URL}/${exp.file_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-black hover:text-white text-gray-500 font-bold px-3 py-1.5 rounded-md transition-all"
                                            >
                                                <span className="material-icons text-xs">visibility</span>
                                                VER
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* UPLOAD MODAL */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden relative border border-gray-100">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                            <h3 className="text-black font-bold font-sans tracking-tight">Nuevo Gasto Administrativo</h3>
                            <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-6 space-y-5">
                            <input
                                type="text"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                                placeholder="Descripción del Gasto"
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                required
                            />
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                    type="number"
                                    className="w-full p-3 pl-8 bg-gray-50 border border-gray-200 rounded-lg text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-mono"
                                    placeholder="Monto"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                            <input
                                type="file"
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-xs"
                                accept=".pdf,image/*"
                                onChange={e => setFile(e.target.files[0])}
                                required
                            />
                            <Button type="submit" className="w-full shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5" variant="primary" icon={<span className="material-icons">cloud_upload</span>}>
                                CARGAR COMPROBANTE
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reportes;
