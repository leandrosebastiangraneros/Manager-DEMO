import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = "",
    icon = null,
    onClick,
    disabled = false,
    ...props
}) => {
    const baseStyles = "relative inline-flex items-center justify-center font-bold tracking-wider uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden rounded-md";

    // Size variants
    const sizes = {
        sm: "px-4 py-2 text-xs",
        md: "px-6 py-3 text-xs",
        lg: "px-8 py-4 text-sm",
    };

    // Style variants
    const variants = {
        primary: "bg-white text-black hover:bg-gray-200 hover:text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] clip-path-polygon",
        secondary: "bg-transparent text-white border border-glass-border hover:border-white hover:text-white hover:bg-white/10",
        ghost: "bg-transparent text-txt-secondary hover:text-white hover:bg-white/5",
        danger: "bg-transparent text-white border border-white/30 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]",
        neon: "bg-white text-black hover:bg-gray-100 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)]"
    };

    return (
        <button
            className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {/* Hover shine effect for primary/neon */}
            {['primary', 'neon'].includes(variant) && (
                <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out skew-x-12"></div>
            )}

            {icon && <span className="mr-2">{icon}</span>}
            <span className="relative z-10">{children}</span>
        </button>
    );
};

export default Button;
