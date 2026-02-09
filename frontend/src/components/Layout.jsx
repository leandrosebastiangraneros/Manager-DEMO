import React, { useState } from 'react';
import Sidebar from './Sidebar';

import { Toaster } from 'sonner';

const Layout = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex bg-void h-full font-sans text-txt-primary overflow-hidden">
            <Toaster position="top-right" theme="dark" richColors closeButton />
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-accent/5 blur-[120px] rounded-full -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full translate-y-1/3"></div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-surface/90 backdrop-blur-md z-40 px-4 py-3 flex justify-between items-center border-b border-white/5">
                <div className="font-display font-bold tracking-wider text-lg">
                    NOVA<span className="text-accent">MANAGER</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-txt-primary hover:text-accent transition-colors"
                >
                    <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                </button>
            </div>

            {/* Sidebar */}
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

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-30 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 relative z-10 overflow-y-auto w-full h-full custom-scrollbar">
                {/* Removed max-w-7xl to fit full width 1080p, adjusted padding */}
                <div className="p-4 md:p-6 pt-24 md:pt-6 w-full min-h-full pb-32">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
