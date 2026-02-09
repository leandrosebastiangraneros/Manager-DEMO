import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';

const CalendarView = () => {
    const [events, setEvents] = useState([]);

    // Simple state for filtering Month/Year (Default to current)
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        try {
            const res = await fetch(`${API_URL}/calendar/events`);
            if (res.ok) {
                const data = await res.json();
                setEvents(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to get days in month
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);

    // Selected Event Modal
    const [selectedEvent, setSelectedEvent] = useState(null);

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-wide mb-1 flex items-center gap-2">
                        <span className="material-icons text-accent">calendar_month</span>
                        MASTER <span className="text-secondary">CALENDAR</span>
                    </h1>
                    <p className="text-txt-dim text-sm font-mono uppercase tracking-widest">Monthly Operational View</p>
                </div>

                <GlassContainer className="px-1 py-1 flex items-center gap-2 rounded-full">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-txt-dim hover:text-white"
                    >
                        <span className="material-icons">chevron_left</span>
                    </button>
                    <span className="font-bold text-sm min-w-[150px] text-center capitalize text-white font-mono">
                        {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-txt-dim hover:text-white"
                    >
                        <span className="material-icons">chevron_right</span>
                    </button>
                </GlassContainer>
            </header>

            {/* Calendar Grid */}
            <GlassContainer className="p-0 overflow-hidden border-white/5">
                <div className="grid grid-cols-7 border-b border-white/5 bg-black/40 text-txt-dim text-[10px] font-bold uppercase text-center py-4 tracking-widest">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>

                <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] bg-black/20">
                    {/* Empty cells */}
                    {[...Array(firstDay)].map((_, i) => (
                        <div key={`empty-${i}`} className="border-r border-b border-white/5 bg-white/[0.02]"></div>
                    ))}

                    {/* Days */}
                    {[...Array(days)].map((_, i) => {
                        const dayNum = i + 1;
                        // Construct ISO date string YYYY-MM-DD for matching
                        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                        const dateStr = checkDate.toISOString().split('T')[0];
                        const isToday = new Date().toDateString() === checkDate.toDateString();

                        const dayEvents = events.filter(e => e.start.startsWith(dateStr));

                        return (
                            <div key={dayNum} className={`border-r border-b border-white/5 p-3 min-h-[140px] transition-colors hover:bg-white/5 group relative ${isToday ? 'bg-accent/5' : ''}`}>
                                <div className={`text-right font-mono text-sm mb-3 ${isToday ? 'text-accent font-bold' : 'text-txt-dim'}`}>{dayNum}</div>

                                <div className="space-y-1.5">
                                    {dayEvents.map(evt => (
                                        <div
                                            key={evt.id}
                                            onClick={() => setSelectedEvent(evt)}
                                            className="bg-secondary/10 border border-secondary/30 text-secondary text-[10px] p-1.5 rounded cursor-pointer hover:bg-secondary hover:text-black hover:font-bold transition-all truncate shadow-sm hover:shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                        >
                                            <span className="font-bold mr-1 text-[8px] uppercase tracking-wider">●</span>
                                            {evt.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlassContainer>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                    <GlassContainer className="w-full max-w-md !p-0 overflow-hidden relative border-secondary/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                        <div className="p-5 bg-secondary/10 border-b border-white/5 flex justify-between items-start">
                            <div className="pr-4">
                                <h3 className="text-lg font-bold text-white font-display uppercase tracking-wide leading-tight">{selectedEvent.title}</h3>
                                <span className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1 block">Finished Operation</span>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-txt-dim hover:text-white transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center text-center">
                                <span className="text-txt-dim text-[10px] uppercase tracking-widest font-bold mb-2">Total Output</span>
                                <div className="text-4xl font-mono font-bold text-success drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                    {selectedEvent.extendedProps.meters?.toFixed(2)}<span className="text-base text-txt-dim ml-1">m</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col justify-center items-center">
                                    <span className="material-icons text-secondary mb-2 opacity-50">groups</span>
                                    <span className="text-txt-dim text-[10px] uppercase font-bold tracking-wider">Personnel</span>
                                    <span className="text-white font-mono font-bold text-xl mt-1">{selectedEvent.extendedProps.driver_count}</span>
                                </div>
                                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col justify-center items-center">
                                    <span className="material-icons text-orange-500 mb-2 opacity-50">inventory_2</span>
                                    <span className="text-txt-dim text-[10px] uppercase font-bold tracking-wider">Materials</span>
                                    <span className="text-white font-mono font-bold text-xl mt-1">{selectedEvent.extendedProps.materials_count}</span>
                                </div>
                            </div>
                        </div>
                    </GlassContainer>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
