/**
 * Stock — Inventory management page.
 * Refactored: business logic lives in useStock hook, modals in sub-components.
 */
import React, { useState } from 'react';
import { formatMoney } from '../utils/formatters';
import { useStock } from '../hooks/useStock';
import EditStockModal from './stock/EditStockModal';
import SellModal from './stock/SellModal';

const Stock = () => {
    const stock = useStock();

    if (stock.loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin text-accent">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold text-txt-primary">Sincronizando Inventario...</div>
        </div>
    );

    const [formOpen, setFormOpen] = useState(false);

    return (
        <div className="flex flex-col pb-24 lg:pb-0 lg:h-full lg:overflow-hidden">
            {/* --- HEADER: Title + Search + Stats --- */}
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
                            value={stock.searchTerm}
                            onChange={(e) => stock.setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-2">
                    <StatCard icon="dataset" color="blue" label="Productos" value={stock.totalProdCount} />
                    <StatCard icon="priority_high" color="orange" label="Bajo" value={stock.lowStockCount} valueColor="text-orange-600" />
                    <StatCard icon="payments" color="green" label="Valor" value={formatMoney(stock.inventoryValue)} />
                </div>
            </header>

            {/* --- BODY: Replenishment Form + Inventory Grid --- */}
            <div className="flex-1 lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6">

                {/* LEFT: Replenishment Form — collapsible on mobile */}
                <div className="lg:col-span-4 flex flex-col gap-4 lg:overflow-hidden">
                    {/* Mobile toggle button */}
                    <button
                        onClick={() => setFormOpen(!formOpen)}
                        className="lg:hidden w-full py-3 bg-accent text-void rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                    >
                        <span className="material-icons text-base">{formOpen ? 'expand_less' : 'add_circle'}</span>
                        {formOpen ? 'Cerrar Formulario' : 'Ingresar Mercadería'}
                    </button>
                    <div className={`${formOpen ? 'block' : 'hidden'} lg:block p-5 border border-panel-border/5 flex flex-col lg:h-full bg-surface rounded-3xl shadow-2xl relative`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-6 bg-accent rounded-full"></div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-txt-primary">Ingreso de Mercadería</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1 pb-4">

                            {/* Search existing */}
                            <div className="relative">
                                <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1.5">Vincular con Existente</label>
                                <div className="relative">
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Escribe nombre o marca..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary placeholder:text-txt-dim"
                                        value={stock.replenishSearch}
                                        onChange={e => stock.setReplenishSearch(e.target.value)}
                                    />
                                    {stock.replenishSearch && (
                                        <div className="absolute top-full left-0 w-full bg-surface border-2 border-accent/20 rounded-xl shadow-2xl z-[100] mt-1 max-h-40 overflow-y-auto backdrop-blur-md">
                                            {stock.items.filter(i => i.name.toLowerCase().includes(stock.replenishSearch.toLowerCase()) || (i.brand && i.brand.toLowerCase().includes(stock.replenishSearch.toLowerCase()))).map(i => (
                                                <button
                                                    key={i.id}
                                                    type="button"
                                                    onClick={() => stock.handleSelectExisting(i)}
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

                            {stock.selectedExisting && (
                                <div className="p-3 bg-accent/10 border-2 border-accent/30 rounded-xl relative animate-fadeIn flex justify-between items-center shadow-lg shadow-accent/5">
                                    <div className="truncate">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                                            <div className="text-[9px] font-black text-accent uppercase tracking-widest">Reposición</div>
                                        </div>
                                        <div className="text-sm font-black text-txt-primary truncate">{stock.selectedExisting.name}</div>
                                    </div>
                                    <button onClick={() => { stock.setSelectedExisting(null); stock.setReplenishSearch(''); }} className="p-1.5 bg-accent/20 hover:bg-accent/40 rounded-lg transition-colors group">
                                        <span className="material-icons text-sm text-accent group-hover:scale-110 transition-transform">close</span>
                                    </button>
                                </div>
                            )}

                            {/* Entry form */}
                            <form onSubmit={stock.addToDraft} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Marca</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={stock.newItemBrand} onChange={e => stock.setNewItemBrand(e.target.value)} disabled={!!stock.selectedExisting} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Nombre</label>
                                            <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={stock.newItemName} onChange={e => stock.setNewItemName(e.target.value)} required disabled={!!stock.selectedExisting} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">
                                            <span className="material-icons text-[11px] align-middle mr-0.5">qr_code</span>
                                            Código de Barras
                                        </label>
                                        <input type="text" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary font-mono tracking-wider disabled:opacity-50" value={stock.newItemBarcode} onChange={e => stock.setNewItemBarcode(e.target.value)} placeholder="Escanear o ingresar manualmente" disabled={!!stock.selectedExisting} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Categoría</label>
                                            <select className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none focus:border-accent font-bold text-txt-primary disabled:opacity-50" value={stock.newItemCategoryId} onChange={e => stock.setNewItemCategoryId(e.target.value)} disabled={!!stock.selectedExisting}>
                                                <option value="">Sin Categoría</option>
                                                {stock.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Individual / Pack</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => stock.setIsPack(!stock.isPack)}
                                                    className={`flex-1 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${stock.isPack ? 'bg-accent text-void border-accent shadow-lg' : 'bg-surface-highlight text-txt-primary border-panel-border/10 hover:bg-accent/5'}`}
                                                >
                                                    {stock.isPack ? 'Modo Pack' : 'Individual'}
                                                </button>
                                                {stock.isPack && (
                                                    <input type="number" placeholder="x?" className="w-14 p-2.5 bg-accent/5 border-2 border-accent/20 rounded-xl text-xs outline-none font-mono font-black text-accent text-center" value={stock.packSize} onChange={e => stock.setPackSize(e.target.value)} />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Cant. Ingreso</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none font-mono font-black focus:border-accent text-txt-primary" value={stock.newItemQuantity} onChange={e => stock.setNewItemQuantity(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-txt-primary uppercase tracking-widest block mb-1">Costo Total</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/20 rounded-xl text-xs outline-none font-mono font-black focus:border-accent text-txt-primary" placeholder="0.00" value={stock.newItemCost} onChange={e => stock.setNewItemCost(e.target.value)} required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Venta Unit.</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/10 rounded-xl outline-none font-mono font-black text-center text-green-600 focus:border-accent" value={stock.newItemSellingPrice} onChange={e => stock.setNewItemSellingPrice(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-accent uppercase tracking-widest block mb-1">Venta Pack</label>
                                            <input type="number" className="w-full p-2.5 bg-surface-highlight border border-panel-border/10 rounded-xl outline-none font-mono font-black text-center text-green-600 focus:border-accent" value={stock.newItemPackPrice} onChange={e => stock.setNewItemPackPrice(e.target.value)} placeholder="0.00" />
                                        </div>
                                    </div>

                                    <div className="p-3 bg-void/5 rounded-2xl border-2 border-dotted border-panel-border/20 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[8px] font-black text-txt-dim uppercase tracking-widest block mb-1">Costo Unitario</span>
                                            <span className="text-xs font-mono font-black text-txt-primary">{formatMoney(stock.calculatedUnitCost)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black text-txt-dim uppercase tracking-widest block mb-1">Costo Pack</span>
                                            <span className="text-xs font-mono font-black text-txt-primary">{formatMoney(stock.calculatedPackCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-accent text-void rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-accent/80 transition-all shadow-xl active:scale-[0.98] mt-2">
                                    Añadir al Borrador
                                </button>
                            </form>

                            {/* Draft list */}
                            {stock.draftItems.length > 0 && (
                                <div className="pt-4 border-t-2 border-dashed border-panel-border/10 space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h3 className="text-[10px] font-black uppercase text-txt-primary">Lote Final</h3>
                                        <button onClick={stock.handleSaveBatch} disabled={stock.isSavingBatch} className="bg-accent text-void text-[9px] font-black px-4 py-2 rounded-xl uppercase hover:shadow-lg transition-all active:scale-90">
                                            {stock.isSavingBatch ? 'Guardando...' : 'Confirmar Todo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {stock.draftItems.map((item, idx) => (
                                            <div key={idx} className="bg-surface p-3 rounded-2xl border-2 border-panel-border/5 text-[10px] flex justify-between items-center group relative shadow-md hover:border-accent/20 transition-all overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent/40"></div>
                                                <div className="truncate pr-10 flex flex-col pl-2">
                                                    <span className="font-black truncate text-txt-primary uppercase tracking-tight">{item.name}</span>
                                                    <span className="text-[8px] text-txt-dim uppercase font-bold mt-0.5">
                                                        {item.item_id ? '🔄 Reposición' : '✨ Nuevo'} • {item.quantity} {item.is_pack ? 'Packs' : 'Unid'} • {formatMoney(item.cost_amount)}
                                                    </span>
                                                </div>
                                                <button onClick={() => stock.setDraftItems(prev => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-all absolute right-3 top-1/2 -translate-y-1/2">
                                                    <span className="material-icons text-lg">cancel</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Inventory Table */}
                <div className="lg:col-span-8 lg:overflow-hidden flex flex-col bg-surface rounded-3xl border border-panel-border/5 shadow-2xl relative">
                    <div className="overflow-auto custom-scrollbar flex-1 relative">
                        {/* Desktop Table */}
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
                                {stock.filteredItems.map(item => (
                                    <StockRow key={item.id} item={item} onEdit={stock.openEditModal} onDelete={stock.handleDeleteClick} />
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile View */}
                        <div className="md:hidden divide-y divide-panel-border/10">
                            {stock.filteredItems.map(item => (
                                <MobileStockCard key={item.id} item={item} onEdit={stock.openEditModal} onDelete={stock.handleDeleteClick} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            <EditStockModal
                isOpen={stock.isAddModalOpen}
                onClose={() => stock.setIsAddModalOpen(false)}
                newItemName={stock.newItemName} setNewItemName={stock.setNewItemName}
                newItemBrand={stock.newItemBrand} setNewItemBrand={stock.setNewItemBrand}
                newItemCost={stock.newItemCost} setNewItemCost={stock.setNewItemCost}
                newItemQuantity={stock.newItemQuantity} setNewItemQuantity={stock.setNewItemQuantity}
                newItemSellingPrice={stock.newItemSellingPrice} setNewItemSellingPrice={stock.setNewItemSellingPrice}
                newItemPackPrice={stock.newItemPackPrice} setNewItemPackPrice={stock.setNewItemPackPrice}
                newItemCategoryId={stock.newItemCategoryId} setNewItemCategoryId={stock.setNewItemCategoryId}
                minStockAlert={stock.minStockAlert} setMinStockAlert={stock.setMinStockAlert}
                categories={stock.categories}
                onSubmit={stock.handleEditSubmit}
            />

            <SellModal
                isOpen={stock.isSellModalOpen}
                onClose={() => stock.setIsSellModalOpen(false)}
                selectedItem={stock.selectedItem}
                sellPriceUnit={stock.sellPriceUnit} setSellPriceUnit={stock.setSellPriceUnit}
                sellQuantity={stock.sellQuantity} setSellQuantity={stock.setSellQuantity}
                workDesc={stock.workDesc} setWorkDesc={stock.setWorkDesc}
                onSubmit={stock.handleSellSubmit}
            />
        </div>
    );
};

// ---------- Sub-components ----------

const StatCard = ({ icon, color, label, value, valueColor = 'text-txt-primary' }) => (
    <div className={`bg-surface p-2.5 md:p-4 rounded-xl md:rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-2 md:gap-4 group hover:border-${color}-500/30 transition-all`}>
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-${color}-500/10 text-${color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <span className="material-icons text-lg md:text-xl">{icon}</span>
        </div>
        <div>
            <div className="text-[9px] md:text-[9px] font-black text-txt-secondary uppercase tracking-wider md:tracking-widest">{label}</div>
            <div className={`text-sm md:text-lg font-mono font-black ${valueColor}`}>{value}</div>
        </div>
    </div>
);

const StockRow = ({ item, onEdit, onDelete }) => {
    const isLowStock = item.quantity <= (item.min_stock_alert || 5);
    return (
        <tr className="hover:bg-accent/5 transition-all group border-l-4 border-l-transparent hover:border-l-accent">
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
                    {item.is_pack && item.pack_price > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-accent uppercase tracking-tighter">Pack x{item.pack_size}:</span>
                            <span className="text-[11px] font-mono font-black text-accent">{formatMoney(item.pack_price)}</span>
                        </div>
                    )}
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
                    <button onClick={() => onEdit(item)} className="p-2.5 bg-surface-highlight text-txt-dim hover:text-accent hover:bg-accent/10 rounded-xl transition-all shadow-sm" title="Editar Parámetros">
                        <span className="material-icons text-lg">settings</span>
                    </button>
                    <button onClick={() => onDelete(item)} className="p-2.5 bg-surface-highlight text-txt-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-sm" title="Eliminar Producto">
                        <span className="material-icons text-lg">delete_outline</span>
                    </button>
                </div>
            </td>
        </tr>
    );
};

const MobileStockCard = ({ item, onEdit, onDelete }) => {
    const isLowStock = item.quantity <= (item.min_stock_alert || 5);
    return (
        <div className="p-4 flex flex-col gap-3 bg-surface active:bg-accent/5 transition-colors">
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
                <button onClick={() => onEdit(item)} className="p-3 bg-surface-highlight text-txt-primary rounded-xl flex-1 border border-panel-border/10 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="material-icons text-base">edit</span> Editar
                </button>
                <button onClick={() => onDelete(item)} className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 transition-all flex items-center justify-center">
                    <span className="material-icons text-base">delete</span>
                </button>
            </div>
        </div>
    );
};

export default Stock;
