import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';
import { triggerOpenRecharge } from '../services/paiementService';

interface RechargeButtonProps {
  email?: string;
  credits?: number;
  className?: string;
  variant?: 'primary' | 'inline' | 'compact' | 'header';
  children?: React.ReactNode;
  onClick?: () => void;
}

export const RechargeButton: React.FC<RechargeButtonProps> = ({
  email,
  credits = 0,
  className = '',
  variant = 'primary',
  children,
  onClick
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      triggerOpenRecharge();
    }
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer select-none min-h-[38px] ${className}`}
        title="Recharger mes crédits par Mobile Money"
      >
        <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
        <span>{children || 'Recharger'}</span>
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer select-none min-h-[44px] ${className}`}
        title="Recharger mes crédits par Mobile Money"
      >
        <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
        <span>{children || 'Recharger'}</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer select-none min-h-[44px] ${className}`}
        title="Recharger mes crédits par Mobile Money"
      >
        <Zap className="w-3 h-3 fill-current text-amber-300" />
        <span>{children || 'Recharger'}</span>
      </button>
    );
  }

  // Variant 'primary' (full width or banner button)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer select-none min-h-[44px] ${className}`}
      title="Recharger mes crédits par Mobile Money"
    >
      <ShieldCheck className="w-4 h-4 text-white/90" />
      <span>{children || 'Recharger mes crédits'}</span>
    </button>
  );
};
