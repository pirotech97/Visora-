import React, { useState, useEffect, useRef } from 'react';
import { VisoraxMascot, type VisoraxMood as VisoraMood } from './VisoraxMascot';
import { VisoraxLogo } from './VisoraxLogo';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Music,
  ArrowRight,
  Check,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  X,
  Menu,
  MessageCircle,
  RotateCcw
} from 'lucide-react';

// ============================================================================
// RÉGLAGES EN UN SEUL ENDROIT
// ============================================================================
const CONFIG = {
  NOM: "Visorax Studio",
  NOM_COURT: "Visorax",
  WHATSAPP_NUMERO: "22892556462",   // format international sans le +
  EMAIL_CONTACT: "",
  VALEUR_CREDIT_FCFA: 20,
  CREDITS_OFFERTS_INSCRIPTION: null // si null, aucune mention de crédits offerts
};

// ============================================================================
// FONCTION DE PRIX PURE (SEULE SOURCE DU CALCUL)
// ============================================================================
function prixPersonnalise(credits: number): number {
  if (credits >= 55) {
    return credits * CONFIG.VALEUR_CREDIT_FCFA;
  }
  return Math.ceil((17 * credits + 165) / 5) * 5;
}

interface LandingPageProps {
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
}

type LegalModalType = 'mentions' | 'confidentialite' | 'cgu' | null;

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenSignIn,
  onOpenSignUp
}) => {
  // Navigation mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Accordéon FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Humeur de la mascotte dans la FAQ (question "Et si une création échoue ?")
  const [faqMascotMood, setFaqMascotMood] = useState<VisoraMood>('normal');

  // Carte "Ce que tu peux créer" survolée ou touchée
  const [hoveredCreation, setHoveredCreation] = useState<string | null>(null);

  // Modales juridiques provisoires
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  // Bloc "Choisis ton montant" personnalisé (de 5 à 500 crédits)
  const [customCreditsInput, setCustomCreditsInput] = useState<string>('20');
  const [lastValidCredits, setLastValidCredits] = useState<number>(20);
  const [customFeedback, setCustomFeedback] = useState<string | null>(null);
  const [customMascotMood, setCustomMascotMood] = useState<VisoraMood>('content');
  const mascotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerMascotReflechit = () => {
    setCustomMascotMood('reflechit');
    if (mascotTimeoutRef.current) {
      clearTimeout(mascotTimeoutRef.current);
    }
    mascotTimeoutRef.current = setTimeout(() => {
      setCustomMascotMood('content');
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (mascotTimeoutRef.current) {
        clearTimeout(mascotTimeoutRef.current);
      }
    };
  }, []);

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    triggerMascotReflechit();

    if (rawVal.trim() === '') {
      setCustomCreditsInput('');
      setCustomFeedback(null);
      return;
    }

    const cleaned = rawVal.replace(/[^0-9]/g, '');
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
    triggerMascotReflechit();
    setCustomCreditsInput(String(val));
    setLastValidCredits(val);
    setCustomFeedback(null);
  };

  const handleQuickAdd = (add: number) => {
    triggerMascotReflechit();
    const current = customCreditsInput.trim() !== '' ? parseInt(customCreditsInput, 10) : lastValidCredits;
    const nextVal = Math.min(500, Math.max(5, (isNaN(current) ? 5 : current) + add));
    setCustomCreditsInput(String(nextVal));
    setLastValidCredits(nextVal);
    setCustomFeedback(null);
  };

  const handleResetToFive = () => {
    triggerMascotReflechit();
    setCustomCreditsInput('5');
    setLastValidCredits(5);
    setCustomFeedback(null);
  };

  const isCustomEmpty = customCreditsInput.trim() === '';
  const parsedCustomCredits = parseInt(customCreditsInput, 10);
  const currentCredits = isCustomEmpty || isNaN(parsedCustomCredits) ? 0 : parsedCustomCredits;
  const customPrix = currentCredits >= 5 ? prixPersonnalise(currentCredits) : 0;
  const customPrixParCredit = currentCredits >= 5 ? customPrix / currentCredits : 0;
  const formattedPrixParCredit = customPrixParCredit > 0
    ? customPrixParCredit.toLocaleString('fr-FR', {
        minimumFractionDigits: customPrixParCredit % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1
      })
    : '0';

  const vidsCount = Math.floor(currentCredits / 4);
  const musicsCount = Math.floor(currentCredits / 5);
  const voiceCharsCount = Math.floor(currentCredits / 8) * 1000;
  const equivalencesList: string[] = [];
  if (vidsCount > 0) {
    equivalencesList.push(`${vidsCount} vidéo${vidsCount > 1 ? 's' : ''} de 5 s en 480p`);
  }
  if (musicsCount > 0) {
    equivalencesList.push(`${musicsCount} musique${musicsCount > 1 ? 's' : ''}`);
  }
  if (voiceCharsCount > 0) {
    equivalencesList.push(`${voiceCharsCount.toLocaleString('fr-FR')} caractères de voix`);
  }

  const handleOrderCustomCredits = () => {
    if (isCustomEmpty || currentCredits < 5) return;
    if (CONFIG.WHATSAPP_NUMERO && CONFIG.WHATSAPP_NUMERO.trim().length > 0) {
      const cleanPhone = CONFIG.WHATSAPP_NUMERO.replace(/[^0-9]/g, '');
      const message = `Bonjour, je veux ${currentCredits} crédits (${customPrix.toLocaleString('fr-FR')} FCFA) pour mon compte Visorax. Mon email : `;
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onOpenSignIn();
    }
  };

  const handleContactWhatsAppOver500 = () => {
    if (CONFIG.WHATSAPP_NUMERO && CONFIG.WHATSAPP_NUMERO.trim().length > 0) {
      const cleanPhone = CONFIG.WHATSAPP_NUMERO.replace(/[^0-9]/g, '');
      const message = 'Bonjour, je souhaite commander plus de 500 crédits pour mon compte Visorax.';
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onOpenSignIn();
    }
  };

  // Gestion de l'ouverture de l'accordéon FAQ et transition d'humeur
  const handleToggleFaq = (idx: number) => {
    if (openFaqIndex === idx) {
      setOpenFaqIndex(null);
      return;
    }
    setOpenFaqIndex(idx);

    // Si c'est la question sur l'échec d'une création (index 1)
    if (idx === 1) {
      setFaqMascotMood('desole');
      const timer = setTimeout(() => {
        setFaqMascotMood('content');
      }, 1000);
      return () => clearTimeout(timer);
    }
  };

  // Commande de pack de crédits sur WhatsApp
  const handleOrderPack = (nom: string, credits: number) => {
    const prix = credits * CONFIG.VALEUR_CREDIT_FCFA;
    if (CONFIG.WHATSAPP_NUMERO && CONFIG.WHATSAPP_NUMERO.trim().length > 0) {
      const cleanPhone = CONFIG.WHATSAPP_NUMERO.replace(/[^0-9]/g, '');
      const message = `Bonjour, je veux le pack ${nom} (${credits} crédits, ${prix.toLocaleString('fr-FR')} FCFA) pour mon compte Visorax. Mon email : `;
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onOpenSignIn();
    }
  };

  // Défilement fluide vers une ancre
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Fermeture des modales avec la touche Échap
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-full w-full bg-[var(--lp-dominante)] text-[var(--lp-texte-principal)] font-sans selection:bg-[var(--lp-accent)] selection:text-[var(--lp-accent-texte)]">
      
      {/* =====================================================================
          1. EN-TÊTE FIXE
          ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[var(--lp-dominante)]/95 backdrop-blur-md border-b border-[var(--lp-bordure)] transition-colors">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo Visorax Studio */}
          <a
            href="#top"
            onClick={(e) => scrollToSection(e, 'top')}
            className="flex items-center gap-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-xl py-1 px-1.5"
            aria-label={`${CONFIG.NOM} - Accueil`}
          >
            <VisoraxLogo variant="ligne" size={36} decorative={true} />
          </a>

          {/* Liens d'ancre (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-semibold text-[var(--lp-texte-secondaire)]">
            <a
              href="#creations"
              onClick={(e) => scrollToSection(e, 'creations')}
              className="hover:text-[var(--lp-accent)] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2 py-1"
            >
              Créations
            </a>
            <a
              href="#tarifs"
              onClick={(e) => scrollToSection(e, 'tarifs')}
              className="hover:text-[var(--lp-accent)] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2 py-1"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="hover:text-[var(--lp-accent)] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2 py-1"
            >
              Questions
            </a>
          </nav>

          {/* Boutons d'action (Desktop & Mobile) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs sm:text-sm font-semibold text-[var(--lp-texte-principal)] bg-[var(--lp-secondaire)] hover:opacity-90 transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={onOpenSignUp}
              className="px-4 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs sm:text-sm font-semibold bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] hover:opacity-90 shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
            >
              Créer mon compte
            </button>

            {/* Menu burger mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] rounded-xl text-[var(--lp-texte-secondaire)] hover:bg-[var(--lp-secondaire)] transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu compact déroulant sur mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--lp-bordure)] bg-[var(--lp-dominante)] px-4 py-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150">
            <a
              href="#creations"
              onClick={(e) => scrollToSection(e, 'creations')}
              className="px-3 py-2.5 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--lp-texte-principal)] hover:bg-[var(--lp-secondaire)]"
            >
              Créations
            </a>
            <a
              href="#tarifs"
              onClick={(e) => scrollToSection(e, 'tarifs')}
              className="px-3 py-2.5 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--lp-texte-principal)] hover:bg-[var(--lp-secondaire)]"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="px-3 py-2.5 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[var(--lp-texte-principal)] hover:bg-[var(--lp-secondaire)]"
            >
              Questions
            </a>
          </div>
        )}
      </header>

      {/* Point de repère haut de page */}
      <div id="top" />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ===================================================================
            2. HÉROS
            =================================================================== */}
        <section className="pt-8 sm:pt-14 lg:pt-16 pb-12 sm:pb-16 lg:pb-20 flex flex-col lg:flex-row lg:items-center lg:justify-between lg:text-left gap-8 lg:gap-12 text-center">
          
          <div className="flex-1 max-w-2xl mx-auto lg:mx-0 flex flex-col items-center lg:items-start">
            {/* Slogan officiel */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--lp-secondaire)] text-[var(--lp-accent)] text-xs font-bold border border-[var(--lp-bordure)] mb-4">
              <span className="font-title tracking-tight">Crée, convertis, partage.</span>
            </div>

            {/* Titre unique H1 */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-snug sm:leading-tight text-[var(--lp-texte-principal)]">
              Crée tes documents, affiches, voix et musique avec l&apos;IA, en quelques secondes.
            </h1>

            {/* Sous-titre */}
            <p className="mt-4 text-sm sm:text-base md:text-lg text-[var(--lp-texte-secondaire)] leading-relaxed">
              Pas d&apos;abonnement : tu paies seulement ce que tu crées, avec des crédits dès 1 000 FCFA.
            </p>

            {/* Boutons d'action du Héros */}
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenSignUp}
                className="w-full sm:w-auto px-7 py-3.5 min-h-[44px] rounded-2xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-sm sm:text-base hover:opacity-90 shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
              >
                <span>Créer mon compte</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#tarifs"
                onClick={(e) => scrollToSection(e, 'tarifs')}
                className="w-full sm:w-auto px-6 py-3.5 min-h-[44px] rounded-2xl bg-[var(--lp-secondaire)] text-[var(--lp-texte-principal)] font-bold text-sm sm:text-base hover:opacity-90 transition active:scale-95 text-center flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
              >
                Voir les tarifs
              </a>
            </div>
          </div>

          {/* Illustration : Mascotte grande (150px, normal) + bulle de dialogue + 5 icônes */}
          <div className="w-full max-w-xl lg:w-[480px] shrink-0 mx-auto lg:mx-0 bg-[var(--lp-secondaire)] rounded-3xl p-6 sm:p-8 border border-[var(--lp-bordure)] shadow-xs flex flex-col items-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6">
              
              {/* Mascotte grande */}
              <div className="shrink-0">
                <VisoraxMascot size={150} mood="normal" decorative={true} />
              </div>

              {/* Bulle de dialogue en texte réel */}
              <div className="relative bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-[var(--lp-texte-principal)] rounded-2xl px-5 py-4 max-w-xs text-left shadow-xs">
                {/* Flèche de la bulle */}
                <div className="hidden sm:block absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--lp-dominante)] border-l border-b border-[var(--lp-bordure)] rotate-45" />
                <p className="text-sm sm:text-base font-bold leading-snug">
                  « Salut, je suis Visorax ! Dis-moi ce que tu veux créer. »
                </p>
              </div>
            </div>

            {/* 5 petites cartes-icônes SVG */}
            <div className="mt-7 pt-6 border-t border-[var(--lp-bordure)] w-full grid grid-cols-5 gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)]">
                <FileText className="w-5 h-5 text-[var(--lp-accent)]" />
                <span className="text-[10px] sm:text-xs font-semibold text-[var(--lp-texte-secondaire)]">Doc</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)]">
                <ImageIcon className="w-5 h-5 text-[var(--lp-accent)]" />
                <span className="text-[10px] sm:text-xs font-semibold text-[var(--lp-texte-secondaire)]">Image</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)]">
                <Video className="w-5 h-5 text-[var(--lp-accent)]" />
                <span className="text-[10px] sm:text-xs font-semibold text-[var(--lp-texte-secondaire)]">Vidéo</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)]">
                <Mic className="w-5 h-5 text-[var(--lp-accent)]" />
                <span className="text-[10px] sm:text-xs font-semibold text-[var(--lp-texte-secondaire)]">Voix</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)]">
                <Music className="w-5 h-5 text-[var(--lp-accent)]" />
                <span className="text-[10px] sm:text-xs font-semibold text-[var(--lp-texte-secondaire)]">Musique</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            3. LE PROBLÈME
            =================================================================== */}
        <section className="py-10 border-t border-[var(--lp-bordure)]">
          <div className="bg-[var(--lp-secondaire)] rounded-3xl p-6 sm:p-9 border border-[var(--lp-bordure)] max-w-3xl mx-auto">
            <p className="text-base sm:text-lg text-[var(--lp-texte-secondaire)] leading-relaxed font-medium">
              Convertir un document, trouver une voix, faire une petite vidéo… Ça prend du temps, ou ça coûte cher en dollars.
            </p>
            <div className="mt-4 pt-4 border-t border-[var(--lp-bordure)]">
              <p className="text-lg sm:text-xl font-bold text-[var(--lp-texte-principal)] leading-relaxed">
                Visorax Studio fait tout ça au même endroit, depuis ton téléphone, et tu paies en FCFA.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            4. COMMENT ÇA MARCHE, EN 3 ÉTAPES
            =================================================================== */}
        <section className="py-12 border-t border-[var(--lp-bordure)]">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--lp-texte-principal)]">
              Comment ça marche
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
              Trois étapes simples et immédiates, sans carte bancaire.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Étape 1 */}
            <div className="bg-[var(--lp-secondaire)] rounded-2xl p-6 border border-[var(--lp-bordure)] flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-black text-sm flex items-center justify-center mb-4">
                  1
                </div>
                <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">
                  Crée ton compte
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Une adresse email suffit. Ton espace privé est prêt en quelques secondes.
                </p>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="bg-[var(--lp-secondaire)] rounded-2xl p-6 border border-[var(--lp-bordure)] flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-black text-sm flex items-center justify-center mb-4">
                  2
                </div>
                <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">
                  Recharge tes crédits par Mobile Money, via WhatsApp
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Choisis ton pack à partir de 1 000 FCFA. Validation rapide et solde mis à jour.
                </p>
              </div>
            </div>

            {/* Étape 3 avec petite mascotte reflechit et bulle */}
            <div className="bg-[var(--lp-secondaire)] rounded-2xl p-6 border border-[var(--lp-bordure)] flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-black text-sm flex items-center justify-center mb-4">
                  3
                </div>
                <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">
                  Décris ce que tu veux : Visorax le crée
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Tape ton prompt ou choisis ton document. Le résultat est généré directement.
                </p>
              </div>

              {/* Mascotte réfléchit + bulle */}
              <div className="mt-5 pt-4 border-t border-[var(--lp-bordure)] flex items-center gap-3">
                <VisoraxMascot size={44} mood="reflechit" decorative={true} />
                <div className="bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--lp-texte-principal)]">
                  « Je m&apos;occupe du reste. »
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. CE QUE TU PEUX CRÉER
            =================================================================== */}
        <section id="creations" className="py-12 border-t border-[var(--lp-bordure)] scroll-mt-20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-[var(--lp-texte-principal)]">
                Ce que tu peux créer
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
                Cinq outils complets réunis au même endroit.
              </p>
            </div>

            {/* Petite mascotte interactive qui passe à content au survol/toucher d'une carte */}
            <div className="flex items-center gap-2.5 bg-[var(--lp-secondaire)] px-3.5 py-2 rounded-2xl border border-[var(--lp-bordure)]">
              <VisoraxMascot
                size={40}
                mood={hoveredCreation ? 'content' : 'normal'}
                decorative={true}
              />
              <span className="text-xs font-semibold text-[var(--lp-texte-secondaire)]">
                {hoveredCreation ? '« Génial, créons ça ! »' : 'Touche une création'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Carte 1 : Documents */}
            <div
              onMouseEnter={() => setHoveredCreation('documents')}
              onMouseLeave={() => setHoveredCreation(null)}
              onTouchStart={() => setHoveredCreation('documents')}
              className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] transition-all hover:scale-[1.01] flex flex-col gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] flex items-center justify-center text-[var(--lp-accent)]">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">Documents</h3>
              <p className="text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                Convertis et extrais : Word, PDF, images.
              </p>
            </div>

            {/* Carte 2 : Images */}
            <div
              onMouseEnter={() => setHoveredCreation('images')}
              onMouseLeave={() => setHoveredCreation(null)}
              onTouchStart={() => setHoveredCreation('images')}
              className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] transition-all hover:scale-[1.01] flex flex-col gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] flex items-center justify-center text-[var(--lp-accent)]">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">Images</h3>
              <p className="text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                Décris, Visorax dessine.
              </p>
            </div>

            {/* Carte 3 : Vidéos */}
            <div
              onMouseEnter={() => setHoveredCreation('videos')}
              onMouseLeave={() => setHoveredCreation(null)}
              onTouchStart={() => setHoveredCreation('videos')}
              className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] transition-all hover:scale-[1.01] flex flex-col gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] flex items-center justify-center text-[var(--lp-accent)]">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">Vidéos</h3>
              <p className="text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                Avec ou sans son, plusieurs scènes, tes propres personnages.
              </p>
            </div>

            {/* Carte 4 : Voix */}
            <div
              onMouseEnter={() => setHoveredCreation('voix')}
              onMouseLeave={() => setHoveredCreation(null)}
              onTouchStart={() => setHoveredCreation('voix')}
              className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] transition-all hover:scale-[1.01] flex flex-col gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] flex items-center justify-center text-[var(--lp-accent)]">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">Voix</h3>
              <p className="text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                Transforme un texte en voix.
              </p>
            </div>

            {/* Carte 5 : Musique */}
            <div
              onMouseEnter={() => setHoveredCreation('musique')}
              onMouseLeave={() => setHoveredCreation(null)}
              onTouchStart={() => setHoveredCreation('musique')}
              className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] transition-all hover:scale-[1.01] flex flex-col gap-2.5 sm:col-span-2 lg:col-span-1"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] flex items-center justify-center text-[var(--lp-accent)]">
                <Music className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[var(--lp-texte-principal)]">Musique</h3>
              <p className="text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed">
                Chansons avec ou sans paroles, 2 versions à chaque fois.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            6. TARIFS
            =================================================================== */}
        <section id="tarifs" className="py-12 border-t border-[var(--lp-bordure)] scroll-mt-20">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--lp-texte-principal)]">
              Tarifs transparents
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
              Chaque crédit vaut {CONFIG.VALEUR_CREDIT_FCFA} FCFA. Aucun abonnement caché.
            </p>
          </div>

          {/* Grille des tarifs avec calcul automatique */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-[var(--lp-texte-principal)]">Vidéo 5 s en 480p</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] mt-0.5">Format court standard</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base text-[var(--lp-accent)]">4 crédits</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] font-semibold">
                  {(4 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-[var(--lp-texte-principal)]">Vidéo 5 s en 720p</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] mt-0.5">Haute définition</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base text-[var(--lp-accent)]">8 crédits</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] font-semibold">
                  {(8 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-[var(--lp-texte-principal)]">Voix</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] mt-0.5">Pour 1 000 caractères</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base text-[var(--lp-accent)]">8 crédits</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] font-semibold">
                  {(8 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-[var(--lp-texte-principal)]">Musique</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] mt-0.5">2 versions générées</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-base text-[var(--lp-accent)]">5 crédits</p>
                <p className="text-xs text-[var(--lp-texte-secondaire)] font-semibold">
                  {(5 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
          </div>

          {/* Mention obligatoire et mascotte contente avec bulle */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-4 bg-[var(--lp-secondaire)] max-w-xl mx-auto p-4 sm:p-5 rounded-2xl border border-[var(--lp-bordure)]">
            <VisoraxMascot size={44} mood="content" decorative={true} />
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm font-bold text-[var(--lp-texte-principal)]">
                « Tu vois le prix avant de lancer. »
              </p>
              <p className="text-xs text-[var(--lp-texte-secondaire)] mt-0.5">
                Le prix exact s&apos;affiche toujours avant de lancer une création.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            7. PACKS DE CRÉDITS
            =================================================================== */}
        <section className="py-12 border-t border-[var(--lp-bordure)]">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--lp-texte-principal)]">
              Packs de crédits
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
              Commande directement sur WhatsApp par Mobile Money.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            
            {/* Pack Découverte */}
            <div className="bg-[var(--lp-secondaire)] rounded-2xl p-6 border border-[var(--lp-bordure)] flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--lp-texte-secondaire)]">
                  Découverte
                </span>
                <p className="mt-3 text-3xl font-black text-[var(--lp-texte-principal)]">
                  50 <span className="text-sm font-semibold text-[var(--lp-texte-secondaire)]">crédits</span>
                </p>
                <p className="mt-1 text-lg font-extrabold text-[var(--lp-accent)]">
                  {(50 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="mt-3 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Idéal pour tester plusieurs documents, générer des images et tester la synthèse vocale.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOrderPack('Découverte', 50)}
                className="mt-6 w-full py-3 min-h-[44px] rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-xs sm:text-sm hover:opacity-90 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Commander sur WhatsApp</span>
              </button>
            </div>

            {/* Pack Créateur */}
            <div className="bg-[var(--lp-secondaire)] rounded-2xl p-6 border-2 border-[var(--lp-accent)] flex flex-col justify-between shadow-xs relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider">
                Recommandé
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--lp-texte-secondaire)]">
                  Créateur
                </span>
                <p className="mt-3 text-3xl font-black text-[var(--lp-texte-principal)]">
                  150 <span className="text-sm font-semibold text-[var(--lp-texte-secondaire)]">crédits</span>
                </p>
                <p className="mt-1 text-lg font-extrabold text-[var(--lp-accent)]">
                  {(150 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="mt-3 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Pour produire régulièrement des visuels, des audios et des vidéos courtes complètes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOrderPack('Créateur', 150)}
                className="mt-6 w-full py-3 min-h-[44px] rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-xs sm:text-sm hover:opacity-90 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Commander sur WhatsApp</span>
              </button>
            </div>

            {/* Pack Pro */}
            <div className="bg-[var(--lp-secondaire)] rounded-2xl p-6 border border-[var(--lp-bordure)] flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--lp-texte-secondaire)]">
                  Pro
                </span>
                <p className="mt-3 text-3xl font-black text-[var(--lp-texte-principal)]">
                  500 <span className="text-sm font-semibold text-[var(--lp-texte-secondaire)]">crédits</span>
                </p>
                <p className="mt-1 text-lg font-extrabold text-[var(--lp-accent)]">
                  {(500 * CONFIG.VALEUR_CREDIT_FCFA).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="mt-3 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Pour les créateurs assidus, conversions intensives et production vidéo multi-scènes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOrderPack('Pro', 500)}
                className="mt-6 w-full py-3 min-h-[44px] rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-xs sm:text-sm hover:opacity-90 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Commander sur WhatsApp</span>
              </button>
            </div>
          </div>

          {/* ===================================================================
              BLOC "CHOISIS TON MONTANT" (ACHAT PERSONNALISÉ)
              =================================================================== */}
          <div className="mt-8 max-w-4xl mx-auto rounded-3xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] p-6 sm:p-8 shadow-xs">
            <div className="text-center sm:text-left mb-6">
              <h3 className="text-lg sm:text-xl font-black text-[var(--lp-texte-principal)]">
                Ou choisis ton propre montant
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
                De 5 à 500 crédits. Plus tu prends de crédits, moins le crédit coûte cher.
              </p>
            </div>

            {/* Contrôles synchronisés : champ numérique et curseur */}
            <div className="flex flex-col gap-5">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--lp-dominante)] p-4 sm:p-5 rounded-2xl border border-[var(--lp-bordure)]">
                <div className="w-full sm:flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="custom-slider" className="text-xs font-bold text-[var(--lp-texte-secondaire)]">
                      Ajuste avec le curseur (5 à 500)
                    </label>
                    <span className="text-xs font-bold text-[var(--lp-accent)]">
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
                    className="w-full h-3 rounded-lg bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] accent-[var(--lp-accent)] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                    aria-label="Curseur du nombre de crédits"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--lp-texte-secondaire)] font-semibold mt-1">
                    <span>5</span>
                    <span>100</span>
                    <span>250</span>
                    <span>500</span>
                  </div>
                </div>

                {/* Champ numérique synchronisé */}
                <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor="custom-input" className="text-xs font-semibold text-[var(--lp-texte-secondaire)]">
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
                      className="w-24 text-center font-black text-lg py-2 px-3 rounded-xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] text-[var(--lp-texte-principal)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                      aria-label="Nombre de crédits personnalisé"
                    />
                  </div>
                  {customFeedback && (
                    <span className="text-[11px] font-bold text-[var(--lp-accent)] animate-in fade-in duration-150">
                      {customFeedback}
                    </span>
                  )}
                </div>
              </div>

              {/* Boutons rapides : +10, +50, +100 et Remettre à 5 */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-semibold text-[var(--lp-texte-secondaire)] mr-1">
                  Ajout rapide :
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(10)}
                  className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-xs font-bold text-[var(--lp-texte-principal)] hover:bg-[var(--lp-secondaire)] transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(50)}
                  className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-xs font-bold text-[var(--lp-texte-principal)] hover:bg-[var(--lp-secondaire)] transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(100)}
                  className="px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-xs font-bold text-[var(--lp-texte-principal)] hover:bg-[var(--lp-secondaire)] transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={handleResetToFive}
                  className="px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-xs font-semibold text-[var(--lp-texte-secondaire)] hover:text-[var(--lp-texte-principal)] transition active:scale-95 cursor-pointer ml-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                >
                  Remettre à 5
                </button>
              </div>

              {/* Affichage en grand du prix avec aria-live="polite" et mascotte */}
              <div
                aria-live="polite"
                className="mt-2 p-5 rounded-2xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 text-center sm:text-left">
                  {/* Mascotte réactive (content / reflechit) */}
                  <div className="shrink-0">
                    <VisoraxMascot size={48} mood={customMascotMood} decorative={true} />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-[var(--lp-texte-principal)] tracking-tight">
                      {isCustomEmpty ? (
                        <span>0 FCFA</span>
                      ) : (
                        <span>
                          {currentCredits} crédits = {customPrix.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-[var(--lp-texte-secondaire)] mt-1">
                      {isCustomEmpty || currentCredits < 5 ? (
                        <span>Saisis au moins 5 crédits</span>
                      ) : (
                        <span>soit {formattedPrixParCredit} FCFA le crédit</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Incitation selon le tarif */}
                <div className="text-center sm:text-right shrink-0">
                  {customPrixParCredit > CONFIG.VALEUR_CREDIT_FCFA ? (
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-[var(--lp-secondaire)] text-[var(--lp-accent)] font-bold text-xs">
                      Dès 55 crédits, le crédit passe à {CONFIG.VALEUR_CREDIT_FCFA} FCFA.
                    </span>
                  ) : currentCredits >= 55 ? (
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-[var(--lp-secondaire)] text-[var(--lp-succes)] font-bold text-xs">
                      Tarif au meilleur prix : {CONFIG.VALEUR_CREDIT_FCFA} FCFA le crédit.
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Ligne d'équivalences indicatives */}
              {equivalencesList.length > 0 && (
                <div className="text-xs text-[var(--lp-texte-secondaire)] leading-relaxed px-1">
                  <p>
                    Avec {currentCredits} crédits, tu peux faire environ{' '}
                    <span className="font-semibold text-[var(--lp-texte-principal)]">
                      {equivalencesList.join(', ou ')}
                    </span>.
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-80">
                    Estimations : le prix exact s&apos;affiche avant chaque création.
                  </p>
                </div>
              )}

              {/* Bouton principal "Commander sur WhatsApp" */}
              <div className="mt-2 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={isCustomEmpty || currentCredits < 5}
                  onClick={handleOrderCustomCredits}
                  className="w-full py-3.5 min-h-[44px] rounded-2xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-sm sm:text-base hover:opacity-90 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Commander sur WhatsApp</span>
                </button>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--lp-texte-secondaire)] text-center sm:text-left px-1">
                  <button
                    type="button"
                    onClick={handleContactWhatsAppOver500}
                    className="hover:text-[var(--lp-accent)] underline underline-offset-2 transition-colors cursor-pointer min-h-[44px] flex items-center"
                  >
                    Pour plus de 500 crédits, écris-nous sur WhatsApp.
                  </button>
                  <span>Les crédits sont ajoutés à ton compte après confirmation du paiement.</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ===================================================================
            8. POURQUOI VISORAX STUDIO
            =================================================================== */}
        <section className="py-12 border-t border-[var(--lp-bordure)]">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--lp-texte-principal)]">
              Pourquoi choisir Visorax Studio
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
              Pensé pour être simple, équitable et accessible partout.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            
            <div className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-[var(--lp-accent)] shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--lp-texte-principal)]">
                  Tu ne paies que ce que tu crées
                </h3>
                <p className="mt-1 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Pas d&apos;abonnement prélevé en silence chaque mois. Tes crédits restent disponibles.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-[var(--lp-accent)] shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--lp-texte-principal)]">
                  Crédits rendus automatiquement si une création échoue
                </h3>
                <p className="mt-1 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  En cas de problème technique sur le serveur, ton solde est recrédité immédiatement.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-[var(--lp-accent)] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--lp-texte-principal)]">
                  Tes fichiers sont privés : chacun ne voit que les siens
                </h3>
                <p className="mt-1 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Chaque compte dispose de son propre stockage sécurisé. Aucune fuite vers d&apos;autres profils.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] text-[var(--lp-accent)] shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--lp-texte-principal)]">
                  Utilisable sur téléphone, installable comme une application
                </h3>
                <p className="mt-1 text-xs text-[var(--lp-texte-secondaire)] leading-relaxed">
                  Fonctionne directement dans le navigateur ou s&apos;ajoute en PWA sur ton écran d&apos;accueil.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            9. QUESTIONS FRÉQUENTES (ACCORDÉON ACCESSIBLE)
            =================================================================== */}
        <section id="faq" className="py-12 border-t border-[var(--lp-bordure)] scroll-mt-20">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--lp-texte-principal)]">
              Questions fréquentes
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--lp-texte-secondaire)]">
              Tout ce que tu dois savoir pour démarrer sereinement.
            </p>
          </div>

          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            
            {/* Question 1 */}
            <div className="rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleFaq(0)}
                aria-expanded={openFaqIndex === 0}
                className="w-full p-4 sm:p-5 min-h-[44px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--lp-texte-principal)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] cursor-pointer"
              >
                <span>Comment payer ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === 0 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 0 && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed border-t border-[var(--lp-bordure)] pt-3 animate-in fade-in duration-150">
                  Tu recharges tes crédits en FCFA par Mobile Money (T-Money, Flooz, Wave, Orange Money, etc.) via WhatsApp. Tu choisis un pack, tu effectues le transfert, et tes crédits sont crédités sur ton compte immédiatement après confirmation.
                </div>
              )}
            </div>

            {/* Question 2 : Échec avec mascotte désolée -> contente */}
            <div className="rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleFaq(1)}
                aria-expanded={openFaqIndex === 1}
                className="w-full p-4 sm:p-5 min-h-[44px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--lp-texte-principal)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] cursor-pointer"
              >
                <span>Et si une création échoue ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === 1 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 1 && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed border-t border-[var(--lp-bordure)] pt-4 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] mb-3">
                    <VisoraxMascot size={44} mood={faqMascotMood} decorative={true} />
                    <p className="text-xs sm:text-sm font-bold text-[var(--lp-texte-principal)]">
                      « Tes crédits sont rendus automatiquement »
                    </p>
                  </div>
                  <p>
                    Si une création rencontre une erreur technique, la totalité des crédits débités pour cette tentative est immédiatement remise sur ton solde sans démarche requise.
                  </p>
                </div>
              )}
            </div>

            {/* Question 3 */}
            <div className="rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleFaq(2)}
                aria-expanded={openFaqIndex === 2}
                className="w-full p-4 sm:p-5 min-h-[44px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--lp-texte-principal)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] cursor-pointer"
              >
                <span>Mes fichiers sont-ils privés ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === 2 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 2 && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed border-t border-[var(--lp-bordure)] pt-3 animate-in fade-in duration-150">
                  Oui, chacun ne voit que ses propres fichiers. Tes documents, audios, vidéos et images sont stockés dans un espace privé et sécurisé. Aucun autre utilisateur n&apos;a accès à tes données.
                </div>
              )}
            </div>

            {/* Question 4 */}
            <div className="rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleFaq(3)}
                aria-expanded={openFaqIndex === 3}
                className="w-full p-4 sm:p-5 min-h-[44px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--lp-texte-principal)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] cursor-pointer"
              >
                <span>Puis-je l&apos;installer sur mon téléphone ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === 3 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 3 && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed border-t border-[var(--lp-bordure)] pt-3 animate-in fade-in duration-150">
                  Oui, Visorax Studio est une application web progressive (PWA). Tu peux l&apos;ajouter directement sur l&apos;écran d&apos;accueil de ton smartphone (Android ou iPhone) depuis ton navigateur pour l&apos;utiliser comme une application classique.
                </div>
              )}
            </div>

            {/* Question 5 */}
            <div className="rounded-2xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleFaq(4)}
                aria-expanded={openFaqIndex === 4}
                className="w-full p-4 sm:p-5 min-h-[44px] flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-[var(--lp-texte-principal)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] cursor-pointer"
              >
                <span>Combien de temps prend une création ?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === 4 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 4 && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed border-t border-[var(--lp-bordure)] pt-3 animate-in fade-in duration-150">
                  De quelques secondes pour une image ou la conversion d&apos;un document, à plusieurs minutes pour une vidéo haute définition ou une musique complète en deux versions.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================================
            10. APPEL FINAL
            =================================================================== */}
        <section className="py-16 border-t border-[var(--lp-bordure)] text-center">
          <div className="bg-[var(--lp-secondaire)] rounded-3xl p-8 sm:p-12 border border-[var(--lp-bordure)] max-w-2xl mx-auto flex flex-col items-center shadow-xs">
            
            {/* Grande mascotte contente */}
            <VisoraxMascot size={140} mood="content" decorative={true} />

            <h2 className="mt-6 text-2xl sm:text-3xl font-black text-[var(--lp-texte-principal)]">
              Prêt à créer ?
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[var(--lp-texte-secondaire)] max-w-md">
              Rejoins Visorax Studio dès aujourd&apos;hui et transforme tes idées en documents, visuels et sons.
            </p>

            <button
              type="button"
              onClick={onOpenSignUp}
              className="mt-6 px-8 py-3.5 min-h-[44px] rounded-2xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-sm sm:text-base hover:opacity-90 shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
            >
              <span>Créer mon compte</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* =====================================================================
          11. PIED DE PAGE
          ===================================================================== */}
      <footer className="w-full bg-[var(--lp-secondaire)] border-t border-[var(--lp-bordure)] mt-8 py-10">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6 text-center">
          
          {/* Liens légaux */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-[var(--lp-texte-secondaire)]">
            <button
              type="button"
              onClick={() => setLegalModal('mentions')}
              className="hover:text-[var(--lp-accent)] transition-colors cursor-pointer min-h-[44px] flex items-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2"
            >
              Mentions légales
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('confidentialite')}
              className="hover:text-[var(--lp-accent)] transition-colors cursor-pointer min-h-[44px] flex items-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2"
            >
              Confidentialité
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('cgu')}
              className="hover:text-[var(--lp-accent)] transition-colors cursor-pointer min-h-[44px] flex items-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2"
            >
              Conditions d&apos;utilisation
            </button>
          </div>

          {/* Contact WhatsApp & Email si renseigné */}
          <div className="flex flex-wrap justify-center items-center gap-3 text-xs text-[var(--lp-texte-secondaire)]">
            {CONFIG.WHATSAPP_NUMERO && (
              <a
                href={`https://wa.me/${CONFIG.WHATSAPP_NUMERO.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--lp-accent)] font-semibold flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2 py-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp : +{CONFIG.WHATSAPP_NUMERO}</span>
              </a>
            )}
            {CONFIG.EMAIL_CONTACT && CONFIG.EMAIL_CONTACT.trim().length > 0 && (
              <a
                href={`mailto:${CONFIG.EMAIL_CONTACT}`}
                className="hover:text-[var(--lp-accent)] font-semibold flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] rounded-lg px-2 py-1"
              >
                <span>{CONFIG.EMAIL_CONTACT}</span>
              </a>
            )}
          </div>

          {/* Copyright */}
          <p className="text-xs text-[var(--lp-texte-secondaire)]">
            © {currentYear} {CONFIG.NOM}. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* =====================================================================
          MODALES JURIDIQUES PROVISOIRES (« à compléter »)
          ===================================================================== */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-lg bg-[var(--lp-dominante)] border border-[var(--lp-bordure)] rounded-3xl p-6 shadow-xl flex flex-col max-h-[85vh] text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--lp-bordure)]">
              <h3 id="modal-title" className="text-base sm:text-lg font-bold text-[var(--lp-texte-principal)]">
                {legalModal === 'mentions' && 'Mentions légales'}
                {legalModal === 'confidentialite' && 'Politique de confidentialité'}
                {legalModal === 'cgu' && "Conditions d'utilisation"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1.5 rounded-xl hover:bg-[var(--lp-secondaire)] text-[var(--lp-texte-secondaire)] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto text-xs sm:text-sm text-[var(--lp-texte-secondaire)] leading-relaxed space-y-3">
              <div className="p-3 rounded-xl bg-[var(--lp-secondaire)] border border-[var(--lp-bordure)] font-semibold text-[var(--lp-texte-principal)]">
                Texte provisoire à compléter
              </div>

              {legalModal === 'mentions' && (
                <>
                  <p>Éditeur du service : {CONFIG.NOM}</p>
                  <p>Responsable de la publication : à compléter.</p>
                  <p>Hébergement de l&apos;application : infrastructure cloud sécurisée.</p>
                  <p>Pour toute question ou réclamation, merci d&apos;utiliser le contact WhatsApp du support.</p>
                </>
              )}

              {legalModal === 'confidentialite' && (
                <>
                  <p>1. Données collectées : adresse email, nom et prénom pour la gestion du compte utilisateur.</p>
                  <p>2. Finalité : fourniture des fonctionnalités de création de documents, visuels et sons par IA.</p>
                  <p>3. Confidentialité : tes fichiers et créations sont strictement privés et réservés à ton compte.</p>
                  <p>4. Droits : tu peux demander la suppression de tes données à tout moment via le support.</p>
                </>
              )}

              {legalModal === 'cgu' && (
                <>
                  <p>1. Objet : conditions applicables à l&apos;utilisation de la plateforme {CONFIG.NOM}.</p>
                  <p>2. Crédits : les crédits sont acquis sans abonnement et débités selon les créations demandées.</p>
                  <p>3. Responsabilité : l&apos;utilisateur est responsable du contenu et des prompts qu&apos;il soumet.</p>
                  <p>4. Remboursement : en cas d&apos;échec technique avéré, les crédits sont automatiquement recrédités.</p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--lp-bordure)] flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[var(--lp-accent)] text-[var(--lp-accent-texte)] font-bold text-xs sm:text-sm hover:opacity-90 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
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
