import dialogues from '../data/dialogues.json';
import { estTactile } from '../utils/appareil';

export interface Ligne {
  /** "mj" (Olivier) ou "joueuse" (Maëlle) */
  qui: string;
  texte: string;
  /** Variante affichée sur téléphone, si le texte parle des contrôles */
  texteTactile?: string;
}

const VITESSE_ECRITURE = 28; // millisecondes par lettre

/**
 * Bulle de dialogue en bas de l'écran. Le texte s'écrit lettre par lettre ;
 * un clic, un tap, Espace ou Entrée affiche tout le texte, puis passe à la suite.
 */
export class Dialogue {
  private bulle: HTMLDivElement;
  private nom: HTMLDivElement;
  private texte: HTMLDivElement;
  private suite: HTMLDivElement;

  private complet = '';
  private affiche = 0;
  private minuteur = 0;
  private avancer: (() => void) | null = null;
  private ouvertA = 0;

  constructor() {
    this.bulle = document.createElement('div');
    this.bulle.className = 'dialogue cachee';
    this.nom = document.createElement('div');
    this.nom.className = 'dialogue-nom';
    this.texte = document.createElement('div');
    this.texte.className = 'dialogue-texte';
    this.suite = document.createElement('div');
    this.suite.className = 'dialogue-suite';
    this.suite.textContent = estTactile ? 'touche pour continuer ▸' : 'clic ou Espace ▸';
    this.bulle.append(this.nom, this.texte, this.suite);
    document.body.appendChild(this.bulle);

    window.addEventListener('pointerdown', () => this.action());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.action();
      }
    });
  }

  get actif(): boolean {
    return this.avancer !== null;
  }

  /** Affiche les lignes une par une ; la promesse se résout quand tout a été lu */
  async jouer(lignes: Ligne[]): Promise<void> {
    this.bulle.classList.remove('cachee');
    for (const ligne of lignes) {
      await this.afficherLigne(ligne);
    }
    this.bulle.classList.add('cachee');
  }

  private afficherLigne(ligne: Ligne): Promise<void> {
    const noms = dialogues.noms as Record<string, string>;
    this.nom.textContent = noms[ligne.qui] ?? ligne.qui;
    this.bulle.dataset.qui = ligne.qui;
    this.complet = (estTactile && ligne.texteTactile) || ligne.texte;
    this.affiche = 0;
    this.texte.textContent = '';
    this.suite.classList.remove('visible');
    this.ouvertA = performance.now();

    clearInterval(this.minuteur);
    this.minuteur = window.setInterval(() => {
      this.affiche++;
      this.texte.textContent = this.complet.slice(0, this.affiche);
      if (this.affiche >= this.complet.length) this.finirEcriture();
    }, VITESSE_ECRITURE);

    return new Promise((resolve) => (this.avancer = resolve));
  }

  private finirEcriture() {
    clearInterval(this.minuteur);
    this.affiche = this.complet.length;
    this.texte.textContent = this.complet;
    this.suite.classList.add('visible');
  }

  private action() {
    // Petit délai pour éviter de sauter une réplique par un double clic involontaire
    if (!this.avancer || performance.now() - this.ouvertA < 250) return;
    if (this.affiche < this.complet.length) {
      this.finirEcriture();
      return;
    }
    const suite = this.avancer;
    this.avancer = null;
    suite();
  }
}
