import React, { useEffect, useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import WorkerProfile from './WorkerProfile';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const Personal = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [meterPrice, setMeterPrice] = useState(0);

    const { showAlert, showConfirm } = useDialog();

    // Stock for withdrawal
    const [stock, setStock] = useState([]);
    const [usageModalOpen, setUsageModalOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [usageQuantity, setUsageQuantity] = useState('1');

    // Advances state
    const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [advanceDesc, setAdvanceDesc] = useState('');

    // Draft state for "Excel-like" entries
    const [drafts, setDrafts] = useState({}); // { employeeId: { meters: '', date: '' } }

    // History state
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistoryEmp, setSelectedHistoryEmp] = useState(null);

    const fetchGroups = () => {
        setLoading(true);
        fetch(`${API_URL}/employee-groups`)
            .then(data => {
                setGroups(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error personal:", err);
                setLoading(false);
            });
    };

    const fetchStock = () => {
        fetch(`${API_URL}/stock`)
            .then(data => setStock((Array.isArray(data) ? data : []).filter(i => i.quantity > 0)))
            .catch(err => console.error("Error stock:", err));
    };

    const fetchPrice = async () => {
        try {
            const res = await fetch(`${API_URL}/config/meter_price`);
            if (res.ok) {
                const data = await res.json();
                setMeterPrice(parseFloat(data.value) || 0);
            }
        } catch (err) {
            console.error("Error fetching price:", err);
        }
    };

    useEffect(() => {
        fetchGroups();
        fetchStock();
        fetchPrice();
    }, []);

    const handleCreateGroup = (e) => {
        e.preventDefault();
        if (!newGroupName) return;
        fetch(`${API_URL}/employee-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newGroupName })
        }).then(() => {
            setNewGroupName('');
            fetchGroups();
            showAlert("Grupo creado", "success");
        });
    };

    const handleCreateEmployee = (e) => {
        e.preventDefault();
        if (!newEmployeeName || !selectedGroupId) return;
        fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newEmployeeName, group_id: selectedGroupId })
        }).then(() => {
            setNewEmployeeName('');
            fetchGroups();
            showAlert("Empleado agregado", "success");
        });
    };

    const handleDeleteEmployee = async (id) => {
        const confirmed = await showConfirm("¿Seguro que deseas eliminar a este empleado?");
        if (!confirmed) return;

        fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' })
            .then(() => {
                fetchGroups();
                showAlert("Empleado eliminado", "success");
            });
    };

    const handleDraftChange = (empId, field, value) => {
        setDrafts(prev => ({
            ...prev,
            [empId]: {
                ...(prev[empId] || { meters: '0', date: new Date().toISOString().split('T')[0] }),
                [field]: value
            }
        }));
    };

    const handlePay = (empId) => {
        const draft = drafts[empId];
        if (!draft || !draft.meters || draft.meters <= 0) {
            showAlert("Ingresa los metros realizados.", "error");
            return;
        }

        fetch(`${API_URL}/employees/${empId}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meters: parseFloat(draft.meters),
                date: draft.date ? new Date(draft.date).toISOString() : null
            })
        })
            .then(res => res.json())
            .then(() => {
                showAlert("Pago registrado y reflejado en el Dashboard.", "success");
                setDrafts(prev => {
                    const newDrafts = { ...prev };
                    delete newDrafts[empId];
                    return newDrafts;
                });
                fetchGroups();
            })
            .catch(err => showAlert("Error: " + err, "error"));
    };

    const handleOpenUsage = (emp) => {
        setSelectedEmp(emp);
        setSelectedMaterialId('');
        setUsageQuantity('1');
        setUsageModalOpen(true);
        fetchStock();
    };

    const handleRecordUsage = (e) => {
        e.preventDefault();
        if (!selectedMaterialId || !usageQuantity) return;

        fetch(`${API_URL}/stock/${selectedMaterialId}/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: selectedEmp.id,
                quantity: parseFloat(usageQuantity),
                description: `Retirado por ${selectedEmp.name}`
            })
        })
            .then(res => {
                if (!res.ok) throw new Error("Stock insuficiente o error");
                return res.json();
            })
            .then(() => {
                showAlert("Uso de material registrado.", "success");
                setUsageModalOpen(false);
                fetchStock();
            })
            .catch(err => showAlert(err.message, "error"));
    };

    const handleOpenAdvance = (emp) => {
        setSelectedEmp(emp);
        setAdvanceAmount('');
        setAdvanceDesc('');
        setAdvanceModalOpen(true);
    };

    const handleRecordAdvance = (e) => {
        e.preventDefault();
        const amount = parseFloat(advanceAmount);
        if (isNaN(amount) || amount <= 0) return;

        fetch(`${API_URL}/employees/${selectedEmp.id}/advances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                description: advanceDesc
            })
        })
            .then(res => res.json())
            .then(() => {
                showAlert("Adelanto registrado correctamente.", "success");
                setAdvanceModalOpen(false);
                fetchGroups();
            })
            .catch(err => showAlert("Error: " + err, "error"));
    };

    const handleOpenHistory = (emp) => {
        setSelectedHistoryEmp(emp);
        setHistoryModalOpen(true);
    };

    const formatMoney = (val) => val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin">badge</span>
            <div className="font-mono text-xs uppercase tracking-widest">Loading Personnel Database...</div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-wide mb-2">
                        GESTIÓN DE <span className="text-accent">PERSONAL</span>
                    </h1>
                    <p className="text-txt-dim text-sm max-w-md">
                        Control de producción, adelantos y nómina.
                    </p>
                </div>

                <form onSubmit={handleCreateGroup} className="flex gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Nombre del Nuevo Grupo"
                        className="p-3 bg-surface-highlight border border-white/10 rounded-lg text-sm text-white outline-none focus:border-accent w-full md:w-64"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                    />
                    <Button type="submit" variant="secondary" size="sm">Crear Grupo</Button>
                </form>
            </header>

            <div className="space-y-10">
                {groups.map(group => (
                    <GlassContainer key={group.id} className="overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-icons text-txt-secondary">layers</span>
                                {group.name}
                            </h2>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedGroupId(group.id)}>
                                + Agregar Miembro
                            </Button>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-txt-secondary bg-black/40 font-bold tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="p-4 font-display text-sm">Empleado</th>
                                        <th className="p-4 font-display text-sm">Fecha</th>
                                        <th className="p-4 font-display text-sm">Producción (m)</th>
                                        <th className="p-4 font-display text-sm">Adelantos</th>
                                        <th className="p-4 font-display text-sm">Neto a Pagar</th>
                                        <th className="p-4 text-center font-display text-sm">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {group.employees.map(emp => {
                                        const draft = drafts[emp.id] || { meters: '', date: new Date().toISOString().split('T')[0] };
                                        const pendingAdvances = emp.advances?.filter(a => !a.is_settled).reduce((sum, a) => sum + a.amount, 0) || 0;
                                        const grossTotal = (parseFloat(draft.meters) || 0) * (meterPrice || 0);
                                        const netTotal = Math.max(0, grossTotal - pendingAdvances);

                                        return (
                                            <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-base group-hover:text-accent transition-colors">{emp.name}</div>
                                                    <div className="text-[10px] text-txt-dim font-mono uppercase tracking-widest mt-0.5">ID: {emp.id.toString().padStart(4, '0')}</div>
                                                </td>
                                                <td className="p-4">
                                                    <input
                                                        type="date"
                                                        className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-accent font-mono transition-colors focus:bg-accent/5"
                                                        value={draft.date}
                                                        onChange={e => handleDraftChange(emp.id, 'date', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative group/input">
                                                            <input
                                                                type="number"
                                                                className="w-24 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-lg text-white font-mono font-bold outline-none focus:border-accent text-right focus:bg-accent/5 transition-all shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"
                                                                value={draft.meters}
                                                                onChange={e => handleDraftChange(emp.id, 'meters', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                            <div className="absolute inset-0 border border-accent/0 rounded-lg transition-all pointer-events-none group-hover/input:border-white/20"></div>
                                                        </div>
                                                        <span className="text-xs text-txt-dim font-bold uppercase tracking-wider">m</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-error font-mono text-base font-bold">
                                                    {pendingAdvances > 0 ? `-${formatMoney(pendingAdvances)}` : '-'}
                                                </td>
                                                <td className="p-4 min-w-[200px]">
                                                    <div className="font-bold font-mono text-success text-lg md:text-xl text-glow whitespace-nowrap">{formatMoney(netTotal)}</div>
                                                    {pendingAdvances > 0 && <div className="text-[10px] text-txt-dim uppercase tracking-wider mt-0.5 opacity-60">Gross: {formatMoney(grossTotal)}</div>}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => handleOpenHistory(emp)} className="p-2 text-txt-secondary hover:text-white hover:bg-white/10 rounded-lg transition-all" title="History">
                                                            <span className="material-icons text-lg">history</span>
                                                        </button>
                                                        <button onClick={() => handleOpenUsage(emp)} className="p-2 text-txt-secondary hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Materials">
                                                            <span className="material-icons text-lg">build</span>
                                                        </button>
                                                        <button onClick={() => handleOpenAdvance(emp)} className="p-2 text-txt-secondary hover:text-error hover:bg-error/10 rounded-lg transition-all" title="Advance">
                                                            <span className="material-icons text-lg">money_off</span>
                                                        </button>
                                                        <Button size="sm" variant="neon" className="ml-2 px-4 shadow-none" onClick={() => handlePay(emp.id)}>PAGAR</Button>
                                                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 ml-1 text-txt-dim hover:text-error transition-colors hover:bg-error/5 rounded-lg">
                                                            <span className="material-icons text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden space-y-4 p-4">
                            {group.employees.map(emp => {
                                const draft = drafts[emp.id] || { meters: '', date: new Date().toISOString().split('T')[0] };
                                const pendingAdvances = emp.advances?.filter(a => !a.is_settled).reduce((sum, a) => sum + a.amount, 0) || 0;
                                const grossTotal = (parseFloat(draft.meters) || 0) * 100000;
                                const netTotal = Math.max(0, grossTotal - pendingAdvances);

                                return (
                                    <div key={emp.id} className="bg-black/20 rounded-lg p-4 border border-white/5 relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="font-bold text-white text-lg">{emp.name}</div>
                                            <input
                                                type="date"
                                                className="bg-transparent text-xs text-txt-dim outline-none text-right"
                                                value={draft.date}
                                                onChange={e => handleDraftChange(emp.id, 'date', e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-[10px] text-txt-dim uppercase font-bold block mb-1">Producción (m)</label>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 bg-surface-highlight border border-white/10 rounded text-white font-mono outline-none focus:border-accent"
                                                        placeholder="0"
                                                        value={draft.meters}
                                                        onChange={e => handleDraftChange(emp.id, 'meters', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-txt-dim uppercase font-bold block mb-1">Pago Neto</label>
                                                <div className="font-bold text-success font-mono text-xl">{formatMoney(netTotal)}</div>
                                            </div>
                                        </div>

                                        {pendingAdvances > 0 && (
                                            <div className="bg-error/10 p-2 rounded mb-4 text-xs flex justify-between border border-error/20">
                                                <span className="text-error">Adelantos</span>
                                                <span className="text-white font-mono font-bold">-{formatMoney(pendingAdvances)}</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-4 gap-2">
                                            <button onClick={() => handleOpenHistory(emp)} className="bg-white/5 hover:bg-white/10 p-2 rounded text-center">
                                                <span className="material-icons text-sm text-txt-secondary">history</span>
                                            </button>
                                            <button onClick={() => handleOpenUsage(emp)} className="bg-white/5 hover:bg-white/10 p-2 rounded text-center">
                                                <span className="material-icons text-sm text-txt-secondary">build</span>
                                            </button>
                                            <button onClick={() => handleOpenAdvance(emp)} className="bg-white/5 hover:bg-white/10 p-2 rounded text-center">
                                                <span className="material-icons text-sm text-error">money_off</span>
                                            </button>
                                            <Button className="col-span-1" size="sm" variant="neon" onClick={() => handlePay(emp.id)}>PAY</Button>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteEmployee(emp.id)}
                                            className="absolute -top-2 -right-2 bg-surface text-txt-dim hover:text-error p-1 rounded-full border border-white/10 shadow-sm"
                                        >
                                            <span className="material-icons text-sm">close</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassContainer>
                ))}
            </div>

            {/* Modals */}
            {usageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
                    <GlassContainer className="w-full max-w-md shadow-2xl animate-[slideUp_0.3s_ease-out]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                                <span className="material-icons text-accent">build</span>
                                Material Usage
                            </h2>
                            <button onClick={() => setUsageModalOpen(false)} className="text-txt-dim hover:text-white transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleRecordUsage} className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Select Material</label>
                                <select
                                    className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent text-white outline-none"
                                    value={selectedMaterialId}
                                    onChange={e => setSelectedMaterialId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose Item --</option>
                                    {stock.map(item => <option key={item.id} value={item.id}>{item.name} (Avl: {item.quantity})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Quantity</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent text-white outline-none"
                                    value={usageQuantity}
                                    onChange={e => setUsageQuantity(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <Button variant="ghost" onClick={() => setUsageModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1">Confirm</Button>
                            </div>
                        </form>
                    </GlassContainer>
                </div>
            )}

            {advanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
                    <GlassContainer className="w-full max-w-md shadow-2xl animate-[slideUp_0.3s_ease-out]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                                <span className="material-icons text-error">money_off</span>
                                Register Advance
                            </h2>
                            <button onClick={() => setAdvanceModalOpen(false)} className="text-txt-dim hover:text-white transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="px-6 py-4 bg-surface-highlight border-b border-white/5">
                            <p className="text-xs text-txt-dim">Employee: <span className="text-white font-bold ml-1">{selectedEmp?.name}</span></p>
                        </div>
                        <form onSubmit={handleRecordAdvance} className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-error font-bold">$</span>
                                    <input
                                        autoFocus
                                        type="number"
                                        className="w-full pl-8 pr-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-error focus:ring-1 focus:ring-error outline-none text-white font-mono text-xl font-bold"
                                        placeholder="0.00"
                                        value={advanceAmount}
                                        onChange={e => setAdvanceAmount(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Description</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-error text-white outline-none"
                                    placeholder="e.g. Emergency Loan"
                                    value={advanceDesc}
                                    onChange={e => setAdvanceDesc(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <Button variant="ghost" onClick={() => setAdvanceModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" variant="danger" className="flex-1">Confirm Advance</Button>
                            </div>
                        </form>
                    </GlassContainer>
                </div>
            )}

            {selectedGroupId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
                    <GlassContainer className="w-full max-w-md shadow-2xl animate-[slideUp_0.3s_ease-out]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                                <span className="material-icons text-accent">person_add</span>
                                Add Employee
                            </h2>
                            <button onClick={() => setSelectedGroupId(null)} className="text-txt-dim hover:text-white transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateEmployee} className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Full Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent text-white outline-none"
                                    placeholder="e.g. John Doe"
                                    value={newEmployeeName}
                                    onChange={e => setNewEmployeeName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <Button variant="ghost" onClick={() => setSelectedGroupId(null)} className="flex-1">Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1">Add Member</Button>
                            </div>
                        </form>
                    </GlassContainer>
                </div>
            )}

            {historyModalOpen && selectedHistoryEmp && (
                <WorkerProfile
                    employeeId={selectedHistoryEmp.id}
                    onClose={() => setHistoryModalOpen(false)}
                />
            )}
        </div>
    );
};

export default Personal;
