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

            {/* Modal Content - Pure White & Black Text */}
            <div className={`relative bg-void w-full max-w-lg border border-panel-border p-8 overflow-hidden ${className}`}>
                {/* Close Button */}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-txt-dim hover:text-black transition-colors"
                    >
                        <span className="material-icons">close</span>
                    </button>
                )}

                {title && (
                    <div className="flex items-center justify-between mb-8 border-b border-panel-border pb-4">
                        <h3 className="text-xl font-display font-black text-black uppercase tracking-tighter">
                            {title}
                        </h3>
                    </div>
                )}

                <div className="text-txt-primary">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
