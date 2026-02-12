import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import { formatMoney } from '../utils/formatters';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const Reportes = () => {
    const { showAlert } = useDialog();
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [performanceData, setPerformanceData] = useState([]);

    // Date Filter
    const [date, setDate] = useState(new Date());

    // Upload State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [file, setFile] = useState(null);

    useEffect(() => {
        loadData();
        loadPerformanceData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        try {
            // 1. Summary
            const sumRes = await fetch(`${API_URL}/finances/summary?month=${month}&year=${year}`);
            if (sumRes.ok) {
                const data = await sumRes.json();
                setSummary(data);
            }

            // 2. Expenses (Documents)
            const expRes = await fetch(`${API_URL}/expenses?month=${month}&year=${year}`);
            if (expRes.ok) setExpenses(await expRes.json());

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadPerformanceData = async () => {
        try {
            // We fetch the root which contains "recent_sales" based on backend investigation
            const res = await fetch(`${API_URL}/`);
            if (res.ok) {
                const data = await res.json();
                const sales = data.recent_sales || [];

                // Group by date for the last 30 days
                const grouped = sales.reduce((acc, move) => {
                    const d = new Date(move.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                    const val = parseFloat(move.metadata?.total || 0);
                    acc[d] = (acc[d] || 0) + val;
                    return acc;
                }, {});

                const chartData = Object.entries(grouped)
                    .map(([name, total]) => ({ name, total }))
                    .reverse()
                    .slice(-30);

                setPerformanceData(chartData);
            }
        } catch (err) {
            console.error("Error loading performance:", err);
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
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + delta);
        setDate(newDate);
    };

    // formatMoney imported from utils/formatters.js (null-safe)

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-panel-border/10 pb-6">
                <div>
                    <h1 className="text-3xl font-sans font-black text-txt-primary tracking-tight mb-1 flex items-center gap-3 uppercase">
                        <span className="material-icons text-accent">analytics</span>
                        Reportes Financieros
                    </h1>
                    <p className="text-txt-dim text-[10px] font-black uppercase tracking-widest">Balance Mensual y Gestión Administrativa</p>
                </div>

                <div className="flex items-center bg-surface border border-panel-border/10 shadow-sm p-1.5 rounded-xl">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-surface-highlight rounded-lg transition-colors text-txt-dim hover:text-txt-primary">
                        <span className="material-icons">chevron_left</span>
                    </button>
                    <span className="font-black text-[11px] min-w-[150px] text-center uppercase tracking-widest text-txt-primary font-mono">
                        {date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-surface-highlight rounded-lg transition-colors text-txt-dim hover:text-txt-primary">
                        <span className="material-icons">chevron_right</span>
                    </button>
                </div>
            </header>

            {/* FINANCIAL SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-7 bg-surface rounded-2xl shadow-sm border border-panel-border/5 relative overflow-hidden group hover:border-accent/20 transition-all">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors"></div>
                    <div>
                        <div className="text-txt-dim text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Ingresos Mensuales
                        </div>
                        <div className="text-4xl font-mono font-black text-txt-primary tracking-tighter">
                            {formatMoney(summary?.total_income)}
                        </div>
                    </div>
                </div>

                <div className="p-7 bg-surface rounded-2xl shadow-sm border border-panel-border/5 relative overflow-hidden group hover:border-red-500/10 transition-all">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors"></div>
                    <div>
                        <div className="text-txt-dim text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            Egresos Registrados
                        </div>
                        <div className="text-4xl font-mono font-black text-txt-primary tracking-tighter">
                            {formatMoney(summary?.total_expense)}
                        </div>
                    </div>
                </div>

                <div className="p-7 relative overflow-hidden flex flex-col justify-between bg-void text-white rounded-2xl shadow-2xl shadow-void/30 border border-white/5 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[60px] group-hover:bg-accent/20 transition-all"></div>
                    <div className="relative z-10">
                        <div className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                            Balance Neto
                        </div>
                        <div className="text-5xl font-mono font-black text-white tracking-tighter">
                            {formatMoney(summary?.net_balance)}
                        </div>
                    </div>
                    <button
                        onClick={downloadPDF}
                        className="mt-8 w-full py-4 bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-void transition-all relative z-10 flex items-center justify-center gap-2 shadow-lg"
                    >
                        <span className="material-icons text-base">picture_as_pdf</span>
                        DESCARGAR ESTADO DE CUENTA
                    </button>
                </div>
            </div>

            {/* PERFORMANCE CHART */}
            <div className="p-8 bg-surface rounded-2xl shadow-sm border border-panel-border/5">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-txt-primary mb-1">Rendimiento Comercial</h2>
                        <p className="text-[9px] text-txt-dim font-bold uppercase tracking-widest">Ingresos por Ventas (v30d)</p>
                    </div>
                    <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[9px] font-black uppercase tracking-widest border border-accent/20">
                        Tendencia Diaria
                    </div>
                </div>

                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4bbbb9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4bbbb9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 9, fontWeight: 900, fill: '#9ca3af' }}
                                dy={10}
                            />
                            <YAxis
                                hide
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#000',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    fontFamily: 'monospace'
                                }}
                                itemStyle={{ color: '#4bbbb9' }}
                                cursor={{ stroke: '#4bbbb9', strokeWidth: 1 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#4bbbb9"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* EXPENSES LIST */}
            <div className="bg-surface rounded-2xl shadow-sm border border-panel-border/5 overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-7 border-b border-panel-border/5 flex justify-between items-center bg-gray-50/30">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-txt-primary flex items-center gap-2">
                            <span className="material-icons text-txt-dim">history_edu</span>
                            Archivo de Gastos
                        </h2>
                        <p className="text-[8px] text-txt-dim font-black uppercase tracking-[0.2em] mt-1">Soporte Documental Administrativo</p>
                    </div>
                    <button
                        onClick={() => setUploadModalOpen(true)}
                        className="px-6 py-3 bg-white text-txt-primary border border-panel-border/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-void hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                        <span className="material-icons text-base">add_circle_outline</span>
                        REGISTRAR COMPROBANTE
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 text-txt-dim text-[10px] font-black uppercase tracking-widest border-b border-panel-border/10 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="p-5 pl-8 text-center">Fecha</th>
                                <th className="p-5">Descripción Concepto</th>
                                <th className="p-5 text-right">Monto Neto</th>
                                <th className="p-5 text-center pr-8 w-40">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-panel-border/5 font-mono text-xs">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-20 text-center text-txt-dim font-black uppercase tracking-widest opacity-30 italic">Sin registros en este período.</td>
                                </tr>
                            ) : (
                                expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-accent/5 transition-colors group">
                                        <td className="p-5 pl-8 text-center font-black text-txt-dim">
                                            {new Date(exp.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-5 text-txt-primary font-sans font-black uppercase tracking-tight text-[11px]">
                                            {exp.description}
                                        </td>
                                        <td className="p-5 text-right text-txt-primary font-black text-sm">
                                            {formatMoney(exp.amount)}
                                        </td>
                                        <td className="p-5 text-center pr-8">
                                            <a
                                                href={`${API_URL}/${exp.file_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-[8px] bg-surface-highlight hover:bg-void hover:text-white text-txt-primary font-black px-4 py-2 rounded-xl transition-all border border-panel-border/10"
                                            >
                                                <span className="material-icons text-sm">visibility</span>
                                                DOCUMENTO
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-md bg-surface rounded-[2rem] shadow-2xl overflow-hidden relative border border-panel-border/10">
                        <div className="p-6 bg-void text-white border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Comprobante</h3>
                                <p className="text-[9px] text-accent font-black uppercase tracking-widest mt-1">Carga de Gasto Administrativo</p>
                            </div>
                            <button onClick={() => setUploadModalOpen(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all group">
                                <span className="material-icons group-hover:rotate-90 transition-transform">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Descripción del Gasto</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl text-txt-primary outline-none focus:border-accent transition-all text-xs font-black uppercase tracking-tight"
                                    placeholder="Ej: Pago de Luz Enero"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Monto Total</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-dim font-black">$</span>
                                    <input
                                        type="number"
                                        className="w-full p-4 pl-10 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl text-txt-primary outline-none focus:border-accent transition-all font-mono font-black text-lg"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Archivo / PDF</label>
                                <div className="relative border-2 border-dashed border-panel-border/20 rounded-2xl p-4 bg-surface-highlight/50 hover:bg-surface-highlight transition-colors cursor-pointer group">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept=".pdf,image/*"
                                        onChange={e => setFile(e.target.files[0])}
                                        required
                                    />
                                    <div className="flex flex-col items-center justify-center py-2 text-txt-dim group-hover:text-accent transition-colors">
                                        <span className="material-icons text-3xl mb-2">cloud_upload</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest">{file ? file.name : 'Subir Documento'}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 bg-void text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-void/20 hover:bg-accent hover:text-void transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <span className="material-icons text-lg">save</span>
                                REGISTRAR OPERACIÓN
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reportes;
