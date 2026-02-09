import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../config';

// Fix for default Leaflet icons in Webpack/Vite
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Custom Icons ---
const TruckIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #00f0ff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px #00f0ff;"><span class="material-icons" style="font-size: 16px; color: black; font-weight: bold;">local_shipping</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const WorkSiteIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #ff9900; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px #ff9900;"><span class="material-icons" style="font-size: 14px; color: black; font-weight: bold;">construction</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

const OperationsMap = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    // Default center (Buenos Aires approx, configurable)
    const center = [-34.6037, -58.3816];

    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const res = await fetch(`${API_URL}/trips`);
                const data = await res.json();
                // Filter active trips with coords
                const active = (Array.isArray(data) ? data : []).filter(t => t.status === 'OPEN' && t.destination_lat && t.destination_lng);
                setTrips(active);
            } catch (err) {
                console.error("Map data error", err);
            } finally {
                setLoading(false);
            }
        }
        fetchTrips();
        // Poll every 30s
        const interval = setInterval(fetchTrips, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full rounded-xl overflow-hidden border border-white/20 shadow-2xl relative bg-black/60">
            {loading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <span className="material-icons animate-spin text-white text-4xl">sync</span>
                </div>
            )}

            {/* Map Header Overlay */}
            <div className="absolute top-4 left-14 md:top-4 md:left-4 z-[500] bg-black/80 backdrop-blur border border-white/20 p-3 rounded-xl shadow-xl pointer-events-none select-none">
                <h4 className="text-white font-display font-bold text-sm tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                    MAPA EN VIVO
                </h4>
                <div className="text-[10px] text-txt-dim uppercase mt-1">
                    {trips.length} Unidades Activas
                </div>
            </div>

            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {trips.map(trip => (
                    <Marker
                        key={trip.id}
                        position={[trip.destination_lat, trip.destination_lng]}
                        icon={trip.vehicle_id ? TruckIcon : WorkSiteIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="font-sans text-xs">
                                <h3 className="font-bold text-black uppercase mb-1">{trip.description}</h3>
                                <div className="text-gray-600 mb-1">
                                    <span className="font-semibold">Chofer:</span> {trip.driver_name || 'N/A'}
                                </div>
                                {trip.vehicle && (
                                    <div className="text-gray-600 mb-1">
                                        <span className="font-semibold">Vehículo:</span> {trip.vehicle.name}
                                    </div>
                                )}
                                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                                    <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1 py-0.5 rounded">EN CURSO</span>
                                    <span className="text-[9px] text-gray-400">{new Date(trip.date).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default OperationsMap;
