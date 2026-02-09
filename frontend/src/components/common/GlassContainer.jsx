import React from 'react';

const GlassContainer = ({ children, className = "", hoverEffect = false, ...props }) => {
    return (
        <div
            className={`
                group relative bg-void border-2 border-panel-border
                rounded-none overflow-hidden transition-all duration-200
                ${hoverEffect ? 'hover:-translate-y-1 hover:-translate-x-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
                ${className}
            `}
            {...props}
        >
            {/* Content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default GlassContainer;
