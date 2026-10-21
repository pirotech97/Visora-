import React from 'react';
import { Zap, MessageCircle } from 'lucide-react';
import { openWhatsAppRecharge } from '../services/constants';

interface RechargeButtonProps {
  email: string;
  credits?: number;
  className?: string;
  variant?: 'primary' | 'inline' | 'compact' | 'header';
  children?: React.ReactNode;
}

export const RechargeButton: React.FC<RechargeButtonProps> = ({
  email,
  credits = 0,
  className = '',
  variant = 'primary',
  children
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openWhatsAppRecharge(email, credits);
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer select-none ${className}`}
        title="Recharger mes crédits via WhatsApp"
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>{children || 'Recharger'}</span>
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer select-none ${className}`}
        title="Recharger mes crédits via WhatsApp"
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>{children || 'Recharger'}</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer select-none ${className}`}
        title="Recharger mes crédits via WhatsApp"
      >
        <Zap className="w-3 h-3 fill-current" />
        <span>{children || 'Recharger'}</span>
      </button>
    );
  }

  // Variant 'primary' (full width or banner button)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer select-none ${className}`}
      title="Recharger mes crédits via WhatsApp"
    >
      <MessageCircle className="w-4 h-4" />
      <span>{children || 'Recharger'}</span>
    </button>
  );
};
