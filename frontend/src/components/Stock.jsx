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
    const [newItemBrand, setNewItemBrand] = useState('');
    const [isPack, setIsPack] = useState(false);
    const [packSize, setPackSize] = useState('1');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');
    const [newItemSellingPrice, setNewItemSellingPrice] = useState('');
    const [newItemPackPrice, setNewItemPackPrice] = useState('');
    const [newItemCategoryId, setNewItemCategoryId] = useState('');
    const [categories, setCategories] = useState([]);
    const [draftItems, setDraftItems] = useState([]);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    // Search/Selection for Replenishment
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExisting, setSelectedExisting] = useState(null);

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

    const fetchCategories = () => {
        fetch(`${API_URL}/categories`)
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(err => console.error("Error cats:", err));
    };

    useEffect(() => {
        fetchStock();
        fetchCategories();
    }, []);

    const openEditModal = (item) => {
        setIsEditing(true);
        setEditingId(item.id);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
        setNewItemCost(item.unit_cost); // O el costo que prefieras mostrar al editar
        setNewItemQuantity(item.quantity);
        setNewItemSellingPrice(item.selling_price);
        setNewItemPackPrice(item.pack_price || '');
        setNewItemCategoryId(item.category_id || '');
        setIsPack(item.is_pack || false);
        setPackSize(item.pack_size || '1');
        setIsAddModalOpen(true);
    };

    const addToDraft = (e) => {
        e.preventDefault();
        const cost = parseFloat(newItemCost);
        const qty = parseFloat(newItemQuantity);
        const sellPrice = parseFloat(newItemSellingPrice);
        const packP = newItemPackPrice ? parseFloat(newItemPackPrice) : null;
        const pSize = parseFloat(packSize) || 1;

        if (!newItemName || isNaN(cost) || isNaN(qty) || isNaN(sellPrice)) {
            showAlert("Completa los datos del producto", "error");
            return;
        }

        // Calculations for validation
        const totalUnits = isPack ? qty * pSize : qty;
        const unitCost = cost / totalUnits;
        const packCost = unitCost * pSize;

        if (sellPrice <= unitCost) {
            showAlert(`El precio de venta ($${sellPrice}) debe ser mayor al costo ($${unitCost.toFixed(2)})`, "warning");
            return;
        }

        if (packP && packP <= packCost) {
            showAlert(`El precio de pack ($${packP}) debe ser mayor al costo del pack ($${packCost.toFixed(2)})`, "warning");
            return;
        }

        const draftItem = {
            item_id: selectedExisting ? selectedExisting.id : null,
            name: newItemName,
            brand: newItemBrand,
            is_pack: isPack,
            pack_size: parseFloat(packSize),
            cost_amount: cost,
            quantity: qty,
            selling_price: sellPrice,
            pack_price: newItemPackPrice ? parseFloat(newItemPackPrice) : null,
            category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null
        };

        setDraftItems([...draftItems, draftItem]);

        // Reset form for next item
        setNewItemName('');
        setNewItemBrand('');
        setNewItemCost('');
        setNewItemQuantity('1');
        setNewItemSellingPrice('');
        setNewItemPackPrice('');
        setSelectedExisting(null);
        setSearchTerm('');
        setSearchTerm('');
    };

    const removeItemFromDraft = (index) => {
        setDraftItems(draftItems.filter((_, i) => i !== index));
    };

    const handleSaveBatch = async () => {
        if (draftItems.length === 0) return;
        setIsSavingBatch(true);
        try {
            const res = await fetch(`${API_URL}/stock/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: draftItems })
            });
            if (res.ok) {
                showAlert("Inventario actualizado con éxito", "success");
                setDraftItems([]);
                fetchStock();
            } else {
                const err = await res.json();
                showAlert("Error: " + err.detail, "error");
            }
        } catch (err) {
            showAlert("Error de conexión", "error");
        } finally {
            setIsSavingBatch(false);
        }
    };

    const handleSelectExisting = (item) => {
        setSelectedExisting(item);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
        setNewItemSellingPrice(item.selling_price || '');
        setNewItemCategoryId(item.category_id || '');
        setIsPack(false);
        setPackSize('1');
        setSearchTerm('');
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const cost = parseFloat(newItemCost);
        const qty = parseFloat(newItemQuantity);
        const sellPrice = parseFloat(newItemSellingPrice);
        const packP = newItemPackPrice ? parseFloat(newItemPackPrice) : null;
        const pSize = parseFloat(packSize) || 1;

        // Calculations for validation
        const totalUnits = isPack ? qty * pSize : qty;
        const unitCost = cost / totalUnits;
        const packCost = unitCost * pSize;

        if (sellPrice <= unitCost) {
            showAlert(`El precio de venta unitario ($${sellPrice}) debe ser mayor al costo ($${unitCost.toFixed(2)})`, "warning");
            return;
        }

        if (packP && packP <= packCost) {
            showAlert(`El precio de pack ($${packP}) debe ser mayor al costo del pack ($${packCost.toFixed(2)})`, "warning");
            return;
        }

        // Logic change: In Edit mode, newItemCost is treated as UNIT COST.
        // We need to send cost_amount as (unit_cost * initial_quantity) to keep backend consistency
        // OR we need to find what the initial_quantity was.
        // For now, let's assume we want to maintain the original cost_amount if we didn't change cost?
        // Actually, let's just use the unit cost as cost_amount if initial_quantity is 1.
        // The most robust way is to use existing item's initial_quantity.
        const existingItem = items.find(i => i.id === editingId);
        const finalCostAmount = existingItem ? (cost * existingItem.initial_quantity) : cost;

        const payload = {
            name: newItemName,
            brand: newItemBrand,
            is_pack: isPack,
            pack_size: parseFloat(packSize),
            cost_amount: finalCostAmount,
            initial_quantity: existingItem ? existingItem.initial_quantity : qty,
            selling_price: sellPrice,
            pack_price: newItemPackPrice ? parseFloat(newItemPackPrice) : null,
            category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null
        };

        fetch(`${API_URL}/stock/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(() => {
                fetchStock();
                setIsAddModalOpen(false);
                showAlert("Producto actualizado", "success");
            })
            .catch(err => showAlert("Error al editar: " + err.message, "error"));
    };

    const handleSellClick = (item) => {
        setSelectedItem(item);
        setSellPriceUnit(item.selling_price || '');
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
                if (!res.ok) throw new Error("Error en la venta");
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
        <div className="space-y-8 pb-32 animate-[fadeIn_0.5s_ease-out]">
            <header className="mb-4">
                <h1 className="text-3xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-1">
                    Gestión de Inventario
                </h1>
                <p className="text-gray-500 text-sm font-medium">Panel unificado de carga y control de existencias.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Panel de Carga */}
                <div className="xl:col-span-1 space-y-6">
                    <GlassContainer className="p-6 border-panel-border relative overflow-visible">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="material-icons text-accent">app_registration</span>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-accent">Ingreso de Mercadería</h2>
                        </div>

                        <form onSubmit={addToDraft} className="space-y-4">
                            <div className="relative">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">¿Producto Existente?</label>
                                <div className="relative group">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar para reponer..."
                                        className="w-full pl-9 pr-4 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none focus:border-void transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <div className="absolute top-full left-0 w-full bg-surface border border-panel-border rounded-xl shadow-2xl z-50 mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                                            {items.filter(i =>
                                                i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase()))
                                            ).map(i => (
                                                <button
                                                    key={i.id}
                                                    type="button"
                                                    onClick={() => handleSelectExisting(i)}
                                                    className="w-full text-left px-4 py-3 hover:bg-surface-highlight text-xs border-b border-panel-border/10 last:border-0"
                                                >
                                                    <div className="font-bold text-txt-primary">{i.brand ? `${i.brand} - ` : ''}{i.name}</div>
                                                    <div className="text-[10px] text-txt-dim">Stock actual: {i.quantity} | {formatMoney(i.selling_price)}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedExisting && (
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100 flex justify-between items-center animate-fadeIn">
                                    <span className="text-[10px] font-bold text-green-700 uppercase">REPONIENDO: {selectedExisting.brand ? `${selectedExisting.brand} - ` : ''}{selectedExisting.name}</span>
                                    <button type="button" onClick={() => setSelectedExisting(null)} className="text-green-800"><span className="material-icons text-xs">close</span></button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Marca</label>
                                    <input
                                        type="text"
                                        placeholder="ej. Quilmes"
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none"
                                        value={newItemBrand}
                                        onChange={e => setNewItemBrand(e.target.value)}
                                        disabled={!!selectedExisting}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nombre</label>
                                    <input
                                        type="text"
                                        placeholder="ej. Lata 473ml"
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none"
                                        value={newItemName}
                                        onChange={e => setNewItemName(e.target.value)}
                                        required
                                        disabled={!!selectedExisting}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Formato</label>
                                    <select
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none"
                                        value={isPack}
                                        onChange={e => setIsPack(e.target.value === 'true')}
                                    >
                                        <option value="false">Individual</option>
                                        <option value="true">Pack / Bulto</option>
                                    </select>
                                </div>
                                {isPack && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Unid x Pack</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono"
                                            value={packSize}
                                            onChange={e => setPackSize(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Categoría</label>
                                <select
                                    className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none text-txt-primary"
                                    value={newItemCategoryId}
                                    onChange={e => setNewItemCategoryId(e.target.value)}
                                >
                                    <option value="">Seleccionar Categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{isPack ? 'Cant. Packs' : 'Cantidad'}</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono"
                                        value={newItemQuantity}
                                        onChange={e => setNewItemQuantity(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Costo Lote (Total)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono"
                                        value={newItemCost}
                                        onChange={e => setNewItemCost(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Venta Sug. Unit.</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono text-green-600 font-bold"
                                        value={newItemSellingPrice}
                                        onChange={e => setNewItemSellingPrice(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Venta Sug. Pack</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono text-green-600 font-bold"
                                        value={newItemPackPrice}
                                        onChange={e => setNewItemPackPrice(e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>

                            {/* Cost Comparison Helper */}
                            {(parseFloat(newItemCost) > 0 && parseFloat(newItemQuantity) > 0) && (
                                <div className="p-3 bg-surface-highlight rounded-xl border border-panel-border/20 space-y-2 animate-fadeIn">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-txt-dim uppercase">Costo Unitario:</span>
                                        <span className="text-xs font-mono font-bold text-txt-primary">
                                            {formatMoney(parseFloat(newItemCost) / (isPack ? (parseFloat(newItemQuantity) * parseFloat(packSize)) : parseFloat(newItemQuantity)))}
                                        </span>
                                    </div>
                                    {isPack && (
                                        <div className="flex justify-between items-center border-t border-panel-border/10 pt-2">
                                            <span className="text-[9px] font-bold text-txt-dim uppercase">Costo Pack:</span>
                                            <span className="text-xs font-mono font-bold text-txt-primary">
                                                {formatMoney((parseFloat(newItemCost) / parseFloat(newItemQuantity)))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button type="submit" variant="secondary" className="w-full py-4 text-xs font-black shadow-md bg-accent text-surface transition-standard hover:opacity-90">
                                AGREGAR A LA LISTA
                            </Button>
                        </form>
                    </GlassContainer>
                </div>

                {/* Draft List & Inventory */}
                <div className="xl:col-span-3 space-y-8">
                    {/* Draft Area */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-txt-dim">Draft de Ingreso ({draftItems.length})</h2>
                            {draftItems.length > 0 && (
                                <Button variant="primary" onClick={handleSaveBatch} disabled={isSavingBatch}>
                                    {isSavingBatch ? 'GUARDANDO...' : 'CONFIRMAR CARGA'}
                                </Button>
                            )}
                        </div>

                        {draftItems.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-3xl h-[120px] flex flex-col items-center justify-center text-gray-300">
                                <p className="text-[10px] font-mono uppercase tracking-widest">Lista vacía</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {draftItems.map((item, idx) => (
                                    <div key={idx} className="bg-surface p-4 rounded-xl border border-panel-border shadow-sm flex flex-col justify-between relative">
                                        <button onClick={() => removeItemFromDraft(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><span className="material-icons text-sm">cancel</span></button>
                                        <div>
                                            <div className="text-[9px] font-mono text-txt-dim uppercase">{item.item_id ? 'REPOSICIÓN' : 'NUEVO'}</div>
                                            <div className="font-bold text-sm truncate">
                                                {item.brand ? `${item.brand} - ` : ''}{item.name}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-mono italic">x{item.quantity} {item.is_pack ? `packs` : `unid.`}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Inventory List */}
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-gray-400">inventory</span>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-txt-dim">Inventario Actual</h2>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block bg-surface rounded-2xl border border-panel-border overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-surface-highlight/30 text-txt-dim text-[10px] font-bold uppercase border-b border-panel-border">
                                        <th className="p-4 pl-6">Producto</th>
                                        <th className="p-4 text-center">Stock</th>
                                        <th className="p-4 text-right">Costo U.</th>
                                        <th className="p-4 text-right">Costo P.</th>
                                        <th className="p-4 text-right">Venta U.</th>
                                        <th className="p-4 text-right">Venta P.</th>
                                        <th className="p-4 text-center">Estado</th>
                                        <th className="p-4 text-right pr-6">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-surface-highlight/5 group">
                                            <td className="p-4 pl-6">
                                                <div className="font-bold text-sm">
                                                    {item.brand ? <span className="text-gray-400 font-medium mr-1">{item.brand}</span> : ''}
                                                    {item.name}
                                                </div>
                                                <div className="text-[9px] text-gray-400 font-mono tracking-tighter">ID: {item.id.toString().padStart(4, '0')}</div>
                                            </td>
                                            <td className="p-4 text-center font-bold text-xs">
                                                <span className={`font-mono ${item.quantity <= 5 ? 'text-red-500' : 'text-txt-primary'}`}>{item.quantity}</span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-[10px] text-txt-dim">{formatMoney(item.unit_cost)}</td>
                                            <td className="p-4 text-right font-mono text-[10px] text-txt-dim">{formatMoney(item.unit_cost * (item.pack_size || 1))}</td>
                                            <td className="p-4 text-right font-mono font-bold text-xs text-green-600">{formatMoney(item.selling_price)}</td>
                                            <td className="p-4 text-right font-mono font-bold text-xs text-blue-600">
                                                {formatMoney(item.pack_price || (item.selling_price * (item.pack_size || 1)))}
                                            </td>
                                            <td className="p-4 text-center">
                                                <StatusBadge status={item.quantity > 0 ? 'En Stock' : 'Agotado'} />
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-400 hover:text-void"><span className="material-icons text-sm">edit</span></button>
                                                    <button onClick={() => handleSellClick(item)} className="p-1.5 text-gray-400 hover:text-green-600"><span className="material-icons text-sm">shopping_cart</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-4">
                            {items.map(item => (
                                <div key={item.id} className="p-5 bg-surface rounded-xl border border-panel-border shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-txt-primary">
                                                {item.brand ? <span className="text-gray-400 font-medium mr-1">{item.brand}</span> : ''}
                                                {item.name}
                                            </h3>
                                            <div className="flex gap-2 text-[9px] font-mono mt-1">
                                                <span className="text-green-600 bg-green-50 px-1 rounded">U: {formatMoney(item.selling_price)}</span>
                                                <span className="text-blue-600 bg-blue-50 px-1 rounded">P: {formatMoney(item.pack_price || (item.selling_price * item.pack_size))}</span>
                                            </div>
                                        </div>
                                        <StatusBadge status={item.quantity > 0 ? 'En Stock' : 'Agotado'} />
                                    </div>
                                    <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                                        <div>
                                            <div className="text-[9px] text-gray-400 uppercase">Stock</div>
                                            <div className="text-lg font-mono font-bold">{item.quantity}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" onClick={() => openEditModal(item)} className="px-3 py-1 text-[10px] font-bold">EDITAR</Button>
                                            <Button variant="primary" onClick={() => handleSellClick(item)} className="px-3 py-1 text-[10px] font-bold">VENTA</Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="max-w-lg p-6">
                <h2 className="text-xl font-bold mb-6">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Marca</label>
                            <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Nombre</label>
                            <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Costo Unit.</label>
                            <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Venta Unid.</label>
                            <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Venta Pack</label>
                            <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} />
                        </div>
                    </div>

                    {/* Cost Help for Edit */}
                    {parseFloat(newItemCost) > 0 && (
                        <div className="p-3 bg-void/5 rounded-xl border border-void/10 flex justify-between items-center text-[10px] font-bold animate-fadeIn">
                            <span className="text-void uppercase tracking-tight">Costo del Pack (calc.): {formatMoney(parseFloat(newItemCost) * (parseFloat(packSize) || 1))}</span>
                            <span className="text-void/40 uppercase tracking-tighter italic">Basado en Costo Unit.</span>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1">Cancelar</Button>
                        <Button variant="primary" type="submit" className="flex-1">Guardar Cambios</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} className="max-w-lg p-6">
                <h2 className="text-xl font-bold mb-4">Registrar Venta</h2>
                <p className="text-sm text-gray-400 mb-6">{selectedItem?.name}</p>
                <form onSubmit={handleSellSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Cantidad</label>
                            <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none font-mono" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Precio Unit.</label>
                            <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/10 text-txt-primary rounded-xl outline-none font-mono" value={sellPriceUnit} onChange={e => setSellPriceUnit(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Descripción</label>
                        <textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none h-20" value={workDesc} onChange={e => setWorkDesc(e.target.value)} required placeholder="ej. Venta salón" />
                    </div>
                    <div className="pt-2 flex gap-3">
                        <Button variant="ghost" type="button" onClick={() => setIsSellModalOpen(false)} className="flex-1">Cancelar</Button>
                        <Button variant="primary" type="submit" className="flex-1 bg-accent text-void">Confirmar Venta</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Stock;
