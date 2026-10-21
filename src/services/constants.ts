// ============================================================================
// CONSTANTES DE CONFIGURATION (Faciles à modifier)
// ============================================================================

// Numéro WhatsApp pour la recharge de crédits (format international sans "+")
export const NUMERO_WHATSAPP = '22892556462';

// Texte libre des tarifs (ex: tarifs des packs de crédits). Si vide, ne rien afficher.
export const TEXTE_TARIF: string = '';

// Seuil d'alerte pour le solde bas de crédits
export const SEUIL_ALERTE = 5;

/**
 * Construit l'URL WhatsApp avec le message sur trois lignes :
 * "Bonjour, je souhaite recharger mes crédits Visora."
 * "E-mail : [e-mail de l'utilisateur]"
 * "Solde actuel : [N] crédit(s)"
 */
export function getWhatsAppRechargeUrl(email: string, credits: number = 0): string {
  const lines = [
    'Bonjour, je souhaite recharger mes crédits Visora.',
    `E-mail : ${email || ''}`,
    `Solde actuel : ${credits} crédit(s)`
  ];
  const message = lines.join('\n');
  return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Ouvre la discussion WhatsApp dans un nouvel onglet avec "_blank" et "noopener"
 */
export function openWhatsAppRecharge(email: string, credits: number = 0): void {
  const url = getWhatsAppRechargeUrl(email, credits);
  window.open(url, '_blank', 'noopener');
}
