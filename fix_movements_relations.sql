-- MEJORA DE RELACIONES PARA APP_MOVEMENTS
-- Esto permitirá que Supabase muestre las conexiones en el ER Diagram.

ALTER TABLE public.app_movements 
ADD COLUMN IF NOT EXISTS stock_item_id BIGINT REFERENCES public.stock_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transaction_id BIGINT REFERENCES public.transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sale_id BIGINT REFERENCES public.sales(id) ON DELETE SET NULL;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_movements_stock_item ON public.app_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_movements_transaction ON public.app_movements(transaction_id);
CREATE INDEX IF NOT EXISTS idx_movements_sale ON public.app_movements(sale_id);
