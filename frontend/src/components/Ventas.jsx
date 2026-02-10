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
        setLoading(true);
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
        } catch (err) {
            console.error(err);
            toast.error("Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    };

    const updateCart = (productId, newQty, type = 'unit', formatId = null) => {
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
            const newCart = { ...cart };
            delete newCart[cartKey];
            setCart(newCart);
        } else {
            setCart(prev => ({ ...prev, [cartKey]: newQty }));
        }
    };

    const calculateTotal = () => {
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
    };

    const handleConfirmSale = async () => {
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
                setSearchTerm('');
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
    };

    const formatMoney = (val) => {
        if (val === undefined || val === null) return '$ 0,00';
        return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const cartTotal = calculateTotal();

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin text-accent">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold">Cargando Terminal...</div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-10 h-full overflow-hidden">

            {/* Left: Product Selection Area */}
            <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
                <header className="mb-6 flex-shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-sans font-extrabold text-txt-primary tracking-tight leading-none mb-1 uppercase">
                                Punto de <span className="text-accent">Venta</span>
                            </h1>
                            <p className="text-txt-secondary text-xs font-bold">Gestiona y procesa ventas de forma eficiente.</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-accent/20 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-xl">inventory_2</span>
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-txt-dim uppercase tracking-widest">Productos</div>
                                <div className="text-lg font-mono font-black text-txt-primary">{products.length}</div>
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-xl">warning_amber</span>
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-txt-dim uppercase tracking-widest">Stock Bajo</div>
                                <div className="text-lg font-mono font-black text-orange-600">
                                    {products.filter(p => p.quantity <= (p.min_stock_alert || 0)).length}
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-accent/10 shadow-md flex items-center gap-4 group hover:bg-accent transition-all">
                            <div className="w-10 h-10 rounded-xl bg-accent text-void flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-xl">shopping_cart</span>
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-txt-dim group-hover:text-void uppercase tracking-widest transition-colors">Total Pedido</div>
                                <div className="text-lg font-mono font-black text-txt-primary group-hover:text-void transition-colors">{formatMoney(cartTotal)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Repositioned Search Bar */}
                    <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl bg-surface w-full border border-panel-border/10">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar producto o marca..."
                            className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-txt-primary font-bold text-sm rounded-xl outline-none placeholder:text-txt-dim"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                </header>

                {/* Table View */}
                <div className="flex-1 overflow-hidden bg-surface rounded-2xl border border-panel-border/10 shadow-sm flex flex-col relative mb-4">
                    <div className="overflow-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-txt-primary text-[10px] uppercase font-black tracking-widest border-b border-panel-border/10 sticky top-0 bg-surface z-10 backdrop-blur-md">
                                    <th className="p-4 pl-6">Producto</th>
                                    <th className="p-4 hidden md:table-cell text-center">Categoría</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 hidden lg:table-cell text-right">Precio</th>
                                    <th className="p-4 hidden md:table-cell text-center">Estado</th>
                                    <th className="p-4 text-right pr-6">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50/30">
                                {filteredProducts.map(product => {
                                    const isLowStock = product.quantity <= (product.min_stock_alert || 0);
                                    const inCartUnit = cart[`${product.id}_unit`] > 0;
                                    const inCartPack = Object.keys(cart).some(key => key.startsWith(`${product.id}_pack`));
                                    const inCart = inCartUnit || inCartPack;
                                    const itemInCartCount = Object.entries(cart).reduce((acc, [key, q]) => {
                                        if (key.startsWith(`${product.id}_`)) return acc + q;
                                        return acc;
                                    }, 0);

                                    return (
                                        <tr key={product.id} className={`hover:bg-accent/5 transition-colors group ${inCart ? 'bg-accent/5' : ''} border-l-2 ${inCart ? 'border-l-accent' : 'border-l-transparent'}`}>
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center ${product.is_pack ? 'bg-void text-white' : 'bg-surface-highlight text-txt-dim'}`}>
                                                        <span className="material-icons text-xl">{product.is_pack ? 'inventory_2' : 'shopping_basket'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-black text-txt-primary line-clamp-1 uppercase tracking-tight">
                                                                {product.brand ? `${product.brand} ` : ''}{product.name}
                                                            </span>
                                                        </div>
                                                        {itemInCartCount > 0 && (
                                                            <span className="text-[9px] text-accent font-black uppercase tracking-widest animate-pulse">En Carrito ({itemInCartCount})</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell text-center">
                                                <span className="px-2 py-1 bg-surface-highlight text-txt-dim rounded-lg text-[9px] font-black uppercase tracking-widest border border-panel-border/10">
                                                    {categories.find(c => c.id === product.category_id)?.name || 'Otros'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col">
                                                    <span className={`text-[13px] font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>
                                                        {product.quantity}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isLowStock ? 'text-orange-500' : 'text-txt-dim'}`}>
                                                        {isLowStock ? 'Stock Bajo' : 'Disponible'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[13px] font-mono font-black text-txt-primary">{formatMoney(product.selling_price)}</span>
                                                    {product.is_pack && product.pack_price > 0 && <span className="text-[8px] text-accent font-black uppercase tracking-tighter">Pack x{product.pack_size}: {formatMoney(product.pack_price)}</span>}
                                                    {product.formats?.map(fmt => (
                                                        <span key={fmt.id} className="text-[7px] text-txt-dim font-black uppercase tracking-tighter block">Pack x{fmt.pack_size}: {formatMoney(fmt.pack_price)}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell text-center">
                                                <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center w-fit mx-auto gap-1.5 ${isLowStock ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${isLowStock ? 'bg-orange-600 animate-pulse' : 'bg-green-600'}`}></div>
                                                    {isLowStock ? 'Crítico' : 'Disponible'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex items-center gap-2 justify-end relative">
                                                    {/* Botón Unidad */}
                                                    <button
                                                        onClick={() => updateCart(product.id, (cart[`${product.id}_unit`] || 0) + 1, 'unit')}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-panel-border/10 shadow-sm ${inCartUnit ? 'bg-accent text-void font-black' : 'bg-surface-highlight text-txt-dim hover:bg-accent/20'}`}
                                                        title="Agregar Unidad"
                                                    >
                                                        {inCartUnit ? <span className="text-[10px] font-black">{cart[`${product.id}_unit`]}</span> : <span className="material-icons text-lg">add</span>}
                                                    </button>

                                                    {/* Botón Pack */}
                                                    {(product.is_pack || (product.formats && product.formats.length > 0)) && (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => {
                                                                    if (product.formats?.length > 0 || (product.is_pack && product.pack_size > 1)) {
                                                                        setOpenPackDropdown(openPackDropdown === product.id ? null : product.id);
                                                                    } else {
                                                                        updateCart(product.id, (cart[`${product.id}_pack_default`] || 0) + 1, 'pack', 'default');
                                                                    }
                                                                }}
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-panel-border/10 shadow-sm ${inCartPack ? 'bg-void text-white' : 'bg-surface-highlight text-txt-dim hover:bg-void/10'}`}
                                                                title="Agregar Pack"
                                                            >
                                                                <span className="material-icons text-lg">{inCartPack ? 'inventory' : 'inventory_2'}</span>
                                                            </button>

                                                            {/* Dropdown de Selección de Formatos */}
                                                            {openPackDropdown === product.id && (
                                                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-surface border-2 border-panel-border/10 rounded-2xl shadow-2xl z-50 p-2 animate-[fadeIn_0.2s_ease-out]">
                                                                    <div className="text-[8px] font-black uppercase text-txt-dim p-2 border-b border-panel-border/5 mb-2">Seleccionar Pack</div>

                                                                    {/* Default Pack */}
                                                                    {product.is_pack && (
                                                                        <button
                                                                            onClick={() => { updateCart(product.id, (cart[`${product.id}_pack_default`] || 0) + 1, 'pack', 'default'); setOpenPackDropdown(null); }}
                                                                            className="w-full text-left p-2 hover:bg-accent/10 rounded-xl transition-all flex justify-between items-center group mb-1"
                                                                        >
                                                                            <span className="text-[10px] font-black text-txt-primary uppercase">Pack x{product.pack_size}</span>
                                                                            <span className="text-[10px] font-mono font-black text-accent">{formatMoney(product.pack_price)}</span>
                                                                        </button>
                                                                    )}

                                                                    {/* Additional Formats */}
                                                                    {product.formats?.map(fmt => (
                                                                        <button
                                                                            key={fmt.id}
                                                                            onClick={() => { updateCart(product.id, (cart[`${product.id}_pack_${fmt.id}`] || 0) + 1, 'pack', fmt.id); setOpenPackDropdown(null); }}
                                                                            className="w-full text-left p-2 hover:bg-accent/10 rounded-xl transition-all flex justify-between items-center group mb-1"
                                                                        >
                                                                            <span className="text-[10px] font-black text-txt-primary uppercase">Pack x{fmt.pack_size}</span>
                                                                            <span className="text-[10px] font-mono font-black text-accent">{formatMoney(fmt.pack_price)}</span>
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
                    <div className="flex flex-col items-center justify-center py-20 text-txt-dim">
                        <div className="bg-surface-highlight p-6 rounded-3xl mb-4 shadow-inner">
                            <span className="material-icons text-4xl opacity-30">search_off</span>
                        </div>
                        <p className="font-black text-xs uppercase tracking-widest opacity-50">Sin resultados en el catálogo</p>
                    </div>
                )}
            </div>

            {/* Right: Cart/Summary Panel */}
            <div className="lg:col-span-1 h-full flex flex-col">
                <div className="flex-1 flex flex-col bg-surface rounded-[2rem] shadow-2xl overflow-hidden border border-panel-border/10 relative">
                    {/* Cart Header */}
                    <div className="p-6 bg-surface border-b border-panel-border/10 flex justify-between items-center z-10 shrink-0">
                        <div>
                            <h2 className="text-lg font-black text-txt-primary tracking-tight uppercase leading-none">Pedido Actual</h2>
                            <p className="text-[9px] text-txt-dim font-black uppercase tracking-widest mt-1.5">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                        </div>
                        <div className="w-8 h-8 bg-void text-white text-[10px] font-black flex items-center justify-center rounded-xl shadow-lg">
                            {Object.values(cart).reduce((a, b) => a + b, 0)}
                        </div>
                    </div>

                    {/* Cart Items List - FIXED SCROLL AND COMPACT SIZE */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-surface-highlight/10">
                        {Object.entries(cart).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-txt-dim opacity-40">
                                <div className="w-12 h-12 rounded-2xl bg-surface-highlight flex items-center justify-center mb-3">
                                    <span className="material-icons text-3xl">shopping_bag</span>
                                </div>
                                <p className="text-[8px] font-black uppercase tracking-widest">Carrito Vacío</p>
                            </div>
                        ) : (
                            Object.entries(cart)
                                .filter(([_, qty]) => qty > 0)
                                .sort((a, b) => a[0].localeCompare(b[0]))
                                .map(([cartKey, qty]) => {
                                    const parts = cartKey.split('_');
                                    const id = parseInt(parts[0]);
                                    const type = parts[1];
                                    const fId = parts[2];
                                    const product = products.find(p => p.id === id);
                                    if (!product) return null;

                                    let price = product.selling_price || 0;
                                    let label = "UNID";

                                    if (type === 'pack') {
                                        if (fId && fId !== 'default') {
                                            const fmt = product.formats?.find(f => f.id === parseInt(fId));
                                            price = fmt ? fmt.pack_price : 0;
                                            label = `PACK x${fmt?.pack_size || '?'}`;
                                        } else {
                                            price = product.pack_price || (product.selling_price * (product.pack_size || 1));
                                            label = `PACK x${product.pack_size}`;
                                        }
                                    }

                                    return (
                                        <div key={cartKey} className="flex items-center gap-3 group bg-surface p-2.5 rounded-xl border border-panel-border/5 shadow-sm hover:border-accent/20 transition-all">
                                            {/* Qty Controls - MANUAL INPUT ENABLED */}
                                            <div className="flex flex-col items-center bg-surface-highlight rounded-lg overflow-hidden w-9 shrink-0">
                                                <button
                                                    onClick={() => updateCart(product.id, qty + 1, type, fId === 'default' ? 'default' : parseInt(fId))}
                                                    className="w-full h-5 flex items-center justify-center text-txt-dim hover:text-accent font-bold"
                                                >
                                                    <span className="material-icons text-[12px]">add</span>
                                                </button>
                                                <input
                                                    type="number"
                                                    value={qty}
                                                    onChange={(e) => updateCart(product.id, e.target.value, type, fId === 'default' ? 'default' : parseInt(fId))}
                                                    className="w-full text-center text-[10px] font-black font-mono text-txt-primary py-0.5 bg-surface outline-none border-none"
                                                />
                                                <button
                                                    onClick={() => updateCart(product.id, Math.max(0, qty - 1), type, fId === 'default' ? 'default' : parseInt(fId))}
                                                    className="w-full h-5 flex items-center justify-center text-txt-dim hover:text-red-500 font-bold"
                                                >
                                                    <span className="material-icons text-[12px]">remove</span>
                                                </button>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-txt-primary text-[10px] font-black uppercase tracking-tight truncate leading-tight">
                                                    {type === 'pack' ? <span className="text-[7px] bg-void text-white px-1 py-0.5 rounded mr-1 font-black">PK</span> : <span className="text-[7px] bg-accent text-void px-1 py-0.5 rounded mr-1 font-black">UN</span>}
                                                    {product.brand ? `${product.brand} ` : ''}{product.name}
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="text-[8px] font-black text-txt-dim uppercase tracking-widest">{label}</div>
                                                    <div className="text-[9px] text-txt-dim flex items-center gap-x-1.5 font-bold">
                                                        <span className="font-mono text-accent">{formatMoney(price)}</span>
                                                        <span className="font-mono text-txt-primary">{formatMoney(price * qty)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => updateCart(product.id, 0, type, fId === 'default' ? 'default' : parseInt(fId))}
                                                className="text-gray-200 hover:text-red-500 transition-colors p-1"
                                            >
                                                <span className="material-icons text-lg">cancel</span>
                                            </button>
                                        </div>
                                    );
                                })
                        )}
                    </div>

                    {/* Cart Footer */}
                    <div className="p-6 bg-surface border-t border-panel-border/10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] space-y-4 z-20 shrink-0">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-txt-dim uppercase tracking-widest mb-1.5">Total a Pagar</span>
                            <span className="text-3xl font-mono font-black text-txt-primary tracking-tighter">
                                {formatMoney(calculateTotal())}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="relative group">
                                <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-dim group-focus-within:text-accent transition-colors text-base">assignment_ind</span>
                                <input
                                    className="w-full bg-surface-highlight border-2 border-transparent focus:bg-surface focus:border-accent/10 rounded-xl py-3 pl-10 pr-4 text-txt-primary text-xs outline-none transition-all placeholder:text-txt-dim font-black uppercase tracking-tight"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="CLIENTE / NOTA"
                                />
                            </div>
                            <button
                                className="w-full py-4 bg-void text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-void/20 hover:bg-accent hover:text-void transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                onClick={handleConfirmSale}
                                disabled={submitting || Object.keys(cart).length === 0}
                            >
                                <span className="material-icons text-lg">local_mall</span>
                                {submitting ? 'ESPERE...' : 'FINALIZAR'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Ventas;
