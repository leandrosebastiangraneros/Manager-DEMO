import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import { getTodayArgentina } from '../utils/dateUtils';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import { toast } from 'sonner';

const TripStart = ({ onSuccess }) => {
    const { showConfirm } = useDialog();
    const [loading, setLoading] = useState(false);

    // Form Data
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(getTodayArgentina());
    const [selectedVehicle, setSelectedVehicle] = useState("");

    // Lists
    const [employees, setEmployees] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    // Selection State
    const [selectedEmployees, setSelectedEmployees] = useState({}); // { emp_id: { is_present: true } }
    const [selectedMaterials, setSelectedMaterials] = useState([]); // Array of { stock_item_id, quantity_out }

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Get Employees + Attendance for date
            const empRes = await fetch(`${API_URL}/employees`);
            const empsData = await empRes.json();

            const attRes = await fetch(`${API_URL}/attendance/${date}`);
            const attData = await attRes.json();

            // Map attendance for quick lookup
            const attMap = {};
            attData.forEach(a => attMap[a.employee_id] = a.is_present);

            // Merge logic
            const mergedEmps = empsData.map(e => ({
                ...e,
                today_present: !!attMap[e.id] // Default false if not checked
            }));

            setEmployees(mergedEmps);

            // 2. Get Stock (Available only)
            const stockRes = await fetch(`${API_URL}/stock`);
            const stockData = await stockRes.json();
            // Filter only AVAILABLE items
            setStockItems(stockData.filter(s => s.status === 'AVAILABLE' && s.quantity > 0));

            // 3. Get Vehicles
            const vehRes = await fetch(`${API_URL}/vehicles`);
            const vehData = await vehRes.json();
            setVehicles(vehData.filter(v => v.status === 'OPERATIONAL'));

        } catch (err) {
            console.error(err);
            toast.error("Error cargando datos del sistema.");
        } finally {
            setLoading(false);
        }
    };

    const toggleEmployee = (emp) => {
        setSelectedEmployees(prev => {
            const newState = { ...prev };
            if (newState[emp.id]) {
                delete newState[emp.id];
            } else {
                newState[emp.id] = { is_present: true };
            }
            return newState;
        });
    };

    const handleMaterialChange = (stockId, qty) => {
        setSelectedMaterials(prev => {
            const exists = prev.find(m => m.stock_item_id === stockId);
            if (exists) {
                return prev.map(m => m.stock_item_id === stockId ? { ...m, quantity_out: parseFloat(qty) } : m);
            } else {
                return [...prev, { stock_item_id: stockId, quantity_out: parseFloat(qty) }];
            }
        });
    };

    const removeMaterial = (stockId) => {
        setSelectedMaterials(prev => prev.filter(m => m.stock_item_id !== stockId));
    };

    const handleSubmit = async () => {
        if (!description) return toast.warning("Falta la descripción del viaje.");
        if (Object.keys(selectedEmployees).length === 0) return toast.warning("Debes asignar al menos un chofer/obrero.");

        // Simulating Coordinates around Buenos Aires for Demo
        const baseLat = -34.6037;
        const baseLng = -58.3816;
        const randomLat = baseLat + (Math.random() - 0.5) * 0.1;
        const randomLng = baseLng + (Math.random() - 0.5) * 0.1;

        const payload = {
            description,
            date,
            vehicle_id: selectedVehicle ? parseInt(selectedVehicle) : null,
            destination_lat: randomLat,
            destination_lng: randomLng,
            employees: Object.keys(selectedEmployees).map(id => ({
                employee_id: parseInt(id),
                is_present: true
            })),
            materials: selectedMaterials.filter(m => m.quantity_out > 0)
        };

        const confirm = await showConfirm(`¿Confirmar salida con ${payload.employees.length} personas y ${payload.materials.length} materiales?`);
        if (!confirm) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/trips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("¡Viaje iniciado correctamente!");
                // Reset form or redirect
                setDescription("");
                setSelectedVehicle("");
                setSelectedEmployees({});
                setSelectedMaterials([]);
                if (onSuccess) onSuccess();
            } else {
                toast.error("Error al crear viaje.");
            }
        } catch (err) {
            toast.error("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Header Form */}
            <GlassContainer className="p-4 md:p-6">
                <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                    <span className="material-icons text-accent">local_shipping</span>
                    INICIAR NUEVO ENVÍO
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-txt-dim text-xs font-bold uppercase tracking-widest mb-2 block">Fecha Operativa</label>
                        <input
                            type="date"
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-white focus:border-accent outline-none transition-colors"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-txt-dim text-xs font-bold uppercase tracking-widest mb-2 block">Descripción del Destino</label>
                        <input
                            type="text"
                            placeholder="ej. Zona Norte - Fase 2"
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-white focus:border-accent outline-none placeholder-white/20 transition-colors"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-txt-dim text-xs font-bold uppercase tracking-widest mb-2 block">Asignar Vehículo</label>
                        <select
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-white focus:border-accent outline-none transition-colors"
                            value={selectedVehicle}
                            onChange={e => setSelectedVehicle(e.target.value)}
                        >
                            <option value="">-- Sin Vehículo --</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </GlassContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Cuadrilla Selector (Mobile Friendly) */}
                <GlassContainer className="p-0 overflow-hidden flex flex-col h-full border-accent/20">
                    <div className="p-5 border-b border-white/5 bg-accent/5 flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1 h-4 bg-accent rounded-full"></span>
                            1. Seleccionar Cuadrilla
                        </h3>
                        <span className="text-[10px] font-bold bg-accent text-black px-2 py-1 rounded shadow-[0_0_10px_#00f0ff]">
                            {Object.keys(selectedEmployees).length} Seleccionados
                        </span>
                    </div>

                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {employees.map(emp => {
                            const isSelected = !!selectedEmployees[emp.id];
                            const isAbsent = !emp.today_present; // Variable from Step 2 Check-in

                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => toggleEmployee(emp)}
                                    className={`
                                        p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between group
                                        ${isSelected
                                            ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                                            : 'border-white/5 hover:border-white/20 hover:bg-white/5'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${emp.today_present ? 'bg-success shadow-[0_0_8px_#00ff9d]' : 'bg-error shadow-[0_0_8px_#ff003c]'}`}></div>
                                        <div>
                                            <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-txt-secondary group-hover:text-white'}`}>{emp.name}</p>
                                            {isAbsent && (
                                                <p className="text-[10px] text-error flex items-center mt-1 font-bold uppercase tracking-wide">
                                                    <span className="material-icons text-[10px] mr-1">warning</span>
                                                    Ausente Hoy
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected && <span className="material-icons text-accent animate-[fadeIn_0.2s_ease-out]">check_circle</span>}
                                </div>
                            );
                        })}
                    </div>
                </GlassContainer>

                {/* Material Selector */}
                <GlassContainer className="p-0 overflow-hidden flex flex-col h-full border-orange-500/20">
                    <div className="p-5 border-b border-white/5 bg-orange-500/5">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                            2. Cargar Materiales
                        </h3>
                    </div>

                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {stockItems.map(item => {
                            // Check if selected
                            const inList = selectedMaterials.find(m => m.stock_item_id === item.id);

                            return (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors group">
                                    <div className="flex-1">
                                        <p className="font-bold text-txt-secondary text-sm group-hover:text-white transition-colors">{item.name}</p>
                                        <p className="text-[10px] text-txt-dim uppercase mt-0.5">Disp: <span className="font-mono text-white">{item.quantity}</span></p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {inList ? (
                                            <>
                                                <input
                                                    type="number"
                                                    className="w-16 p-2 bg-black/40 border border-orange-500/50 rounded text-center text-sm font-mono font-bold text-orange-400 focus:outline-none focus:border-orange-500 transition-colors"
                                                    value={inList.quantity_out}
                                                    onChange={(e) => handleMaterialChange(item.id, e.target.value)}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => removeMaterial(item.id)}
                                                    className="p-2 text-txt-dim hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                                >
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleMaterialChange(item.id, 1)}
                                                className="text-orange-400 hover:text-black hover:bg-orange-400 border border-orange-400/30 hover:border-orange-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                            >
                                                + Agregar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </GlassContainer>

            </div>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-xl border-t border-white/10 p-4 md:relative md:bg-transparent md:backdrop-blur-none md:border-0 md:p-0 z-40">
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    variant="neon"
                    size="lg"
                    className="w-full shadow-2xl"
                    icon={<span className="material-icons">rocket_launch</span>}
                >
                    {loading ? 'INICIANDO...' : 'INICIAR ENVÍO'}
                </Button>
            </div>

            {/* Spacer for fixed bottom bar on mobile */}
            <div className="h-24 md:hidden"></div>

        </div>
    );
};

export default TripStart;
