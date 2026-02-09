import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';

const ConfigPanel = () => {
    const [meterPrice, setMeterPrice] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchPrice();
    }, []);

    const fetchPrice = async () => {
        try {
            const res = await fetch(`${API_URL}/config/meter_price`);
            if (res.ok) {
                const data = await res.json();
                setMeterPrice(data.value);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        if (!meterPrice || isNaN(parseFloat(meterPrice))) {
            setMessage({ type: 'error', text: 'Por favor ingrese un monto válido' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'meter_price', value: String(meterPrice) })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Precio actualizado correctamente.' });
                await fetchPrice(); // Verify persistence
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Error del servidor al actualizar precio.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error de conexión.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassContainer className="mb-6 border-b-2 border-b-accent relative overflow-hidden p-4 md:p-6">

            {/* Decorative */}
            <div className="absolute top-0 right-0 p-6 opacity-5">
                <span className="material-icons text-8xl text-accent">price_check</span>
            </div>

            <h2 className="text-xl font-display font-bold mb-6 flex items-center text-white gap-2">
                <span className="material-icons text-accent">settings</span>
                Configuración Global
            </h2>

            <div className="flex flex-col md:flex-row items-end gap-6">
                <div className="flex-1 w-full relative z-10">
                    <label className="block text-txt-dim text-[10px] uppercase font-bold mb-2 tracking-widest">
                        Precio por Metro ($)
                    </label>
                    <input
                        type="number"
                        value={meterPrice}
                        onChange={(e) => setMeterPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono text-xl focus:border-accent outline-none transition-colors"
                        placeholder="e.g. 1500"
                    />
                    <p className="text-[10px] text-txt-dim mt-2">
                        Valor base para calcular ganancias en nuevos envíos.
                    </p>
                </div>

                <div className="relative z-10">
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        variant="neon"
                        icon={<span className="material-icons">save</span>}
                    >
                        {loading ? 'Guardando...' : 'Guardar Precio'}
                    </Button>
                </div>
            </div>

            {message && (
                <div className={`mt-6 p-3 rounded-lg flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-success/10 text-success border border-success/30' : 'bg-error/10 text-error border border-error/30'}`}>
                    <span className="material-icons text-base">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                    {message.text}
                </div>
            )}
        </GlassContainer>
    );
};

export default ConfigPanel;
