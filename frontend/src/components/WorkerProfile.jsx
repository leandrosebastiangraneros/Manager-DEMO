import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { formatDateDisplay, getTodayArgentina } from '../utils/dateUtils';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const WorkerProfile = ({ employeeId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employeeId) loadHistory();
    }, [employeeId]);

    const loadHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/employees/${employeeId}/history`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4">
                <span className="material-icons text-4xl animate-spin text-accent">sync</span>
                <span className="text-white font-mono text-sm tracking-widest uppercase">Loading Profile...</span>
            </div>
        </div>
    );

    if (!data) return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="p-8 text-center text-error font-bold font-mono border border-error/50 bg-error/10 rounded-xl">
                Error retrieving profile data.
                <button onClick={onClose} className="block mt-4 mx-auto text-white underline text-xs">Close</button>
            </div>
        </div>
    );

    // Helper for Attendance Heatmap
    const getAttendanceColor = (dateStr) => {
        const found = data.attendance_log.find(a => a.date.startsWith(dateStr));
        if (!found) return 'bg-white/5 border-white/5'; // No data
        return found.is_present ? 'bg-success/20 border-success shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-error/20 border-error';
    };

    const getAttendanceIcon = (dateStr) => {
        const found = data.attendance_log.find(a => a.date.startsWith(dateStr));
        if (!found) return 'remove';
        return found.is_present ? 'check_circle' : 'cancel';
    };

    const getAttendanceIconColor = (dateStr) => {
        const found = data.attendance_log.find(a => a.date.startsWith(dateStr));
        if (!found) return 'text-txt-dim';
        return found.is_present ? 'text-success' : 'text-error';
    };

    // Generate centered range: [Today-5 ... Today ... Today+5]
    const getCenteredDateRange = () => {
        const todayStr = getTodayArgentina(); // YYYY-MM-DD
        const todayDate = new Date(todayStr + 'T12:00:00');

        const days = [];
        for (let i = -5; i <= 5; i++) {
            const d = new Date(todayDate);
            d.setDate(todayDate.getDate() + i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const dateRange = getCenteredDateRange();
    const todayStr = getTodayArgentina();

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
            <GlassContainer className="w-full max-w-5xl h-[90vh] !p-0 flex flex-col overflow-hidden border-accent/20">

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-start sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h2 className="text-3xl font-display font-black text-white mb-2 uppercase tracking-tight">{data.name}</h2>
                        <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-1 rounded border border-accent/20 uppercase tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)]">Active Operator</span>
                    </div>
                    <button onClick={onClose} className="text-txt-dim hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-surface/50">

                    {/* SECTION A: Big Numbers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-black/40 p-6 rounded-xl border border-white/5 relative overflow-hidden group hover:border-success/30 transition-colors">
                            <span className="text-txt-dim text-[10px] uppercase tracking-widest font-bold">Total Earnings</span>
                            <div className="text-3xl font-mono font-bold text-success mt-2">${data.balance_earned.toLocaleString()}</div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-icons text-8xl">payments</span>
                            </div>
                        </div>
                        <div className="bg-black/40 p-6 rounded-xl border border-white/5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                            <span className="text-txt-dim text-[10px] uppercase tracking-widest font-bold">Advances Taken</span>
                            <div className="text-3xl font-mono font-bold text-orange-400 mt-2">-${data.balance_advances.toLocaleString()}</div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-icons text-8xl">money_off</span>
                            </div>
                        </div>
                        <div className="bg-black/40 p-6 rounded-xl border border-accent/30 shadow-[0_0_20px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                            <span className="text-accent text-[10px] uppercase tracking-widest font-bold">Net Payable</span>
                            <div className="text-4xl font-mono font-black text-white mt-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">${data.net_payable.toLocaleString()}</div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <span className="material-icons text-8xl text-accent">account_balance_wallet</span>
                            </div>
                            {/* Decorative glow */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 blur-3xl rounded-full"></div>
                        </div>
                    </div>

                    {/* SECTION B: Attendance Visual */}
                    <div>
                        <h3 className="text-white font-display font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-accent rounded-full"></span>
                            Attendance Log
                        </h3>
                        <div className="flex justify-between items-center bg-black/20 p-6 rounded-2xl overflow-x-auto md:justify-center md:gap-4 border border-white/5 custom-scrollbar">
                            {dateRange.map(date => {
                                const statusColor = getAttendanceColor(date);
                                const iconName = getAttendanceIcon(date);
                                const iconColor = getAttendanceIconColor(date);
                                const isToday = date === todayStr;

                                return (
                                    <div key={date} className={`flex flex-col items-center min-w-[3rem] group relative transition-transform duration-300 ${isToday ? 'scale-110 z-10' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}>

                                        {/* Day Label */}
                                        <span className={`text-[9px] uppercase mb-2 font-bold tracking-wider ${isToday ? 'text-accent' : 'text-txt-dim'}`}>
                                            {isToday ? 'TODAY' : new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3)}
                                        </span>

                                        <div
                                            className={`
                                                w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center 
                                                border transition-all duration-300 relative
                                                ${statusColor}
                                                ${isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-black' : ''}
                                            `}
                                        >
                                            <span className={`material-icons text-lg md:text-xl ${iconColor}`}>
                                                {iconName}
                                            </span>
                                        </div>

                                        <span className={`text-[10px] font-mono font-bold mt-2 ${isToday ? 'text-accent' : 'text-txt-dim'}`}>
                                            {new Date(date + 'T12:00:00').getDate()}
                                        </span>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-[10px] px-2 py-1 rounded border border-white/20 whitespace-nowrap z-20 shadow-xl uppercase tracking-wider font-bold">
                                            {formatDateDisplay(date)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION C: Production History */}
                    <div>
                        <h3 className="text-white font-display font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-accent rounded-full"></span>
                            Production History
                        </h3>
                        <div className="bg-black/20 rounded-xl overflow-hidden border border-white/5">
                            <table className="w-full text-left text-sm text-txt-secondary">
                                <thead className="bg-white/5 text-txt-dim font-bold uppercase text-[10px] tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Reference</th>
                                        <th className="p-4 text-right">Output</th>
                                        <th className="p-4 text-right">Rate</th>
                                        <th className="p-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-xs">
                                    {data.trip_assignments.length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-txt-dim italic">No recent activity found.</td></tr>
                                    ) : (
                                        data.trip_assignments.map((trip, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 text-txt-dim">{formatDateDisplay(trip.date)}</td>
                                                <td className="p-4 font-bold text-white group-hover:text-accent transition-colors font-sans">{trip.trip_description}</td>
                                                <td className="p-4 text-right">{trip.meters_done}m</td>
                                                <td className="p-4 text-right text-txt-dim">${trip.historical_price}</td>
                                                <td className="p-4 text-right font-bold text-success shadow-[0_0_10px_rgba(34,197,94,0)] group-hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all">+${trip.total_earned}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </GlassContainer>
        </div>
    );
};

export default WorkerProfile;
