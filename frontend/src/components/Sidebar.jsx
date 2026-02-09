import React from 'react';
import GlassContainer from './common/GlassContainer';

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, toggleCollapse, isOpen }) => {
    // Intuitive labels
    const menuItems = [
        { id: 'inicio', label: 'Inicio', icon: 'dashboard' },
        { id: 'caja', label: 'Caja y Ventas', icon: 'shopping_cart' },
        { id: 'inventario', label: 'Inventario', icon: 'inventory_2' },
        { id: 'gastos', label: 'Gastos y Reportes', icon: 'analytics' },
        { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
    ];

    return (
        <aside
            className={`
                fixed md:relative top-0 left-0 h-full z-50
                bg-surface border-r border-panel-border transition-all duration-300 ease-in-out flex flex-col
                ${isCollapsed ? 'w-20' : 'w-72'}
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
        >
            <div className="h-full flex flex-col">
                {/* Brand / Logo (Clean) */}
                <div className="p-8 mb-4 mt-2 flex justify-center">
                    <div className={`
                        flex items-center justify-center transition-all duration-500
                        ${isCollapsed ? 'w-10 h-10' : 'w-full px-4 py-3'}
                    `}>
                        <span className="material-icons text-black text-2xl">grid_view</span>
                        {!isCollapsed && (
                            <span className="ml-3 font-sans font-extrabold tracking-tight text-black text-xl">NOVA</span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`
                                w-full flex items-center gap-4 p-4 transition-all duration-200 group relative
                                ${activeTab === item.id
                                    ? 'bg-black text-white shadow-md'
                                    : 'text-gray-500 hover:text-black hover:bg-gray-100'}
                            `}
                        >
                            <span className={`material-icons text-xl transition-transform duration-200`}>
                                {item.icon}
                            </span>
                            {!isCollapsed && (
                                <span className="font-sans font-bold text-xs tracking-wide uppercase whitespace-nowrap overflow-hidden">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-panel-border mt-auto">
                    <button
                        onClick={toggleCollapse}
                        className="w-full flex items-center gap-4 p-4 text-txt-primary hover:text-black hover:bg-black/5 transition-all group"
                    >
                        <span className={`material-icons transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`}>
                            chevron_left
                        </span>
                        {!isCollapsed && <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Contraer Menú</span>}
                    </button>
                </div>
            </div>
        </aside >
    );
};

export default Sidebar;
