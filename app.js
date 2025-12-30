// app.js

const YEAR = 2026;
const canvasPreview = document.getElementById("previewCanvas");
const ctxPreview = canvasPreview.getContext("2d");
const langSelect = document.getElementById("languageSelect");
const msgInput = document.getElementById("messageInput");
const fontSelect = document.getElementById("fontSelect");
const fontSizeRange = document.getElementById("fontSize");
const fontSizeValue = document.getElementById("fontSizeValue");
const themeButtons = document.querySelectorAll(".theme-swatch");
const photoInput = document.getElementById("photoInput");
const countSelect = document.getElementById("countSelect");
const renderBtn = document.getElementById("renderBtn");
const downloadBtn = document.getElementById("downloadBtn");
const yearTitle = document.getElementById("yearTitle");
const installBtn = document.getElementById("installBtn");

let currentTheme = "light";
let uploadedImage = null; // Image or offscreen canvas
let deferredPrompt = null;

// Language -> default message and font options
const LANG_CONFIG = {
  te: {
    message: `నూతన సంవత్సర శుభాకాంక్షలు ${YEAR}`,
    fonts: [
      { label: "Noto Sans Telugu", css: `"Noto Sans Telugu", system-ui, sans-serif` }
    ]
  },
  en: {
    message: `Happy New Year ${YEAR}`,
    fonts: [
      { label: "Noto Sans", css: `"Noto Sans", system-ui, sans-serif` }
    ]
  },
  sa: {
    message: `नववर्षशुभाशयाः ${YEAR}`,
    fonts: [
      { label: "Noto Serif Devanagari", css: `"Noto Serif Devanagari", "Noto Sans", serif` }
    ]
  }
};

function init() {
  yearTitle.textContent = `Happy New Year ${YEAR}`;
  setupLanguage();
  setupFontSize();
  setupThemes();
  hookEvents();
  renderPreview(); // initial empty render
  registerServiceWorker();
  setupInstallPrompt();
}

function setupLanguage() {
  const lang = langSelect.value;
  const cfg = LANG_CONFIG[lang];
  msgInput.value = cfg.message;

  fontSelect.innerHTML = "";
  cfg.fonts.forEach(f => {
    const opt = document.createElement("option");
    opt.textContent = f.label;
    opt.value = f.css;
    fontSelect.appendChild(opt);
  });

  document.documentElement.lang = lang === "en" ? "en" : "te";
}

function setupFontSize() {
  fontSizeValue.textContent = `${fontSizeRange.value}px`;
}

function setupThemes() {
  themeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      themeButtons.forEach(b => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      currentTheme = btn.dataset.theme;
      renderPreview();
    });
  });
}

function hookEvents() {
  langSelect.addEventListener("change", () => {
    setupLanguage();
    renderPreview();
  });

  msgInput.addEventListener("input", () => renderPreview());

  fontSelect.addEventListener("change", () => renderPreview());

  fontSizeRange.addEventListener("input", () => {
    fontSizeValue.textContent = `${fontSizeRange.value}px`;
    renderPreview();
  });

  photoInput.addEventListener("change", onPhotoSelected);
  renderBtn.addEventListener("click", renderPreview);
  downloadBtn.addEventListener("click", downloadCards);
}

function themeColors(theme) {
  if (theme === "blue") {
    return { bg: "#0b3c5d", fg: "#f6f4ef" };
  }
  if (theme === "dark") {
    return { bg: "#101820", fg: "#f6f4ef" };
  }
  return { bg: "#f6f4ef", fg: "#0b3c5d" };
}

// --- Image handling: EXIF + center square crop ---

function onPhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const arrayBuffer = e.target.result;
    const orientation = readExifOrientation(arrayBuffer);
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const normalized = drawImageWithOrientation(img, orientation);
      uploadedImage = cropToSquare(normalized);
      URL.revokeObjectURL(url);
      renderPreview();
    };
    img.src = url;
  };
  reader.readAsArrayBuffer(file);
}

// Minimal EXIF orientation parser (JPEG only, orientation 1–8) – can be refined later
function readExifOrientation(buffer) {
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return 1; // not JPEG
  let offset = 2;
  const length = view.byteLength;

  while (offset < length) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      const exifLength = view.getUint16(offset, false);
      offset += 2;
      if (view.getUint32(offset, false) !== 0x45786966) return 1; // "Exif"
      offset += 6;
      const little = view.getUint16(offset, false) === 0x4949;
      offset += view.getUint32(offset + 4, little);
      const tags = view.getUint16(offset, little);
      offset += 2;
      for (let i = 0; i < tags; i++) {
        const tagOffset = offset + i * 12;
        const tag = view.getUint16(tagOffset, little);
        if (tag === 0x0112) {
          const valOffset = tagOffset + 8;
          return view.getUint16(valOffset, little);
        }
      }
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else {
      offset += view.getUint16(offset, false);
    }
  }
  return 1;
}

function drawImageWithOrientation(img, orientation) {
  const off = document.createElement("canvas");
  const ctx = off.getContext("2d");
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (orientation > 4 && orientation < 9) {
    off.width = h;
    off.height = w;
  } else {
    off.width = w;
    off.height = h;
  }

  switch (orientation) {
    case 2: // horizontal flip
      ctx.transform(-1, 0, 0, 1, off.width, 0);
      break;
    case 3: // 180°
      ctx.transform(-1, 0, 0, -1, off.width, off.height);
      break;
    case 4: // vertical flip
      ctx.transform(1, 0, 0, -1, 0, off.height);
      break;
    case 5: // vertical flip + 90° right
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6: // 90° right
      ctx.transform(0, 1, -1, 0, off.height, 0);
      break;
    case 7: // horizontal flip + 90° right
      ctx.transform(0, -1, -1, 0, off.height, off.width);
      break;
    case 8: // 90° left
      ctx.transform(0, -1, 1, 0, 0, off.width);
      break;
    default:
      // no transform
      break;
  }

  ctx.drawImage(img, 0, 0);
  return off;
}

function cropToSquare(sourceCanvas) {
  const off = document.createElement("canvas");
  const ctx = off.getContext("2d");
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const size = Math.min(w, h);
  const sx = (w - size) / 2;
  const sy = (h - size) / 2;
  off.width = size;
  off.height = size;
  ctx.drawImage(sourceCanvas, sx, sy, size, size, 0, 0, size, size);
  return off;
}

// --- Rendering: preview + full-size cards ---

function renderPreview() {
  renderCardToCanvas(canvasPreview, 540, 540);
}

function renderCardToCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const { bg, fg } = themeColors(currentTheme);

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Optional photo as background layer
  if (uploadedImage) {
    const img = uploadedImage;
    // cover: center-crop for final 1:1 (already square)
    ctx.save();
    const size = Math.min(width, height);
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, size, size);
    ctx.restore();

    // subtle overlay to keep text readable
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, width, height);
  }

  // Year at top
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold ${Math.round(width * 0.06)}px "Noto Sans"`;
  ctx.fillText(`Happy New Year ${YEAR}`, width / 2, width * 0.05);

  // Greeting message
  const message = msgInput.value.trim();
  const fontSize = parseInt(fontSizeRange.value, 10);
  const fontFamily = fontSelect.value || `"Noto Sans"`;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const margin = width * 0.12;
  const textWidth = width - margin * 2;
  const lines = wrapText(ctx, message, textWidth);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  let y = height / 2 - totalHeight / 2;

  lines.forEach(line => {
    ctx.fillStyle = fg;
    ctx.fillText(line, width / 2, y);
    y += lineHeight;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach(word => {
    const test = current ? current + " " + word : word;
    const width = ctx.measureText(test).width;
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function downloadCards() {
  const count = parseInt(countSelect.value, 10) || 1;

  for (let i = 1; i <= count; i++) {
    const tmp = document.createElement("canvas");
    renderCardToCanvas(tmp, 1080, 1080);
    tmp.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subhasayah-${YEAR}-${i}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }
}

// --- PWA: SW registration & install button ---

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      installBtn.hidden = true;
    }
    deferredPrompt = null;
  });
}

window.addEventListener("DOMContentLoaded", init);
