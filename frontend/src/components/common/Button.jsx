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
    const baseStyles = "relative inline-flex items-center justify-center font-bold tracking-tight uppercase transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden border";

    // Size variants
    const sizes = {
        sm: "px-3 py-1.5 text-[10px]",
        md: "px-5 py-2.5 text-xs",
        lg: "px-8 py-4 text-sm",
    };

    // Style variants (Professional Monochrome)
    const variants = {
        primary: "bg-black text-white border-black hover:bg-white hover:text-black",
        secondary: "bg-transparent text-black border-black hover:bg-black hover:text-white",
        ghost: "bg-transparent text-txt-secondary border-transparent hover:text-black hover:bg-black/5",
        danger: "bg-transparent text-black border-panel-border hover:bg-black/5",
        neon: "bg-black text-white border-black hover:bg-white hover:text-black",
    };

    return (
        <button
            className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {icon && <span className="mr-2 text-sm">{icon}</span>}
            <span className="relative z-10">{children}</span>
        </button>
    );
};

export default Button;
