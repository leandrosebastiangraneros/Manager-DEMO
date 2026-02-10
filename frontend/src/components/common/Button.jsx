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
        primary: "bg-accent text-void border-accent hover:bg-void hover:text-accent hover:border-accent",
        secondary: "bg-transparent text-txt-primary border-txt-primary hover:bg-accent hover:text-void",
        ghost: "bg-transparent text-txt-secondary border-transparent hover:text-txt-primary hover:bg-surface-highlight",
        danger: "bg-transparent text-txt-primary border-panel-border hover:bg-surface-highlight",
        neon: "bg-accent text-void border-accent hover:bg-void hover:text-accent",
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
