import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VisoraxMascot, type VisoraxMood } from './VisoraxMascot';
import { VisoraxLogo } from './VisoraxLogo';
import {
  FileText,
  Download,
  Smartphone,
  ShieldCheck,
  Check,
  ArrowRight,
  ChevronDown,
  X,
  Menu,
  MessageCircle,
  Play,
  Pause,
  Sliders,
  Music,
  Mic,
  Image as ImageIcon,
  Layers,
  QrCode
} from 'lucide-react';

// ============================================================================
// CONFIGURATION DE LA MARQUE VISORAX STUDIO
// ============================================================================
const CONFIG = {
  NOM: 'Visorax Studio',
  NOM_COURT: 'Visorax',
  SLOGAN: 'Crée, convertis, partage.',
  WHATSAPP_NUMERO: '22892556462',
  WHATSAPP_LIEN: 'https://wa.me/22892556462'
};

// ============================================================================
// FORMULE OFFICIELLE DU PRIX PERSONNALISÉ (SEULE SOURCE DU CALCUL)
// ============================================================================
export function prixPersonnalise(credits: number): number {
  if (credits >= 55) {
    return credits * 20;
  }
  return Math.ceil((17 * credits + 165) / 5) * 5;
}

// ============================================================================
// ÉCRANS DE LA GALERIE DÉMO INTERACTIVE
// ============================================================================
export interface DemoScreen {
  id: 'document' | 'modele' | 'affiche' | 'image' | 'voix' | 'musique';
  titre: string;
  legende: string;
  image?: string;
}

export const SCREENS_DEMO: DemoScreen[] = [
  {
    id: 'document',
    titre: 'Conversion de document',
    legende: 'Transformation propre et immédiate de PDF vers Word (.docx) ou tableur.'
  },
  {
    id: 'modele',
    titre: 'Modèle perso en direct',
    legende: 'Remplis les champs à gauche, ton document se compose en direct à droite.'
  },
  {
    id: 'affiche',
    titre: 'Affiche A4 professionnelle',
    legende: 'Mise en page prête à imprimer avec QR code interactif, en portrait ou paysage.'
  },
  {
    id: 'image',
    titre: 'Génération visuelle IA',
    legende: 'Rendu graphique soigné et fidèle à partir de ta simple description.'
  },
  {
    id: 'voix',
    titre: 'Synthèse vocale studio',
    legende: 'Voix naturelle et claire, prête pour tes vidéos, cours et présentations.'
  },
  {
    id: 'musique',
    titre: 'Composition musicale',
    legende: 'Deux versions complètes avec paroles ou instrumentales à chaque demande.'
  }
];

interface LandingPageProps {
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
}

type LegalModalType = 'mentions' | 'confidentialite' | 'cgu' | null;

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenSignIn,
  onOpenSignUp
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // État du menu mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // État du scroll (barre de lecture + en-tête après 24px)
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Modales légales
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  // FAQ : accordéon accessible (1 seul élément ouvert à la fois)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Galerie démo interactive
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const [isUserInteractingDemo, setIsUserInteractingDemo] = useState(false);
  const [isDemoInView, setIsDemoInView] = useState(false);
  const demoSectionRef = useRef<HTMLElement>(null);
  const userInteractionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Démo interactive : états internes
  const [demoPosterOrientation, setDemoPosterOrientation] = useState<'portrait' | 'paysage'>('portrait');
  const [demoCvName, setDemoCvName] = useState('Marie Diallo');
  const [demoCvRole, setDemoCvRole] = useState('Responsable Communication');
  const [demoVoicePlaying, setDemoVoicePlaying] = useState(false);
  const [demoVoiceTime, setDemoVoiceTime] = useState(0);
  const [demoMusicPlaying, setDemoMusicPlaying] = useState(false);
  const [demoMusicVersion, setDemoMusicVersion] = useState<1 | 2>(1);

  // Calculateur de prix personnalisé (5 à 500 crédits)
  const [customCreditsInput, setCustomCreditsInput] = useState<string>('50');
  const [lastValidCredits, setLastValidCredits] = useState<number>(50);
  const [customFeedback, setCustomFeedback] = useState<string | null>(null);
  const [calcMascotMood, setCalcMascotMood] = useState<VisoraxMood>('content');
  const calcMascotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------------------------------------------------------------------------
  // HOOK DE SCROLL REVEAL FIABLE (NE LAISSE JAMAIS UN TEXTE INVISIBLE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rootEl = rootRef.current;
    if (!rootEl) return;

    const elements = rootEl.querySelectorAll<HTMLElement>('.reveal-on-scroll');
    if (!elements || elements.length === 0) return;

    if (isReduced || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Active l'animation d'entrée uniquement si IntersectionObserver fonctionne
    rootEl.classList.add('js-active');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // --------------------------------------------------------------------------
  // GESTION DU DÉFILEMENT (EN-TÊTE ET BARRE DE PROGRESSION)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      const parent = rootRef.current?.parentElement;
      if (parent && parent.scrollHeight > parent.clientHeight) {
        scrollTop = parent.scrollTop;
        scrollHeight = parent.scrollHeight;
        clientHeight = parent.clientHeight;
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      }

      setIsScrolled(scrollTop > 24);

      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    const parent = rootRef.current?.parentElement;
    if (parent) {
      parent.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (parent) parent.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Détection de visibilité de la galerie démo
  useEffect(() => {
    if (!demoSectionRef.current || !('IntersectionObserver' in window)) {
      setIsDemoInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsDemoInView(entry.isIntersecting);
      },
      { threshold: 0.25 }
    );

    observer.observe(demoSectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Défilement automatique de la galerie (toutes les 6 secondes sauf interaction)
  useEffect(() => {
    if (isUserInteractingDemo || !isDemoInView) return;

    const timer = setInterval(() => {
      setActiveDemoIndex((prev) => (prev + 1) % SCREENS_DEMO.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isUserInteractingDemo, isDemoInView]);

  const pauseAutoPlayTemporarily = useCallback(() => {
    setIsUserInteractingDemo(true);
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsUserInteractingDemo(false);
    }, 12000);
  }, []);

  // Timer simulé pour le lecteur audio démo
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (demoVoicePlaying) {
      interval = setInterval(() => {
        setDemoVoiceTime((t) => (t >= 28 ? 0 : t + 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [demoVoicePlaying]);

  // Défilement fluide vers une ancre
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Fermeture des modales avec Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLegalModal(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --------------------------------------------------------------------------
  // LOGIQUE CALCULATEUR DE CRÉDITS
  // --------------------------------------------------------------------------
  const triggerCalcMascot = () => {
    setCalcMascotMood('reflechit');
    if (calcMascotTimeoutRef.current) {
      clearTimeout(calcMascotTimeoutRef.current);
    }
    calcMascotTimeoutRef.current = setTimeout(() => {
      setCalcMascotMood('content');
    }, 500);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    triggerCalcMascot();

    if (raw.trim() === '') {
      setCustomCreditsInput('');
      setCustomFeedback(null);
      return;
    }

    const cleaned = raw.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setCustomCreditsInput('');
      setCustomFeedback(null);
      return;
    }

    const num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      setCustomCreditsInput('');
      setCustomFeedback(null);
      return;
    }

    if (num < 5) {
      setCustomCreditsInput('5');
      setLastValidCredits(5);
      setCustomFeedback('Minimum 5 crédits');
    } else if (num > 500) {
      setCustomCreditsInput('500');
      setLastValidCredits(500);
      setCustomFeedback('Maximum 500 crédits');
    } else {
      setCustomCreditsInput(String(num));
      setLastValidCredits(num);
      setCustomFeedback(null);
    }
  };

  const handleCustomInputBlur = () => {
    if (customCreditsInput.trim() === '') {
      setCustomCreditsInput(String(lastValidCredits));
      setCustomFeedback(null);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    triggerCalcMascot();
    setCustomCreditsInput(String(val));
    setLastValidCredits(val);
    setCustomFeedback(null);
  };

  const handleQuickAdd = (add: number) => {
    triggerCalcMascot();
    const curr = customCreditsInput.trim() !== '' ? parseInt(customCreditsInput, 10) : lastValidCredits;
    const nextVal = Math.min(500, Math.max(5, (isNaN(curr) ? 5 : curr) + add));
    setCustomCreditsInput(String(nextVal));
    setLastValidCredits(nextVal);
    setCustomFeedback(null);
  };

  const handleResetToFive = () => {
    triggerCalcMascot();
    setCustomCreditsInput('5');
    setLastValidCredits(5);
    setCustomFeedback(null);
  };

  const currentCredits = customCreditsInput.trim() === '' ? 0 : parseInt(customCreditsInput, 10) || 0;
  const totalPrix = currentCredits >= 5 ? prixPersonnalise(currentCredits) : 0;
  const prixUnitaire = currentCredits >= 5 ? totalPrix / currentCredits : 0;
  const formattedPrixUnitaire =
    prixUnitaire > 0
      ? prixUnitaire.toLocaleString('fr-FR', {
          minimumFractionDigits: prixUnitaire % 1 === 0 ? 0 : 1,
          maximumFractionDigits: 1
        })
      : '0';

  const currentYear = new Date().getFullYear();

  return (
    <div
      ref={rootRef}
      className="landing-dark min-h-full w-full font-sans overflow-x-hidden selection:bg-[#3B82F6] selection:text-white"
      style={{
        ['--bg' as any]: '#0B1220',
        ['--surface' as any]: '#131C2E',
        ['--surface-2' as any]: '#1B2740',
        ['--border' as any]: '#2A3A57',
        ['--text' as any]: '#F8FAFC',
        ['--muted' as any]: '#CBD5E1',
        ['--blue' as any]: '#3B82F6',
        ['--blue-strong' as any]: '#2563EB',
        ['--sun' as any]: '#FFB020',
        colorScheme: 'dark',
        backgroundColor: '#0B1220',
        color: '#F8FAFC'
      }}
    >
      {/* =====================================================================
          BARRE DE PROGRESSION DE LECTURE (3px BLEU FIXÉE TOUT EN HAUT)
          ===================================================================== */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] bg-transparent z-50 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-[var(--blue)] transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* =====================================================================
          1. EN-TÊTE COLLANT (TRANSPARENT -> FOND --bg 90% APRÈS DÉFILEMENT)
          ===================================================================== */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-[#0B1220]/90 backdrop-blur-md border-b border-[var(--border)] shadow-[0_4px_20px_rgba(59,130,246,0.08)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1 : Wordmark / Logo Visorax Studio en mode sombre */}
          <a
            href="#top"
            onClick={(e) => scrollToSection(e, 'top')}
            className="flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] rounded-xl py-1 px-1.5 shrink-0"
            aria-label={`${CONFIG.NOM} - Accueil`}
          >
            <VisoraxLogo variant="ligne" size={34} theme="sombre" decorative={true} />
          </a>

          {/* Zone 2 : Liens d'ancrage textuels sur une seule ligne (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--muted)]">
            <a
              href="#fonctionnalites"
              onClick={(e) => scrollToSection(e, 'fonctionnalites')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Fonctionnalités
            </a>
            <a
              href="#demo"
              onClick={(e) => scrollToSection(e, 'demo')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Démo
            </a>
            <a
              href="#tarifs"
              onClick={(e) => scrollToSection(e, 'tarifs')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Questions
            </a>
          </nav>

          {/* Zone 3 : Actions principales */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSignIn}
              className="hidden sm:inline-flex px-3.5 py-2 min-h-[44px] items-center text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] rounded-xl"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={onOpenSignUp}
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[var(--blue-strong)] text-white hover:bg-[#1D4ED8] transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-[0_2px_10px_rgba(37,99,235,0.35)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
            >
              Commencer
            </button>

            {/* Menu burger mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[var(--text)]" /> : <Menu className="w-5 h-5 text-[var(--text)]" />}
            </button>
          </div>
        </div>

        {/* Menu mobile déroulant en fond --bg (#0B1220) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[#0B1220] px-5 py-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            <a
              href="#fonctionnalites"
              onClick={(e) => scrollToSection(e, 'fonctionnalites')}
              className="px-3 py-3 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Fonctionnalités
            </a>
            <a
              href="#demo"
              onClick={(e) => scrollToSection(e, 'demo')}
              className="px-3 py-3 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Démo
            </a>
            <a
              href="#tarifs"
              onClick={(e) => scrollToSection(e, 'tarifs')}
              className="px-3 py-3 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="px-3 py-3 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Questions
            </a>
            <div className="pt-3 mt-1 border-t border-[var(--border)] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onOpenSignIn}
                className="w-full py-3 min-h-[44px] rounded-xl text-sm font-semibold text-[var(--text)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[#2A3A57] transition"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={onOpenSignUp}
                className="w-full py-3 min-h-[44px] rounded-xl text-sm font-bold bg-[var(--blue-strong)] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#1D4ED8] transition"
              >
                Créer un compte
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Point d'ancrage haut de page */}
      <div id="top" />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ===================================================================
            2. SECTION HÉROS
            =================================================================== */}
        <section className="pt-8 sm:pt-14 lg:pt-16 pb-12 sm:pb-16 lg:pb-20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-14">
          <div className="flex-1 max-w-2xl flex flex-col items-start text-left">
            {/* Slogan officiel en titre H1 avec clamp fluide */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--text)] leading-[1.12] text-balance font-title">
              Crée, convertis, partage.
            </h1>

            {/* Sous-titre lisible en --muted (#CBD5E1) */}
            <p className="mt-5 text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-xl">
              Importe ton modèle, remplis le formulaire et télécharge un résultat propre en quelques secondes. Documents, affiches, images, voix et musique, au même endroit.
            </p>

            {/* Boutons d'action du Héros */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenSignUp}
                className="px-7 py-3.5 min-h-[48px] rounded-2xl bg-[var(--blue-strong)] text-white font-bold text-base hover:bg-[#1D4ED8] transition active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
              <a
                href="#demo"
                onClick={(e) => scrollToSection(e, 'demo')}
                className="px-6 py-3.5 min-h-[48px] rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-semibold text-base hover:bg-[var(--surface-2)] transition active:scale-95 text-center flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                Voir la démo
              </a>
            </div>

            {/* Ligne de réassurance sans capsules pill (texte libre avec séparateurs ·) */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-[var(--muted)]">
              <span>Paiement Mobile Money</span>
              <span aria-hidden="true" className="text-[var(--border)]">·</span>
              <span>Sans abonnement</span>
              <span aria-hidden="true" className="text-[var(--border)]">·</span>
              <span>Installable sur ton téléphone</span>
            </div>
          </div>

          {/* Illustration Héros : Grande mascotte flottante + 3 micro-cartes sur fond sombre */}
          <div className="w-full lg:w-[460px] shrink-0 mx-auto lg:mx-0 flex flex-col items-center justify-center relative">
            <div className="relative w-full max-w-sm aspect-4/3 sm:aspect-square bg-gradient-to-b from-[var(--surface)] to-[var(--surface-2)] rounded-3xl border border-[var(--border)] p-6 flex items-center justify-center shadow-[0_4px_24px_rgba(59,130,246,0.12)] overflow-visible">
              
              {/* Mascotte centrale bleue */}
              <div className="transform hover:scale-105 transition-transform duration-300">
                <VisoraxMascot size={150} mood="content" decorative={true} />
              </div>

              {/* Micro-carte 1 : CV prêt */}
              <div className="absolute top-4 -left-3 sm:-left-6 bg-[var(--surface)]/95 backdrop-blur-xs border border-[var(--border)] rounded-xl px-3.5 py-2 shadow-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[var(--text)]">CV prêt</p>
                  <p className="text-[10px] text-[var(--muted)]">Export Word & PDF</p>
                </div>
                <Check className="w-3.5 h-3.5 text-emerald-400 ml-1" />
              </div>

              {/* Micro-carte 2 : Affiche A4 */}
              <div className="absolute bottom-5 -right-3 sm:-right-6 bg-[var(--surface)]/95 backdrop-blur-xs border border-[var(--border)] rounded-xl px-3.5 py-2 shadow-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-400">
                <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--sun)] flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[var(--text)]">Affiche A4</p>
                  <p className="text-[10px] text-[var(--muted)]">QR code inclus</p>
                </div>
              </div>

              {/* Micro-carte 3 : Voix studio claire */}
              <div className="absolute -bottom-3 left-6 sm:left-8 bg-[var(--surface)]/95 backdrop-blur-xs border border-[var(--border)] rounded-xl px-3.5 py-1.5 shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-6 h-6 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center">
                  <Mic className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-bold text-[var(--text)]">Voix studio claire</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            3. SECTION « TOUT CE QUE TU PEUX FAIRE » (6 CARTES LISIBLES)
            =================================================================== */}
        <section
          id="fonctionnalites"
          className="py-14 sm:py-20 border-t border-[var(--border)] scroll-mt-20 reveal-on-scroll"
        >
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight font-title">
              Tout ce que tu peux faire
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Six puissants modules intégrés au même endroit pour simplifier ton quotidien professionnel et créatif.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Carte 1 : Documents */}
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-2)] transition-all flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text)] font-title">Documents</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Convertis et formate tes fichiers : Word, PDF, tableaux, formulaires prêts à imprimer en toute netteté.
              </p>
            </div>

            {/* Carte 2 : Modèles perso */}
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-2)] transition-all flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text)] font-title">Modèles perso</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Importe tes modèles de documents, remplis les champs en quelques clics et génère des versions personnalisées sans effort.
              </p>
            </div>

            {/* Carte 3 : Affiches */}
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-2)] transition-all flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text)] font-title">Affiches</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Crée des affiches percutantes au format A4 (portrait ou paysage) avec QR code interactif prêt à être scanné.
              </p>
            </div>

            {/* Carte 4 : Images */}
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-2)] transition-all flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text)] font-title">Images</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Décris ce que tu souhaites voir, Visorax génère une illustration nette et adaptée à tes supports de communication.
              </p>
            </div>

            {/* Carte 5 : Voix */}
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-2)] transition-all flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text)] font-title">Voix</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Transforme n&apos;importe quel texte en voix humaine fluide et expressive, idéale pour tes vidéos et podcasts.
              </p>
            </div>

            {/* Carte 6 : Musique */}
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[var(--blue)]/60 hover:bg-[var(--surface-2)] transition-all flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--blue)] flex items-center justify-center shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[var(--text)] font-title">Musique</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Compose des mélodies ou morceaux complets avec paroles ou instrumentales, livrés en deux versions à chaque essai.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            4. SECTION « COMMENT ÇA MARCHE » (3 ÉTAPES)
            =================================================================== */}
        <section className="py-14 sm:py-20 border-t border-[var(--border)] reveal-on-scroll">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight font-title">
              Comment ça marche
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Trois étapes simples et fluides. Pas de manipulations complexes.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ligne de connexion desktop */}
            <div
              className="hidden md:block absolute top-10 left-[16%] right-[16%] h-[2px] bg-[var(--border)] z-0"
              aria-hidden="true"
            >
              <div className="h-full bg-[var(--blue)] w-2/3" />
            </div>

            {/* Étape 1 */}
            <div className="relative z-10 bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)] flex flex-col items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[var(--blue-strong)] text-white font-bold text-base flex items-center justify-center shadow-md">
                1
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Importe ou choisis un modèle
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Sélectionne un format prêt à l&apos;emploi ou téléverse ton propre document directement depuis ton téléphone.
                </p>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="relative z-10 bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)] flex flex-col items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[var(--blue-strong)] text-white font-bold text-base flex items-center justify-center shadow-md">
                2
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Remplis le formulaire
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Remplis les champs indiqués. Le prix exact en crédits s&apos;affiche toujours clairement avant de valider.
                </p>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="relative z-10 bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)] flex flex-col items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[var(--blue-strong)] text-white font-bold text-base flex items-center justify-center shadow-md">
                3
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Télécharge en PDF, Word ou image
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                  Téléchargement instantané sur ton appareil, directement exploitable, sans filigrane ni compression dégradée.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. GALERIE DÉMO INTERACTIVE (6 ONGLETS + CADRE EN --surface)
            =================================================================== */}
        <section
          id="demo"
          ref={demoSectionRef}
          className="py-14 sm:py-20 border-t border-[var(--border)] scroll-mt-20 reveal-on-scroll"
        >
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight font-title">
              Découvre l&apos;application en action
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Explore chaque outil directement. Clique sur les onglets pour tester les différentes fonctionnalités.
            </p>
          </div>

          {/* Onglets interactifs en mode sombre */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 px-1 no-scrollbar justify-start sm:justify-center">
            {SCREENS_DEMO.map((screen, idx) => {
              const isSelected = activeDemoIndex === idx;
              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => {
                    setActiveDemoIndex(idx);
                    pauseAutoPlayTemporarily();
                  }}
                  className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] ${
                    isSelected
                      ? 'bg-[var(--blue-strong)] text-white shadow-md'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {screen.titre}
                </button>
              );
            })}
          </div>

          {/* Cadre de simulation interactif (fond --surface, bordure --border) */}
          <div className="mt-6 max-w-4xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 sm:p-8 shadow-[0_4px_24px_rgba(59,130,246,0.08)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-[var(--text)] font-title">
                  {SCREENS_DEMO[activeDemoIndex].titre}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
                  {SCREENS_DEMO[activeDemoIndex].legende}
                </p>
              </div>
              <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                <span>Défilement auto</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </div>

            {/* Zone de contenu de la démo */}
            <div className="pt-6 min-h-[320px] flex items-center justify-center">
              {/* TAB 1: CONVERSION DE DOCUMENT */}
              {activeDemoIndex === 0 && (
                <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/60 text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text)]">Rapport_Activite_2026.pdf</p>
                        <p className="text-xs text-[var(--muted)]">2,4 Mo · 14 pages · Tableaux & graphiques</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Prêt
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[var(--text)]">Conversion vers Word (.docx)</span>
                      <span className="text-[var(--blue)] font-bold">100% terminé</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0B1220] overflow-hidden">
                      <div className="h-full bg-[var(--blue)] w-full rounded-full" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Mise en page, polices et cellules de tableaux conservées fidèlement.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => pauseAutoPlayTemporarily()}
                      className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-[var(--blue-strong)] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span>Télécharger Rapport_Activite_2026.docx</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: MODÈLE PERSO */}
              {activeDemoIndex === 1 && (
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-3">
                    <p className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">Formulaire en direct</p>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text)] block mb-1">Nom complet</label>
                      <input
                        type="text"
                        value={demoCvName}
                        onChange={(e) => {
                          setDemoCvName(e.target.value);
                          pauseAutoPlayTemporarily();
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text)] block mb-1">Poste visé</label>
                      <input
                        type="text"
                        value={demoCvRole}
                        onChange={(e) => {
                          setDemoCvRole(e.target.value);
                          pauseAutoPlayTemporarily();
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--muted)] mt-auto pt-2">
                      Modifie les champs ci-dessus : l&apos;aperçu à droite se met à jour instantanément.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="border-b border-[var(--border)] pb-3 mb-3">
                        <h4 className="font-bold text-base text-[var(--text)] font-title">{demoCvName || 'Nom Prénom'}</h4>
                        <p className="text-xs text-[var(--blue)] font-semibold">{demoCvRole || 'Poste visé'}</p>
                      </div>
                      <div className="space-y-2 text-[11px] text-[var(--muted)]">
                        <p className="font-semibold text-[var(--text)]">Expérience récente</p>
                        <p>Coordination des campagnes de lancement et gestion d&apos;équipes multidisciplinaires.</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)]">Modèle : Professionnel Moderne</span>
                      <span className="font-bold text-[var(--blue)]">Aperçu conforme</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AFFICHE A4 */}
              {activeDemoIndex === 2 && (
                <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 p-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setDemoPosterOrientation('portrait');
                        pauseAutoPlayTemporarily();
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        demoPosterOrientation === 'portrait' ? 'bg-[var(--blue-strong)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Portrait A4
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoPosterOrientation('paysage');
                        pauseAutoPlayTemporarily();
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        demoPosterOrientation === 'paysage' ? 'bg-[var(--blue-strong)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Paysage A4
                    </button>
                  </div>

                  <div
                    className={`bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-6 rounded-2xl border border-[var(--border)] shadow-md flex flex-col justify-between transition-all duration-300 ${
                      demoPosterOrientation === 'portrait'
                        ? 'w-64 h-80'
                        : 'w-80 h-64'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--sun)]">Événement Spécial</p>
                      <h4 className="text-base sm:text-lg font-black mt-1 leading-tight text-balance text-white font-title">
                        Soirée Musicale & Créative
                      </h4>
                      <p className="text-xs text-[#CBD5E1] mt-1">Samedi 18 Avril · 19h00</p>
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-slate-700/60">
                      <div>
                        <p className="text-[10px] text-slate-400">Entrée libre</p>
                        <p className="text-xs font-semibold text-white">Lomé, Centre Culturel</p>
                      </div>
                      <div className="w-12 h-12 bg-white p-1 rounded-lg flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-[#0F172A]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: IMAGES IA */}
              {activeDemoIndex === 3 && (
                <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
                  <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--muted)] shrink-0">Prompt :</span>
                    <p className="text-xs text-[var(--text)] font-medium truncate">
                      « Un lion majestueux au coucher du soleil dans la savane, style peinture moderne »
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="aspect-square rounded-2xl bg-gradient-to-tr from-amber-700 via-orange-600 to-amber-300 p-3 flex flex-col justify-between text-white shadow-sm border border-amber-500/30">
                      <span className="text-[10px] font-bold opacity-90">Style 1</span>
                      <p className="text-xs font-bold leading-tight">Huile sur toile</p>
                    </div>
                    <div className="aspect-square rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-300 p-3 flex flex-col justify-between text-white shadow-sm border border-blue-500/30">
                      <span className="text-[10px] font-bold opacity-90">Style 2</span>
                      <p className="text-xs font-bold leading-tight">Digital Art</p>
                    </div>
                    <div className="aspect-square rounded-2xl bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-300 p-3 flex flex-col justify-between text-white shadow-sm border border-emerald-500/30">
                      <span className="text-[10px] font-bold opacity-90">Style 3</span>
                      <p className="text-xs font-bold leading-tight">Aquarelle</p>
                    </div>
                    <div className="aspect-square rounded-2xl bg-gradient-to-tr from-purple-800 via-fuchsia-600 to-pink-300 p-3 flex flex-col justify-between text-white shadow-sm border border-purple-500/30">
                      <span className="text-[10px] font-bold opacity-90">Style 4</span>
                      <p className="text-xs font-bold leading-tight">Cinématique</p>
                    </div>
                  </div>

                  <p className="text-center text-xs text-[var(--muted)]">
                    Génération haute définition en quelques secondes, prête à intégrer dans tes documents.
                  </p>
                </div>
              )}

              {/* TAB 5: VOIX STUDIO */}
              {activeDemoIndex === 4 && (
                <div className="w-full max-w-lg mx-auto p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-4">
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--muted)]">Texte source :</p>
                    <p className="mt-1 text-xs sm:text-sm text-[var(--text)] italic leading-relaxed">
                      « Bienvenue sur Visorax Studio. Générez vos documents, audios et visuels sans abonnement en toute liberté. »
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDemoVoicePlaying(!demoVoicePlaying);
                        pauseAutoPlayTemporarily();
                      }}
                      className="w-11 h-11 rounded-xl bg-[var(--blue-strong)] text-white flex items-center justify-center shrink-0 hover:bg-[#1D4ED8] transition cursor-pointer shadow-md"
                      aria-label={demoVoicePlaying ? 'Mettre en pause' : 'Écouter'}
                    >
                      {demoVoicePlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 ml-0.5 text-white" />}
                    </button>

                    <div className="flex-1 flex items-center gap-1.5 h-8">
                      {[40, 65, 30, 85, 95, 50, 70, 45, 90, 60, 35, 75, 55, 90, 30, 80].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-full transition-all duration-200"
                          style={{
                            height: demoVoicePlaying ? `${Math.max(20, (h * (1 + (i % 3) * 0.2)) % 100)}%` : `${h}%`,
                            backgroundColor: demoVoicePlaying ? '#3B82F6' : '#2A3A57'
                          }}
                        />
                      ))}
                    </div>

                    <span className="text-xs font-mono text-[var(--muted)] shrink-0">
                      0:{demoVoiceTime < 10 ? `0${demoVoiceTime}` : demoVoiceTime} / 0:28
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Voix : Amara (chaleureuse et posée)</span>
                    <span>Qualité Studio 48 kHz</span>
                  </div>
                </div>
              )}

              {/* TAB 6: MUSIQUE */}
              {activeDemoIndex === 5 && (
                <div className="w-full max-w-lg mx-auto p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[var(--muted)]">Ambiance demandée :</p>
                      <p className="text-sm font-bold text-[var(--text)]">Afrobeat joyeux & rythmé, 120 BPM</p>
                    </div>
                    <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setDemoMusicVersion(1);
                          pauseAutoPlayTemporarily();
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                          demoMusicVersion === 1 ? 'bg-[var(--blue-strong)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        Version A
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDemoMusicVersion(2);
                          pauseAutoPlayTemporarily();
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                          demoMusicVersion === 2 ? 'bg-[var(--blue-strong)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        Version B
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDemoMusicPlaying(!demoMusicPlaying);
                        pauseAutoPlayTemporarily();
                      }}
                      className="w-11 h-11 rounded-xl bg-[var(--blue-strong)] text-white flex items-center justify-center shrink-0 hover:bg-[#1D4ED8] transition cursor-pointer shadow-md"
                      aria-label={demoMusicPlaying ? 'Mettre en pause' : 'Écouter'}
                    >
                      {demoMusicPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 ml-0.5 text-white" />}
                    </button>

                    <div className="flex-1 flex items-center gap-1.5 h-8">
                      {[30, 80, 50, 90, 70, 40, 95, 60, 85, 45, 75, 90, 60, 80, 50, 95].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-full transition-all duration-200"
                          style={{
                            height: demoMusicPlaying ? `${Math.max(25, (h * 1.2) % 100)}%` : `${h}%`,
                            backgroundColor: demoMusicPlaying ? '#FFB020' : '#2A3A57'
                          }}
                        />
                      ))}
                    </div>

                    <span className="text-xs font-mono text-[var(--muted)] shrink-0">
                      Version {demoMusicVersion === 1 ? 'A (Plein rythme)' : 'B (Acoustique)'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted)] text-center">
                    Chaque génération fournit 2 interprétations complètes pour choisir la meilleure ambiance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================================
            6. SECTION SOMBRE « POURQUOI VISORAX » (FOND --surface #131C2E)
            =================================================================== */}
        <section className="my-14 sm:my-20 -mx-4 sm:-mx-6 lg:-mx-8 px-6 sm:px-10 lg:px-16 py-16 sm:py-24 bg-[var(--surface)] border border-[var(--border)] rounded-3xl reveal-on-scroll shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--text)] font-title">
              Pourquoi Visorax Studio ?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Quatre engagements concrets pour créer librement et sans contraintes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Avantage 1 : Mobile & PWA */}
            <div className="p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-4 shadow-sm">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--blue)] shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Pensé pour ton téléphone
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  Fonctionne instantanément dans ton navigateur ou s&apos;installe sur ton écran d&apos;accueil comme une application normale.
                </p>
              </div>
            </div>

            {/* Avantage 2 : Crédits à l'usage */}
            <div className="p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-4 shadow-sm">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--blue)] shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Des crédits, aucun abonnement
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  Tu paies seulement ce que tu consommes. Tes crédits restent acquis et n&apos;expirent jamais.
                </p>
              </div>
            </div>

            {/* Avantage 3 : Données privées */}
            <div className="p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-4 shadow-sm">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--blue)] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Données et fichiers strictement privés
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  Chaque compte dispose de son propre espace étanche. Personne d&apos;autre n&apos;accède à tes créations.
                </p>
              </div>
            </div>

            {/* Avantage 4 : Téléchargements propres */}
            <div className="p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-start gap-4 shadow-sm">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--blue)] shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] font-title">
                  Téléchargements nets et directs
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  Fichiers vectoriels, vrais documents Word (.docx) modifiables et images haute définition prêts pour l&apos;impression.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            7. SECTION TARIFS (CALCULATEUR DYNAMIQUE EN MODE SOMBRE)
            =================================================================== */}
        <section
          id="tarifs"
          className="py-14 sm:py-20 border-t border-[var(--border)] scroll-mt-20 reveal-on-scroll"
        >
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight font-title">
              Des crédits, pas d&apos;abonnement
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Recharge uniquement ce dont tu as besoin par Mobile Money. Le tarif s&apos;ajuste automatiquement.
            </p>
          </div>

          {/* Module Calculateur de Crédits */}
          <div className="max-w-3xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-9 shadow-[0_4px_24px_rgba(59,130,246,0.08)]">
            <div className="text-center sm:text-left mb-6">
              <h3 className="font-bold text-lg text-[var(--text)] font-title">
                Calculateur de montant personnalisé
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
                Choisis le volume de crédits qui te convient, de 5 à 500 crédits.
              </p>
            </div>

            {/* Contrôles synchronisés : Curseur + Saisie numérique */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--surface-2)] p-4 sm:p-5 rounded-2xl border border-[var(--border)]">
                <div className="w-full sm:flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="custom-slider" className="text-xs font-bold text-[var(--muted)]">
                      Ajuste avec le curseur (5 à 500)
                    </label>
                    <span className="text-xs font-bold text-[var(--blue)]">
                      {currentCredits} crédits
                    </span>
                  </div>
                  <input
                    id="custom-slider"
                    type="range"
                    min={5}
                    max={500}
                    step={1}
                    value={currentCredits || 5}
                    onChange={handleSliderChange}
                    className="w-full h-3 rounded-lg bg-[var(--border)] accent-[var(--blue)] cursor-pointer"
                    aria-label="Curseur du nombre de crédits"
                  />
                </div>

                <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor="custom-input" className="text-xs font-semibold text-[var(--muted)]">
                      Crédits :
                    </label>
                    <input
                      id="custom-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={customCreditsInput}
                      onChange={handleCustomInputChange}
                      onBlur={handleCustomInputBlur}
                      className="w-24 text-center font-black text-lg py-2 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                      aria-label="Nombre de crédits saisi"
                    />
                  </div>
                  {customFeedback && (
                    <span className="text-[11px] font-bold text-[var(--blue)] animate-in fade-in duration-150">
                      {customFeedback}
                    </span>
                  )}
                </div>
              </div>

              {/* Boutons d'ajustement rapide */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-semibold text-[var(--muted)] mr-1">
                  Ajout rapide :
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(10)}
                  className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:bg-[#2A3A57] transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(50)}
                  className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:bg-[#2A3A57] transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(100)}
                  className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:bg-[#2A3A57] transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={handleResetToFive}
                  className="px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition active:scale-95 cursor-pointer ml-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                >
                  Remettre à 5
                </button>
              </div>

              {/* Affichage du prix en grand en typographie Sora */}
              <div
                aria-live="polite"
                className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[var(--surface-2)] to-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="shrink-0">
                    <VisoraxMascot size={52} mood={calcMascotMood} decorative={true} />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight font-title">
                      {currentCredits < 5 ? (
                        <span>0 FCFA</span>
                      ) : (
                        <span>
                          {currentCredits} crédits = {totalPrix.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-[var(--muted)] mt-1">
                      {currentCredits < 5 ? (
                        <span>Saisis au moins 5 crédits</span>
                      ) : (
                        <span>soit {formattedPrixUnitaire} FCFA par crédit</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Badge explicatif dynamique */}
                <div className="text-center sm:text-right shrink-0">
                  <span className="inline-block px-3.5 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold text-[var(--blue)] shadow-sm">
                    Plus tu prends de crédits, moins le crédit coûte cher
                  </span>
                </div>
              </div>

              {/* 3 Exemples d'usages concrets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                  <p className="font-bold text-xs text-[var(--text)] font-title">Documents & formulaires</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                    Conversions de rapports, lettres officielles et exports Word/PDF propres.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                  <p className="font-bold text-xs text-[var(--text)] font-title">Affiches & visuels</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                    Création d&apos;affiches A4 prêtes à imprimer avec QR codes et visuels IA.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-left">
                  <p className="font-bold text-xs text-[var(--text)] font-title">Voix & musique</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                    Générations de voix studio pour vidéos et composition de mélodies.
                  </p>
                </div>
              </div>

              {/* Rassurance : prix affiché avant chaque création */}
              <p className="text-center text-xs text-[var(--muted)]">
                Le prix exact s&apos;affiche toujours dans l&apos;application avant de valider une création.
              </p>

              {/* Bouton d'action */}
              <button
                type="button"
                onClick={onOpenSignUp}
                className="w-full py-3.5 min-h-[48px] rounded-2xl bg-[var(--blue-strong)] text-white font-bold text-sm sm:text-base hover:bg-[#1D4ED8] shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                <span>Commencer avec {currentCredits >= 5 ? `${currentCredits} crédits` : 'Visorax'}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </section>

        {/* ===================================================================
            8. FOIRE AUX QUESTIONS (ACCORDÉON ACCESSIBLE)
            =================================================================== */}
        <section
          id="faq"
          className="py-14 sm:py-20 border-t border-[var(--border)] scroll-mt-20 reveal-on-scroll"
        >
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight font-title">
              Questions fréquentes
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Tout ce qu&apos;il faut savoir pour démarrer sereinement.
            </p>
          </div>

          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {/* Question 1 : Paiement */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
              <button
                type="button"
                id="faq-btn-0"
                aria-controls="faq-ans-0"
                aria-expanded={openFaqIndex === 0}
                onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
                className="w-full p-5 min-h-[48px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--text)] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] hover:bg-[var(--surface-2)] transition"
              >
                <span>Comment payer mes crédits ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 text-[var(--blue)] ${
                    openFaqIndex === 0 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 0 && (
                <div
                  id="faq-ans-0"
                  role="region"
                  aria-labelledby="faq-btn-0"
                  className="px-5 pb-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3 animate-in fade-in duration-150"
                >
                  Le paiement s&apos;effectue en toute sécurité par Mobile Money (T-Money, Moov Flooz, Wave, Orange Money, MTN, etc.) via SasPay, dès 5 crédits. Tu n&apos;as pas besoin de carte bancaire, tout est géré instantanément sur la page sécurisée.
                </div>
              )}
            </div>

            {/* Question 2 : Confidentialité */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
              <button
                type="button"
                id="faq-btn-1"
                aria-controls="faq-ans-1"
                aria-expanded={openFaqIndex === 1}
                onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
                className="w-full p-5 min-h-[48px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--text)] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] hover:bg-[var(--surface-2)] transition"
              >
                <span>Mes fichiers et données sont-ils privés ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 text-[var(--blue)] ${
                    openFaqIndex === 1 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 1 && (
                <div
                  id="faq-ans-1"
                  role="region"
                  aria-labelledby="faq-btn-1"
                  className="px-5 pb-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3 animate-in fade-in duration-150"
                >
                  Oui, absolument. Ton espace est strictement personnel. Tes documents, modèles, textes et créations ne sont jamais visibles par d&apos;autres utilisateurs ni partagés avec des tiers.
                </div>
              )}
            </div>

            {/* Question 3 : Installation sur téléphone */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
              <button
                type="button"
                id="faq-btn-2"
                aria-controls="faq-ans-2"
                aria-expanded={openFaqIndex === 2}
                onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
                className="w-full p-5 min-h-[48px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--text)] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] hover:bg-[var(--surface-2)] transition"
              >
                <span>Puis-je installer Visorax sur mon téléphone ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 text-[var(--blue)] ${
                    openFaqIndex === 2 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 2 && (
                <div
                  id="faq-ans-2"
                  role="region"
                  aria-labelledby="faq-btn-2"
                  className="px-5 pb-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3 animate-in fade-in duration-150"
                >
                  Oui ! Visorax Studio est une Progressive Web App (PWA). Tu peux l&apos;installer en un clic sur Android via Chrome et sur iPhone via Safari (« Sur l&apos;écran d&apos;accueil ») pour l&apos;ouvrir comme une application native rapide et fluide.
                </div>
              )}
            </div>

            {/* Question 4 : Support */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
              <button
                type="button"
                id="faq-btn-3"
                aria-controls="faq-ans-3"
                aria-expanded={openFaqIndex === 3}
                onClick={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}
                className="w-full p-5 min-h-[48px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--text)] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] hover:bg-[var(--surface-2)] transition"
              >
                <span>Que faire si j&apos;ai une question ou besoin d&apos;aide ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 text-[var(--blue)] ${
                    openFaqIndex === 3 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 3 && (
                <div
                  id="faq-ans-3"
                  role="region"
                  aria-labelledby="faq-btn-3"
                  className="px-5 pb-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3 animate-in fade-in duration-150"
                >
                  Notre équipe de support est directement disponible sur WhatsApp au +228 92 55 64 62. Tu reçois une réponse humaine et un accompagnement bienveillant pour toutes tes créations.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================================
            9. SECTION APPEL FINAL (FOND BLEU, BOUTON JAUNE --sun, TEXTE #0F172A)
            =================================================================== */}
        <section className="my-14 sm:my-20 -mx-4 sm:-mx-6 lg:-mx-8 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 bg-gradient-to-br from-[#1E40AF] via-[#1D4ED8] to-[#1E3A8A] text-white border border-[#3B82F6]/30 rounded-3xl text-center reveal-on-scroll shadow-[0_8px_32px_rgba(37,99,235,0.25)]">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            {/* Mascotte souriante */}
            <VisoraxMascot size={130} mood="content" inverse={true} decorative={true} />

            <h2 className="mt-6 text-2xl sm:text-4xl font-black text-white tracking-tight font-title">
              Prêt à créer ?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-lg leading-relaxed">
              Crée ton compte en quelques secondes et commence à transformer tes idées en réalisations concrètes.
            </p>

            <button
              type="button"
              onClick={onOpenSignUp}
              className="mt-8 px-8 py-4 min-h-[48px] rounded-2xl bg-[var(--sun)] text-[#0F172A] font-bold text-base hover:bg-[#ffbe3b] shadow-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Commencer gratuitement</span>
              <ArrowRight className="w-5 h-5 text-[#0F172A]" />
            </button>
          </div>
        </section>
      </main>

      {/* =====================================================================
          10. PIED DE PAGE COMPLET EN MODE SOMBRE
          ===================================================================== */}
      <footer className="w-full bg-[#0B1220] border-t border-[var(--border)] mt-12 py-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-8 text-center">
          {/* Logo Visorax Studio */}
          <a
            href="#top"
            onClick={(e) => scrollToSection(e, 'top')}
            className="flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)] rounded-xl py-1 px-2"
          >
            <VisoraxLogo variant="ligne" size={32} theme="sombre" decorative={true} />
          </a>

          {/* Liens d'ancrage du pied de page */}
          <nav className="flex flex-wrap justify-center gap-6 text-xs sm:text-sm font-semibold text-[var(--muted)]">
            <a
              href="#fonctionnalites"
              onClick={(e) => scrollToSection(e, 'fonctionnalites')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#demo"
              onClick={(e) => scrollToSection(e, 'demo')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors"
            >
              Démo
            </a>
            <a
              href="#tarifs"
              onClick={(e) => scrollToSection(e, 'tarifs')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors"
            >
              Questions
            </a>
          </nav>

          {/* Liens légaux */}
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-[var(--muted)]">
            <button
              type="button"
              onClick={() => setLegalModal('mentions')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors cursor-pointer min-h-[44px] flex items-center px-2"
            >
              Mentions légales
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('confidentialite')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors cursor-pointer min-h-[44px] flex items-center px-2"
            >
              Politique de confidentialité
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('cgu')}
              className="hover:text-[var(--text)] hover:underline underline-offset-4 transition-colors cursor-pointer min-h-[44px] flex items-center px-2"
            >
              Conditions Générales
            </button>
          </div>

          {/* Contact WhatsApp */}
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <a
              href={CONFIG.WHATSAPP_LIEN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[var(--text)] transition-colors px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Support WhatsApp : +228 92 55 64 62</span>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-[#64748B]">
            © {currentYear} {CONFIG.NOM}. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* =====================================================================
          MODALES JURIDIQUES EN MODE SOMBRE
          ===================================================================== */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 id="modal-title" className="text-base sm:text-lg font-bold text-[var(--text)] font-title">
                {legalModal === 'mentions' && 'Mentions légales'}
                {legalModal === 'confidentialite' && 'Politique de confidentialité'}
                {legalModal === 'cgu' && "Conditions Générales d'Utilisation"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-[var(--text)]" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto text-xs sm:text-sm text-[var(--muted)] leading-relaxed space-y-3">
              {legalModal === 'mentions' && (
                <>
                  <p className="font-semibold text-[var(--text)]">1. Éditeur du service</p>
                  <p>Le service {CONFIG.NOM} est édité par l&apos;équipe Visorax Studio.</p>
                  <p className="font-semibold text-[var(--text)]">2. Contact support</p>
                  <p>Support direct joignable sur WhatsApp au +228 92 55 64 62.</p>
                  <p className="font-semibold text-[var(--text)]">3. Hébergement</p>
                  <p>L&apos;application est déployée sur une infrastructure cloud sécurisée et redondée.</p>
                </>
              )}

              {legalModal === 'confidentialite' && (
                <>
                  <p className="font-semibold text-[var(--text)]">1. Données personnelles</p>
                  <p>Seule ton adresse email est requise pour créer et gérer ton espace privé.</p>
                  <p className="font-semibold text-[var(--text)]">2. Confidentialité des fichiers</p>
                  <p>Tous tes documents, modèles, visuels et voix sont strictement privés. Ils ne sont ni partagés, ni revendus, ni utilisés pour entraîner des modèles publics.</p>
                  <p className="font-semibold text-[var(--text)]">3. Droit de suppression</p>
                  <p>Tu peux demander la suppression définitive de ton compte et de toutes tes données à tout moment via notre support WhatsApp.</p>
                </>
              )}

              {legalModal === 'cgu' && (
                <>
                  <p className="font-semibold text-[var(--text)]">1. Objet</p>
                  <p>Les présentes conditions définissent les règles d&apos;utilisation de la plateforme {CONFIG.NOM}.</p>
                  <p className="font-semibold text-[var(--text)]">2. Système de crédits</p>
                  <p>Les crédits s&apos;achètent par Mobile Money sans abonnement. Ils sont consommés à chaque création selon le barème affiché avant validation.</p>
                  <p className="font-semibold text-[var(--text)]">3. Garantie technique</p>
                  <p>En cas d&apos;échec avéré lors d&apos;une tentative de génération, les crédits correspondants sont automatiquement remis sur ton solde.</p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[var(--blue-strong)] text-white font-bold text-xs sm:text-sm hover:bg-[#1D4ED8] transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
