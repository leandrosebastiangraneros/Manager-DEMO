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
    const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
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
    const [minStockAlert, setMinStockAlert] = useState('5');

    // Search/Selection for Replenishment & Main View
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
        const cost = parseFloat(newItemCost);
        const qty = parseFloat(newItemQuantity);
        const sellPrice = parseFloat(newItemSellingPrice) || 0;
        const packP = newItemPackPrice ? parseFloat(newItemPackPrice) : null;
        const pSize = parseFloat(packSize) || 1;

        if (!newItemName || isNaN(cost) || isNaN(qty)) {
            showAlert("Completa los datos mínimos (Nombre, Costo, Cantidad)", "error");
            return;
        }

        const draftItem = {
            item_id: selectedExisting ? selectedExisting.id : null,
            name: newItemName,
            brand: newItemBrand,
            is_pack: isPack,
            pack_size: pSize,
            cost_amount: cost,
            quantity: qty,
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
                setIsReplenishModalOpen(false);
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
        setNewItemCategoryId(item.category_id || '');
        setIsPack(false);
        setPackSize('1');
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
            {/* Professional Header */}
            <header className="mb-6 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-1 uppercase">
                            Inventario de <span className="text-txt-primary/50">Productos</span>
                        </h1>
                        <p className="text-txt-secondary text-xs font-medium">Gestiona el stock y los precios de tu catálogo.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl bg-surface flex-1 md:w-80 border border-panel-border/5">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-txt-primary transition-colors text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-txt-primary font-medium text-sm rounded-xl outline-none placeholder:text-txt-dim"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setDraftItems([]);
                                setIsReplenishModalOpen(true);
                            }}
                            className="bg-accent text-void px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95"
                        >
                            <span className="material-icons text-sm">inventory_2</span>
                            <span className="hidden sm:inline">Reposición</span>
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="bg-surface p-5 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-accent/20 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-2xl">grid_view</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Productos</div>
                            <div className="text-xl font-mono font-black text-txt-primary">{totalProdCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-5 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-2xl">warning_amber</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock Bajo</div>
                            <div className="text-xl font-mono font-black text-orange-600">{lowStockCount}</div>
                        </div>
                    </div>
                    <div className="bg-surface p-5 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-green-200 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-icons text-2xl">payments</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor Inventario</div>
                            <div className="text-xl font-mono font-black text-txt-primary">{formatMoney(inventoryValue)}</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Table Area */}
            <div className="flex-1 overflow-hidden bg-surface rounded-2xl border border-panel-border/5 shadow-sm flex flex-col">
                <div className="overflow-auto custom-scrollbar flex-1">
                    {/* Desktop Table */}
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead>
                            <tr className="bg-gray-50/50 text-txt-dim text-[10px] uppercase font-bold tracking-widest border-b border-panel-border/5 sticky top-0 bg-surface z-10">
                                <th className="p-4 pl-8">Producto</th>
                                <th className="p-4 text-center">Stock Actual</th>
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
                                                <div className="w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center text-txt-dim">
                                                    <span className="material-icons text-xl">{item.pack_size > 1 ? 'inventory_2' : 'shopping_basket'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-txt-primary line-clamp-1">{item.name}</span>
                                                    <span className="text-[10px] text-txt-dim uppercase font-medium">{item.brand || 'Genérico'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-sm font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-xs text-txt-dim">{formatMoney(item.unit_cost)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-mono font-bold text-txt-primary">{formatMoney(item.selling_price)}</span>
                                                <span className="text-[8px] text-gray-400 uppercase font-black">Por Unidad</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm flex items-center justify-center w-fit mx-auto gap-1 ${isLowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                                {isLowStock ? 'Stock Bajo' : 'En Stock'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right pr-8">
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => openEditModal(item)} className="p-2 text-gray-400 hover:text-accent transition-colors" title="Editar">
                                                    <span className="material-icons text-lg">edit</span>
                                                </button>
                                                <button onClick={() => handleDeleteClick(item)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                                                    <span className="material-icons text-lg">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-panel-border/5">
                        {filteredItems.map(item => {
                            const isLowStock = item.quantity <= (item.min_stock_alert || 5);
                            return (
                                <div key={item.id} className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center text-txt-dim">
                                                <span className="material-icons text-xl">{item.pack_size > 1 ? 'inventory_2' : 'shopping_basket'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-txt-primary">{item.name}</span>
                                                <span className="text-[10px] text-txt-dim uppercase">{item.brand || 'Genérico'}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm ${isLowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                            {isLowStock ? 'Bajo' : 'OK'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-[9px] text-gray-400 uppercase font-black">Stock</span>
                                            <div className={`text-sm font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>{item.quantity}</div>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-gray-400 uppercase font-black">Precio</span>
                                            <div className="text-sm font-mono font-bold text-txt-primary">{formatMoney(item.selling_price)}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(item)} className="p-2 text-gray-400"><span className="material-icons text-sm">edit</span></button>
                                            <button onClick={() => handleDeleteClick(item)} className="p-2 text-gray-400"><span className="material-icons text-sm">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Replenish Modal */}
            <Modal isOpen={isReplenishModalOpen} onClose={() => setIsReplenishModalOpen(false)} className="max-w-5xl p-0 overflow-hidden">
                <div className="flex flex-col h-[90vh]">
                    <div className="p-6 bg-surface border-b border-panel-border/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent text-void flex items-center justify-center">
                                <span className="material-icons">inventory_2</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Reposición de Mercadería</h2>
                                <p className="text-xs text-txt-dim">Carga nuevos productos o repone existentes en lote.</p>
                            </div>
                        </div>
                        <button onClick={() => setIsReplenishModalOpen(false)} className="text-gray-400 hover:text-txt-primary transition-colors">
                            <span className="material-icons">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-surface-highlight/30">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1">
                                <GlassContainer className="p-6 border-panel-border/5 space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-txt-primary/50">Datos del Lote</h3>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">¿Producto Existente?</label>
                                            <div className="relative group">
                                                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar para reponer..."
                                                    className="w-full pl-9 pr-4 py-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none focus:border-accent transition-all"
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                />
                                                {searchTerm && (
                                                    <div className="absolute top-full left-0 w-full bg-surface border border-panel-border rounded-xl shadow-2xl z-[150] mt-1 max-h-48 overflow-y-auto">
                                                        {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(i => (
                                                            <button
                                                                key={i.id}
                                                                type="button"
                                                                onClick={() => { handleSelectExisting(i); setSearchTerm(''); }}
                                                                className="w-full text-left px-4 py-3 hover:bg-surface-highlight text-xs border-b border-panel-border/5 last:border-0"
                                                            >
                                                                <div className="font-bold">{i.name}</div>
                                                                <div className="text-[10px] text-gray-400 underline">Stock actual: {i.quantity}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedExisting && (
                                            <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl relative animate-fadeIn flex justify-between items-center">
                                                <div>
                                                    <div className="text-[9px] font-black text-accent uppercase tracking-tighter">Seleccionado</div>
                                                    <div className="text-xs font-bold">{selectedExisting.name}</div>
                                                </div>
                                                <button onClick={() => setSelectedExisting(null)} className="text-accent underline text-[10px] font-bold">Quitar</button>
                                            </div>
                                        )}

                                        <form onSubmit={addToDraft} className="space-y-4 pt-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Marca</label>
                                                    <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none disabled:opacity-50" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} disabled={!!selectedExisting} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nombre</label>
                                                    <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none disabled:opacity-50" value={newItemName} onChange={e => setNewItemName(e.target.value)} required disabled={!!selectedExisting} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{isPack ? 'Cant. Packs' : 'Cantidad'}</label>
                                                    <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono" value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)} required />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Costo Lote</label>
                                                    <input type="number" className="w-full p-3 bg-surface-highlight border border-panel-border rounded-xl text-xs outline-none font-mono" placeholder="0.00" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} required />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <button type="submit" className="w-full py-4 bg-void text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-accent hover:text-void transition-all shadow-md active:scale-95">
                                                    Agregar al Borrador
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </GlassContainer>
                            </div>

                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <div className="flex justify-between items-center px-2">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-txt-primary/50">Draft de Ingreso ({draftItems.length})</h3>
                                    {draftItems.length > 0 && (
                                        <button onClick={handleSaveBatch} disabled={isSavingBatch} className="bg-accent text-void px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-accent/20 transition-all active:scale-95">
                                            {isSavingBatch ? 'Procesando...' : 'Confirmar Todo el Lote'}
                                        </button>
                                    )}
                                </div>

                                {draftItems.length === 0 ? (
                                    <div className="flex-1 border-2 border-dashed border-panel-border/20 rounded-3xl flex flex-col items-center justify-center text-gray-300 min-h-[400px]">
                                        <span className="material-icons text-6xl mb-4 opacity-10">playlist_add</span>
                                        <p className="text-[11px] font-mono uppercase tracking-widest">No hay items en el borrador</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {draftItems.map((item, idx) => (
                                            <div key={idx} className="bg-surface p-5 rounded-2xl border border-panel-border/5 shadow-sm relative group animate-fadeIn transition-all hover:border-accent/10">
                                                <button onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors">
                                                    <span className="material-icons text-lg">cancel</span>
                                                </button>
                                                <div className="mb-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${item.item_id ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {item.item_id ? 'Reposición' : 'Nuevo Producto'}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-sm truncate text-txt-primary mb-1">{item.name}</div>
                                                <div className="text-[10px] text-txt-dim uppercase font-medium">{item.brand || 'Genérico'}</div>
                                                <div className="mt-4 pt-4 border-t border-panel-border/5 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-[9px] text-gray-400 uppercase font-black">Cant.</span>
                                                        <div className="text-xs font-mono font-bold">{item.quantity} {item.is_pack ? 'Packs' : 'Unid.'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-gray-400 uppercase font-black">Costo Lote</span>
                                                        <div className="text-xs font-mono font-bold text-green-600">{formatMoney(item.cost_amount)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} className="max-w-xl p-8">
                <h2 className="text-xl font-black uppercase tracking-tight mb-8">
                    {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <form onSubmit={handleEditSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marca</label>
                            <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-medium" value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</label>
                            <input type="text" className="w-full p-3 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-medium" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Alert</label>
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
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Otros Formatos</h4>
                        <div className="space-y-3 mb-6">
                            {newItemFormats.map((f, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-surface-highlight rounded-xl border border-panel-border/5">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-void text-white flex items-center justify-center text-[10px] font-black">X{f.pack_size}</span>
                                        <div className="text-xs font-bold">{f.label}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-mono font-black text-accent">{formatMoney(f.pack_price)}</span>
                                        <button type="button" onClick={() => deleteFormat(f.id, i)} className="text-gray-300 hover:text-red-500"><span className="material-icons text-sm">delete</span></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-12 gap-2 bg-surface-highlight/30 p-3 rounded-2xl border border-panel-border/5">
                            <input className="col-span-3 p-2 bg-surface text-[10px] rounded-lg outline-none border border-panel-border/5" placeholder="Cant." value={formatPackSize} onChange={e => setFormatPackSize(e.target.value)} type="number" />
                            <input className="col-span-4 p-2 bg-surface text-[10px] rounded-lg outline-none border border-panel-border/5" placeholder="Precio" value={formatPackPrice} onChange={e => setFormatPackPrice(e.target.value)} type="number" />
                            <input className="col-span-3 p-2 bg-surface text-[10px] rounded-lg outline-none border border-panel-border/5" placeholder="Nombre" value={formatLabel} onChange={e => setFormatLabel(e.target.value)} />
                            <button type="button" onClick={addFormatToItem} className="col-span-2 bg-void text-white rounded-lg flex items-center justify-center hover:bg-accent transition-colors"><span className="material-icons text-sm">add</span></button>
                        </div>
                    </div>

                    <div className="pt-8 flex gap-3">
                        <Button variant="ghost" className="flex-1" type="button" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" className="flex-1 bg-void text-white" type="submit">Guardar Cambios</Button>
                    </div>
                </form>
            </Modal>

            {/* Sell Modal */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} className="max-w-md p-8">
                <h2 className="text-xl font-black uppercase tracking-tight mb-2">Registrar Venta</h2>
                <p className="text-xs text-txt-dim mb-8">{selectedItem?.name}</p>
                <form onSubmit={handleSellSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cantidad</label>
                            <input type="number" className="w-full p-4 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-mono text-center" value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unit.</label>
                            <input type="number" className="w-full p-4 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none font-mono text-center text-green-600 font-bold" value={sellPriceUnit} onChange={e => setSellPriceUnit(e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nota / Descripción</label>
                        <textarea className="w-full p-4 bg-surface-highlight border border-panel-border/5 rounded-xl outline-none h-24 text-sm" value={workDesc} onChange={e => setWorkDesc(e.target.value)} required placeholder="ej. Venta salón" />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button variant="ghost" className="flex-1" type="button" onClick={() => setIsSellModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" className="flex-1 bg-accent text-void" type="submit">Confirmar Venta</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Stock;
