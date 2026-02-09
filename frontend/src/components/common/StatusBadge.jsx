import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
    // Definimos colores basados en el status
    let colorClass = "bg-txt-dim/20 text-txt-dim border-txt-dim/30";
    let icon = "circle";

    const s = status?.toLowerCase() || "";

    if (s.includes('active') || s.includes('present') || s.includes('paid') || s.includes('completed') || s.includes('open')) {
        colorClass = "bg-success/10 text-success border-success/30";
        icon = "check_circle";
    } else if (s.includes('pending') || s.includes('warning') || s.includes('late')) {
        colorClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
        icon = "schedule";
    } else if (s.includes('error') || s.includes('cancelled') || s.includes('absent') || s.includes('deleted') || s.includes('depleted')) {
        colorClass = "bg-error/10 text-error border-error/30";
        icon = "cancel";
    } else if (s.includes('draft') || s.includes('inactive')) {
        colorClass = "bg-txt-dim/20 text-txt-dim border-txt-dim/30";
        icon = "do_not_disturb_on";
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${colorClass} text-[10px] font-mono tracking-wider uppercase backdrop-blur-sm`}>
            <span className="material-icons text-[10px]">{icon}</span>
            <span>{status}</span>
        </div>
    );
};

export default StatusBadge;
