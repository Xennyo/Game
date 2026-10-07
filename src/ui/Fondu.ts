const DUREE = 600; // millisecondes

/** Fondu au noir entre le pré et les scènes de souvenirs */
export class Fondu {
  private voile: HTMLDivElement;

  constructor() {
    this.voile = document.createElement('div');
    this.voile.className = 'fondu';
    document.body.appendChild(this.voile);
  }

  noir(): Promise<void> {
    this.voile.classList.add('actif');
    return new Promise((r) => setTimeout(r, DUREE));
  }

  clair(): Promise<void> {
    this.voile.classList.remove('actif');
    return new Promise((r) => setTimeout(r, DUREE));
  }
}
