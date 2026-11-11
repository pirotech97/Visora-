import React from 'react';
import { Download } from 'lucide-react';
import { useInstallation } from '../hooks/useInstallation';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'pill' | 'sidebar' | 'inline';
  onClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'pill',
  onClick
}) => {
  const { isInstallable, isInstalled, openManually } = useInstallation();

  // Si l'application est déjà installée ou que le navigateur ne supporte pas l'installation
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openManually();
    onClick?.();
  };

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer group ${className}`}
        title="Installer Visorax Studio sur ton appareil"
      >
        <div className="flex items-center gap-3">
          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Installer l'application</span>
        </div>
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer ${className}`}
        title="Installer Visorax Studio"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'application</span>
      </button>
    );
  }

  // Variant "pill" (défaut dans les réglages)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition active:scale-95 border border-blue-200 dark:border-blue-800 cursor-pointer ${className}`}
      title="Installer Visorax Studio"
    >
      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      <span>Installer</span>
    </button>
  );
};
