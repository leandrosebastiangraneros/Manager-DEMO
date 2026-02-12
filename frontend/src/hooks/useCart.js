/**
 * useCart — Cart management hook for the sales (Ventas) component.
 * Extracted from Ventas.jsx for separation of concerns.
 */
import { useState, useCallback, useMemo } from 'react';
import { API_URL } from '../config';
import { toast } from 'sonner';

export function useCart(products, fetchData) {
    const [cart, setCart] = useState({});
    const [description, setDescription] = useState('Venta Directa Salón');
    const [submitting, setSubmitting] = useState(false);

    const updateCart = useCallback((productId, newQty, type = 'unit', formatId = null) => {
        const cartKey = type === 'pack' ? `${productId}_pack_${formatId || 'default'}` : `${productId}_unit`;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        newQty = parseFloat(newQty);
        if (isNaN(newQty)) newQty = 0;

        let pSize = 1;
        if (type === 'pack') {
            if (formatId) {
                const fmt = product.formats?.find(f => f.id === formatId);
                pSize = fmt ? fmt.pack_size : 1;
            } else {
                pSize = product.pack_size || 1;
            }
        }

        const unitsNeeded = newQty * pSize;

        // Check stock against TOTAL units of this product in cart
        const totalOtherUnits = Object.entries(cart).reduce((acc, [key, q]) => {
            if (key.startsWith(`${productId}_`) && key !== cartKey) {
                const parts = key.split('_');
                const t = parts[1];
                const fId = parts[2];
                let size = 1;
                if (t === 'pack') {
                    if (fId && fId !== 'default') {
                        const fmt = product.formats?.find(f => f.id === parseInt(fId));
                        size = fmt ? fmt.pack_size : 1;
                    } else {
                        size = product.pack_size || 1;
                    }
                }
                return acc + (q * size);
            }
            return acc;
        }, 0);

        if (unitsNeeded + totalOtherUnits > product.quantity) {
            toast.error(`Stock insuficiente para ${product.brand || ''} ${product.name}`);
            return;
        }

        if (newQty <= 0) {
            setCart(prev => {
                const newCart = { ...prev };
                delete newCart[cartKey];
                return newCart;
            });
        } else {
            setCart(prev => ({ ...prev, [cartKey]: newQty }));
        }
    }, [products, cart]);

    const cartTotal = useMemo(() => {
        return Object.entries(cart).reduce((sum, [key, qty]) => {
            const parts = key.split('_');
            const id = parseInt(parts[0]);
            const type = parts[1];
            const fId = parts[2];
            const product = products.find(p => p.id === id);
            if (!product) return sum;

            let price = product.selling_price || 0;
            if (type === 'pack') {
                if (fId && fId !== 'default') {
                    const fmt = product.formats?.find(f => f.id === parseInt(fId));
                    price = fmt ? fmt.pack_price : 0;
                } else {
                    price = product.pack_price || (product.selling_price * (product.pack_size || 1));
                }
            }

            return sum + price * qty;
        }, 0);
    }, [cart, products]);

    const cartItemCount = useMemo(() => Object.keys(cart).length, [cart]);

    const handleConfirmSale = useCallback(async () => {
        if (Object.keys(cart).length === 0) return toast.warning("El carrito está vacío.");
        setSubmitting(true);
        try {
            const payload = {
                items: Object.entries(cart)
                    .filter(([_, qty]) => qty > 0)
                    .map(([key, qty]) => {
                        const parts = key.split('_');
                        const id = parseInt(parts[0]);
                        const type = parts[1];
                        const fId = parts[2];
                        const item = {
                            item_id: id,
                            quantity: qty,
                            is_pack: type === 'pack'
                        };
                        if (fId && fId !== 'default') {
                            item.format_id = parseInt(fId);
                        }
                        return item;
                    }),
                description: description
            };

            const res = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Venta procesada con éxito.");
                setCart({});
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Error al procesar venta.");
            }
        } catch (err) {
            toast.error("Error de conexión.");
        } finally {
            setSubmitting(false);
        }
    }, [cart, description, fetchData]);

    return {
        cart, setCart,
        description, setDescription,
        submitting,
        updateCart,
        cartTotal,
        cartItemCount,
        handleConfirmSale,
    };
}
