-- AGREGAR SOPORTE PARA MARCAS Y PACKS EN STOCK_ITEMS

-- 1. Agregar columna de Marca
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS brand TEXT;

-- 2. Agregar columnas para manejo de Packs
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS is_pack BOOLEAN DEFAULT FALSE;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS pack_size FLOAT DEFAULT 1;

-- 3. Comentario informativo
COMMENT ON COLUMN stock_items.brand IS 'Marca del producto';
COMMENT ON COLUMN stock_items.is_pack IS 'Indica si el registro es por un pack de productos';
COMMENT ON COLUMN stock_items.pack_size IS 'Cantidad de unidades individuales dentro del pack';
