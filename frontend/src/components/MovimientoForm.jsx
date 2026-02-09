import React, { useState, useEffect } from 'react';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import { toast } from 'sonner';

const MovimientoForm = ({ type, onClose, onSave }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState([]);
    const [displayAmount, setDisplayAmount] = useState('');
    const { showAlert } = useDialog();

    useEffect(() => {
        fetch(`${API_URL}/categories`)
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error("Error fetching categories:", err));

        if (categories.length === 0) {
            setCategories([
                { id: 1, name: 'Honorarios / Servicios', type: 'INCOME' },
                { id: 2, name: 'Venta de Productos', type: 'INCOME' },
                { id: 3, name: 'Otros Ingresos', type: 'INCOME' },
                { id: 4, name: 'Monotributo / Impuestos', type: 'EXPENSE' },
                { id: 5, name: 'Servicios (Luz, Internet)', type: 'EXPENSE' },
                { id: 6, name: 'Insumos / Materiales', type: 'EXPENSE' },
                { id: 7, name: 'Viáticos / Transporte', type: 'EXPENSE' },
                { id: 8, name: 'Publicidad / Marketing', type: 'EXPENSE' },
                { id: 9, name: 'Alquiler', type: 'EXPENSE' },
                { id: 10, name: 'Equipamiento', type: 'EXPENSE' },
                { id: 11, name: 'Suscripciones Software', type: 'EXPENSE' },
                { id: 12, name: 'Otros Gastos', type: 'EXPENSE' }
            ]);
        }
    }, [categories.length]);

    const handleAmountChange = (e) => {
        let rawValue = e.target.value.replace(/\D/g, '');
        if (!rawValue) {
            setDisplayAmount('');
            setAmount('');
            return;
        }
        const numberValue = parseInt(rawValue, 10);
        const formatted = (numberValue / 100).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        setDisplayAmount(formatted);
        setAmount((numberValue / 100).toString());
    };

    const filteredCategories = categories.filter(cat => cat.type === type);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!categoryId) {
            toast.error("Por favor selecciona una categoría");
            return;
        }
        const payload = {
            amount: parseFloat(amount),
            description,
            type: type,
            category_id: parseInt(categoryId),
            is_invoiced: false
        };

        fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                onSave(data);
                onClose();
                toast.success("Movimiento registrado con éxito");
            })
            .catch(err => toast.error("Error saving: " + err));
    };

    const isIncome = type === 'INCOME';
    const accentColor = isIncome ? 'text-success' : 'text-error';
    const borderColor = isIncome ? 'border-success' : 'border-error';

    return (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity animate-[fadeIn_0.2s_ease-out]">
            <GlassContainer className="w-full max-w-2xl overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
                {/* Header */}
                <div className={`p-6 flex justify-between items-center border-b border-white/5 bg-white/5`}>
                    <h2 className={`text-xl font-display font-bold tracking-tight uppercase flex items-center gap-2 ${accentColor}`}>
                        <span className="material-icons">{isIncome ? 'add_circle' : 'remove_circle'}</span>
                        {isIncome ? 'Registrar Ingreso' : 'Registrar Gasto'}
                    </h2>
                    <button onClick={onClose} className="text-txt-secondary hover:text-white transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-3">Monto Total</label>
                        <div className="relative group">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold transition-colors ${accentColor}`}>$</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={`w-full pl-12 pr-4 py-4 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none text-4xl font-mono font-bold text-white tracking-tight transition-all placeholder:text-txt-dim focus:shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
                                placeholder="0,00"
                                value={displayAmount}
                                onChange={handleAmountChange}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Category Selection (Chips) */}
                    <div>
                        <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-3">Categoría</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryId(cat.id)}
                                    className={`px-3 py-3 rounded-lg text-xs font-medium transition-all duration-200 border text-left h-auto min-h-[3.5rem] flex items-center
                                        ${categoryId === cat.id
                                            ? `bg-white/10 text-white ${borderColor} shadow-[0_0_10px_rgba(255,255,255,0.1)]`
                                            : 'border-white/5 bg-surface text-txt-secondary hover:bg-white/5 hover:text-white hover:border-white/10'
                                        }`}
                                >
                                    <span className="whitespace-normal leading-tight">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-xs font-mono font-bold text-txt-dim uppercase tracking-widest mb-3">Descripción / Nota</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 bg-surface-highlight border border-white/10 rounded-xl focus:border-accent/50 focus:ring-1 focus:ring-accent/50 outline-none text-white font-medium transition-all placeholder:text-txt-dim"
                            placeholder="Ej: Pago cliente mensual..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t border-white/5">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant={isIncome ? 'primary' : 'danger'}
                            className="flex-1 shadow-lg"
                        >
                            {isIncome ? 'Confirmar Ingreso' : 'Confirmar Gasto'}
                        </Button>
                    </div>
                </form>
            </GlassContainer>
        </div>
    );
};

export default MovimientoForm;
