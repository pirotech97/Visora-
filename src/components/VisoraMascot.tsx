import {
  VisoraxMascot,
  VisoraxTyping,
  type VisoraxMood
} from './VisoraxMascot';

// Rétrocompatibilité : réexportation avec les anciens noms
export type VisoraMood = VisoraxMood;
export const VisoraMascot = VisoraxMascot;
export const VisoraTyping = VisoraxTyping;

export { VisoraxMascot, VisoraxTyping };
