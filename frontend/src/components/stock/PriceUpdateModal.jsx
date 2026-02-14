import React, { useState } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../../config';

const PriceUpdateModal = ({ isOpen, onClose, categories, onUpdateComplete }) => {
    const [scope, setScope] = useState('all'); // all, category, brand
    const [selectedCategory, setSelectedCategory] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [percentage, setPercentage] = useState('');
    const [targetField, setTargetField] = useState('price'); // cost, price, both
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!percentage || isNaN(percentage)) {
            toast.error("Ingresa un porcentaje válido");
            return;
        }

        if (scope === 'category' && !selectedCategory) {
            toast.error("Selecciona una categoría");
            return;
        }
        if (scope === 'brand' && !brandFilter.trim()) {
            toast.error("Ingresa una marca");
            return;
        }

        if (!window.confirm(`⚠️ ¿Estás seguro de actualizar precios?\n\nEsta acción modificará ${scope === 'all' ? 'TODO el inventario' : 'los productos seleccionados'} un ${percentage}%.\n\nNO se puede deshacer automáticamente.`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                target_field: targetField,
                percentage: parseFloat(percentage),
                category_id: scope === 'category' ? parseInt(selectedCategory) : null,
                brand: scope === 'brand' ? brandFilter : null
            };

            const res = await fetch(`${API_URL}/stock/bulk-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || "Precios actualizados correctamente");
                onUpdateComplete?.();
                onClose();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Error al actualizar precios");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl border border-panel-border/20 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-panel-border/10 flex justify-between items-center bg-surface-highlight/50">
                    <div>
                        <h2 className="text-lg font-black text-txt-primary uppercase tracking-tight flex items-center gap-2">
                            <span className="material-icons text-accent">price_change</span>
                            Actualización Masiva
                        </h2>
                        <p className="text-xs text-txt-dim font-medium mt-1">Ajusta precios por inflación o descuentos.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-txt-dim hover:text-txt-primary">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">

                    {/* Scope Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-txt-dim uppercase tracking-widest block">Aplicar a:</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setScope('brand')} className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${scope === 'brand' ? 'border-accent bg-accent/10 text-accent' : 'border-panel-border/10 bg-surface-highlight text-txt-dim hover:bg-white/5'}`}>
                                Por Marca
                            </button>
                            <button type="button" onClick={() => setScope('category')} className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${scope === 'category' ? 'border-accent bg-accent/10 text-accent' : 'border-panel-border/10 bg-surface-highlight text-txt-dim hover:bg-white/5'}`}>
                                Categoría
                            </button>
                            <button type="button" onClick={() => setScope('all')} className={`p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${scope === 'all' ? 'border-accent bg-accent/10 text-accent' : 'border-panel-border/10 bg-surface-highlight text-txt-dim hover:bg-white/5'}`}>
                                Todo
                            </button>
                        </div>
                    </div>

                    {/* Filter Input */}
                    {scope === 'brand' && (
                        <div className="animate-fadeIn">
                            <label className="text-xs font-black text-txt-dim uppercase tracking-widest block mb-2">Marca del Producto</label>
                            <input
                                type="text"
                                placeholder="Ej: Coca Cola"
                                className="w-full p-3 bg-surface-highlight border-2 border-panel-border/10 rounded-xl text-sm font-bold text-txt-primary outline-none focus:border-accent transition-colors"
                                value={brandFilter}
                                onChange={e => setBrandFilter(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}

                    {scope === 'category' && (
                        <div className="animate-fadeIn">
                            <label className="text-xs font-black text-txt-dim uppercase tracking-widest block mb-2">Seleccionar Categoría</label>
                            <select
                                className="w-full p-3 bg-surface-highlight border-2 border-panel-border/10 rounded-xl text-sm font-bold text-txt-primary outline-none focus:border-accent transition-colors"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="">-- Elegir --</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Percentage & Target */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-txt-dim uppercase tracking-widest block mb-2">Porcentaje %</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="10"
                                    className="w-full p-3 bg-surface-highlight border-2 border-panel-border/10 rounded-xl text-lg font-mono font-black text-txt-primary outline-none focus:border-accent transition-colors"
                                    value={percentage}
                                    onChange={e => setPercentage(e.target.value)}
                                    step="0.1"
                                    required
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-txt-dim pointer-events-none">
                                    {percentage > 0 ? 'AUMENTO' : percentage < 0 ? 'DESCUENTO' : ''}
                                </div>
                            </div>
                            <p className="text-[10px] text-txt-dim mt-1.5 leading-tight">Usa valores negativos (ej: -5) para bajar precios.</p>
                        </div>
                        <div>
                            <label className="text-xs font-black text-txt-dim uppercase tracking-widest block mb-2">Actualizar</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-txt-primary cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="target"
                                        value="price"
                                        checked={targetField === 'price'}
                                        onChange={() => setTargetField('price')}
                                        className="accent-accent w-4 h-4 cursor-pointer"
                                    />
                                    Solo Precio Venta
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-txt-primary cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="target"
                                        value="cost"
                                        checked={targetField === 'cost'}
                                        onChange={() => setTargetField('cost')}
                                        className="accent-accent w-4 h-4 cursor-pointer"
                                    />
                                    Solo Costo
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-txt-primary cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="target"
                                        value="both"
                                        checked={targetField === 'both'}
                                        onChange={() => setTargetField('both')}
                                        className="accent-accent w-4 h-4 cursor-pointer"
                                    />
                                    Ambos (Costo + Venta)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Warning Box */}
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3 items-start">
                        <span className="material-icons text-orange-500 text-xl shrink-0">warning</span>
                        <p className="text-[11px] text-orange-200/80 leading-snug">
                            <strong className="text-orange-500 block mb-0.5 uppercase tracking-wide">Atención</strong>
                            Esta acción modificará los precios de forma permanente. Asegurate de filtrar correctamente antes de confirmar.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-accent text-void rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="material-icons animate-spin text-lg">sync</span>
                        ) : (
                            <span className="material-icons text-lg">save_as</span>
                        )}
                        {isSubmitting ? 'Procesando...' : 'Confirmar Actualización'}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default PriceUpdateModal;
