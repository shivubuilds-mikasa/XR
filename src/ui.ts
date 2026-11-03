import type { ArtworkMeta } from './types';

export function createUI(onEnter: () => void) {
  const shell = document.createElement('div');
  shell.className = 'ui-shell';
  shell.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Atelier Museum home">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>ATELIER <small>MUSEUM</small></span>
      </a>
      <div class="top-meta"><span class="live-dot"></span><span>THE PERMANENT COLLECTION</span></div>
      <div class="top-room"><span class="room-index">01</span><span>FIVE ROOMS<br><small>ONE CONTINUOUS VISIT</small></span></div>
    </header>

    <div class="aim" aria-hidden="true"><span></span></div>
    <div class="gallery-label" aria-live="polite"><span class="label-line"></span><span id="gallery-room-label">THE ATRIUM</span></div>

    <section class="artwork-card" id="artwork-card" aria-live="polite">
      <span class="card-kicker">IN VIEW <b id="artwork-number">—</b></span>
      <div class="card-title" id="artwork-title">Move closer to a painting</div>
      <div class="card-author" id="artwork-author">The collection will meet you there.</div>
    </section>

    <footer class="bottom-bar">
      <div class="movement-hint"><span class="keycap">W</span><span class="keycap">A</span><span class="keycap">S</span><span class="keycap">D</span><span class="hint-copy">TO WANDER</span></div>
      <div class="center-hint"><span class="mouse-glyph">◉</span> <span id="look-hint">CLICK TO EXPLORE</span> <span class="hint-divider">/</span> ESC TO PAUSE</div>
      <div class="collection-count"><span class="count-value" id="collection-count">000</span><span>WORKS<br><small>ON VIEW</small></span></div>
    </footer>

    <section class="welcome" id="welcome">
      <div class="welcome-art" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="orbit orbit-three"></span><span class="welcome-sculpture"></span></div>
      <div class="welcome-copy">
        <div class="eyebrow"><span class="live-dot"></span> A DIGITAL MUSEUM · EST. 2025</div>
        <h1>Stay a while.<br><em>See differently.</em></h1>
        <p>Five quiet rooms. A hundred unexpected stories.<br>Wander at your own pace.</p>
        <button class="enter-button" id="enter-button"><span>ENTER THE GALLERY</span><b>↗</b></button>
        <div class="welcome-controls"><span><b>W A S D</b> Move</span><span><b>MOUSE</b> Look around</span></div>
      </div>
      <div class="welcome-foot"><span>PAINTINGS FROM THE LOCAL COLLECTION</span><span>01 — 05</span></div>
    </section>

    <div class="pause-toast" id="pause-toast">PAUSED <span>· CLICK TO RETURN</span></div>
  `;
  document.body.appendChild(shell);

  const welcome = shell.querySelector<HTMLElement>('#welcome')!;
  const enter = shell.querySelector<HTMLButtonElement>('#enter-button')!;
  const lookHint = shell.querySelector<HTMLElement>('#look-hint')!;
  const title = shell.querySelector<HTMLElement>('#artwork-title')!;
  const author = shell.querySelector<HTMLElement>('#artwork-author')!;
  const number = shell.querySelector<HTMLElement>('#artwork-number')!;
  const count = shell.querySelector<HTMLElement>('#collection-count')!;
  const pauseToast = shell.querySelector<HTMLElement>('#pause-toast')!;
  let inGallery = false;
  let indexByFile = new Map<string, number>();

  enter.addEventListener('click', () => onEnter());
  shell.querySelector('.brand')!.addEventListener('click', (event) => event.preventDefault());

  return {
    setArtworkCount(value: number) { count.textContent = String(value).padStart(3, '0'); },
    setArtworkIndex(value: Map<string, number>) { indexByFile = value; },
    setRoom(name: string) {
      const el = shell.querySelector<HTMLElement>('#gallery-room-label')!;
      el.textContent = name.toUpperCase();
      const order = ['The Atrium', 'North Gallery', 'East Gallery', 'South Gallery', 'West Gallery'];
      shell.querySelector<HTMLElement>('.room-index')!.textContent = String(Math.max(0, order.indexOf(name)) + 1).padStart(2, '0');
    },
    setLocked(locked: boolean) {
      if (locked) {
        inGallery = true;
        welcome.classList.add('welcome-hidden');
        shell.classList.add('is-locked');
        lookHint.textContent = 'LOOK AROUND';
        pauseToast.classList.remove('pause-visible');
      } else {
        shell.classList.remove('is-locked');
        lookHint.textContent = inGallery ? 'CLICK TO RETURN' : 'CLICK TO EXPLORE';
        if (inGallery) pauseToast.classList.add('pause-visible');
      }
    },
    showArtwork(artwork: ArtworkMeta | null) {
      if (!artwork) {
        title.textContent = 'Move closer to a painting';
        author.textContent = 'The collection will meet you there.';
        number.textContent = '—';
        shell.classList.remove('has-artwork');
        return;
      }
      const index = indexByFile.get(artwork.file) ?? 0;
      number.textContent = String(index + 1).padStart(2, '0');
      title.textContent = artwork.title || artwork.file;
      author.textContent = [artwork.author, artwork.year].filter(Boolean).join(' · ') || 'From the permanent collection';
      shell.classList.add('has-artwork');
    },
  };
}
