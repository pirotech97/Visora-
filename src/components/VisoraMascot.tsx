import React from "react";

export type VisoraMood = "normal" | "reflechit" | "content" | "desole";

type Props = {
  size?: number;        // largeur en pixels (la hauteur suit les proportions)
  mood?: VisoraMood;    // humeur : normal, reflechit, content, desole
  animated?: boolean;   // clignement des yeux et petit flottement
  decorative?: boolean; // true = ignorée par les lecteurs d'écran (à côté d'un texte)
  className?: string;
};

const CSS = `
@keyframes vm-blink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@keyframes vm-float{0%{transform:translateY(0)}100%{transform:translateY(-3px)}}
.vm-eyes{transform-box:fill-box;transform-origin:center}
.vm-anim .vm-eyes{animation:vm-blink 5s infinite}
.vm-anim .vm-body{animation:vm-float 2.6s ease-in-out infinite alternate}
@media (prefers-reduced-motion: reduce){.vm-anim .vm-eyes,.vm-anim .vm-body{animation:none}}
`;

const ENCRE = "#0f172a";

export function VisoraMascot({
  size = 48,
  mood = "normal",
  animated = true,
  decorative = true,
  className,
}: Props) {
  const dx = mood === "reflechit" ? -2 : 0;
  const dy = mood === "reflechit" ? -4 : mood === "desole" ? 3 : 0;
  const yeuxOuverts = mood !== "content";

  return (
    <svg
      viewBox="0 0 112 124"
      width={size}
      height={Math.round((size * 124) / 112)}
      className={`${animated ? "vm-anim" : ""} ${className ?? ""}`.trim()}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Visora, la mascotte"}
      focusable="false"
    >
      <style>{CSS}</style>

      {/* ombre */}
      <ellipse cx="56" cy="118" rx="30" ry="3" fill="#000" opacity="0.12" />

      <g className="vm-body">
        {/* corps : une feuille au coin plié */}
        <path
          d="M30 10 H76 L100 34 V92 Q100 110 82 110 H30 Q12 110 12 92 V28 Q12 10 30 10 Z"
          fill="#2563eb"
        />
        {/* coin plié */}
        <path d="M76 10 V26 Q76 34 84 34 H100 Z" fill="#93c5fd" />
        {/* lignes de texte */}
        <path d="M30 97 H78" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 103 H62" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />

        {/* joues */}
        {mood !== "desole" && (
          <>
            <circle cx="28" cy="74" r="5" fill="#fda4af" opacity="0.6" />
            <circle cx="84" cy="74" r="5" fill="#fda4af" opacity="0.6" />
          </>
        )}

        {/* yeux */}
        <g className="vm-eyes">
          {yeuxOuverts ? (
            <>
              <circle cx="40" cy="58" r="9.5" fill="#fff" />
              <circle cx="72" cy="58" r="9.5" fill="#fff" />
              <circle cx={41 + dx} cy={59 + dy} r="4.6" fill={ENCRE} />
              <circle cx={73 + dx} cy={59 + dy} r="4.6" fill={ENCRE} />
              <circle cx={43 + dx} cy={57 + dy} r="1.5" fill="#fff" />
              <circle cx={75 + dx} cy={57 + dy} r="1.5" fill="#fff" />
            </>
          ) : (
            <>
              <path d="M31 61 Q40 48 49 61" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              <path d="M63 61 Q72 48 81 61" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            </>
          )}
        </g>

        {/* sourcils (désolée) */}
        {mood === "desole" && (
          <>
            <path d="M31 45 L49 40" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M63 40 L81 45" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
          </>
        )}

        {/* bouche */}
        {mood === "normal" && (
          <path d="M46 78 Q56 88 66 78" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {mood === "content" && <path d="M46 76 Q56 94 66 76 Z" fill={ENCRE} stroke={ENCRE} strokeWidth="2" strokeLinejoin="round" />}
        {mood === "reflechit" && (
          <path d="M49 82 Q53 78 57 82 T65 82" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
        {mood === "desole" && (
          <path d="M47 85 Q56 77 65 85" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

/** Trois points qui rebondissent : "Visora écrit…" */
export function VisoraTyping() {
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label="Visora écrit…">
      <style>{`@keyframes vm-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}@media (prefers-reduced-motion: reduce){.vm-dot{animation:none!important;opacity:.6}}`}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="vm-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: "currentColor",
            display: "inline-block",
            animation: `vm-dot 1.2s ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
