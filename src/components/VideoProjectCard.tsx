import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import type { VideoProjectRecord, VideoProjectScene } from '../types';
import { fetchProjectStatus } from '../services/supabase';
import { MediaPlayer } from './MediaPlayer';

interface VideoProjectCardProps {
  project: VideoProjectRecord;
  onProjectUpdated?: (updated: VideoProjectRecord) => void;
}

export const VideoProjectCard: React.FC<VideoProjectCardProps> = ({
  project,
  onProjectUpdated
}) => {
  const [currentProject, setCurrentProject] = useState<VideoProjectRecord>(project);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [activePlayingIndex, setActivePlayingIndex] = useState<number | null>(null);

  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setCurrentProject(project);
  }, [project]);

  const scenes = currentProject.scenes || [];
  const completedScenes = scenes.filter((s) => s.statut === 'termine' && s.url);
  const isFinished = currentProject.statut === 'termine' || (scenes.length > 0 && scenes.every((s) => s.statut === 'termine' || s.statut === 'erreur'));

  // 1. Suivi : { action: "statut_projet", projet_id } immédiatement, puis toutes les 6 secondes (setTimeout récursif)
  // jusqu'à termine: true. Arrête après 20 minutes ou au démontage. Erreur réseau : réessaie sans message.
  useEffect(() => {
    if (!currentProject.id || isFinished) return;

    // Si le projet a été créé il y a plus de 15 minutes avant le montage, ne pas reprendre le suivi automatique
    const initialAge = Date.now() - new Date(currentProject.created_at || startTimeRef.current).getTime();
    if (initialAge > 15 * 60 * 1000) {
      return;
    }

    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;
    const startTime = Date.now();
    const MAX_DURATION = 20 * 60 * 1000;

    const pollProject = async () => {
      if (!isMounted) return;

      const elapsed = Date.now() - new Date(currentProject.created_at || startTime).getTime();
      if (elapsed > MAX_DURATION) {
        return; // Arrêt après 20 minutes
      }

      try {
        const res = await fetchProjectStatus(currentProject.id);
        if (!isMounted) return;

        if (res.scenes && res.scenes.length > 0) {
          const updated: VideoProjectRecord = {
            ...currentProject,
            statut: res.termine ? 'termine' : 'en_cours',
            scenes: res.scenes
          };
          setCurrentProject(updated);
          onProjectUpdated?.(updated);

          if (res.termine) {
            return;
          }
        }

        // Replanifier dans 6 secondes
        timerId = setTimeout(pollProject, 6000);
      } catch {
        // En cas d'erreur réseau, réessaie silencieusement sans message
        if (isMounted) {
          timerId = setTimeout(pollProject, 6000);
        }
      }
    };

    // Immédiatement, puis toutes les 6 secondes
    pollProject();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [currentProject.id, isFinished, onProjectUpdated]);

  const handleManualRefresh = async () => {
    if (!currentProject.id) return;
    setIsRefreshing(true);
    try {
      const res = await fetchProjectStatus(currentProject.id);
      if (res.scenes && res.scenes.length > 0) {
        const updated: VideoProjectRecord = {
          ...currentProject,
          statut: res.termine ? 'termine' : currentProject.statut,
          scenes: res.scenes
        };
        setCurrentProject(updated);
        onProjectUpdated?.(updated);
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Fonction "Tout lire" : lit les scènes terminées dans l'ordre (événement "ended")
  const handlePlayAll = () => {
    if (completedScenes.length < 2) return;

    if (isPlayingAll) {
      // Pause
      if (activePlayingIndex !== null) {
        const currentVid = videoRefs.current.get(activePlayingIndex);
        currentVid?.pause();
      }
      setIsPlayingAll(false);
      setActivePlayingIndex(null);
      return;
    }

    setIsPlayingAll(true);
    playSceneAtIndex(0);
  };

  const playSceneAtIndex = (index: number) => {
    if (index >= completedScenes.length) {
      setIsPlayingAll(false);
      setActivePlayingIndex(null);
      return;
    }

    const sceneNum = completedScenes[index].scene_num;
    setActivePlayingIndex(sceneNum);

    const vid = videoRefs.current.get(sceneNum);
    if (vid) {
      vid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      vid.currentTime = 0;
      vid.play().catch(() => {});

      const handleEnded = () => {
        vid.removeEventListener('ended', handleEnded);
        playSceneAtIndex(index + 1);
      };
      vid.addEventListener('ended', handleEnded);
    }
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3.5">
      {/* En-tête du projet */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentProject.titre || 'Projet multi-scènes'}
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {scenes.length} scènes
              </span>
            </div>
            {currentProject.style && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Style : {currentProject.style}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isFinished ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              <span>Terminé</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition cursor-pointer"
              title="Actualiser le statut des scènes"
            >
              <Loader2 className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : 'animate-spin'}`} />
              <span>En cours…</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barre d'action "Tout lire" (quand au moins 2 scènes sont terminées) */}
      {completedScenes.length >= 2 && (
        <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              {isPlayingAll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlayingAll ? 'Mettre en pause' : 'Tout lire'}</span>
            </button>
            <span className="text-[11px] text-slate-500 font-medium">
              {completedScenes.length} scènes prêtes
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Les scènes se lisent à la suite ; chaque scène se télécharge séparément.
          </p>
        </div>
      )}

      {/* Grille de cartes (une par scène) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scenes.map((scene, idx) => {
          const sceneNum = scene.scene_num || idx + 1;
          const isActive = activePlayingIndex === sceneNum;
          const isSceneDone = scene.statut === 'termine' && scene.url;
          const isSceneError = scene.statut === 'erreur';

          return (
            <div
              key={scene.id || `sc_${sceneNum}`}
              className={`p-3 rounded-2xl border transition ${
                isActive
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/40'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xs'
              } flex flex-col justify-between space-y-2`}
            >
              {/* Header de la carte scène */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {scene.scene_nom || scene.nom || `Scène ${sceneNum}`}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {scene.duree && <span>{scene.duree} s</span>}
                    {scene.cout && <span>· {scene.cout} cr</span>}
                  </div>
                </div>

                <div>
                  {isSceneDone ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Prêt</span>
                    </span>
                  ) : isSceneError ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300">
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>Échec</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span>Génération…</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Description / Prompt */}
              {scene.prompt && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 italic leading-snug">
                  « {scene.prompt} »
                </p>
              )}

              {/* Personnages de la scène */}
              {scene.personnages && scene.personnages.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Users className="w-3 h-3 text-slate-400" />
                  {scene.personnages.map((p) => (
                    <span
                      key={p}
                      className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Lecteur Vidéo si terminée */}
              {isSceneDone ? (
                <div className="pt-1">
                  <MediaPlayer
                    fichier={scene.fichier}
                    initialUrl={scene.url}
                    type="video"
                    id={scene.id || `${currentProject.id}-${sceneNum}`}
                    videoRef={(el) => {
                      if (el) videoRefs.current.set(sceneNum, el);
                      else videoRefs.current.delete(sceneNum);
                    }}
                    onEnded={() => {
                      if (isPlayingAll) {
                        const curIdx = completedScenes.findIndex((s) => (s.scene_num || 1) === sceneNum);
                        if (curIdx !== -1) {
                          playSceneAtIndex(curIdx + 1);
                        }
                      }
                    }}
                  />
                </div>
              ) : isSceneError ? (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 text-center">
                  Cette création a échoué. Tes crédits ont été rendus.
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">Création en cours…</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
