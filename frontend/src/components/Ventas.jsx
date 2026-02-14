import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';
import { formatMoney } from '../utils/formatters';
import { useCart } from '../hooks/useCart';
import GlassContainer from './common/GlassContainer';
import Button from './common/Button';
import { toast } from 'sonner';

const Ventas = () => {
    const { showAlert } = useDialog();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const scannerRef = useRef(null);
    const html5QrRef = useRef(null);
    const searchInputRef = useRef(null);
    const lastKeyTime = useRef(0);
    const scanBuffer = useRef('');



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

    // Cart logic delegated to useCart hook
    const { cart, setCart, description, setDescription, submitting, updateCart, cartTotal, cartItemCount, handleConfirmSale } = useCart(products, fetchData);

    // formatMoney imported from utils/formatters.js (null-safe)

    // --- BARCODE SCANNER LOGIC ---
    const handleBarcodeScanned = useCallback((code) => {
        const product = products.find(p => p.barcode === code);
        if (product) {
            updateCart(product.id, (cart[`${product.id}_unit`] || 0) + 1, 'unit');
            toast.success(`${product.brand ? product.brand + ' ' : ''}${product.name} agregado`, {
                icon: '✅',
                duration: 1500,
            });
        } else {
            toast.error(`Código ${code} no encontrado`, {
                icon: '❌',
                duration: 2500,
            });
        }
        setSearchTerm('');
        searchInputRef.current?.focus();
    }, [products, cart, updateCart]);

    // Keyboard/USB scanner detection: fast input + Enter
    const handleSearchKeyDown = useCallback((e) => {
        const now = Date.now();
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = scanBuffer.current.trim();
            if (code.length >= 4) {
                handleBarcodeScanned(code);
            }
            scanBuffer.current = '';
            return;
        }
        // If chars come fast (<80ms apart), it's a scanner
        if (now - lastKeyTime.current < 80) {
            scanBuffer.current += e.key;
        } else {
            scanBuffer.current = e.key;
        }
        lastKeyTime.current = now;
    }, [handleBarcodeScanned]);

    // Camera scanner
    const openCameraScanner = useCallback(async () => {
        setScannerOpen(true);
        // Wait for DOM to mount the container
        setTimeout(async () => {
            try {
                const html5Qr = new Html5Qrcode('barcode-reader');
                html5QrRef.current = html5Qr;
                await html5Qr.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText) => {
                        handleBarcodeScanned(decodedText);
                        html5Qr.stop().then(() => {
                            html5Qr.clear();
                            html5QrRef.current = null;
                            setScannerOpen(false);
                        });
                    },
                    () => { } // ignore errors during scanning
                );
            } catch (err) {
                console.error('Camera error:', err);
                toast.error('No se pudo acceder a la cámara');
                setScannerOpen(false);
            }
        }, 300);
    }, [handleBarcodeScanned]);

    const closeCameraScanner = useCallback(async () => {
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop();
                html5QrRef.current.clear();
            } catch (e) { /* ignore */ }
            html5QrRef.current = null;
        }
        setScannerOpen(false);
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );

    // cartTotal is now provided by useCart hook

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-txt-dim animate-pulse">
            <span className="material-icons text-4xl mb-4 animate-spin text-accent">sync</span>
            <div className="font-mono text-xs uppercase tracking-widest font-bold">Cargando Terminal...</div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-6 h-[calc(100vh-3rem)] overflow-hidden">

            {/* Left: Product Selection Area */}
            <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                <header className="mb-3 flex-shrink-0">
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
                                <div className="text-xs font-black text-txt-dim uppercase tracking-widest">Productos</div>
                                <div className="text-lg font-mono font-black text-txt-primary">{products.length}</div>
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl border border-panel-border/5 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-xl">warning_amber</span>
                            </div>
                            <div>
                                <div className="text-xs font-black text-txt-dim uppercase tracking-widest">Stock Bajo</div>
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
                                <div className="text-xs font-black text-txt-dim group-hover:text-void uppercase tracking-widest transition-colors">Total Pedido</div>
                                <div className="text-lg font-mono font-black text-txt-primary group-hover:text-void transition-colors">{formatMoney(cartTotal)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar — Prominent + Scanner Button */}
                    <div className="flex gap-3 items-stretch">
                        <div className="relative group shadow-md hover:shadow-lg transition-shadow duration-300 rounded-2xl bg-surface flex-1 border-2 border-accent/20 focus-within:border-accent/50">
                            <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-accent/50 group-focus-within:text-accent transition-colors text-2xl">search</span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar producto, marca o escanear código..."
                                autoFocus
                                className="w-full bg-transparent border-none pl-14 pr-12 py-4 text-txt-primary font-bold text-base rounded-2xl outline-none placeholder:text-txt-dim/60"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-surface-highlight p-1.5 rounded-full text-txt-dim hover:bg-red-100 hover:text-red-500 transition-colors"
                                >
                                    <span className="material-icons text-sm">close</span>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={scannerOpen ? closeCameraScanner : openCameraScanner}
                            className={`px-5 rounded-2xl border-2 shadow-md flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${scannerOpen
                                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                                    : 'bg-surface text-accent border-accent/20 hover:border-accent/50 hover:bg-accent/5'
                                }`}
                        >
                            <span className="material-icons text-xl">{scannerOpen ? 'close' : 'qr_code_scanner'}</span>
                            <span className="hidden sm:inline">{scannerOpen ? 'Cerrar' : 'Escanear'}</span>
                        </button>
                    </div>

                    {/* Camera Scanner Overlay */}
                    {scannerOpen && (
                        <div className="bg-surface rounded-2xl border-2 border-accent/30 overflow-hidden shadow-lg">
                            <div className="p-3 bg-accent/5 flex items-center gap-2 border-b border-accent/10">
                                <span className="material-icons text-accent animate-pulse">videocam</span>
                                <span className="text-xs font-black uppercase tracking-widest text-accent">Apuntá la cámara al código de barras</span>
                            </div>
                            <div id="barcode-reader" style={{ width: '100%' }}></div>
                        </div>
                    )}
                </header>

                {/* Table View (Desktop) */}
                <div className="flex-1 bg-surface rounded-2xl border border-panel-border/10 shadow-sm flex flex-col min-h-0 overflow-hidden">
                    <div className="overflow-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead>
                                <tr className="bg-gray-50/50 text-txt-primary text-xs uppercase font-black tracking-widest border-b border-panel-border/10 sticky top-0 bg-surface z-10 backdrop-blur-md">
                                    <th className="p-4 pl-6">Producto</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 text-right">Precio</th>
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
                                                            <span className="text-xs text-accent font-black uppercase tracking-widest animate-pulse">En Carrito ({itemInCartCount})</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col">
                                                    <span className={`text-[13px] font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-primary'}`}>
                                                        {product.quantity}
                                                    </span>
                                                    {isLowStock && (
                                                        <span className="text-xs font-black uppercase tracking-tighter text-orange-500">
                                                            Stock Bajo
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[13px] font-mono font-black text-txt-primary">{formatMoney(product.selling_price)}</span>
                                                    {product.is_pack && product.pack_price > 0 && <span className="text-xs text-accent font-black uppercase tracking-tighter">Pack x{product.pack_size}: {formatMoney(product.pack_price)}</span>}
                                                    {product.formats?.map(fmt => (
                                                        <span key={fmt.id} className="text-[11px] text-txt-dim font-black uppercase tracking-tighter block">Pack x{fmt.pack_size}: {formatMoney(fmt.pack_price)}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex flex-col items-end gap-1.5">
                                                    {/* Botón Unidad — siempre visible */}
                                                    <button
                                                        onClick={() => updateCart(product.id, (cart[`${product.id}_unit`] || 0) + 1, 'unit')}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-tight border shadow-sm whitespace-nowrap ${inCartUnit ? 'bg-accent text-void border-accent' : 'bg-surface-highlight text-txt-primary border-panel-border/10 hover:border-accent/30 hover:bg-accent/5'}`}
                                                    >
                                                        {inCartUnit ? (
                                                            <><span className="bg-void/20 text-void w-5 h-5 rounded-md flex items-center justify-center text-xs">{cart[`${product.id}_unit`]}</span> Unid · {formatMoney(product.selling_price)}</>
                                                        ) : (
                                                            <><span className="material-icons text-sm">add</span> Unid · {formatMoney(product.selling_price)}</>
                                                        )}
                                                    </button>

                                                    {/* Botón Pack default */}
                                                    {product.is_pack && product.pack_price > 0 && (
                                                        <button
                                                            onClick={() => updateCart(product.id, (cart[`${product.id}_pack_default`] || 0) + 1, 'pack', 'default')}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-tight border shadow-sm whitespace-nowrap ${cart[`${product.id}_pack_default`] > 0 ? 'bg-void text-white border-void' : 'bg-surface-highlight text-txt-primary border-panel-border/10 hover:border-void/30 hover:bg-void/5'}`}
                                                        >
                                                            {cart[`${product.id}_pack_default`] > 0 ? (
                                                                <><span className="bg-white/20 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">{cart[`${product.id}_pack_default`]}</span> Pack x{product.pack_size} · {formatMoney(product.pack_price)}</>
                                                            ) : (
                                                                <><span className="material-icons text-sm">inventory_2</span> Pack x{product.pack_size} · {formatMoney(product.pack_price)}</>
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* Botones de formatos adicionales — cada uno visible */}
                                                    {product.formats?.map(fmt => (
                                                        <button
                                                            key={fmt.id}
                                                            onClick={() => updateCart(product.id, (cart[`${product.id}_pack_${fmt.id}`] || 0) + 1, 'pack', fmt.id)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-tight border shadow-sm whitespace-nowrap ${cart[`${product.id}_pack_${fmt.id}`] > 0 ? 'bg-void text-white border-void' : 'bg-surface-highlight text-txt-primary border-panel-border/10 hover:border-void/30 hover:bg-void/5'}`}
                                                        >
                                                            {cart[`${product.id}_pack_${fmt.id}`] > 0 ? (
                                                                <><span className="bg-white/20 text-white w-5 h-5 rounded-md flex items-center justify-center text-xs">{cart[`${product.id}_pack_${fmt.id}`]}</span> Pack x{fmt.pack_size} · {formatMoney(fmt.pack_price)}</>
                                                            ) : (
                                                                <><span className="material-icons text-sm">inventory_2</span> Pack x{fmt.pack_size} · {formatMoney(fmt.pack_price)}</>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile Optimized Card View */}
                        <div className="md:hidden divide-y divide-panel-border/5">
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
                                    <div key={product.id} className={`p-4 flex flex-col gap-3 ${inCart ? 'bg-accent/5' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${product.is_pack ? 'bg-void text-white' : 'bg-surface-highlight text-txt-dim'}`}>
                                                    <span className="material-icons text-lg">{product.is_pack ? 'inventory_2' : 'shopping_basket'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-txt-primary uppercase tracking-tight line-clamp-1">
                                                        {product.brand ? `${product.brand} ` : ''}{product.name}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-xs font-mono font-black ${isLowStock ? 'text-orange-600' : 'text-txt-dim'}`}>
                                                            Stock: {product.quantity}
                                                        </span>
                                                        <span className="text-xs font-mono font-black text-accent">
                                                            {formatMoney(product.selling_price)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {itemInCartCount > 0 && (
                                                <span className="text-xs bg-accent text-void px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">
                                                    En Carrito ({itemInCartCount})
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 mt-1">
                                            {/* Mobile Unit Button */}
                                            <button
                                                onClick={() => updateCart(product.id, (cart[`${product.id}_unit`] || 0) + 1, 'unit')}
                                                className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all border shadow-sm font-black text-xs uppercase tracking-tight ${inCartUnit ? 'bg-accent text-void border-accent' : 'bg-surface-highlight text-txt-primary border-panel-border/10'}`}
                                            >
                                                {inCartUnit ? (
                                                    <><span className="bg-void/20 text-void w-5 h-5 rounded-md flex items-center justify-center">{cart[`${product.id}_unit`]}</span> Unidad · {formatMoney(product.selling_price)}</>
                                                ) : (
                                                    <><span className="material-icons text-sm">add</span> Unidad · {formatMoney(product.selling_price)}</>
                                                )}
                                            </button>

                                            {/* Mobile Pack Buttons — each format as its own button */}
                                            {product.is_pack && product.pack_price > 0 && (
                                                <button
                                                    onClick={() => updateCart(product.id, (cart[`${product.id}_pack_default`] || 0) + 1, 'pack', 'default')}
                                                    className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all border shadow-sm font-black text-xs uppercase tracking-tight ${cart[`${product.id}_pack_default`] > 0 ? 'bg-void text-white border-void' : 'bg-surface-highlight text-txt-primary border-panel-border/10'}`}
                                                >
                                                    {cart[`${product.id}_pack_default`] > 0 ? (
                                                        <><span className="bg-white/20 text-white w-5 h-5 rounded-md flex items-center justify-center">{cart[`${product.id}_pack_default`]}</span> Pack x{product.pack_size} · {formatMoney(product.pack_price)}</>
                                                    ) : (
                                                        <><span className="material-icons text-sm">inventory_2</span> Pack x{product.pack_size} · {formatMoney(product.pack_price)}</>
                                                    )}
                                                </button>
                                            )}
                                            {product.formats?.map(fmt => (
                                                <button
                                                    key={fmt.id}
                                                    onClick={() => updateCart(product.id, (cart[`${product.id}_pack_${fmt.id}`] || 0) + 1, 'pack', fmt.id)}
                                                    className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all border shadow-sm font-black text-xs uppercase tracking-tight ${cart[`${product.id}_pack_${fmt.id}`] > 0 ? 'bg-void text-white border-void' : 'bg-surface-highlight text-txt-primary border-panel-border/10'}`}
                                                >
                                                    {cart[`${product.id}_pack_${fmt.id}`] > 0 ? (
                                                        <><span className="bg-white/20 text-white w-5 h-5 rounded-md flex items-center justify-center">{cart[`${product.id}_pack_${fmt.id}`]}</span> Pack x{fmt.pack_size} · {formatMoney(fmt.pack_price)}</>
                                                    ) : (
                                                        <><span className="material-icons text-sm">inventory_2</span> Pack x{fmt.pack_size} · {formatMoney(fmt.pack_price)}</>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
            <div className="lg:col-span-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col bg-surface shadow-2xl overflow-hidden border-l border-panel-border/10 min-h-0">
                    {/* Cart Header */}
                    <div className="p-6 bg-surface border-b border-panel-border/10 flex justify-between items-center z-10 shrink-0">
                        <div>
                            <h2 className="text-lg font-black text-txt-primary tracking-tight uppercase leading-none">Pedido Actual</h2>
                            <p className="text-xs text-txt-dim font-black uppercase tracking-widest mt-1.5">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                        </div>
                        <div className="w-8 h-8 bg-void text-white text-xs font-black flex items-center justify-center rounded-xl shadow-lg">
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
                                <p className="text-xs font-black uppercase tracking-widest">Carrito Vacío</p>
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
                                                    className="w-full text-center text-xs font-black font-mono text-txt-primary py-0.5 bg-surface outline-none border-none"
                                                />
                                                <button
                                                    onClick={() => updateCart(product.id, Math.max(0, qty - 1), type, fId === 'default' ? 'default' : parseInt(fId))}
                                                    className="w-full h-5 flex items-center justify-center text-txt-dim hover:text-red-500 font-bold"
                                                >
                                                    <span className="material-icons text-[12px]">remove</span>
                                                </button>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-txt-primary text-xs font-black uppercase tracking-tight truncate leading-tight">
                                                    {type === 'pack' ? <span className="text-[11px] bg-void text-white px-1 py-0.5 rounded mr-1 font-black">PK</span> : <span className="text-[11px] bg-accent text-void px-1 py-0.5 rounded mr-1 font-black">UN</span>}
                                                    {product.brand ? `${product.brand} ` : ''}{product.name}
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div className="text-xs font-black text-txt-dim uppercase tracking-widest">{label}</div>
                                                    <div className="text-xs text-txt-dim flex items-center gap-x-1.5 font-bold">
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
                            <span className="text-xs font-black text-txt-dim uppercase tracking-widest mb-1.5">Total a Pagar</span>
                            <span className="text-3xl font-mono font-black text-txt-primary tracking-tighter">
                                {formatMoney(cartTotal)}
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
                                className="w-full py-4 bg-void text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-void/20 hover:bg-accent hover:text-void transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
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
