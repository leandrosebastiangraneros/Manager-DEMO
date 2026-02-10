-- FIX: AGREGAR COLUMNA PACK_PRICE Y ASEGURAR ESQUEMA
-- Ejecutar en el Editor SQL de Supabase

ALTER TABLE IF EXISTS public.stock_items 
ADD COLUMN IF NOT EXISTS pack_price DOUBLE PRECISION;

-- Asegurar que otras columnas críticas existan (por si acaso)
ALTER TABLE IF EXISTS public.stock_items 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS is_pack BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pack_size DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS min_stock_alert DOUBLE PRECISION DEFAULT 5.0;

-- Comentarios
COMMENT ON COLUMN public.stock_items.pack_price IS 'Precio de venta sugerido para el pack principal';

-- Notificar a PostgREST que el esquema cambió (esto se hace automáticamente pero a veces ayuda re-confirmar)
-- NOTIFY pgrst, 'reload schema';
