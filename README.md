# Atelier Museum

A first-person digital museum built with Three.js. The five connected galleries take their paintings from the local collection in `public/images` and `public/metadata.json`.

## Explore

- Click **Enter the Gallery**, then use **W A S D** and the mouse to explore.
- Press **Esc** to pause or release the pointer. Click the scene to return.
- Look at a painting to see its title and artist when available.
- The museum displays a curated 40-work selection. Artwork images load as you approach and are resized in the browser for faster rendering.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. The project is configured for GitHub Pages at `/virtual-art-gallery/`; publishing still depends on the Pages workflow and repository settings.
