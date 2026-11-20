import * as THREE from 'three';
import type { GalleryExhibit } from './types';

const BASE = import.meta.env.BASE_URL;

export function createUI(
  onEnter: () => void,
  onModelPreview: (file: string, canvas: HTMLCanvasElement) => void,
  onDetailsClosed: () => void,
  camera: THREE.PerspectiveCamera,
  getModelPreview: (file: string) => THREE.Object3D | null,
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
      <button class="music-toggle" id="music-toggle" type="button" aria-pressed="false" aria-label="Turn background music on">
        <span class="music-toggle-icon" aria-hidden="true">♫</span><span id="music-label">SOUND OFF</span>
      </button>
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
  const xrInfoCanvas = document.createElement('canvas');
  xrInfoCanvas.width = 768;
  xrInfoCanvas.height = 900;
  const xrInfoContext = xrInfoCanvas.getContext('2d')!;
  const xrInfoTexture = new THREE.CanvasTexture(xrInfoCanvas);
  xrInfoTexture.colorSpace = THREE.SRGBColorSpace;
  const xrInfoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 1.34), new THREE.MeshBasicMaterial({ map: xrInfoTexture, toneMapped: false }));
  xrInfoMesh.position.set(0.55, 0, -2.05);
  const xrImageCanvas = document.createElement('canvas');
  xrImageCanvas.width = 540;
  xrImageCanvas.height = 760;
  const xrImageTexture = new THREE.CanvasTexture(xrImageCanvas);
  xrImageTexture.colorSpace = THREE.SRGBColorSpace;
  const xrImageMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.1), new THREE.MeshBasicMaterial({ map: xrImageTexture, toneMapped: false }));
  xrImageMesh.position.set(-0.43, 0, -2.02);
  const xrModelBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.1), new THREE.MeshBasicMaterial({ color: 0x222b24, toneMapped: false }));
  xrModelBackdrop.position.copy(xrImageMesh.position);
  xrModelBackdrop.position.z -= 0.015;
  const xrModelLabelCanvas = document.createElement('canvas');
  xrModelLabelCanvas.width = 540;
  xrModelLabelCanvas.height = 760;
  const xrModelLabelTexture = new THREE.CanvasTexture(xrModelLabelCanvas);
  xrModelLabelTexture.colorSpace = THREE.SRGBColorSpace;
  const xrModelLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.1), new THREE.MeshBasicMaterial({ map: xrModelLabelTexture, transparent: true, toneMapped: false }));
  xrModelLabel.position.copy(xrImageMesh.position);
  xrModelLabel.position.z += 0.008;
  camera.add(xrInfoMesh, xrImageMesh, xrModelBackdrop, xrModelLabel);
  xrInfoMesh.visible = xrImageMesh.visible = xrModelBackdrop.visible = xrModelLabel.visible = false;
  let xrModelPreview: THREE.Object3D | null = null;
  const detailTitle = shell.querySelector<HTMLElement>('#detail-title')!;
  const detailByline = shell.querySelector<HTMLElement>('#detail-byline')!;
  const detailDescription = shell.querySelector<HTMLElement>('#detail-description')!;
  const detailKicker = shell.querySelector<HTMLElement>('#detail-kicker')!;
  const detailMedium = shell.querySelector<HTMLElement>('#detail-medium')!;
  const detailYear = shell.querySelector<HTMLElement>('#detail-year')!;
  const detailMediaIndex = shell.querySelector<HTMLElement>('#detail-media-index')!;
  let inGallery = false;
  let indexByFile = new Map<string, number>();
  const backgroundMusic = new Audio(`${BASE}audio/museum-ambience.mp3`);
  backgroundMusic.loop = true;
  backgroundMusic.preload = 'none';
  backgroundMusic.volume = 0.12;
  const musicToggle = shell.querySelector<HTMLButtonElement>('#music-toggle')!;
  const musicLabel = shell.querySelector<HTMLElement>('#music-label')!;
  let musicEnabled = false;

  const updateMusicToggle = () => {
    musicToggle.setAttribute('aria-pressed', String(musicEnabled));
    musicToggle.setAttribute('aria-label', musicEnabled ? 'Turn background music off' : 'Turn background music on');
    musicLabel.textContent = musicEnabled ? 'SOUND ON' : 'SOUND OFF';
  };

  const setMusicEnabled = (enabled: boolean) => {
    musicEnabled = enabled;
    updateMusicToggle();
    if (!enabled) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      return;
    }
    void backgroundMusic.play().catch((error: unknown) => {
      musicEnabled = false;
      updateMusicToggle();
      console.warn('Museum background music could not be played.', error);
    });
  };

  const wrapText = (context: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) => {
    const words = value.split(/\s+/);
    let line = '';
    let lines = 0;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth && line) {
        context.fillText(line, x, y + lines * lineHeight);
        lines++;
        line = word;
        if (lines >= maxLines) break;
      } else line = next;
    }
    if (line && lines < maxLines) context.fillText(line, x, y + lines * lineHeight);
  };

  const drawXRInfo = (kicker: string, titleText: string, byline: string, description: string, medium: string, year: string) => {
    const context = xrInfoContext;
    context.clearRect(0, 0, xrInfoCanvas.width, xrInfoCanvas.height);
    context.fillStyle = '#151c17';
    context.fillRect(0, 0, xrInfoCanvas.width, xrInfoCanvas.height);
    context.strokeStyle = 'rgba(205,169,110,.62)';
    context.lineWidth = 2;
    context.strokeRect(18, 18, xrInfoCanvas.width - 36, xrInfoCanvas.height - 36);
    context.fillStyle = '#d5b77f';
    context.font = '18px Arial';
    context.letterSpacing = '3px';
    context.fillText(kicker.toUpperCase(), 54, 84);
    context.fillStyle = '#f0eadf';
    context.font = 'bold 42px Georgia';
    context.letterSpacing = '0px';
    wrapText(context, titleText, 54, 156, 650, 51, 2);
    context.fillStyle = '#c8b48f';
    context.font = '22px Arial';
    wrapText(context, byline, 54, 268, 650, 30, 2);
    context.strokeStyle = 'rgba(205,169,110,.58)';
    context.beginPath();
    context.moveTo(54, 342);
    context.lineTo(710, 342);
    context.stroke();
    context.fillStyle = '#e0ddd4';
    context.font = '24px Arial';
    wrapText(context, description, 54, 402, 650, 38, 7);
    context.fillStyle = '#d5b77f';
    context.font = '16px Arial';
    context.letterSpacing = '2px';
    context.fillText('MEDIUM', 54, 750);
    context.fillText('DATE', 400, 750);
    context.fillStyle = '#f0eadf';
    context.font = '22px Arial';
    context.letterSpacing = '0px';
    context.fillText(medium, 54, 793);
    context.fillText(year, 400, 793);
    context.fillStyle = '#b8b5aa';
    context.font = '16px Arial';
    context.fillText('TRIGGER TO RETURN  ·  GRIP + THUMBSTICK TO MOVE', 54, 846);
    xrInfoTexture.needsUpdate = true;
  };

  const drawXRArtwork = (image: HTMLImageElement | null) => {
    const context = xrImageCanvas.getContext('2d')!;
    context.fillStyle = '#252a24';
    context.fillRect(0, 0, xrImageCanvas.width, xrImageCanvas.height);
    if (image?.complete && image.naturalWidth) {
      const scale = Math.max(xrImageCanvas.width / image.naturalWidth, xrImageCanvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (xrImageCanvas.width - width) / 2, (xrImageCanvas.height - height) / 2, width, height);
    } else {
      context.fillStyle = '#d5b77f';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText('THREE-DIMENSIONAL STUDY', xrImageCanvas.width / 2, xrImageCanvas.height / 2);
      context.textAlign = 'left';
    }
    xrImageTexture.needsUpdate = true;
  };

  const clearXRModel = () => {
    if (xrModelPreview) camera.remove(xrModelPreview);
    xrModelPreview = null;
  };

  musicToggle.addEventListener('click', () => setMusicEnabled(!musicEnabled));
  enter.addEventListener('click', () => {
    if (!musicEnabled) setMusicEnabled(true);
    onEnter();
  });
  shell.querySelector('.brand')!.addEventListener('click', (event) => event.preventDefault());

  const closeDetails = () => {
    detailBackdrop.classList.remove('detail-visible');
    detailPanel.setAttribute('aria-hidden', 'true');
    shell.classList.remove('detail-open');
    xrInfoMesh.visible = false;
    xrImageMesh.visible = false;
    xrModelBackdrop.visible = false;
    xrModelLabel.visible = false;
    clearXRModel();
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
      const xrTitle = artwork ? artwork.title || artwork.file : exhibit.kind === 'model' ? exhibit.title : 'Untitled';
      const xrByline = artwork?.author || (exhibit.kind === 'model' ? 'Three-dimensional collection object' : 'Artist not recorded');
      const xrDescription = artwork?.description ||
        (exhibit.kind === 'model' ? exhibit.description : 'This work is part of the permanent collection. Take a closer look and discover its details.');
      drawXRInfo(artwork ? 'Collection / Artwork' : 'Sculpture / 3D study', xrTitle, xrByline, xrDescription, artwork ? 'Artwork on canvas' : 'Digital 3D model', artwork?.year || 'Not recorded');
      xrInfoMesh.visible = true;
      xrImageMesh.visible = false;
      xrModelBackdrop.visible = false;
      xrModelLabel.visible = false;
      clearXRModel();
      if (artwork) {
        modelStage.hidden = true;
        detailImage.hidden = false;
        detailImage.src = `${BASE}images/${encodeURIComponent(artwork.file)}`;
        detailImage.alt = titleText;
        drawXRArtwork(null);
        xrImageMesh.visible = true;
        const xrArtworkImage = new Image();
        xrArtworkImage.onload = () => {
          if (shell.classList.contains('detail-open') && xrImageMesh.visible) drawXRArtwork(xrArtworkImage);
        };
        xrArtworkImage.src = `${BASE}images/${encodeURIComponent(artwork.file)}`;
      } else if (exhibit.kind === 'model') {
        detailImage.hidden = true;
        modelStage.hidden = false;
        if (!camera.userData['xrPresenting']) onModelPreview(exhibit.file, modelCanvas);
        drawXRArtwork(null);
        xrModelBackdrop.visible = true;
        xrModelLabel.visible = true;
        const labelContext = xrModelLabelCanvas.getContext('2d')!;
        labelContext.clearRect(0, 0, xrModelLabelCanvas.width, xrModelLabelCanvas.height);
        labelContext.fillStyle = '#d5b77f';
        labelContext.font = '20px Arial';
        labelContext.textAlign = 'center';
        labelContext.fillText('3D COLLECTION OBJECT', xrModelLabelCanvas.width / 2, 700);
        labelContext.fillText('TRIGGER TO CLOSE', xrModelLabelCanvas.width / 2, 738);
        xrModelLabelTexture.needsUpdate = true;
        xrModelPreview = getModelPreview(exhibit.file);
        if (xrModelPreview) {
          const bounds = new THREE.Box3().setFromObject(xrModelPreview);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const scale = 0.72 / Math.max(size.x, size.y, size.z, 0.001);
          xrModelPreview.scale.setScalar(scale);
          xrModelPreview.position.set(-center.x * scale - 0.43, -center.y * scale, -2.0 - center.z * scale);
          camera.add(xrModelPreview);
        }
      }
      detailBackdrop.classList.add('detail-visible');
      detailPanel.setAttribute('aria-hidden', 'false');
      shell.classList.add('detail-open');
      shell.querySelector<HTMLButtonElement>('#detail-close')!.focus();
    },
    animateXR(dt: number) {
      if (xrModelPreview && shell.classList.contains('detail-open')) xrModelPreview.rotation.y += dt * 0.35;
    },
    closeDetails,
  };
}
