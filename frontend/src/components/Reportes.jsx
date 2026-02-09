import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import { formatDateDisplay } from '../utils/dateUtils';
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
            // 1. Summary
            const sumRes = await fetch(`${API_URL}/finances/summary?month=${month}&year=${year}`);
            if (sumRes.ok) setSummary(await sumRes.json());

            // 2. Expenses
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
        window.open(`${API_URL}/reports/monthly?month=${month}&year=${year}`, '_blank');
    };

    const changeMonth = (delta) => {
        const newDate = new Date(date.setMonth(date.getMonth() + delta));
        setDate(new Date(newDate));
    };

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-wide mb-1 flex items-center gap-2">
                        <span className="material-icons text-accent">pie_chart</span>
                        REPORTES <span className="text-txt-dim">Y</span> ADMIN
                    </h1>
                    <p className="text-txt-dim text-sm font-mono uppercase tracking-widest">Control Financiero y Gastos</p>
                </div>

                <GlassContainer className="px-1 py-1 flex items-center gap-2 rounded-full">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-txt-dim hover:text-white">
                        <span className="material-icons">chevron_left</span>
                    </button>
                    <span className="font-bold text-sm min-w-[150px] text-center capitalize text-white font-mono">
                        {date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-txt-dim hover:text-white">
                        <span className="material-icons">chevron_right</span>
                    </button>
                </GlassContainer>
            </header>

            {/* FINANCIAL SUMMARY */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassContainer className="p-6 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-success group hover:bg-white/5 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-success">engineering</span>
                        </div>
                        <div>
                            <div className="text-txt-dim text-[10px] font-bold uppercase tracking-widest mb-2">Costo Laboral</div>
                            <div className="text-3xl font-mono font-bold text-success drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">${summary.labor_cost.toLocaleString()}</div>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-success h-full shadow-[0_0_10px_#22c55e]"
                                style={{ width: `${(summary.labor_cost / (summary.total_cost || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </GlassContainer>

                    <GlassContainer className="p-6 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-orange-500 group hover:bg-white/5 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-orange-500">shopping_cart</span>
                        </div>
                        <div>
                            <div className="text-txt-dim text-[10px] font-bold uppercase tracking-widest mb-2">Gastos Operativos</div>
                            <div className="text-3xl font-mono font-bold text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]">${summary.expense_cost.toLocaleString()}</div>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-orange-500 h-full shadow-[0_0_10px_#f97316]"
                                style={{ width: `${(summary.expense_cost / (summary.total_cost || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </GlassContainer>

                    <GlassContainer className="p-6 relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-indigo-900/40 to-black border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
                        <div>
                            <div className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-2">Egreso Mensual Total</div>
                            <div className="text-4xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">${summary.total_cost.toLocaleString()}</div>
                        </div>
                        <Button
                            onClick={downloadPDF}
                            className="mt-4 w-full"
                            icon={<span className="material-icons">picture_as_pdf</span>}
                        >
                            Descargar Reporte
                        </Button>
                    </GlassContainer>
                </div>
            )}

            {/* EXPENSES LIST */}
            <GlassContainer className="p-0 overflow-hidden flex flex-col h-[500px]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide font-display uppercase">
                        <span className="material-icons text-orange-400">receipt_long</span>
                        Comprobantes de Gastos
                    </h2>
                    <Button
                        onClick={() => setUploadModalOpen(true)}
                        size="sm"
                        variant="secondary"
                        icon={<span className="material-icons">upload_file</span>}
                    >
                        Subir
                    </Button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-black/40 text-txt-dim text-[10px] uppercase font-bold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="p-4 tracking-widest">Fecha</th>
                                <th className="p-4 tracking-widest">Descripción</th>
                                <th className="p-4 tracking-widest">Monto</th>
                                <th className="p-4 text-center tracking-widest">Archivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-xs">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-txt-dim italic">No se encontraron comprobantes este mes.</td>
                                </tr>
                            ) : (
                                expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-txt-secondary">{formatDateDisplay(exp.date)}</td>
                                        <td className="p-4 text-white font-sans font-medium">{exp.description}</td>
                                        <td className="p-4 text-orange-400 font-bold shadow-[0_0_10px_rgba(249,115,22,0)] group-hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] transition-shadow">${exp.amount.toLocaleString()}</td>
                                        <td className="p-4 text-center">
                                            <a
                                                href={`${API_URL}/${exp.file_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] bg-white/5 hover:bg-accent hover:text-black text-txt-dim hover:font-bold px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                <span className="material-icons text-xs">visibility</span>
                                                Ver
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassContainer>

            {/* UPLOAD MODAL */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-surface w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
                        {/* Header */}
                        <div className="p-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-white font-bold font-display uppercase tracking-wide">Subir Comprobante</h3>
                            <button onClick={() => setUploadModalOpen(false)} className="text-txt-dim hover:text-white transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase text-txt-dim font-bold mb-2 tracking-widest">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-accent transition-colors text-sm"
                                    placeholder="ej. Combustible Camión 1"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-txt-dim font-bold mb-2 tracking-widest">Monto ($)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-accent transition-colors font-mono text-lg"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-txt-dim font-bold mb-2 tracking-widest">Archivo (PDF/Imagen)</label>
                                <input
                                    type="file"
                                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-txt-secondary text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:bg-white/10 file:text-white hover:file:bg-accent hover:file:text-black transition-all cursor-pointer"
                                    accept=".pdf,image/*"
                                    onChange={e => setFile(e.target.files[0])}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full mt-2"
                                variant="neon"
                                icon={<span className="material-icons">cloud_upload</span>}
                            >
                                Subir Gasto
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reportes;
