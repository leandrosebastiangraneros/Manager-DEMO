import React, { useEffect, useState, useMemo } from 'react';
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

    // Search/Selection for Global View
    const [searchTerm, setSearchTerm] = useState('');

    // Selection for Replenishment Search (distinct from global search)
    const [replenishSearch, setReplenishSearch] = useState('');
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

    // Auto-Calculations for the Form
    const calculatedUnitCost = useMemo(() => {
        const cost = parseFloat(newItemCost) || 0;
        const qty = parseFloat(newItemQuantity) || 1;
        const pSize = isPack ? (parseFloat(packSize) || 1) : 1;

        if (cost === 0 || qty === 0) return 0;
        // cost is the total batch cost. qty is number of units/packs entered.
        return cost / (qty * pSize);
    }, [newItemCost, newItemQuantity, isPack, packSize]);

    const profitMargin = useMemo(() => {
        const sellPrice = parseFloat(newItemSellingPrice) || 0;
        if (!sellPrice || !calculatedUnitCost) return 0;
        return ((sellPrice - calculatedUnitCost) / calculatedUnitCost) * 100;
    }, [newItemSellingPrice, calculatedUnitCost]);

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
        const pSize = isPack ? (parseFloat(packSize) || 1) : 1;

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
            cost_amount: costAmount,
            quantity: qtyToEnter,
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
        setReplenishSearch('');
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
        setReplenishSearch('');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin text-accent">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold text-txt-primary">Sincronizando Base de Datos...</div>
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
                            Catálogo de <span className="text-accent">Inventario</span>
                        </h1>
                        <p className="text-txt-secondary text-xs font-semibold">Configura stock, precios y modalidades de venta.</p>
                    </div>

                    <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl bg-surface flex-1 md:w-80 border border-panel-border/5">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo principal..."
                            className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-txt-primary font-bold text-sm rounded-xl outline-none placeholder:text-txt-dim"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-accent/30 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">dataset</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-txt-secondary uppercase tracking-widest">Total Productos</div>
                            <div className="text-lg font-mono font-black text-txt-primary">{totalProdCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-orange-500/30 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">emergency_home</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-txt-secondary uppercase tracking-widest">Stock Crítico</div>
                            <div className="text-lg font-mono font-black text-orange-600">{lowStockCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-green-500/30 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-txt-secondary uppercase tracking-widest">Valor Activo</div>
                            <div className="text-lg font-mono font-black text-txt-primary">{formatMoney(inventoryValue)}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SECTION 1: REPLENISHMENT FORM (LEFT PANEL) - CONTRAST & CALCULATION FIXES */}
                <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
                    <GlassContainer className="p-5 border-panel-border/10 flex flex-col h-full bg-surface shadow-xl relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-6 bg-accent rounded-full"></div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-txt-primary">Ingreso de Mercadería</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1 pb-4">
                            {/* 1. Search existing (Contrast fix) */}
                            <div className="relative">
                                <label className="text-[9px] font-black text-txt-primary/70 uppercase tracking-widest block mb-1.5">Vincular con Existente</label>
                                <div className="relative">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Escribe nombre o marca..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary placeholder:text-txt-dim"
                                        value={replenishSearch}
                                        onChange={e => setReplenishSearch(e.target.value)}
                                    />
                                    {replenishSearch && (
                                        <div className="absolute top-full left-0 w-full bg-surface border-2 border-accent/20 rounded-xl shadow-2xl z-[100] mt-1 max-h-48 overflow-y-auto backdrop-blur-md">
                                            {items.filter(i => i.name.toLowerCase().includes(replenishSearch.toLowerCase()) || (i.brand && i.brand.toLowerCase().includes(replenishSearch.toLowerCase()))).map(i => (
                                                <button
                                                    key={i.id}
                                                    type="button"
                                                    onClick={() => handleSelectExisting(i)}
                                                    className="w-full text-left px-4 py-3 hover:bg-accent/5 text-xs border-b border-panel-border/5 last:border-0 transition-colors"
                                                >
                                                    <div className="font-black text-txt-primary truncate">{i.name}</div>
                                                    <div className="text-[9px] text-txt-dim font-bold uppercase tracking-tighter">Stock actual: {i.quantity} | {i.brand || 'S/M'}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedExisting && (
                                <div className="p-3 bg-accent/10 border-2 border-accent/30 rounded-xl relative animate-fadeIn flex justify-between items-center shadow-lg shadow-accent/5">
                                    <div className="truncate">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                                            <div className="text-[9px] font-black text-accent uppercase tracking-widest">Modo Reposición Activado</div>
                                        </div>
                                        <div className="text-sm font-black text-txt-primary truncate">{selectedExisting.name}</div>
                                    </div>
                                    <button onClick={() => { setSelectedExisting(null); setReplenishSearch(''); }} className="p-1.5 bg-accent/20 hover:bg-accent/40 rounded-lg transition-colors group">
                                        <span className="material-icons text-sm text-accent group-hover:scale-110 transition-transform">close</span>
                                    </button>
                                </div>
                            )}

                            {/* 2. Main Entry Form (Contrast fixes) */}
                            <form onSubmit={addToDraft} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Nombre Prod.</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={newItemName} onChange={e => setNewItemName(e.target.value)} required disabled={!!selectedExisting} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Marca</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} disabled={!!selectedExisting} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Categoría</label>
                                            <select className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)} disabled={!!selectedExisting}>
                                                <option value="">Sin Categoría</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsPack(!isPack)}
                                                className={`flex-1 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isPack ? 'bg-void text-white border-void shadow-lg' : 'bg-surface-highlight text-txt-dim border-panel-border/10'}`}
                                            >
                                                {isPack ? 'ES PACK x' + packSize : 'MODALIDAD PACK?'}
                                            </button>
                                            {isPack && (
                                                <input type="number" placeholder="Cant" className="w-14 p-2.5 bg-accent/5 border-2 border-accent/20 rounded-xl text-xs outline-none font-mono font-black text-accent text-center" value={packSize} onChange={e => setPackSize(e.target.value)} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Cant. Ingreso</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none font-mono font-black focus:border-accent text-txt-primary" value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Costo Total Lote</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none font-mono font-black focus:border-accent text-txt-primary" placeholder="0.00" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                                        </div>
                                    </div>

                                    {/* Reactive Calculation Area (NEW) */}
                                    <div className="p-3 bg-void/5 rounded-2xl border border-dotted border-panel-border/20 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[8px] font-black text-txt-dim uppercase tracking-widest">Costo Unitario Resultante</span>
                                            <span className="text-xs font-mono font-black text-txt-primary">{formatMoney(calculatedUnitCost)}</span>
                                        </div>
                                        {profitMargin !== 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[8px] font-black text-txt-dim uppercase tracking-widest">Margen Bruto Estimado</span>
                                                <span className={`text-[10px] font-mono font-black ${profitMargin > 20 ? 'text-green-600' : 'text-orange-500'}`}>{profitMargin.toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Selling Prices (Restored + Contrast) */}
                                    <div className="grid grid-cols-2 gap-3 pt-2 bg-accent/5 p-4 rounded-2xl border border-accent/20 shadow-inner">
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Precio Venta Unit.</label>
                                            <input type="number" className="w-full p-2.5 bg-surface text-green-600 border-2 border-green-500/20 rounded-xl outline-none font-mono font-black text-center shadow-sm" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Precio Venta Pack</label>
                                            <input type="number" className="w-full p-2.5 bg-surface text-green-600 border-2 border-green-500/20 rounded-xl outline-none font-mono font-black text-center shadow-sm" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>

                                    {/* Multi-Format (Restored + Contrast) */}
                                    <div className="pt-2 border-t border-panel-border/5">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-[9px] font-black text-txt-primary/60 uppercase tracking-widest">Gestión de Packs Adicionales</h4>
                                            <span className="text-[8px] px-2 py-0.5 bg-accent/10 text-accent font-black rounded-full border border-accent/10">{newItemFormats.length}</span>
                                        </div>

                                        <div className="grid grid-cols-12 gap-1.5 mb-3 bg-surface-highlight/40 p-2 rounded-xl">
                                            <input className="col-span-3 p-2 bg-surface text-[9px] rounded-lg outline-none border border-panel-border/10 font-bold text-txt-primary text-center" placeholder="Cant" value={formatPackSize} onChange={e => setFormatPackSize(e.target.value)} type="number" />
                                            <input className="col-span-4 p-2 bg-surface text-[9px] rounded-lg outline-none border border-panel-border/10 font-black text-green-600 text-center" placeholder="Precio" value={formatPackPrice} onChange={e => setFormatPackPrice(e.target.value)} type="number" />
                                            <input className="col-span-3 p-2 bg-surface text-[9px] rounded-lg outline-none border border-panel-border/10 font-bold text-txt-primary uppercase" placeholder="Nombre" value={formatLabel} onChange={e => setFormatLabel(e.target.value)} />
                                            <button type="button" onClick={addFormatToItem} className="col-span-2 bg-accent text-void rounded-lg flex items-center justify-center hover:shadow-lg transition-all active:scale-90"><span className="material-icons text-sm">add</span></button>
                                        </div>

                                        {newItemFormats.length > 0 && (
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                {newItemFormats.map((f, i) => (
                                                    <div key={i} className="flex justify-between items-center p-2.5 bg-surface rounded-xl border border-panel-border/10 group hover:border-accent/30 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded bg-void text-white flex items-center justify-center text-[8px] font-black">X{f.pack_size}</div>
                                                            <div className="text-[9px] font-black text-txt-primary uppercase">{f.label}</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-mono font-black text-green-600">{formatMoney(f.pack_price)}</span>
                                                            <button type="button" onClick={() => deleteFormat(null, i)} className="text-gray-300 hover:text-red-500 transition-colors"><span className="material-icons text-sm">cancel</span></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-void text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-accent hover:text-void transition-all shadow-xl active:scale-[0.98] mt-2">
                                    Añadir al Borrador (Carga masiva)
                                </button>
                            </form>

                            {/* Draft List (Contrast Fix) */}
                            {draftItems.length > 0 && (
                                <div className="pt-4 border-t-2 border-dashed border-panel-border/10 space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h3 className="text-[10px] font-black uppercase text-txt-primary">Lote a Confirmar</h3>
                                        <button onClick={handleSaveBatch} disabled={isSavingBatch} className="bg-accent text-void text-[9px] font-black px-4 py-2 rounded-xl uppercase hover:shadow-lg transition-all active:scale-90">
                                            {isSavingBatch ? 'Procesando...' : 'Confirmar Todo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {draftItems.map((item, idx) => (
                                            <div key={idx} className="bg-surface p-3 rounded-2xl border-2 border-panel-border/5 text-[10px] flex justify-between items-center group relative shadow-md hover:border-accent/20 transition-all overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent/30"></div>
                                                <div className="truncate pr-10 flex flex-col pl-2">
                                                    <span className="font-black truncate text-txt-primary uppercase tracking-tight">{item.name}</span>
                                                    <span className="text-[8px] text-txt-dim uppercase font-bold mt-0.5">
                                                        {item.item_id ? '🔄 Reposición' : '✨ Nuevo'} • {item.quantity} {item.is_pack ? 'Packs' : 'Unid'} • {formatMoney(item.cost_amount)}
                                                    </span>
                                                </div>
                                                <button onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-all absolute right-3 top-1/2 -translate-y-1/2">
                                                    <span className="material-icons text-lg">cancel</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassContainer>
                </div>

                {/* SECTION 2: INVENTORY TABLE - CONTRAST FIXES */}
                <div className="lg:col-span-8 overflow-hidden flex flex-col bg-surface rounded-3xl border border-panel-border/5 shadow-2xl relative">
                    <div className="overflow-auto custom-scrollbar flex-1 relative">
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="bg-gray-50/70 text-txt-primary text-[10px] uppercase font-black tracking-widest border-b border-panel-border/10 sticky top-0 bg-surface z-20 backdrop-blur-md">
                                    <th className="p-4 pl-8">Producto / Marca</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 text-right">Costo Unit.</th>
                                    <th className="p-4 text-right">Precio Venta</th>
                                    <th className="p-4 text-center">Estado Lib.</th>
                                    <th className="p-4 text-right pr-8">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50/50">
                                {filteredItems.map(item => {
                                    const isLowStock = item.quantity <= (item.min_stock_alert || 5);
                                    return (
                                        <tr key={item.id} className="hover:bg-accent/5 transition-all group border-l-4 border-l-transparent hover:border-l-accent">
                                            <td className="p-4 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${item.is_pack ? 'bg-void text-white' : 'bg-surface-highlight text-txt-dim border border-panel-border/10'}`}>
                                                        <span className="material-icons text-xl">{item.is_pack ? 'inventory_2' : 'shopping_bag'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-txt-primary line-clamp-1 uppercase tracking-tight">{item.name}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] text-txt-dim uppercase font-black tracking-widest">{item.brand || 'Marca Genérica'}</span>
                                                            {item.category_name && (
                                                                <span className="text-[8px] bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full uppercase font-black text-accent">{item.category_name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[14px] font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>
                                                        {item.quantity}
                                                    </span>
                                                    {item.is_pack && item.pack_size > 1 && (
                                                        <span className="text-[8px] text-txt-dim font-bold uppercase tracking-widest">x{item.pack_size} p/u</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-[11px] font-bold text-txt-dim">{formatMoney(item.unit_cost)}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[14px] font-mono font-black text-txt-primary">{formatMoney(item.selling_price)}</span>
                                                    {(item.pack_price || item.pack_price > 0) && (
                                                        <span className="text-[9px] text-green-600 font-black uppercase tracking-tighter bg-green-500/10 px-1.5 rounded">Pack: {formatMoney(item.pack_price)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center w-fit mx-auto gap-1.5 ${isLowStock ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-orange-600 animate-pulse' : 'bg-green-600'}`}></div>
                                                    {isLowStock ? 'Bajo Stock' : 'Disponible'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right pr-8">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => openEditModal(item)} className="p-2.5 bg-surface-highlight text-txt-dim hover:text-accent hover:bg-accent/10 rounded-xl transition-all shadow-sm" title="Editar Parámetros">
                                                        <span className="material-icons text-lg">settings</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(item)} className="p-2.5 bg-surface-highlight text-txt-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-sm" title="Eliminar Producto">
                                                        <span className="material-icons text-lg">delete_outline</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile Optimized View */}
                        <div className="md:hidden divide-y divide-panel-border/10">
                            {filteredItems.map(item => {
                                const isLowStock = item.quantity <= (item.min_stock_alert || 5);
                                return (
                                    <div key={item.id} className="p-5 flex flex-col gap-4 bg-surface active:bg-accent/5 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.is_pack ? 'bg-void text-white shadow-lg' : 'bg-surface-highlight text-txt-dim border border-panel-border/10'}`}>
                                                    <span className="material-icons text-xl">{item.is_pack ? 'inventory_2' : 'shopping_bag'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-txt-primary uppercase tracking-tight">{item.name}</span>
                                                    <span className="text-[10px] text-txt-dim uppercase font-black tracking-widest">{item.brand || 'Marca Genérica'}</span>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${isLowStock ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                                                {isLowStock ? 'Alerta' : 'OK'}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center bg-surface-highlight/40 p-3 rounded-2xl border border-panel-border/5">
                                            <div>
                                                <span className="text-[8px] text-txt-dim uppercase font-black block mb-0.5">En Stock</span>
                                                <div className={`text-sm font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>{item.quantity}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] text-txt-dim uppercase font-black block mb-0.5">Precio Venta</span>
                                                <div className="text-sm font-mono font-black text-txt-primary">{formatMoney(item.selling_price)}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end pt-1">
                                            <button onClick={() => openEditModal(item)} className="p-3 bg-surface-highlight text-txt-primary rounded-xl flex-1 border border-panel-border/10 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                                <span className="material-icons text-base">edit</span> Editar
                                            </button>
                                            <button onClick={() => handleDeleteClick(item)} className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 transition-all flex items-center justify-center">
                                                <span className="material-icons text-base">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL - FULL CONTRAST & FUNCTIONALITY */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="max-w-2xl p-0 overflow-hidden rounded-3xl">
                <div className="flex flex-col bg-surface overflow-hidden">
                    <div className="p-8 bg-void text-white flex items-center justify-between shadow-xl">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Configuración del Producto</h2>
                            <p className="text-[10px] text-accent font-black uppercase tracking-widest mt-1 opacity-70">Ajusta los parámetros de stock y precios de venta</p>
                        </div>
                        <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all group">
                            <span className="material-icons group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleEditSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Identidad / Nombre</label>
                                <input type="text" className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-bold text-txt-primary focus:border-accent shadow-sm" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Marca / Fabricante</label>
                                <input type="text" className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-bold text-txt-primary focus:border-accent shadow-sm" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-6 p-6 bg-accent/5 rounded-3xl border-2 border-accent/20 border-dotted shadow-inner">
                            <div className="col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1 text-center block">Costo Base Unit.</label>
                                <input type="number" className="w-full p-4 bg-surface border-2 border-accent/20 rounded-2xl outline-none font-mono font-black text-center text-txt-primary text-lg" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1 text-center block">Venta Sugerido</label>
                                <input type="number" className="w-full p-4 bg-surface border-2 border-green-500/30 text-green-600 rounded-2xl outline-none font-mono font-black text-center text-lg shadow-green-500/5 shadow-md" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1 text-center block">Precio Pack</label>
                                <input type="number" className="w-full p-4 bg-surface border-2 border-green-500/30 text-green-600 rounded-2xl outline-none font-mono font-black text-center text-lg shadow-green-500/5 shadow-md" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-panel-border/10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Margen de Advertencia</label>
                                <div className="relative">
                                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-orange-500">warning</span>
                                    <input type="number" className="w-full p-4 pl-12 bg-surface-highlight border-2 border-orange-500/20 text-orange-600 rounded-2xl outline-none font-mono font-black" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Sección / Categoría</label>
                                <select className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-bold text-txt-primary focus:border-accent" value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)}>
                                    <option value="">Sin Categorizar</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-panel-border/10">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[11px] font-black text-txt-primary/60 uppercase tracking-widest">Formatos de Comercialización</h4>
                                <div className="text-[10px] font-mono text-txt-dim underline italic">Soporta múltiples packs por producto</div>
                            </div>

                            <div className="flex flex-col gap-4 mb-8">
                                {newItemFormats.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-surface-highlight/50 rounded-2xl border-2 border-panel-border/5 hover:border-accent/30 transition-all group overflow-hidden relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-accent shadow-lg shadow-accent/50"></div>
                                        <div className="flex items-center gap-4 pl-2">
                                            <div className="w-12 h-12 rounded-xl bg-void text-white flex flex-col items-center justify-center shadow-lg">
                                                <span className="text-[8px] font-black opacity-50 uppercase leading-none mb-1">UNID</span>
                                                <span className="text-lg font-black leading-none">x{f.pack_size}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-txt-primary uppercase tracking-tight">{f.label}</div>
                                                <div className="text-[10px] text-accent font-black font-mono">ID Formato: {f.id || 'Nuevo'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 pr-2">
                                            <span className="text-xl font-mono font-black text-green-600 drop-shadow-sm">{formatMoney(f.pack_price)}</span>
                                            <button type="button" onClick={() => deleteFormat(f.id, i)} className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center active:scale-90">
                                                <span className="material-icons text-xl">delete_sweep</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-12 gap-3 bg-surface-highlight/30 p-5 rounded-3xl border-2 border-panel-border/10 border-dashed">
                                <div className="col-span-3 space-y-1">
                                    <span className="text-[8px] font-black uppercase text-txt-dim block pl-1">Cantidad</span>
                                    <input className="w-full p-4 bg-surface text-sm rounded-xl outline-none border-2 border-panel-border/5 focus:border-accent font-black text-center" placeholder="12" value={formatPackSize} onChange={e => setFormatPackSize(e.target.value)} type="number" />
                                </div>
                                <div className="col-span-4 space-y-1">
                                    <span className="text-[8px] font-black uppercase text-txt-dim block pl-1">Precio Final</span>
                                    <input className="w-full p-4 bg-surface text-sm rounded-xl outline-none border-2 border-panel-border/5 focus:border-accent font-black text-center text-green-600" placeholder="1200.00" value={formatPackPrice} onChange={e => setFormatPackPrice(e.target.value)} type="number" />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <span className="text-[8px] font-black uppercase text-txt-dim block pl-1">Etiqueta</span>
                                    <input className="w-full p-4 bg-surface text-[10px] rounded-xl outline-none border-2 border-panel-border/5 focus:border-accent font-black" placeholder="Pack x12" value={formatLabel} onChange={e => setFormatLabel(e.target.value)} />
                                </div>
                                <div className="col-span-2 pt-5">
                                    <button type="button" onClick={addFormatToItem} className="w-full h-full bg-void text-white rounded-xl flex items-center justify-center hover:bg-accent hover:text-void transition-all shadow-xl active:scale-95 group">
                                        <span className="material-icons text-2xl group-hover:scale-125 transition-transform">add_circle</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 flex gap-4">
                            <Button variant="ghost" className="flex-1 py-5 border-2 border-panel-border/10 font-black text-txt-primary uppercase tracking-widest text-xs" type="button" onClick={() => setIsAddModalOpen(false)}>Descartar Cambios</Button>
                            <Button variant="primary" className="flex-1 py-5 bg-void text-white font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-accent hover:text-void transition-all" type="submit">Actualizar Producto</Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* QUICK SELL MODAL (FIXED CONTRAST) */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} className="max-w-md p-0 overflow-hidden rounded-3xl">
                <div className="p-8 bg-surface">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <span className="material-icons text-3xl">point_of_sale</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-txt-primary leading-none">Venta Directa</h2>
                            <p className="text-[11px] text-txt-dim font-bold mt-1 uppercase tracking-tighter truncate max-w-[200px]">{selectedItem?.name}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSellSubmit} className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Cantidad</label>
                                <input type="number" className="w-full p-5 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-mono text-center text-2xl font-black text-txt-primary focus:border-accent shadow-inner" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Precio Cobrado</label>
                                <input type="number" className="w-full p-5 bg-surface-highlight border-2 border-green-500/20 rounded-2xl outline-none font-mono text-center text-green-600 font-black text-2xl focus:border-green-500 shadow-inner" value={sellPriceUnit} onChange={e => setSellPriceUnit(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-txt-primary/60 uppercase tracking-widest pl-1">Especificaciones de Venta</label>
                            <textarea className="w-full p-5 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none h-28 text-sm resize-none font-medium text-txt-primary focus:border-accent shadow-inner" value={workDesc} onChange={e => setWorkDesc(e.target.value)} required placeholder="ej. Cliente frecuente, pago contado..." />
                        </div>
                        <div className="pt-2 flex gap-4">
                            <Button variant="ghost" className="flex-1 py-5 font-black text-xs uppercase tracking-widest" type="button" onClick={() => setIsSellModalOpen(false)}>Cancelar</Button>
                            <Button variant="primary" className="flex-1 py-5 bg-green-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all" type="submit">Efectuar Cobro</Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Stock;
