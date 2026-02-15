/**
 * useStock — Centralizes all stock data fetching, form state, and handlers.
 * Extracted from Stock.jsx for separation of concerns.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { API_URL, authHeaders } from '../config';
import { useDialog } from '../context/DialogContext';

export function useStock() {
    const { showConfirm } = useDialog();

    // Core data
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);

    // Modal visibility
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Edit form state
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemBrand, setNewItemBrand] = useState('');
    const [newItemBarcode, setNewItemBarcode] = useState('');
    const [isPack, setIsPack] = useState(false);
    const [packSize, setPackSize] = useState('1');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');
    const [newItemSellingPrice, setNewItemSellingPrice] = useState('');
    const [newItemPackPrice, setNewItemPackPrice] = useState('');
    const [newItemCategoryId, setNewItemCategoryId] = useState('');
    const [minStockAlert, setMinStockAlert] = useState('5');

    // Batch draft
    const [draftItems, setDraftItems] = useState([]);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');
    const [replenishSearch, setReplenishSearch] = useState('');
    const [selectedExisting, setSelectedExisting] = useState(null);



    // ---------- Data Fetching ----------

    const fetchStock = useCallback(() => {
        setLoading(true);
        fetch(`${API_URL}/stock`, { headers: authHeaders() })
            .then(res => res.json())
            .then(data => {
                setItems(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error stock:", err);
                setItems([]);
                setLoading(false);
            });
    }, []);

    const fetchCategories = useCallback(() => {
        fetch(`${API_URL}/categories`, { headers: authHeaders() })
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(err => console.error("Error categories:", err));
    }, []);

    useEffect(() => {
        fetchStock();
        fetchCategories();
    }, [fetchStock, fetchCategories]);

    // ---------- Computed ----------

    const calculatedUnitCost = useMemo(() => {
        const cost = parseFloat(newItemCost) || 0;
        const qty = parseFloat(newItemQuantity) || 1;
        const pSize = isPack ? (parseFloat(packSize) || 1) : 1;
        if (cost === 0 || qty === 0) return 0;
        return cost / (qty * pSize);
    }, [newItemCost, newItemQuantity, isPack, packSize]);

    const calculatedPackCost = useMemo(() => {
        const pSize = parseFloat(packSize) || 1;
        return calculatedUnitCost * pSize;
    }, [calculatedUnitCost, packSize]);

    const filteredItems = useMemo(() =>
        items.filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase()))
        ), [items, searchTerm]);

    const totalProdCount = items.length;
    const lowStockCount = useMemo(() =>
        items.filter(item => item.quantity <= (item.min_stock_alert || 5)).length,
        [items]);
    const inventoryValue = useMemo(() =>
        items.reduce((acc, item) => acc + (item.quantity * (item.unit_cost || 0)), 0),
        [items]);

    // ---------- Handlers ----------

    const resetForm = useCallback(() => {
        setNewItemName('');
        setNewItemBrand('');
        setNewItemBarcode('');
        setNewItemCost('');
        setNewItemQuantity('1');
        setNewItemSellingPrice('');
        setNewItemPackPrice('');
        setNewItemCategoryId('');
        setIsPack(false);
        setPackSize('1');
        setSelectedExisting(null);
        setReplenishSearch('');
        setMinStockAlert('5');
    }, []);

    const openEditModal = useCallback((item) => {
        setIsEditing(true);
        setEditingId(item.id);
        setSelectedItem(item);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
        setNewItemBarcode(item.barcode || '');
        setNewItemCost(item.unit_cost);
        setNewItemQuantity(item.quantity);
        setNewItemSellingPrice(item.selling_price);
        setNewItemPackPrice(item.pack_price || '');
        setNewItemCategoryId(item.category_id || '');
        setIsPack(item.is_pack || false);
        setPackSize(item.pack_size || '1');
        setMinStockAlert(item.min_stock_alert || '5');
        setIsAddModalOpen(true);
    }, []);

    const addToDraft = useCallback((e) => {
        e.preventDefault();
        const costAmount = parseFloat(newItemCost);
        const qtyToEnter = parseFloat(newItemQuantity);
        const sellPrice = parseFloat(newItemSellingPrice) || 0;
        const packP = newItemPackPrice ? parseFloat(newItemPackPrice) : null;
        const pSize = isPack ? (parseFloat(packSize) || 1) : 1;

        if (!newItemName || isNaN(costAmount) || isNaN(qtyToEnter)) {
            toast.error("Completa los datos mínimos (Nombre, Costo, Cantidad)");
            return;
        }

        const draftItem = {
            item_id: selectedExisting ? selectedExisting.id : null,
            name: newItemName,
            brand: newItemBrand,
            barcode: newItemBarcode || null,
            is_pack: isPack,
            pack_size: pSize,
            cost_amount: costAmount,
            quantity: qtyToEnter,
            selling_price: sellPrice,
            pack_price: packP,
            category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null
        };

        setDraftItems(prev => [...prev, draftItem]);
        resetForm();
    }, [newItemName, newItemBrand, newItemBarcode, newItemCost, newItemQuantity, newItemSellingPrice, newItemPackPrice, isPack, packSize, newItemCategoryId, selectedExisting, resetForm]);

    const handleSaveBatch = useCallback(async () => {
        if (draftItems.length === 0) return;
        setIsSavingBatch(true);
        try {
            const res = await fetch(`${API_URL}/stock/batch`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ items: draftItems })
            });
            if (res.ok) {
                toast.success("Inventario actualizado con éxito");
                setDraftItems([]);
                fetchStock();
            } else {
                const err = await res.json();
                toast.error("Error: " + err.detail);
            }
        } catch (err) {
            toast.error("Error de conexión");
        } finally {
            setIsSavingBatch(false);
        }
    }, [draftItems, fetchStock]);

    const handleEditSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: newItemName,
                brand: newItemBrand,
                barcode: newItemBarcode || null,
                is_pack: isPack,
                pack_size: parseFloat(packSize) || 1,
                cost_amount: parseFloat(newItemCost) * parseFloat(newItemQuantity),
                initial_quantity: parseFloat(newItemQuantity),
                selling_price: parseFloat(newItemSellingPrice) || 0,
                pack_price: newItemPackPrice ? parseFloat(newItemPackPrice) : null,
                category_id: newItemCategoryId ? parseInt(newItemCategoryId) : null,
                min_stock_alert: parseFloat(minStockAlert) || 5
            };

            const res = await fetch(`${API_URL}/stock/${editingId}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Producto actualizado con éxito");
                setIsAddModalOpen(false);
                fetchStock();
            } else {
                const err = await res.json();
                toast.error("Error: " + (err.detail || "No se pudo actualizar"));
            }
        } catch (err) {
            toast.error("Error crítico al actualizar");
        }
    }, [editingId, newItemName, newItemBrand, newItemBarcode, isPack, packSize, newItemCost, newItemQuantity, newItemSellingPrice, newItemPackPrice, newItemCategoryId, minStockAlert, fetchStock]);

    const handleDeleteClick = useCallback((item) => {
        showConfirm(
            `¿Estás seguro de que deseas eliminar ${item.name}?`,
            async () => {
                try {
                    const res = await fetch(`${API_URL}/stock/${item.id}`, { method: 'DELETE', headers: authHeaders() });
                    if (res.ok) {
                        toast.success("Producto eliminado");
                        fetchStock();
                    }
                } catch (err) {
                    toast.error("Error al eliminar");
                }
            }
        );
    }, [fetchStock, showConfirm]);


    const handleSelectExisting = useCallback((item) => {
        setSelectedExisting(item);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
        setNewItemBarcode(item.barcode || '');
        setNewItemSellingPrice(item.selling_price || '');
        setNewItemPackPrice(item.pack_price || '');
        setNewItemCategoryId(item.category_id || '');
        setIsPack(item.is_pack || false);
        setPackSize(item.pack_size || '1');
        setReplenishSearch('');
    }, []);

    return {
        // Data
        items, loading, categories, filteredItems,
        totalProdCount, lowStockCount, inventoryValue,

        // Modal state
        isAddModalOpen, setIsAddModalOpen,
        selectedItem, setSelectedItem,

        // Edit form
        isEditing, editingId,
        newItemName, setNewItemName,
        newItemBrand, setNewItemBrand,
        newItemBarcode, setNewItemBarcode,
        isPack, setIsPack,
        packSize, setPackSize,
        newItemCost, setNewItemCost,
        newItemQuantity, setNewItemQuantity,
        newItemSellingPrice, setNewItemSellingPrice,
        newItemPackPrice, setNewItemPackPrice,
        newItemCategoryId, setNewItemCategoryId,
        minStockAlert, setMinStockAlert,

        // Batch draft
        draftItems, setDraftItems,
        isSavingBatch,

        // Search
        searchTerm, setSearchTerm,
        replenishSearch, setReplenishSearch,
        selectedExisting, setSelectedExisting,

        // Computed
        calculatedUnitCost, calculatedPackCost,

        // Handlers
        fetchStock, openEditModal, addToDraft,
        handleSaveBatch, handleEditSubmit,
        handleDeleteClick,
        handleSelectExisting, resetForm,
    };
}
