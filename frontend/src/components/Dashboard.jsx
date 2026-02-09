import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MovimientoForm from './MovimientoForm';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import { API_URL } from '../config';
import { getTodayArgentina } from '../utils/dateUtils';

const Dashboard = () => {
    // State for all data sources
    const [finances, setFinances] = useState({ income: 0, expenses: 0, balance: 0, month: '...', chart_data: [] });
    const [operations, setOperations] = useState({ activeTrips: 0, totalTripsMonth: 0 });
    const [attendance, setAttendance] = useState({ present: 0, total: 0 });
    const [stockAlerts, setStockAlerts] = useState([]);
    const [activityFeed, setActivityFeed] = useState([]);
    const [systemHealth, setSystemHealth] = useState({ latency: 0, status: 'ONLINE', db: 'CONNECTED' });

    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('INCOME'); // INCOME or EXPENSE

    const fetchAllData = async () => {
        // Latency Check Start
        const startPing = performance.now();

        try {
            const today = getTodayArgentina();

            const [statsRes, tripsRes, attRes, stockRes, empsRes] = await Promise.all([
                fetch(`${API_URL}/dashboard-stats`),
                fetch(`${API_URL}/trips`),
                fetch(`${API_URL}/attendance/${today}`),
                fetch(`${API_URL}/stock`),
                fetch(`${API_URL}/employees`)
            ]);

            // Latency Check End
            const endPing = performance.now();
            const latency = Math.round(endPing - startPing);
            setSystemHealth(prev => ({ ...prev, latency, status: latency > 500 ? 'DEGRADED' : 'ONLINE' }));

            // 1. Financials
            if (statsRes.ok) {
                setFinances(await statsRes.json());
            }

            // 2. Operations (Trips) & Activity Feed
            if (tripsRes.ok) {
                const trips = await tripsRes.json();
                const active = trips.filter(t => t.status === 'OPEN').length;
                setOperations({
                    activeTrips: active,
                    totalTripsMonth: trips.length
                });

                // Generate Activity Feed from Trips + Mock System Events
                const tripEvents = trips.slice(0, 5).map(t => ({
                    id: `trip-${t.id}`,
                    time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), // Mock time for demo or use real updated_at if available
                    type: t.status === 'OPEN' ? 'TRIP_START' : 'TRIP_END',
                    desc: `${t.status === 'OPEN' ? 'Viaje iniciado' : 'Viaje completado'} #${t.id} - ${t.driver_name}`,
                    icon: 'local_shipping',
                    color: t.status === 'OPEN' ? 'text-accent' : 'text-success'
                }));

                const systemEvents = [
                    { id: 'sys-1', time: 'AUTO', type: 'SYSTEM', desc: 'Copia de Seguridad Completada', icon: 'cloud_done', color: 'text-secondary' },
                    { id: 'sys-2', time: 'AUTO', type: 'AUTH', desc: 'Inicio de sesión Admin Autorizado', icon: 'gpp_good', color: 'text-white' }
                ];

                // Interleave and sort (Mock logic using simulated timeline)
                setActivityFeed([...tripEvents, ...systemEvents].slice(0, 6));
            }

            // 3. Attendance & Employees
            let totalEmps = 0;
            if (empsRes.ok) {
                const emps = await empsRes.json();
                totalEmps = emps.length;
            }

            let presentCount = 0;
            if (attRes.ok) {
                const attData = await attRes.json();
                presentCount = attData.filter(a => a.is_present).length;
            }

            setAttendance({
                present: presentCount,
                total: totalEmps
            });

            // 4. Stock Alerts
            if (stockRes.ok) {
                const items = await stockRes.json();
                const depleted = items.filter(i => i.quantity <= 0);
                setStockAlerts(depleted);
            }

        } catch (err) {
            console.error("Error loading dashboard:", err);
            setSystemHealth({ latency: 0, status: 'OFFLINE', db: 'DISCONNECTED' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
        // Refresh every 30s to simulate live feel
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenModal = (type) => {
        setModalType(type);
        setModalOpen(true);
    };

    const handleSave = () => {
        fetchAllData(); // Refresh all
    };

    const formatMoney = (val) => val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    // Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dateStr = currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full text-accent font-mono gap-4 animate-pulse">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <div className="uppercase tracking-widest text-xs">Sistema Inicializando...</div>
        </div>
    );

    return (
        <div className="flex flex-col h-auto md:h-full animate-[fadeIn_0.5s_ease-out] overflow-visible md:overflow-hidden">
            {/* Header Section (Fixed Height on Desktop, Auto on Mobile) */}
            <header className="flex-none flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 md:mb-4">
                <div className="w-full md:w-auto">
                    <div className="text-txt-dim font-mono text-[10px] uppercase tracking-widest flex items-center justify-center md:justify-start gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${systemHealth.status === 'ONLINE' ? 'bg-success text-success' : 'bg-success text-success'}`}></span>
                        {dateStr} &bull; {timeStr}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-wide text-center md:text-left">
                        CENTRO DE <span className="text-accent">COMANDO</span>
                    </h1>
                </div>

                <div className="flex w-full md:w-auto gap-4">
                    <GlassContainer className="w-full md:w-auto px-6 py-3 flex items-center justify-center md:justify-end gap-4 min-w-[200px] bg-gradient-to-r from-success/10 to-transparent border-success/30">
                        <div className="text-center md:text-right w-full">
                            <div className="text-[10px] text-success uppercase font-bold tracking-widest mb-1 flex justify-center md:justify-end items-center gap-2">
                                <span className="material-icons text-sm">account_balance_wallet</span>
                                Balance Total
                            </div>
                            <div className={`font-mono font-black text-2xl ${finances.balance >= 0 ? 'text-white text-glow' : 'text-error'}`}>
                                {formatMoney(finances.balance)}
                            </div>
                        </div>
                    </GlassContainer>
                </div>
            </header>

            {/* BENTO GRID (Flex 1 to fill remaining height on Desktop, Auto on Mobile) */}
            <div className="flex-1 h-auto md:min-h-0 grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-2 gap-4 pb-2">

                {/* COL 1: REAL TIME OPS (Stacked Vertically) */}
                <div className="lg:col-span-1 lg:row-span-2 flex flex-col gap-4">
                    {/* Ops KPI */}
                    <GlassContainer hoverEffect className="flex-1 p-5 relative overflow-hidden group flex flex-col justify-between min-h-[160px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl rotate-12 text-white">local_shipping</span>
                        </div>
                        <div>
                            <h3 className="text-accent font-mono text-xs uppercase tracking-widest mb-1">Operaciones</h3>
                            <div className="text-4xl font-display font-bold text-white mb-1">{operations.activeTrips}</div>
                            <span className="text-txt-dim text-[10px] uppercase">Viajes Activos</span>
                        </div>
                        <div className="w-full bg-white/10 h-[2px] rounded-full overflow-hidden mt-4">
                            <div className="bg-accent h-full w-[40%] animate-pulse"></div>
                        </div>
                    </GlassContainer>

                    {/* Attendance KPI */}
                    <GlassContainer hoverEffect className="flex-1 p-5 relative overflow-hidden group flex flex-col justify-between min-h-[160px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-secondary">badge</span>
                        </div>
                        <div>
                            <h3 className="text-secondary font-mono text-xs uppercase tracking-widest mb-1">Personal</h3>
                            <div className="text-4xl font-display font-bold text-white mb-1">{attendance.present}</div>
                            <span className="text-txt-dim text-[10px] uppercase">Presentes / {attendance.total} Total</span>
                        </div>
                        <div className="w-full bg-white/10 h-[2px] rounded-full overflow-hidden mt-4">
                            <div
                                className="bg-secondary h-full transition-all duration-1000"
                                style={{ width: `${(attendance.present / (attendance.total || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </GlassContainer>

                    {/* Quick Buttons */}
                    <div className="flex gap-2 h-12 shrink-0">
                        <Button
                            variant="secondary"
                            className="flex-1 justify-center hover:bg-white hover:text-black"
                            onClick={() => handleOpenModal('INCOME')}
                            icon={<span className="material-icons text-sm">add</span>}
                        >
                            ING
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex-1 justify-center hover:bg-white hover:text-black"
                            onClick={() => handleOpenModal('EXPENSE')}
                            icon={<span className="material-icons text-sm">remove</span>}
                        >
                            GAS
                        </Button>
                    </div>
                </div>

                {/* COL 2 & 3: MAIN CHART */}
                <GlassContainer className="lg:col-span-2 lg:row-span-2 p-5 flex flex-col relative h-[350px] md:h-auto min-h-0">
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2 flex-none">
                            <h3 className="font-display font-bold text-sm text-white tracking-wide">TELEMETRÍA FINANCIERA</h3>
                            <div className="flex gap-4">
                                <div className="text-right">
                                    <span className="text-[9px] text-txt-dim uppercase block">Ingresos</span>
                                    <span className="text-xs font-mono font-bold text-white">{formatMoney(finances.income)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] text-txt-dim uppercase block">Gastos</span>
                                    <span className="text-xs font-mono font-bold text-txt-secondary">{formatMoney(finances.expenses)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={finances.chart_data}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#505050', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#505050', fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '0px', border: '1px solid #333', color: '#fff' }}
                                        itemStyle={{ fontSize: '12px', fontFamily: 'monospace', color: '#fff' }}
                                        formatter={(value) => formatMoney(value)}
                                    />
                                    <Area type="monotone" dataKey="income" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </GlassContainer>

                {/* COL 4: LOGS & ALERTS (Stacked) */}
                <div className="lg:col-span-1 lg:row-span-2 flex flex-col gap-4 min-h-0">

                    {/* Live Feed */}
                    <GlassContainer className="flex-1 flex flex-col p-0 min-h-[300px] md:min-h-0 overflow-hidden">
                        <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/[0.02] flex-none">
                            <h3 className="font-display font-bold text-xs text-white tracking-wide flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-blink"></span>
                                ACTIVIDAD EN VIVO
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {activityFeed.map((event, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <span className={`material-icons text-sm mt-0.5 ${event.color}`}>{event.icon}</span>
                                    <div className="min-w-0">
                                        <div className="text-[11px] text-white font-bold leading-tight">{event.desc}</div>
                                        <div className="text-[9px] text-txt-dim font-mono mt-0.5">{event.time}</div>
                                    </div>
                                </div>
                            ))}
                            {activityFeed.length === 0 && <div className="p-4 text-center text-txt-dim text-[10px]">Sin actividad</div>}
                        </div>
                    </GlassContainer>

                    {/* Stock Alerts */}
                    <GlassContainer className={`flex-1 flex flex-col p-0 min-h-[200px] md:min-h-0 overflow-hidden ${stockAlerts.length > 0 ? 'border-orange-500/30' : ''}`}>
                        <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/[0.02] flex-none">
                            <h3 className="font-display font-bold text-xs text-white tracking-wide flex items-center gap-2">
                                {stockAlerts.length > 0 ? (
                                    <span className="material-icons text-orange-500 text-xs animate-pulse">warning</span>
                                ) : (
                                    <span className="material-icons text-success text-xs">check_circle</span>
                                )}
                                ALERTAS
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {stockAlerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-txt-dim opacity-50">
                                    <span className="material-icons text-2xl mb-1">inventory</span>
                                    <span className="text-[9px] uppercase tracking-wider">Sistemas Normales</span>
                                </div>
                            ) : (
                                stockAlerts.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-2 rounded text-[10px] border-l-2 border-orange-500">
                                        <span className="text-white truncate font-medium">{item.name}</span>
                                        <span className="font-bold text-orange-400">STOCK BAJO</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassContainer>
                </div>
            </div>

            {modalOpen && (
                <MovimientoForm
                    type={modalType}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default Dashboard;
