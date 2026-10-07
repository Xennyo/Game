import { estTactile } from '../utils/appareil';

/** Interface affichée par-dessus la 3D. Pour l'instant : une aide aux contrôles. */
export class Hud {
  private aide: HTMLDivElement;

  constructor() {
    this.aide = document.createElement('div');
    this.aide.className = 'aide cachee';
    document.body.appendChild(this.aide);
  }

  afficherAide(texte?: string, texteTactile?: string) {
    const t = (estTactile && texteTactile) || texte;
    if (!t) return;
    this.aide.textContent = t;
    this.aide.classList.remove('cachee');
  }

  masquerAide() {
    this.aide.classList.add('cachee');
  }
}
