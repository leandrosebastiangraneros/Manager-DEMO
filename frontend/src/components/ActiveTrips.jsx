import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import { formatDateDisplay } from '../utils/dateUtils';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const ActiveTrips = () => {
    const { showAlert, showConfirm } = useDialog();
    const [allTrips, setAllTrips] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('OPEN'); // 'ALL', 'OPEN', 'COMPLETED'

    // View Mode: 'grid' or 'table'
    const [layoutMode, setLayoutMode] = useState('grid');

    // Config Price for Estimation
    const [meterPrice, setMeterPrice] = useState(0);

    // Editing State (Closing a Trip)
    const [editingTrip, setEditingTrip] = useState(null);
    const [returnMaterials, setReturnMaterials] = useState({}); // { trip_mat_id: returned_qty }
    const [production, setProduction] = useState({}); // { trip_emp_id: meters }

    const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'progress'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/trips`);
            const data = await res.json();
            // Store ALL trips
            setAllTrips(Array.isArray(data) ? data : []);

            // Get Price for estimation
            const priceRes = await fetch(`${API_URL}/config/meter_price`);
            const priceData = await priceRes.json();
            setMeterPrice(parseFloat(priceData.value || 0));

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Derived Data & KPIs ---
    const filteredTrips = useMemo(() => {
        return allTrips.filter(trip => {
            const matchesSearch =
                trip.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.id.toString().includes(searchTerm);

            const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [allTrips, searchTerm, statusFilter]);

    const kpiData = useMemo(() => {
        const activedev = allTrips.filter(t => t.status === 'OPEN').length;
        const completedToday = allTrips.filter(t => t.status === 'COMPLETED' && new Date(t.date).toDateString() === new Date().toDateString()).length;
        return { active: activedev, completedToday, total: allTrips.length };
    }, [allTrips]);


    const handleExportCSV = () => {
        const headers = ["ID", "Description", "Driver", "Date", "Status", "Materials Count", "Staff Count"];
        const rows = filteredTrips.map(t => [
            t.id,
            `"${t.description}"`,
            `"${t.driver_name || 'N/A'}"`,
            t.date,
            t.status,
            t.materials.length,
            t.assignments.length
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `logistics_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenCloseForm = (trip) => {
        setEditingTrip(trip);
        setActiveTab('materials'); // Default tab
        // Initialize state
        const initialMats = {};
        trip.materials.forEach(m => initialMats[m.id] = m.quantity_returned || 0);
        setReturnMaterials(initialMats);

        const initialProd = {};
        trip.assignments.forEach(a => initialProd[a.id] = a.meters_done || 0);
        setProduction(initialProd);
    };

    const handleSaveProgress = async () => {
        const payload = {
            employees: Object.entries(production).map(([id, meters]) => ({
                id: parseInt(id),
                meters_done: parseFloat(meters || 0)
            })),
            materials: [] // No material updates in progress save for now
        };

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/trips/${editingTrip.id}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert("Avance guardado correctamente.", "success");
                loadData();
            } else {
                showAlert("Error al guardar avance.", "error");
            }
        } catch (err) {
            showAlert("Error de conexión.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitClose = async () => {
        const confirm = await showConfirm("¿Estás seguro de cerrar esta planilla? Esto actualizará el stock y guardará la producción.");
        if (!confirm) return;

        const payload = {
            materials: Object.entries(returnMaterials).map(([id, qty]) => ({
                id: parseInt(id),
                quantity_returned: parseFloat(qty || 0)
            })),
            employees: Object.entries(production).map(([id, meters]) => ({
                id: parseInt(id),
                meters_done: parseFloat(meters || 0)
            }))
        };

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/trips/${editingTrip.id}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert("Planilla cerrada y procesada correctamente.", "success");
                setEditingTrip(null);
                loadData(); // Refresh list
            } else {
                showAlert("Error al cerrar planilla.", "error");
            }
        } catch (err) {
            showAlert("Error de conexión.", "error");
        } finally {
            setLoading(false);
        }
    };

    const calculateEstimate = (meters) => {
        return (parseFloat(meters || 0) * meterPrice).toFixed(0);
    };

    if (loading && !editingTrip) return (
        <div className="flex justify-center p-8 h-full items-center">
            <span className="material-icons text-4xl animate-spin text-accent">sync</span>
        </div>
    );

    if (editingTrip) {
        return (
            <GlassContainer className="animate-[slideUp_0.3s_ease-out] border-accent/20 h-full flex flex-col p-0 overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b border-white/5 bg-accent/5 flex-none">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                        <span className="material-icons text-accent">local_shipping</span>
                        Gestionar Envío: <span className="text-accent">{editingTrip.description}</span>
                    </h3>
                    <button onClick={() => setEditingTrip(null)} className="text-txt-dim hover:text-white transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* TABS HEADER */}
                <div className="flex border-b border-white/5 bg-black/20 flex-none">
                    <button
                        onClick={() => setActiveTab('materials')}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'materials' ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-400/5' : 'text-txt-dim hover:text-white hover:bg-white/5'}`}
                    >
                        Materiales y Devoluciones
                    </button>
                    <button
                        onClick={() => setActiveTab('progress')}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'progress' ? 'text-success border-b-2 border-success bg-success/5' : 'text-txt-dim hover:text-white hover:bg-white/5'}`}
                    >
                        Producción y Avance
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* TAB 1: MATERIALS */}
                    {activeTab === 'materials' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border border-orange-500/20 rounded-xl bg-orange-500/5 p-4 md:p-6">
                                <h4 className="font-bold text-orange-400 mb-4 flex items-center text-sm uppercase tracking-wider">
                                    <span className="material-icons mr-2 text-sm">inventory_2</span>
                                    Control de Devolución de Stock
                                </h4>
                                <div className="space-y-3">
                                    {editingTrip.materials.map(mat => (
                                        <div key={mat.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 gap-3">
                                            <div>
                                                <div className="font-bold text-white text-sm">ID Item: {mat.stock_item_id}</div>
                                                <div className="text-[10px] text-txt-dim uppercase mt-1">Cant. Inicial: <span className="font-mono text-white font-bold">{mat.quantity_out}</span></div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-surface p-1 rounded-lg border border-white/10">
                                                <label className="text-[10px] text-txt-dim font-bold uppercase px-2">Devuelto:</label>
                                                <input
                                                    type="number"
                                                    className="w-20 p-2 bg-transparent text-center text-lg font-mono font-bold text-orange-400 outline-none"
                                                    value={returnMaterials[mat.id] || ''}
                                                    onChange={(e) => setReturnMaterials({ ...returnMaterials, [mat.id]: e.target.value })}
                                                    min="0"
                                                    max={mat.quantity_out}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {editingTrip.materials.length === 0 && <p className="text-sm text-txt-dim italic">No hay materiales asignados a este envío.</p>}
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmitClose}
                                variant="danger"
                                className="w-full"
                                size="lg"
                            >
                                FINALIZAR Y CERRAR ENVÍO
                            </Button>
                        </div>
                    )}

                    {/* TAB 2: PROGRESS */}
                    {activeTab === 'progress' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border border-success/20 rounded-xl bg-success/5 p-4 md:p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/5 pb-4">
                                    <h4 className="font-bold text-success flex items-center text-sm uppercase tracking-wider">
                                        <span className="material-icons mr-2 text-sm">engineering</span>
                                        Registro de Producción (Metros)
                                    </h4>
                                    {/* Bulk Input Tool */}
                                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/10">
                                        <span className="text-[10px] text-txt-dim font-bold px-2 uppercase">Entrada Masiva:</span>
                                        <input
                                            type="number"
                                            className="w-16 bg-surface border border-white/10 rounded px-2 py-1 text-white text-xs font-mono focus:border-success outline-none"
                                            placeholder="Total"
                                            id="bulkMetersInput"
                                        />
                                        <button
                                            onClick={() => {
                                                const val = document.getElementById('bulkMetersInput').value;
                                                if (!val) return;
                                                const meters = parseFloat(val);
                                                const count = editingTrip.assignments.length;
                                                if (count === 0) return;

                                                const newProd = {};
                                                editingTrip.assignments.forEach(a => newProd[a.id] = meters);
                                                setProduction(newProd);
                                            }}
                                            className="bg-white/10 hover:bg-success hover:text-black text-white text-[10px] px-2 py-1 rounded font-bold transition-colors uppercase"
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => {
                                                const val = document.getElementById('bulkMetersInput').value;
                                                if (!val) return;
                                                const total = parseFloat(val);
                                                const count = editingTrip.assignments.length;
                                                if (count === 0) return;

                                                const perPerson = (total / count).toFixed(2);
                                                const newProd = {};
                                                editingTrip.assignments.forEach(a => newProd[a.id] = perPerson);
                                                setProduction(newProd);
                                            }}
                                            className="bg-white/10 hover:bg-accent hover:text-black text-white text-[10px] px-2 py-1 rounded font-bold transition-colors uppercase"
                                        >
                                            Dividir
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {editingTrip.assignments.map(assign => (
                                        <div key={assign.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success font-bold font-mono text-xs border border-success/30">
                                                    {assign.employee_id}
                                                </div>
                                                <span className="font-bold text-white text-sm">Operario #{assign.employee_id}</span>
                                            </div>

                                            <div className="flex items-center gap-4 justify-end w-full sm:w-auto">
                                                <div className="text-right hidden sm:block">
                                                    <div className="text-[10px] text-txt-dim uppercase tracking-wider font-bold">Est. Ganancias</div>
                                                    <div className="font-mono text-success font-bold text-sm">${calculateEstimate(production[assign.id])}</div>
                                                </div>

                                                <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-white/10">
                                                    <input
                                                        type="number"
                                                        className="w-20 p-1 bg-transparent text-center text-lg font-mono font-bold text-white outline-none"
                                                        placeholder="0.0"
                                                        value={production[assign.id] || ''}
                                                        onChange={(e) => setProduction({ ...production, [assign.id]: e.target.value })}
                                                    />
                                                    <span className="text-txt-dim font-bold text-xs pr-2">m</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <Button
                                    onClick={handleSaveProgress}
                                    variant="primary"
                                    className="flex-1"
                                    icon={<span className="material-icons">save</span>}
                                >
                                    GUARDAR AVANCE
                                </Button>
                                <Button
                                    onClick={handleSubmitClose}
                                    variant="secondary"
                                    className="flex-1"
                                    icon={<span className="material-icons">check_circle</span>}
                                >
                                    FINALIZAR
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </GlassContainer>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* 1. KPIs Section (Fixed) */}
            <div className="grid grid-cols-3 gap-4 flex-none">
                <GlassContainer className="p-3 flex flex-col items-center justify-center border-b-2 border-accent">
                    <span className="text-[9px] text-txt-dim uppercase tracking-widest font-bold">Activos</span>
                    <span className="text-xl font-display font-bold text-white mt-1">{kpiData.active}</span>
                </GlassContainer>
                <GlassContainer className="p-3 flex flex-col items-center justify-center border-b-2 border-success">
                    <span className="text-[9px] text-txt-dim uppercase tracking-widest font-bold">Terminados Hoy</span>
                    <span className="text-xl font-display font-bold text-white mt-1">{kpiData.completedToday}</span>
                </GlassContainer>
                <GlassContainer className="p-3 flex flex-col items-center justify-center border-b-2 border-white/20">
                    <span className="text-[9px] text-txt-dim uppercase tracking-widest font-bold">Historial Total</span>
                    <span className="text-xl font-display font-bold text-white mt-1">{kpiData.total}</span>
                </GlassContainer>
            </div>

            {/* 2. Controls Toolbar (Fixed) */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 flex-none">
                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto items-center">
                    <div className="flex items-center gap-2 w-full md:w-auto bg-black/40 rounded-lg border border-white/10 px-3 py-2">
                        <span className="material-icons text-txt-dim text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="bg-transparent border-none outline-none text-white text-sm font-mono placeholder-white/20 w-full md:w-32"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10 w-full md:w-auto justify-center">
                        {['ALL', 'OPEN', 'COMPLETED'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${statusFilter === status
                                    ? 'bg-white text-black'
                                    : 'text-txt-dim hover:text-white'
                                    }`}
                            >
                                {status === 'ALL' ? 'TODOS' : status === 'OPEN' ? 'ABIERTOS' : 'COMPLETADOS'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 w-full lg:w-auto justify-end">
                    {/* View Switcher */}
                    <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setLayoutMode('grid')}
                            className={`p-1.5 rounded flex items-center justify-center transition-colors ${layoutMode === 'grid' ? 'bg-white/20 text-white' : 'text-txt-dim hover:text-white'}`}
                            title="Vista Cuadrícula"
                        >
                            <span className="material-icons text-sm">grid_view</span>
                        </button>
                        <button
                            onClick={() => setLayoutMode('table')}
                            className={`p-1.5 rounded flex items-center justify-center transition-colors ${layoutMode === 'table' ? 'bg-white/20 text-white' : 'text-txt-dim hover:text-white'}`}
                            title="Vista Tabla"
                        >
                            <span className="material-icons text-sm">table_rows</span>
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<span className="material-icons text-sm">download</span>}
                        onClick={handleExportCSV}
                    >
                        CSV
                    </Button>
                </div>
            </div>

            {/* 3. Trip List (Scrollable Area) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                {filteredTrips.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-txt-dim border border-white/10 border-dashed rounded-xl bg-white/5">
                        <span className="material-icons text-4xl mb-2 opacity-30">filter_alt_off</span>
                        <span className="text-[10px] uppercase tracking-widest font-mono">No se encontraron envíos</span>
                    </div>
                ) : (
                    <>
                        {layoutMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-[fadeIn_0.3s_ease-out]">
                                {filteredTrips.map(trip => (
                                    <GlassContainer key={trip.id} className={`p-0 overflow-hidden group hover:border-white/30 transition-colors ${trip.status === 'COMPLETED' ? 'opacity-75 grayscale hover:grayscale-0' : ''}`}>
                                        {/* Card Header */}
                                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-start relative">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white to-transparent opacity-20"></div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-white text-sm line-clamp-2" title={trip.description}>{trip.description}</h4>
                                                    <span className="text-[9px] font-mono text-txt-dim bg-white/10 px-1 rounded">#{trip.id}</span>
                                                </div>
                                                <p className="text-txt-dim text-[10px] font-mono flex items-center gap-1">
                                                    <span className="material-icons text-[9px]">calendar_today</span>
                                                    {formatDateDisplay(trip.date)}
                                                </p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${trip.status === 'OPEN'
                                                ? 'bg-accent/10 text-accent border-accent/20 animate-pulse'
                                                : 'bg-white/10 text-txt-dim border-white/10'
                                                }`}>
                                                {trip.status === 'OPEN' ? 'ABIERTO' : 'CERRADO'}
                                            </span>
                                        </div>

                                        {/* Card Stats */}
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center justify-between text-[10px]">
                                                <div className="flex items-center text-txt-secondary font-bold uppercase tracking-wider gap-2">
                                                    <span className="material-icons text-xs text-txt-dim">face</span>
                                                    {trip.driver_name || 'Sin Chofer'}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-black/20 p-1.5 rounded border border-white/5 text-center">
                                                    <div className="material-icons text-secondary text-xs mb-0.5">groups</div>
                                                    <div className="text-sm font-bold text-white">{trip.assignments.length}</div>
                                                    <div className="text-[8px] text-txt-dim uppercase">Personal</div>
                                                </div>
                                                <div className="bg-black/20 p-1.5 rounded border border-white/5 text-center">
                                                    <div className="material-icons text-secondary text-xs mb-0.5">category</div>
                                                    <div className="text-sm font-bold text-white">{trip.materials.length}</div>
                                                    <div className="text-[8px] text-txt-dim uppercase">Items</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Action */}
                                        <div className="p-4 pt-0">
                                            {trip.status === 'OPEN' ? (
                                                <Button
                                                    onClick={() => handleOpenCloseForm(trip)}
                                                    variant="secondary"
                                                    className="w-full group-hover:bg-accent group-hover:text-black group-hover:border-accent transition-all h-8 text-xs"
                                                    size="sm"
                                                    icon={<span className="material-icons text-xs">edit_note</span>}
                                                >
                                                    Gestionar
                                                </Button>
                                            ) : (
                                                <div className="w-full py-1.5 text-center text-[9px] text-txt-dim font-mono uppercase border border-white/5 rounded select-none">
                                                    Archivado
                                                </div>
                                            )}
                                        </div>
                                    </GlassContainer>
                                ))}
                            </div>
                        ) : (
                            /* TABLE LAYOUT */
                            <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10 animate-[fadeIn_0.3s_ease-out]">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 border-b border-white/10">
                                        <tr>
                                            <th className="p-3 text-[9px] font-bold text-txt-dim uppercase tracking-widest w-16">Estado</th>
                                            <th className="p-3 text-[9px] font-bold text-txt-dim uppercase tracking-widest">Descripción</th>
                                            <th className="p-3 text-[9px] font-bold text-txt-dim uppercase tracking-widest hidden md:table-cell">Chofer</th>
                                            <th className="p-3 text-[9px] font-bold text-txt-dim uppercase tracking-widest hidden md:table-cell">Fecha</th>
                                            <th className="p-3 text-[9px] font-bold text-txt-dim uppercase tracking-widest text-center w-20">Recursos</th>
                                            <th className="p-3 text-[9px] font-bold text-txt-dim uppercase tracking-widest text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredTrips.map(trip => (
                                            <tr key={trip.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-3">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${trip.status === 'OPEN' ? 'bg-accent animate-pulse' : 'bg-txt-dim'}`}></span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-bold text-white text-xs">{trip.description}</div>
                                                    <div className="text-[9px] font-mono text-txt-dim">ID: {trip.id}</div>
                                                </td>
                                                <td className="p-3 hidden md:table-cell text-[10px] text-txt-secondary">
                                                    {trip.driver_name || '-'}
                                                </td>
                                                <td className="p-3 hidden md:table-cell text-[10px] font-mono text-txt-dim">
                                                    {formatDateDisplay(trip.date)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded border border-white/5" title="Workers">
                                                            <span className="material-icons text-[9px] mr-1">groups</span>{trip.assignments.length}
                                                        </span>
                                                        <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded border border-white/5" title="Materials">
                                                            <span className="material-icons text-[9px] mr-1">category</span>{trip.materials.length}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {trip.status === 'OPEN' ? (
                                                        <button
                                                            onClick={() => handleOpenCloseForm(trip)}
                                                            className="text-white hover:text-accent transition-colors p-1"
                                                            title="Gestionar"
                                                        >
                                                            <span className="material-icons text-sm">edit_note</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-txt-dim text-[9px] uppercase">Cerrado</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ActiveTrips;
