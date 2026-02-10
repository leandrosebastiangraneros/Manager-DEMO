import React, { useEffect, useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import Modal from './common/Modal';

const Stock = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showAlert } = useDialog();

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form State for Add/Edit & Replenishment
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
    const [minStockAlert, setMinStockAlert] = useState('5');

    // Search/Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExisting, setSelectedExisting] = useState(null);

    // Form State for Formats
    const [newItemFormats, setNewItemFormats] = useState([]);
    const [formatPackSize, setFormatPackSize] = useState('');
    const [formatPackPrice, setFormatPackPrice] = useState('');
    const [formatLabel, setFormatLabel] = useState('');

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
            .catch(err => console.error("Error categories:", err));
    };

    useEffect(() => {
        fetchStock();
        fetchCategories();
    }, []);

    const formatMoney = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '$ 0,00';
        return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    };

    const addFormatToItem = (e) => {
        e.preventDefault();
        if (!formatPackSize || !formatPackPrice) return;

        const newFormat = {
            pack_size: parseFloat(formatPackSize),
            pack_price: parseFloat(formatPackPrice),
            label: formatLabel || `Pack x${formatPackSize}`
        };

        if (isEditing) {
            fetch(`${API_URL}/stock/formats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newFormat, stock_item_id: selectedItem.id })
            })
                .then(res => res.json())
                .then(() => {
                    fetchStock();
                    setSelectedItem(prev => ({ ...prev, formats: [...(prev.formats || []), newFormat] }));
                });
        } else {
            setNewItemFormats([...newItemFormats, newFormat]);
        }

        setFormatPackSize('');
        setFormatPackPrice('');
        setFormatLabel('');
    };

    const deleteFormat = (formatId, index) => {
        if (isEditing && formatId) {
            fetch(`${API_URL}/stock/formats/${formatId}`, { method: 'DELETE' })
                .then(() => fetchStock());
        }
        setNewItemFormats(newItemFormats.filter((_, i) => i !== index));
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        setEditingId(item.id);
        setSelectedItem(item);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
        setNewItemCost(item.unit_cost);
        setNewItemQuantity(item.quantity);
        setNewItemSellingPrice(item.selling_price);
        setNewItemPackPrice(item.pack_price || '');
        setNewItemCategoryId(item.category_id || '');
        setIsPack(item.is_pack || false);
        setPackSize(item.pack_size || '1');
        setMinStockAlert(item.min_stock_alert || '5');
        setNewItemFormats(item.formats || []);
        setIsAddModalOpen(true);
    };

    const addToDraft = (e) => {
        e.preventDefault();
        const costAmount = parseFloat(newItemCost);
        const qtyToEnter = parseFloat(newItemQuantity);
        const sellPrice = parseFloat(newItemSellingPrice) || 0;
        const packP = newItemPackPrice ? parseFloat(newItemPackPrice) : null;
        const pSize = parseFloat(packSize) || 1;

        if (!newItemName || isNaN(costAmount) || isNaN(qtyToEnter)) {
            showAlert("Completa los datos mínimos (Nombre, Costo, Cantidad)", "error");
            return;
        }

        const draftItem = {
            item_id: selectedExisting ? selectedExisting.id : null,
            name: newItemName,
            brand: newItemBrand,
            is_pack: isPack,
            pack_size: pSize,
            cost_amount: costAmount, // Total batch cost
            quantity: qtyToEnter,   // Total units/packs to sum
            selling_price: sellPrice,
            pack_price: packP,
            category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null,
            formats: [...newItemFormats]
        };

        setDraftItems([...draftItems, draftItem]);

        // Reset
        setNewItemName('');
        setNewItemBrand('');
        setNewItemCost('');
        setNewItemQuantity('1');
        setNewItemSellingPrice('');
        setNewItemPackPrice('');
        setNewItemCategoryId('');
        setIsPack(false);
        setPackSize('1');
        setSelectedExisting(null);
        setNewItemFormats([]);
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

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: newItemName,
                brand: newItemBrand,
                is_pack: isPack,
                pack_size: parseFloat(packSize) || 1,
                cost_amount: parseFloat(newItemCost) * parseFloat(newItemQuantity),
                initial_quantity: parseFloat(newItemQuantity),
                selling_price: parseFloat(newItemSellingPrice) || 0,
                pack_price: newItemPackPrice ? parseFloat(newItemPackPrice) : null,
                category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null,
                min_stock_alert: parseFloat(minStockAlert) || 5
            };

            const res = await fetch(`${API_URL}/stock/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert("Producto actualizado con éxito", "success");
                setIsAddModalOpen(false);
                fetchStock();
            } else {
                const err = await res.json();
                showAlert("Error: " + (err.detail || "No se pudo actualizar"), "error");
            }
        } catch (err) {
            showAlert("Error crítico al actualizar", "error");
        }
    };

    const handleDeleteClick = async (item) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar ${item.name}?`)) {
            try {
                const res = await fetch(`${API_URL}/stock/${item.id}`, { method: 'DELETE' });
                if (res.ok) {
                    showAlert("Producto eliminado", "success");
                    fetchStock();
                }
            } catch (err) {
                showAlert("Error al eliminar", "error");
            }
        }
    };

    const handleSellSubmit = (e) => {
        e.preventDefault();
        const priceUnit = parseFloat(sellPriceUnit);
        const qty = parseFloat(sellQuantity);
        if (!workDesc || isNaN(priceUnit) || isNaN(qty)) {
            showAlert("Completa todos los campos", "error");
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

    const handleSelectExisting = (item) => {
        setSelectedExisting(item);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
        setNewItemSellingPrice(item.selling_price || '');
        setNewItemPackPrice(item.pack_price || '');
        setNewItemCategoryId(item.category_id || '');
        setIsPack(item.is_pack || false);
        setPackSize(item.pack_size || '1');
        setSearchTerm('');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold">Consolidando Inventario...</div>
        </div>
    );

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalProdCount = items.length;
    const lowStockCount = items.filter(item => item.quantity <= (item.min_stock_alert || 5)).length;
    const inventoryValue = items.reduce((acc, item) => acc + (item.quantity * (item.unit_cost || 0)), 0);

    return (
        <div className="h-full flex flex-col pb-20 overflow-hidden">
            <header className="mb-6 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-1 uppercase">
                            Gestión de <span className="text-txt-primary/50">Inventario</span>
                        </h1>
                        <p className="text-txt-secondary text-xs font-medium">Panel de control integral de stock.</p>
                    </div>

                    <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl bg-surface flex-1 md:w-80 border border-panel-border/5">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-txt-primary transition-colors text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar en el listado..."
                            className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-txt-primary font-medium text-sm rounded-xl outline-none placeholder:text-txt-dim"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-accent/20 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">grid_view</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Productos</div>
                            <div className="text-lg font-mono font-black text-txt-primary">{totalProdCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">warning_amber</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Stock Bajo</div>
                            <div className="text-lg font-mono font-black text-orange-600">{lowStockCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-green-200 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">payments</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Valor Inventario</div>
                            <div className="text-lg font-mono font-black text-txt-primary">{formatMoney(inventoryValue)}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SECTION 1: FULL REPLENISHMENT FORM (LEFT PANEL) */}
                <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
                    <GlassContainer className="p-5 border-panel-border/5 flex flex-col h-full bg-surface shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-accent text-lg">add_box</span>
                                <h2 className="text-xs font-black uppercase tracking-widest text-txt-primary">Entrada de Mercadería</h2>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1 pb-4">
                            {/* 1. Search existing (Restored functionality) */}
                            <div className="relative">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">¿Producto ya existente?</label>
                                <div className="relative">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">inventory</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar para reponer..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-surface-highlight border border-panel-border/10 rounded-xl text-xs outline-none focus:border-accent"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <div className="absolute top-full left-0 w-full bg-surface border border-panel-border rounded-xl shadow-2xl z-50 mt-1 max-h-40 overflow-y-auto">
                                            {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(i => (
                                                <button
                                                    key={i.id}
                                                    type="button"
                                                    onClick={() => { handleSelectExisting(i); setSearchTerm(''); }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-surface-highlight text-xs border-b border-panel-border/5 last:border-0"
                                                >
                                                    <div className="font-bold truncate">{i.name}</div>
                                                    <div className="text-[9px] text-gray-400">Stock: {i.quantity} | {i.brand}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedExisting && (
                                <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl relative animate-fadeIn flex justify-between items-center">
                                    <div className="truncate">
                                        <div className="text-[8px] font-black text-accent uppercase tracking-tighter">Seleccionado para reposición</div>
                                        <div className="text-xs font-bold truncate">{selectedExisting.name}</div>
                                    </div>
                                    <button onClick={() => setSelectedExisting(null)} className="p-1 hover:bg-accent/10 rounded transition-colors"><span className="material-icons text-sm text-accent">close</span></button>
                                </div>
                            )}

                            {/* 2. Main Entry Form (Restored Categories, Packs, Selling Prices) */}
                            <form onSubmit={addToDraft} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/5 rounded-xl text-xs outline-none focus:border-accent disabled:opacity-50" value={newItemName} onChange={e => setNewItemName(e.target.value)} required disabled={!!selectedExisting} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Marca</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/5 rounded-xl text-xs outline-none focus:border-accent disabled:opacity-50" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} disabled={!!selectedExisting} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Categoría</label>
                                            <select className="w-full p-2.5 bg-surface-highlight border border-panel-border/5 rounded-xl text-xs outline-none focus:border-accent disabled:opacity-50" value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)} disabled={!!selectedExisting}>
                                                <option value="">Sin Categoría</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsPack(!isPack)}
                                                className={`flex-1 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isPack ? 'bg-void text-white border-void' : 'bg-surface-highlight text-gray-400 border-panel-border/5'}`}
                                            >
                                                {isPack ? 'MODO PACK ON' : 'Packs?'}
                                            </button>
                                            {isPack && (
                                                <input type="number" placeholder="x?" className="w-12 p-2.5 bg-surface-highlight border border-panel-border/5 rounded-xl text-xs outline-none font-mono" value={packSize} onChange={e => setPackSize(e.target.value)} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Carga ({isPack ? 'Packs' : 'Unid'})</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/5 rounded-xl text-xs outline-none font-mono focus:border-accent" value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Costo Total Lote</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/5 rounded-xl text-xs outline-none font-mono focus:border-accent" placeholder="0.00" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                                        </div>
                                    </div>

                                    {/* Selling Prices (Restored) */}
                                    <div className="grid grid-cols-2 gap-3 pt-2 bg-accent/5 p-3 rounded-2xl border border-accent/10">
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Venta Unit.</label>
                                            <input type="number" className="w-full p-2 bg-surface text-green-600 border border-panel-border/10 rounded-lg text-xs outline-none font-mono font-bold" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Venta Pack</label>
                                            <input type="number" className="w-full p-2 bg-surface text-green-600 border border-panel-border/10 rounded-lg text-xs outline-none font-mono" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} placeholder="Opcional" />
                                        </div>
                                    </div>

                                    {/* Multi-Format Section (Restored functionality) */}
                                    <div className="pt-2 border-t border-panel-border/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Otros Formatos</h4>
                                            <span className="text-[8px] px-1.5 py-0.5 bg-surface-highlight rounded-full border border-panel-border/5">{newItemFormats.length}</span>
                                        </div>

                                        <div className="grid grid-cols-12 gap-1.5 mb-3">
                                            <input className="col-span-3 p-2 bg-surface-highlight text-[9px] rounded-lg outline-none border border-panel-border/5" placeholder="Cant." value={formatPackSize} onChange={e => setFormatPackSize(e.target.value)} type="number" />
                                            <input className="col-span-4 p-2 bg-surface-highlight text-[9px] rounded-lg outline-none border border-panel-border/5" placeholder="Precio" value={formatPackPrice} onChange={e => setFormatPackPrice(e.target.value)} type="number" />
                                            <input className="col-span-3 p-2 bg-surface-highlight text-[9px] rounded-lg outline-none border border-panel-border/5" placeholder="Nombre" value={formatLabel} onChange={e => setFormatLabel(e.target.value)} />
                                            <button type="button" onClick={addFormatToItem} className="col-span-2 bg-accent text-void rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"><span className="material-icons text-xs">add</span></button>
                                        </div>

                                        {newItemFormats.length > 0 && (
                                            <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                                {newItemFormats.map((f, i) => (
                                                    <div key={i} className="flex justify-between items-center p-2 bg-surface-highlight/50 rounded-lg border border-panel-border/5 group">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-void underline">x{f.pack_size}</span>
                                                            <div className="text-[9px] font-bold line-clamp-1">{f.label}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-mono font-bold text-green-600">{formatMoney(f.pack_price)}</span>
                                                            <button type="button" onClick={() => deleteFormat(null, i)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><span className="material-icons text-xs">close</span></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-void text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-accent hover:text-void transition-all shadow-lg active:scale-95">
                                    Agregar al Draft
                                </button>
                            </form>

                            {/* Draft List Summary */}
                            {draftItems.length > 0 && (
                                <div className="pt-4 border-t border-panel-border/5 space-y-3">
                                    <div className="flex justify-between items-center bg-void/5 p-2 rounded-xl border border-void/10">
                                        <h3 className="text-[9px] font-black uppercase text-void">PROCESAR LOTE ({draftItems.length})</h3>
                                        <button onClick={handleSaveBatch} disabled={isSavingBatch} className="bg-void text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase hover:bg-accent hover:text-void transition-all shadow-sm">
                                            {isSavingBatch ? 'Guardando...' : 'Confirmar Todo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {draftItems.map((item, idx) => (
                                            <div key={idx} className="bg-surface p-2.5 rounded-xl border border-panel-border/5 text-[10px] flex justify-between items-center group relative shadow-sm hover:border-accent/30 transition-all">
                                                <div className="truncate pr-8 flex flex-col">
                                                    <span className="font-black truncate text-txt-primary">{item.name}</span>
                                                    <span className="text-[8px] text-txt-dim uppercase font-bold">
                                                        {item.item_id ? 'Reposición' : 'Nuevo'} • {item.quantity} {item.is_pack ? 'Packs' : 'Unid'} • {formatMoney(item.cost_amount)}
                                                    </span>
                                                </div>
                                                <button onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-all absolute right-2">
                                                    <span className="material-icons text-base">cancel</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassContainer>
                </div>

                {/* SECTION 2: FULL INVENTORY TABLE (RIGHT PANEL) */}
                <div className="lg:col-span-8 overflow-hidden flex flex-col bg-surface rounded-2xl border border-panel-border/5 shadow-sm">
                    <div className="overflow-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="bg-gray-50/50 text-txt-dim text-[10px] uppercase font-bold tracking-widest border-b border-panel-border/5 sticky top-0 bg-surface z-20">
                                    <th className="p-4 pl-8">Producto</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 text-right">Costo Unit.</th>
                                    <th className="p-4 text-right">Precio Venta</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right pr-8">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50/30">
                                {filteredItems.map(item => {
                                    const isLowStock = item.quantity <= (item.min_stock_alert || 5);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/5 transition-colors group">
                                            <td className="p-4 pl-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center text-txt-dim">
                                                        <span className="material-icons text-lg">{item.is_pack ? 'inventory_2' : 'shopping_basket'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-txt-primary line-clamp-1">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-txt-dim uppercase font-medium">{item.brand || 'Genérico'}</span>
                                                            {item.category_name && (
                                                                <span className="text-[7px] bg-void/5 px-1 rounded uppercase font-bold text-void/50">{item.category_name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-xs font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-xs text-txt-dim">{formatMoney(item.unit_cost)}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-mono font-black text-txt-primary">{formatMoney(item.selling_price)}</span>
                                                    {item.pack_price && (
                                                        <span className="text-[7px] text-accent font-bold uppercase tracking-tighter">Pack: {formatMoney(item.pack_price)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm flex items-center justify-center w-fit mx-auto gap-1 ${isLowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                    <span className="w-1 h-1 rounded-full bg-current"></span>
                                                    {isLowStock ? 'Bajo' : 'OK'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right pr-8">
                                                <div className="flex gap-1 justify-end">
                                                    <button onClick={() => openEditModal(item)} className="p-2 text-gray-400 hover:text-accent transition-colors" title="Editar">
                                                        <span className="material-icons text-base">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(item)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                                                        <span className="material-icons text-base">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile List View fallback */}
                        <div className="md:hidden divide-y divide-panel-border/5">
                            {filteredItems.map(item => {
                                const isLowStock = item.quantity <= (item.min_stock_alert || 5);
                                return (
                                    <div key={item.id} className="p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-surface-highlight flex items-center justify-center text-txt-dim">
                                                    <span className="material-icons text-base">{item.is_pack ? 'inventory_2' : 'shopping_basket'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-txt-primary">{item.name}</span>
                                                    <span className="text-[9px] text-txt-dim uppercase">{item.brand || 'Genérico'}</span>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm ${isLowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                {isLowStock ? 'Bajo' : 'OK'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-panel-border/5 pt-2 mt-1">
                                            <div>
                                                <span className="text-[8px] text-gray-400 uppercase font-black">Stock / Venta</span>
                                                <div className="text-xs font-mono font-black">{item.quantity} | {formatMoney(item.selling_price)}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openEditModal(item)} className="p-2 text-gray-400"><span className="material-icons text-base">edit</span></button>
                                                <button onClick={() => handleDeleteClick(item)} className="p-2 text-gray-400"><span className="material-icons text-base">delete</span></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL (KEEPING FULL FUNCTIONALITY) */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="max-w-xl p-8">
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black uppercase tracking-tight">Editar Producto</h2>
                        <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-void"><span className="material-icons">close</span></button>
                    </div>

                    <form onSubmit={handleEditSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</label>
                                <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-medium focus:border-accent" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marca</label>
                                <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-medium focus:border-accent" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo Unit.</label>
                                <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-mono" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Venta Unid.</label>
                                <input type="number" className="w-full p-3 bg-accent/5 border border-accent/20 text-accent rounded-xl outline-none font-mono font-bold" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Venta Pack</label>
                                <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-mono" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alerta Stock</label>
                                <input type="number" className="w-full p-3 bg-orange-50/50 border border-orange-200/20 text-orange-600 rounded-xl outline-none font-mono" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</label>
                                <select className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none" value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)}>
                                    <option value="">Sin Categoría</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-panel-border/5">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestión de Formatos</h4>
                            </div>

                            <div className="space-y-3 mb-6">
                                {newItemFormats.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-surface-highlight rounded-xl border border-panel-border/5 border-l-4 border-l-accent">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-void text-white flex items-center justify-center text-[10px] font-black tracking-tighter">X{f.pack_size}</span>
                                            <div className="text-xs font-bold">{f.label}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-mono font-black text-accent">{formatMoney(f.pack_price)}</span>
                                            <button type="button" onClick={() => deleteFormat(f.id, i)} className="text-gray-300 hover:text-red-500 transition-colors"><span className="material-icons text-sm">delete</span></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-12 gap-2 bg-surface-highlight/30 p-3 rounded-2xl border border-panel-border/10">
                                <input className="col-span-3 p-2.5 bg-surface text-[10px] rounded-lg outline-none border border-panel-border/5" placeholder="Cant." value={formatPackSize} onChange={e => setFormatPackSize(e.target.value)} type="number" />
                                <input className="col-span-4 p-2.5 bg-surface text-[10px] rounded-lg outline-none border border-panel-border/5" placeholder="Precio" value={formatPackPrice} onChange={e => setFormatPackPrice(e.target.value)} type="number" />
                                <input className="col-span-3 p-2.5 bg-surface text-[10px] rounded-lg outline-none border border-panel-border/5" placeholder="Nombre" value={formatLabel} onChange={e => setFormatLabel(e.target.value)} />
                                <button type="button" onClick={addFormatToItem} className="col-span-2 bg-void text-white rounded-lg flex items-center justify-center hover:bg-accent transition-colors shadow-sm"><span className="material-icons text-sm">add</span></button>
                            </div>
                        </div>

                        <div className="pt-8 flex gap-3">
                            <Button variant="ghost" className="flex-1 py-4" type="button" onClick={() => setIsAddModalOpen(false)}>Descartar</Button>
                            <Button variant="primary" className="flex-1 bg-void text-white py-4 shadow-xl" type="submit">Guardar Cambios</Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* QUICK SELL MODAL (OPTIONAL FLOW) */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} className="max-w-md p-8">
                <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-void">Efectuar Venta Directa</h2>
                <p className="text-xs text-txt-dim mb-8">{selectedItem?.name} | {selectedItem?.brand}</p>
                <form onSubmit={handleSellSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cantidad</label>
                            <input type="number" className="w-full p-4 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-mono text-center text-lg" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unit.</label>
                            <input type="number" className="w-full p-4 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-mono text-center text-green-600 font-black text-lg" value={sellPriceUnit} onChange={e => setSellPriceUnit(e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nota Administrativa</label>
                        <textarea className="w-full p-4 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none h-24 text-sm resize-none" value={workDesc} onChange={e => setWorkDesc(e.target.value)} required placeholder="ej. Venta rápida mostrador" />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button variant="ghost" className="flex-1 py-4" type="button" onClick={() => setIsSellModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" className="flex-1 bg-accent text-void py-4 font-black shadow-lg" type="submit">Confirmar Operación</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Stock;
