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
        return cost / (qty * pSize);
    }, [newItemCost, newItemQuantity, isPack, packSize]);

    const calculatedPackCost = useMemo(() => {
        const pSize = parseFloat(packSize) || 1;
        return calculatedUnitCost * pSize;
    }, [calculatedUnitCost, packSize]);

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
            category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null
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
            <div className="font-mono text-xs uppercase tracking-widest font-bold text-txt-primary">Sincronizando Inventario...</div>
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
                            INVENTARIO <span className="text-accent">ACTUAL</span>
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
                            <span className="material-icons text-xl">priority_high</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-txt-secondary uppercase tracking-widest">Stock Crítico</div>
                            <div className="text-lg font-mono font-black text-orange-600">{lowStockCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-green-500/30 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-xl">payments</span>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-txt-secondary uppercase tracking-widest">Valor Activo</div>
                            <div className="text-lg font-mono font-black text-txt-primary">{formatMoney(inventoryValue)}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SECTION 1: REPLENISHMENT FORM (LEFT PANEL) */}
                <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
                    <GlassContainer className="p-5 border-panel-border/10 flex flex-col h-full bg-surface shadow-xl relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-6 bg-accent rounded-full"></div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-txt-primary">Ingreso de Mercadería</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1 pb-4">

                            {/* 1. Vincular con existente */}
                            <div className="relative">
                                <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1.5">Vincular con Existente</label>
                                <div className="relative">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Escribe nombre o marca..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary placeholder:text-txt-dim"
                                        value={replenishSearch}
                                        onChange={e => setReplenishSearch(e.target.value)}
                                    />
                                    {replenishSearch && (
                                        <div className="absolute top-full left-0 w-full bg-surface border-2 border-accent/20 rounded-xl shadow-2xl z-[100] mt-1 max-h-40 overflow-y-auto backdrop-blur-md">
                                            {items.filter(i => i.name.toLowerCase().includes(replenishSearch.toLowerCase()) || (i.brand && i.brand.toLowerCase().includes(replenishSearch.toLowerCase()))).map(i => (
                                                <button
                                                    key={i.id}
                                                    type="button"
                                                    onClick={() => handleSelectExisting(i)}
                                                    className="w-full text-left px-4 py-3 hover:bg-accent/5 text-xs border-b border-panel-border/5 last:border-0 transition-colors"
                                                >
                                                    <div className="font-black text-txt-primary truncate">{i.name}</div>
                                                    <div className="text-[9px] text-txt-dim font-bold uppercase tracking-tighter">Stock: {i.quantity} | {i.brand || 'S/M'}</div>
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
                                            <div className="text-[9px] font-black text-accent uppercase tracking-widest">Reposición</div>
                                        </div>
                                        <div className="text-sm font-black text-txt-primary truncate">{selectedExisting.name}</div>
                                    </div>
                                    <button onClick={() => { setSelectedExisting(null); setReplenishSearch(''); }} className="p-1.5 bg-accent/20 hover:bg-accent/40 rounded-lg transition-colors group">
                                        <span className="material-icons text-sm text-accent group-hover:scale-110 transition-transform">close</span>
                                    </button>
                                </div>
                            )}

                            {/* 2. Main Entry Form (REORDERED) */}
                            <form onSubmit={addToDraft} className="space-y-4">
                                <div className="space-y-4">

                                    {/* REGION: Marca | Nombre */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Marca</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} disabled={!!selectedExisting} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Nombre</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={newItemName} onChange={e => setNewItemName(e.target.value)} required disabled={!!selectedExisting} />
                                        </div>
                                    </div>

                                    {/* REGION: Categoria | Individual o Pack */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Categoría</label>
                                            <select className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)} disabled={!!selectedExisting}>
                                                <option value="">Sin Categoría</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Individual / Pack</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPack(!isPack)}
                                                    className={`flex-1 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isPack ? 'bg-void text-white border-void shadow-lg' : 'bg-surface-highlight text-txt-dim border-panel-border/10'}`}
                                                >
                                                    {isPack ? 'Modo Pack' : 'Individual'}
                                                </button>
                                                {isPack && (
                                                    <input type="number" placeholder="x?" className="w-14 p-2.5 bg-accent/5 border-2 border-accent/20 rounded-xl text-xs outline-none font-mono font-black text-accent text-center" value={packSize} onChange={e => setPackSize(e.target.value)} />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* REGION: Cant. Ingreso | Costo Total */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Cant. Ingreso</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none font-mono font-black focus:border-accent text-txt-primary" value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Costo Total</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none font-mono font-black focus:border-accent text-txt-primary" placeholder="0.00" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                                        </div>
                                    </div>

                                    {/* REGION: Precio de venta unitario | Precio de venta pack */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Venta Unit.</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/10 rounded-xl outline-none font-mono font-black text-center text-green-600 focus:border-accent" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Venta Pack</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/10 rounded-xl outline-none font-mono font-black text-center text-green-600 focus:border-accent" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>

                                    {/* REGION: Cálculos (Costo unitario | Costo pack) */}
                                    <div className="p-3 bg-void/5 rounded-2xl border-2 border-dotted border-panel-border/20 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[8px] font-black text-txt-dim uppercase tracking-widest block mb-1">Costo Unitario</span>
                                            <span className="text-xs font-mono font-black text-txt-primary">{formatMoney(calculatedUnitCost)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black text-txt-dim uppercase tracking-widest block mb-1">Costo Pack</span>
                                            <span className="text-xs font-mono font-black text-txt-primary">{formatMoney(calculatedPackCost)}</span>
                                        </div>
                                    </div>

                                </div>

                                <button type="submit" className="w-full py-4 bg-void text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-accent hover:text-void transition-all shadow-xl active:scale-[0.98] mt-2">
                                    Añadir al Borrador
                                </button>
                            </form>

                            {/* Draft List */}
                            {draftItems.length > 0 && (
                                <div className="pt-4 border-t-2 border-dashed border-panel-border/10 space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h3 className="text-[10px] font-black uppercase text-txt-primary">Lote Final</h3>
                                        <button onClick={handleSaveBatch} disabled={isSavingBatch} className="bg-accent text-void text-[9px] font-black px-4 py-2 rounded-xl uppercase hover:shadow-lg transition-all active:scale-90">
                                            {isSavingBatch ? 'Guardando...' : 'Confirmar Todo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {draftItems.map((item, idx) => (
                                            <div key={idx} className="bg-surface p-3 rounded-2xl border-2 border-panel-border/5 text-[10px] flex justify-between items-center group relative shadow-md hover:border-accent/20 transition-all overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent/40"></div>
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

                {/* SECTION 2: INVENTORY TABLE */}
                <div className="lg:col-span-8 overflow-hidden flex flex-col bg-surface rounded-3xl border border-panel-border/5 shadow-2xl relative">
                    <div className="overflow-auto custom-scrollbar flex-1 relative">
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="bg-gray-50/70 text-txt-primary text-[10px] uppercase font-black tracking-widest border-b border-panel-border/10 sticky top-0 bg-surface z-20 backdrop-blur-md">
                                    <th className="p-4 pl-8">Producto / Marca</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 text-right">Variedades y Precios</th>
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
                                                        <span className="text-[13px] font-black text-txt-primary line-clamp-1 uppercase tracking-tight">
                                                            {item.brand ? `${item.brand} ` : ''}{item.name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-0.5">
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
                                                    {(item.is_pack || (item.formats && item.formats.length > 0)) && item.pack_size > 1 && (
                                                        <span className="text-[8px] text-txt-dim font-bold uppercase tracking-widest">x{item.pack_size} p/u</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-txt-dim uppercase tracking-tighter">Unitario:</span>
                                                        <span className="text-[11px] font-mono font-black text-txt-primary">{formatMoney(item.selling_price)}</span>
                                                    </div>

                                                    {/* DEFAULT PACK IF EXISTS */}
                                                    {item.is_pack && item.pack_price > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-accent uppercase tracking-tighter">Pack x{item.pack_size}:</span>
                                                            <span className="text-[11px] font-mono font-black text-accent">{formatMoney(item.pack_price)}</span>
                                                        </div>
                                                    )}

                                                    {/* EXTRA FORMATS */}
                                                    {item.formats && item.formats.map(fmt => (
                                                        <div key={fmt.id} className="flex items-center gap-2 border-t border-panel-border/5 pt-1 mt-1 w-full justify-end">
                                                            <span className="text-[8px] font-black text-accent uppercase tracking-tighter">Pack x{fmt.pack_size}:</span>
                                                            <span className="text-[11px] font-mono font-black text-accent">{formatMoney(fmt.pack_price)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center w-fit mx-auto gap-1.5 ${isLowStock ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-orange-600 animate-pulse' : 'bg-green-600'}`}></div>
                                                    {isLowStock ? 'Stock Bajo' : 'Disponible'}
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
                                    <div key={item.id} className="p-4 flex flex-col gap-3 bg-surface active:bg-accent/5 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.is_pack ? 'bg-void text-white shadow-lg' : 'bg-surface-highlight text-txt-dim border border-panel-border/10'}`}>
                                                    <span className="material-icons text-xl">{item.is_pack ? 'inventory_2' : 'shopping_bag'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-txt-primary uppercase tracking-tight">
                                                        {item.brand ? `${item.brand} ` : ''}{item.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${isLowStock ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                                                {isLowStock ? 'Alerta' : 'OK'}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 bg-surface-highlight/40 p-3 rounded-2xl border border-panel-border/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[8px] text-txt-dim uppercase font-black">Stock Actual</span>
                                                <div className={`text-sm font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>{item.quantity}</div>
                                            </div>
                                            <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-panel-border/5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[7px] text-txt-dim uppercase font-black block">Unitario</span>
                                                    <div className="text-[10px] font-mono font-black text-txt-primary">{formatMoney(item.selling_price)}</div>
                                                </div>
                                                {item.is_pack && item.pack_price > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[7px] text-accent uppercase font-black block">Pack x{item.pack_size}</span>
                                                        <div className="text-[10px] font-mono font-black text-accent">{formatMoney(item.pack_price)}</div>
                                                    </div>
                                                )}
                                                {item.formats && item.formats.map(fmt => (
                                                    <div key={fmt.id} className="flex justify-between items-center border-t border-panel-border/5 pt-1">
                                                        <span className="text-[7px] text-accent uppercase font-black block">Pack x{fmt.pack_size}</span>
                                                        <div className="text-[10px] font-mono font-black text-accent">{formatMoney(fmt.pack_price)}</div>
                                                    </div>
                                                ))}
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

            {/* EDIT MODAL */}
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
                                <label className="text-[10px] font-black text-txt-primary uppercase tracking-widest pl-1">Nombre Prod.</label>
                                <input type="text" className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-bold text-txt-primary focus:border-accent shadow-sm" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary uppercase tracking-widest pl-1">Marca / Fabricante</label>
                                <input type="text" className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-bold text-txt-primary focus:border-accent shadow-sm" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-6 p-6 bg-accent/5 rounded-3xl border-2 border-accent/20 border-dotted shadow-inner">
                            <div className="col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1 text-center block">Costo Base Unit.</label>
                                <input type="number" className="w-full p-4 bg-surface border-2 border-accent/20 rounded-2xl outline-none font-mono font-black text-center text-txt-primary text-lg" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1 text-center block">Venta Unit.</label>
                                <input type="number" className="w-full p-4 bg-surface border-2 border-green-500/30 text-green-600 rounded-2xl outline-none font-mono font-black text-center text-lg shadow-green-500/5 shadow-md" value={newItemSellingPrice} onChange={e => setNewItemSellingPrice(e.target.value)} required />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <label className="text-[10px] font-black text-accent uppercase tracking-widest pl-1 text-center block">Venta Pack</label>
                                <input type="number" className="w-full p-4 bg-surface border-2 border-green-500/30 text-green-600 rounded-2xl outline-none font-mono font-black text-center text-lg shadow-green-500/5 shadow-md" value={newItemPackPrice} onChange={e => setNewItemPackPrice(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-panel-border/10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary uppercase tracking-widest pl-1">Alerta Stock Bajo</label>
                                <div className="relative">
                                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-orange-500">warning</span>
                                    <input type="number" className="w-full p-4 pl-12 bg-surface-highlight border-2 border-orange-500/20 text-orange-600 rounded-2xl outline-none font-mono font-black" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-txt-primary uppercase tracking-widest pl-1">Categoría</label>
                                <select className="w-full p-4 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-bold text-txt-primary focus:border-accent" value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)}>
                                    <option value="">Sin Categorizar</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-8 flex gap-4">
                            <Button variant="ghost" className="flex-1 py-5 border-2 border-panel-border/10 font-black text-txt-primary uppercase tracking-widest text-xs" type="button" onClick={() => setIsAddModalOpen(false)}>Descartar</Button>
                            <Button variant="primary" className="flex-1 py-5 bg-void text-white font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-accent hover:text-void transition-all" type="submit">Guardar Cambios</Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* QUICK SELL MODAL */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} className="max-w-md p-0 overflow-hidden rounded-3xl">
                <div className="p-8 bg-surface">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <span className="material-icons text-3xl">point_of_sale</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-txt-primary leading-none">Venta Rápida</h2>
                            <p className="text-[11px] text-txt-dim font-bold mt-1 uppercase tracking-tighter truncate max-w-[200px]">{selectedItem?.name}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSellSubmit} className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest pl-1">Cantidad</label>
                                <input type="number" className="w-full p-5 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none font-mono text-center text-2xl font-black text-txt-primary focus:border-accent shadow-inner" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest pl-1">Precio Final</label>
                                <input type="number" className="w-full p-5 bg-surface-highlight border-2 border-green-500/20 rounded-2xl outline-none font-mono text-center text-green-600 font-black text-2xl focus:border-green-500 shadow-inner" value={sellPriceUnit} onChange={e => setSellPriceUnit(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest pl-1">Notas</label>
                            <textarea className="w-full p-5 bg-surface-highlight border-2 border-panel-border/10 rounded-2xl outline-none h-20 text-sm resize-none font-medium text-txt-primary focus:border-accent shadow-inner" value={workDesc} onChange={e => setWorkDesc(e.target.value)} required placeholder="Notas de la operación..." />
                        </div>
                        <div className="pt-2 flex gap-4">
                            <Button variant="ghost" className="flex-1 py-5 font-black text-xs uppercase tracking-widest" type="button" onClick={() => setIsSellModalOpen(false)}>Cerrar</Button>
                            <Button variant="primary" className="flex-1 py-5 bg-green-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all" type="submit">Efectuar Cobro</Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Stock;
