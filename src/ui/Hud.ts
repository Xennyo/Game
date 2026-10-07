import { estTactile } from '../utils/appareil';

/** Interface affichée par-dessus la 3D : aide aux contrôles et compteur de souvenirs */
export class Hud {
  private aide: HTMLDivElement;
  private compteur: HTMLDivElement;

  constructor() {
    this.aide = document.createElement('div');
    this.aide.className = 'aide cachee';
    this.compteur = document.createElement('div');
    this.compteur.className = 'compteur cachee';
    document.body.append(this.aide, this.compteur);
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

  setCompteur(debloques: number, total: number) {
    this.compteur.textContent = `Souvenirs : ${debloques} / ${total}`;
    this.compteur.classList.remove('cachee');
  }
}
