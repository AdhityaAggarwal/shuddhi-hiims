/* ==========================================
   SHUDDHI HIIMS — Content Page Logic
   Paginated grids + modals
   Used by videos.html, audio.html, articles.html
   ========================================== */

const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let contentType = ""; // set by each page

document.addEventListener("DOMContentLoaded", async () => {
  initNavbar();
  initScrollToTop();
  initScrollAnimations();

  await cm.load();

  // Determine content type from page data attribute
  contentType = document.body.dataset.contentType || "";
  if (contentType) {
    currentPage = 1;
    renderContentPage();
  }

  // Modal close events
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeVideoModal();
      closeTextModal();
    }
  });
  document.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("video-modal") &&
      e.target.classList.contains("active")
    )
      closeVideoModal();
    if (
      e.target.classList.contains("text-modal") &&
      e.target.classList.contains("active")
    )
      closeTextModal();
  });
});

// =========================================
// PAGINATED RENDERING
// =========================================
function renderContentPage() {
  const items = cm.get(contentType);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = items.slice(start, start + ITEMS_PER_PAGE);

  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = renderEmptyState();
    renderPagination(0, 0);
    return;
  }

  switch (contentType) {
    case "videos":
      grid.innerHTML = pageItems.map(renderVideoCard).join("");
      break;
    case "audio":
      grid.innerHTML = pageItems.map(renderAudioCard).join("");
      break;
    case "texts":
      grid.innerHTML = pageItems.map(renderTextCard).join("");
      break;
  }

  renderPagination(totalPages, items.length);
}

function renderVideoCard(v) {
  return `
    <div class="video-card" data-video-url="${v.videoUrl || ""}" onclick="openVideoModal(this)">
      <div class="video-thumbnail">
        <img src="${v.thumbnailUrl}" alt="${v.title}" loading="lazy"
             onerror="this.parentElement.style.background='var(--primary)';this.style.display='none'">
        <div class="video-play-icon">${ICONS.play}</div>
      </div>
      <div class="video-info">
        <h3>${v.title}</h3>
        <p>${v.description}</p>
      </div>
    </div>`;
}

function renderAudioCard(a) {
  return `
    <div class="audio-card">
      <div class="audio-icon-box">${ICONS.music}</div>
      <div class="audio-details">
        <h3>${a.title}</h3>
        <p>${a.description}</p>
        <div class="audio-player-wrapper">
          <audio controls preload="none">
            ${a.audioUrl ? `<source src="${a.audioUrl}">` : ""}
            Your browser does not support audio.
          </audio>
        </div>
      </div>
    </div>`;
}

function renderTextCard(t) {
  return `
    <div class="text-card" onclick="openTextModal('${t.id}')">
      <span class="text-category">${t.category || "General"}</span>
      <h3>${t.title}</h3>
      <p class="text-excerpt">${t.body}</p>
      <span class="text-read-more">Read More ${ICONS.arrowRight}</span>
    </div>`;
}

function renderEmptyState() {
  const labels = { videos: "Videos", audio: "Audio", texts: "Articles" };
  const icons = {
    videos: ICONS.video,
    audio: ICONS.music,
    texts: ICONS.fileText,
  };
  return `<div class="empty-state">${icons[contentType] || ""}<h3>No ${labels[contentType] || "Content"} Yet</h3><p>Content will appear here once added by the admin.</p></div>`;
}

// =========================================
// PAGINATION
// =========================================
function renderPagination(totalPages, totalItems) {
  const container = document.getElementById("pagination");
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  // Previous button
  html += `<button class="pagination-btn ${currentPage <= 1 ? "disabled" : ""}" onclick="goToPage(${currentPage - 1})">${ICONS.chevronLeft}</button>`;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1)
    startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2)
      html += `<span class="pagination-btn disabled">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1)
      html += `<span class="pagination-btn disabled">...</span>`;
    html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // Next button
  html += `<button class="pagination-btn ${currentPage >= totalPages ? "disabled" : ""}" onclick="goToPage(${currentPage + 1})">${ICONS.chevronRight}</button>`;

  // Info
  html += `<span class="pagination-info">${totalItems} item${totalItems !== 1 ? "s" : ""}</span>`;

  container.innerHTML = html;
}

function goToPage(page) {
  const items = cm.get(contentType);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderContentPage();
  window.scrollTo({
    top: document.querySelector(".content-section").offsetTop - 100,
    behavior: "smooth",
  });
}

// =========================================
// VIDEO MODAL
// =========================================
function openVideoModal(card) {
  const url = card.dataset.videoUrl;
  const modal = document.getElementById("videoModal");
  if (!modal) return;
  const content = modal.querySelector(".video-modal-content");

  if (url && url.includes("youtube.com")) {
    content.innerHTML = `<iframe src="${url}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if (url) {
    content.innerHTML = `<video controls autoplay src="${url}"></video>`;
  } else {
    content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--bg-main);font-size:1rem;">No video URL provided</div>`;
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  if (!modal) return;
  modal.querySelector(".video-modal-content").innerHTML = "";
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

// =========================================
// TEXT MODAL
// =========================================
function openTextModal(id) {
  const item = cm.get("texts").find((t) => t.id === id);
  if (!item) return;
  const modal = document.getElementById("textModal");
  if (!modal) return;

  modal.querySelector(".text-category").textContent =
    item.category || "General";
  modal.querySelector("h2").textContent = item.title;
  modal.querySelector(".text-body").textContent = item.body;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeTextModal() {
  const modal = document.getElementById("textModal");
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
}
