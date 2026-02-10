import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import { toast } from 'sonner';

const Ventas = () => {
    const { showAlert } = useDialog();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Cart Management: { productId: quantity }
    const [cart, setCart] = useState({});
    const [description, setDescription] = useState('Venta Directa Salón');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // Optimistic Load
        const cachedProds = localStorage.getItem('ventas_products');
        const cachedCats = localStorage.getItem('ventas_categories');

        if (cachedProds && cachedCats) {
            setProducts(JSON.parse(cachedProds));
            setCategories(JSON.parse(cachedCats));
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const [prodRes, catRes] = await Promise.all([
                fetch(`${API_URL}/stock`),
                fetch(`${API_URL}/categories`)
            ]);
            const prodsData = await prodRes.json();
            const catsData = await catRes.json();

            const availableProds = Array.isArray(prodsData) ? prodsData.filter(p => p.status === 'AVAILABLE') : [];
            const safeCats = Array.isArray(catsData) ? catsData : [];

            setProducts(availableProds);
            setCategories(safeCats);

            localStorage.setItem('ventas_products', JSON.stringify(availableProds));
            localStorage.setItem('ventas_categories', JSON.stringify(safeCats));
        } catch (err) {
            console.error(err);
            if (!cachedProds) toast.error("Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    };

    const updateCart = (productId, qty) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newQty = parseFloat(qty) || 0;
        if (newQty > product.quantity) {
            toast.error(`Stock insuficiente para ${product.name}`);
            return;
        }

        setCart(prev => {
            // Permitimos que el valor sea 0 o vacío momentáneamente sin borrar el ítem
            // El borrado real se hace con el botón 'delete'
            return { ...prev, [productId]: newQty };
        });
    };

    const calculateTotal = () => {
        return Object.entries(cart).reduce((sum, [id, qty]) => {
            const product = products.find(p => p.id === parseInt(id));
            return sum + (product?.selling_price || 0) * qty;
        }, 0);
    };

    const handleConfirmSale = async () => {
        if (Object.keys(cart).length === 0) return toast.warning("El carrito está vacío.");
        setSubmitting(true);
        try {
            const payload = {
                items: Object.entries(cart).map(([id, qty]) => ({
                    item_id: parseInt(id),
                    quantity: qty
                })),
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
                setSearchTerm(''); // Clear search on success
                fetchData(); // Refresh stock
            } else {
                const err = await res.json();
                toast.error(err.detail || "Error al procesar venta.");
            }
        } catch (err) {
            toast.error("Error de conexión.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatMoney = (val) => {
        return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    };

    // Filter Logic
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping logic based on filtered results
    const productsByCategory = categories.map(cat => ({
        ...cat,
        items: filteredProducts.filter(p => p.category_id === cat.id)
    })).filter(cat => cat.items.length > 0);

    const uncategorizedItems = filteredProducts.filter(p => !p.category_id);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold">Cargando Terminal...</div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 h-[calc(100vh-100px)]">

            {/* Left: Product Selection Area */}
            <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                <header className="mb-8 flex-shrink-0">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h1 className="text-3xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-1">
                                Punto de Venta
                            </h1>
                            <p className="text-txt-secondary text-sm font-medium">Seleccione productos para agregar al pedido.</p>
                        </div>
                        <div className="hidden md:block text-right">
                            <div className="text-[10px] font-bold text-txt-dim uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                                Terminal 01
                            </div>
                        </div>
                    </div>

                    {/* Modern Search Bar */}
                    <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl bg-surface">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-txt-primary transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Buscar producto por nombre..."
                            className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-txt-primary font-medium text-base rounded-xl outline-none placeholder:text-txt-dim"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-surface-highlight p-1 rounded-full text-txt-dim hover:bg-gray-200 transition-colors"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Product Grid - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2 pb-4">
                    {[...productsByCategory, { id: 'none', name: 'Otros', items: uncategorizedItems }]
                        .filter(sec => sec.items.length > 0)
                        .map(section => (
                            <div key={section.id} className="space-y-4">
                                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider flex items-center gap-3">
                                    <span className="w-8 h-[1px] bg-gray-300"></span>
                                    {section.name}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {section.items.map(product => {
                                        const inCart = cart[product.id] > 0;
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => updateCart(product.id, (cart[product.id] || 0) + 1)}
                                                className={`
                                                    text-left relative p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between h-28
                                                    ${inCart
                                                        ? 'bg-accent text-void shadow-xl scale-[1.02] ring-2 ring-offset-2 ring-accent'
                                                        : 'bg-surface text-txt-primary hover:shadow-lg border border-gray-100/10 hover:border-gray-200'}
                                                `}
                                            >
                                                <div className="flex justify-between items-start w-full">
                                                    <span className={`font-bold text-sm leading-snug pr-2 line-clamp-2 ${inCart ? 'text-void' : 'text-txt-primary'}`}>
                                                        {product.name}
                                                    </span>
                                                    {inCart && (
                                                        <span className="bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm min-w-[24px] text-center">
                                                            {cart[product.id]}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-end w-full mt-2">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-medium uppercase tracking-wide ${inCart ? 'text-void/60' : 'text-txt-dim'}`}>
                                                            Stock: {product.quantity}
                                                        </span>
                                                    </div>
                                                    <span className={`font-mono font-bold text-sm ${inCart ? 'text-void' : 'text-txt-primary'}`}>
                                                        {formatMoney(product.selling_price)}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                    {filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="bg-gray-100 p-4 rounded-full mb-3">
                                <span className="material-icons text-3xl opacity-50">search_off</span>
                            </div>
                            <p className="font-medium text-sm">No encontramos productos.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Cart/Summary Panel */}
            <div className="lg:col-span-1 h-full flex flex-col">
                <div className="flex-1 flex flex-col bg-surface rounded-3xl shadow-xl overflow-hidden border border-gray-100/10">
                    {/* Cart Header */}
                    <div className="p-6 bg-surface border-b border-gray-100/10 flex justify-between items-center z-10 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-txt-primary tracking-tight">Pedido Actual</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <span className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full">
                            {Object.keys(cart).length}
                        </span>
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-surface-highlight/30">
                        {Object.entries(cart).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <span className="material-icons text-6xl mb-4 text-gray-200">shopping_bag</span>
                                <p className="text-sm font-medium">Su carrito está vacío</p>
                            </div>
                        ) : (
                            Object.entries(cart).map(([id, qty]) => {
                                const product = products.find(p => p.id === parseInt(id));
                                if (!product) return null;
                                return (
                                    <div key={id} className="flex items-center gap-4 group">
                                        {/* Qty Controls - Manual Input */}
                                        <div className="flex flex-col items-center bg-surface rounded-lg shadow-sm border border-gray-100/10 overflow-hidden w-12">
                                            <input
                                                type="number"
                                                className="w-full text-center h-10 text-xs font-bold font-mono text-txt-primary bg-transparent outline-none border-b border-gray-100"
                                                value={qty}
                                                onChange={(e) => updateCart(product.id, e.target.value)}
                                                min="0.1"
                                                step="0.1"
                                            />
                                            <div className="flex w-full">
                                                <button
                                                    onClick={() => updateCart(product.id, qty + 1)}
                                                    className="flex-1 h-6 flex items-center justify-center text-gray-600 hover:bg-surface-highlight hover:text-txt-primary transition-colors border-r border-gray-100"
                                                >
                                                    <span className="material-icons text-[10px]">add</span>
                                                </button>
                                                <button
                                                    onClick={() => updateCart(product.id, Math.max(0, qty - 1))}
                                                    className="flex-1 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                                                >
                                                    <span className="material-icons text-[10px]">remove</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-txt-primary text-sm font-bold truncate">{product.name}</div>
                                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                                                <span className="font-mono">{formatMoney(product.selling_price)}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>Subtotal: {formatMoney(product.selling_price * qty)}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => updateCart(product.id, 0)}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-2"
                                        >
                                            <span className="material-icons text-lg">delete_outline</span>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Cart Footer & Totals */}
                    <div className="p-6 bg-surface border-t border-gray-100/10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] space-y-6 z-20">
                        <div className="space-y-1">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-txt-dim mb-1">Total a Pagar</span>
                                <span className="text-4xl font-mono font-black text-txt-primary tracking-tight">
                                    {formatMoney(calculateTotal())}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">person</span>
                                <input
                                    className="w-full bg-surface-highlight border border-transparent focus:bg-surface focus:border-gray-200 rounded-xl py-3 pl-9 pr-4 text-txt-primary text-sm outline-none transition-all placeholder:text-txt-dim font-medium"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Cliente / Nota (Opcional)"
                                />
                            </div>
                            <Button
                                variant="primary"
                                className="w-full h-14 rounded-xl shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 transition-all text-base tracking-wide"
                                onClick={handleConfirmSale}
                                disabled={submitting || Object.keys(cart).length === 0}
                                icon={<span className="material-icons">receipt_long</span>}
                            >
                                {submitting ? 'PROCESANDO...' : 'CONFIRMAR VENTA'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Ventas;
