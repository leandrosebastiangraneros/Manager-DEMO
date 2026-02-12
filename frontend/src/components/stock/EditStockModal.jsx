/**
 * EditStockModal — Product configuration modal for editing stock items.
 * Extracted from Stock.jsx.
 */
import React from 'react';
import { formatMoney } from '../../utils/formatters';
import Modal from '../common/Modal';
import Button from '../common/Button';

const EditStockModal = ({
    isOpen, onClose,
    // Form values
    newItemName, setNewItemName,
    newItemBrand, setNewItemBrand,
    newItemCost, setNewItemCost,
    newItemQuantity, setNewItemQuantity,
    newItemSellingPrice, setNewItemSellingPrice,
    newItemPackPrice, setNewItemPackPrice,
    newItemCategoryId, setNewItemCategoryId,
    minStockAlert, setMinStockAlert,
    categories,
    // Handler
    onSubmit,
}) => (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-0 overflow-hidden rounded-3xl">
        <div className="flex flex-col bg-surface overflow-hidden">
            <div className="p-8 bg-void text-white flex items-center justify-between shadow-xl">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Configuración del Producto</h2>
                    <p className="text-[10px] text-accent font-black uppercase tracking-widest mt-1 opacity-70">Ajusta los parámetros de stock y precios de venta</p>
                </div>
                <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all group">
                    <span className="material-icons group-hover:rotate-90 transition-transform">close</span>
                </button>
            </div>

            <form onSubmit={onSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
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
                    <Button variant="ghost" className="flex-1 py-5 border-2 border-panel-border/10 font-black text-txt-primary uppercase tracking-widest text-xs" type="button" onClick={onClose}>Descartar</Button>
                    <Button variant="primary" className="flex-1 py-5 bg-void text-white font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-accent hover:text-void transition-all" type="submit">Guardar Cambios</Button>
                </div>
            </form>
        </div>
    </Modal>
);

export default EditStockModal;
