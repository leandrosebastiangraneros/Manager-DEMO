/**
 * useStock — Centralizes all stock data fetching, form state, and handlers.
 * Extracted from Stock.jsx for separation of concerns.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../config';
import { useDialog } from '../context/DialogContext';

export function useStock() {
    const { showAlert } = useDialog();

    // Core data
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);

    // Modal visibility
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Edit form state
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemBrand, setNewItemBrand] = useState('');
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

    // Sell form
    const [sellPriceUnit, setSellPriceUnit] = useState('');
    const [sellQuantity, setSellQuantity] = useState('1');
    const [workDesc, setWorkDesc] = useState('');

    // ---------- Data Fetching ----------

    const fetchStock = useCallback(() => {
        setLoading(true);
        fetch(`${API_URL}/stock`)
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
        fetch(`${API_URL}/categories`)
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
            showAlert("Completa los datos mínimos (Nombre, Costo, Cantidad)", "error");
            return;
        }

        const draftItem = {
            item_id: selectedExisting ? selectedExisting.id : null,
            name: newItemName,
            brand: newItemBrand,
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
    }, [newItemName, newItemBrand, newItemCost, newItemQuantity, newItemSellingPrice, newItemPackPrice, isPack, packSize, newItemCategoryId, selectedExisting, showAlert, resetForm]);

    const handleSaveBatch = useCallback(async () => {
        if (draftItems.length === 0) return;
        setIsSavingBatch(true);
        try {
            const res = await fetch(`${API_URL}/stock/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: draftItems })
            });
            if (res.ok) {
                showAlert("Inventario actualizado con éxito", "success");
                setDraftItems([]);
                fetchStock();
            } else {
                const err = await res.json();
                showAlert("Error: " + err.detail, "error");
            }
        } catch (err) {
            showAlert("Error de conexión", "error");
        } finally {
            setIsSavingBatch(false);
        }
    }, [draftItems, fetchStock, showAlert]);

    const handleEditSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: newItemName,
                brand: newItemBrand,
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert("Producto actualizado con éxito", "success");
                setIsAddModalOpen(false);
                fetchStock();
            } else {
                const err = await res.json();
                showAlert("Error: " + (err.detail || "No se pudo actualizar"), "error");
            }
        } catch (err) {
            showAlert("Error crítico al actualizar", "error");
        }
    }, [editingId, newItemName, newItemBrand, isPack, packSize, newItemCost, newItemQuantity, newItemSellingPrice, newItemPackPrice, newItemCategoryId, minStockAlert, fetchStock, showAlert]);

    const handleDeleteClick = useCallback(async (item) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar ${item.name}?`)) {
            try {
                const res = await fetch(`${API_URL}/stock/${item.id}`, { method: 'DELETE' });
                if (res.ok) {
                    showAlert("Producto eliminado", "success");
                    fetchStock();
                }
            } catch (err) {
                showAlert("Error al eliminar", "error");
            }
        }
    }, [fetchStock, showAlert]);

    const handleSellSubmit = useCallback((e) => {
        e.preventDefault();
        const priceUnit = parseFloat(sellPriceUnit);
        const qty = parseFloat(sellQuantity);
        if (!workDesc || isNaN(priceUnit) || isNaN(qty)) {
            showAlert("Completa todos los campos", "error");
            return;
        }

        fetch(`${API_URL}/stock/${selectedItem.id}/sell`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sale_price_unit: priceUnit, quantity: qty, work_description: workDesc })
        })
            .then(res => {
                if (!res.ok) throw new Error("Error en la venta");
                return res.json();
            })
            .then(() => {
                fetchStock();
                setIsSellModalOpen(false);
                showAlert("Venta registrada con éxito", "success");
            })
            .catch(err => showAlert(err.message, "error"));
    }, [sellPriceUnit, sellQuantity, workDesc, selectedItem, fetchStock, showAlert]);

    const handleSelectExisting = useCallback((item) => {
        setSelectedExisting(item);
        setNewItemName(item.name);
        setNewItemBrand(item.brand || '');
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
        isSellModalOpen, setIsSellModalOpen,
        selectedItem, setSelectedItem,

        // Edit form
        isEditing, editingId,
        newItemName, setNewItemName,
        newItemBrand, setNewItemBrand,
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

        // Sell form
        sellPriceUnit, setSellPriceUnit,
        sellQuantity, setSellQuantity,
        workDesc, setWorkDesc,

        // Computed
        calculatedUnitCost, calculatedPackCost,

        // Handlers
        fetchStock, openEditModal, addToDraft,
        handleSaveBatch, handleEditSubmit,
        handleDeleteClick, handleSellSubmit,
        handleSelectExisting, resetForm,
    };
}
