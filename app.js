(() => {
  const STORAGE_DATA_KEY = "gallery_admin_draft_v1";
  const STORAGE_AUTH_KEY = "gallery_admin_logged_in_v1";
  const STORAGE_GH_KEY = "gallery_github_sync_v1";

  const baseConfig = JSON.parse(JSON.stringify(window.GALLERY_CONFIG || { albums: [] }));
  let config = loadWorkingConfig();

  // DOM elements
  const brandEl = document.getElementById("brand-name");
  const footerEl = document.getElementById("footer-text");
  const shareBtn = document.getElementById("share-album-btn");
  const adminLoginBtn = document.getElementById("admin-login-btn");
  const adminPanelBtn = document.getElementById("admin-panel-btn");

  const adminBanner = document.getElementById("admin-banner");
  const adminBannerText = document.getElementById("admin-banner-text");
  const bannerExportBtn = document.getElementById("banner-export-btn");
  const bannerGithubBtn = document.getElementById("banner-github-btn");
  const bannerLogoutBtn = document.getElementById("banner-logout-btn");

  const heroSection = document.getElementById("hero-section");
  const heroCover = document.getElementById("hero-cover");
  const heroCategory = document.getElementById("hero-category");
  const heroTitle = document.getElementById("hero-title");
  const heroDesc = document.getElementById("hero-description");
  const heroDate = document.getElementById("hero-date");
  const heroDot = document.getElementById("hero-dot");
  const heroCount = document.getElementById("hero-count");

  const controlsSection = document.getElementById("controls-section");
  const categoryBar = document.getElementById("category-bar");
  const albumSwitcher = document.getElementById("album-switcher");
  const galleryGrid = document.getElementById("gallery-grid");
  const emptyState = document.getElementById("empty-state");
  const emptyStateText = document.getElementById("empty-state-text");

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxSpinner = document.getElementById("lightbox-spinner");
  const lightboxOpenOriginal = document.getElementById("lightbox-open-original");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxThumbsWrap = document.getElementById("lightbox-thumbs-wrap");
  const lightboxThumbs = document.getElementById("lightbox-thumbs");

  // Login modal
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");

  // Admin modal
  const adminModal = document.getElementById("admin-modal");
  const adminAlbumList = document.getElementById("admin-album-list");
  const btnNewAlbum = document.getElementById("btn-new-album");
  const albumForm = document.getElementById("album-form");
  const editOriginalId = document.getElementById("edit-original-id");
  const albumTitleInput = document.getElementById("album-title-input");
  const albumIdInput = document.getElementById("album-id-input");
  const albumCategoryInput = document.getElementById("album-category-input");
  const albumDateInput = document.getElementById("album-date-input");
  const albumDescInput = document.getElementById("album-desc-input");
  const albumCoverInput = document.getElementById("album-cover-input");
  const albumCoverPreview = document.getElementById("album-cover-preview");
  const bulkLinksInput = document.getElementById("bulk-links-input");
  const btnAddBulkPhotos = document.getElementById("btn-add-bulk-photos");
  const photoCountLabel = document.getElementById("photo-count-label");
  const editorPhotoList = document.getElementById("editor-photo-list");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");

  // Publish & Settings
  const btnDownloadData = document.getElementById("btn-download-data");
  const btnResetLocal = document.getElementById("btn-reset-local");
  const ghOwnerInput = document.getElementById("gh-owner");
  const ghRepoInput = document.getElementById("gh-repo");
  const ghBranchInput = document.getElementById("gh-branch");
  const ghTokenInput = document.getElementById("gh-token");
  const btnSaveGhConfig = document.getElementById("btn-save-gh-config");
  const btnPushGithub = document.getElementById("btn-push-github");
  const ghStatusText = document.getElementById("gh-status-text");
  const siteBrandInput = document.getElementById("site-brand-input");
  const siteFooterInput = document.getElementById("site-footer-input");
  const adminUserInput = document.getElementById("admin-user-input");
  const adminPassInput = document.getElementById("admin-pass-input");
  const btnSaveSiteSettings = document.getElementById("btn-save-site-settings");

  const toastEl = document.getElementById("toast");

  // State
  const urlParams = new URLSearchParams(window.location.search);
  const requestedAlbumId = urlParams.get("album");
  const forceAdminQuery = urlParams.get("admin") === "1";

  let isAdmin = sessionStorage.getItem(STORAGE_AUTH_KEY) === "1";
  let isSharedMode = Boolean(requestedAlbumId) && !isAdmin && !forceAdminQuery;
  let hasUnsavedChanges = Boolean(localStorage.getItem(STORAGE_DATA_KEY));

  let selectedCategory = "Tất cả";
  let currentAlbum = null;
  let currentPhotoIndex = 0;
  let editorPhotos = [];
  let toastTimer = null;
  let touchStartX = 0;
  let idManuallyEdited = false;

  /* =========================================================
   * 1. TIỆN ÍCH GOOGLE DRIVE & TỐI ƯU TẢI ẢNH
   * ========================================================= */
  function extractDriveFileId(input) {
    if (!input || typeof input !== "string") return null;
    const trimmed = input.trim();
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

  function resolveImageSources(rawUrl, size = 1200) {
    const fileId = extractDriveFileId(rawUrl);
    if (!fileId) return [rawUrl];
    return [
      `https://lh3.googleusercontent.com/d/${fileId}=w${size}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];
  }

  function resolveOriginalUrl(rawUrl) {
    const fileId = extractDriveFileId(rawUrl);
    if (!fileId) return rawUrl;
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  function loadImageWithFallback(imgEl, rawUrl, size, callbacks = {}) {
    imgEl.referrerPolicy = "no-referrer";
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

  function preloadImage(rawUrl, size = 2200) {
    if (!rawUrl) return;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    const sources = resolveImageSources(rawUrl, size);
    img.src = sources[0];
  }

  /* =========================================================
   * 2. SHA-256 THUẦN JS (chạy tốt trên cả file:// lẫn https://)
   * ========================================================= */
  function sha256(ascii) {
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = "";
    const words = [];
    const asciiBitLength = ascii.length * 8;
    const hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += "\x80";
    while ((ascii.length % 64) - 56) ascii += "\x00";
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash.slice(0);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash.unshift((temp1 + temp2) | 0);
        hash[4] = (hash[4] + temp1) | 0;
        hash.pop();
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  /* =========================================================
   * 3. LƯU TRỮ & TIỆN ÍCH CHUNG
   * ========================================================= */
  function loadWorkingConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_DATA_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.albums)) return parsed;
      }
    } catch {}
    return JSON.parse(JSON.stringify(baseConfig));
  }

  function saveWorkingConfig() {
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(config));
    hasUnsavedChanges = true;
    updateAdminUI();
  }

  function slugify(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatToday() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  function buildAlbumShareUrl(albumId) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("album", albumId);
    return url.toString();
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg);
    } catch {
      prompt("Sao chép đường dẫn bên dưới:", text);
    }
  }

  function openModal(modalEl) {
    modalEl.classList.add("open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("open");
    modalEl.setAttribute("aria-hidden", "true");
    if (!lightbox.classList.contains("open") && !document.querySelector(".modal.open")) {
      document.body.classList.remove("no-scroll");
    }
  }

  /* =========================================================
   * 4. HIỂN THỊ GIAO DIỆN ALBUM & CHẾ ĐỘ CHIA SẺ ĐƠN ALBUM
   * ========================================================= */
  function updateAdminUI() {
    isSharedMode = Boolean(requestedAlbumId) && !isAdmin && !forceAdminQuery;
    document.body.classList.toggle("shared-mode", isSharedMode);

    if (isSharedMode) {
      adminLoginBtn.hidden = true;
      adminPanelBtn.hidden = true;
      adminBanner.hidden = true;
      controlsSection.hidden = true;
    } else {
      adminLoginBtn.hidden = isAdmin;
      adminPanelBtn.hidden = !isAdmin;
      adminBanner.hidden = !isAdmin;
      controlsSection.hidden = false;
      adminBannerText.textContent = hasUnsavedChanges
        ? "Có thay đổi chưa xuất bản — hãy tải data.js hoặc lưu lên GitHub."
        : "Đang đăng nhập chế độ quản trị.";
    }
  }

  function getFilteredAlbums() {
    const list = config.albums || [];
    if (selectedCategory === "Tất cả") return list;
    return list.filter((a) => a.category === selectedCategory);
  }

  function renderCategories() {
    if (isSharedMode) {
      categoryBar.hidden = true;
      return;
    }
    const albums = config.albums || [];
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

  function renderAlbumSwitcher(list) {
    if (isSharedMode || list.length <= 1) {
      albumSwitcher.hidden = true;
      return;
    }

    albumSwitcher.hidden = false;
    albumSwitcher.innerHTML = "";

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
        <span class="album-chip-title"></span>
        <span class="album-chip-sub"></span>
      `;
      info.querySelector(".album-chip-title").textContent = album.title;
      info.querySelector(".album-chip-sub").textContent = `${album.photos.length} ảnh${album.updatedAt ? " • " + album.updatedAt : ""}`;

      btn.append(thumb, info);
      btn.addEventListener("click", () => selectAlbum(album));
      albumSwitcher.appendChild(btn);
    });
  }

  function renderHero(album) {
    heroSection.hidden = false;
    document.title = `${album.title} — ${config.brandName || "Gallery"}`;
    heroCategory.textContent = album.category || "Album";
    heroCategory.hidden = !album.category;
    heroTitle.textContent = album.title;
    heroDesc.textContent = album.description || "";
    heroDate.textContent = album.updatedAt ? `Cập nhật: ${album.updatedAt}` : "";
    heroDot.hidden = !album.updatedAt;
    heroCount.textContent = `${album.photos.length} ảnh`;

    heroCover.classList.remove("loaded");
    const coverSource = album.cover || (album.photos[0] && album.photos[0].url) || "";
    if (coverSource) {
      heroCover.alt = album.title;
      loadImageWithFallback(heroCover, coverSource, 1800, {
        onLoad: () => heroCover.classList.add("loaded")
      });
    } else {
      heroCover.removeAttribute("src");
    }
  }

  function renderGallery(album) {
    galleryGrid.innerHTML = "";
    const photos = album.photos || [];

    if (!photos.length) {
      emptyStateText.textContent = "Chưa có ảnh nào trong album này.";
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

      const renderCardError = () => {
        card.classList.remove("is-loading");
        card.classList.add("is-error");
        card.removeAttribute("tabindex");
        card.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Không tải được ảnh Google Drive.<br/>Kiểm tra quyền chia sẻ công khai.</span>
          <button type="button" class="retry-btn">Thử tải lại</button>
        `;
        card.querySelector(".retry-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          card.className = "photo-card is-loading";
          card.innerHTML = "";
          card.appendChild(img);
          loadImageWithFallback(img, photo.url, 1000, {
            onLoad: () => {
              card.classList.remove("is-loading");
              card.classList.add("is-loaded");
            },
            onError: renderCardError
          });
        });
      };

      loadImageWithFallback(img, photo.url, 1000, {
        onLoad: () => {
          card.classList.remove("is-loading");
          card.classList.add("is-loaded");
        },
        onError: renderCardError
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
    renderHero(album);
    renderAlbumSwitcher(getFilteredAlbums());
    renderGallery(album);
  }

  function renderNotFoundAlbum() {
    currentAlbum = null;
    heroSection.hidden = true;
    controlsSection.hidden = true;
    shareBtn.hidden = true;
    galleryGrid.innerHTML = "";
    emptyStateText.textContent = "Album này không tồn tại hoặc đường dẫn chia sẻ không hợp lệ.";
    emptyState.hidden = false;
  }

  /* =========================================================
   * 5. LIGHTBOX + DANH SÁCH ẢNH NHỎ BÊN DƯỚI ẢNH LỚN
   * ========================================================= */
  function renderLightboxThumbs() {
    lightboxThumbs.innerHTML = "";
    const photos = (currentAlbum && currentAlbum.photos) || [];

    if (photos.length <= 1) {
      lightboxThumbsWrap.hidden = true;
      return;
    }

    lightboxThumbsWrap.hidden = false;
    photos.forEach((photo, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `lightbox-thumb-btn${idx === currentPhotoIndex ? " active" : ""}`;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(idx === currentPhotoIndex));
      btn.setAttribute("aria-label", `Ảnh ${idx + 1}`);

      const img = document.createElement("img");
      img.alt = photo.caption || `Ảnh ${idx + 1}`;
      img.loading = "lazy";
      loadImageWithFallback(img, photo.url, 220);

      btn.appendChild(img);
      btn.addEventListener("click", () => {
        currentPhotoIndex = idx;
        showLightboxPhoto();
      });
      lightboxThumbs.appendChild(btn);
    });
  }

  function syncActiveThumb() {
    const thumbBtns = lightboxThumbs.querySelectorAll(".lightbox-thumb-btn");
    thumbBtns.forEach((btn, idx) => {
      const active = idx === currentPhotoIndex;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
      if (active) {
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
  }

  function openLightbox(index) {
    currentPhotoIndex = index;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    renderLightboxThumbs();
    showLightboxPhoto();
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.open")) {
      document.body.classList.remove("no-scroll");
    }
  }

  function showLightboxPhoto() {
    if (!currentAlbum || !currentAlbum.photos.length) return;
    const photos = currentAlbum.photos;
    const total = photos.length;
    const photo = photos[currentPhotoIndex];

    lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${total}`;
    lightboxCaption.textContent = photo.caption || "";
    lightboxOpenOriginal.href = resolveOriginalUrl(photo.url);
    lightboxImg.style.opacity = "0";
    lightboxSpinner.hidden = false;

    syncActiveThumb();

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

    // Tải trước ảnh kế tiếp và ảnh trước để chuyển ảnh mượt mà
    if (total > 1) {
      preloadImage(photos[(currentPhotoIndex + 1) % total].url, 2200);
      preloadImage(photos[(currentPhotoIndex - 1 + total) % total].url, 2200);
    }
  }

  function stepLightbox(delta) {
    if (!currentAlbum || !currentAlbum.photos.length) return;
    const total = currentAlbum.photos.length;
    currentPhotoIndex = (currentPhotoIndex + delta + total) % total;
    showLightboxPhoto();
  }

  /* =========================================================
   * 6. ĐĂNG NHẬP & QUẢN TRỊ ALBUM
   * ========================================================= */
  function switchAdminTab(tabName) {
    document.querySelectorAll(".admin-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    document.querySelectorAll(".admin-pane").forEach((p) => {
      p.classList.toggle("active", p.id === `pane-${tabName}`);
    });
  }

  function renderAdminAlbumList() {
    adminAlbumList.innerHTML = "";
    const list = config.albums || [];

    if (!list.length) {
      adminAlbumList.innerHTML = `<p class="muted-text">Chưa có album nào. Nhấn "+ Thêm album mới" để bắt đầu.</p>`;
      return;
    }

    list.forEach((album) => {
      const row = document.createElement("div");
      row.className = "admin-album-item";

      const main = document.createElement("div");
      main.className = "admin-album-main";

      const thumb = document.createElement("img");
      thumb.className = "admin-album-thumb";
      thumb.alt = album.title;
      loadImageWithFallback(thumb, album.cover || (album.photos[0] && album.photos[0].url) || "", 200);

      const meta = document.createElement("div");
      meta.className = "admin-album-meta";
      meta.innerHTML = `<h4></h4><p></p>`;
      meta.querySelector("h4").textContent = album.title;
      meta.querySelector("p").textContent = `${album.category || "Chưa phân loại"} • ${album.photos.length} ảnh • ID: ${album.id}`;

      main.append(thumb, meta);

      const actions = document.createElement("div");
      actions.className = "admin-album-actions";

      const btnShare = document.createElement("button");
      btnShare.type = "button";
      btnShare.className = "btn-outline";
      btnShare.textContent = "Copy link";
      btnShare.addEventListener("click", () => {
        copyText(buildAlbumShareUrl(album.id), `Đã sao chép link chia sẻ "${album.title}"!`);
      });

      const btnView = document.createElement("button");
      btnView.type = "button";
      btnView.className = "btn-outline";
      btnView.textContent = "Xem";
      btnView.addEventListener("click", () => {
        selectedCategory = "Tất cả";
        renderCategories();
        selectAlbum(album);
        closeModal(adminModal);
      });

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn-outline";
      btnEdit.textContent = "Sửa";
      btnEdit.addEventListener("click", () => openAlbumEditor(album));

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn-danger-outline";
      btnDelete.textContent = "Xoá";
      btnDelete.addEventListener("click", () => {
        if (!confirm(`Xoá vĩnh viễn album "${album.title}"?`)) return;
        config.albums = config.albums.filter((a) => a.id !== album.id);
        saveWorkingConfig();
        renderAdminAlbumList();
        refreshMainView();
        showToast("Đã xoá album.");
      });

      actions.append(btnShare, btnView, btnEdit, btnDelete);
      row.append(main, actions);
      adminAlbumList.appendChild(row);
    });
  }

  function openAlbumEditor(album = null) {
    idManuallyEdited = Boolean(album);
    bulkLinksInput.value = "";

    if (album) {
      editOriginalId.value = album.id;
      albumTitleInput.value = album.title || "";
      albumIdInput.value = album.id || "";
      albumCategoryInput.value = album.category || "";
      albumDateInput.value = album.updatedAt || formatToday();
      albumDescInput.value = album.description || "";
      albumCoverInput.value = album.cover || "";
      editorPhotos = (album.photos || []).map((p) => ({ url: p.url, caption: p.caption || "" }));
    } else {
      editOriginalId.value = "";
      albumTitleInput.value = "";
      albumIdInput.value = "";
      albumCategoryInput.value = "";
      albumDateInput.value = formatToday();
      albumDescInput.value = "";
      albumCoverInput.value = "";
      editorPhotos = [];
    }

    updateCoverPreview();
    renderEditorPhotoList();
    switchAdminTab("album-editor");
  }

  function updateCoverPreview() {
    const val = albumCoverInput.value.trim();
    if (!val) {
      albumCoverPreview.hidden = true;
      return;
    }
    albumCoverPreview.hidden = false;
    loadImageWithFallback(albumCoverPreview, val, 240);
  }

  function renderEditorPhotoList() {
    photoCountLabel.textContent = `${editorPhotos.length} ảnh trong album`;
    editorPhotoList.innerHTML = "";

    editorPhotos.forEach((photo, idx) => {
      const row = document.createElement("div");
      row.className = "editor-photo-row";

      const thumb = document.createElement("img");
      thumb.className = "editor-photo-thumb";
      thumb.alt = `Ảnh ${idx + 1}`;
      loadImageWithFallback(thumb, photo.url, 180);

      const inputs = document.createElement("div");
      inputs.className = "editor-photo-inputs";

      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.value = photo.url;
      urlInput.placeholder = "Link Google Drive...";
      urlInput.addEventListener("change", () => {
        editorPhotos[idx].url = urlInput.value.trim();
        loadImageWithFallback(thumb, editorPhotos[idx].url, 180);
      });

      const capInput = document.createElement("input");
      capInput.type = "text";
      capInput.value = photo.caption || "";
      capInput.placeholder = "Chú thích ảnh (tùy chọn)";
      capInput.addEventListener("input", () => {
        editorPhotos[idx].caption = capInput.value;
      });

      inputs.append(urlInput, capInput);

      const btns = document.createElement("div");
      btns.className = "editor-photo-btns";

      const btnCover = document.createElement("button");
      btnCover.type = "button";
      btnCover.className = "mini-btn";
      btnCover.title = "Đặt làm ảnh bìa";
      btnCover.textContent = "Bìa";
      btnCover.addEventListener("click", () => {
        albumCoverInput.value = photo.url;
        updateCoverPreview();
        showToast("Đã chọn làm ảnh bìa.");
      });

      const btnUp = document.createElement("button");
      btnUp.type = "button";
      btnUp.className = "mini-btn";
      btnUp.textContent = "↑";
      btnUp.disabled = idx === 0;
      btnUp.addEventListener("click", () => {
        if (idx === 0) return;
        [editorPhotos[idx - 1], editorPhotos[idx]] = [editorPhotos[idx], editorPhotos[idx - 1]];
        renderEditorPhotoList();
      });

      const btnDown = document.createElement("button");
      btnDown.type = "button";
      btnDown.className = "mini-btn";
      btnDown.textContent = "↓";
      btnDown.disabled = idx === editorPhotos.length - 1;
      btnDown.addEventListener("click", () => {
        if (idx === editorPhotos.length - 1) return;
        [editorPhotos[idx + 1], editorPhotos[idx]] = [editorPhotos[idx], editorPhotos[idx + 1]];
        renderEditorPhotoList();
      });

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "mini-btn danger";
      btnDel.textContent = "✕";
      btnDel.addEventListener("click", () => {
        editorPhotos.splice(idx, 1);
        renderEditorPhotoList();
      });

      btns.append(btnCover, btnUp, btnDown, btnDel);
      row.append(thumb, inputs, btns);
      editorPhotoList.appendChild(row);
    });
  }

  function populateSettingsForm() {
    siteBrandInput.value = config.brandName || "";
    siteFooterInput.value = config.footerText || "";
    adminUserInput.value = (config.admin && config.admin.username) || "admin";
    adminPassInput.value = "";

    try {
      const gh = JSON.parse(localStorage.getItem(STORAGE_GH_KEY) || "{}");
      ghOwnerInput.value = gh.owner || "";
      ghRepoInput.value = gh.repo || "";
      ghBranchInput.value = gh.branch || "main";
      ghTokenInput.value = gh.token || "";
    } catch {}
  }

  function generateDataJsContent() {
    return (
      "/**\n" +
      " * CẤU HÌNH WEBSITE & DANH SÁCH ALBUM (Xuất từ trang Quản trị)\n" +
      " * Ảnh trên Google Drive cần bật quyền \"Bất kỳ ai có đường liên kết -> Người xem\".\n" +
      " */\n" +
      "window.GALLERY_CONFIG = " +
      JSON.stringify(config, null, 2) +
      ";\n"
    );
  }

  function downloadDataJs() {
    const content = generateDataJsContent();
    const blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Đã tải tệp data.js! Hãy upload thay thế file cũ trên GitHub.");
  }

  async function pushDataJsToGithub() {
    let gh = {};
    try {
      gh = JSON.parse(localStorage.getItem(STORAGE_GH_KEY) || "{}");
    } catch {}

    const owner = (ghOwnerInput.value || gh.owner || "").trim();
    const repo = (ghRepoInput.value || gh.repo || "").trim();
    const branch = (ghBranchInput.value || gh.branch || "main").trim();
    const token = (ghTokenInput.value || gh.token || "").trim();

    if (!owner || !repo || !token) {
      openModal(adminModal);
      switchAdminTab("publish-settings");
      showToast("Vui lòng nhập đầy đủ Username, Repo và Token GitHub trước.");
      return;
    }

    ghStatusText.textContent = "Đang đồng bộ data.js lên GitHub...";
    showToast("Đang lưu lên GitHub...");

    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/data.js`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    };

    try {
      let sha = undefined;
      const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
      }

      const contentStr = generateDataJsContent();
      const base64Content = btoa(unescape(encodeURIComponent(contentStr)));

      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `Update gallery albums (${formatToday()})`,
          content: base64Content,
          branch,
          sha
        })
      });

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || `Lỗi HTTP ${putRes.status}`);
      }

      localStorage.removeItem(STORAGE_DATA_KEY);
      hasUnsavedChanges = false;
      updateAdminUI();
      ghStatusText.textContent = "Đã lưu thành công lên GitHub! GitHub Pages sẽ cập nhật sau khoảng 1 phút.";
      showToast("Đã đồng bộ data.js lên GitHub thành công!");
    } catch (err) {
      ghStatusText.textContent = `Lỗi đồng bộ: ${err.message}`;
      showToast(`Không thể đẩy lên GitHub: ${err.message}`);
    }
  }

  function refreshMainView() {
    brandEl.textContent = config.brandName || "GALLERY";
    footerEl.textContent = config.footerText || "© 2026 Photo Gallery";
    updateAdminUI();

    const albums = config.albums || [];
    if (!albums.length) {
      heroSection.hidden = true;
      controlsSection.hidden = true;
      galleryGrid.innerHTML = "";
      emptyStateText.textContent = "Chưa có album nào.";
      emptyState.hidden = false;
      return;
    }

    if (isSharedMode) {
      const target = albums.find((a) => a.id === requestedAlbumId);
      if (!target) {
        renderNotFoundAlbum();
        return;
      }
      shareBtn.hidden = false;
      selectAlbum(target);
      return;
    }

    shareBtn.hidden = false;
    renderCategories();
    const preferred =
      (currentAlbum && albums.find((a) => a.id === currentAlbum.id)) ||
      (requestedAlbumId && albums.find((a) => a.id === requestedAlbumId)) ||
      albums[0];
    selectAlbum(preferred);
  }

  /* =========================================================
   * 7. SỰ KIỆN
   * ========================================================= */
  // Lightbox events
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  lightboxNext.addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("open")) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") stepLightbox(-1);
      if (e.key === "ArrowRight") stepLightbox(1);
      return;
    }
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.open").forEach((m) => closeModal(m));
    }
  });

  lightbox.addEventListener("touchstart", (e) => {
    if (e.target.closest(".lightbox-thumbs-wrap")) return;
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    if (e.target.closest(".lightbox-thumbs-wrap")) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 45) stepLightbox(diff > 0 ? -1 : 1);
  }, { passive: true });

  // Share button
  shareBtn.addEventListener("click", () => {
    if (!currentAlbum) return;
    copyText(buildAlbumShareUrl(currentAlbum.id), "Đã sao chép liên kết chia sẻ riêng cho album này!");
  });

  // Modal close buttons
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      const modal = document.getElementById(el.dataset.closeModal);
      if (modal) closeModal(modal);
    });
  });

  // Admin Login
  adminLoginBtn.addEventListener("click", () => {
    loginError.hidden = true;
    loginForm.reset();
    openModal(loginModal);
    setTimeout(() => loginUsername.focus(), 60);
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = loginUsername.value.trim();
    const pass = loginPassword.value;
    const expectedUser = (config.admin && config.admin.username) || "admin";
    const expectedHash = (config.admin && config.admin.passwordHash) || sha256("123456");

    const passMatch =
      (config.admin && config.admin.password && pass === config.admin.password) ||
      sha256(pass) === expectedHash;

    if (user === expectedUser && passMatch) {
      isAdmin = true;
      sessionStorage.setItem(STORAGE_AUTH_KEY, "1");
      closeModal(loginModal);
      refreshMainView();
      openAdminPanel();
      showToast("Đăng nhập quản trị thành công!");
    } else {
      loginError.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
      loginError.hidden = false;
    }
  });

  function openAdminPanel() {
    renderAdminAlbumList();
    populateSettingsForm();
    switchAdminTab("albums-list");
    openModal(adminModal);
  }

  adminPanelBtn.addEventListener("click", openAdminPanel);

  // Admin tabs
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.tab === "albums-list") renderAdminAlbumList();
      if (tab.dataset.tab === "publish-settings") populateSettingsForm();
      switchAdminTab(tab.dataset.tab);
    });
  });

  btnNewAlbum.addEventListener("click", () => openAlbumEditor(null));
  btnCancelEdit.addEventListener("click", () => switchAdminTab("albums-list"));

  albumTitleInput.addEventListener("input", () => {
    if (!idManuallyEdited) {
      albumIdInput.value = slugify(albumTitleInput.value);
    }
  });
  albumIdInput.addEventListener("input", () => {
    idManuallyEdited = true;
  });
  albumCoverInput.addEventListener("change", updateCoverPreview);

  // Bulk paste Google Drive links
  btnAddBulkPhotos.addEventListener("click", () => {
    const raw = bulkLinksInput.value.trim();
    if (!raw) return;

    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0;

    lines.forEach((line) => {
      const parts = line.split("|");
      const url = (parts[0] || "").trim();
      const caption = (parts.slice(1).join("|") || "").trim();
      if (!url) return;
      editorPhotos.push({ url, caption });
      added++;
    });

    bulkLinksInput.value = "";
    if (!albumCoverInput.value.trim() && editorPhotos.length) {
      albumCoverInput.value = editorPhotos[0].url;
      updateCoverPreview();
    }
    renderEditorPhotoList();
    showToast(`Đã thêm ${added} ảnh vào danh sách.`);
  });

  // Save Album
  albumForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = albumTitleInput.value.trim();
    const id = slugify(albumIdInput.value.trim() || title);
    if (!title || !id) {
      showToast("Vui lòng nhập tên album và mã đường dẫn hợp lệ.");
      return;
    }

    const originalId = editOriginalId.value;
    const duplicate = config.albums.some((a) => a.id === id && a.id !== originalId);
    if (duplicate) {
      showToast(`Mã đường dẫn "${id}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    const cleanedPhotos = editorPhotos
      .map((p) => ({ url: (p.url || "").trim(), caption: (p.caption || "").trim() }))
      .filter((p) => p.url);

    const albumObj = {
      id,
      title,
      category: albumCategoryInput.value.trim() || "Album",
      description: albumDescInput.value.trim(),
      updatedAt: albumDateInput.value.trim() || formatToday(),
      cover: albumCoverInput.value.trim() || (cleanedPhotos[0] ? cleanedPhotos[0].url : ""),
      photos: cleanedPhotos
    };

    if (originalId) {
      const idx = config.albums.findIndex((a) => a.id === originalId);
      if (idx >= 0) config.albums[idx] = albumObj;
    } else {
      config.albums.unshift(albumObj);
    }

    saveWorkingConfig();
    currentAlbum = albumObj;
    refreshMainView();
    renderAdminAlbumList();
    switchAdminTab("albums-list");
    showToast(`Đã lưu album "${title}". Nhớ xuất data.js hoặc lưu lên GitHub.`);
  });

  // Export & GitHub sync
  btnDownloadData.addEventListener("click", downloadDataJs);
  bannerExportBtn.addEventListener("click", downloadDataJs);
  btnPushGithub.addEventListener("click", pushDataJsToGithub);
  bannerGithubBtn.addEventListener("click", pushDataJsToGithub);

  btnSaveGhConfig.addEventListener("click", () => {
    const gh = {
      owner: ghOwnerInput.value.trim(),
      repo: ghRepoInput.value.trim(),
      branch: ghBranchInput.value.trim() || "main",
      token: ghTokenInput.value.trim()
    };
    localStorage.setItem(STORAGE_GH_KEY, JSON.stringify(gh));
    showToast("Đã lưu cấu hình GitHub trên trình duyệt này.");
  });

  btnSaveSiteSettings.addEventListener("click", () => {
    config.brandName = siteBrandInput.value.trim() || "GALLERY";
    config.footerText = siteFooterInput.value.trim() || "© 2026 Photo Gallery";
    config.admin = config.admin || {};
    config.admin.username = adminUserInput.value.trim() || "admin";
    delete config.admin.password;

    const newPass = adminPassInput.value;
    if (newPass) {
      config.admin.passwordHash = sha256(newPass);
      adminPassInput.value = "";
    }

    saveWorkingConfig();
    refreshMainView();
    showToast("Đã lưu cài đặt thương hiệu & tài khoản.");
  });

  btnResetLocal.addEventListener("click", () => {
    if (!confirm("Xoá toàn bộ bản nháp trên trình duyệt và quay về dữ liệu gốc trong tệp data.js?")) return;
    localStorage.removeItem(STORAGE_DATA_KEY);
    hasUnsavedChanges = false;
    config = JSON.parse(JSON.stringify(baseConfig));
    refreshMainView();
    renderAdminAlbumList();
    showToast("Đã khôi phục dữ liệu gốc.");
  });

  bannerLogoutBtn.addEventListener("click", () => {
    isAdmin = false;
    sessionStorage.removeItem(STORAGE_AUTH_KEY);
    refreshMainView();
    showToast("Đã đăng xuất quản trị.");
  });

  // Init
  refreshMainView();
})();
