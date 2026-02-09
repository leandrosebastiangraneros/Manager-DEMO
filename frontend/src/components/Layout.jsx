import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';

const Layout = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                <div className="font-display font-bold tracking-tighter text-lg uppercase">
                    NOVA<span className="text-white">MANAGER</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-txt-primary hover:text-white"
                >
                    <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/90 z-30 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 md:p-12 pt-24 md:pt-12 w-full min-h-full pb-32">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
