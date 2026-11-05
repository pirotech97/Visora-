// ===== MOTEUR DE RENDU (navigateur) : gabarit + valeurs -> page HTML complète, sans aucun script =====
// Aucune donnée saisie n'est insérée sans échappement ; les images sont des data: URL contrôlées.

export type Champ = { id: string; libelle: string; type: string; obligatoire: boolean; aide: string };
export type Groupe = { id: string; libelle: string; max: number; champs: Champ[] };
export type Modele = {
  id?: string; nom: string; type: string; gabarit: string; css: string;
  champs: Champ[]; groupes: Groupe[]; images: { id: string; role: string; description: string }[];
};
export type Valeurs = Record<string, string>;
export type Lignes = Record<string, Valeurs[]>;
export type Images = Record<string, string>; // id -> data URL (jpeg/png/webp)

const SANS_DECIMALES = ["FCFA", "XOF", "XAF", "CFA", "F CFA"];

export const echapper = (t: unknown) =>
  String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function formaterMontant(n: number, devise: string): string {
  const d = String(devise || "").trim();
  const sansDec = SANS_DECIMALES.includes(d.toUpperCase());
  const [ent, dec] = (sansDec ? Math.round(n).toString() : n.toFixed(2)).split(".");
  const milliers = ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${milliers}${dec ? "," + dec : ""}${d ? " " + d : ""}`;
}

// Calculs d'une facture ou d'un devis (toujours faits par le code)
export function calculerTotaux(v: Valeurs, lignes: Valeurs[]) {
  const devise = v.devise || "";
  const lignesCalc = lignes.map((l) => {
    const brut = num(l.quantite || "1") * num(l.prix_unitaire);
    return brut * (1 - Math.min(100, Math.max(0, num(l.remise_pct))) / 100);
  });
  const sous = lignesCalc.reduce((a, b) => a + b, 0);
  const remise = sous * Math.min(100, Math.max(0, num(v.remise_globale_pct))) / 100;
  const base = sous - remise;
  const tva = base * Math.max(0, num(v.tva_taux)) / 100;
  const ttc = base + tva;
  const reste = ttc - Math.max(0, num(v.acompte));
  const f = (n: number) => formaterMontant(n, devise);
  return {
    lignes: lignesCalc.map(f),
    hauts: {
      sous_total_ht: f(sous), remise_globale: remise > 0 ? f(remise) : "", base_ht: f(base),
      tva_montant: f(tva), total_ttc: f(ttc), reste_a_payer: f(reste),
    } as Valeurs,
  };
}

function formaterValeur(champ: Champ | undefined, brut: string, devise: string): string {
  const v = String(brut ?? "").trim();
  if (!v) return "";
  if (champ?.type === "texte_long") return echapper(v).replace(/\n/g, "<br>");
  if (champ?.type === "montant" && /^[\d\s.,]+$/.test(v)) return echapper(formaterMontant(num(v), devise));
  if (champ?.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [a, m, j] = v.split("-");
    return `${j}/${m}/${a}`;
  }
  return echapper(v);
}

const RE_GROUPE = /\{\{#([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const RE_SI = /\{\{#si\s+([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/si\}\}/g;
const RE_VAR = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;

function remplirBloc(bloc: string, lire: (id: string) => string): string {
  let r = bloc;
  for (let i = 0; i < 4; i++) {            // blocs "si" éventuellement emboîtés
    const avant = r;
    r = r.replace(RE_SI, (_, id, contenu) => (lire(id) ? contenu : ""));
    if (r === avant) break;
  }
  return r.replace(RE_VAR, (_, id) => lire(id));
}

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function rendre(m: Modele, valeurs: Valeurs, lignes: Lignes, images: Images): string {
  const devise = valeurs.devise || "";
  const champsHaut = new Map(m.champs.map((c) => [c.id, c]));
  const totaux = calculerTotaux(valeurs, lignes.lignes ?? []);

  const lireHaut = (id: string) => {
    if (id in totaux.hauts) return totaux.hauts[id];
    return formaterValeur(champsHaut.get(id), valeurs[id] ?? "", devise);
  };

  let html = m.gabarit.replace(RE_GROUPE, (_, gid, contenu) => {
    const g = m.groupes.find((x) => x.id === gid);
    if (!g) return "";
    const rangees = (lignes[gid] ?? []).slice(0, g.max)
      .filter((r) => g.champs.some((c) => String(r[c.id] ?? "").trim() !== ""));
    const champsG = new Map(g.champs.map((c) => [c.id, c]));
    return rangees.map((r, i) => remplirBloc(contenu, (id) => {
      if (id === "total_ligne") return gid === "lignes" ? (totaux.lignes[i] ?? "") : "";
      return formaterValeur(champsG.get(id), r[id] ?? "", devise);
    })).join("");
  });
  html = remplirBloc(html, lireHaut);

  // Images : emplacement rempli seulement avec une image fournie et valide, sinon retiré
  html = html.replace(/<img([^>]*?)data-slot="([a-z][a-z0-9_]*)"([^>]*)>/g, (_, avant, id, apres) => {
    const url = images[id];
    return url && DATA_IMAGE.test(url) && url.length < 4_000_000
      ? `<img${avant}src="${url}"${apres}>` : "";
  });

  return html;
}

// Page complète pour un iframe sandbox (pas de scripts, CSP stricte)
export function pageComplete(m: Modele, corps: string): string {
  const paysage = /(^|[;{\s])width\s*:\s*297mm/.test(m.css);   // affiche A4 paysage
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page { size: A4 ${paysage ? "landscape" : "portrait"}; margin: 0 }
html, body { margin: 0; padding: 0; background: #e5e7eb }
.gabarit { background: #fff; margin: 0 auto; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.gabarit * { box-sizing: border-box }
@media print { html, body { background: #fff } }
${m.css}
</style></head><body><div class="gabarit">${corps}</div></body></html>`;
}

// Champs de saisie qui manquent (pour bloquer avant l'aperçu)
export function champsManquants(m: Modele, v: Valeurs, l: Lignes): string[] {
  const man = m.champs.filter((c) => c.obligatoire && !String(v[c.id] ?? "").trim()).map((c) => c.libelle);
  for (const g of m.groupes) {
    const obligatoires = g.champs.filter((c) => c.obligatoire);
    if (!obligatoires.length) continue;
    const lignes = (l[g.id] ?? []).filter((r) => g.champs.some((c) => String(r[c.id] ?? "").trim() !== ""));
    if (lignes.length === 0) man.push(g.libelle);
    else if (lignes.some((r) => obligatoires.some((c) => !String(r[c.id] ?? "").trim()))) man.push(g.libelle);
  }
  return man;
}
