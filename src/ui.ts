import type { GalleryExhibit } from './types';

const BASE = import.meta.env.BASE_URL;

export function createUI(
  onEnter: () => void,
  onModelPreview: (file: string, canvas: HTMLCanvasElement) => void,
  onDetailsClosed: () => void,
) {
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
      <div class="center-hint"><span class="mouse-glyph">◉</span> <span id="look-hint">CLICK TO EXPLORE</span> <span class="hint-divider">/</span> ESC TO PAUSE <span class="hint-divider">/</span> SPACE DETAILS</div>
      <div class="collection-count"><span class="count-value" id="collection-count">000</span><span>WORKS<br><small>ON VIEW</small></span></div>
    </footer>

    <section class="welcome" id="welcome">
      <div class="welcome-art" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="orbit orbit-three"></span><span class="welcome-sculpture"></span></div>
      <div class="welcome-copy">
        <div class="eyebrow"><span class="live-dot"></span> A DIGITAL MUSEUM · EST. 2025</div>
        <h1>Stay a while.<br><em>See differently.</em></h1>
        <p>Five quiet rooms. A hundred unexpected stories.<br>Wander at your own pace.</p>
        <button class="enter-button" id="enter-button"><span>ENTER THE GALLERY</span><b>↗</b></button>
        <div class="welcome-controls"><span><b>W A S D</b> Move</span><span><b>MOUSE</b> Look around</span><span><b>SPACE</b> View details</span></div>
      </div>
      <div class="welcome-foot"><span>PAINTINGS FROM THE LOCAL COLLECTION</span><span>01 — 05</span></div>
    </section>

    <div class="pause-toast" id="pause-toast">PAUSED <span>· CLICK TO RETURN</span></div>

    <div class="detail-backdrop" id="detail-backdrop">
      <aside class="detail-panel" id="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title" aria-hidden="true">
        <header class="detail-header">
          <div class="detail-brand"><span class="live-dot"></span> ATELIER MUSEUM <span class="detail-header-rule"></span> COLLECTION VIEW</div>
          <button class="detail-close" id="detail-close" aria-label="Close exhibit details"><span>×</span> CLOSE</button>
        </header>
        <div class="detail-layout">
          <div class="detail-media" id="detail-media">
            <img class="detail-art-image" id="detail-art-image" alt="" />
            <div class="detail-model-stage" id="detail-model-stage">
              <canvas class="detail-model-canvas" id="detail-model-canvas" aria-label="Rotating 3D model preview"></canvas>
              <span class="model-stage-label"><i></i> THREE-DIMENSIONAL STUDY</span>
            </div>
            <div class="detail-media-index" id="detail-media-index"></div>
          </div>
          <div class="detail-copy">
            <div class="detail-kicker" id="detail-kicker">COLLECTION / 01</div>
            <h2 id="detail-title"></h2>
            <div class="detail-byline" id="detail-byline"></div>
            <div class="detail-rule"></div>
            <p class="detail-description" id="detail-description"></p>
            <dl class="detail-facts">
              <div><dt>MEDIUM</dt><dd id="detail-medium"></dd></div>
              <div><dt>DATE</dt><dd id="detail-year"></dd></div>
              <div><dt>COLLECTION</dt><dd>Atelier Museum</dd></div>
            </dl>
            <div class="detail-endnote"><span class="detail-endnote-mark">A</span><span>Take your time.<br>Every work rewards a closer look.</span></div>
          </div>
        </div>
        <footer class="detail-footer"><span>EXHIBIT DETAILS</span><span>PRESS ESC OR CLOSE TO RETURN</span></footer>
      </aside>
    </div>
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
  const detailBackdrop = shell.querySelector<HTMLElement>('#detail-backdrop')!;
  const detailPanel = shell.querySelector<HTMLElement>('#detail-panel')!;
  const detailImage = shell.querySelector<HTMLImageElement>('#detail-art-image')!;
  const modelStage = shell.querySelector<HTMLElement>('#detail-model-stage')!;
  const modelCanvas = shell.querySelector<HTMLCanvasElement>('#detail-model-canvas')!;
  const detailTitle = shell.querySelector<HTMLElement>('#detail-title')!;
  const detailByline = shell.querySelector<HTMLElement>('#detail-byline')!;
  const detailDescription = shell.querySelector<HTMLElement>('#detail-description')!;
  const detailKicker = shell.querySelector<HTMLElement>('#detail-kicker')!;
  const detailMedium = shell.querySelector<HTMLElement>('#detail-medium')!;
  const detailYear = shell.querySelector<HTMLElement>('#detail-year')!;
  const detailMediaIndex = shell.querySelector<HTMLElement>('#detail-media-index')!;
  let inGallery = false;
  let indexByFile = new Map<string, number>();
  const kabaliMusic = new Audio(`${BASE}audio/kabali-da.mp3`);
  kabaliMusic.loop = true;
  kabaliMusic.volume = 0.42;
  let kabaliAudioContext: AudioContext | null = null;
  let kabaliAnalyser: AnalyserNode | null = null;
  let kabaliAudioSource: MediaElementAudioSourceNode | null = null;
  let kabaliBeatFrame = 0;

  const stopKabaliBeatSync = () => {
    if (kabaliBeatFrame) cancelAnimationFrame(kabaliBeatFrame);
    kabaliBeatFrame = 0;
    for (const property of ['--kabali-beat-x', '--kabali-beat-y', '--kabali-beat-scale', '--kabali-beat-rotation']) {
      detailImage.style.removeProperty(property);
    }
  };

  const stopKabaliMusic = () => {
    stopKabaliBeatSync();
    kabaliMusic.pause();
    kabaliMusic.currentTime = 0;
    if (kabaliAudioContext?.state === 'running') void kabaliAudioContext.suspend();
  };

  const startKabaliBeatSync = () => {
    if (!kabaliAnalyser || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stopKabaliBeatSync();
    const spectrum = new Uint8Array(kabaliAnalyser.frequencyBinCount);
    let baseline = 0;
    let pulse = 0;
    let direction = 1;
    let lastBeat = -Infinity;
    let previousTime = performance.now();

    const sample = (now: number) => {
      if (!shell.classList.contains('kabali-entry') || detailImage.hidden) {
        stopKabaliBeatSync();
        return;
      }
      kabaliAnalyser!.getByteFrequencyData(spectrum);
      let bass = 0;
      // Average the low bass bins; transient increases identify the track's beats.
      for (let bin = 1; bin <= 9; bin++) bass += spectrum[bin];
      bass /= 9;
      const elapsed = Math.min((now - previousTime) / 1000, 0.08);
      previousTime = now;
      if (baseline === 0) baseline = bass;
      const rise = bass - baseline;
      if (bass > baseline * 1.2 && rise > 2.5 && now - lastBeat > 240) {
        pulse = Math.min(1, 0.48 + rise / 42);
        direction *= -1;
        lastBeat = now;
      } else {
        pulse *= Math.exp(-elapsed / 0.15);
      }
      baseline += (bass - baseline) * 0.035;
      detailImage.style.setProperty('--kabali-beat-x', `${(direction * pulse * 8).toFixed(2)}px`);
      detailImage.style.setProperty('--kabali-beat-y', `${(-pulse * 3.5).toFixed(2)}px`);
      detailImage.style.setProperty('--kabali-beat-scale', (pulse * 0.045).toFixed(4));
      detailImage.style.setProperty('--kabali-beat-rotation', `${(direction * pulse * 1.45).toFixed(2)}deg`);
      kabaliBeatFrame = requestAnimationFrame(sample);
    };
    kabaliBeatFrame = requestAnimationFrame(sample);
  };

  const playKabaliMusic = () => {
    try {
      if (!kabaliAudioContext) {
        kabaliAudioContext = new AudioContext();
        kabaliAnalyser = kabaliAudioContext.createAnalyser();
        kabaliAnalyser.fftSize = 1024;
        kabaliAnalyser.smoothingTimeConstant = 0.16;
        kabaliAudioSource = kabaliAudioContext.createMediaElementSource(kabaliMusic);
        kabaliAudioSource.connect(kabaliAnalyser);
        kabaliAnalyser.connect(kabaliAudioContext.destination);
      }
      if (kabaliAudioContext.state === 'suspended') void kabaliAudioContext.resume();
    } catch (error) {
      console.warn('Kabali Da beat sync is unavailable; playing the music without reactive motion.', error);
    }
    startKabaliBeatSync();
    void kabaliMusic.play().catch((error: unknown) => {
      stopKabaliBeatSync();
      console.warn('Kabali Da background music could not be played.', error);
    });
  };

  enter.addEventListener('click', () => onEnter());
  shell.querySelector('.brand')!.addEventListener('click', (event) => event.preventDefault());

  const closeDetails = () => {
    stopKabaliMusic();
    detailBackdrop.classList.remove('detail-visible');
    detailPanel.setAttribute('aria-hidden', 'true');
    shell.classList.remove('detail-open');
    shell.classList.remove('kabali-entry');
    onDetailsClosed();
    onEnter();
  };
  window.addEventListener('keydown', (event) => {
    if ((event.code === 'Escape' || event.code === 'Space') && shell.classList.contains('detail-open')) {
      event.preventDefault();
      // Keep this close key from reaching controls, where Escape would pause
      // the freshly resumed gallery and Space would be treated as an exhibit key.
      event.stopImmediatePropagation();
      closeDetails();
    }
  });
  shell.querySelector<HTMLButtonElement>('#detail-close')!.addEventListener('click', closeDetails);
  detailBackdrop.addEventListener('click', (event) => {
    if (event.target === detailBackdrop) closeDetails();
  });

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
    showArtwork(exhibit: GalleryExhibit | null) {
      if (!exhibit) {
        title.textContent = 'Move closer to a painting';
        author.textContent = 'The collection will meet you there.';
        number.textContent = '—';
        shell.classList.remove('has-artwork');
        return;
      }
      const artwork = exhibit.kind === 'artwork' ? exhibit.artwork : null;
      const index = artwork ? indexByFile.get(artwork.file) ?? 0 : 0;
      number.textContent = artwork ? String(index + 1).padStart(2, '0') : '3D';
      title.textContent = artwork ? artwork.title || artwork.file : exhibit.kind === 'model' ? exhibit.title : 'Untitled';
      author.textContent = artwork
        ? [artwork.author, artwork.year].filter(Boolean).join(' · ') || 'From the permanent collection'
        : 'Three-dimensional collection object';
      shell.classList.add('has-artwork');
    },
    showDetails(exhibit: GalleryExhibit) {
      const artwork = exhibit.kind === 'artwork' ? exhibit.artwork : null;
      const isKabali = artwork?.file === '111-kabali-da.jpg';
      shell.classList.remove('kabali-entry');
      if (isKabali) {
        // Restart the one-off poster reveal whenever this artwork is opened.
        void shell.offsetWidth;
        shell.classList.add('kabali-entry');
      }
      stopKabaliMusic();
      const titleText = artwork ? artwork.title || artwork.file : exhibit.kind === 'model' ? exhibit.title : 'Untitled';
      detailTitle.textContent = titleText;
      detailByline.textContent = artwork?.author || (exhibit.kind === 'model' ? 'Three-dimensional collection object' : 'Artist not recorded');
      detailDescription.textContent = artwork?.description ||
        (exhibit.kind === 'model' ? exhibit.description : 'This work is part of the permanent collection. Take a closer look and discover its details.');
      detailKicker.textContent = artwork
        ? `COLLECTION / ${String((indexByFile.get(artwork.file) ?? 0) + 1).padStart(2, '0')}`
        : 'SCULPTURE / THREE-DIMENSIONAL';
      detailMedium.textContent = artwork ? 'Artwork on canvas' : 'Digital 3D model';
      detailYear.textContent = artwork?.year || 'Not recorded';
      detailMediaIndex.textContent = artwork ? 'PERMANENT COLLECTION' : 'ROTATING 3D VIEW';
      if (artwork) {
        modelStage.hidden = true;
        detailImage.hidden = false;
        detailImage.src = `${BASE}images/${encodeURIComponent(artwork.file)}`;
        detailImage.alt = titleText;
        if (artwork.file === '111-kabali-da.jpg') {
          playKabaliMusic();
        }
      } else if (exhibit.kind === 'model') {
        detailImage.hidden = true;
        modelStage.hidden = false;
        onModelPreview(exhibit.file, modelCanvas);
      }
      detailBackdrop.classList.add('detail-visible');
      detailPanel.setAttribute('aria-hidden', 'false');
      shell.classList.add('detail-open');
      shell.querySelector<HTMLButtonElement>('#detail-close')!.focus();
    },
  };
}
