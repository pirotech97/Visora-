import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Download, AlertCircle, RotateCw } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

interface MediaPlayerProps {
  fichier?: string;
  type: 'video' | 'audio';
  id: string;
  initialUrl?: string;
  showDownloadButton?: boolean;
  videoRef?: (el: HTMLVideoElement | null) => void;
  onEnded?: () => void;
  className?: string;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  fichier,
  type,
  id,
  initialUrl,
  showDownloadButton = true,
  videoRef,
  onEnded,
  className = ''
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(initialUrl || null);
  const [loading, setLoading] = useState<boolean>(!initialUrl);
  const [error, setError] = useState<boolean>(false);
  const generatedAtRef = useRef<number>(initialUrl ? Date.now() : 0);

  const loadSignedUrl = async () => {
    if (!fichier) {
      if (signedUrl) return;
      setError(true);
      return;
    }

    // Si on a déjà une URL valide et créée il y a moins de 50 minutes, la garder
    const now = Date.now();
    if (signedUrl && now - generatedAtRef.current < 50 * 60 * 1000) {
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase indisponible');
      }

      const cleanFichier = fichier.replace(/^\/+/, '');
      const { data, error: signError } = await supabase.storage
        .from('medias')
        .createSignedUrl(cleanFichier, 3600);

      if (signError || !data?.signedUrl) {
        console.log('media: lien', signError || new Error('URL signée introuvable'));
        setError(true);
      } else {
        setSignedUrl(data.signedUrl);
        generatedAtRef.current = Date.now();
      }
    } catch (err) {
      console.log('media: lien', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignedUrl();
  }, [fichier]);

  // Rafraîchir si l'URL date de plus de 50 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (signedUrl && Date.now() - generatedAtRef.current >= 50 * 60 * 1000) {
        loadSignedUrl();
      }
    }, 60 * 1000); // vérifie chaque minute

    return () => clearInterval(interval);
  }, [signedUrl, fichier]);

  if (loading) {
    return (
      <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center gap-2 text-slate-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span className="text-xs">Chargement du lecteur…</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-center space-y-2 ${className}`}>
        <div className="flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">Impossible de charger le fichier. Réessaie.</span>
        </div>
        <button
          type="button"
          onClick={() => loadSignedUrl()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Réessayer</span>
        </button>
      </div>
    );
  }

  const downloadFilename = `visora-${type}-${id}.${type === 'video' ? 'mp4' : 'mp3'}`;

  return (
    <div className={`space-y-2.5 w-full max-w-[800px] mx-auto ${className}`}>
      {type === 'video' ? (
        <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-2xs">
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            src={signedUrl}
            onEnded={onEnded}
            style={{ maxWidth: '100%', borderRadius: 12 }}
            className="w-full max-h-[360px] md:max-h-[500px] lg:max-h-[70vh] object-contain aspect-video"
          />
        </div>
      ) : (
        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <audio
            controls
            src={signedUrl}
            onEnded={onEnded}
            className="w-full"
          />
        </div>
      )}

      {showDownloadButton && (
        <div className="flex items-center gap-2 pt-0.5">
          <a
            href={signedUrl}
            download={downloadFilename}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer no-underline"
            title="Télécharger"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger</span>
          </a>
        </div>
      )}
    </div>
  );
};
