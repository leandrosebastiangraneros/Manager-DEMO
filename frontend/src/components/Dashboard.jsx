import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';

const Dashboard = () => {
    const [finances, setFinances] = useState({ income: 0, expenses: 0, balance: 0, month: '...', chart_data: [], recent_sales: [] });
    const [stockAlerts, setStockAlerts] = useState([]);
    const [activityFeed, setActivityFeed] = useState([]);
    const [systemHealth, setSystemHealth] = useState({ latency: 0, status: 'ONLINE', db: 'CONNECTED' });

    const fetchAllData = async () => {
        try {
            const [statsRes, stockRes] = await Promise.all([
                fetch(`${API_URL}/dashboard-stats`),
                fetch(`${API_URL}/stock`)
            ]);

            if (statsRes.ok) {
                const stats = await statsRes.json();
                setFinances(stats);
            }

            if (stockRes.ok) {
                const items = await stockRes.json();
                // Alert for products with low stock (< 5 units)
                const alerts = items.filter(i => i.quantity < 5).map(i => ({
                    id: i.id,
                    name: i.name,
                    qty: i.quantity,
                    isCritical: i.quantity === 0
                }));
                setStockAlerts(alerts);
            }

            // Mock activity from Recent Sales (simplified for MVP)
            setActivityFeed([
                { id: 1, type: 'SALE', msg: 'Venta Directa Procesada', time: 'Recién', icon: 'shopping_bag' },
                { id: 2, type: 'STOCK', msg: 'Nuevo ingreso de mercadería', time: 'Hace 2h', icon: 'inventory' },
            ]);

        } catch (err) {
            console.error("Dashboard error:", err);
        }
    };

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const formatMoney = (val) => val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    return (
        <div className="space-y-8 pb-12 animate-[fadeIn_0.5s_ease-out]">
            {/* Header: Terminal Context */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Sistema Operativo Conectado</span>
                    </div>
                    <h1 className="text-3xl font-sans font-extrabold text-txt-primary tracking-tight leading-none">
                        Panel de Control
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-left md:text-right">
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Estado del Sistema</div>
                        <div className="flex items-center justify-start md:justify-end gap-2">
                            <span className="text-xs font-mono text-txt-primary font-bold">{systemHealth.status}</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main KPIs: Revenue, Expenses, Net Balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-surface rounded-xl shadow-sm border border-gray-100/10 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="material-icons text-5xl text-txt-primary">trending_up</span></div>
                    <div className="text-txt-dim text-[10px] font-bold uppercase tracking-widest mb-2">Ingresos {finances.month}</div>
                    <div className="text-3xl font-mono font-bold text-txt-primary tracking-tighter">{formatMoney(finances.income)}</div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-sm border border-gray-100/10 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="material-icons text-5xl text-txt-primary">trending_down</span></div>
                    <div className="text-txt-dim text-[10px] font-bold uppercase tracking-widest mb-2">Egresos Mensuales</div>
                    <div className="text-3xl font-mono font-bold text-txt-primary tracking-tighter">{formatMoney(finances.expenses)}</div>
                </div>

                <div className="p-6 bg-black text-white rounded-xl shadow-lg shadow-black/20 relative overflow-hidden group hover:shadow-xl hover:shadow-black/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><span className="material-icons text-5xl text-white">account_balance_wallet</span></div>
                    <div className="text-white/60 font-bold uppercase tracking-widest mb-2 text-[10px]">Balance Operativo</div>
                    <div className="text-3xl font-mono font-black text-white tracking-tighter">{formatMoney(finances.balance)}</div>
                </div>
            </div>

            {/* Center Section: Chart & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 bg-surface rounded-xl shadow-sm border border-gray-100/10 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-sm font-bold text-txt-primary uppercase tracking-widest flex items-center gap-2">
                            <span className="material-icons text-gray-400">bar_chart</span> Rendimiento Comercial (v30d)
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={finances.chart_data}>
                                <defs>
                                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000000" stopOpacity={0.05} />
                                        <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis dataKey="day" stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ background: '#FFFFFF', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#000000', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-1 p-6 flex flex-col bg-surface rounded-xl shadow-sm border border-gray-100/10">
                    <div className="text-sm font-bold text-txt-primary uppercase tracking-widest flex items-center gap-2 mb-6">
                        <span className="material-icons text-gray-400">notification_important</span> Alertas de Stock
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {stockAlerts.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-xs">Sin alertas críticas detectadas.</div>
                        ) : stockAlerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-lg flex justify-between items-center ${alert.isCritical ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                                <div className={`text-xs font-bold uppercase ${alert.isCritical ? 'text-red-600' : 'text-gray-700'}`}>{alert.name}</div>
                                <div className={`font-mono text-xs px-2 py-1 rounded-md font-bold ${alert.isCritical ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                                    {alert.qty}u
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Activity Trace */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface rounded-xl shadow-sm border border-gray-100/10 overflow-hidden">
                    <div className="p-4 border-b border-gray-100/10 bg-surface-highlight/30 flex items-center gap-2">
                        <span className="material-icons text-gray-400 text-sm">history</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Movimientos Recientes</span>
                    </div>
                    <div className="p-4 space-y-4">
                        {!finances.recent_sales || finances.recent_sales.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-[10px] font-mono uppercase tracking-widest">Esperando transacciones...</div>
                        ) : finances.recent_sales.map(act => (
                            <div key={act.id} className="flex items-center gap-4 group border-b border-gray-50/5 pb-3 last:border-0 last:pb-0">
                                <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center text-green-600 transition-all border border-panel-border/20 shadow-sm">
                                    <span className="material-icons text-sm">shopping_cart</span>
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-txt-primary group-hover:text-txt-secondary transition-colors line-clamp-1">{act.description}</div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="text-[10px] text-gray-400 font-mono font-medium">#{act.id}</div>
                                        {act.metadata && act.metadata.total && (
                                            <div className="text-[11px] font-mono font-bold text-txt-primary">{formatMoney(act.metadata.total)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tech Snapshot */}
                <div className="p-6 flex flex-col justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-surface-highlight/10">
                    <div className="flex items-center gap-4">
                        <div className="text-4xl font-mono font-black text-txt-dim/20 tracking-widest">DB</div>
                        <div>
                            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">PostgreSQL Instance</div>
                            <div className="text-xs font-mono text-green-600 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                CONNECTED & OPTIMIZED
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
