import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-panel-border/20 p-6 flex flex-col gap-4 animate-scaleIn">

                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-orange-500/10 text-orange-500' : 'bg-accent/10 text-accent'}`}>
                        <span className="material-icons text-xl">{type === 'danger' ? 'warning_amber' : 'info'}</span>
                    </div>
                    <h3 className="text-lg font-black text-txt-primary uppercase tracking-tight">{title}</h3>
                </div>

                <p className="text-sm text-txt-secondary leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3 mt-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl border border-panel-border/10 bg-surface-highlight text-txt-dim font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-void shadow-lg hover:shadow-xl transition-all active:scale-95 ${type === 'danger' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-accent hover:bg-accent/90'}`}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
