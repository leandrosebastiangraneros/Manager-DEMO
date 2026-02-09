import React from 'react';

const GlassContainer = ({ children, className = "", hoverEffect = false, ...props }) => {
    return (
        <div
            className={`
                group relative bg-glass backdrop-blur-xl border border-white/10
                rounded-none shadow-lg overflow-hidden
                ${hoverEffect ? 'hover:border-accent/30 hover:bg-white/[0.04] transition-all duration-500' : ''}
                ${className}
            `}
            {...props}
        >
            {/* --- Tech HUD Corners --- */}

            {/* Top Left */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-accent/60 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* Top Right */}
            <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-accent/60 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* Bottom Left */}
            <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-accent/60 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* Bottom Right */}
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-accent/60 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* --- Decorative Elements --- */}

            {/* Scanline / Grid Background Pattern (Subtle) */}
            <div className={`absolute inset-0 pointer-events-none opacity-[0.03] ${hoverEffect ? 'group-hover:opacity-[0.05]' : ''} transition-opacity duration-500`}
                style={{
                    backgroundImage: `linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }}>
            </div>

            {/* Top Glow Line (On Hover) */}
            {hoverEffect && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-accent/50 group-hover:w-1/2 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>}

            {/* Content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default GlassContainer;
