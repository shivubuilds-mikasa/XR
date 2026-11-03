<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=240&section=header&text=Atelier%20Museum&fontSize=68&fontColor=ffffff&fontAlignY=36&animation=fadeIn&desc=A%20first-person%20digital%20art%20museum&descSize=20&descAlignY=58" alt="Atelier Museum banner" width="100%" />

<a href="https://github.com/YOUR_USERNAME/virtual-art-gallery">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&duration=3000&pause=900&color=F7C873&center=true&vCenter=true&width=700&height=60&lines=Walk+through+five+connected+galleries;40+curated+paintings%2C+loaded+as+you+approach;Built+with+Three.js+%E2%80%94+WASD+%2B+mouse;Step+inside.+Look+closer." alt="Typing animation" />
</a>

<br/>

[![Live Demo](https://img.shields.io/badge/%E2%9C%A6_LIVE_DEMO-Enter_the_Gallery-f7c873?style=for-the-badge&labelColor=1a1a2e)](https://YOUR_USERNAME.github.io/virtual-art-gallery/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Deployed-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)

![Stars](https://img.shields.io/github/stars/YOUR_USERNAME/virtual-art-gallery?style=social)
![Forks](https://img.shields.io/github/forks/YOUR_USERNAME/virtual-art-gallery?style=social)
![Last Commit](https://img.shields.io/github/last-commit/YOUR_USERNAME/virtual-art-gallery?style=flat-square&color=f7c873&labelColor=1a1a2e)
![Repo Size](https://img.shields.io/github/repo-size/YOUR_USERNAME/virtual-art-gallery?style=flat-square&color=f7c873&labelColor=1a1a2e)

</div>

---

## 🏛️ About

**Atelier Museum** is a first-person digital museum built with **Three.js**. Walk through **five connected galleries** whose walls are hung with paintings from the local collection in `public/images` and `public/metadata.json`.

> *Step in, look around, and let the art come to you.*

<div align="center">

| 🖼️ **40** | 🚪 **5** | ⚡ **Lazy** | 🎮 **FPS** |
|:---:|:---:|:---:|:---:|
| Curated works | Connected galleries | Images load as you approach | First-person controls |

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🎨 Immersive Galleries
Five connected rooms with a curated selection of 40 paintings, hung and lit like a real museum.

### 🔍 Look to Learn
Aim at any painting to reveal its **title** and **artist** (when available).

</td>
<td width="50%" valign="top">

### ⚡ Smart Loading
Artwork images **load as you approach** and are **resized in the browser** for faster rendering.

### 🕹️ Natural Controls
Smooth first-person movement with `W` `A` `S` `D` and mouse look, with instant pause and resume.

</td>
</tr>
</table>

---

## 🎮 Controls

<div align="center">

| Key / Action | What it does |
|:---:|:---|
| 🖱️ **Click "Enter the Gallery"** | Start the experience |
| <kbd>W</kbd> | Move forward |
| <kbd>A</kbd> | Strafe left |
| <kbd>S</kbd> | Move backward |
| <kbd>D</kbd> | Strafe right |
| 🖱️ **Mouse** | Look around |
| <kbd>Esc</kbd> | Pause and release the pointer |
| 🖱️ **Click the scene** | Resume exploring |
| 👁️ **Look at a painting** | See its title and artist |

</div>

```text
        ┌───┐
        │ W │
    ┌───┼───┼───┐
    │ A │ S │ D │      ← move      🖱️ ← look
    └───┴───┴───┘
```

---

## 🗺️ Gallery Layout

```mermaid
flowchart LR
    A([🚪 Entrance]) --> B[🖼️ Gallery I]
    B --> C[🖼️ Gallery II]
    C --> D[🖼️ Gallery III]
    D --> E[🖼️ Gallery IV]
    E --> F[🖼️ Gallery V]
    style A fill:#f7c873,stroke:#1a1a2e,color:#1a1a2e
    style B fill:#1a1a2e,stroke:#f7c873,color:#fff
    style C fill:#1a1a2e,stroke:#f7c873,color:#fff
    style D fill:#1a1a2e,stroke:#f7c873,color:#fff
    style E fill:#1a1a2e,stroke:#f7c873,color:#fff
    style F fill:#1a1a2e,stroke:#f7c873,color:#fff
```

---

## 🚀 Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/virtual-art-gallery.git
cd virtual-art-gallery

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open the local URL shown in your terminal and click **Enter the Gallery**.

### 📦 Production build

```bash
npm run build
```

<details>
<summary><b>🌐 Deploying to GitHub Pages</b></summary>

<br/>

The project is configured for GitHub Pages at `/virtual-art-gallery/`.

Publishing still depends on the **Pages workflow** and your **repository settings**:

1. Go to **Settings → Pages**
2. Set the source to **GitHub Actions**
3. Push to your main branch and let the workflow run

</details>

---

## 🗂️ Project Structure

```text
virtual-art-gallery/
├── public/
│   ├── images/            # 🖼️ Painting images
│   └── metadata.json      # 📝 Titles, artists and details
├── src/                   # 🧠 Three.js scene, controls and loaders
├── index.html
├── package.json
└── README.md
```

---

## 🧰 Tech Stack

<div align="center">

![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. 🍴 Fork the project
2. 🌿 Create your branch: `git checkout -b feature/amazing-idea`
3. 💾 Commit your changes: `git commit -m "Add amazing idea"`
4. 🚀 Push: `git push origin feature/amazing-idea`
5. 🔃 Open a Pull Request

---

<div align="center">

### ⭐ If you enjoyed the tour, leave a star!

<a href="https://github.com/YOUR_USERNAME/virtual-art-gallery/stargazers">
  <img src="https://img.shields.io/github/stars/YOUR_USERNAME/virtual-art-gallery?style=for-the-badge&color=f7c873&labelColor=1a1a2e" alt="Star this repo" />
</a>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=140&section=footer" alt="Footer wave" width="100%" />

</div>
