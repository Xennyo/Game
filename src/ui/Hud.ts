import textes from '../data/textes.json';

/** Interface affichée par-dessus la 3D. Étape 1 : l'aide aux contrôles. */
export class Hud {
  private aide: HTMLDivElement;

  constructor() {
    const tactile = window.matchMedia('(pointer: coarse)').matches;
    this.aide = document.createElement('div');
    this.aide.className = 'aide';
    this.aide.textContent = tactile ? textes.aideTactile : textes.aideOrdinateur;
    document.body.appendChild(this.aide);
  }

  masqueAide() {
    this.aide.classList.add('cachee');
  }
}
