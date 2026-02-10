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

    // Form State for Add/Edit
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');
    const [newItemSellingPrice, setNewItemSellingPrice] = useState('');
    const [newItemCategoryId, setNewItemCategoryId] = useState('');
    const [categories, setCategories] = useState([]);

    // Form State for Sell
    const [sellPriceUnit, setSellPriceUnit] = useState('');
    const [sellQuantity, setSellQuantity] = useState('1');
    const [workDesc, setWorkDesc] = useState('');

    const fetchStock = () => {
        // Optimistic Load
        const cached = localStorage.getItem('stock_items');
        if (cached && loading) {
            setItems(JSON.parse(cached));
            setLoading(false);
        }

        fetch(`${API_URL}/stock`)
            .then(res => res.json())
            .then(data => {
                const safeData = Array.isArray(data) ? data : [];
                setItems(safeData);
                localStorage.setItem('stock_items', JSON.stringify(safeData));
                setLoading(false);
            })
            .catch(err => {
                console.error("Error stock:", err);
                if (!cached) setItems([]);
                setLoading(false);
            });
    };

    const fetchCategories = () => {
        // Optimistic Load
        const cached = localStorage.getItem('stock_categories');
        if (cached) {
            setCategories(JSON.parse(cached));
        }

        fetch(`${API_URL}/categories`)
            .then(res => res.json())
            .then(data => {
                const safeData = Array.isArray(data) ? data : [];
                setCategories(safeData);
                localStorage.setItem('stock_categories', JSON.stringify(safeData));
            })
            .catch(err => console.error("Error cats:", err));
    };

    useEffect(() => {
        fetchStock();
        fetchCategories();
    }, []);

    const openAddModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setNewItemName('');
        setNewItemCost('');
        setNewItemQuantity('1');
        setNewItemSellingPrice('');
        setNewItemCategoryId('');
        setIsAddModalOpen(true);
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        setEditingId(item.id);
        setNewItemName(item.name);
        setNewItemCost(item.cost_amount);
        setNewItemQuantity(item.initial_quantity);
        setNewItemSellingPrice(item.selling_price);
        setNewItemCategoryId(item.category_id || '');
        setIsAddModalOpen(true);
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        const cost = parseFloat(newItemCost);
        const qty = parseFloat(newItemQuantity);
        const sellPrice = parseFloat(newItemSellingPrice);
        if (!newItemName || isNaN(cost) || isNaN(qty) || isNaN(sellPrice)) {
            showAlert("Por favor completa todos los campos correctamente.", "error");
            return;
        }

        const payload = {
            name: newItemName,
            cost_amount: cost,
            initial_quantity: qty,
            selling_price: sellPrice,
            category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/stock/${editingId}` : `${API_URL}/stock`;

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (!res.ok) return res.json().then(err => { throw new Error(err.detail || "Error al guardar") });
                return res.json();
            })
            .then(() => {
                fetchStock();
                setIsAddModalOpen(false);
                showAlert(isEditing ? "Producto actualizado" : "Producto agregado correctamente", "success");
            })
            .catch(err => {
                console.error("Error stock save:", err);
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
        <div className="space-y-8 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-2">
                        Inventario
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">
                        Gestión de stock, precios y control de mercadería.
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={openAddModal}
                    icon={<span className="material-icons">add</span>}
                    className="shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-xl"
                >
                    Nuevo Producto
                </Button>
            </header>

            {/* Desktop View grouped by Category */}
            <div className="hidden md:block space-y-8">
                {[...categories, { id: null, name: 'Sin Categoría' }].map(category => {
                    const categoryItems = items.filter(item => item.category_id === category.id);
                    if (categoryItems.length === 0) return null;

                    return (
                        <div key={category.id || 'none'} className="space-y-3">
                            <h2 className="text-txt-dim font-bold text-xs uppercase tracking-wider flex items-center gap-3 pl-1 mb-4 border-b border-panel-border pb-2">
                                <span className="material-icons text-sm">category</span>
                                {category.name}
                                <span className="text-[10px] bg-surface-highlight text-txt-primary px-2 py-0.5 rounded-full border border-panel-border">{categoryItems.length} items</span>
                            </h2>

                            <div className="bg-surface rounded-xl shadow-sm border border-gray-100/10 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-highlight/30 text-txt-dim text-xs font-bold tracking-wider border-b border-gray-100/10">
                                            <th className="p-4 font-medium pl-6">Producto</th>
                                            <th className="p-4 text-center font-medium">Stock</th>
                                            <th className="p-4 text-right font-medium">Costo</th>
                                            <th className="p-4 text-right font-medium">Venta</th>
                                            <th className="p-4 text-right font-medium">Margen</th>
                                            <th className="p-4 text-center font-medium">Estado</th>
                                            <th className="p-4 text-center font-medium pr-6">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {categoryItems.map(item => (
                                            <tr key={item.id} className="hover:bg-surface-highlight/10 transition-colors group">
                                                <td className="p-4 pl-6">
                                                    <div className="font-bold text-txt-primary mb-0.5">{item.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">ID: {item.id.toString().padStart(4, '0')}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.quantity > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                                        {item.quantity}
                                                        <span className="text-[9px] text-gray-400 ml-1 font-normal">/ {item.initial_quantity}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right text-gray-400 font-mono text-sm">{formatMoney(item.unit_cost)}</td>
                                                <td className="p-4 text-right text-txt-primary font-mono font-bold text-sm bg-surface-highlight/10">{formatMoney(item.selling_price)}</td>
                                                <td className="p-4 text-right font-mono font-bold text-sm text-green-600">
                                                    {formatMoney(item.selling_price - item.unit_cost)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {(() => {
                                                        let statusConfig = { color: 'bg-green-500/10 text-green-500 border-green-500/20', text: 'En Stock' };
                                                        if (item.quantity === 0) statusConfig = { color: 'bg-red-500/10 text-red-500 border-red-500/20', text: 'Agotado' };
                                                        else if (item.quantity <= 5) statusConfig = { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', text: 'Poco Stock' };

                                                        return (
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusConfig.color} inline-block min-w-[80px]`}>
                                                                {statusConfig.text}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 text-center pr-6">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="p-1.5 text-txt-dim hover:bg-surface-highlight hover:text-txt-primary rounded-lg transition-all"
                                                            title="Editar"
                                                        >
                                                            <span className="material-icons text-sm">edit</span>
                                                        </button>
                                                        {item.status === 'AVAILABLE' && (
                                                            <button
                                                                onClick={() => handleSellClick(item)}
                                                                className="p-1.5 text-txt-dim hover:bg-green-500/10 hover:text-green-500 rounded-lg transition-all"
                                                                title="Vender"
                                                            >
                                                                <span className="material-icons text-sm">shopping_cart</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div >

            {/* Mobile Cards View */}
            < div className="md:hidden space-y-4" >
                {
                    items.length === 0 ? (
                        <div className="text-center text-gray-400 p-8 text-sm">Inventario Vacío</div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="p-5 bg-surface rounded-xl shadow-sm border border-gray-100/10 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-base font-bold text-txt-primary mb-1">{item.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-mono">Costo: {formatMoney(item.unit_cost)}</p>
                                    </div>
                                    <StatusBadge status={item.status === 'AVAILABLE' ? 'En Stock' : 'Agotado'} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 bg-surface-highlight/10 p-3 rounded-lg border border-gray-100/10">
                                    <div className="text-center">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Stock</span>
                                        <span className={`text-lg font-mono font-bold ${item.quantity > 0 ? 'text-txt-primary' : 'text-red-500'}`}>
                                            {item.quantity}
                                        </span>
                                    </div>
                                    <div className="text-center border-l border-gray-200">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Monto Total</span>
                                        <span className="text-lg font-mono font-bold text-txt-primary">
                                            {formatMoney(item.cost_amount)}
                                        </span>
                                    </div>
                                </div>

                                {item.status === 'AVAILABLE' && (
                                    <Button
                                        variant="secondary"
                                        className="w-full rounded-lg border border-gray-200 text-gray-700 hover:bg-black hover:text-white"
                                        onClick={() => handleSellClick(item)}
                                    >
                                        REGISTRAR SALIDA
                                    </Button>
                                )}
                            </div>
                        ))
                    )
                }
            </div >

            {/* Add Modal */}
            < Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                className="max-w-xl bg-surface rounded-2xl shadow-2xl border border-gray-100/10 p-0 overflow-hidden"
            >
                <div className="bg-surface px-6 py-4 border-b border-gray-100/10 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-txt-primary flex items-center gap-2">
                        <span className="material-icons text-gray-400">add_box</span>
                        Nuevo Producto
                    </h2>
                </div>

                <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre del Producto</label>
                            <input
                                autoFocus
                                type="text"
                                style={{ height: '50px' }}
                                className="w-full px-4 bg-surface-highlight border border-panel-border rounded-xl focus:border-txt-primary focus:ring-1 focus:ring-txt-primary outline-none text-txt-primary transition-all placeholder:text-txt-dim"
                                placeholder="ej. Cerveza Patagonia"
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Categoría</label>
                            <select
                                style={{ height: '50px' }}
                                className="w-full px-4 bg-surface-highlight border border-panel-border rounded-xl focus:border-txt-primary focus:ring-1 focus:ring-txt-primary outline-none text-txt-primary transition-all appearance-none"
                                value={newItemCategoryId}
                                onChange={e => setNewItemCategoryId(e.target.value)}
                            >
                                <option value="">-- Sin Categoría --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Cantidad</label>
                            <input
                                type="number"
                                style={{ height: '50px' }}
                                className="w-full px-4 bg-surface-highlight border border-panel-border rounded-xl focus:border-txt-primary focus:ring-1 focus:ring-txt-primary outline-none text-txt-primary font-mono transition-all"
                                value={newItemQuantity}
                                onChange={e => setNewItemQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Costo Total</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number"
                                    style={{ height: '50px' }}
                                    className="w-full pl-8 pr-4 bg-surface-highlight border border-panel-border rounded-xl focus:border-txt-primary focus:ring-1 focus:ring-txt-primary outline-none text-txt-primary font-mono transition-all"
                                    placeholder="0.00"
                                    value={newItemCost}
                                    onChange={e => setNewItemCost(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Precio Venta (Unit)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">$</span>
                                <input
                                    type="number"
                                    style={{ height: '50px' }}
                                    className="w-full pl-8 pr-4 bg-surface-highlight border border-panel-border rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-txt-primary font-mono transition-all"
                                    placeholder="0.00"
                                    value={newItemSellingPrice}
                                    onChange={e => setNewItemSellingPrice(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {newItemQuantity > 0 && newItemCost > 0 && (
                        <div className="bg-surface-highlight/10 p-4 rounded-lg border border-gray-200/20 text-center">
                            <p className="text-xs text-txt-dim">
                                Costo Unitario Calculado: <span className="text-lg font-bold font-mono text-txt-primary block mt-1">{formatMoney(newItemCost / newItemQuantity)}</span>
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 text-gray-500 hover:text-black hover:bg-gray-100">Cancelar</Button>
                        <Button type="submit" variant="primary" className="flex-1 shadow-lg shadow-black/20">Confirmar Agregado</Button>
                    </div>
                </form>
            </Modal >

            {/* Sell Modal */}
            < Modal
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                className="max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-0 overflow-hidden"
            >
                <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-black flex items-center gap-2">
                        <span className="material-icons text-green-600">monetization_on</span>
                        Registrar Venta
                    </h2>
                    <button onClick={() => setIsSellModalOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Item Seleccionado</div>
                                <div className="text-black font-bold text-lg">{selectedItem?.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Costo Unit.</div>
                                <div className="text-gray-600 font-mono text-sm">{formatMoney(selectedItem?.unit_cost)}</div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSellSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Cant. a Vender</label>
                                <input
                                    autoFocus
                                    type="number"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-black font-mono transition-all"
                                    value={sellQuantity}
                                    onChange={e => setSellQuantity(e.target.value)}
                                    max={selectedItem?.quantity}
                                    min="0.1"
                                    step="0.1"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-2 text-right">Disponible: {selectedItem?.quantity}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Precio de Venta (Unit)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none text-black font-mono transition-all"
                                        placeholder="0.00"
                                        value={sellPriceUnit}
                                        onChange={e => setSellPriceUnit(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {sellPriceUnit > 0 && sellPriceUnit < selectedItem?.unit_cost && (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 flex gap-3 items-start animate-pulse">
                                <span className="material-icons text-orange-500 text-sm mt-0.5">warning</span>
                                <div>
                                    <h4 className="text-orange-700 font-bold text-xs uppercase">Alerta de Pérdida</h4>
                                    <p className="text-[10px] text-orange-600">
                                        Vendiendo bajo costo ({formatMoney(selectedItem.unit_cost)}).
                                    </p>
                                </div>
                            </div>
                        )}

                        {sellPriceUnit >= selectedItem?.unit_cost && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                                <p className="text-xs text-green-700">
                                    Ganancia Est. / Unit: <span className="text-lg font-bold font-mono block mt-1">{formatMoney(sellPriceUnit - selectedItem.unit_cost)}</span>
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Descripción de la Venta / Destino</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-black outline-none text-black font-medium transition-all placeholder:text-gray-400 resize-none h-20 text-sm rounded-xl"
                                placeholder="ej. Venta Cliente Bronce / Consumo Interno"
                                value={workDesc}
                                onChange={e => setWorkDesc(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between bg-black p-4 rounded-xl shadow-lg shadow-black/20">
                            <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Ingreso Total</span>
                            <span className="text-2xl font-mono font-bold text-white">{formatMoney((parseFloat(sellQuantity) || 0) * (parseFloat(sellPriceUnit) || 0))}</span>
                        </div>

                        <div className="flex gap-4 pt-2 border-t border-gray-100">
                            <Button variant="ghost" onClick={() => setIsSellModalOpen(false)} className="flex-1 text-gray-500 hover:text-black hover:bg-gray-100">Cancelar</Button>
                            <Button type="submit" variant="primary" className="flex-1 shadow-lg shadow-green-900/20 bg-black text-white hover:bg-gray-900">Confirmar Venta</Button>
                        </div>
                    </form>
                </div>
            </Modal >
        </div >
    );
};

export default Stock;
