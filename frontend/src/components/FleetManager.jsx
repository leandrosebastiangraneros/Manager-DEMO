import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import Modal from './common/Modal';

const FleetManager = () => {
    const { showAlert, showConfirm } = useDialog();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form Stats
    const [formData, setFormData] = useState({
        name: '', plate: '', type: 'TRUCK', current_km: 0, next_service_km: 10000
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/vehicles`);
            if (res.ok) {
                const data = await res.json();
                setVehicles(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = editingId ? `${API_URL}/vehicles/${editingId}` : `${API_URL}/vehicles`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showAlert(editingId ? "Vehículo actualizado" : "Vehículo registrado", "success");
                setShowForm(false);
                setFormData({ name: '', plate: '', type: 'TRUCK', current_km: 0, next_service_km: 10000 });
                setEditingId(null);
                loadVehicles();
            } else {
                showAlert("Error al guardar vehículo", "error");
            }
        } catch (error) {
            showAlert("Error de conexión", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleService = async (veh) => {
        const confirm = await showConfirm(`¿Registrar servicio realizado para ${veh.name}? Esto reseteará el contador de mantenimiento.`);
        if (!confirm) return;

        try {
            const res = await fetch(`${API_URL}/vehicles/${veh.id}/service`, { method: 'PUT' });
            if (res.ok) {
                showAlert("Servicio registrado correctamente", "success");
                loadVehicles();
            }
        } catch (error) {
            showAlert("Error registrando servicio", "error");
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'TRUCK': return 'local_shipping';
            case 'UTE': return 'airport_shuttle'; // Camioneta
            case 'VAN': return 'directions_bus';
            case 'CAR': return 'directions_car';
            default: return 'commute';
        }
    };

    const getStatusColor = (v) => {
        if (v.status === 'MAINTENANCE') return 'bg-red-500/10 text-red-500 border-red-500/50';
        // Check KM
        if (v.next_service_km && v.current_km >= v.next_service_km) return 'bg-orange-500/10 text-orange-500 border-orange-500/50';
        if (v.next_service_km && v.current_km >= (v.next_service_km - 1000)) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50';
        return 'bg-accent/10 text-accent border-accent/50';
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 flex-none">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <span className="material-icons text-accent">garage</span>
                    CONTROL DE FLOTA
                </h3>
                <Button
                    variant="neon"
                    icon={<span className="material-icons">add</span>}
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', plate: '', type: 'TRUCK', current_km: 0, next_service_km: 10000 });
                        setShowForm(true);
                    }}
                >
                    AGREGAR VEHÍCULO
                </Button>
            </div>

            {/* Grid List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map(veh => {
                        const styleClass = getStatusColor(veh);
                        const percentService = veh.next_service_km ? Math.min(100, (veh.current_km / veh.next_service_km) * 100) : 0;

                        return (
                            <GlassContainer key={veh.id} className={`p-0 overflow-hidden group hover:border-white/30 transition-colors`}>
                                <div className="p-4 flex justify-between items-start border-b border-white/5 bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg border ${styleClass}`}>
                                            <span className="material-icons">{getTypeIcon(veh.type)}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-base">{veh.name}</h4>
                                            <div className="text-xs font-mono text-txt-dim bg-white/10 px-1.5 py-0.5 rounded inline-block mt-1">
                                                {veh.plate}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Status Badge */}
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${styleClass}`}>
                                        {veh.status}
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Mileage Bar */}
                                    <div>
                                        <div className="flex justify-between text-[10px] text-txt-dim uppercase font-bold mb-1">
                                            <span>Estado de Servicio</span>
                                            <span>{veh.current_km.toLocaleString()} / {veh.next_service_km?.toLocaleString() || '?'} km</span>
                                        </div>
                                        <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                                            <div
                                                className={`h-full transition-all duration-500 ${percentService > 90 ? 'bg-red-500' : percentService > 75 ? 'bg-orange-500' : 'bg-success'}`}
                                                style={{ width: `${percentService}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full text-[10px]"
                                            onClick={() => {
                                                setEditingId(veh.id);
                                                setFormData({ ...veh });
                                                setShowForm(true);
                                            }}
                                        >
                                            EDITAR
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="w-full text-[10px] hover:text-accent hover:border-accent"
                                            onClick={() => handleService(veh)}
                                        >
                                            SERVICIO REALIZADO
                                        </Button>
                                    </div>
                                </div>
                            </GlassContainer>
                        );
                    })}
                    {vehicles.length === 0 && !loading && (
                        <div className="col-span-full text-center py-20 text-txt-dim opacity-50">
                            <span className="material-icons text-4xl block mb-2">no_transfer</span>
                            NO HAY VEHÍCULOS EN LA FLOTA
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Form */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? "Editar Vehículo" : "Nuevo Vehículo"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-txt-dim uppercase font-bold">Nombre del Vehículo</label>
                        <input
                            required
                            className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ej. Ford Transit 01"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-txt-dim uppercase font-bold">Patente</label>
                            <input
                                required
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white font-mono uppercase focus:border-accent outline-none"
                                value={formData.plate}
                                onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                                placeholder="AA-123-BB"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-txt-dim uppercase font-bold">Tipo</label>
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="TRUCK">Camión</option>
                                <option value="UTE">Camioneta</option>
                                <option value="VAN">Furgón / Van</option>
                                <option value="CAR">Auto</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-txt-dim uppercase font-bold">Odómetro Actual (km)</label>
                            <input
                                type="number"
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none"
                                value={formData.current_km}
                                onChange={e => setFormData({ ...formData, current_km: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-txt-dim uppercase font-bold">Próximo Servicio (km)</label>
                            <input
                                type="number"
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none"
                                value={formData.next_service_km}
                                onChange={e => setFormData({ ...formData, next_service_km: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-4">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button type="submit" variant="neon" className="flex-1">Guardar Vehículo</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default FleetManager;
