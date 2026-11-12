<div align="center">

<img src="README/atelier-hero.svg" alt="Atelier Museum — an animated, cinematic 3D gallery" width="100%" />

<br />

### A museum you can walk into.

Explore a first-person 3D art museum, meet the collection up close, and open every exhibit for its story.

<br />

[![Enter the gallery](https://img.shields.io/badge/✦_ENTER_THE_GALLERY-LIVE_DEMO-cda96e?style=for-the-badge&labelColor=17211b)](https://shivubuilds-mikasa.github.io/XR/)
[![Three.js](https://img.shields.io/badge/BUILT_WITH-Three.js-eee8da?style=for-the-badge&labelColor=17211b&logo=threedotjs&logoColor=cda96e)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/POWERED_BY-Vite-eee8da?style=for-the-badge&labelColor=17211b&logo=vite&logoColor=bd93f9)](https://vite.dev/)

<br />

`WASD` TO WALK &nbsp;·&nbsp; `MOUSE` TO LOOK &nbsp;·&nbsp; `SPACE` TO DISCOVER

</div>

<br />

## Step inside

Atelier Museum turns a browser tab into a quiet, explorable exhibition. Wander through connected rooms, discover paintings and 3D objects along the walls, and open an exhibit when something catches your eye.

<div align="center">

| **5** connected rooms | **111** paintings | **4** 3D objects | **1** very dramatic Kabali moment |
|:---:|:---:|:---:|:---:|

</div>

<br />

## The experience

<table>
<tr>
<td width="50%" valign="top">

### 🏛️ Walk the galleries
Move through five connected rooms in a first-person 3D museum, with warm architectural details and a curated collection on the walls.

### 🖼️ Look closer
Focus on a painting or sculpture and press <kbd>Space</kbd> for a full-size view, title, and exhibit notes. Model details include an interactive 3D preview.

</td>
<td width="50%" valign="top">

### 🎭 Kabali Da, center stage
Open the Kabali portrait for a cinematic, slow-motion reveal. Its entrance reacts to the included theme track, with poster motion pulsing to the music.

### ⚡ Built to stay smooth
Artwork is loaded as it comes into view. The renderer adapts its workload when frame rates dip, helping the museum stay responsive across devices.

</td>
</tr>
</table>

<br />

## Take the tour

<div align="center">

| Input | Action |
|:---:|:---|
| **Click** | Enter the museum or resume after pausing |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Walk and strafe |
| **Mouse** | Look around |
| <kbd>Space</kbd> | Open the focused painting or model; press again to close |
| <kbd>Esc</kbd> | Close an exhibit, or pause and release the mouse |

</div>

<br />

## Gallery route

```mermaid
flowchart LR
    A([Entrance]) --> B[The Atrium]
    B --> C[North Gallery]
    C --> D[South Gallery]
    D --> E[West Gallery]
    E --> F[East Gallery]
    style A fill:#cda96e,stroke:#17211b,color:#17211b
    style B fill:#17211b,stroke:#cda96e,color:#eee8da
    style C fill:#17211b,stroke:#cda96e,color:#eee8da
    style D fill:#17211b,stroke:#cda96e,color:#eee8da
    style E fill:#17211b,stroke:#cda96e,color:#eee8da
    style F fill:#17211b,stroke:#cda96e,color:#eee8da
```

<br />

## Run it locally

You’ll need Node.js 20 or later.

```bash
git clone https://github.com/shivubuilds-mikasa/XR.git
cd XR
npm install
npm run dev
```

Open the local address printed by Vite, then click **Enter the Gallery**. To make a production build:

```bash
npm run build
npm run preview
```

Pushes to `main` build and publish the site through GitHub Pages.

<br />

## Under the frame

```text
XR/
├── public/
│   ├── audio/              Kabali theme music
│   ├── images/             Painting collection
│   ├── metadata.json       Artwork titles and descriptions
│   └── models/featured/    Optimized gallery objects
├── README/                 Animated project artwork
├── src/                    Three.js scene, controls, loading, and UI
├── index.html
└── vite.config.ts
```

<div align="center">

<br />

### Made for the joy of looking closer.

[**Open the live museum →**](https://shivubuilds-mikasa.github.io/XR/)

<sub>Three.js · TypeScript · Vite · GitHub Pages</sub>

</div>
