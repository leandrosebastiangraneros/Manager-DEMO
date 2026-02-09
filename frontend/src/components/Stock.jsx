import React, { useEffect, useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import StatusBadge from './common/StatusBadge';
import Modal from './common/Modal';

const Stock = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showAlert } = useDialog();

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form State for Add
    const [newItemName, setNewItemName] = useState('');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');

    // Form State for Sell
    const [sellPriceUnit, setSellPriceUnit] = useState('');
    const [sellQuantity, setSellQuantity] = useState('1');
    const [workDesc, setWorkDesc] = useState('');

    const fetchStock = () => {
        setLoading(true);
        fetch(`${API_URL}/stock`)
            .then(res => res.json())
            .then(data => {
                setItems(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error stock:", err);
                setItems([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const handleAddSubmit = (e) => {
        e.preventDefault();
        const cost = parseFloat(newItemCost);
        const qty = parseFloat(newItemQuantity);
        if (!newItemName || isNaN(cost) || isNaN(qty)) {
            showAlert("Por favor completa todos los campos correctamente.", "error");
            return;
        }

        fetch(`${API_URL}/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newItemName, cost_amount: cost, initial_quantity: qty })
        })
            .then(res => {
                if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error al guardar") });
                return res.json();
            })
            .then(() => {
                fetchStock();
                setIsAddModalOpen(false);
                setNewItemName('');
                setNewItemCost('');
                setNewItemQuantity('1');
                showAlert("Material agregado correctamente", "success");
            })
            .catch(err => {
                console.error("Error adding stock:", err);
                showAlert("Error: " + err.message, "error");
            });
    };

    const handleSellClick = (item) => {
        setSelectedItem(item);
        setSellPriceUnit('');
        setSellQuantity('1');
        setWorkDesc('');
        setIsSellModalOpen(true);
    };

    const handleSellSubmit = (e) => {
        e.preventDefault();
        const priceUnit = parseFloat(sellPriceUnit);
        const qty = parseFloat(sellQuantity);
        if (!workDesc || isNaN(priceUnit) || isNaN(qty)) {
            showAlert("Completa todos los campos", "error");
            return;
        }

        if (qty > selectedItem.quantity) {
            showAlert("No hay suficiente stock.", "error");
            return;
        }

        fetch(`${API_URL}/stock/${selectedItem.id}/sell`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sale_price_unit: priceUnit, quantity: qty, work_description: workDesc })
        })
            .then(res => {
                if (!res.ok) throw new Error("Error selling");
                return res.json();
            })
            .then(() => {
                fetchStock();
                setIsSellModalOpen(false);
                showAlert("Venta registrada con éxito", "success");
            })
            .catch(err => showAlert(err.message, "error"));
    };

    const formatMoney = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '$ 0,00';
        return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest">Sincronizando Inventario...</div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-wide mb-2">
                        INVENTORY <span className="text-accent">CONTROL</span>
                    </h1>
                    <p className="text-txt-dim text-sm max-w-md">
                        Seguimiento en tiempo real de materiales, costos y disponibilidad.
                    </p>
                </div>
                <Button variant="neon" onClick={() => setIsAddModalOpen(true)} icon={<span className="material-icons">add</span>}>
                    Nuevo Material
                </Button>
            </header>

            {/* Desktop Table View */}
            <GlassContainer className="hidden md:block p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-txt-secondary text-xs uppercase font-bold tracking-wider border-b border-glass-border">
                            <th className="p-6 font-mono">Material / Item</th>
                            <th className="p-6 text-center font-mono">Disponibilidad</th>
                            <th className="p-6 text-right font-mono">Costo Unit</th>
                            <th className="p-6 text-right font-mono">Valor Total</th>
                            <th className="p-6 text-center font-mono">Estado</th>
                            <th className="p-6 text-center font-mono">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.length === 0 ? (
                            <tr><td colSpan="6" className="p-12 text-center text-txt-dim font-mono">Inventario Vacío</td></tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-6">
                                        <div className="font-bold text-white mb-1 group-hover:text-accent transition-colors">{item.name}</div>
                                        <div className="text-[10px] text-txt-dim font-mono uppercase">ID: {item.id.toString().padStart(4, '0')}</div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`text-lg font-bold font-mono ${item.quantity > 0 ? 'text-white' : 'text-txt-dim'}`}>
                                            {item.quantity}
                                        </span>
                                        <span className="text-[10px] text-txt-dim ml-1">/ {item.initial_quantity}</span>
                                    </td>
                                    <td className="p-6 text-right text-txt-secondary font-mono text-sm">{formatMoney(item.unit_cost)}</td>
                                    <td className="p-6 text-right text-white font-mono font-bold text-sm tracking-wide">{formatMoney(item.cost_amount)}</td>
                                    <td className="p-6 text-center">
                                        <StatusBadge status={item.status === 'AVAILABLE' ? 'En Stock' : 'Agotado'} />
                                    </td>
                                    <td className="p-6 text-center">
                                        {item.status === 'AVAILABLE' && (
                                            <Button size="sm" variant="secondary" onClick={() => handleSellClick(item)}>
                                                USAR / VENDER
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </GlassContainer>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
                {items.length === 0 ? (
                    <div className="text-center text-txt-dim p-8">Inventario Vacío</div>
                ) : (
                    items.map(item => (
                        <GlassContainer key={item.id} className="p-5 border-l-2 border-l-accent/50 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                                    <p className="text-[10px] text-txt-dim font-mono uppercase">Costo Unit: {formatMoney(item.unit_cost)}</p>
                                </div>
                                <StatusBadge status={item.status === 'AVAILABLE' ? 'En Stock' : 'Agotado'} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
                                <div className="text-center">
                                    <span className="text-[10px] text-txt-dim uppercase font-bold tracking-widest block mb-1">Disponible</span>
                                    <span className={`text-xl font-mono font-bold ${item.quantity > 0 ? 'text-white' : 'text-txt-dim'}`}>
                                        {item.quantity}
                                    </span>
                                    <span className="text-[10px] text-txt-dim ml-1">/ {item.initial_quantity}</span>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <span className="text-[10px] text-txt-dim uppercase font-bold tracking-widest block mb-1">Valor Total</span>
                                    <span className="text-xl font-mono font-bold text-white">
                                        {formatMoney(item.cost_amount)}
                                    </span>
                                </div>
                            </div>

                            {item.status === 'AVAILABLE' && (
                                <Button variant="secondary" className="w-full" onClick={() => handleSellClick(item)}>
                                    USAR / VENDER
                                </Button>
                            )}
                        </GlassContainer>
                    ))
                )}
            </div>

            {/* Add Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                className="max-w-xl"
            >
                <div className="border-b border-white/5 flex justify-between items-center mb-6 pb-2">
                    <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                        <span className="material-icons text-accent">add_box</span>
                        Registrar Material
                    </h2>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Nombre del Material</label>
                        <input
                            autoFocus
                            type="text"
                            className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none text-white transition-all placeholder:text-txt-dim"
                            placeholder="ej. Bolsas de Cemento"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Cantidad Inicial</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none text-white font-mono transition-all"
                                value={newItemQuantity}
                                onChange={e => setNewItemQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Costo Total de Compra</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim font-bold">$</span>
                                <input
                                    type="number"
                                    className="w-full pl-8 pr-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none text-white font-mono transition-all"
                                    placeholder="0.00"
                                    value={newItemCost}
                                    onChange={e => setNewItemCost(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {newItemQuantity > 0 && newItemCost > 0 && (
                        <div className="bg-accent/5 p-4 rounded-lg border border-accent/10 text-center">
                            <p className="text-xs text-accent">
                                Costo Unitario Calculado: <span className="text-lg font-bold font-mono block mt-1">{formatMoney(newItemCost / newItemQuantity)}</span>
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1">Cancelar</Button>
                        <Button type="submit" variant="neon" className="flex-1">Confirmar Agregado</Button>
                    </div>
                </form>
            </Modal>

            {/* Sell Modal */}
            <Modal
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                className="max-w-xl"
            >
                <div className="border-b border-white/5 flex justify-between items-center mb-6 pb-2">
                    <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                        <span className="material-icons text-success">monetization_on</span>
                        Vender / Usar Material
                    </h2>
                </div>

                <div className="p-4 bg-surface-highlight rounded-lg border border-white/5 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-[10px] text-txt-dim uppercase font-bold tracking-widest mb-1">Item Seleccionado</div>
                            <div className="text-white font-bold text-lg">{selectedItem?.name}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-txt-dim uppercase font-bold tracking-widest mb-1">Costo Unit.</div>
                            <div className="text-txt-secondary font-mono text-sm">{formatMoney(selectedItem?.unit_cost)}</div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSellSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Cant. a Vender</label>
                            <input
                                autoFocus
                                type="number"
                                className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-success focus:ring-1 focus:ring-success outline-none text-white font-mono transition-all"
                                value={sellQuantity}
                                onChange={e => setSellQuantity(e.target.value)}
                                max={selectedItem?.quantity}
                                min="0.1"
                                step="0.1"
                                required
                            />
                            <p className="text-[10px] text-txt-dim mt-2 text-right">Disponible: {selectedItem?.quantity}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Precio de Venta (Unit)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-success font-bold">$</span>
                                <input
                                    type="number"
                                    className="w-full pl-8 pr-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-success focus:ring-1 focus:ring-success outline-none text-white font-mono transition-all"
                                    placeholder="0.00"
                                    value={sellPriceUnit}
                                    onChange={e => setSellPriceUnit(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {sellPriceUnit > 0 && sellPriceUnit < selectedItem?.unit_cost && (
                        <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20 flex gap-3 items-start animate-pulse">
                            <span className="material-icons text-orange-500 text-sm mt-0.5">warning</span>
                            <div>
                                <h4 className="text-orange-400 font-bold text-xs uppercase">Alerta de Pérdida</h4>
                                <p className="text-[10px] text-orange-500/80">
                                    Vendiendo bajo costo ({formatMoney(selectedItem.unit_cost)}).
                                </p>
                            </div>
                        </div>
                    )}

                    {sellPriceUnit >= selectedItem?.unit_cost && (
                        <div className="bg-success/10 p-4 rounded-lg border border-success/20 text-center">
                            <p className="text-xs text-success">
                                Ganancia Est. / Unit: <span className="text-lg font-bold font-mono block mt-1">{formatMoney(sellPriceUnit - selectedItem.unit_cost)}</span>
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-2">Descripción del Trabajo</label>
                        <textarea
                            className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-success focus:ring-1 focus:ring-success outline-none text-white font-medium transition-all placeholder:text-txt-dim resize-none h-20 text-sm"
                            placeholder="ej. Compra Cliente / Proyecto Beta"
                            value={workDesc}
                            onChange={e => setWorkDesc(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-lg border border-white/5">
                        <span className="text-txt-dim text-xs uppercase font-bold tracking-widest">Ingreso Total</span>
                        <span className="text-2xl font-mono font-bold text-success">{formatMoney((parseFloat(sellQuantity) || 0) * (parseFloat(sellPriceUnit) || 0))}</span>
                    </div>

                    <div className="flex gap-4 pt-2 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setIsSellModalOpen(false)} className="flex-1">Cancelar</Button>
                        <Button type="submit" variant="primary" className="flex-1 hover:bg-success hover:text-black">Confirmar Venta</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Stock;
