import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone mode, hide button
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition active:scale-95 border border-blue-200"
        title="Installer Visora sur votre écran d'accueil"
      >
        <Download className="w-3.5 h-3.5 text-blue-600" />
        <span>Installer</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition active:scale-95 border border-blue-200"
          title="Installer sur iPhone ou iPad"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Installer Visora sur iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">1. Appuie sur Partager</span>
                    <p className="text-xs text-slate-500">Dans la barre de navigation Safari au bas de l'écran.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">2. Choisis « Sur l'écran d'accueil »</span>
                    <p className="text-xs text-slate-500">Fais défiler la liste vers le bas puis valide « Ajouter ».</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
