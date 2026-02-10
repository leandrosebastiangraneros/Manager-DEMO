-- AGREGAR UMBRAL DE ALERTA DE STOCK
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.stock_items 
ADD COLUMN IF NOT EXISTS min_stock_alert FLOAT DEFAULT 5;

-- Comentario informativo
COMMENT ON COLUMN public.stock_items.min_stock_alert IS 'Cantidad mínima de unidades para disparar alerta visual de stock bajo';
