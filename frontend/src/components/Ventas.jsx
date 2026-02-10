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
    const [openPackDropdown, setOpenPackDropdown] = useState(null);

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

    const updateCart = (productId, newQty, type = 'unit', formatId = null) => {
        const fId = formatId ? parseInt(formatId) : null;
        const cartKey = fId ? `${productId}_pack_${fId}` : `${productId}_${type}`;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        newQty = parseFloat(newQty);

        let pSize = product.pack_size || 1;
        if (type === 'pack' && fId) {
            const fmt = product.formats?.find(f => f.id === fId);
            if (fmt) pSize = fmt.pack_size;
        }

        const unitsNeeded = type === 'pack' ? newQty * pSize : newQty;

        const totalOtherUnits = Object.entries(cart).reduce((acc, [key, q]) => {
            if (key.startsWith(`${productId}_`) && key !== cartKey) {
                const parts = key.split('_');
                const t = parts[1];
                const formatsIdStr = parts[2];
                let size = 1;
                if (t === 'pack') {
                    if (formatsIdStr) {
                        const fmt = product.formats?.find(f => f.id === parseInt(formatsIdStr));
                        size = fmt ? fmt.pack_size : product.pack_size || 1;
                    } else {
                        size = product.pack_size || 1;
                    }
                }
                return acc + (q * size);
            }
            return acc;
        }, 0);

        if (unitsNeeded + totalOtherUnits > product.quantity) {
            toast.error(`Stock insuficiente para ${product.name}`);
            return;
        }

        if (newQty <= 0) {
            const newCart = { ...cart };
            delete newCart[cartKey];
            setCart(newCart);
        } else {
            setCart(prev => ({ ...prev, [cartKey]: newQty }));
        }
    };

    const calculateTotal = () => {
        return Object.entries(cart).reduce((sum, [key, qty]) => {
            const [id, type, formatId] = key.split('_');
            const product = products.find(p => p.id === parseInt(id));
            if (!product) return sum;

            let price = product.selling_price || 0;
            if (type === 'pack') {
                if (formatId) {
                    const fmt = product.formats?.find(f => f.id === parseInt(formatId));
                    price = fmt ? fmt.pack_price : (product.pack_price || (product.selling_price * product.pack_size));
                } else {
                    price = product.pack_price || (product.selling_price * (product.pack_size || 1));
                }
            }

            return sum + price * qty;
        }, 0);
    };

    const handleConfirmSale = async () => {
        if (Object.keys(cart).length === 0) return toast.warning("El carrito está vacío.");
        setSubmitting(true);
        try {
            const payload = {
                items: Object.entries(cart)
                    .filter(([_, qty]) => qty > 0)
                    .map(([key, qty]) => {
                        const [id, type, formatId] = key.split('_');
                        return {
                            item_id: parseInt(id),
                            quantity: qty,
                            is_pack: type === 'pack',
                            format_id: formatId ? parseInt(formatId) : null
                        };
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

    const cartTotal = calculateTotal();

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
                <header className="mb-6 flex-shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-1">
                                Punto de Venta
                            </h1>
                            <p className="text-txt-secondary text-xs font-medium">Gestiona y procesa ventas de forma eficiente.</p>
                        </div>

                        {/* Modern Search Bar */}
                        <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl bg-surface w-full md:w-96 border border-panel-border/5">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-txt-primary transition-colors text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-txt-primary font-medium text-sm rounded-xl outline-none placeholder:text-txt-dim"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-surface-highlight p-1 rounded-full text-txt-dim hover:bg-gray-200 transition-colors"
                                >
                                    <span className="material-icons text-xs">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-accent/20 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-2xl">inventory_2</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Productos</div>
                                <div className="text-xl font-mono font-black text-txt-primary">{products.length}</div>
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-2xl">warning_amber</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock Bajo</div>
                                <div className="text-xl font-mono font-black text-orange-600">
                                    {products.filter(p => p.quantity <= (p.min_stock_alert || 0)).length}
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-accent/10 shadow-md flex items-center gap-4 group hover:bg-accent transition-all">
                            <div className="w-12 h-12 rounded-xl bg-accent text-void flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-2xl">shopping_cart</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 group-hover:text-void/60 uppercase tracking-widest transition-colors">Total Pedido</div>
                                <div className="text-xl font-mono font-black text-txt-primary group-hover:text-void transition-colors">{formatMoney(cartTotal)}</div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Table View */}
                <div className="flex-1 overflow-hidden bg-surface rounded-2xl border border-panel-border/5 shadow-sm flex flex-col">
                    <div className="overflow-x-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-txt-dim text-[10px] uppercase font-bold tracking-widest border-b border-panel-border/5">
                                    <th className="p-4 pl-6">Producto</th>
                                    <th className="p-4 hidden md:table-cell">Categoría</th>
                                    <th className="p-4">Stock</th>
                                    <th className="p-4 hidden lg:table-cell">Precio</th>
                                    <th className="p-4 hidden md:table-cell">Estado</th>
                                    <th className="p-4">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50/30">
                                {filteredProducts.map(product => {
                                    const isLowStock = product.quantity <= (product.min_stock_alert || 0);
                                    const inCartUnit = cart[`${product.id}_unit`] > 0;
                                    const inCartPack = Object.keys(cart).some(key => key.startsWith(`${product.id}_pack`));
                                    const inCart = inCartUnit || inCartPack;

                                    return (
                                        <tr key={product.id} className={`hover:bg-gray-50/5 transition-colors group ${inCart ? 'bg-accent/5' : ''}`}>
                                            <td className="p-4 pl-6 relative">
                                                {inCart && <div className="absolute left-0 top-0 w-1 h-full bg-accent animate-pulse"></div>}
                                                <div className="flex items-center gap-3">
                                                    <div className="hidden sm:flex w-10 h-10 rounded-lg bg-surface-highlight items-center justify-center text-txt-dim">
                                                        <span className="material-icons text-xl">{product.pack_size > 1 ? 'inventory_2' : 'shopping_basket'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-txt-primary line-clamp-1">{product.name}</span>
                                                            {inCartUnit && <span className="p-0.5 px-1 bg-accent text-void text-[7px] font-black rounded tracking-tighter shadow-sm">{cart[`${product.id}_unit`]}U</span>}
                                                            {inCartPack && <span className="p-0.5 px-1 bg-void text-white text-[7px] font-black rounded tracking-tighter shadow-sm">P</span>}
                                                        </div>
                                                        <span className="text-[10px] text-txt-dim uppercase font-medium">{product.brand || 'Genérico'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className="px-2 py-1 bg-surface-highlight text-txt-dim rounded-md text-[9px] font-bold uppercase tracking-tight">
                                                    {categories.find(c => c.id === product.category_id)?.name || 'Otros'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>
                                                        {product.quantity}
                                                    </span>
                                                    <span className={`text-[8px] font-bold uppercase tracking-tighter ${isLowStock ? 'text-orange-500' : 'text-gray-400'}`}>
                                                        {isLowStock ? 'Alerta Bajo' : 'Disponible'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-mono font-bold text-txt-primary">{formatMoney(product.selling_price)}</span>
                                                    <span className="text-[8px] text-gray-400 uppercase font-black">Por Unidad</span>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm flex items-center justify-center w-fit gap-1 ${isLowStock ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                    <span className="w-1 h-1 rounded-full bg-current"></span>
                                                    {isLowStock ? 'Stock Bajo' : 'En Stock'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {/* Botón Unidad */}
                                                    <button
                                                        onClick={() => updateCart(product.id, (cart[`${product.id}_unit`] || 0) + 1, 'unit')}
                                                        className="w-10 h-10 rounded-lg bg-surface-highlight hover:bg-accent hover:text-void flex items-center justify-center transition-all border border-panel-border/5"
                                                        title="Agregar Unidad"
                                                    >
                                                        <span className="material-icons text-lg">add</span>
                                                    </button>

                                                    {/* Botón Pack */}
                                                    {((product.formats && product.formats.length > 0) || product.pack_size > 1) && (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => {
                                                                    if (product.formats?.length > 0) {
                                                                        setOpenPackDropdown(openPackDropdown === product.id ? null : product.id);
                                                                    } else {
                                                                        updateCart(product.id, (cart[`${product.id}_pack`] || 0) + 1, 'pack');
                                                                    }
                                                                }}
                                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border border-panel-border/5 ${product.formats?.length > 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-surface-highlight hover:bg-accent-dim hover:text-white'}`}
                                                                title="Agregar Pack"
                                                            >
                                                                <span className="material-icons text-lg">inventory</span>
                                                            </button>

                                                            {/* Dropdown de Formatos Flotante */}
                                                            {openPackDropdown === product.id && (
                                                                <div className="absolute right-0 top-0 translate-x-[calc(100%+8px)] w-48 bg-surface border-2 border-indigo-500 rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden">
                                                                    <div className="bg-indigo-500 text-white text-[9px] font-bold py-1.5 px-3 uppercase">Formatos de Pack</div>
                                                                    {(product.pack_size > 1 || !product.formats?.length) && (
                                                                        <button
                                                                            onClick={() => {
                                                                                updateCart(product.id, (cart[`${product.id}_pack`] || 0) + 1, 'pack');
                                                                                setOpenPackDropdown(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2.5 hover:bg-surface-highlight border-b border-panel-border/5 group"
                                                                        >
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] font-bold text-txt-primary">Principal x{product.pack_size}</span>
                                                                                <span className="text-[10px] font-mono text-indigo-600 font-bold">{formatMoney(product.pack_price || (product.selling_price * (product.pack_size || 1)))}</span>
                                                                            </div>
                                                                        </button>
                                                                    )}
                                                                    {product.formats?.map(fmt => (
                                                                        <button
                                                                            key={fmt.id}
                                                                            onClick={() => {
                                                                                updateCart(product.id, (cart[`${product.id}_pack_${fmt.id}`] || 0) + 1, 'pack', fmt.id);
                                                                                setOpenPackDropdown(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2.5 hover:bg-surface-highlight border-b border-panel-border/5 last:border-0 group"
                                                                        >
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] font-bold text-txt-primary">{fmt.label || `PACK x${fmt.pack_size}`}</span>
                                                                                <span className="text-[10px] font-mono text-indigo-600 font-bold">{formatMoney(fmt.pack_price)}</span>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="bg-gray-100 p-4 rounded-full mb-3">
                            <span className="material-icons text-3xl opacity-50">search_off</span>
                        </div>
                        <p className="font-medium text-sm">No encontramos productos.</p>
                    </div>
                )}
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
                            Object.entries(cart)
                                .filter(([_, qty]) => qty > 0)
                                .map(([cartKey, qty]) => {
                                    const [id, type, formatId] = cartKey.split('_');
                                    const product = products.find(p => p.id === parseInt(id));
                                    if (!product) return null;

                                    let price = product.selling_price || 0;
                                    let label = product.name;
                                    let formatLabel = "";

                                    if (type === 'pack') {
                                        if (formatId) {
                                            const fmt = product.formats?.find(f => f.id === parseInt(formatId));
                                            price = fmt ? fmt.pack_price : (product.pack_price || (product.selling_price * (product.pack_size || 1)));
                                            formatLabel = fmt ? (fmt.label || `x${fmt.pack_size}`) : `x${product.pack_size}`;
                                        } else {
                                            price = product.pack_price || (product.selling_price * (product.pack_size || 1));
                                            formatLabel = `x${product.pack_size}`;
                                        }
                                    }

                                    return (
                                        <div key={cartKey} className="flex items-center gap-4 group">
                                            {/* Qty Controls - Manual Input */}
                                            <div className="flex flex-col items-center bg-surface rounded-lg shadow-sm border border-gray-100/10 overflow-hidden w-12">
                                                <input
                                                    type="number"
                                                    className="w-full text-center h-10 text-xs font-bold font-mono text-txt-primary bg-transparent outline-none border-b border-gray-100"
                                                    value={qty}
                                                    onChange={(e) => updateCart(product.id, e.target.value, type, formatId)}
                                                    min="0.1"
                                                    step="0.1"
                                                />
                                                <div className="flex w-full">
                                                    <button
                                                        onClick={() => updateCart(product.id, qty + 1, type, formatId)}
                                                        className="flex-1 h-6 flex items-center justify-center text-gray-600 hover:bg-surface-highlight hover:text-txt-primary transition-colors border-r border-gray-100"
                                                    >
                                                        <span className="material-icons text-[10px]">add</span>
                                                    </button>
                                                    <button
                                                        onClick={() => updateCart(product.id, Math.max(0, qty - 1), type, formatId)}
                                                        className="flex-1 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
                                                    >
                                                        <span className="material-icons text-[10px]">remove</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-txt-primary text-sm font-bold truncate">
                                                    {type === 'pack' ? <span className="text-[10px] bg-void text-white px-1 rounded mr-1">P</span> : <span className="text-[10px] bg-accent text-void px-1 rounded mr-1">U</span>}
                                                    {product.name}
                                                    {formatLabel && <span className="ml-1 text-[9px] text-accent font-mono uppercase">[{formatLabel}]</span>}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                                                    <span className="font-mono">{formatMoney(price)}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span>Subtotal: {formatMoney(price * qty)}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => updateCart(product.id, 0, type, formatId)}
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
        </div >
    );
};

export default Ventas;
