/**
 * Sauvegarde de la progression dans le navigateur (localStorage).
 * Si elle ferme l'onglet, elle reprend là où elle en était.
 * Pour tout recommencer : ajouter ?recommencer à l'adresse du jeu.
 */

const CLE = 'jeu-souvenirs-v1';

export interface Progression {
  introFaite: boolean;
  /** Nombre de souvenirs débloqués (dans l'ordre) */
  debloques: number;
}

export function chargerProgression(): Progression {
  const vide: Progression = { introFaite: false, debloques: 0 };
  try {
    if (new URLSearchParams(location.search).has('recommencer')) {
      localStorage.removeItem(CLE);
      // Retire ?recommencer de l'adresse pour qu'un rechargement ne réefface pas tout
      history.replaceState(null, '', location.pathname);
      return vide;
    }
    const brut = localStorage.getItem(CLE);
    if (!brut) return vide;
    const p = JSON.parse(brut);
    return {
      introFaite: p.introFaite === true,
      debloques: Number.isInteger(p.debloques) && p.debloques >= 0 ? p.debloques : 0,
    };
  } catch {
    // Navigation privée ou stockage bloqué : on joue sans sauvegarde
    return vide;
  }
}

export function sauverProgression(p: Progression) {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    // Pas grave : le jeu continue, seule la reprise ne marchera pas
  }
}
