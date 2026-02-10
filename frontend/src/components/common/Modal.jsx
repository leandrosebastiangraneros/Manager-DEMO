import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, children, title, className = "", showCloseButton = true }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop - Solid Dark Overlay */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content - Surface & Primary Text */}
            <div className={`relative bg-surface w-full max-w-lg border border-panel-border p-8 overflow-hidden rounded-xl shadow-2xl ${className}`}>
                {/* Close Button */}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-txt-dim hover:text-txt-primary transition-colors"
                    >
                        <span className="material-icons">close</span>
                    </button>
                )}

                {title && (
                    <div className="flex items-center justify-between mb-8 border-b border-gray-100/10 pb-4">
                        <h3 className="text-xl font-sans font-extrabold text-txt-primary uppercase tracking-tight">
                            {title}
                        </h3>
                    </div>
                )}

                <div className="text-txt-primary font-medium">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
