import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
    // Monochrome High-Contrast Palette
    let colorClass = "bg-surface-highlight text-txt-dim border-panel-border";
    let icon = "circle";

    const s = status?.toLowerCase() || "";

    if (s.includes('active') || s.includes('present') || s.includes('paid') || s.includes('completed') || s.includes('open') || s.includes('stock')) {
        colorClass = "bg-black text-white border-black"; // Active
        icon = "check_circle";
    } else if (s.includes('pending') || s.includes('warning') || s.includes('late')) {
        colorClass = "bg-transparent text-txt-primary border-2 border-txt-primary font-bold"; // Attention
        icon = "schedule";
    } else if (s.includes('error') || s.includes('cancelled') || s.includes('absent') || s.includes('deleted') || s.includes('depleted') || s.includes('agotado')) {
        colorClass = "bg-transparent text-txt-dim border-2 border-panel-border line-through opacity-40"; // Alert
        icon = "cancel";
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${colorClass} text-[9px] font-mono tracking-tighter uppercase`}>
            <span className="material-icons text-[10px]">{icon}</span>
            <span className="font-bold">{status}</span>
        </div>
    );
};

export default StatusBadge;
