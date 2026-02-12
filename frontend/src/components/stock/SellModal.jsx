/**
 * SellModal — Quick sell modal for stock items.
 * Extracted from Stock.jsx.
 */
import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const SellModal = ({
    isOpen, onClose,
    selectedItem,
    sellPriceUnit, setSellPriceUnit,
    sellQuantity, setSellQuantity,
    workDesc, setWorkDesc,
    onSubmit,
}) => (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-0 overflow-hidden rounded-3xl">
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

            <form onSubmit={onSubmit} className="space-y-8">
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
                    <Button variant="ghost" className="flex-1 py-5 font-black text-xs uppercase tracking-widest" type="button" onClick={onClose}>Cerrar</Button>
                    <Button variant="primary" className="flex-1 py-5 bg-green-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-700 transition-all" type="submit">Efectuar Cobro</Button>
                </div>
            </form>
        </div>
    </Modal>
);

export default SellModal;
