// ===== EXPORT DES DOCUMENTS (navigateur) : PDF, Word (.docx) et image PNG =====
// Tout se fait sur l'appareil de l'utilisateur : gratuit, rien n'est envoyé au serveur.
// Les bibliothèques (html2canvas, jspdf, docx) sont passées en paramètre : l'appli les charge à la demande avec import().

export const TYPE_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** L'élément qui représente la feuille dans l'aperçu (l'iframe de pageComplete). */
export function elementFeuille(iframe: HTMLIFrameElement): HTMLElement | null {
  const doc = iframe.contentDocument;
  if (!doc) return null;
  const g = doc.querySelector(".gabarit");
  return ((g?.firstElementChild as HTMLElement | null) ?? (g as HTMLElement | null));
}

export const estPaysage = (css: string) => /(^|[;{\s])width\s*:\s*297mm/.test(css);

export function nomFichier(nom: string, ext: string): string {
  const propre = String(nom || "document").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "document";
  return `${propre}.${ext}`;
}

export function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// ---------------------------------------------------------------- image (PNG) et PDF
export async function genererCanvas(feuille: HTMLElement, html2canvas: any): Promise<HTMLCanvasElement> {
  return await html2canvas(feuille, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: false });
}

export function canvasVersPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG_VIDE"))), "image/png"));
}

/** PDF A4 : la feuille est capturée en haute définition et découpée en pages si elle dépasse. */
export function canvasVersPdf(canvas: HTMLCanvasElement, JsPDF: any, paysage: boolean): Blob {
  const pdf = new JsPDF({ unit: "mm", format: "a4", orientation: paysage ? "landscape" : "portrait", compress: true });
  const L = paysage ? 297 : 210, H = paysage ? 210 : 297;
  const hauteurPage = Math.round((canvas.width * H) / L);          // pixels de canvas par page PDF
  let y = 0, n = 0;
  while (canvas.height - y > hauteurPage * 0.01 && n < 20) {     // un reste de 1 % ne fait pas une page blanche
    const h = Math.min(hauteurPage, canvas.height - y);
    const tranche = document.createElement("canvas");
    tranche.width = canvas.width; tranche.height = h;
    const ctx = tranche.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, tranche.width, h);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (n > 0) pdf.addPage();
    pdf.addImage(tranche.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, L, (h * L) / canvas.width);
    y += h; n++;
  }
  return pdf.output("blob");
}

// ---------------------------------------------------------------- Word
const rgbVersHex = (c: string): string | null => {
  const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;          // transparent
  return "#" + [m[1], m[2], m[3]].map((v) => Math.min(255, +v).toString(16).padStart(2, "0")).join("");
};
const px = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

/**
 * Word ne lit ni les feuilles de style ni flex/grid : on copie donc les styles calculés en style en ligne,
 * puis on transforme les rangées flex et les grilles en tableaux, et on retire le fond/marge de la page
 * (les marges de la page deviennent les marges du document Word).
 */
export function preparerPourWord(feuille: HTMLElement): { racine: HTMLElement; marges: { top: number; right: number; bottom: number; left: number }; } {
  const doc = feuille.ownerDocument, vue = doc.defaultView!;
  const clone = feuille.cloneNode(true) as HTMLElement;
  const orig = [feuille, ...Array.from(feuille.querySelectorAll<HTMLElement>("*"))];
  const copie = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  const marges = { top: 0, right: 0, bottom: 0, left: 0 };

  orig.forEach((o, i) => {
    const c = copie[i];
    const cs = vue.getComputedStyle(o);
    if (cs.display === "none") { c.setAttribute("data-retirer", "1"); return; }
    const s: string[] = [];
    const ajout = (k: string, v: string | null | undefined) => { if (v) s.push(`${k}:${v}`); };
    const tag = o.tagName.toLowerCase();

    ajout("color", rgbVersHex(cs.color));
    const fond = rgbVersHex(cs.backgroundColor);
    if (i > 0) ajout("background-color", fond);
    ajout("font-family", cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());
    ajout("font-size", `${px(cs.fontSize)}px`);
    if (parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === "bold") ajout("font-weight", "bold");
    if (cs.fontStyle === "italic") ajout("font-style", "italic");
    if (cs.textDecorationLine.includes("underline")) ajout("text-decoration", "underline");
    if (["left", "right", "center", "justify"].includes(cs.textAlign)) ajout("text-align", cs.textAlign);
    if (cs.textTransform === "uppercase") ajout("text-transform", "uppercase");
    if (tag === "td" || tag === "th") ajout("vertical-align", cs.verticalAlign === "middle" ? "middle" : cs.verticalAlign === "bottom" ? "bottom" : "top");

    if (i === 0) {                       // la feuille : son padding devient les marges du document
      marges.top = px(cs.paddingTop); marges.right = px(cs.paddingRight);
      marges.bottom = px(cs.paddingBottom); marges.left = px(cs.paddingLeft);
    } else {
      for (const cote of ["Top", "Right", "Bottom", "Left"]) {
        const p = px((cs as any)[`padding${cote}`]); if (p) ajout(`padding-${cote.toLowerCase()}`, `${p}px`);
        const m = px((cs as any)[`margin${cote}`]); if (m > 0) ajout(`margin-${cote.toLowerCase()}`, `${m}px`);
        const bw = px((cs as any)[`border${cote}Width`]), bs = (cs as any)[`border${cote}Style`];
        if (bw > 0 && bs !== "none") {
          ajout(`border-${cote.toLowerCase()}`, `${Math.max(1, Math.round(bw))}px ${bs === "dashed" || bs === "dotted" ? bs : "solid"} ${rgbVersHex((cs as any)[`border${cote}Color`]) ?? "#000000"}`);
        }
      }
    }
    if (tag === "img") {
      const r = o.getBoundingClientRect();
      c.setAttribute("width", String(Math.round(r.width))); c.setAttribute("height", String(Math.round(r.height)));
      ajout("width", `${Math.round(r.width)}px`); ajout("height", `${Math.round(r.height)}px`);
    }
    c.removeAttribute("class"); c.removeAttribute("id");
    c.setAttribute("style", s.join(";"));
    (c as any).__disp = cs.display; (c as any).__dir = cs.flexDirection; (c as any).__gap = px(cs.columnGap) || px(cs.gap);
    (c as any).__cols = cs.gridTemplateColumns;
    if (tag !== "img") {
      const r0 = o.getBoundingClientRect();
      (c as any).__lefts = Array.from(o.children).map((e) => (e as HTMLElement).getBoundingClientRect().left);
      (c as any).__droite = r0.right - px(cs.paddingRight) - px(cs.borderRightWidth);
    }
  });

  clone.querySelectorAll("[data-retirer]").forEach((e) => e.remove());

  // rangées flex et grilles -> tableaux (du plus profond au plus haut)
  for (let i = copie.length - 1; i >= 1; i--) {
    const c = copie[i];
    if (!clone.contains(c)) continue;                    // retiré avec un parent (display:none)
    const disp: string = (c as any).__disp;
    if (!disp) continue;
    const enfants = Array.from(c.children) as HTMLElement[];
    const gap: number = (c as any).__gap || 0;
    if (disp.includes("flex") && (c as any).__dir !== "column" && (c as any).__dir !== "column-reverse" && enfants.length > 1) {
      const lefts = (((c as any).__lefts as number[]) ?? []).slice(0, enfants.length);
      const droite: number = (c as any).__droite ?? 0;
      const rects = lefts.map((l, k) => Math.max(1, (k < lefts.length - 1 ? lefts[k + 1] : droite) - l));   // largeur de chaque colonne = distance entre les départs
      const total = rects.reduce((a, b2) => a + b2, 0) || 1;
      const table = doc.createElement("table");
      table.setAttribute("style", "width:100%;border-collapse:collapse");
      const tr = doc.createElement("tr");
      enfants.forEach((e, k) => {
        const td = doc.createElement("td");
        td.setAttribute("style", `vertical-align:top;width:${Math.max(1, Math.round((rects[k] / total) * 100))}%;padding-right:${k < enfants.length - 1 ? gap : 0}px`);
        td.appendChild(e); tr.appendChild(td);
      });
      table.appendChild(tr); c.replaceChildren(table);
    } else if (disp.includes("grid") && enfants.length > 0) {
      const cols = String((c as any).__cols || "").split(/\s+/).filter((v) => /px$/.test(v)).map(px);
      const n = Math.max(1, cols.length), total = cols.reduce((a, b) => a + b, 0) || 1;
      const table = doc.createElement("table");
      table.setAttribute("style", "width:100%;border-collapse:collapse");
      for (let k = 0; k < enfants.length; k += n) {
        const tr = doc.createElement("tr");
        for (let j = 0; j < n; j++) {
          const td = doc.createElement("td");
          td.setAttribute("style", `vertical-align:top;width:${Math.max(1, Math.round(((cols[j] ?? total / n) / total) * 100))}%;padding-right:${j < n - 1 ? gap : 0}px;padding-bottom:${gap}px`);
          if (enfants[k + j]) td.appendChild(enfants[k + j]);
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      c.replaceChildren(table);
    } else if (disp.includes("flex") && gap > 0) {
      enfants.forEach((e, k) => { if (k < enfants.length - 1) e.style.marginBottom = `${gap}px`; });
    }
    if (disp.includes("flex") || disp.includes("grid")) c.style.display = "block";
  }

  // la racine : plus de fond ni de marge (ils sont portés par le document)
  clone.style.backgroundColor = ""; clone.style.padding = "0";
  return { racine: clone, marges };
}

// ---------------------------------------------------------------- Word : vrai fichier .docx (bibliothèque « docx »)
const PX_VERS_TWIP = 15;                                            // 1 px = 15 twips (96 dpi)
const BLOCS = new Set(["div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "section", "article", "header", "footer", "main", "hr", "blockquote", "figure", "form", "pre"]);
const estBloc = (n: Node) => n.nodeType === 1 && BLOCS.has((n as Element).tagName.toLowerCase());
const px2 = (v: string | null | undefined) => { const n = parseFloat(v ?? ""); return Number.isFinite(n) ? n : 0; };
const hexSansDiese = (c: string | null | undefined): string | null => {      // accepte « #2563eb » et « rgb(37, 99, 235) » (le navigateur réécrit les couleurs en rgb)
  if (!c) return null;
  const h = c.trim().match(/^#([0-9a-f]{6})$/i); if (h) return h[1].toUpperCase();
  const r = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (!r || (r[4] !== undefined && parseFloat(r[4]) === 0)) return null;
  return [r[1], r[2], r[3]].map((v) => Math.min(255, +v).toString(16).padStart(2, "0")).join("").toUpperCase();
};
const lireBordure = (valeur: string | null | undefined): { largeur: number; style: string; couleur: string } | null => {
  const m = (valeur ?? "").match(/^(\d+(?:\.\d+)?)px\s+(solid|dashed|dotted)\s+(.+)$/i);
  const couleur = m ? hexSansDiese(m[3]) : null;
  return m && couleur ? { largeur: parseFloat(m[1]), style: m[2].toLowerCase(), couleur } : null;
};
const POLICES: Record<string, string> = { "sans-serif": "Arial", "system-ui": "Arial", "-apple-system": "Arial", "ui-sans-serif": "Arial", serif: "Times New Roman", monospace: "Courier New", "ui-serif": "Times New Roman" };
const police = (f: string) => { const n = (f || "").trim(); return POLICES[n.toLowerCase()] ?? (n || "Arial"); };

type Ctx = { D: any; avant: number; retrait: number; fond: string | null; largeurMax: number; images: Map<string, { data: Uint8Array; type: string; w: number; h: number }> };

function octets(dataUrl: string): { data: Uint8Array; mime: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  const bin = atob(m[2].replace(/\s/g, ""));
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data, mime: m[1].toLowerCase() };
}

/** Word n'accepte que png, jpeg, gif, bmp : les autres images (webp…) passent par un canvas. */
async function preparerImages(racine: HTMLElement, ctx: Ctx) {
  for (const img of Array.from(racine.querySelectorAll("img"))) {
    const src = img.getAttribute("src") ?? "";
    let o = octets(src), type = o?.mime.includes("png") ? "png" : o?.mime.includes("jpeg") || o?.mime.includes("jpg") ? "jpg" : o?.mime.includes("gif") ? "gif" : "";
    if (o && !type) {
      const el = new Image(); el.src = src;
      try {
        await el.decode();
        const c = document.createElement("canvas"); c.width = el.naturalWidth; c.height = el.naturalHeight;
        c.getContext("2d")!.drawImage(el, 0, 0);
        o = octets(c.toDataURL("image/png")); type = "png";
      } catch { o = null; }
    }
    if (!o || !type) { img.setAttribute("data-retirer", "1"); continue; }
    const w = px2(img.getAttribute("width")) || 100, h = px2(img.getAttribute("height")) || 100;
    ctx.images.set(src, { data: o.data, type, w, h });
  }
  racine.querySelectorAll("[data-retirer]").forEach((e) => e.remove());
}

function runs(el: Element, ctx: Ctx, base?: HTMLElement): any[] {
  const { TextRun, ImageRun } = ctx.D;
  const sortie: any[] = [];
  const styleDe = (e: HTMLElement) => {
    const st = e.style;
    const o: any = {
      font: police(st.fontFamily), size: Math.max(2, Math.round(px2(st.fontSize) * 1.5)),
      bold: st.fontWeight === "bold", italics: st.fontStyle === "italic",
      allCaps: st.textTransform === "uppercase",
    };
    const c = hexSansDiese(st.color); if (c) o.color = c;
    if (st.textDecoration?.includes("underline")) o.underline = {};
    return o;
  };
  const parcourir = (n: Node, courant: HTMLElement) => {
    if (n.nodeType === 3) {
      const t = (n.textContent ?? "").replace(/\s+/g, " ");
      if (t) sortie.push(new TextRun({ text: t, ...styleDe(courant) }));
      return;
    }
    if (n.nodeType !== 1) return;
    const e = n as HTMLElement, tag = e.tagName.toLowerCase();
    if (tag === "br") { sortie.push(new TextRun({ break: 1 })); return; }
    if (tag === "img") {
      const info = ctx.images.get(e.getAttribute("src") ?? "");
      if (info) {
        const k = info.w > ctx.largeurMax ? ctx.largeurMax / info.w : 1;
        sortie.push(new ImageRun({ type: info.type, data: info.data, transformation: { width: Math.max(1, Math.round(info.w * k)), height: Math.max(1, Math.round(info.h * k)) } }));
      }
      return;
    }
    e.childNodes.forEach((c) => parcourir(c, e));
  };
  el.childNodes.forEach((c) => parcourir(c, (base ?? el) as HTMLElement));
  return sortie;
}

function paragraphe(el: HTMLElement, ctx: Ctx, contenu: any[], extra: any = {}) {
  const { Paragraph, AlignmentType, BorderStyle, ShadingType } = ctx.D;
  const st = el.style;
  const dansCellule = /^t[dh]$/i.test(el.tagName);               // la cellule porte déjà ses marges, son fond et ses bordures
  const align = st.textAlign === "center" ? AlignmentType.CENTER : st.textAlign === "right" ? AlignmentType.RIGHT : st.textAlign === "justify" ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
  const avant = dansCellule ? 0 : Math.round((ctx.avant + px2(st.marginTop)) * PX_VERS_TWIP);
  ctx.avant = 0;
  const apres = dansCellule ? 0 : Math.round(px2(st.marginBottom) * PX_VERS_TWIP);
  const o: any = {
    children: contenu, alignment: align,
    spacing: { before: Math.min(avant, 1500), after: Math.min(apres, 1500) },
    indent: { left: dansCellule ? 0 : Math.round((ctx.retrait + px2(st.marginLeft) + px2(st.paddingLeft)) * PX_VERS_TWIP) },
    ...extra,
  };
  const fond = dansCellule ? null : (hexSansDiese(st.backgroundColor) ?? ctx.fond);
  if (fond && fond !== "FFFFFF") o.shading = { type: ShadingType.CLEAR, fill: fond, color: "auto" };
  const bord = (cote: string) => {
    const m = lireBordure(st.getPropertyValue(`border-${cote.toLowerCase()}`));
    return m ? { style: m.style === "dashed" ? BorderStyle.DASHED : m.style === "dotted" ? BorderStyle.DOTTED : BorderStyle.SINGLE, size: Math.max(2, Math.round(m.largeur * 6)), color: m.couleur, space: 1 } : undefined;
  };
  const bordures: any = {};
  for (const [c, k] of dansCellule ? [] as any : [["Top", "top"], ["Right", "right"], ["Bottom", "bottom"], ["Left", "left"]] as const) { const b = bord(c); if (b) bordures[k] = b; }
  if (Object.keys(bordures).length) o.border = bordures;
  return new Paragraph(o);
}

function blocs(el: HTMLElement, ctx: Ctx): any[] {
  const sortie: any[] = [];
  let tampon: Node[] = [];
  const vider = () => {
    if (!tampon.length) return;
    const fictif = el.ownerDocument.createElement("span");
    tampon.forEach((n) => fictif.appendChild(n.cloneNode(true)));
    const texte = (fictif.textContent ?? "").trim();
    if (texte || fictif.querySelector("img")) {
      const r = runs(fictif, ctx, el);
      if (r.length) sortie.push(paragraphe(el, ctx, r));
    }
    tampon = [];
  };
  el.childNodes.forEach((n) => {
    if (!estBloc(n)) { if (n.nodeType === 3 || n.nodeType === 1) tampon.push(n); return; }
    vider();
    sortie.push(...bloc(n as HTMLElement, ctx));
  });
  vider();
  return sortie;
}

function bloc(e: HTMLElement, ctx: Ctx): any[] {
  const tag = e.tagName.toLowerCase(), st = e.style, { Paragraph, BorderStyle } = ctx.D;
  if (tag === "hr") { ctx.avant += 4; return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } }, spacing: { after: 80 } })]; }
  if (tag === "table") return tableau(e, ctx);
  if (tag === "ul" || tag === "ol") {
    const sortie: any[] = []; let n = 0;
    Array.from(e.children).forEach((li) => {
      if (li.tagName.toLowerCase() !== "li") return;
      n++;
      const r = runs(li, ctx);
      const pref = tag === "ol" ? `${n}. ` : "• ";
      const { TextRun } = ctx.D;
      sortie.push(paragraphe(li as HTMLElement, ctx, [new TextRun({ text: pref }), ...r], { indent: { left: Math.round((ctx.retrait + 18) * PX_VERS_TWIP), hanging: Math.round(14 * PX_VERS_TWIP) } }));
    });
    return sortie;
  }
  const contientBloc = Array.from(e.childNodes).some(estBloc);
  if (!contientBloc) {
    const r = runs(e, ctx);
    const aImage = !!e.querySelector("img");
    if (!r.length && !aImage && !(e.textContent ?? "").trim()) {
      const h = px2(st.height) + px2(st.paddingTop) + px2(st.paddingBottom) + px2(st.marginTop) + px2(st.marginBottom);
      if (h > 0) ctx.avant += Math.min(h, 100);
      return [];
    }
    return [paragraphe(e, ctx, r)];
  }
  // conteneur : ses marges, retraits et fonds s'appliquent à ce qu'il contient
  const avantRetrait = ctx.retrait, avantFond = ctx.fond;
  ctx.avant += px2(st.marginTop) + px2(st.paddingTop);
  ctx.retrait += px2(st.marginLeft) + px2(st.paddingLeft);
  const f = hexSansDiese(st.backgroundColor); if (f) ctx.fond = f;
  const interieur = blocs(e, ctx);
  const trait = (cote: string) => {
    const m = lireBordure(st.getPropertyValue(`border-${cote}`));
    if (!m) return null;
    const bord = { style: m.style === "dashed" ? BorderStyle.DASHED : m.style === "dotted" ? BorderStyle.DOTTED : BorderStyle.SINGLE, size: Math.max(2, Math.round(m.largeur * 6)), color: m.couleur, space: 1 };
    return new Paragraph({ spacing: { before: 0, after: 60, line: 20, lineRule: ctx.D.LineRuleType.EXACT }, border: cote === "top" ? { top: bord } : { bottom: bord } });
  };
  const haut = trait("top"), bas = trait("bottom");
  if (haut) interieur.unshift(haut);
  if (bas) interieur.push(bas);
  ctx.retrait = avantRetrait; ctx.fond = avantFond;
  ctx.avant += px2(st.marginBottom) + px2(st.paddingBottom);
  return interieur;
}

function tableau(t: HTMLElement, ctx: Ctx): any[] {
  const { Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, VerticalAlign, Paragraph } = ctx.D;
  const lignes = Array.from(t.querySelectorAll(":scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr")) as HTMLElement[];
  if (!lignes.length) return [];
  const aucune = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const rangees = lignes.map((tr) => {
    const cellules = (Array.from(tr.children) as HTMLElement[]).filter((c) => /^t[dh]$/i.test(c.tagName));
    return new TableRow({
      cantSplit: true,
      children: cellules.map((td) => {
        const st = td.style;
        const avantRetrait = ctx.retrait, avantFond = ctx.fond, avantAvant = ctx.avant;
        ctx.retrait = 0; ctx.avant = 0;
        let contenu = bloc2(td, ctx);
        ctx.retrait = avantRetrait; ctx.fond = avantFond; ctx.avant = avantAvant;
        if (!contenu.length || contenu[contenu.length - 1] instanceof Table) contenu = [...contenu, new Paragraph({ spacing: { after: 0 } })];
        const bord = (k: string) => {
          const m = lireBordure(st.getPropertyValue(`border-${k}`));
          return m ? { style: m.style === "dashed" ? BorderStyle.DASHED : m.style === "dotted" ? BorderStyle.DOTTED : BorderStyle.SINGLE, size: Math.max(2, Math.round(m.largeur * 6)), color: m.couleur } : aucune;
        };
        const lar = (st.width ?? "");
        const opts: any = {
          children: contenu,
          borders: { top: bord("top"), bottom: bord("bottom"), left: bord("left"), right: bord("right") },
          margins: { top: Math.round(px2(st.paddingTop) * PX_VERS_TWIP), bottom: Math.round(px2(st.paddingBottom) * PX_VERS_TWIP), left: Math.round(px2(st.paddingLeft) * PX_VERS_TWIP), right: Math.round(px2(st.paddingRight) * PX_VERS_TWIP) },
          verticalAlign: st.verticalAlign === "middle" ? VerticalAlign.CENTER : st.verticalAlign === "bottom" ? VerticalAlign.BOTTOM : VerticalAlign.TOP,
        };
        if (/%$/.test(lar)) opts.width = { size: Math.round(parseFloat(lar)), type: WidthType.PERCENTAGE };
        else if (/px$/.test(lar)) opts.width = { size: Math.round(parseFloat(lar) * PX_VERS_TWIP), type: WidthType.DXA };
        const cs = parseInt(td.getAttribute("colspan") ?? "1", 10); if (cs > 1) opts.columnSpan = cs;
        const fill = hexSansDiese(st.backgroundColor); if (fill && fill !== "FFFFFF") opts.shading = { type: ShadingType.CLEAR, fill, color: "auto" };
        return new TableCell(opts);
      }),
    });
  });
  const ts = t.style;
  const lt = ts.width ?? "";
  const largeur = /px$/.test(lt) && parseFloat(lt) < ctx.largeurMax * 0.98
    ? { size: Math.round(parseFloat(lt) * PX_VERS_TWIP), type: WidthType.DXA } : { size: 100, type: WidthType.PERCENTAGE };
  ctx.avant += px2(ts.marginTop);
  return [new Table({ rows: rangees, width: largeur, borders: { top: aucune, bottom: aucune, left: aucune, right: aucune, insideHorizontal: aucune, insideVertical: aucune } })];
}
const bloc2 = (el: HTMLElement, ctx: Ctx) => blocs(el, ctx);

export async function genererWord(feuille: HTMLElement, docx: any, opts: { titre: string; paysage: boolean }): Promise<Blob> {
  const { racine, marges } = preparerPourWord(feuille);
  const borne = (v: number) => Math.min(2400, Math.max(567, Math.round(v * PX_VERS_TWIP)));        // de 1 cm à 4,2 cm
  const pageLarg = opts.paysage ? 1123 : 794;
  const ctx: Ctx = { D: docx, avant: 0, retrait: 0, fond: null, largeurMax: Math.max(200, pageLarg - marges.left - marges.right), images: new Map() };
  await preparerImages(racine, ctx);
  let enfants = blocs(racine, ctx);
  if (!enfants.length) enfants = [new docx.Paragraph({ children: [new docx.TextRun({ text: " " })] })];
  const doc = new docx.Document({
    creator: "Visorax Studio", title: opts.titre,
    styles: { default: { document: { run: { font: "Arial", size: 22 }, paragraph: { spacing: { after: 0, line: 276, lineRule: docx.LineRuleType.AUTO } } } } },
    sections: [{
      properties: { page: {
        size: { width: 11906, height: 16838, orientation: opts.paysage ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT },
        margin: { top: borne(marges.top), right: borne(marges.right), bottom: borne(marges.bottom), left: borne(marges.left), header: 0, footer: 0 },
      } },
      children: enfants,
    }],
  });
  return await docx.Packer.toBlob(doc);
}
