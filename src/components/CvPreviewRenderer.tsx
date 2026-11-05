import React from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Building,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import type { CvOutputDocument } from '../types';
import type { CvDesignOptions } from '../services/cvDesignEngine';

interface CvPreviewRendererProps {
  document: CvOutputDocument;
  onChange: (updated: CvOutputDocument) => void;
  options: CvDesignOptions;
}

export const CvPreviewRenderer: React.FC<CvPreviewRendererProps> = ({
  document: doc,
  onChange,
  options
}) => {
  const accent = options.accentColor || '#2563EB';
  const isCompact = options.fontSize === 'compact';
  const fontClass = options.fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  const showComp = !options.hiddenSections?.competences && Array.isArray(doc.competences) && doc.competences.length > 0;
  const showLang = !options.hiddenSections?.langues && Array.isArray(doc.langues) && doc.langues.length > 0;
  const showCentres = !options.hiddenSections?.centresInteret && Array.isArray(doc.centres_interet) && doc.centres_interet.length > 0;

  // Handlers pour modifier les textes en direct
  const updateIdentite = (field: keyof CvOutputDocument['identite'], val: string) => {
    onChange({
      ...doc,
      identite: { ...doc.identite, [field]: val }
    });
  };

  const updateResume = (val: string) => {
    onChange({ ...doc, resume: val });
  };

  const updateExperience = (index: number, field: string, val: any) => {
    const updated = [...(doc.experiences || [])];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...doc, experiences: updated });
  };

  const addExperiencePoint = (expIdx: number) => {
    const updated = [...(doc.experiences || [])];
    const points = [...(updated[expIdx].points || []), 'Nouvelle réalisation...'];
    updated[expIdx] = { ...updated[expIdx], points };
    onChange({ ...doc, experiences: updated });
  };

  const updateExperiencePoint = (expIdx: number, ptIdx: number, val: string) => {
    const updated = [...(doc.experiences || [])];
    const points = [...(updated[expIdx].points || [])];
    points[ptIdx] = val;
    updated[expIdx] = { ...updated[expIdx], points };
    onChange({ ...doc, experiences: updated });
  };

  const removeExperiencePoint = (expIdx: number, ptIdx: number) => {
    const updated = [...(doc.experiences || [])];
    const points = updated[expIdx].points.filter((_, i) => i !== ptIdx);
    updated[expIdx] = { ...updated[expIdx], points };
    onChange({ ...doc, experiences: updated });
  };

  const updateFormation = (index: number, field: string, val: string) => {
    const updated = [...(doc.formations || [])];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...doc, formations: updated });
  };

  const updateCompetence = (index: number, val: string) => {
    const updated = [...(doc.competences || [])];
    updated[index] = val;
    onChange({ ...doc, competences: updated });
  };

  const removeCompetence = (index: number) => {
    onChange({ ...doc, competences: doc.competences.filter((_, i) => i !== index) });
  };

  const updateLangue = (index: number, field: 'langue' | 'niveau', val: string) => {
    const updated = [...(doc.langues || [])];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...doc, langues: updated });
  };

  const updateCentreInteret = (index: number, val: string) => {
    const updated = [...(doc.centres_interet || [])];
    updated[index] = val;
    onChange({ ...doc, centres_interet: updated });
  };

  // Helper rendu de la photo
  const renderPhoto = (sizeClass = 'w-16 h-16 sm:w-20 sm:h-20', extraClass = '') => {
    if (!options.photoUrl) return null;
    const shapeClass = options.photoShape === 'round' ? 'rounded-full' : 'rounded-2xl';
    return (
      <div className={`shrink-0 overflow-hidden shadow-xs border-2 border-white ${shapeClass} ${sizeClass} ${extraClass}`}>
        <img
          src={options.photoUrl}
          alt="Photo de profil"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  // Rendu de la barre d'identité pour les templates single-column
  const renderContactRow = (align: 'center' | 'left' = 'center') => {
    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Mail className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <input
            type="email"
            value={doc.identite?.email || ''}
            onChange={(e) => updateIdentite('email', e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
            placeholder="email@exemple.com"
          />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Phone className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <input
            type="text"
            value={doc.identite?.telephone || ''}
            onChange={(e) => updateIdentite('telephone', e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
            placeholder="+228 00 00 00 00"
          />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <input
            type="text"
            value={doc.identite?.ville || ''}
            onChange={(e) => updateIdentite('ville', e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
            placeholder="Lomé, Togo"
          />
        </div>
      </div>
    );
  };

  // Sections réutilisables
  const renderExperiences = (headingColor = '#1e293b', compactMode = isCompact) => {
    if (!Array.isArray(doc.experiences) || doc.experiences.length === 0) return null;
    return (
      <section className="space-y-3">
        <h3
          className="text-xs sm:text-sm font-extrabold tracking-wider uppercase flex items-center justify-between"
          style={{ color: headingColor }}
        >
          <span>Expériences Professionnelles</span>
          <span className="text-[10px] lowercase font-normal opacity-60">éditable</span>
        </h3>

        <div className="space-y-3">
          {doc.experiences.map((exp, expIdx) => (
            <div
              key={expIdx}
              className={`rounded-xl transition group ${compactMode ? 'p-1.5' : 'p-2.5 hover:bg-slate-50/70'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <input
                  type="text"
                  value={exp.poste || ''}
                  onChange={(e) => updateExperience(expIdx, 'poste', e.target.value)}
                  className="font-bold text-slate-900 text-xs sm:text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden w-full sm:w-auto flex-1 py-0.5"
                  placeholder="Intitulé du poste"
                />
                <input
                  type="text"
                  value={exp.periode || ''}
                  onChange={(e) => updateExperience(expIdx, 'periode', e.target.value)}
                  className="font-semibold text-[11px] sm:text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden sm:text-right py-0.5"
                  style={{ color: accent }}
                  placeholder="2022 - Présent"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                <input
                  type="text"
                  value={exp.employeur || ''}
                  onChange={(e) => updateExperience(expIdx, 'employeur', e.target.value)}
                  className="font-medium italic bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
                  placeholder="Entreprise"
                />
                {exp.lieu !== undefined && (
                  <>
                    <span>—</span>
                    <input
                      type="text"
                      value={exp.lieu || ''}
                      onChange={(e) => updateExperience(expIdx, 'lieu', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
                      placeholder="Ville, Pays"
                    />
                  </>
                )}
              </div>

              {/* Points d'impacts */}
              <ul className="mt-2 space-y-1.5 pl-3 border-l-2 border-slate-200">
                {exp.points?.map((pt, ptIdx) => (
                  <li key={ptIdx} className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed group/item">
                    <span className="text-slate-400 mt-1 select-none">•</span>
                    <textarea
                      rows={2}
                      value={pt}
                      onChange={(e) => updateExperiencePoint(expIdx, ptIdx, e.target.value)}
                      className="flex-1 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-md p-1 text-xs focus:outline-hidden resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeExperiencePoint(expIdx, ptIdx)}
                      className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                      title="Supprimer ce point"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => addExperiencePoint(expIdx)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer py-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Ajouter une réalisation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderFormations = (headingColor = '#1e293b') => {
    if (!Array.isArray(doc.formations) || doc.formations.length === 0) return null;
    return (
      <section className="space-y-3">
        <h3
          className="text-xs sm:text-sm font-extrabold tracking-wider uppercase"
          style={{ color: headingColor }}
        >
          Formations & Diplômes
        </h3>

        <div className="space-y-2">
          {doc.formations.map((f, fIdx) => (
            <div key={fIdx} className="p-2 rounded-xl hover:bg-slate-50/70 transition">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <input
                  type="text"
                  value={f.diplome || ''}
                  onChange={(e) => updateFormation(fIdx, 'diplome', e.target.value)}
                  className="font-bold text-slate-900 text-xs sm:text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden flex-1 py-0.5"
                  placeholder="Nom du diplôme ou certification"
                />
                <input
                  type="text"
                  value={f.annee || ''}
                  onChange={(e) => updateFormation(fIdx, 'annee', e.target.value)}
                  className="font-semibold text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden sm:text-right py-0.5"
                  style={{ color: accent }}
                  placeholder="Année"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                <input
                  type="text"
                  value={f.etablissement || ''}
                  onChange={(e) => updateFormation(fIdx, 'etablissement', e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
                  placeholder="Établissement / Université"
                />
                {f.lieu && (
                  <>
                    <span>—</span>
                    <input
                      type="text"
                      value={f.lieu || ''}
                      onChange={(e) => updateFormation(fIdx, 'lieu', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden text-xs py-0.5"
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderCompetencesPills = (darkBg = false) => {
    if (!showComp) return null;
    return (
      <section className="space-y-2">
        <h4
          className={`text-xs font-bold uppercase tracking-wider ${
            darkBg ? 'text-white/90' : 'text-slate-800'
          }`}
        >
          Compétences
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {doc.competences.map((c, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                darkBg
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <input
                type="text"
                value={c}
                onChange={(e) => updateCompetence(i, e.target.value)}
                className="bg-transparent border-none focus:outline-hidden text-xs min-w-[50px] w-auto"
              />
              <button
                type="button"
                onClick={() => removeCompetence(i)}
                className="opacity-50 hover:opacity-100 cursor-pointer ml-0.5"
                title="Supprimer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </section>
    );
  };

  const renderLanguesAndCentres = (darkBg = false) => {
    return (
      <div className="space-y-4">
        {showLang && (
          <section className="space-y-1.5">
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                darkBg ? 'text-white/90' : 'text-slate-800'
              }`}
            >
              Langues
            </h4>
            <div className="space-y-1 text-xs">
              {doc.langues.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={l.langue}
                    onChange={(e) => updateLangue(i, 'langue', e.target.value)}
                    className={`font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden text-xs ${
                      darkBg ? 'text-white' : 'text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    value={l.niveau}
                    onChange={(e) => updateLangue(i, 'niveau', e.target.value)}
                    className={`text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden text-[11px] ${
                      darkBg ? 'text-white/80' : 'text-slate-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {showCentres && (
          <section className="space-y-1.5">
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                darkBg ? 'text-white/90' : 'text-slate-800'
              }`}
            >
              Centres d'intérêt
            </h4>
            <div className="flex flex-wrap gap-1 text-xs">
              {doc.centres_interet.map((ci, i) => (
                <input
                  key={i}
                  type="text"
                  value={ci}
                  onChange={(e) => updateCentreInteret(i, e.target.value)}
                  className={`bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden text-xs mr-2 ${
                    darkBg ? 'text-white/90' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  // ==========================================================================
  // DISPOSITION SELON LE MODÈLE SÉLECTIONNÉ
  // ==========================================================================

  return (
    <div
      className={`w-full bg-white text-slate-900 rounded-3xl shadow-md border border-slate-200/90 overflow-hidden transition-all duration-200 ${fontClass} ${
        isCompact ? 'text-[12px] p-5 sm:p-7' : 'text-sm p-6 sm:p-9'
      }`}
      style={{ minHeight: '800px' }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. CLASSIQUE */}
      {/* ------------------------------------------------------------------ */}
      {options.templateId === 'classique' && (
        <div className="space-y-5">
          {/* En-tête centré */}
          <div className="text-center space-y-2 pb-2">
            {renderPhoto('w-20 h-20 mx-auto')}
            <input
              type="text"
              value={doc.identite?.nom || ''}
              onChange={(e) => updateIdentite('nom', e.target.value)}
              className="w-full text-center text-2xl sm:text-3xl font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden tracking-tight"
              placeholder="Ton nom complet"
            />
            <input
              type="text"
              value={doc.identite?.titre_vise || ''}
              onChange={(e) => updateIdentite('titre_vise', e.target.value)}
              className="w-full text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden"
              style={{ color: accent }}
              placeholder="Titre visé (ex: RESPONSABLE COMMERCIAL)"
            />
            {renderContactRow('center')}
            <div className="w-full h-0.5 mt-3" style={{ backgroundColor: accent }} />
          </div>

          {/* Résumé */}
          {doc.resume && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Profil Professionnel
              </h3>
              <textarea
                rows={3}
                value={doc.resume}
                onChange={(e) => updateResume(e.target.value)}
                className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-xl p-2 text-xs sm:text-sm text-slate-700 leading-relaxed focus:outline-hidden"
              />
            </div>
          )}

          {/* Expériences */}
          {renderExperiences('#1e293b')}

          {/* Formations */}
          {renderFormations('#1e293b')}

          {/* Compétences & Compléments */}
          {(showComp || showLang || showCentres) && (
            <div className="pt-3 border-t border-slate-100 space-y-4">
              {renderCompetencesPills(false)}
              {renderLanguesAndCentres(false)}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. BARRE LATÉRALE */}
      {/* ------------------------------------------------------------------ */}
      {options.templateId === 'barre-laterale' && (
        <div className="-m-6 sm:-m-9 flex flex-col md:flex-row min-h-[800px]">
          {/* Colonne latérale 32% teintée */}
          <div
            className="md:w-[32%] p-6 text-white space-y-6 shrink-0"
            style={{ backgroundColor: accent }}
          >
            {renderPhoto('w-24 h-24 mx-auto')}

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/90 border-b border-white/20 pb-1">
                Contact
              </h4>
              <div className="space-y-2 text-xs text-white/95">
                <input
                  type="email"
                  value={doc.identite?.email || ''}
                  onChange={(e) => updateIdentite('email', e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 focus:border-white focus:outline-hidden text-xs py-0.5 text-white placeholder-white/60"
                  placeholder="email"
                />
                <input
                  type="text"
                  value={doc.identite?.telephone || ''}
                  onChange={(e) => updateIdentite('telephone', e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 focus:border-white focus:outline-hidden text-xs py-0.5 text-white placeholder-white/60"
                  placeholder="téléphone"
                />
                <input
                  type="text"
                  value={doc.identite?.ville || ''}
                  onChange={(e) => updateIdentite('ville', e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 focus:border-white focus:outline-hidden text-xs py-0.5 text-white placeholder-white/60"
                  placeholder="ville"
                />
              </div>
            </div>

            {renderCompetencesPills(true)}
            {renderLanguesAndCentres(true)}
          </div>

          {/* Colonne principale 68% blanche */}
          <div className="md:w-[68%] p-6 sm:p-8 space-y-5 bg-white">
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <input
                type="text"
                value={doc.identite?.nom || ''}
                onChange={(e) => updateIdentite('nom', e.target.value)}
                className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.identite?.titre_vise || ''}
                onChange={(e) => updateIdentite('titre_vise', e.target.value)}
                className="w-full text-xs sm:text-sm font-bold uppercase tracking-wider bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden"
                style={{ color: accent }}
              />
            </div>

            {doc.resume && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Profil
                </h3>
                <textarea
                  rows={3}
                  value={doc.resume}
                  onChange={(e) => updateResume(e.target.value)}
                  className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-xl p-2 text-xs sm:text-sm text-slate-700 leading-relaxed focus:outline-hidden"
                />
              </div>
            )}

            {renderExperiences('#1e293b')}
            {renderFormations('#1e293b')}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. BANDEAU */}
      {/* ------------------------------------------------------------------ */}
      {options.templateId === 'bandeau' && (
        <div className="space-y-6">
          {/* Grand bandeau coloré supérieur */}
          <div
            className="-mx-6 sm:-mx-9 -mt-6 sm:-mt-9 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ backgroundColor: accent }}
          >
            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <input
                type="text"
                value={doc.identite?.nom || ''}
                onChange={(e) => updateIdentite('nom', e.target.value)}
                className="w-full text-2xl sm:text-3xl font-black text-white bg-transparent border-b border-white/20 focus:border-white focus:outline-hidden tracking-tight"
              />
              <input
                type="text"
                value={doc.identite?.titre_vise || ''}
                onChange={(e) => updateIdentite('titre_vise', e.target.value)}
                className="w-full text-xs sm:text-sm font-bold uppercase tracking-wider bg-transparent border-b border-white/20 focus:border-white focus:outline-hidden text-amber-200"
              />
              <div className="flex flex-wrap gap-3 text-xs text-white/90 pt-1 justify-center sm:justify-start">
                <span>{doc.identite?.email}</span>
                <span>•</span>
                <span>{doc.identite?.telephone}</span>
                <span>•</span>
                <span>{doc.identite?.ville}</span>
              </div>
            </div>

            {renderPhoto('w-20 h-20 sm:w-24 sm:h-24')}
          </div>

          {/* 2 Colonnes en dessous */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            <div className="md:col-span-8 space-y-5">
              {doc.resume && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
                    Profil
                  </h3>
                  <textarea
                    rows={3}
                    value={doc.resume}
                    onChange={(e) => updateResume(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed focus:outline-hidden"
                  />
                </div>
              )}
              {renderExperiences(accent)}
              {renderFormations(accent)}
            </div>

            <div className="md:col-span-4 space-y-6 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
              {renderCompetencesPills(false)}
              {renderLanguesAndCentres(false)}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. MINIMAL */}
      {/* ------------------------------------------------------------------ */}
      {options.templateId === 'minimal' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Header épuré avec espacements généreux */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1 flex-1">
              <input
                type="text"
                value={doc.identite?.nom || ''}
                onChange={(e) => updateIdentite('nom', e.target.value)}
                className="w-full text-2xl font-light tracking-wide text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.identite?.titre_vise || ''}
                onChange={(e) => updateIdentite('titre_vise', e.target.value)}
                className="w-full text-xs uppercase tracking-widest text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden"
              />
              {renderContactRow('left')}
            </div>

            {renderPhoto('w-16 h-16')}
          </div>

          {doc.resume && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  Profil
                </h3>
              </div>
              <textarea
                rows={3}
                value={doc.resume}
                onChange={(e) => updateResume(e.target.value)}
                className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-xl p-2 text-xs sm:text-sm text-slate-600 leading-relaxed focus:outline-hidden"
              />
            </div>
          )}

          {renderExperiences('#475569')}
          {renderFormations('#475569')}

          {(showComp || showLang || showCentres) && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              {renderCompetencesPills(false)}
              {renderLanguesAndCentres(false)}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. CHRONOLOGIE */}
      {/* ------------------------------------------------------------------ */}
      {options.templateId === 'chronologie' && (
        <div className="space-y-6">
          <div className="text-center space-y-2 pb-4 border-b border-slate-100">
            {renderPhoto('w-20 h-20 mx-auto')}
            <input
              type="text"
              value={doc.identite?.nom || ''}
              onChange={(e) => updateIdentite('nom', e.target.value)}
              className="w-full text-center text-2xl sm:text-3xl font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden"
            />
            <input
              type="text"
              value={doc.identite?.titre_vise || ''}
              onChange={(e) => updateIdentite('titre_vise', e.target.value)}
              className="w-full text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden"
              style={{ color: accent }}
            />
            {renderContactRow('center')}
          </div>

          {doc.resume && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <textarea
                rows={2}
                value={doc.resume}
                onChange={(e) => updateResume(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-hidden resize-none"
              />
            </div>
          )}

          {/* Timeline verticale avec pastilles */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: accent }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <span>Parcours Professionnel</span>
              </h3>

              <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-5">
                {doc.experiences?.map((exp, idx) => (
                  <div key={idx} className="relative group">
                    <span
                      className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <input
                        type="text"
                        value={exp.poste}
                        onChange={(e) => updateExperience(idx, 'poste', e.target.value)}
                        className="font-bold text-slate-900 text-xs sm:text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={exp.periode}
                        onChange={(e) => updateExperience(idx, 'periode', e.target.value)}
                        className="font-semibold text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-hidden sm:text-right"
                        style={{ color: accent }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 italic mt-0.5">
                      {exp.employeur} {exp.lieu ? `— ${exp.lieu}` : ''}
                    </div>
                    {exp.points && (
                      <ul className="mt-2 space-y-1 text-xs text-slate-700">
                        {exp.points.map((pt, pIdx) => (
                          <li key={pIdx}>• {pt}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {renderFormations(accent)}

            {(showComp || showLang || showCentres) && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {renderCompetencesPills(false)}
                {renderLanguesAndCentres(false)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. COMPACT */}
      {/* ------------------------------------------------------------------ */}
      {options.templateId === 'compact' && (
        <div className="space-y-3.5">
          {/* Header condensé */}
          <div className="flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: accent }}>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={doc.identite?.nom || ''}
                onChange={(e) => updateIdentite('nom', e.target.value)}
                className="w-full text-xl sm:text-2xl font-black text-slate-900 bg-transparent border-none focus:outline-hidden"
              />
              <input
                type="text"
                value={doc.identite?.titre_vise || ''}
                onChange={(e) => updateIdentite('titre_vise', e.target.value)}
                className="w-full text-xs font-bold uppercase tracking-wider bg-transparent border-none focus:outline-hidden"
                style={{ color: accent }}
              />
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 pt-0.5">
                <span>{doc.identite?.email}</span>
                <span>|</span>
                <span>{doc.identite?.telephone}</span>
                <span>|</span>
                <span>{doc.identite?.ville}</span>
              </div>
            </div>
            {renderPhoto('w-14 h-14')}
          </div>

          {doc.resume && (
            <textarea
              rows={2}
              value={doc.resume}
              onChange={(e) => updateResume(e.target.value)}
              className="w-full text-xs text-slate-700 bg-transparent border border-transparent hover:border-slate-200 rounded p-1 leading-snug focus:outline-hidden resize-none"
            />
          )}

          {renderExperiences(accent, true)}
          {renderFormations(accent)}

          {showComp && (
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                Compétences (Double Colonne)
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-700">
                {doc.competences.map((c, i) => (
                  <div key={i} className="truncate">• {c}</div>
                ))}
              </div>
            </div>
          )}

          {(showLang || showCentres) && (
            <div className="pt-1 text-[11px] text-slate-600 flex flex-wrap gap-4 border-t border-slate-100">
              {showLang && (
                <div>
                  <span className="font-bold">Langues : </span>
                  {doc.langues.map((l) => `${l.langue} (${l.niveau})`).join(', ')}
                </div>
              )}
              {showCentres && (
                <div>
                  <span className="font-bold">Loisirs : </span>
                  {doc.centres_interet.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
