(() => {
  const config = window.GALLERY_CONFIG || { albums: [] };
  const albums = Array.isArray(config.albums) ? config.albums : [];

  // DOM elements
  const brandEl = document.getElementById("brand-name");
  const footerEl = document.getElementById("footer-text");
  const shareBtn = document.getElementById("share-album-btn");

  const heroCover = document.getElementById("hero-cover");
  const heroCategory = document.getElementById("hero-category");
  const heroTitle = document.getElementById("hero-title");
  const heroDesc = document.getElementById("hero-description");
  const heroDate = document.getElementById("hero-date");
  const heroCount = document.getElementById("hero-count");

  const categoryBar = document.getElementById("category-bar");
  const albumSwitcher = document.getElementById("album-switcher");
  const galleryGrid = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("empty-state");

  const lightbox = document.getElementById("lightbox");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxSpinner = document.getElementById("lightbox-spinner");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const toastEl = document.getElementById("toast");

  // State
  let selectedCategory = "Tất cả";
  let currentAlbum = null;
  let currentPhotoIndex = 0;
  let toastTimer = null;
  let touchStartX = 0;

  /**
   * Trích xuất FILE_ID từ mọi định dạng link chia sẻ Google Drive phổ biến
   */
  function extractDriveFileId(input) {
    if (!input || typeof input !== "string") return null;
    const trimmed = input.trim();

    // Nếu người dùng chỉ nhập sẵn FILE_ID (không có http)
    if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) return trimmed;

    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  }

  /**
   * Trả về danh sách URL ưu tiên để hiển thị ảnh Google Drive ổn định
   * size: chiều rộng mong muốn (VD: 400 cho thumb, 1000 cho lưới, 2200 cho lightbox)
   */
  function resolveImageSources(rawUrl, size = 1200) {
    const fileId = extractDriveFileId(rawUrl);
    if (!fileId) {
      return [rawUrl];
    }
    return [
      `https://lh3.googleusercontent.com/d/${fileId}=w${size}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
    ];
  }

  /**
   * Nạp ảnh có cơ chế tự động thử link dự phòng nếu link đầu tiên lỗi
   */
  function loadImageWithFallback(imgEl, rawUrl, size, callbacks = {}) {
    const sources = resolveImageSources(rawUrl, size);
    let attempt = 0;

    const tryNext = () => {
      if (attempt >= sources.length) {
        if (callbacks.onError) callbacks.onError();
        return;
      }
      imgEl.src = sources[attempt++];
    };

    imgEl.onload = () => {
      if (callbacks.onLoad) callbacks.onLoad();
    };
    imgEl.onerror = () => {
      tryNext();
    };

    tryNext();
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  function updateUrlParam(albumId) {
    const url = new URL(window.location.href);
    url.searchParams.set("album", albumId);
    window.history.replaceState({}, "", url.toString());
  }

  function renderCategories() {
    const categories = ["Tất cả", ...new Set(albums.map((a) => a.category).filter(Boolean))];
    categoryBar.innerHTML = "";

    if (categories.length <= 2) {
      categoryBar.hidden = true;
      return;
    }

    categoryBar.hidden = false;
    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `filter-pill${cat === selectedCategory ? " active" : ""}`;
      btn.textContent = cat;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(cat === selectedCategory));
      btn.addEventListener("click", () => {
        selectedCategory = cat;
        renderCategories();
        const filtered = getFilteredAlbums();
        renderAlbumSwitcher(filtered);
        if (filtered.length && (!currentAlbum || !filtered.some((a) => a.id === currentAlbum.id))) {
          selectAlbum(filtered[0]);
        }
      });
      categoryBar.appendChild(btn);
    });
  }

  function getFilteredAlbums() {
    if (selectedCategory === "Tất cả") return albums;
    return albums.filter((a) => a.category === selectedCategory);
  }

  function renderAlbumSwitcher(list) {
    albumSwitcher.innerHTML = "";
    if (list.length <= 1) {
      albumSwitcher.hidden = true;
      return;
    }

    albumSwitcher.hidden = false;
    list.forEach((album) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `album-chip${currentAlbum && currentAlbum.id === album.id ? " active" : ""}`;

      const thumb = document.createElement("img");
      thumb.className = "album-chip-thumb";
      thumb.alt = album.title;
      thumb.loading = "lazy";
      loadImageWithFallback(thumb, album.cover || (album.photos[0] && album.photos[0].url) || "", 240);

      const info = document.createElement("span");
      info.className = "album-chip-info";
      info.innerHTML = `
        <span class="album-chip-title">${album.title}</span>
        <span class="album-chip-sub">${album.photos.length} ảnh • ${album.updatedAt || ""}</span>
      `;

      btn.append(thumb, info);
      btn.addEventListener("click", () => selectAlbum(album));
      albumSwitcher.appendChild(btn);
    });
  }

  function renderHero(album) {
    document.title = `${album.title} — ${config.brandName || "Gallery"}`;
    heroCategory.textContent = album.category || "Album";
    heroTitle.textContent = album.title;
    heroDesc.textContent = album.description || "";
    heroDate.textContent = album.updatedAt ? `Cập nhật: ${album.updatedAt}` : "";
    heroCount.textContent = `${album.photos.length} ảnh`;

    heroCover.classList.remove("loaded");
    const coverSource = album.cover || (album.photos[0] && album.photos[0].url) || "";
    if (coverSource) {
      heroCover.alt = album.title;
      loadImageWithFallback(heroCover, coverSource, 1800, {
        onLoad: () => heroCover.classList.add("loaded")
      });
    }
  }

  function renderGallery(album) {
    galleryGrid.innerHTML = "";
    const photos = album.photos || [];

    if (!photos.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    photos.forEach((photo, index) => {
      const card = document.createElement("article");
      card.className = "photo-card is-loading";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", photo.caption || `Xem ảnh ${index + 1}`);

      const img = document.createElement("img");
      img.alt = photo.caption || `${album.title} - Ảnh ${index + 1}`;
      img.loading = "lazy";
      img.decoding = "async";

      loadImageWithFallback(img, photo.url, 1000, {
        onLoad: () => {
          card.classList.remove("is-loading");
          card.classList.add("is-loaded");
        },
        onError: () => {
          card.classList.remove("is-loading");
          card.classList.add("is-error");
          card.removeAttribute("tabindex");
          card.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>Không tải được ảnh.<br/>Kiểm tra quyền chia sẻ Google Drive.</span>
          `;
        }
      });

      card.appendChild(img);

      if (photo.caption) {
        const badge = document.createElement("div");
        badge.className = "photo-caption-badge";
        badge.textContent = photo.caption;
        card.appendChild(badge);
      }

      const openHandler = () => {
        if (card.classList.contains("is-error")) return;
        openLightbox(index);
      };

      card.addEventListener("click", openHandler);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openHandler();
        }
      });

      galleryGrid.appendChild(card);
    });
  }

  function selectAlbum(album) {
    currentAlbum = album;
    updateUrlParam(album.id);
    renderHero(album);
    renderAlbumSwitcher(getFilteredAlbums());
    renderGallery(album);
  }

  /* Lightbox */
  function openLightbox(index) {
    currentPhotoIndex = index;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    showLightboxPhoto();
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  function showLightboxPhoto() {
    if (!currentAlbum || !currentAlbum.photos.length) return;
    const total = currentAlbum.photos.length;
    const photo = currentAlbum.photos[currentPhotoIndex];

    lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${total}`;
    lightboxCaption.textContent = photo.caption || "";
    lightboxImg.style.opacity = "0";
    lightboxSpinner.hidden = false;

    loadImageWithFallback(lightboxImg, photo.url, 2200, {
      onLoad: () => {
        lightboxSpinner.hidden = true;
        lightboxImg.style.opacity = "1";
      },
      onError: () => {
        lightboxSpinner.hidden = true;
        lightboxCaption.textContent = "Không thể tải ảnh độ phân giải cao.";
      }
    });
  }

  function stepLightbox(delta) {
    if (!currentAlbum || !currentAlbum.photos.length) return;
    const total = currentAlbum.photos.length;
    currentPhotoIndex = (currentPhotoIndex + delta + total) % total;
    showLightboxPhoto();
  }

  // Event listeners
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  lightboxNext.addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  // Vuốt chuyển ảnh trên điện thoại
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 45) {
      stepLightbox(diff > 0 ? -1 : 1);
    }
  }, { passive: true });

  // Nút sao chép link chia sẻ album hiện tại
  shareBtn.addEventListener("click", async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Đã sao chép liên kết chia sẻ album!");
    } catch {
      prompt("Sao chép liên kết chia sẻ bên dưới:", shareUrl);
    }
  });

  // Khởi tạo
  function init() {
    if (config.brandName) brandEl.textContent = config.brandName;
    if (config.footerText) footerEl.textContent = config.footerText;

    if (!albums.length) {
      heroTitle.textContent = "Chưa có album nào";
      emptyState.hidden = false;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("album");
    const initialAlbum = albums.find((a) => a.id === requestedId) || albums[0];

    renderCategories();
    selectAlbum(initialAlbum);
  }

  init();
})();