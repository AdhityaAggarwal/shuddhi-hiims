/* ==========================================
   SHUDDHI HIIMS — Home Page Logic
   Hero carousel + preview sections
   ========================================== */

let currentSlide = 0;
let autoplayTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  initNavbar();
  await cm.load();
  initHeroCarousel();
  renderPreviews();
  initScrollAnimations();
  initScrollToTop();
});

// =========================================
// HERO CAROUSEL
// =========================================
function initHeroCarousel() {
  const slides = cm
    .get("carousel")
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const track = document.getElementById("heroTrack");
  const dotsContainer = document.getElementById("heroDots");
  if (!track) return;

  if (slides.length === 0) {
    track.innerHTML =
      '<div class="hero-slide" style="background:var(--primary-dark);"></div>';
    dotsContainer.innerHTML = "";
    startAutoplay(slides.length);
    return;
  }

  track.innerHTML = slides
    .map(
      (s, i) =>
        `<div class="hero-slide"><img src="${s.imageUrl}" alt="${s.caption}" loading="${i === 0 ? "eager" : "lazy"}" onerror="this.style.display='none'"></div>`,
    )
    .join("");

  dotsContainer.innerHTML = slides
    .map(
      (_, i) =>
        `<button class="hero-dot ${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`,
    )
    .join("");

  dotsContainer.addEventListener("click", (e) => {
    const dot = e.target.closest(".hero-dot");
    if (dot) {
      goToSlide(parseInt(dot.dataset.index), slides.length);
      resetAutoplay(slides.length);
    }
  });

  document
    .querySelector(".hero-carousel-btn.prev")
    ?.addEventListener("click", () => {
      goToSlide(currentSlide - 1, slides.length);
      resetAutoplay(slides.length);
    });
  document
    .querySelector(".hero-carousel-btn.next")
    ?.addEventListener("click", () => {
      goToSlide(currentSlide + 1, slides.length);
      resetAutoplay(slides.length);
    });

  // Touch/swipe
  let touchStartX = 0;
  const wrapper = track.parentElement;
  wrapper?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );
  wrapper?.addEventListener(
    "touchend",
    (e) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        goToSlide(
          diff > 0 ? currentSlide + 1 : currentSlide - 1,
          slides.length,
        );
        resetAutoplay(slides.length);
      }
    },
    { passive: true },
  );

  currentSlide = 0;
  startAutoplay(slides.length);
}

function goToSlide(index, total) {
  if (total === 0) return;
  currentSlide = ((index % total) + total) % total;
  const track = document.getElementById("heroTrack");
  if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
  document
    .querySelectorAll(".hero-dot")
    .forEach((d, i) => d.classList.toggle("active", i === currentSlide));
}

function startAutoplay(total) {
  stopAutoplay();
  if (total > 1) {
    autoplayTimer = setInterval(() => goToSlide(currentSlide + 1, total), 5000);
  }
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function resetAutoplay(total) {
  stopAutoplay();
  startAutoplay(total);
}

// =========================================
// PREVIEW SECTIONS (Latest 3 of each)
// =========================================
function renderPreviews() {
  renderVideoPreview();
  renderAudioPreview();
  renderTextPreview();
}

function renderVideoPreview() {
  const container = document.getElementById("previewVideos");
  if (!container) return;
  const items = cm.get("videos").slice(0, 3);

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.video}<h3>No Videos Yet</h3><p>Videos will appear here once added.</p></div>`;
    return;
  }

  container.innerHTML = items
    .map(
      (v) => `
    <div class="video-card" onclick="window.location.href='videos.html'">
      <div class="video-thumbnail">
        <img src="${v.thumbnailUrl}" alt="${v.title}" loading="lazy" onerror="this.parentElement.style.background='var(--primary)';this.style.display='none'">
        <div class="video-play-icon">${ICONS.play}</div>
      </div>
      <div class="video-info">
        <h3>${v.title}</h3>
        <p>${v.description}</p>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderAudioPreview() {
  const container = document.getElementById("previewAudio");
  if (!container) return;
  const items = cm.get("audio").slice(0, 3);

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.music}<h3>No Audio Yet</h3><p>Audio content will appear here once added.</p></div>`;
    return;
  }

  container.innerHTML = items
    .map(
      (a) => `
    <div class="audio-card">
      <div class="audio-icon-box">${ICONS.music}</div>
      <div class="audio-details">
        <h3>${a.title}</h3>
        <p>${a.description}</p>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderTextPreview() {
  const container = document.getElementById("previewTexts");
  if (!container) return;
  const items = cm.get("texts").slice(0, 3);

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.fileText}<h3>No Articles Yet</h3><p>Articles will appear here once added.</p></div>`;
    return;
  }

  container.innerHTML = items
    .map(
      (t) => `
    <div class="text-card" onclick="window.location.href='articles.html'">
      <span class="text-category">${t.category || "General"}</span>
      <h3>${t.title}</h3>
      <p class="text-excerpt">${t.body}</p>
      <span class="text-read-more">Read More ${ICONS.arrowRight}</span>
    </div>
  `,
    )
    .join("");
}
