import type { Souvenir } from '../game/Memory';
import { estTactile } from '../utils/appareil';

/**
 * Carte d'un souvenir : la photo façon polaroid, le titre, la date et le texte d'Olivier.
 * Elle reste affichée jusqu'à ce qu'elle appuie sur "Continuer".
 */
export class MemoryCard {
  private fond: HTMLDivElement;
  private fermer: (() => void) | null = null;

  constructor() {
    this.fond = document.createElement('div');
    this.fond.className = 'carte-fond cachee';
    document.body.appendChild(this.fond);
    window.addEventListener('keydown', (e) => {
      if (this.fermer && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        this.fermer();
      }
    });
  }

  afficher(s: Souvenir): Promise<void> {
    this.fond.innerHTML = '';
    const carte = div('carte');

    const polaroid = div('polaroid');
    const cadre = div('polaroid-photo');
    if (s.photo) {
      const img = document.createElement('img');
      img.src = import.meta.env.BASE_URL + s.photo;
      img.alt = s.titre;
      // Photo manquante : on garde le cadre vide plutôt qu'une image cassée
      img.onerror = () => img.remove();
      cadre.appendChild(img);
    } else {
      cadre.appendChild(div('polaroid-vide', 'photo à venir'));
    }
    polaroid.append(cadre, div('polaroid-legende', s.titre));

    const texte = div('carte-texte');
    if (s.date) texte.appendChild(div('carte-date', s.date));
    texte.appendChild(div('carte-message', s.texte || '(texte à écrire dans SOUVENIRS.md)'));

    const bouton = document.createElement('button');
    bouton.className = 'carte-bouton';
    bouton.textContent = estTactile ? 'Continuer' : 'Continuer (Entrée)';

    carte.append(polaroid, texte, bouton);
    this.fond.appendChild(carte);

    // Petit délai avant d'afficher pour que l'animation d'entrée se joue
    requestAnimationFrame(() => this.fond.classList.remove('cachee'));

    return new Promise((resolve) => {
      const ouvertA = performance.now();
      this.fermer = () => {
        // Évite de fermer la carte par un appui destiné à la réplique précédente
        if (performance.now() - ouvertA < 600) return;
        this.fermer = null;
        this.fond.classList.add('cachee');
        setTimeout(resolve, 300);
      };
      bouton.addEventListener('click', () => this.fermer?.());
    });
  }
}

function div(classe: string, texte?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = classe;
  if (texte) d.textContent = texte;
  return d;
}
