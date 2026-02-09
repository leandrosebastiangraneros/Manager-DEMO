import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { getTodayArgentina, formatLongDate } from '../utils/dateUtils';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const Attendance = () => {
    // 1. Initialize with robust Argentina Date
    const [employees, setEmployees] = useState([]);
    const [groups, setGroups] = useState([]);
    const [attendance, setAttendance] = useState({}); // { emp_id: true/false }
    const [date, setDate] = useState(getTodayArgentina());

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        if (!date || date === 'Invalid Date' || isNaN(new Date(date).getTime())) {
            setMessage({ type: 'error', text: 'Fecha inválida detectada.' });
            return;
        }

        setLoading(true);
        try {
            // 1. Cargar Empleados y Grupos
            const [empRes, groupRes, attRes] = await Promise.all([
                fetch(`${API_URL}/employees`),
                fetch(`${API_URL}/employee-groups`),
                fetch(`${API_URL}/attendance/${date}`)
            ]);

            // Check for HTTP errors
            if (!empRes.ok || !groupRes.ok || !attRes.ok) {
                console.error("Fetch error:", empRes.status, groupRes.status, attRes.status);
                throw new Error("Error en la respuesta del servidor");
            }

            const emps = await empRes.json();
            const grps = await groupRes.json();
            const attData = await attRes.json();

            // Validate Groups
            if (Array.isArray(grps)) {
                setGroups(grps);
            } else {
                console.warn("Grupos formato incorrecto (esperaba array):", grps);
                setGroups([]);
            }

            // ... process attendance ...
            const attMap = {};
            if (Array.isArray(attData)) {
                attData.forEach(a => {
                    attMap[a.employee_id] = a.is_present;
                });
            }

            if (Array.isArray(emps)) {
                setEmployees(emps);
            } else {
                console.error("Empleados no es un array:", emps);
                setEmployees([]);
                setMessage({ type: 'error', text: 'Error: Datos de empleados inválidos.' });
            }

            setAttendance(attMap);

        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error cargando datos de asistencia.' });
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = (empId) => {
        setAttendance(prev => ({
            ...prev,
            [empId]: !prev[empId]
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        const payload = employees.map(emp => ({
            employee_id: emp.id,
            is_present: !!attendance[emp.id],
            date: date
        }));

        try {
            const res = await fetch(`${API_URL}/attendance/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Asistencia Guardada.' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Error al Guardar.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error de Conexión.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => {
        try {
            const d = new Date(date + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            setDate(d.toISOString().split('T')[0]);
        } catch (e) {
            console.error("Error changing date", e);
        }
    };

    const handleNextDay = () => {
        try {
            const d = new Date(date + 'T12:00:00');
            d.setDate(d.getDate() + 1);
            setDate(d.toISOString().split('T')[0]);
        } catch (e) {
            console.error("Error changing date", e);
        }
    };

    const markAll = (status) => {
        const newAtt = {};
        employees.forEach(e => newAtt[e.id] = status);
        setAttendance(newAtt);
    };

    // Stats
    const totalEmps = employees.length;
    const presentCount = Object.values(attendance).filter(Boolean).length;
    const absentCount = totalEmps - presentCount; // Calculates relative to loaded employees, simplistic but fine for now
    // Actually typically totalEmps - presentCount is correct if all employees are in the list.

    const formattedDate = formatLongDate(date);

    return (
        <GlassContainer className="relative overflow-hidden p-4 md:p-6">
            {/* Header / Date Nav */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 z-10 relative border-b border-white/5 pb-6">
                <h2 className="text-xl font-display font-bold flex items-center gap-3 text-white">
                    <span className="material-icons text-accent">playlist_add_check</span>
                    CONTROL DE ASISTENCIA
                </h2>

                <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-xl p-1 shadow-lg">
                    <button
                        onClick={handlePrevDay}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-txt-secondary hover:text-white transition-colors border border-transparent hover:border-white/5"
                    >
                        <span className="material-icons">chevron_left</span>
                    </button>

                    <div className="relative group px-4 py-1 text-center min-w-[200px] flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 rounded-lg transition-colors">
                        <label className="text-[9px] text-txt-dim font-bold uppercase tracking-widest block mb-0.5">Fecha Operativa</label>
                        <div className="text-white font-mono font-bold capitalize text-sm whitespace-nowrap">
                            {formattedDate}
                        </div>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>

                    <button
                        onClick={handleNextDay}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-txt-secondary hover:text-white transition-colors border border-transparent hover:border-white/5"
                    >
                        <span className="material-icons">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-col xl:flex-row gap-6 mb-8">
                {/* Stats Cards */}
                <div className="flex flex-1 gap-4">
                    <GlassContainer className="flex-1 !p-4 flex items-center justify-between !bg-success/5 !border-success/20">
                        <div>
                            <span className="block text-success text-[10px] font-bold uppercase tracking-widest mb-1">Presentes</span>
                            <span className="text-3xl font-mono font-bold text-white">{presentCount}</span>
                        </div>
                        <div className="bg-success/20 p-2 rounded-full">
                            <span className="material-icons text-success">check</span>
                        </div>
                    </GlassContainer>
                    <GlassContainer className="flex-1 !p-4 flex items-center justify-between !bg-error/5 !border-error/20">
                        <div>
                            <span className="block text-error text-[10px] font-bold uppercase tracking-widest mb-1">Ausentes</span>
                            <span className="text-3xl font-mono font-bold text-white">{absentCount}</span>
                        </div>
                        <div className="bg-error/20 p-2 rounded-full">
                            <span className="material-icons text-error">close</span>
                        </div>
                    </GlassContainer>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5 justify-center">
                    <Button size="sm" variant="ghost" onClick={() => markAll(true)} className="gap-2">
                        <span className="material-icons text-success text-sm">done_all</span> Todos
                    </Button>
                    <div className="w-px h-6 bg-white/10"></div>
                    <Button size="sm" variant="ghost" onClick={() => markAll(false)} className="gap-2">
                        <span className="material-icons text-error text-sm">remove_circle_outline</span> Ninguno
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <span className="material-icons text-4xl animate-spin text-accent">sync</span>
                </div>
            ) : (
                <div className="space-y-8 mb-8">
                    {employees.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-txt-dim bg-white/5 rounded-xl border border-dashed border-white/10">
                            <span className="material-icons text-4xl mb-4 opacity-50">group_off</span>
                            <p className="font-mono text-xs uppercase tracking-widest">No se encontraron empleados</p>
                        </div>
                    )}

                    {/* Render Groups */}
                    {groups.map(group => {
                        const groupEmps = employees.filter(e => e.group_id === group.id);
                        if (groupEmps.length === 0) return null;

                        return (
                            <div key={group.id} className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                <h3 className="text-white font-bold mb-4 flex items-center text-sm uppercase tracking-widest">
                                    <span className="material-icons text-txt-secondary text-sm mr-2">layers</span>
                                    {group.name}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                    {groupEmps.map(emp => {
                                        const isPresent = !!attendance[emp.id];
                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => toggleAttendance(emp.id)}
                                                className={`
                                                        cursor-pointer relative p-4 rounded-xl border transition-all duration-300 group overflow-hidden
                                                        flex flex-col items-center justify-center text-center gap-3 h-32
                                                        ${isPresent
                                                        ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(0,255,157,0.2)]'
                                                        : 'bg-surface border-white/5 hover:border-white/20 hover:bg-white/5 opacity-60 hover:opacity-100'}
                                                    `}
                                            >
                                                <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-1 shadow-lg relative z-10 transition-colors duration-300 font-mono
                                                        ${isPresent ? 'bg-success text-black' : 'bg-white/10 text-txt-dim group-hover:bg-white/20 group-hover:text-white'}
                                                    `}>
                                                    {emp.name.charAt(0)}
                                                    {isPresent && (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center border border-success">
                                                            <span className="material-icons text-success text-[10px] font-bold">check</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <span className={`font-bold text-xs leading-tight relative z-10 transition-colors duration-300 ${isPresent ? 'text-white' : 'text-txt-dim group-hover:text-white'}`}>
                                                    {emp.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Render Without Group */}
                    {employees.filter(e => !e.group_id).length > 0 && (
                        <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                            <h3 className="text-txt-dim font-bold mb-4 flex items-center text-sm uppercase tracking-widest">
                                <span className="material-icons text-txt-dim text-sm mr-2">error_outline</span>
                                Unassigned
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                {employees.filter(e => !e.group_id).map(emp => {
                                    const isPresent = !!attendance[emp.id];
                                    return (
                                        <div
                                            key={emp.id}
                                            onClick={() => toggleAttendance(emp.id)}
                                            className={`
                                                    cursor-pointer relative p-4 rounded-xl border transition-all duration-300 group overflow-hidden
                                                    flex flex-col items-center justify-center text-center gap-3 h-32
                                                    ${isPresent
                                                    ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(0,255,157,0.2)]'
                                                    : 'bg-surface border-white/5 hover:border-white/20 hover:bg-white/5 opacity-60 hover:opacity-100'}
                                                `}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-1 shadow-lg relative z-10 transition-colors duration-300 font-mono ${isPresent ? 'bg-success text-black' : 'bg-white/10 text-txt-dim group-hover:bg-white/20 group-hover:text-white'}`}>
                                                {emp.name.charAt(0)}
                                            </div>
                                            <span className={`font-bold text-xs leading-tight relative z-10 transition-colors duration-300 ${isPresent ? 'text-white' : 'text-txt-dim group-hover:text-white'}`}>{emp.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-white/5 gap-4">
                <div className="flex items-center gap-2 text-txt-dim text-xs bg-white/5 px-3 py-2 rounded-lg border border-white/5 font-mono">
                    <span className="material-icons text-sm">info</span>
                    {date === getTodayArgentina()
                        ? "Editando Asistencia DE HOY"
                        : "Editando Fecha PASADA/FUTURA"
                    }
                </div>

                <Button
                    onClick={handleSave}
                    disabled={loading || employees.length === 0}
                    variant="neon"
                    className="w-full md:w-auto"
                    icon={<span className="material-icons">save</span>}
                >
                    {loading ? 'Guardando...' : 'CONFIRMAR ASISTENCIA'}
                </Button>
            </div>

            {message && (
                <div className={`mt-6 p-4 rounded-xl flex items-center shadow-lg animate-[fadeIn_0.3s_ease-out] border ${message.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error'}`}>
                    <span className="material-icons mr-3">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                    <span className="font-bold text-sm">{message.text}</span>
                </div>
            )}
        </GlassContainer>
    );
};

export default Attendance;
