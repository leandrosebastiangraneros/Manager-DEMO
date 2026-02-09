// Configuración dinámica de la URL de la API
let API_URL = import.meta.env.VITE_API_URL || "https://novamanager-backend.onrender.com";

// Detección automática de entorno local
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = "http://localhost:8000";
}

export { API_URL };
