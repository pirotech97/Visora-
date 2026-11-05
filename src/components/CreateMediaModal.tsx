import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Video,
  Mic,
  Coins,
  Loader2,
  AlertCircle,
  Upload,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowUp,
  ArrowDown,
  User,
  Users,
  Film,
  Edit2,
  Music
} from 'lucide-react';
import type {
  UserProfile,
  MediaOptionsResponse,
  VideoModelOption,
  MediaRecord,
  PersonnageInput,
  SceneInput,
  VideoProjectRecord,
  VideoProjectScene,
  MediaGeneratePayload
} from '../types';
import {
  fetchMediaOptions,
  invokeGenerateMedia,
  uploadMediaSourceToStorage,
  uploadPersonnageImage,
  invokeCreateVideoProject,
  createUploadSignedUrl
} from '../services/supabase';

interface CreateMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  credits: number | null;
  onCreditsChange: (newCredits: number) => void;
  onMediaGenerated: (media: MediaRecord) => void;
  onProjectGenerated?: (project: VideoProjectRecord) => void;
  onOpenRecharge: () => void;
  initialTab?: 'video' | 'audio' | 'musique';
}

const EMOTION_TAGS = ['[whispers]', '[shouting]', '[pensive]', '[caution]', '[urgency]', '[determination]'];

const STYLE_SUGGESTIONS = [
  'Dessin animé 3D coloré',
  'Réaliste cinéma',
  'Anime japonais',
  'Aquarelle',
  'Noir et blanc vintage',
  'Pixar-like lumineux'
];

const CharacterAvatar: React.FC<{ character: PersonnageInput }> = ({ character }) => {
  const [signedSrc, setSignedSrc] = useState<string | null>(character.localPreview || null);

  useEffect(() => {
    if (character.localPreview) {
      setSignedSrc(character.localPreview);
      return;
    }
    if (character.image) {
      let isMounted = true;
      createUploadSignedUrl(character.image, 3600).then((res) => {
        if (isMounted && res.signedUrl) {
          setSignedSrc(res.signedUrl);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [character.image, character.localPreview]);

  if (signedSrc) {
    return (
      <img
        src={signedSrc}
        alt={character.nom}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-slate-400">
      <User className="w-4 h-4" />
    </div>
  );
};

export const CreateMediaModal: React.FC<CreateMediaModalProps> = ({
  isOpen,
  onClose,
  user,
  credits,
  onCreditsChange,
  onMediaGenerated,
  onProjectGenerated,
  onOpenRecharge,
  initialTab = 'video'
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'musique'>(initialTab);
  const [videoMode, setVideoMode] = useState<'single' | 'scenes'>('single');
  const [options, setOptions] = useState<MediaOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // RÉGLAGES COMMUNS VIDÉO
  const [selectedModelId, setSelectedModelId] = useState<string>('rapide');
  const [selectedResolution, setSelectedResolution] = useState<string>('720p');
  const [selectedFormat, setSelectedFormat] = useState<string>('16:9');
  const [avecSon, setAvecSon] = useState<boolean>(true);

  // MODE « UNE SCÈNE »
  const [selectedDuree, setSelectedDuree] = useState<number | string>(5);
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [imageDepartFile, setImageDepartFile] = useState<File | null>(null);
  const [imageDepartPreview, setImageDepartPreview] = useState<string | null>(null);

  // MODE « PLUSIEURS SCÈNES »
  const [projectTitre, setProjectTitre] = useState<string>('');
  const [projectStyle, setProjectStyle] = useState<string>('Dessin animé 3D coloré');
  const [isPersonnagesOpen, setIsPersonnagesOpen] = useState<boolean>(true);
  const [personnages, setPersonnages] = useState<PersonnageInput[]>([]);
  const [scenes, setScenes] = useState<SceneInput[]>([
    {
      id: 'sc_' + Date.now(),
      nom: 'Scène 1',
      prompt: '',
      duree: 5,
      personnages: []
    }
  ]);

  // Modals pour ajout/modification de personnage
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [characterNameInput, setCharacterNameInput] = useState('');
  const [characterFile, setCharacterFile] = useState<File | null>(null);
  const [characterPreview, setCharacterPreview] = useState<string | null>(null);
  const [characterError, setCharacterError] = useState<string | null>(null);
  const [isUploadingCharacter, setIsUploadingCharacter] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingCharacterName, setEditingCharacterName] = useState<string>('');

  // Confirmation Pro si des personnages existent
  const [pendingModelChange, setPendingModelChange] = useState<string | null>(null);

  // ÉTAT VOIX (AUDIO)
  const [audioMode, setAudioMode] = useState<'une_voix' | 'dialogue'>('une_voix');

  // Mode "Une voix"
  const [audioTexte, setAudioTexte] = useState<string>('');
  const [selectedVoix, setSelectedVoix] = useState<string>('');
  const [showAudioAdvanced, setShowAudioAdvanced] = useState<boolean>(false);
  const [audioAccent, setAudioAccent] = useState<string>('');
  const [audioStyle, setAudioStyle] = useState<string>('');
  const [audioRythme, setAudioRythme] = useState<string>('');
  const [audioScene, setAudioScene] = useState<string>('');

  // Mode "Dialogue"
  const [dialogueVoix1, setDialogueVoix1] = useState<string>('');
  const [dialogueVoix2, setDialogueVoix2] = useState<string>('');
  const [showDialogueAdvanced1, setShowDialogueAdvanced1] = useState<boolean>(false);
  const [dialogueAccent1, setDialogueAccent1] = useState<string>('');
  const [dialogueStyle1, setDialogueStyle1] = useState<string>('');
  const [dialogueRythme1, setDialogueRythme1] = useState<string>('');
  const [showDialogueAdvanced2, setShowDialogueAdvanced2] = useState<boolean>(false);
  const [dialogueAccent2, setDialogueAccent2] = useState<string>('');
  const [dialogueStyle2, setDialogueStyle2] = useState<string>('');
  const [dialogueRythme2, setDialogueRythme2] = useState<string>('');
  const [dialogueScene, setDialogueScene] = useState<string>('');
  const [dialogueRepliques, setDialogueRepliques] = useState<
    Array<{ id: string; locuteur: 1 | 2; texte: string }>
  >([
    { id: 'rep_1', locuteur: 1, texte: '' },
    { id: 'rep_2', locuteur: 2, texte: '' }
  ]);

  const singleVoiceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const replicaTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // ÉTAT MUSIQUE
  const [musiqueSubTab, setMusiqueSubTab] = useState<'description' | 'paroles'>('description');
  const [musiqueDescription, setMusiqueDescription] = useState<string>('');
  const [musiqueInstrumental, setMusiqueInstrumental] = useState<boolean>(false);
  const [musiqueTitre, setMusiqueTitre] = useState<string>('');
  const [musiqueStyle, setMusiqueStyle] = useState<string>('');
  const [musiqueParoles, setMusiqueParoles] = useState<string>('');

  // ÉTAT GÉNÉRATION & FEEDBACK
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [costDiffNotice, setCostDiffNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);

  // 1. À l'ouverture du popup : appel unique à "media-generer" (action: "options") avec cache de session
  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(initialTab);
    setSubmitError(null);
    setCostDiffNotice(null);

    let isMounted = true;
    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError(null);

      const res = await fetchMediaOptions(false);
      if (!isMounted) return;

      if (res.error || !res.data) {
        setOptions(null);
        setOptionsError('Tarifs indisponibles, réessaie');
      } else {
        setOptions(res.data);
        setOptionsError(null);

        // Initialisation vidéo si modèle trouvé
        const videoModels = res.data.video || [];
        const defaultModel =
          videoModels.find((m) => m.id === 'rapide') || videoModels[0];

        if (defaultModel) {
          setSelectedModelId(defaultModel.id);
          setSelectedResolution(defaultModel.resolution_defaut || defaultModel.resolutions[0] || '720p');
          setSelectedDuree(defaultModel.durees[0] ?? 5);
          setSelectedFormat(defaultModel.formats[0] || '16:9');
          // Scène 1 durée
          setScenes((prev) =>
            prev.length > 0
              ? prev.map((s, idx) => (idx === 0 ? { ...s, duree: Number(defaultModel.durees[0] ?? 5) } : s))
              : [{ id: 'sc_' + Date.now(), nom: 'Scène 1', prompt: '', duree: Number(defaultModel.durees[0] ?? 5), personnages: [] }]
          );
        }

        // Initialisation audio
        const audioData = res.data.audio;
        if (audioData) {
          if (audioData.voix && audioData.voix.length > 0) {
            setSelectedVoix((prev) => prev || audioData.voix[0]);
            setDialogueVoix1((prev) => prev || audioData.voix[0]);
            setDialogueVoix2((prev) => prev || (audioData.voix[1] || audioData.voix[0]));
          }
        }
      }
      setLoadingOptions(false);
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  // Limites projet depuis la configuration reçue du serveur
  const projetCfg = options?.projet;
  const scenesMax = projetCfg?.scenes_max ?? 8;
  const personnagesMax = projetCfg?.personnages_max ?? 5;
  const personnagesParSceneMax = projetCfg?.personnages_par_scene_max ?? 3;
  const sceneCaracteresMax = projetCfg?.scene_caracteres_max ?? 1000;
  const styleCaracteresMax = projetCfg?.style_caracteres_max ?? 400;

  // Modèle vidéo sélectionné
  const currentVideoModel: VideoModelOption | undefined =
    options?.video?.find((m) => m.id === selectedModelId) || options?.video?.[0];

  // Le modèle actuel supporte-t-il les personnages ? (par défaut true sauf si personnages === false comme Kling / Pro)
  const supportsPersonnages = currentVideoModel?.personnages !== false && currentVideoModel?.id !== 'kling';

  // 3) Changement de modèle avec confirmation si passage à Pro alors que des personnages existent
  const handleModelChange = (modelId: string) => {
    const targetModel = options?.video?.find((m) => m.id === modelId);
    const targetSupportsPersonnages = targetModel?.personnages !== false && targetModel?.id !== 'kling';

    if (!targetSupportsPersonnages && personnages.length > 0) {
      setPendingModelChange(modelId);
      return;
    }

    applyModelChange(modelId);
  };

  const applyModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = options?.video?.find((m) => m.id === modelId);
    if (model) {
      const newRes = model.resolution_defaut || model.resolutions[0] || '720p';
      setSelectedResolution(newRes);
      const newDuree = model.durees[0] ?? 5;
      setSelectedDuree(newDuree);
      if (model.formats && model.formats.length > 0 && !model.formats.includes(selectedFormat)) {
        setSelectedFormat(model.formats[0]);
      }
      // Réaligne la durée des scènes si la durée actuelle n'existe pas dans le nouveau modèle
      setScenes((prev) =>
        prev.map((s) => ({
          ...s,
          duree: model.durees.map(Number).includes(Number(s.duree)) ? s.duree : Number(newDuree)
        }))
      );
    }
  };

  const confirmSwitchToPro = () => {
    if (pendingModelChange) {
      setPersonnages([]);
      // Retirer les personnages de toutes les scènes
      setScenes((prev) => prev.map((s) => ({ ...s, personnages: [] })));
      applyModelChange(pendingModelChange);
      setPendingModelChange(null);
    }
  };

  // Calcul du coût d'une durée
  const calculateDurationCost = (
    model: VideoModelOption | undefined,
    res: string,
    dureeVal: number | string,
    withSound: boolean
  ): number | null => {
    if (!model || !model.couts) return null;
    const resCouts = model.couts[res];
    if (!resCouts) return null;
    const dureeObj = resCouts[String(dureeVal)] || resCouts[Number(dureeVal)];
    if (!dureeObj) return null;
    return withSound ? dureeObj.avec_son : dureeObj.sans_son;
  };

  // Coût mode « Une scène »
  const currentVideoCost: number | null = calculateDurationCost(
    currentVideoModel,
    selectedResolution,
    selectedDuree,
    avecSon
  );

  // Coût mode « Plusieurs scènes » : somme des coûts de chaque scène
  const totalProjectCost: number = scenes.reduce((sum, s) => {
    const c = calculateDurationCost(currentVideoModel, selectedResolution, s.duree, avecSon);
    return sum + (c ?? 0);
  }, 0);

  const totalProjectDuration: number = scenes.reduce((sum, s) => sum + Number(s.duree || 0), 0);

  // Coût audio (voix) actuel en direct
  const audioRate = options?.audio?.credits_par_1000_caracteres ?? 0;
  const audioLength =
    audioMode === 'une_voix'
      ? audioTexte.length
      : dialogueRepliques.reduce((sum, r) => sum + r.texte.length, 0);
  const currentAudioCost: number =
    audioLength === 0 ? 0 : Math.ceil(audioLength / 1000) * audioRate;

  // Coût musique
  const currentMusiqueCost: number = options?.musique?.cout ?? 0;

  // Coût effectif selon onglet et mode
  const activeCost: number | null =
    activeTab === 'audio'
      ? currentAudioCost
      : activeTab === 'musique'
      ? currentMusiqueCost
      : videoMode === 'single'
      ? currentVideoCost
      : totalProjectCost;

  // Calculs solde et projection
  const currentSolde = credits ?? 0;
  const hasInsufficientCredits =
    activeCost !== null && activeCost > 0 && currentSolde < activeCost;
  const soldeApres =
    activeCost !== null ? Math.max(0, currentSolde - activeCost) : currentSolde;
  const manqueCredits =
    activeCost !== null && activeCost > currentSolde ? activeCost - currentSolde : 0;

  // Validations formulaires
  const isSingleVideoPromptValid =
    videoPrompt.trim().length >= 5 && videoPrompt.trim().length <= 2500;

  const isProjectStyleValid =
    projectStyle.trim().length >= 3 && projectStyle.trim().length <= styleCaracteresMax;

  const areProjectScenesValid =
    scenes.length >= 1 &&
    scenes.every((s) => s.prompt.trim().length >= 5 && s.prompt.trim().length <= sceneCaracteresMax);

  // Validation Voix : mode "Une voix" ou mode "Dialogue"
  const isSingleAudioValid =
    audioTexte.trim().length > 0 &&
    (!options?.audio?.caracteres_max || audioLength <= options.audio.caracteres_max) &&
    Boolean(selectedVoix) &&
    (!audioAccent.trim() || !options?.audio?.option_caracteres_max || audioAccent.trim().length <= options.audio.option_caracteres_max) &&
    (!audioStyle.trim() || !options?.audio?.option_caracteres_max || audioStyle.trim().length <= options.audio.option_caracteres_max) &&
    (!audioRythme.trim() || !options?.audio?.option_caracteres_max || audioRythme.trim().length <= options.audio.option_caracteres_max) &&
    (!audioScene.trim() || !options?.audio?.scene_caracteres_max || audioScene.trim().length <= options.audio.scene_caracteres_max);

  const isDialogueAudioValid =
    dialogueRepliques.length > 0 &&
    dialogueRepliques.every((r) => r.texte.trim().length > 0) &&
    audioLength > 0 &&
    (!options?.audio?.caracteres_max || audioLength <= options.audio.caracteres_max) &&
    Boolean(dialogueVoix1) &&
    Boolean(dialogueVoix2) &&
    (!dialogueAccent1.trim() || !options?.audio?.option_caracteres_max || dialogueAccent1.trim().length <= options.audio.option_caracteres_max) &&
    (!dialogueAccent2.trim() || !options?.audio?.option_caracteres_max || dialogueAccent2.trim().length <= options.audio.option_caracteres_max) &&
    (!dialogueStyle1.trim() || !options?.audio?.option_caracteres_max || dialogueStyle1.trim().length <= options.audio.option_caracteres_max) &&
    (!dialogueStyle2.trim() || !options?.audio?.option_caracteres_max || dialogueStyle2.trim().length <= options.audio.option_caracteres_max) &&
    (!dialogueRythme1.trim() || !options?.audio?.option_caracteres_max || dialogueRythme1.trim().length <= options.audio.option_caracteres_max) &&
    (!dialogueRythme2.trim() || !options?.audio?.option_caracteres_max || dialogueRythme2.trim().length <= options.audio.option_caracteres_max) &&
    (!dialogueScene.trim() || !options?.audio?.scene_caracteres_max || dialogueScene.trim().length <= options.audio.scene_caracteres_max);

  const isAudioValid = audioMode === 'une_voix' ? isSingleAudioValid : isDialogueAudioValid;

  // Validation Musique
  const isMusiqueDescValid =
    musiqueDescription.trim().length >= 5 &&
    (!options?.musique?.description_max ||
      musiqueDescription.trim().length <= options.musique.description_max);

  const isMusiqueParolesValid =
    musiqueStyle.trim().length > 0 &&
    (!options?.musique?.style_max || musiqueStyle.trim().length <= options.musique.style_max) &&
    musiqueParoles.trim().length >= 10 &&
    (!options?.musique?.paroles_max || musiqueParoles.trim().length <= options.musique.paroles_max) &&
    (!musiqueTitre.trim() ||
      !options?.musique?.titre_max ||
      musiqueTitre.trim().length <= options.musique.titre_max);

  const isMusiqueValid =
    musiqueSubTab === 'description' ? isMusiqueDescValid : isMusiqueParolesValid;

  const canSubmit =
    !loadingOptions &&
    !optionsError &&
    !isGenerating &&
    !hasInsufficientCredits &&
    activeCost !== null &&
    (activeTab === 'audio'
      ? isAudioValid
      : activeTab === 'musique'
      ? isMusiqueValid
      : videoMode === 'single'
      ? isSingleVideoPromptValid
      : isProjectStyleValid && areProjectScenesValid);

  // Gestion image de départ (mode une scène)
  const handleSelectImageDepart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setSubmitError('L’image de départ dépasse 15 Mo.');
      return;
    }
    setImageDepartFile(file);
    const url = URL.createObjectURL(file);
    setImageDepartPreview(url);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImageDepart = () => {
    if (imageDepartPreview && imageDepartPreview.startsWith('blob:')) {
      URL.revokeObjectURL(imageDepartPreview);
    }
    setImageDepartFile(null);
    setImageDepartPreview(null);
  };

  // =========================================================================
  // GESTION DES PERSONNAGES (MODE PLUSIEURS SCÈNES)
  // =========================================================================

  const handleSelectCharacterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCharacterError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setCharacterError('Format non supporté (JPG, PNG ou WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCharacterError('L’image ne doit pas dépasser 10 Mo.');
      return;
    }

    setCharacterFile(file);
    const url = URL.createObjectURL(file);
    setCharacterPreview(url);
    setIsAddingCharacter(true);
    if (characterFileInputRef.current) characterFileInputRef.current.value = '';
  };

  const validateCharacterName = (name: string, ignoreId?: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Le nom est obligatoire.';
    if (trimmed.length > 30) return '30 caractères maximum.';
    // lettres, chiffres, espaces, apostrophe, tiret
    const validCharsRegex = /^[a-zA-Z0-9À-ÿ\s'-]+$/;
    if (!validCharsRegex.test(trimmed)) {
      return 'Lettres, chiffres, espaces, apostrophe et tiret uniquement.';
    }
    // Deux personnages ne peuvent pas avoir le même nom, majuscules ignorées
    const duplicate = personnages.some(
      (p) => p.id !== ignoreId && p.nom.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return 'Ce nom est déjà utilisé par un autre personnage.';
    }
    return null;
  };

  const handleSaveNewCharacter = async () => {
    const nameErr = validateCharacterName(characterNameInput);
    if (nameErr) {
      setCharacterError(nameErr);
      return;
    }
    if (!characterFile) {
      setCharacterError('Image manquante.');
      return;
    }

    setIsUploadingCharacter(true);
    setCharacterError(null);

    try {
      const uploadPath = await uploadPersonnageImage(user.id, characterFile);
      if (!uploadPath) {
        setCharacterError('Échec de l’envoi de l’image. Réessaie.');
        setIsUploadingCharacter(false);
        return;
      }

      const newChar: PersonnageInput = {
        id: 'char_' + Date.now(),
        nom: characterNameInput.trim(),
        image: uploadPath,
        localPreview: characterPreview || undefined
      };

      setPersonnages((prev) => [...prev, newChar]);
      setIsAddingCharacter(false);
      setCharacterNameInput('');
      setCharacterFile(null);
      setCharacterPreview(null);
    } catch {
      setCharacterError('Erreur lors de l’ajout du personnage.');
    } finally {
      setIsUploadingCharacter(false);
    }
  };

  const handleUpdateCharacterName = (charId: string) => {
    const nameErr = validateCharacterName(editingCharacterName, charId);
    if (nameErr) {
      alert(nameErr);
      return;
    }

    const oldChar = personnages.find((p) => p.id === charId);
    const oldName = oldChar?.nom;
    const newName = editingCharacterName.trim();

    setPersonnages((prev) =>
      prev.map((p) => (p.id === charId ? { ...p, nom: newName } : p))
    );

    // Mettre à jour aussi dans les scènes
    if (oldName && oldName !== newName) {
      setScenes((prev) =>
        prev.map((s) => ({
          ...s,
          personnages: s.personnages.map((n) => (n === oldName ? newName : n))
        }))
      );
    }

    setEditingCharacterId(null);
    setEditingCharacterName('');
  };

  const handleDeleteCharacter = (charId: string) => {
    const char = personnages.find((p) => p.id === charId);
    if (!char) return;

    setPersonnages((prev) => prev.filter((p) => p.id !== charId));
    // Retirer le nom des scènes
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        personnages: s.personnages.filter((n) => n !== char.nom)
      }))
    );
  };

  // =========================================================================
  // GESTION DES SCÈNES (MODE PLUSIEURS SCÈNES)
  // =========================================================================

  const handleAddScene = () => {
    if (scenes.length >= scenesMax) return;
    const nextNum = scenes.length + 1;
    const defaultDuree = currentVideoModel?.durees[0] ? Number(currentVideoModel.durees[0]) : 5;

    const newScene: SceneInput = {
      id: 'sc_' + Date.now() + Math.random().toString(36).substring(2, 5),
      nom: `Scène ${nextNum}`,
      prompt: '',
      duree: defaultDuree,
      personnages: []
    };

    setScenes((prev) => [...prev, newScene]);
  };

  const handleDuplicateScene = (index: number) => {
    if (scenes.length >= scenesMax) return;
    const target = scenes[index];
    const clone: SceneInput = {
      id: 'sc_' + Date.now() + Math.random().toString(36).substring(2, 5),
      nom: `${target.nom || `Scène ${index + 1}`} (copie)`,
      prompt: target.prompt,
      duree: target.duree,
      personnages: [...target.personnages]
    };

    const next = [...scenes];
    next.splice(index + 1, 0, clone);
    setScenes(next);
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const next = [...scenes];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setScenes(next);
  };

  const handleToggleSceneCharacter = (sceneIndex: number, charNom: string) => {
    setScenes((prev) =>
      prev.map((sc, idx) => {
        if (idx !== sceneIndex) return sc;
        const exists = sc.personnages.includes(charNom);
        if (exists) {
          return { ...sc, personnages: sc.personnages.filter((n) => n !== charNom) };
        }
        if (sc.personnages.length >= personnagesParSceneMax) {
          alert(`Maximum ${personnagesParSceneMax} personnages par scène.`);
          return sc;
        }
        return { ...sc, personnages: [...sc.personnages, charNom] };
      })
    );
  };

  // =========================================================================
  // GESTION RÉPLIQUES AUDIO (MODE DIALOGUE) ET BALISES D'ÉMOTION
  // =========================================================================

  const handleMoveReplique = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dialogueRepliques.length) return;
    setDialogueRepliques((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleDeleteReplique = (index: number) => {
    if (dialogueRepliques.length <= 1) return;
    setDialogueRepliques((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddReplique = () => {
    const repliquesMax = options?.audio?.repliques_max;
    if (repliquesMax && dialogueRepliques.length >= repliquesMax) return;
    const lastLocuteur = dialogueRepliques[dialogueRepliques.length - 1]?.locuteur ?? 1;
    const nextLocuteur: 1 | 2 = lastLocuteur === 1 ? 2 : 1;
    setDialogueRepliques((prev) => [
      ...prev,
      { id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), locuteur: nextLocuteur, texte: '' }
    ]);
  };

  const handleUpdateRepliqueText = (index: number, text: string) => {
    setDialogueRepliques((prev) =>
      prev.map((r, i) => (i === index ? { ...r, texte: text } : r))
    );
  };

  const handleUpdateRepliqueLocuteur = (index: number, locuteur: 1 | 2) => {
    setDialogueRepliques((prev) =>
      prev.map((r, i) => (i === index ? { ...r, locuteur } : r))
    );
  };

  const handleInsertTagSingleVoice = (tag: string) => {
    const el = singleVoiceTextareaRef.current;
    if (!el) {
      setAudioTexte((prev) => (prev ? prev + ' ' + tag + ' ' : tag + ' '));
      return;
    }
    const start = el.selectionStart ?? audioTexte.length;
    const end = el.selectionEnd ?? audioTexte.length;
    const before = audioTexte.substring(0, start);
    const after = audioTexte.substring(end);
    const padBefore = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
    const padAfter = after.length > 0 && !after.startsWith(' ') ? ' ' : ' ';
    const inserted = `${padBefore}${tag}${padAfter}`;
    const newText = before + inserted + after;
    setAudioTexte(newText);
    requestAnimationFrame(() => {
      el.focus();
      const newPos = start + inserted.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const handleInsertTagReplique = (index: number, tag: string) => {
    const rep = dialogueRepliques[index];
    if (!rep) return;
    const el = replicaTextareaRefs.current[rep.id];
    const currentText = rep.texte;
    let newText = '';
    let newPos = currentText.length;

    if (!el) {
      newText = currentText ? currentText + ' ' + tag + ' ' : tag + ' ';
    } else {
      const start = el.selectionStart ?? currentText.length;
      const end = el.selectionEnd ?? currentText.length;
      const before = currentText.substring(0, start);
      const after = currentText.substring(end);
      const padBefore = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
      const padAfter = after.length > 0 && !after.startsWith(' ') ? ' ' : ' ';
      const inserted = `${padBefore}${tag}${padAfter}`;
      newText = before + inserted + after;
      newPos = start + inserted.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      });
    }

    setDialogueRepliques((prev) =>
      prev.map((r, i) => (i === index ? { ...r, texte: newText } : r))
    );
  };

  // =========================================================================
  // SOUMISSION (UNE SCÈNE / PLUSIEURS SCÈNES / AUDIO)
  // =========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitError(null);
    setCostDiffNotice(null);
    setIsGenerating(true);

    try {
      if (activeTab === 'audio') {
        // Envoi VOIX (AUDIO) selon mode
        let payload: MediaGeneratePayload;

        if (audioMode === 'une_voix') {
          payload = {
            type: 'audio',
            texte: audioTexte.trim(),
            voix: selectedVoix,
            ...(audioAccent.trim() ? { accent: audioAccent.trim() } : {}),
            ...(audioStyle.trim() ? { style: audioStyle.trim() } : {}),
            ...(audioRythme.trim() ? { rythme: audioRythme.trim() } : {}),
            ...(audioScene.trim() ? { scene: audioScene.trim() } : {})
          };
        } else {
          payload = {
            type: 'audio',
            mode: 'dialogue',
            voix: dialogueVoix1,
            voix_2: dialogueVoix2,
            ...(dialogueAccent1.trim() ? { accent: dialogueAccent1.trim() } : {}),
            ...(dialogueAccent2.trim() ? { accent_2: dialogueAccent2.trim() } : {}),
            ...(dialogueStyle1.trim() ? { style: dialogueStyle1.trim() } : {}),
            ...(dialogueStyle2.trim() ? { style_2: dialogueStyle2.trim() } : {}),
            ...(dialogueRythme1.trim() ? { rythme: dialogueRythme1.trim() } : {}),
            ...(dialogueRythme2.trim() ? { rythme_2: dialogueRythme2.trim() } : {}),
            ...(dialogueScene.trim() ? { scene: dialogueScene.trim() } : {}),
            repliques: dialogueRepliques
              .filter((r) => r.texte.trim().length > 0)
              .map((r) => ({
                locuteur: r.locuteur,
                texte: r.texte.trim()
              }))
          };
        }

        const res = await invokeGenerateMedia(payload);

        if (res.error) {
          setSubmitError(res.error);
          if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);
          setIsGenerating(false);
          return;
        }

        if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);

        const mediaId =
          res.media_id ||
          res.data?.media_id ||
          res.data?.id ||
          res.media?.id ||
          'audio_' + Date.now();

        const createdMedia: MediaRecord = {
          ...(res.media || {}),
          id: mediaId,
          user_id: user.id,
          type: 'audio',
          mode: audioMode === 'dialogue' ? 'dialogue' : undefined,
          texte:
            audioMode === 'une_voix'
              ? audioTexte.trim()
              : dialogueRepliques
                  .filter((r) => r.texte.trim().length > 0)
                  .map((r) => `[Voix ${r.locuteur}] ${r.texte.trim()}`)
                  .join('\n'),
          voix: audioMode === 'une_voix' ? selectedVoix : `${dialogueVoix1} / ${dialogueVoix2}`,
          statut: 'en_cours',
          cout: res.cout ?? currentAudioCost,
          created_at: new Date().toISOString()
        };

        onMediaGenerated(createdMedia);
        onClose();
      } else if (activeTab === 'musique') {
        // Envoi MUSIQUE
        const payload: MediaGeneratePayload =
          musiqueSubTab === 'description'
            ? {
                type: 'musique',
                description: musiqueDescription.trim(),
                instrumental: Boolean(musiqueInstrumental)
              }
            : {
                type: 'musique',
                mode: 'paroles',
                ...(musiqueTitre.trim() ? { titre: musiqueTitre.trim() } : {}),
                style: musiqueStyle.trim(),
                paroles: musiqueParoles.trim()
              };

        const res = await invokeGenerateMedia(payload);

        if (res.error) {
          setSubmitError(res.error);
          if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);
          setIsGenerating(false);
          return;
        }

        if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);

        const mediaId =
          res.media_id ||
          res.data?.media_id ||
          res.data?.id ||
          res.media?.id ||
          'musique_' + Date.now();

        const createdMedia: MediaRecord = {
          ...(res.media || {}),
          id: mediaId,
          user_id: user.id,
          type: 'musique',
          description:
            musiqueSubTab === 'description' ? musiqueDescription.trim() : undefined,
          titre:
            musiqueSubTab === 'paroles' && musiqueTitre.trim()
              ? musiqueTitre.trim()
              : undefined,
          style:
            musiqueSubTab === 'paroles' ? musiqueStyle.trim() : undefined,
          paroles:
            musiqueSubTab === 'paroles' ? musiqueParoles.trim() : undefined,
          instrumental:
            musiqueSubTab === 'description' ? Boolean(musiqueInstrumental) : false,
          mode: musiqueSubTab === 'paroles' ? 'paroles' : undefined,
          statut: 'en_cours',
          cout: res.cout ?? currentMusiqueCost,
          created_at: new Date().toISOString()
        };

        onMediaGenerated(createdMedia);
        onClose();
      } else if (videoMode === 'single') {
        // Envoi VIDÉO UNE SCÈNE
        let imageDepartPath: string | undefined = undefined;
        if (imageDepartFile) {
          const uploaded = await uploadMediaSourceToStorage(user.id, imageDepartFile);
          if (uploaded) imageDepartPath = uploaded;
        }

        const res = await invokeGenerateMedia({
          type: 'video',
          modele: selectedModelId,
          prompt: videoPrompt.trim(),
          duree: Number(selectedDuree),
          resolution: selectedResolution,
          format: selectedFormat,
          son: Boolean(avecSon),
          image_depart: imageDepartPath
        });

        if (res.error) {
          setSubmitError(res.error);
          if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);
          setIsGenerating(false);
          return;
        }

        if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);

        const mediaId = res.media_id || res.data?.media_id || res.data?.id || res.media?.id || ('media_' + Date.now());
        const createdMedia: MediaRecord = {
          ...(res.media || {}),
          id: mediaId,
          user_id: user.id,
          type: 'video',
          modele: selectedModelId,
          prompt: videoPrompt.trim(),
          duree: Number(selectedDuree),
          resolution: selectedResolution,
          format: selectedFormat,
          son: avecSon,
          image_depart: imageDepartPath,
          statut: 'en_cours',
          cout: res.cout ?? currentVideoCost ?? undefined,
          created_at: new Date().toISOString()
        };

        onMediaGenerated(createdMedia);
        onClose();
      } else {
        // Envoi VIDÉO PLUSIEURS SCÈNES (action: "projet")
        const payloadPersonnages = personnages.map((p) => ({
          nom: p.nom,
          image: p.image
        }));

        const payloadScenes = scenes.map((s, idx) => ({
          nom: s.nom?.trim() || `Scène ${idx + 1}`,
          prompt: s.prompt.trim(),
          duree: Number(s.duree),
          personnages: s.personnages
        }));

        const res = await invokeCreateVideoProject({
          action: 'projet',
          titre: projectTitre.trim() || undefined,
          style: projectStyle.trim(),
          modele: selectedModelId,
          resolution: selectedResolution,
          format: selectedFormat,
          son: Boolean(avecSon),
          personnages: payloadPersonnages,
          scenes: payloadScenes
        });

        if (res.error) {
          setSubmitError(res.error);
          if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);
          setIsGenerating(false);
          return;
        }

        if (typeof res.credits_restants === 'number') onCreditsChange(res.credits_restants);

        const createdProjectScenes: VideoProjectScene[] = scenes.map((s, idx) => ({
          scene_num: idx + 1,
          nom: s.nom?.trim() || `Scène ${idx + 1}`,
          prompt: s.prompt.trim(),
          duree: Number(s.duree),
          statut: 'en_cours',
          personnages: s.personnages
        }));

        const createdProject: VideoProjectRecord = {
          id: res.projet_id || 'proj_' + Date.now(),
          user_id: user.id,
          titre: projectTitre.trim() || 'Projet multi-scènes',
          style: projectStyle.trim(),
          modele: selectedModelId,
          statut: 'en_cours',
          scenes: createdProjectScenes,
          created_at: new Date().toISOString(),
          total_cout: res.cout ?? totalProjectCost,
          total_duree: totalProjectDuration
        };

        onProjectGenerated?.(createdProject);
        onClose();
      }
    } catch (err: any) {
      console.error('Erreur génération média:', err);
      setSubmitError('Une erreur imprévue est survenue. Merci de réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  // Texte spécifique d'aide sous l'interrupteur « Avec son » quand désactivé
  const getSonHelperText = () => {
    if (avecSon) return null;
    const sonField = currentVideoModel?.son;
    if (sonField === 'consigne') {
      return 'Le son est coupé au mieux ; un léger fond sonore peut rester.';
    }
    if (sonField === 'incertain') {
      return 'Le son est coupé au mieux ; pour un silence garanti, choisis le modèle Pro.';
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop sombre */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isGenerating) onClose();
        }}
        aria-hidden="true"
      />

      {/* Conteneur modal : feuille du bas sur mobile, dialogue centré sur desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-media-title"
        className="relative w-full md:max-w-[620px] bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92dvh] md:max-h-[88dvh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-250 ease-out select-none"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
        }}
      >
        {/* En-tête */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              {activeTab === 'video' ? (
                <Video className="w-4 h-4" />
              ) : activeTab === 'audio' ? (
                <Mic className="w-4 h-4 text-teal-600" />
              ) : (
                <Music className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="modal-media-title"
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight"
              >
                {activeTab === 'video'
                  ? 'Créer une vidéo'
                  : activeTab === 'audio'
                  ? 'Voix (texte → audio)'
                  : 'Créer une musique'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {activeTab === 'video'
                  ? 'Génération de vidéos animées par intelligence artificielle.'
                  : activeTab === 'audio'
                  ? 'Transforme ton texte en voix parlée avec un rendu naturel.'
                  : 'Compose des morceaux musicaux originaux en deux versions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>{credits ?? 0}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Onglets Vidéo / Voix / Musique */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 gap-1">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                setActiveTab('video');
                setSubmitError(null);
              }}
              className={`flex-1 py-1.5 px-2.5 text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'video'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vidéo</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                setActiveTab('audio');
                setSubmitError(null);
              }}
              className={`flex-1 py-1.5 px-2.5 text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'audio'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voix</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                setActiveTab('musique');
                setSubmitError(null);
              }}
              className={`flex-1 py-1.5 px-2.5 text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'musique'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Musique</span>
            </button>
          </div>
        </div>

        {/* Corps déroulant du formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Chargement des options */}
          {loadingOptions && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Chargement des options et des tarifs en direct…</span>
            </div>
          )}

          {/* Erreur de récupération des tarifs */}
          {optionsError && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span className="font-semibold">{optionsError}</span>
            </div>
          )}

          {/* Erreur de soumission */}
          {submitError && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{submitError}</span>
            </div>
          )}

          {/* Notice si le coût final du serveur différait */}
          {costDiffNotice && (
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
              <span>{costDiffNotice}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* 1) FORMULAIRE VIDÉO */}
          {/* ================================================================= */}
          {activeTab === 'video' && options?.video && (
            <div className="space-y-4">
              {/* Interrupteur « Une scène / Plusieurs scènes » en haut du formulaire vidéo */}
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex gap-1">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setVideoMode('single')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                    videoMode === 'single'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Une scène
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setVideoMode('scenes')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    videoMode === 'scenes'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Plusieurs scènes</span>
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* A) EN MODE « UNE SCÈNE » : RIEN NE CHANGE                     */}
              {/* ------------------------------------------------------------- */}
              {videoMode === 'single' ? (
                <>
                  {/* Modèle de génération */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Modèle de génération
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {options.video.map((model) => {
                        const isSelected = selectedModelId === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            disabled={isGenerating}
                            onClick={() => handleModelChange(model.id)}
                            className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 shadow-2xs'
                                : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                  {model.nom}
                                </span>
                                {isSelected && (
                                  <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                                {model.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Durée avec coût en petit */}
                  {currentVideoModel?.durees && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Durée de la vidéo
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {currentVideoModel.durees.map((d) => {
                          const isSelected = String(selectedDuree) === String(d);
                          const costForDuration = calculateDurationCost(
                            currentVideoModel,
                            selectedResolution,
                            d,
                            avecSon
                          );

                          return (
                            <button
                              key={String(d)}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => setSelectedDuree(d)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <span>{d} s</span>
                              {costForDuration !== null && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? 'bg-blue-700 text-blue-100'
                                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {costForDuration} cr
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Qualité d'image */}
                  {currentVideoModel?.resolutions && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Qualité d'image
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {currentVideoModel.resolutions.map((res) => {
                          const isSelected = selectedResolution === res;
                          return (
                            <button
                              key={res}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => setSelectedResolution(res)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              {res}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Format */}
                  {currentVideoModel?.formats && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Format d'affichage
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {currentVideoModel.formats.map((fmt) => {
                          const isSelected = selectedFormat === fmt;
                          return (
                            <button
                              key={fmt}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => setSelectedFormat(fmt)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              {fmt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interrupteur « Avec son » */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {avecSon ? (
                          <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Avec son
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={avecSon}
                        disabled={isGenerating}
                        onClick={() => setAvecSon((prev) => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          avecSon ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            avecSon ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {!avecSon && getSonHelperText() && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug pt-1">
                        {getSonHelperText()}
                      </p>
                    )}
                  </div>

                  {/* Description (5 à 2500 car.) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Description de la vidéo <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {videoPrompt.length}/2500
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={2500}
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Décris précisément l'action, l'ambiance, les mouvements de caméra et le sujet (5 à 2500 caractères)…"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition resize-none leading-relaxed"
                    />
                    {videoPrompt.length > 0 && videoPrompt.length < 5 && (
                      <p className="text-[11px] text-red-500 mt-1">
                        La description doit comporter au moins 5 caractères.
                      </p>
                    )}
                  </div>

                  {/* Partir d'une image (facultatif) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Partir d'une image (facultatif)
                      </label>
                      {imageDepartPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImageDepart}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Retirer</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleSelectImageDepart}
                    />

                    {imageDepartPreview ? (
                      <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group">
                        <img
                          src={imageDepartPreview}
                          alt="Image de départ"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Choisir une image de départ (JPG, PNG, WebP)</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* ----------------------------------------------------------- */
                /* B) MODE « PLUSIEURS SCÈNES »                                */
                /* ----------------------------------------------------------- */
                <div className="space-y-4">
                  {/* 1) Titre du projet (facultatif, 80 car. max) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Titre du projet (facultatif)
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {projectTitre.length}/80
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={80}
                      value={projectTitre}
                      onChange={(e) => setProjectTitre(e.target.value)}
                      placeholder="Ex : Voyage au cœur de la savane"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    />
                  </div>

                  {/* 2) Style commun (obligatoire, 3 à 400 car.) + suggestions */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Style commun <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {projectStyle.length}/{styleCaracteresMax}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={styleCaracteresMax}
                      value={projectStyle}
                      onChange={(e) => setProjectStyle(e.target.value)}
                      placeholder="Ex : Dessin animé 3D coloré, ambiance féerique"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition mb-2"
                    />

                    {/* Pastilles de suggestion */}
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {STYLE_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setProjectStyle(sug)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                            projectStyle === sug
                              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 text-blue-700 dark:text-blue-300 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Toutes les scènes garderont ce style.
                    </p>
                  </div>

                  {/* 3) Réglages communs à toutes les scènes : modèle, qualité, format, son */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Réglages communs aux scènes
                    </h4>

                    {/* Modèle */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Modèle
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {options.video.map((model) => {
                          const isSelected = selectedModelId === model.id;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => handleModelChange(model.id)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 font-bold text-blue-700 dark:text-blue-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="text-xs">{model.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Qualité & Format */}
                    <div className="grid grid-cols-2 gap-2">
                      {currentVideoModel?.resolutions && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Qualité
                          </label>
                          <select
                            value={selectedResolution}
                            onChange={(e) => setSelectedResolution(e.target.value)}
                            disabled={isGenerating}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            {currentVideoModel.resolutions.map((res) => (
                              <option key={res} value={res}>
                                {res}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {currentVideoModel?.formats && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Format
                          </label>
                          <select
                            value={selectedFormat}
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            disabled={isGenerating}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            {currentVideoModel.formats.map((fmt) => (
                              <option key={fmt} value={fmt}>
                                {fmt}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Interrupteur « Avec son » */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {avecSon ? (
                          <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Avec son
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={avecSon}
                        disabled={isGenerating}
                        onClick={() => setAvecSon((prev) => !prev)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          avecSon ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            avecSon ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {!avecSon && getSonHelperText() && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
                        {getSonHelperText()}
                      </p>
                    )}
                  </div>

                  {/* 4) Personnages (section repliable « Personnages (facultatif) ») */}
                  <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsPersonnagesOpen((prev) => !prev)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Personnages (facultatif)
                        </span>
                        {personnages.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            {personnages.length}
                          </span>
                        )}
                      </div>
                      {isPersonnagesOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isPersonnagesOpen && (
                      <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900">
                        {!supportsPersonnages ? (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                            Les personnages ne sont pas disponibles avec le modèle Pro.
                          </div>
                        ) : (
                          <>
                            {/* Liste des cartes de personnages */}
                            {personnages.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {personnages.map((p) => (
                                  <div
                                    key={p.id}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 justify-between"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                                        <CharacterAvatar character={p} />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">
                                          {p.nom}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCharacterId(p.id);
                                          setEditingCharacterName(p.nom);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                                        title="Modifier le nom"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCharacter(p.id)}
                                        className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Bouton "+ Ajouter un personnage" */}
                            {personnages.length < personnagesMax && (
                              <div>
                                <input
                                  ref={characterFileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={handleSelectCharacterFile}
                                />
                                <button
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => characterFileInputRef.current?.click()}
                                  className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Ajouter un personnage ({personnages.length}/{personnagesMax})</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5) Liste de scènes (cartes numérotées, 1 au départ) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        Scènes ({scenes.length}/{scenesMax})
                      </label>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        {totalProjectDuration} s · {totalProjectCost} crédits
                      </span>
                    </div>

                    <div className="space-y-3">
                      {scenes.map((scene, idx) => {
                        const sceneCost =
                          calculateDurationCost(
                            currentVideoModel,
                            selectedResolution,
                            scene.duree,
                            avecSon
                          ) ?? 0;

                        return (
                          <div
                            key={scene.id}
                            className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-2xs space-y-3"
                          >
                            {/* Ligne 1 : Nom scène, boutons réorganisation et suppression */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  maxLength={60}
                                  value={scene.nom || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setScenes((prev) =>
                                      prev.map((s, i) => (i === idx ? { ...s, nom: val } : s))
                                    );
                                  }}
                                  placeholder={`Scène ${idx + 1}`}
                                  disabled={isGenerating}
                                  className="px-2 py-1 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 min-w-0 flex-1"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60">
                                  {sceneCost} cr
                                </span>

                                <button
                                  type="button"
                                  disabled={idx === 0 || isGenerating}
                                  onClick={() => handleMoveScene(idx, 'up')}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="Monter la scène"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === scenes.length - 1 || isGenerating}
                                  onClick={() => handleMoveScene(idx, 'down')}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="Descendre la scène"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={scenes.length >= scenesMax || isGenerating}
                                  onClick={() => handleDuplicateScene(idx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                                  title="Dupliquer la scène"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={scenes.length <= 1 || isGenerating}
                                  onClick={() => handleDeleteScene(idx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                                  title="Supprimer la scène"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Ligne 2 : Description obligatoire avec compteur */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                  Description de l'action <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {scene.prompt.length}/{sceneCaracteresMax}
                                </span>
                              </div>
                              <textarea
                                rows={2}
                                maxLength={sceneCaracteresMax}
                                value={scene.prompt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScenes((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, prompt: val } : s))
                                  );
                                }}
                                placeholder="Décris ce qui se passe dans cette scène précise (5 car. min)…"
                                disabled={isGenerating}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none leading-relaxed"
                              />
                            </div>

                            {/* Ligne 3 : Durée avec coût en petit */}
                            {currentVideoModel?.durees && (
                              <div>
                                <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Durée
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {currentVideoModel.durees.map((d) => {
                                    const isSel = Number(scene.duree) === Number(d);
                                    const dCost = calculateDurationCost(
                                      currentVideoModel,
                                      selectedResolution,
                                      d,
                                      avecSon
                                    );
                                    return (
                                      <button
                                        key={String(d)}
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => {
                                          setScenes((prev) =>
                                            prev.map((s, i) =>
                                              i === idx ? { ...s, duree: Number(d) } : s
                                            )
                                          );
                                        }}
                                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                                          isSel
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <span>{d} s</span>
                                        {dCost !== null && (
                                          <span
                                            className={`text-[9px] font-bold px-1 rounded ${
                                              isSel
                                                ? 'bg-blue-700 text-blue-100'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                            }`}
                                          >
                                            {dCost} cr
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Ligne 4 : Personnages présents (cases à cocher max 3) */}
                            {supportsPersonnages && personnages.length > 0 && (
                              <div>
                                <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Personnages présents (max {personnagesParSceneMax})
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {personnages.map((p) => {
                                    const checked = scene.personnages.includes(p.nom);
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleToggleSceneCharacter(idx, p.nom)}
                                        className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                          checked
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                      >
                                        <div
                                          className={`w-3 h-3 rounded flex items-center justify-center border ${
                                            checked
                                              ? 'border-blue-600 bg-blue-600 text-white'
                                              : 'border-slate-300'
                                          }`}
                                        >
                                          {checked && <Check className="w-2 h-2 stroke-[3]" />}
                                        </div>
                                        <span>{p.nom}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Grand bouton "+ Ajouter une scène" */}
                    <button
                      type="button"
                      disabled={scenes.length >= scenesMax || isGenerating}
                      onClick={handleAddScene}
                      className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {scenes.length >= scenesMax
                          ? `${scenesMax} scènes maximum`
                          : '+ Ajouter une scène'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 2) FORMULAIRE VOIX (TEXTE → AUDIO)                                */}
          {/* ================================================================= */}
          {activeTab === 'audio' && options?.audio && (
            <div className="space-y-4">
              {/* Deux modes (onglets) : "Une voix" et "Dialogue" */}
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 gap-1">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setAudioMode('une_voix')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                    audioMode === 'une_voix'
                      ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Une voix
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setAudioMode('dialogue')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                    audioMode === 'dialogue'
                      ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dialogue
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* MODE "UNE VOIX"                                               */}
              {/* ------------------------------------------------------------- */}
              {audioMode === 'une_voix' && (
                <div className="space-y-4">
                  {/* Texte à vocaliser */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Texte à vocaliser <span className="text-red-500">*</span>
                      </label>
                      {options.audio.caracteres_max ? (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {audioTexte.length} / {options.audio.caracteres_max}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {audioTexte.length} car.
                        </span>
                      )}
                    </div>
                    <textarea
                      ref={singleVoiceTextareaRef}
                      rows={4}
                      maxLength={options.audio.caracteres_max}
                      value={audioTexte}
                      onChange={(e) => setAudioTexte(e.target.value)}
                      placeholder="Saisis le texte à transformer en voix naturelle…"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-800 transition resize-none leading-relaxed"
                    />

                    {/* Balises d'émotion sous la zone de texte */}
                    <div className="mt-2 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {EMOTION_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            disabled={isGenerating}
                            onClick={() => handleInsertTagSingleVoice(tag)}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                        Ces balises changent la façon de dire la phrase. Elles ne sont pas prononcées.
                      </p>
                    </div>
                  </div>

                  {/* Voix : liste déroulante */}
                  {options.audio.voix && options.audio.voix.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Voix <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedVoix}
                          onChange={(e) => setSelectedVoix(e.target.value)}
                          disabled={isGenerating}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-800 transition cursor-pointer appearance-none"
                        >
                          {options.audio.voix.map((v: string) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Section repliable "Réglages avancés" */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setShowAudioAdvanced(!showAudioAdvanced)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Réglages avancés (facultatif)</span>
                      {showAudioAdvanced ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showAudioAdvanced && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                        {/* Accent */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Accent
                            </label>
                            {options.audio.option_caracteres_max && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {audioAccent.length} / {options.audio.option_caracteres_max}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            maxLength={options.audio.option_caracteres_max}
                            value={audioAccent}
                            onChange={(e) => setAudioAccent(e.target.value)}
                            placeholder="ex. British (RP), American (Gen)"
                            disabled={isGenerating}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                          />
                        </div>

                        {/* Style */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Style
                            </label>
                            {options.audio.option_caracteres_max && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {audioStyle.length} / {options.audio.option_caracteres_max}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            maxLength={options.audio.option_caracteres_max}
                            value={audioStyle}
                            onChange={(e) => setAudioStyle(e.target.value)}
                            placeholder="ex. Deadpan, Empathetic, chaleureux"
                            disabled={isGenerating}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                          />
                        </div>

                        {/* Rythme */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Rythme
                            </label>
                            {options.audio.option_caracteres_max && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {audioRythme.length} / {options.audio.option_caracteres_max}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            maxLength={options.audio.option_caracteres_max}
                            value={audioRythme}
                            onChange={(e) => setAudioRythme(e.target.value)}
                            placeholder="ex. Natural, Staccato"
                            disabled={isGenerating}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                          />
                        </div>

                        {/* Ambiance de la scène */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Ambiance de la scène
                            </label>
                            {options.audio.scene_caracteres_max && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {audioScene.length} / {options.audio.scene_caracteres_max}
                              </span>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            maxLength={options.audio.scene_caracteres_max}
                            value={audioScene}
                            onChange={(e) => setAudioScene(e.target.value)}
                            placeholder="ex. Une conversation intime dans un café calme au crépuscule…"
                            disabled={isGenerating}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* MODE "DIALOGUE"                                               */}
              {/* ------------------------------------------------------------- */}
              {audioMode === 'dialogue' && (
                <div className="space-y-4">
                  {/* Deux voix : Voix 1 et Voix 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Voix 1 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-teal-700 dark:text-teal-300">
                          Voix 1 <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setShowDialogueAdvanced1(!showDialogueAdvanced1)}
                          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-teal-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Réglages</span>
                          {showDialogueAdvanced1 ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <select
                          value={dialogueVoix1}
                          onChange={(e) => setDialogueVoix1(e.target.value)}
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 transition appearance-none cursor-pointer"
                        >
                          {options.audio.voix?.map((v: string) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Réglages avancés Voix 1 */}
                      {showDialogueAdvanced1 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2 animate-in fade-in duration-150">
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Accent</span>
                            <input
                              type="text"
                              maxLength={options.audio.option_caracteres_max}
                              value={dialogueAccent1}
                              onChange={(e) => setDialogueAccent1(e.target.value)}
                              placeholder="ex. British (RP)"
                              disabled={isGenerating}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[11px]"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Style</span>
                            <input
                              type="text"
                              maxLength={options.audio.option_caracteres_max}
                              value={dialogueStyle1}
                              onChange={(e) => setDialogueStyle1(e.target.value)}
                              placeholder="ex. Empathetic"
                              disabled={isGenerating}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[11px]"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rythme</span>
                            <input
                              type="text"
                              maxLength={options.audio.option_caracteres_max}
                              value={dialogueRythme1}
                              onChange={(e) => setDialogueRythme1(e.target.value)}
                              placeholder="ex. Natural"
                              disabled={isGenerating}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[11px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voix 2 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-teal-700 dark:text-teal-300">
                          Voix 2 <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setShowDialogueAdvanced2(!showDialogueAdvanced2)}
                          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-teal-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Réglages</span>
                          {showDialogueAdvanced2 ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <select
                          value={dialogueVoix2}
                          onChange={(e) => setDialogueVoix2(e.target.value)}
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 transition appearance-none cursor-pointer"
                        >
                          {options.audio.voix?.map((v: string) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Réglages avancés Voix 2 */}
                      {showDialogueAdvanced2 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2 animate-in fade-in duration-150">
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Accent</span>
                            <input
                              type="text"
                              maxLength={options.audio.option_caracteres_max}
                              value={dialogueAccent2}
                              onChange={(e) => setDialogueAccent2(e.target.value)}
                              placeholder="ex. American (Gen)"
                              disabled={isGenerating}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[11px]"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Style</span>
                            <input
                              type="text"
                              maxLength={options.audio.option_caracteres_max}
                              value={dialogueStyle2}
                              onChange={(e) => setDialogueStyle2(e.target.value)}
                              placeholder="ex. Deadpan"
                              disabled={isGenerating}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[11px]"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rythme</span>
                            <input
                              type="text"
                              maxLength={options.audio.option_caracteres_max}
                              value={dialogueRythme2}
                              onChange={(e) => setDialogueRythme2(e.target.value)}
                              placeholder="ex. Staccato"
                              disabled={isGenerating}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[11px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ambiance de la scène facultative */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Ambiance de la scène <span className="text-[11px] font-normal text-slate-400">(facultatif)</span>
                      </label>
                      {options.audio.scene_caracteres_max && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {dialogueScene.length} / {options.audio.scene_caracteres_max}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={options.audio.scene_caracteres_max}
                      value={dialogueScene}
                      onChange={(e) => setDialogueScene(e.target.value)}
                      placeholder="ex. Un échange animé dans une gare, bruits de fond lointains…"
                      disabled={isGenerating}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                    />
                  </div>

                  {/* Liste de répliques */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Répliques du dialogue <span className="text-red-500">*</span>
                      </label>
                      {options.audio.repliques_max && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {dialogueRepliques.length} / {options.audio.repliques_max} répliques
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {dialogueRepliques.map((rep, idx) => (
                        <div
                          key={rep.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                        >
                          {/* En-tête de la réplique */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                #{idx + 1}
                              </span>
                              {/* Sélecteur de locuteur */}
                              <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-700 p-0.5">
                                <button
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => handleUpdateRepliqueLocuteur(idx, 1)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    rep.locuteur === 1
                                      ? 'bg-teal-600 text-white shadow-2xs'
                                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                  }`}
                                >
                                  Voix 1 ({dialogueVoix1 || '1'})
                                </button>
                                <button
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => handleUpdateRepliqueLocuteur(idx, 2)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    rep.locuteur === 2
                                      ? 'bg-teal-600 text-white shadow-2xs'
                                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                  }`}
                                >
                                  Voix 2 ({dialogueVoix2 || '2'})
                                </button>
                              </div>
                            </div>

                            {/* Actions sur la réplique : monter, descendre, supprimer */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0 || isGenerating}
                                onClick={() => handleMoveReplique(idx, 'up')}
                                aria-label="Monter la réplique"
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === dialogueRepliques.length - 1 || isGenerating}
                                onClick={() => handleMoveReplique(idx, 'down')}
                                aria-label="Descendre la réplique"
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={dialogueRepliques.length <= 1 || isGenerating}
                                onClick={() => handleDeleteReplique(idx)}
                                aria-label="Supprimer la réplique"
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Zone de texte de la réplique */}
                          <textarea
                            ref={(el) => {
                              replicaTextareaRefs.current[rep.id] = el;
                            }}
                            rows={2}
                            value={rep.texte}
                            onChange={(e) => handleUpdateRepliqueText(idx, e.target.value)}
                            placeholder={`Réplique dite par Voix ${rep.locuteur}…`}
                            disabled={isGenerating}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition resize-none leading-relaxed"
                          />

                          {/* Balises d'émotion sous chaque réplique */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {EMOTION_TAGS.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => handleInsertTagReplique(idx, tag)}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                              Ces balises changent la façon de dire la phrase. Elles ne sont pas prononcées.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bouton "+ Ajouter une réplique" */}
                    <button
                      type="button"
                      disabled={Boolean(
                        isGenerating ||
                        (options.audio.repliques_max && dialogueRepliques.length >= options.audio.repliques_max)
                      )}
                      onClick={handleAddReplique}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-teal-500/50 hover:border-teal-600 bg-teal-50/40 hover:bg-teal-50 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {options.audio.repliques_max && dialogueRepliques.length >= options.audio.repliques_max
                          ? `${options.audio.repliques_max} répliques maximum`
                          : '+ Ajouter une réplique'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Récapitulatif et Coût affiché en direct pour l'audio */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Coût : {currentAudioCost} crédit{currentAudioCost > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                  <span>
                    {audioLength} caractère{audioLength > 1 ? 's' : ''}
                    {options.audio.caracteres_max ? ` / ${options.audio.caracteres_max}` : ''}
                  </span>
                  <span>
                    Ton solde : <strong className="text-slate-800 dark:text-slate-200">{currentSolde}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3) FORMULAIRE MUSIQUE (2 SOUS-ONGLETS)                             */}
          {/* ================================================================= */}
          {activeTab === 'musique' && (
            <div className="space-y-4">
              {/* Sous-onglets Musique : "Description" / "Mes paroles" */}
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 gap-1">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setMusiqueSubTab('description')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                    musiqueSubTab === 'description'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Description
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setMusiqueSubTab('paroles')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                    musiqueSubTab === 'paroles'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Mes paroles
                </button>
              </div>

              {/* Sous-onglet 1 : Description */}
              {musiqueSubTab === 'description' && (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Description du morceau <span className="text-red-500">*</span>
                      </label>
                      {options?.musique?.description_max && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {musiqueDescription.length} / {options.musique.description_max}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      maxLength={options?.musique?.description_max || 1000}
                      value={musiqueDescription}
                      onChange={(e) => setMusiqueDescription(e.target.value)}
                      placeholder="Décris le style, l'ambiance et les instruments souhaités (5 caractères minimum)…"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition resize-none leading-relaxed"
                    />
                    {musiqueDescription.trim().length > 0 &&
                      musiqueDescription.trim().length < 5 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          5 caractères minimum requis.
                        </p>
                      )}
                  </div>

                  {/* Case à cocher : Sans chant (instrumental) */}
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={musiqueInstrumental}
                      onChange={(e) => setMusiqueInstrumental(e.target.checked)}
                      disabled={isGenerating}
                      className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Sans chant (instrumental)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Génère une piste instrumentale pure sans voix.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Sous-onglet 2 : Mes paroles */}
              {musiqueSubTab === 'paroles' && (
                <div className="space-y-3.5">
                  {/* Titre (facultatif, une ligne) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Titre <span className="text-[11px] font-normal text-slate-400">(facultatif)</span>
                      </label>
                      {options?.musique?.titre_max && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {musiqueTitre.length} / {options.musique.titre_max}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={options?.musique?.titre_max || 80}
                      value={musiqueTitre}
                      onChange={(e) => setMusiqueTitre(e.target.value)}
                      placeholder="Titre de ton morceau"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition"
                    />
                  </div>

                  {/* Style musical (obligatoire, une ligne) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Style musical <span className="text-red-500">*</span>
                      </label>
                      {options?.musique?.style_max && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {musiqueStyle.length} / {options.musique.style_max}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={options?.musique?.style_max || 200}
                      value={musiqueStyle}
                      onChange={(e) => setMusiqueStyle(e.target.value)}
                      placeholder="afrobeat doux, guitare"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition"
                    />
                  </div>

                  {/* Paroles (zone de texte, obligatoire, 10 car min) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Paroles <span className="text-red-500">*</span>
                      </label>
                      {options?.musique?.paroles_max && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {musiqueParoles.length} / {options.musique.paroles_max}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      maxLength={options?.musique?.paroles_max || 3000}
                      value={musiqueParoles}
                      onChange={(e) => setMusiqueParoles(e.target.value)}
                      placeholder="Écris ou colle tes paroles complètes (10 caractères minimum)…"
                      disabled={isGenerating}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-800 transition resize-none leading-relaxed"
                    />
                    {musiqueParoles.trim().length > 0 &&
                      musiqueParoles.trim().length < 10 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          10 caractères minimum requis.
                        </p>
                      )}
                  </div>
                </div>
              )}

              {/* Coût fixe et mention "2 versions de ton morceau" */}
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{currentMusiqueCost} crédits</span>
                  </div>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400">
                    2 versions de ton morceau incluses
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ton solde : <strong className="text-slate-800 dark:text-slate-200">{currentSolde} crédits</strong>
                </span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 6) BOUTON PRINCIPAL & RÉCAPITULATIF EN DIRECT                      */}
          {/* ================================================================= */}
          <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
            {isGenerating && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-snug">
                  {activeTab === 'musique'
                    ? 'Composition de ta musique en cours (2 à 4 minutes)…'
                    : activeTab === 'audio'
                    ? 'Génération de la voix en cours (environ 1 minute)…'
                    : 'Création de la vidéo en cours…'}
                </p>
              </div>
            )}

            {/* Récapitulatif fixe en mode plusieurs scènes */}
            {activeTab === 'video' && videoMode === 'scenes' && (
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  {scenes.length} scène{scenes.length > 1 ? 's' : ''} · {totalProjectDuration} s
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {totalProjectCost} crédits
                </span>
              </div>
            )}

            {/* État solde insuffisant : message « Il te faut X crédits » et bouton Recharger */}
            {hasInsufficientCredits ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Il te faut {activeCost} crédits pour cette création (solde : {currentSolde}).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenRecharge}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-xs shrink-0"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Recharger</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onOpenRecharge}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-sm shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Recharger</span>
                  </button>

                  <button
                    type="button"
                    disabled={true}
                    className="flex-1 py-3 px-4 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 cursor-not-allowed min-h-[46px]"
                  >
                    <span>Il te faut {activeCost} crédits</span>
                  </button>
                </div>

                {activeCost !== null && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                    Solde : {currentSolde} crédit{currentSolde > 1 ? 's' : ''} → {soldeApres} après création
                  </p>
                )}
              </div>
            ) : (
              <div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-3 px-4 text-white font-bold rounded-2xl text-sm shadow-md disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[46px] ${
                    activeTab === 'audio'
                      ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 shadow-teal-500/20'
                      : activeTab === 'musique'
                      ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 shadow-purple-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 shadow-blue-500/20'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Création en cours…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {activeTab === 'audio'
                          ? `Générer la voix · ${activeCost ?? 0} crédit${(activeCost ?? 0) > 1 ? 's' : ''}`
                          : activeTab === 'musique'
                          ? `Générer la musique · ${activeCost ?? 0} crédit${(activeCost ?? 0) > 1 ? 's' : ''}`
                          : videoMode === 'scenes'
                          ? `Créer le projet · ${activeCost ?? 0} crédit${(activeCost ?? 0) > 1 ? 's' : ''}`
                          : `Créer la vidéo · ${activeCost ?? 0} crédit${(activeCost ?? 0) > 1 ? 's' : ''}`}
                      </span>
                    </>
                  )}
                </button>

                {activeCost !== null && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mt-2">
                    Solde : {currentSolde} crédit{currentSolde > 1 ? 's' : ''} → {soldeApres} après création
                  </p>
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Modal d'ajout du nom du personnage */}
      {isAddingCharacter && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Nouveau personnage
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCharacter(false);
                  setCharacterFile(null);
                  setCharacterPreview(null);
                  setCharacterNameInput('');
                  setCharacterError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {characterPreview && (
              <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                <img
                  src={characterPreview}
                  alt="Aperçu personnage"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nom du personnage (30 car. max)
              </label>
              <input
                type="text"
                maxLength={30}
                value={characterNameInput}
                onChange={(e) => setCharacterNameInput(e.target.value)}
                placeholder="Ex : Awa, Moussa, Kévin…"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Lettres, chiffres, espaces, apostrophe et tiret uniquement.
              </p>
            </div>

            {characterError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {characterError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingCharacter(false);
                  setCharacterFile(null);
                  setCharacterPreview(null);
                  setCharacterNameInput('');
                  setCharacterError(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isUploadingCharacter}
                onClick={handleSaveNewCharacter}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUploadingCharacter && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification du nom de personnage */}
      {editingCharacterId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Modifier le nom
            </h3>

            <div>
              <input
                type="text"
                maxLength={30}
                value={editingCharacterName}
                onChange={(e) => setEditingCharacterName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCharacterId(null);
                  setEditingCharacterName('');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCharacterName(editingCharacterId)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation si passage au modèle Pro alors que des personnages existent */}
      {pendingModelChange && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Personnages non disponibles avec Pro
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Le modèle Pro ne supporte pas les personnages. Passer à Pro retirera les {personnages.length} personnage{personnages.length > 1 ? 's' : ''} configuré{personnages.length > 1 ? 's' : ''}.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingModelChange(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmSwitchToPro}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
              >
                Confirmer et retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
