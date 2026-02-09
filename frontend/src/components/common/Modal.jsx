import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, children, title, className = "", showCloseButton = true }) => {
    if (!isOpen) return null;

    // Usamos createPortal para renderizar el modal fuera de la jerarquía DOM actual si es necesario, 
    // pero por simplicidad y compatibilidad con el código existente, mantendremos el renderizado inline por ahora
    // a menos que cause problemas de z-index.

    // Use createPortal to break out of any parent stacking contexts (transforms, overflow:hidden, etc)
    // capable of clipping the modal or messing up z-index.
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className={`relative bg-surface/90 w-full max-w-lg rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 backdrop-blur-xl overflow-hidden animate-[scaleIn_0.2s_ease-out] ${className}`}>

                {/* Decorative Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-purple-500 to-accent opacity-50"></div>

                {/* Header if title present */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between mb-6">
                        {title && (
                            <h3 className="text-xl font-display font-black text-white tracking-wide">
                                {title}
                            </h3>
                        )}

                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-txt-dim hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 ml-auto"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        )}
                    </div>
                )}

                {children}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
