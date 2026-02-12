import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import ThemeToggle from './common/ThemeToggle';
import { API_URL } from '../config';

const Layout = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-Healing: Check and Seed Categories if missing
    React.useEffect(() => {
        const checkAndSeed = async () => {
            try {
                const res = await fetch(`${API_URL}/categories`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length === 0) {
                        console.log("No categories found. Auto-seeding...");
                        await fetch(`${API_URL}/seed-categories`);
                        window.location.reload(); // Reload to reflect changes
                    }
                }
            } catch (err) {
                console.error("Auto-seed check failed:", err);
            }
        };
        checkAndSeed();
    }, []);

    return (
        <div className="flex bg-void h-screen w-full font-sans text-txt-primary overflow-hidden">
            <Toaster position="top-right" theme="dark" richColors closeButton />

            {/* Sidebar - Structural */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                }}
                isOpen={isMobileMenuOpen}
                isCollapsed={isCollapsed}
                toggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Mobile Header (Flat & Simple) */}
            <div className="md:hidden fixed top-0 w-full bg-surface z-40 px-4 py-3 flex justify-between items-center border-b border-panel-border">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                    <div className="font-display font-bold tracking-tighter text-[10px] uppercase leading-tight">
                        CENTRO DE<br />
                        ABARATAMIENTO<br />
                        <span className="text-accent">MAYORISTA</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden mb-16 md:mb-0">
                <div className="hidden md:flex absolute top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 md:p-12 pt-24 md:pt-12 w-full min-h-full pb-32">
                        {children}
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 w-full bg-surface border-t border-panel-border flex justify-around items-center h-16 z-50 pb-safe">
                {[
                    { id: 'inicio', label: 'Inicio', icon: 'dashboard' },
                    { id: 'caja', label: 'Caja', icon: 'shopping_cart' },
                    { id: 'inventario', label: 'Stock', icon: 'inventory_2' },
                    { id: 'gastos', label: 'Reportes', icon: 'analytics' },
                    { id: 'movimientos', label: 'Log', icon: 'history_toggle_off' },
                    { id: 'ajustes', label: 'Config', icon: 'settings' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${activeTab === item.id ? 'text-accent' : 'text-txt-dim hover:text-txt-primary'}`}
                    >
                        {activeTab === item.id && (
                            <span className="absolute top-0 w-8 h-0.5 bg-accent rounded-full" />
                        )}
                        <span className="material-icons text-xl">{item.icon}</span>
                        <span className="text-[8px] font-black mt-0.5 uppercase tracking-wider">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Layout;

