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
    // Alert State
    const [alertState, setAlertState] = useState({ isOpen: false, message: '', type: 'info' }); // type: info, error, success

    // Confirm State
    const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', title: 'CONFIRM ACTION' });
    const confirmResolver = useRef(null);

    // --- ALERT LOGIC ---
    const showAlert = (message, type = 'info') => {
        setAlertState({ isOpen: true, message, type });
        // Auto dismiss after 3 seconds for simple info/success
        if (type !== 'error') {
            setTimeout(() => {
                setAlertState(prev => ({ ...prev, isOpen: false }));
            }, 3000);
        }
    };

    const closeAlert = () => setAlertState(prev => ({ ...prev, isOpen: false }));

    // --- CONFIRM LOGIC ---
    const showConfirm = (message, title = 'CONFIRM ACTION') => {
        setConfirmState({ isOpen: true, message, title });
        return new Promise((resolve) => {
            confirmResolver.current = resolve;
        });
    };

    const handleConfirm = (value) => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        if (confirmResolver.current) {
            confirmResolver.current(value);
            confirmResolver.current = null;
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {/* --- UI: ALERT MODAL (Toast Style) --- */}
            {alertState.isOpen && (
                <div className="fixed top-24 right-4 z-[9999] animate-[slideInRight_0.3s_ease-out]">
                    <GlassContainer className={`p-0 min-w-[320px] max-w-md overflow-hidden flex shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-l-4 ${alertState.type === 'error' ? 'border-l-red-500 bg-red-500/5' :
                            alertState.type === 'success' ? 'border-l-green-500 bg-green-500/5' :
                                'border-l-accent bg-accent/5'
                        }`}>
                        <div className="p-4 flex items-start gap-4 w-full">
                            <div className={`p-2 rounded-lg flex-none ${alertState.type === 'error' ? 'bg-red-500/10 text-red-500' :
                                    alertState.type === 'success' ? 'bg-green-500/10 text-green-500' :
                                        'bg-accent/10 text-accent'
                                }`}>
                                <span className="material-icons text-xl">
                                    {alertState.type === 'error' ? 'error_outline' :
                                        alertState.type === 'success' ? 'check_circle' :
                                            'info'}
                                </span>
                            </div>

                            <div className="flex-1 py-1">
                                <h4 className={`font-display font-bold text-sm uppercase tracking-wider mb-1 ${alertState.type === 'error' ? 'text-red-400' :
                                        alertState.type === 'success' ? 'text-green-400' :
                                            'text-accent'
                                    }`}>
                                    {alertState.type === 'error' ? 'SYSTEM ERROR' :
                                        alertState.type === 'success' ? 'SUCCESS' : 'NOTIFICATION'}
                                </h4>
                                <p className="text-white text-sm leading-snug font-mono">
                                    {alertState.message}
                                </p>
                            </div>

                            <button
                                onClick={closeAlert}
                                className="text-txt-dim hover:text-white transition-colors -mr-1 -mt-1"
                            >
                                <span className="material-icons text-lg">close</span>
                            </button>
                        </div>
                        {/* Progress bar animation could go here */}
                    </GlassContainer>
                </div>
            )}

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
                                    Confirm Req.
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-8 text-center">
                                <p className="text-white text-lg font-light leading-relaxed">
                                    {confirmState.message}
                                </p>
                                <p className="text-txt-dim text-xs mt-4 uppercase tracking-widest font-bold">
                                    This action cannot be undone
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-black/40 flex gap-3 border-t border-white/5">
                                <Button
                                    onClick={() => handleConfirm(false)}
                                    variant="ghost"
                                    className="flex-1"
                                >
                                    CANCEL
                                </Button>
                                <Button
                                    onClick={() => handleConfirm(true)}
                                    variant="neon"
                                    className="flex-1"
                                    icon={<span className="material-icons">check</span>}
                                >
                                    CONFIRM
                                </Button>
                            </div>
                        </GlassContainer>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
