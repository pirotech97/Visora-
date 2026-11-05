import React, { useState } from 'react';
import {
  Menu,
  FileText,
  Layers,
  Scissors,
  FileEdit,
  UserCheck,
  Receipt,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins,
  Palette,
  Upload
} from 'lucide-react';
import type { UserProfile, AppTab } from '../types';
import { PdfMergeTool } from './PdfMergeTool';
import { PdfSplitTool } from './PdfSplitTool';
import { CvGeneratorTool } from './CvGeneratorTool';
import { LetterGeneratorTool } from './LetterGeneratorTool';
import { InvoiceGeneratorTool } from './InvoiceGeneratorTool';
import { FormGeneratorTool } from './FormGeneratorTool';
import { MesModelesTool } from './MesModelesTool';
import { BottomNav } from './BottomNav';

interface ToolsScreenProps {
  user: UserProfile;
  credits: number | null;
  onGoToChat: () => void;
  onGoToHistory: () => void;
  onOpenMenu?: () => void;
  onTabChange?: (tab: AppTab) => void;
  onOpenCreateImage?: () => void;
  onOpenRecharge?: () => void;
  onCreditsChange?: (credits: number) => void;
  initialTool?: 'hub' | 'merge' | 'split' | 'cv' | 'lettre' | 'invoice' | 'form' | 'modeles';
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  user,
  credits,
  onGoToChat,
  onGoToHistory,
  onOpenMenu,
  onTabChange,
  onOpenCreateImage,
  onOpenRecharge = () => {},
  onCreditsChange = () => {},
  initialTool = 'hub'
}) => {
  const [currentTool, setCurrentTool] = useState<'hub' | 'merge' | 'split' | 'cv' | 'lettre' | 'invoice' | 'form' | 'modeles'>(initialTool);
  const [modelesFilter, setModelesFilter] = useState<'all' | 'affiche'>('all');
  const [modelesAction, setModelesAction] = useState<'list' | 'add_affiche'>('list');

  if (currentTool === 'modeles') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <MesModelesTool
          user={user}
          credits={credits}
          initialFilter={modelesFilter}
          initialAction={modelesAction}
          onBack={() => {
            setModelesFilter('all');
            setModelesAction('list');
            setCurrentTool('hub');
          }}
          onOpenRecharge={onOpenRecharge}
          onCreditsChange={onCreditsChange}
        />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  if (currentTool === 'form') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <FormGeneratorTool
          user={user}
          credits={credits}
          onBack={() => setCurrentTool('hub')}
          onOpenRecharge={onOpenRecharge}
          onCreditsChange={onCreditsChange}
        />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  if (currentTool === 'invoice') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <InvoiceGeneratorTool
          user={user}
          credits={credits}
          onBack={() => setCurrentTool('hub')}
          onOpenRecharge={onOpenRecharge}
          onCreditsChange={onCreditsChange}
        />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  if (currentTool === 'cv') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <CvGeneratorTool
          user={user}
          credits={credits}
          onBack={() => setCurrentTool('hub')}
          onOpenRecharge={onOpenRecharge}
          onCreditsChange={onCreditsChange}
        />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  if (currentTool === 'lettre') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <LetterGeneratorTool
          user={user}
          credits={credits}
          onBack={() => setCurrentTool('hub')}
          onOpenRecharge={onOpenRecharge}
          onCreditsChange={onCreditsChange}
        />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  if (currentTool === 'merge') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <PdfMergeTool onBack={() => setCurrentTool('hub')} />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  if (currentTool === 'split') {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
        <PdfSplitTool onBack={() => setCurrentTool('hub')} />
        <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
          <div className="max-w-[640px] mx-auto w-full">
            <BottomNav
              activeTab="tools"
              onTabChange={(tab) => {
                if (tab === 'chat') onGoToChat();
                else if (tab === 'history') onGoToHistory();
                else setCurrentTool('hub');
              }}
            />
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
      {/* Top Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="lg:hidden p-1.5 sm:p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Ouvrir le menu"
              title="Menu principal"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Visora</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 shrink-0">
                Outils
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden min-[480px]:block">
              Documents administratifs & PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{credits ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Corps déroulant du Hub d'Outils */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:p-6 max-w-3xl lg:max-w-5xl mx-auto w-full space-y-5">
        {/* En-tête de section */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
            Outils
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Fusion et séparation : gratuites, tes fichiers restent sur ton appareil.
          </p>
        </div>

        {/* Grille de cartes (2 colonnes sur mobile, 3 sur ordinateur) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* 0. NOUVEAU : Créer une affiche */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-fuchsia-500/10 via-white to-pink-500/5 dark:from-fuchsia-950/40 dark:via-slate-800 dark:to-slate-800 border-2 border-fuchsia-300/80 dark:border-fuchsia-600/70 shadow-xs text-left transition flex flex-col justify-between group min-h-[170px] col-span-2 md:col-span-1">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Palette className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-700 uppercase tracking-wide">
                  Affiche A4
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Créer une affiche
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Importe une affiche qui te plaît : l'IA reproduit sa mise en page pour tes promos, événements ou annonces.
              </p>
            </div>
            <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setModelesFilter('affiche');
                  setModelesAction('add_affiche');
                  setCurrentTool('modeles');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer un modèle d'affiche</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModelesFilter('affiche');
                  setModelesAction('list');
                  setCurrentTool('modeles');
                }}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-fuchsia-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 hover:text-fuchsia-600 text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Mes affiches</span>
              </button>
            </div>
          </div>

          {/* 0 bis. Mes modèles personnalisés (Sur mesure) */}
          <button
            type="button"
            onClick={() => {
              setModelesFilter('all');
              setModelesAction('list');
              setCurrentTool('modeles');
            }}
            className="p-4 rounded-3xl bg-gradient-to-br from-purple-500/10 via-white to-purple-500/5 dark:from-purple-950/40 dark:via-slate-800 dark:to-slate-800 border border-purple-200/90 dark:border-purple-700/80 shadow-xs hover:shadow-md hover:border-purple-500 dark:hover:border-purple-400 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px] col-span-2 md:col-span-1"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 uppercase tracking-wide">
                  Sur mesure
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Mes modèles
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Envoie ta photo ou capture : l'IA reproduit ton gabarit pour créer tes documents.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400">
              <span>Ouvrir tous mes modèles</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 1. Fusionner des PDF (actif) */}
          <button
            type="button"
            onClick={() => setCurrentTool('merge')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Fusionner des PDF
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Combine plusieurs PDF et images en un seul fichier.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 2. Séparer un PDF (actif) */}
          <button
            type="button"
            onClick={() => setCurrentTool('split')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                <Scissors className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Séparer un PDF
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Extrais des pages ou découpe ton PDF en plusieurs fichiers.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 3. Extraire en Word (actif, ouvre le chat) */}
          <button
            type="button"
            onClick={onGoToChat}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Extraire en Word
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Convertis fidèlement un PDF ou une photo en document .docx.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              <span>Accéder au Chat</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 4. Créer une image (actif) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCreateImage) {
                onOpenCreateImage();
              } else {
                onGoToChat();
              }
            }}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Créer une image
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Images, affiches et fiches produits générées par l'IA.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 5. Créer un CV (actif - 2 crédits) */}
          <button
            type="button"
            onClick={() => setCurrentTool('cv')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span>2 crédits</span>
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Créer un CV
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Modèles professionnels prêts pour les candidatures d'emploi.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 6. Lettre de demande ou d'emploi (actif - 1 crédit) */}
          <button
            type="button"
            onClick={() => setCurrentTool('lettre')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition">
                  <FileEdit className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span>1 crédit</span>
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Lettre de demande ou d'emploi
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Rédige des courriers administratifs clairs et conformes.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 6. Devis et facture (actif - 1 crédit) */}
          <button
            type="button"
            onClick={() => setCurrentTool('invoice')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span>1 crédit</span>
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Devis et facture
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Génère des devis et factures soignés pour tes clients.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 7. Générer un formulaire (actif - 2 crédits) */}
          <button
            type="button"
            onClick={() => setCurrentTool('form')}
            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 text-left transition active:scale-[0.98] cursor-pointer flex flex-col justify-between group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span>2 crédits</span>
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Générer un formulaire
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                Crée des fiches et questionnaires administratifs.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* Note de bas de page rassurante */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Tous les outils de fusion et séparation s’exécutent à 100 % dans votre navigateur pour une confidentialité absolue.
          </span>
        </div>
      </div>

      {/* Pied de Page Épinglé */}
      <footer className="lg:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 z-30 px-2 py-1 select-none">
        <div className="max-w-[640px] mx-auto w-full">
          <BottomNav
            activeTab="tools"
            onTabChange={(tab) => {
              if (tab === 'chat') onGoToChat();
              else if (tab === 'history') onGoToHistory();
              else if (onTabChange) onTabChange(tab);
            }}
          />
        </div>
      </footer>
    </div>
  );
};
