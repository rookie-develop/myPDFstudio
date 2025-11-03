console.log("✅ script.js loaded");

/* script.js — MyPDF Studio (elegant) */
const { jsPDF } = window.jspdf;

// DOM elements
const fileInput = document.getElementById("fileInput");
const addBtn = document.getElementById("addBtn");
const preview = document.getElementById("imagePreview");
const generateBtn = document.getElementById("generateBtn");
const downloadLink = document.getElementById("downloadLink");
const loadingOverlay = document.getElementById("loadingOverlay");
const popup = document.getElementById("popup");
const popupClose = document.getElementById("popupClose");
const themeToggle = document.getElementById("themeToggle");

const paperSizeEl = document.getElementById("paperSize");
const orientationEl = document.getElementById("orientation");
const marginEl = document.getElementById("margin");

let images = []; // { file, url, rotation }

// Add files
addBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

function handleFiles(list) {
  const files = Array.from(list).filter(
    (f) => f.type && f.type.startsWith("image/")
  );
  files.forEach((f) => {
    const url = URL.createObjectURL(f);
    images.push({ file: f, url, rotation: 0 });
  });
  renderPreview();
}

// Render images with remove button, index (optional), etc.
function renderPreview() {
  preview.innerHTML = "";
  images.forEach((it, idx) => {
    const card = document.createElement("div");
    card.className = "img-tile";

    const img = document.createElement("img");
    img.src = it.url;
    img.alt = it.file?.name || "img";

    // Remove button
    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.innerHTML = "×";
    remove.title = "Remove";
    remove.addEventListener("click", () => {
      images.splice(idx, 1);
      renderPreview(); // re-render after remove
    });

    // Optional: show index
    const idxTag = document.createElement("div");
    idxTag.className = "idx";
    idxTag.textContent = idx + 1;

    card.appendChild(img);
    card.appendChild(remove);
    card.appendChild(idxTag); // keep index visible
    preview.appendChild(card);
  });
}

// ✅ Initialize Sortable once
const sortable = Sortable.create(preview, {
  animation: 150,
  onEnd: (evt) => {
    const from = evt.oldIndex,
      to = evt.newIndex;
    if (from === to) return;
    const [moved] = images.splice(from, 1);
    images.splice(to, 0, moved);
    // Optional: update only indices without full re-render
    updateIndices();
  },
});

// Update index numbers after reordering
function updateIndices() {
  const idxTags = preview.querySelectorAll(".idx");
  idxTags.forEach((tag, i) => (tag.textContent = i + 1));
}

// Process image into data URL (resize for PDF)
async function processImageToDataUrl(imgFile, maxDim = 1600, quality = 0.92) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width,
        h = img.height;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => rej(new Error("image load error"));
    img.src = URL.createObjectURL(imgFile);
  });
}

// Generate PDF
async function generatePDF() {
  if (!images.length) {
    alert("Add at least one image");
    return;
  }

  loadingOverlay.style.display = "flex";
  downloadLink.style.display = "none";

  const paper = paperSizeEl.value; // 'a4'|'letter'|'fit'
  const orientation = orientationEl.value; // portrait|landscape
  const margin = parseFloat(marginEl.value) || 10;

  const paperMap = { a4: { w: 210, h: 297 }, letter: { w: 216, h: 279 } };

  let doc = new jsPDF({ unit: "mm", format: "a4", orientation });

  for (let i = 0; i < images.length; i++) {
    const item = images[i];

    // Overlay text
    const overlayText = loadingOverlay.querySelector(".overlay-text");
    if (overlayText)
      overlayText.textContent = `Processing ${i + 1}/${images.length}...`;

    const dataUrl = await processImageToDataUrl(item.file, 1600, 0.92);

    const tmp = new Image();
    await new Promise((res, rej) => {
      tmp.onload = res;
      tmp.onerror = rej;
      tmp.src = dataUrl;
    });

    const pxToMm = (px) => (px * 25.4) / 96;
    let imgWmm = pxToMm(tmp.width);
    let imgHmm = pxToMm(tmp.height);

    if (paper === "fit") {
      const pageW = imgWmm + margin * 2;
      const pageH = imgHmm + margin * 2;
      if (i === 0) doc = new jsPDF({ unit: "mm", format: [pageW, pageH] });
      else doc.addPage([pageW, pageH]);
      doc.setPage(i + 1);
      doc.addImage(dataUrl, "JPEG", margin, margin, imgWmm, imgHmm);
    } else {
      const p = paperMap[paper];
      const pageW = orientation === "portrait" ? p.w : p.h;
      const pageH = orientation === "portrait" ? p.h : p.w;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const scale = Math.min(1, Math.min(maxW / imgWmm, maxH / imgHmm));
      const finalW = imgWmm * scale;
      const finalH = imgHmm * scale;
      const x = (pageW - finalW) / 2;
      const y = (pageH - finalH) / 2;
      if (i !== 0) doc.addPage();
      doc.setPage(i + 1);
      doc.addImage(dataUrl, "JPEG", x, y, finalW, finalH);
    }
  }

  loadingOverlay.style.display = "none";
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = `mypdfstudio_${Date.now()}.pdf`;
  downloadLink.style.display = "inline-block";

  popup.style.display = "flex";
}

// Events
generateBtn.addEventListener("click", generatePDF);
downloadLink.addEventListener("click", () => {});

popupClose?.addEventListener("click", () => (popup.style.display = "none"));

// Theme toggle
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
