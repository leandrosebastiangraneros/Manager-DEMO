-- TABLA DE LOG DE ACTIVIDAD / MOVIMIENTOS
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS app_movements (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    category TEXT NOT NULL, -- 'STOCK', 'VENTA', 'FINANZAS', 'SISTEMA'
    action TEXT NOT NULL,   -- 'ALTA', 'VENTA', 'REPORTE', 'GASTO'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Comentario para el dashboard (opcional)
COMMENT ON TABLE app_movements IS 'Registro de actividad y trazabilidad del sistema NovaManager';
