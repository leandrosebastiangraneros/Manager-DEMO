-- REINICIAR BASE DE DATOS (BORRADO TOTAL DE DATOS)
-- Ejecutar en el SQL Editor de Supabase.
-- ¡ATENCIÓN! Esto borrará todos los productos, ventas, movimientos y gastos.

TRUNCATE TABLE 
    public.app_movements,
    public.stock_item_formats,
    public.stock_items,
    public.sales,
    public.transactions,
    public.categories,
    public.expense_documents
RESTART IDENTITY CASCADE;

-- Comentario: 
-- Al reiniciar la aplicación, el sistema volverá a crear las categorías básicas 
-- automáticamente gracias a la lógica de auto-healing del frontend.
