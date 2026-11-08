import React from 'react';
import { VisoraxMascot } from './VisoraxMascot';

export interface VisoraxLogoProps {
  variant?: 'empile' | 'ligne'; // défaut "ligne"
  theme?: 'clair' | 'sombre' | 'bleu'; // défaut "clair"
  size?: number; // hauteur de la mascotte en px, défaut 36
  showMascot?: boolean; // défaut true
  decorative?: boolean; // défaut false
  className?: string;
}

export const VisoraxLogo: React.FC<VisoraxLogoProps> = ({
  variant = 'ligne',
  theme = 'clair',
  size = 36,
  showMascot = true,
  decorative = false,
  className = ''
}) => {
  // Couleurs selon le thème
  // clair : visora en --night, x en --brand, studio en --muted
  // sombre : visora en blanc, x en --sun, studio en #CBD5E1
  // bleu : visora en blanc, x en --sun, studio en #DBEAFE
  const isClair = theme === 'clair';
  const isBleu = theme === 'bleu';

  const visoraColorClass = isClair
    ? 'text-[#0F172A] dark:text-white'
    : 'text-white';

  const xColorClass = isClair
    ? 'text-[#2563EB] dark:text-[#FFB020]'
    : 'text-[#FFB020]';

  const studioColor = isClair
    ? 'var(--muted, #475569)'
    : isBleu
    ? '#DBEAFE'
    : '#CBD5E1';

  // Calcul largeur mascotte proportionnelle (ratio 112/124)
  const mascotWidth = Math.round((size * 112) / 124);

  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Visorax Studio'}
      className={`inline-flex items-center select-none ${className}`.trim()}
    >
      {variant === 'empile' ? (
        <div className="flex items-center gap-3">
          {showMascot && (
            <VisoraxMascot
              size={mascotWidth}
              mood="normal"
              animated={false}
              decorative={true}
              inverse={isBleu}
              className="shrink-0"
            />
          )}
          <div className="flex flex-col justify-center leading-none">
            <div
              className="font-title font-bold tracking-[-0.04em] flex items-baseline leading-none"
              style={{ fontSize: `${Math.round(size * 0.72)}px` }}
            >
              <span className={visoraColorClass}>visora</span>
              <span className={xColorClass}>x</span>
            </div>
            <div
              className="font-title font-semibold uppercase tracking-[0.5em] pl-[0.1em] mt-1"
              style={{
                fontSize: `${Math.max(9, Math.round(size * 0.22))}px`,
                color: studioColor
              }}
            >
              STUDIO
            </div>
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          {showMascot && (
            <VisoraxMascot
              size={mascotWidth}
              mood="normal"
              animated={false}
              decorative={true}
              inverse={isBleu}
              className="shrink-0"
            />
          )}
          <div
            className="font-title flex items-baseline gap-1.5 leading-none"
            style={{ fontSize: `${Math.round(size * 0.58)}px` }}
          >
            <span className="font-bold tracking-[-0.04em] flex items-baseline">
              <span className={visoraColorClass}>visora</span>
              <span className={xColorClass}>x</span>
            </span>
            <span
              className="hidden sm:inline font-medium"
              style={{ color: studioColor }}
            >
              studio
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
