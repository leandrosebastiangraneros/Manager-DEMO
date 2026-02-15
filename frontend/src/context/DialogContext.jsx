import React, { createContext, useContext, useState, useRef } from 'react';
import GlassContainer from '../components/common/GlassContainer';
import Button from '../components/common/Button';

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider = ({ children }) => {
    // Confirm State
    const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', title: 'CONFIRM ACTION' });
    const confirmResolver = useRef(null);
    const confirmCallback = useRef(null);

    /**
     * showConfirm(message, callbackOrTitle?, title?)
     *
     * Usage A  (callback):  showConfirm("Sure?", () => doSomething())
     * Usage B  (promise) :  const ok = await showConfirm("Sure?")
     * Usage C  (title)   :  await showConfirm("Sure?", "DELETE")
     */
    const showConfirm = (message, callbackOrTitle, title) => {
        let resolvedTitle = 'CONFIRM ACTION';

        if (typeof callbackOrTitle === 'function') {
            confirmCallback.current = callbackOrTitle;
            resolvedTitle = title || 'CONFIRM ACTION';
        } else if (typeof callbackOrTitle === 'string') {
            resolvedTitle = callbackOrTitle;
            confirmCallback.current = null;
        } else {
            confirmCallback.current = null;
        }

        setConfirmState({ isOpen: true, message, title: resolvedTitle });

        return new Promise((resolve) => {
            confirmResolver.current = resolve;
        });
    };

    const handleConfirm = (value) => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));

        if (value && confirmCallback.current) {
            confirmCallback.current();
            confirmCallback.current = null;
        }

        if (confirmResolver.current) {
            confirmResolver.current(value);
            confirmResolver.current = null;
        }
    };

    return (
        <DialogContext.Provider value={{ showConfirm }}>
            {children}

            {/* --- UI: CONFIRM MODAL --- */}
            {confirmState.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-md animate-[zoomIn_0.2s_ease-out]">
                        <GlassContainer className="p-0 overflow-hidden border-accent/20 shadow-[0_0_50px_rgba(0,0,0,0.7)]">
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <h2 className="text-xl font-display font-black text-white tracking-wide uppercase flex items-center gap-2">
                                    <span className="material-icons text-accent">warning_amber</span>
                                    {confirmState.title}
                                </h2>
                                <div className="text-[10px] uppercase font-mono text-txt-dim border border-white/10 px-2 py-1 rounded">
                                    Confirmación
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-8 text-center">
                                <p className="text-txt-primary text-lg font-light leading-relaxed">
                                    {confirmState.message}
                                </p>
                                <p className="text-txt-dim text-xs mt-4 uppercase tracking-widest font-bold">
                                    Esta acción no se puede deshacer
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-black/40 flex gap-3 border-t border-white/5">
                                <Button
                                    onClick={() => handleConfirm(false)}
                                    variant="ghost"
                                    className="flex-1"
                                >
                                    CANCELAR
                                </Button>
                                <Button
                                    onClick={() => handleConfirm(true)}
                                    variant="neon"
                                    className="flex-1"
                                    icon={<span className="material-icons">check</span>}
                                >
                                    CONFIRMAR
                                </Button>
                            </div>
                        </GlassContainer>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
