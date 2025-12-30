let deferredPrompt;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
};

// Register SW (safe)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// App logic
const imageInput = document.getElementById("imageInput");
const messageBox = document.getElementById("messageBox");
const signatureBox = document.getElementById("signatureBox");
const fontSelect = document.getElementById("titleFontFamily");
const preview = document.getElementById("preview");
const generateBtn = document.getElementById("generateBtn");

let selectedCount = 1;
let loadedImage = null;

document.querySelectorAll(".count button").forEach(btn => {
  btn.onclick = () => selectedCount = Number(btn.dataset.count);
});

imageInput.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => loadedImage = img;
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

generateBtn.onclick = async () => {
  await document.fonts.ready;
  preview.innerHTML = "";

  for (let i = 0; i < selectedCount; i++) {
    const canvas = createCard();
    preview.appendChild(canvas);

    const d = document.createElement("div");
    d.className = "download";
    d.innerText = "Download";
    d.onclick = () => {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `subhashayah_${i + 1}.png`;
      a.click();
    };
    preview.appendChild(d);
  }
};

function createCard() {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1080;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#FFF8E1";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.font = "bold 64px system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = "#212121";
  ctx.fillText("Happy New Year", 540, 100);

  if (loadedImage) drawCropped(ctx, loadedImage, 80, 180, 420, 720);

  const font = fontSelect.value;
  ctx.textAlign = "left";
  ctx.font = `48px "${font}", system-ui`;

  let y = 300;
  messageBox.value.trim().split("\n").forEach(line => {
    ctx.fillText(line, 540, y);
    y += 64;
  });

  if (signatureBox.value.trim()) {
    ctx.font = `36px "${font}", system-ui`;
    ctx.fillText("– " + signatureBox.value, 540, 900);
  }

  return c;
}

function drawCropped(ctx, img, x, y, w, h) {
  const s = Math.min(img.width, img.height);
  ctx.drawImage(
    img,
    (img.width - s) / 2,
    (img.height - s) / 2,
    s, s,
    x, y, w, h
  );
}
