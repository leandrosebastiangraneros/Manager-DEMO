import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, isCollapsed, toggleCollapse }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Inicio', icon: 'dashboard' },
        { id: 'operaciones', label: 'Operaciones', icon: 'precision_manufacturing' },
        { id: 'calendario', label: 'Calendario', icon: 'calendar_month' },
        { id: 'trips', label: 'Viajes', icon: 'local_shipping' },
        { id: 'fleet', label: 'Flota', icon: 'directions_car' },
        { id: 'stock', label: 'Inventario', icon: 'inventory_2' },
        { id: 'personal', label: 'Personal', icon: 'badge' },
        { id: 'reportes', label: 'Reportes', icon: 'analytics' },
        { id: 'configuracion', label: 'Configuración', icon: 'settings' },
    ];

    return (
        <div className={`fixed inset-y-0 left-0 bg-surface/95 backdrop-blur-xl border-r border-white/5 z-50 transform transition-all duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`p-6 border-b border-white/5 flex flex-col items-center justify-center transition-all ${isCollapsed ? 'py-8' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-black font-black text-xs shrink-0">
                        NM
                    </div>
                    {!isCollapsed && (
                        <div className="text-xl font-display font-black tracking-widest text-white whitespace-nowrap animate-[fadeIn_0.3s]">
                            NOVA<span className="text-accent">MANAGER</span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <div className="text-[10px] text-center text-txt-dim font-mono mt-2 tracking-[0.15em] uppercase whitespace-nowrap animate-[fadeIn_0.3s]">
                        Planificación de Recursos
                    </div>
                )}
            </div>

            <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-140px)] custom-scrollbar">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        title={isCollapsed ? item.label : ''}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-4 px-3 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden
                            ${activeTab === item.id
                                ? 'bg-accent/10 text-accent shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                                : 'text-txt-secondary hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        {activeTab === item.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent shadow-[0_0_10px_#00f0ff]"></div>
                        )}
                        <span className={`material-icons text-xl ${activeTab === item.id ? 'animate-pulse' : ''} group-hover:scale-110 transition-transform`}>
                            {item.icon}
                        </span>
                        {!isCollapsed && (
                            <span className="font-medium text-sm tracking-wide whitespace-nowrap animate-[fadeIn_0.2s]">{item.label}</span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Collapse Toggle & User Info */}
            <div className="absolute bottom-0 left-0 w-full border-t border-white/5 bg-black/20">
                {/* Toggle Button */}
                <button
                    onClick={toggleCollapse}
                    className="w-full items-center justify-center py-2 text-txt-dim hover:text-white hover:bg-white/5 transition-colors hidden md:flex"
                    title={isCollapsed ? "Expandir Barra Lateral" : "Colapsar Barra Lateral"}
                >
                    <span className="material-icons text-sm">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
                </button>

                <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0 cursor-pointer" title="Administrador">
                        <span className="material-icons text-sm">person</span>
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden animate-[fadeIn_0.2s]">
                            <div className="text-xs font-bold text-white truncate">Administrador</div>
                            <div className="text-[10px] text-accent flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-success"></span> En Línea
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
