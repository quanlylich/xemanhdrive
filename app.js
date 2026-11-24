(() => {
  // =========================================================================
  // CẤU HÌNH FIREBASE
  // 1. URL Realtime Database của bạn:
  const FIREBASE_DB_URL = "https://xemanhdrive-default-rtdb.asia-southeast1.firebasedatabase.app";
  // 2. Dán Web API Key từ Firebase Console > Project Settings > General vào đây:
  const DEFAULT_FIREBASE_API_KEY = "BLSWynmrvGTYbz0i5DvU_34wLvHgmJaiYZTuKyoWGGMnJLcETcplc4D93u5YQqRlAD2kwXIYx8bZewGeMIKLuts";
  // =========================================================================

  const STORAGE_AUTH_KEY = "gallery_admin_session_v1";
  const STORAGE_API_KEY = "gallery_firebase_api_key_v1";

  // DOM Elements
  const brandEl = document.getElementById("brand-name");
  const footerEl = document.getElementById("footer-text");
  const shareMenuBtn = document.getElementById("share-menu-btn");
  const shareMenu = document.getElementById("share-menu");
  const copyLockedLinkBtn = document.getElementById("copy-locked-link-btn");
  const copyPublicLinkBtn = document.getElementById("copy-public-link-btn");
  const adminTriggerBtn = document.getElementById("admin-trigger-btn");
  const adminTriggerLabel = document.getElementById("admin-trigger-label");

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
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxThumbs = document.getElementById("lightbox-thumbs");

  // Modals & Admin
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginApiKeyInput = document.getElementById("login-api-key");
  const loginErrorEl = document.getElementById("login-error");
  const loginSubmitBtn = document.getElementById("login-submit-btn");

  const adminModal = document.getElementById("admin-modal");
  const adminUserEmailEl = document.getElementById("admin-user-email");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");
  const adminTabs = document.querySelectorAll(".admin-tab");
  const adminPanels = {
    albums: document.getElementById("panel-albums"),
    editor: document.getElementById("panel-editor"),
    settings: document.getElementById("panel-settings")
  };
  const adminAlbumCountEl = document.getElementById("admin-album-count");
  const adminAlbumListEl = document.getElementById("admin-album-list");
  const createNewAlbumBtn = document.getElementById("create-new-album-btn");

  // Editor form
  const albumEditorForm = document.getElementById("album-editor-form");
  const editOriginalIdInput = document.getElementById("edit-original-id");
  const editTitleInput = document.getElementById("edit-title");
  const editIdInput = document.getElementById("edit-id");
  const editCategoryInput = document.getElementById("edit-category");
  const editDateInput = document.getElementById("edit-date");
  const editDescriptionInput = document.getElementById("edit-description");
  const editCoverInput = document.getElementById("edit-cover");
  const editCoverPreview = document.getElementById("edit-cover-preview");
  const bulkLinksInput = document.getElementById("bulk-links-input");
  const addBulkLinksBtn = document.getElementById("add-bulk-links-btn");
  const editorPhotoCountEl = document.getElementById("editor-photo-count");
  const editorPhotoListEl = document.getElementById("editor-photo-list");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const saveAlbumBtn = document.getElementById("save-album-btn");

  // Settings form
  const settingsForm = document.getElementById("settings-form");
  const settingBrandInput = document.getElementById("setting-brand");
  const settingFooterInput = document.getElementById("setting-footer");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

  const toastEl = document.getElementById("toast");

  // App State
  const urlParams = new URLSearchParams(window.location.search);
  const lockedAlbumId = urlParams.get("view") || (urlParams.get("lock") === "1" ? urlParams.get("album") : null);
  const isSingleLockedMode = Boolean(lockedAlbumId);
  const forceShowAdmin = urlParams.get("admin") === "1";

  let rawDbData = {
    brandName: "STUDIO GALLERY",
    footerText: "© 2026 Studio Gallery • Lưu giữ khoảnh khắc",
    albums: {}
  };
  let albums = [];
  let selectedCategory = "Tất cả";
  let currentAlbum = null;
  let currentPhotoIndex = 0;
  let editorPhotos = [];
  let adminSession = null;
  let toastTimer = null;
  let touchStartX = 0;

  /* -----------------------------------------------------------------------
   * Tiện ích chung & Xử lý link Google Drive
   * --------------------------------------------------------------------- */
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  function slugify(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `album-${Date.now()}`;
  }

  function formatTodayVN() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function toArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(Boolean);
    return Object.entries(data).map(([key, val]) => ({
      id: val.id || key,
      ...val
    }));
  }

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
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
    ];
  }

  function loadImageWithFallback(imgEl, rawUrl, size, callbacks = {}) {
    if (!rawUrl) {
      if (callbacks.onError) callbacks.onError();
      return;
    }
    const sources = resolveImageSources(rawUrl, size);
    let attempt = 0;

    const tryNext = () => {
      if (attempt >= sources.length) {
        if (callbacks.onError) callbacks.onError();
        return;
      }
      imgEl.src = sources[attempt++];
    };

    imgEl.onload = () => { if (callbacks.onLoad) callbacks.onLoad(); };
    imgEl.onerror = () => { tryNext(); };
    tryNext();
  }

  function buildShareUrl(albumId, locked = false) {
    const url = new URL(window.location.origin + window.location.pathname);
    if (albumId) {
      url.searchParams.set("album", albumId);
      if (locked) {
        url.searchParams.set("lock", "1");
      }
    }
    return url.toString();
  }

  async function copyToClipboard(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg);
    } catch {
      window.prompt("Sao chép liên kết bên dưới:", text);
    }
  }

  /* -----------------------------------------------------------------------
   * Xác thực Firebase Authentication REST API & Lưu dữ liệu lên Firebase
   * --------------------------------------------------------------------- */
  function getApiKey() {
    return (localStorage.getItem(STORAGE_API_KEY) || DEFAULT_FIREBASE_API_KEY || "").trim();
  }

  function loadStoredSession() {
    try {
      const raw = localStorage.getItem(STORAGE_AUTH_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    adminSession = session;
    if (session) {
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_AUTH_KEY);
    }
    updateAdminTriggerUI();
  }

  function updateAdminTriggerUI() {
    if (isSingleLockedMode && !forceShowAdmin && !adminSession) {
      adminTriggerBtn.hidden = true;
      copyPublicLinkBtn.hidden = true;
      return;
    }
    adminTriggerBtn.hidden = false;
    copyPublicLinkBtn.hidden = isSingleLockedMode && !adminSession;
    adminTriggerLabel.textContent = adminSession ? "Quản lý" : "Quản trị";
  }

  async function signInFirebase(email, password, apiKey) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const code = data?.error?.message || "LOGIN_FAILED";
      if (code.includes("INVALID_LOGIN_CREDENTIALS") || code.includes("INVALID_PASSWORD") || code.includes("EMAIL_NOT_FOUND")) {
        throw new Error("Email hoặc mật khẩu không chính xác.");
      }
      if (code.includes("API_KEY_INVALID")) {
        throw new Error("Firebase Web API Key không hợp lệ.");
      }
      throw new Error(`Đăng nhập thất bại (${code}).`);
    }
    return {
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000
    };
  }

  async function ensureValidIdToken() {
    if (!adminSession) return null;
    const apiKey = getApiKey();
    if (!apiKey || !adminSession.refreshToken) return adminSession.idToken || null;

    if (Date.now() < (adminSession.expiresAt || 0) - 60000) {
      return adminSession.idToken;
    }

    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(adminSession.refreshToken)}`
    });
    const data = await res.json();
    if (!res.ok) {
      saveSession(null);
      throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
    }
    const refreshed = {
      ...adminSession,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
    };
    saveSession(refreshed);
    return refreshed.idToken;
  }

  async function persistDatabaseToFirebase(nextDbData) {
    const token = await ensureValidIdToken();
    const endpoint = token
      ? `${FIREBASE_DB_URL}/.json?auth=${encodeURIComponent(token)}`
      : `${FIREBASE_DB_URL}/.json`;

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextDbData)
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Không có quyền ghi dữ liệu. Hãy kiểm tra đăng nhập hoặc Rules trên Firebase.");
      }
      throw new Error(`Lỗi lưu Firebase (HTTP ${res.status}).`);
    }

    rawDbData = nextDbData;
    hydrateStateFromDb(rawDbData, currentAlbum ? currentAlbum.id : null);
  }

  /* -----------------------------------------------------------------------
   * Hiển thị Gallery công khai & Chế độ khóa 1 album
   * --------------------------------------------------------------------- */
  function updateUrlParam(albumId) {
    const url = new URL(window.location.href);
    url.searchParams.set("album", albumId);
    if (isSingleLockedMode) {
      url.searchParams.set("lock", "1");
    }
    window.history.replaceState({}, "", url.toString());
  }

  function renderCategories() {
    if (isSingleLockedMode) {
      controlsSection.hidden = true;
      return;
    }

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
    if (isSingleLockedMode) {
      controlsSection.hidden = true;
      return;
    }

    albumSwitcher.innerHTML = "";
    if (list.length <= 1) {
      albumSwitcher.hidden = true;
      if (categoryBar.hidden) controlsSection.hidden = true;
      return;
    }

    controlsSection.hidden = false;
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
        <span class="album-chip-title">${escapeHtml(album.title)}</span>
        <span class="album-chip-sub">${album.photos.length} ảnh${album.updatedAt ? ` • ${escapeHtml(album.updatedAt)}` : ""}</span>
      `;

      btn.append(thumb, info);
      btn.addEventListener("click", () => selectAlbum(album));
      albumSwitcher.appendChild(btn);
    });
  }

  function renderHero(album) {
    document.title = `${album.title} — ${rawDbData.brandName || "Gallery"}`;
    heroCategory.textContent = album.category || "Album";
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
    }
  }

  function renderGallery(album) {
    galleryGrid.innerHTML = "";
    const photos = album.photos || [];

    if (!photos.length) {
      emptyState.hidden = false;
      emptyStateText.textContent = "Chưa có ảnh nào trong album này.";
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

  /* -----------------------------------------------------------------------
   * Lightbox toàn màn hình + Dải ảnh thu nhỏ
   * --------------------------------------------------------------------- */
  function renderLightboxThumbs() {
    lightboxThumbs.innerHTML = "";
    if (!currentAlbum || currentAlbum.photos.length <= 1) {
      lightboxThumbs.hidden = true;
      return;
    }
    lightboxThumbs.hidden = false;

    currentAlbum.photos.forEach((photo, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `lightbox-thumb-btn${idx === currentPhotoIndex ? " active" : ""}`;
      btn.setAttribute("aria-label", `Ảnh ${idx + 1}`);

      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      loadImageWithFallback(img, photo.url, 160);

      btn.appendChild(img);
      btn.addEventListener("click", () => {
        currentPhotoIndex = idx;
        showLightboxPhoto();
      });
      lightboxThumbs.appendChild(btn);
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

    const thumbButtons = lightboxThumbs.querySelectorAll(".lightbox-thumb-btn");
    thumbButtons.forEach((btn, idx) => {
      const active = idx === currentPhotoIndex;
      btn.classList.toggle("active", active);
      if (active) {
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });

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

  /* -----------------------------------------------------------------------
   * Giao diện Quản trị Admin (Thêm, Sửa, Xóa, Dán hàng loạt link Google Drive)
   * --------------------------------------------------------------------- */
  function openModal(modalEl) {
    modalEl.classList.add("open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("open");
    modalEl.setAttribute("aria-hidden", "true");
    if (!lightbox.classList.contains("open")) {
      document.body.classList.remove("no-scroll");
    }
  }

  function switchAdminTab(tabName) {
    adminTabs.forEach((t) => t.classList.toggle("active", t.dataset.adminTab === tabName));
    Object.entries(adminPanels).forEach(([key, panel]) => {
      panel.hidden = key !== tabName;
    });
  }

  function renderAdminAlbumList() {
    adminAlbumCountEl.textContent = `${albums.length} album trên Firebase`;
    adminAlbumListEl.innerHTML = "";

    if (!albums.length) {
      adminAlbumListEl.innerHTML = `<p class="muted-text">Chưa có album nào. Nhấn "+ Tạo album mới" để bắt đầu.</p>`;
      return;
    }

    albums.forEach((album) => {
      const item = document.createElement("div");
      item.className = "admin-album-item";

      const meta = document.createElement("div");
      meta.className = "admin-album-meta";

      const thumb = document.createElement("img");
      thumb.className = "admin-album-thumb";
      thumb.alt = album.title;
      loadImageWithFallback(thumb, album.cover || (album.photos[0] && album.photos[0].url) || "", 200);

      const text = document.createElement("div");
      text.className = "admin-album-text";
      text.innerHTML = `
        <h3>${escapeHtml(album.title)}</h3>
        <p>${escapeHtml(album.category || "Chưa phân loại")} • ${album.photos.length} ảnh • ${escapeHtml(album.updatedAt || "")}</p>
      `;
      meta.append(thumb, text);

      const actions = document.createElement("div");
      actions.className = "admin-album-actions";

      const shareLockedBtn = document.createElement("button");
      shareLockedBtn.type = "button";
      shareLockedBtn.className = "btn-outline btn-sm";
      shareLockedBtn.textContent = "Link chỉ xem";
      shareLockedBtn.title = "Sao chép link chỉ cho phép xem duy nhất album này";
      shareLockedBtn.addEventListener("click", () => {
        copyToClipboard(buildShareUrl(album.id, true), `Đã sao chép link chỉ xem album "${album.title}"!`);
      });

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-outline btn-sm";
      editBtn.textContent = "Sửa";
      editBtn.addEventListener("click", () => openAlbumEditor(album));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-outline btn-sm btn-danger-outline";
      delBtn.textContent = "Xóa";
      delBtn.addEventListener("click", () => handleDeleteAlbum(album));

      actions.append(shareLockedBtn, editBtn, delBtn);
      item.append(meta, actions);
      adminAlbumListEl.appendChild(item);
    });
  }

  function updateCoverPreview(rawUrl) {
    const clean = (rawUrl || "").trim();
    if (!clean) {
      editCoverPreview.hidden = true;
      return;
    }
    editCoverPreview.hidden = false;
    loadImageWithFallback(editCoverPreview, clean, 200, {
      onError: () => { editCoverPreview.hidden = true; }
    });
  }

  function renderEditorPhotos() {
    editorPhotoCountEl.textContent = `${editorPhotos.length} ảnh trong album`;
    editorPhotoListEl.innerHTML = "";
    const currentCover = editCoverInput.value.trim();

    editorPhotos.forEach((photo, idx) => {
      const row = document.createElement("div");
      row.className = "editor-photo-row";

      const thumb = document.createElement("img");
      thumb.className = "editor-photo-thumb";
      thumb.alt = `Ảnh ${idx + 1}`;
      loadImageWithFallback(thumb, photo.url, 180);

      const fields = document.createElement("div");
      fields.className = "editor-photo-fields";

      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.value = photo.url;
      urlInput.placeholder = "Link Google Drive";
      urlInput.addEventListener("change", () => {
        editorPhotos[idx].url = urlInput.value.trim();
        loadImageWithFallback(thumb, editorPhotos[idx].url, 180);
      });

      const capInput = document.createElement("input");
      capInput.type = "text";
      capInput.value = photo.caption || "";
      capInput.placeholder = "Chú thích ảnh (không bắt buộc)";
      capInput.addEventListener("input", () => {
        editorPhotos[idx].caption = capInput.value;
      });

      fields.append(urlInput, capInput);

      const btns = document.createElement("div");
      btns.className = "editor-photo-btns";

      const coverBtn = document.createElement("button");
      coverBtn.type = "button";
      const isCover = currentCover && currentCover === photo.url;
      coverBtn.className = `mini-action-btn${isCover ? " is-cover" : ""}`;
      coverBtn.textContent = isCover ? "Bìa ✓" : "Làm bìa";
      coverBtn.addEventListener("click", () => {
        editCoverInput.value = photo.url;
        updateCoverPreview(photo.url);
        renderEditorPhotos();
      });

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "mini-action-btn";
      upBtn.textContent = "↑";
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => {
        if (idx === 0) return;
        [editorPhotos[idx - 1], editorPhotos[idx]] = [editorPhotos[idx], editorPhotos[idx - 1]];
        renderEditorPhotos();
      });

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "mini-action-btn";
      downBtn.textContent = "↓";
      downBtn.disabled = idx === editorPhotos.length - 1;
      downBtn.addEventListener("click", () => {
        if (idx >= editorPhotos.length - 1) return;
        [editorPhotos[idx + 1], editorPhotos[idx]] = [editorPhotos[idx], editorPhotos[idx + 1]];
        renderEditorPhotos();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "mini-action-btn btn-danger-outline";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        editorPhotos.splice(idx, 1);
        renderEditorPhotos();
      });

      btns.append(coverBtn, upBtn, downBtn, removeBtn);
      row.append(thumb, fields, btns);
      editorPhotoListEl.appendChild(row);
    });
  }

  function openAlbumEditor(album = null) {
    switchAdminTab("editor");
    bulkLinksInput.value = "";

    if (album) {
      editOriginalIdInput.value = album.id;
      editTitleInput.value = album.title || "";
      editIdInput.value = album.id || "";
      editCategoryInput.value = album.category || "";
      editDateInput.value = album.updatedAt || formatTodayVN();
      editDescriptionInput.value = album.description || "";
      editCoverInput.value = album.cover || "";
      editorPhotos = (album.photos || []).map((p) => ({ url: p.url, caption: p.caption || "" }));
    } else {
      editOriginalIdInput.value = "";
      editTitleInput.value = "";
      editIdInput.value = "";
      editCategoryInput.value = "Phóng sự cưới";
      editDateInput.value = formatTodayVN();
      editDescriptionInput.value = "";
      editCoverInput.value = "";
      editorPhotos = [];
    }

    updateCoverPreview(editCoverInput.value);
    renderEditorPhotos();
  }

  async function handleDeleteAlbum(album) {
    const ok = window.confirm(`Bạn có chắc muốn xóa album "${album.title}" khỏi Firebase không?`);
    if (!ok) return;

    try {
      const nextAlbumsObj = { ...(rawDbData.albums || {}) };
      if (Array.isArray(rawDbData.albums)) {
        const filtered = rawDbData.albums.filter((a) => a && a.id !== album.id);
        const obj = {};
        filtered.forEach((a) => { obj[a.id] = a; });
        await persistDatabaseToFirebase({ ...rawDbData, albums: obj });
      } else {
        delete nextAlbumsObj[album.id];
        await persistDatabaseToFirebase({ ...rawDbData, albums: nextAlbumsObj });
      }
      renderAdminAlbumList();
      showToast(`Đã xóa album "${album.title}".`);
    } catch (err) {
      showToast(err.message);
    }
  }

  function openAdminDashboard() {
    adminUserEmailEl.textContent = adminSession?.email
      ? `Đăng nhập: ${adminSession.email}`
      : "Chế độ quản trị Firebase";
    settingBrandInput.value = rawDbData.brandName || "";
    settingFooterInput.value = rawDbData.footerText || "";
    renderAdminAlbumList();
    switchAdminTab("albums");
    openModal(adminModal);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* -----------------------------------------------------------------------
   * Khởi tạo & Event Listeners
   * --------------------------------------------------------------------- */
  function hydrateStateFromDb(data, preferredAlbumId = null) {
    rawDbData = {
      brandName: data.brandName || "STUDIO GALLERY",
      footerText: data.footerText || "© 2026 Studio Gallery",
      albums: data.albums || {}
    };

    albums = toArray(rawDbData.albums).map((album) => ({
      ...album,
      photos: toArray(album.photos)
    }));

    brandEl.textContent = rawDbData.brandName;
    footerEl.textContent = rawDbData.footerText;

    if (!albums.length) {
      heroTitle.textContent = "Chưa có album nào";
      heroDesc.textContent = "";
      heroCategory.textContent = "Gallery";
      heroDate.textContent = "";
      heroDot.hidden = true;
      heroCount.textContent = "0 ảnh";
      galleryGrid.innerHTML = "";
      emptyState.hidden = false;
      emptyStateText.textContent = "Chưa có dữ liệu album trên Firebase.";
      return;
    }

    if (isSingleLockedMode) {
      const target = albums.find((a) => a.id === lockedAlbumId);
      if (!target) {
        controlsSection.hidden = true;
        heroTitle.textContent = "Không tìm thấy album";
        heroDesc.textContent = "Liên kết album không tồn tại hoặc đã bị gỡ bỏ.";
        heroCategory.textContent = "Thông báo";
        heroDate.textContent = "";
        heroDot.hidden = true;
        heroCount.textContent = "";
        galleryGrid.innerHTML = "";
        emptyState.hidden = false;
        emptyStateText.textContent = "Vui lòng liên hệ người gửi để nhận liên kết chính xác.";
        return;
      }
      selectAlbum(target);
      return;
    }

    const targetId = preferredAlbumId || urlParams.get("album");
    const initialAlbum = albums.find((a) => a.id === targetId) || albums[0];
    renderCategories();
    selectAlbum(initialAlbum);
  }

  // Share dropdown toggle
  shareMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = shareMenu.hidden;
    shareMenu.hidden = !isHidden;
    shareMenuBtn.setAttribute("aria-expanded", String(isHidden));
  });

  document.addEventListener("click", (e) => {
    if (!shareMenu.hidden && !e.target.closest("#share-dropdown")) {
      shareMenu.hidden = true;
      shareMenuBtn.setAttribute("aria-expanded", "false");
    }
  });

  copyLockedLinkBtn.addEventListener("click", () => {
    shareMenu.hidden = true;
    const id = currentAlbum ? currentAlbum.id : "";
    copyToClipboard(buildShareUrl(id, true), "Đã sao chép link chỉ xem album này!");
  });

  copyPublicLinkBtn.addEventListener("click", () => {
    shareMenu.hidden = true;
    const id = currentAlbum ? currentAlbum.id : "";
    copyToClipboard(buildShareUrl(id, false), "Đã sao chép link thư viện công khai!");
  });

  // Brand click behavior
  brandEl.addEventListener("click", (e) => {
    if (isSingleLockedMode) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Admin trigger
  adminTriggerBtn.addEventListener("click", () => {
    if (adminSession) {
      openAdminDashboard();
    } else {
      loginErrorEl.hidden = true;
      loginApiKeyInput.value = getApiKey();
      openModal(loginModal);
    }
  });

  // Modal close buttons
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      const targetId = el.getAttribute("data-close-modal");
      const modal = document.getElementById(targetId);
      if (modal) closeModal(modal);
    });
  });

  // Login form submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginErrorEl.hidden = true;
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    const apiKeyInputVal = loginApiKeyInput.value.trim();

    if (apiKeyInputVal) {
      localStorage.setItem(STORAGE_API_KEY, apiKeyInputVal);
    }
    const apiKey = getApiKey();

    if (!apiKey) {
      loginErrorEl.textContent = "Vui lòng nhập Firebase Web API Key (mở mục Cấu hình Firebase Web API Key bên trên).";
      loginErrorEl.hidden = false;
      return;
    }

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Đang xác thực...";

    try {
      const session = await signInFirebase(email, password, apiKey);
      saveSession(session);
      closeModal(loginModal);
      loginPasswordInput.value = "";
      openAdminDashboard();
      showToast("Đăng nhập quản trị thành công!");
    } catch (err) {
      loginErrorEl.textContent = err.message;
      loginErrorEl.hidden = false;
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Đăng nhập";
    }
  });

  // Logout
  adminLogoutBtn.addEventListener("click", () => {
    saveSession(null);
    closeModal(adminModal);
    showToast("Đã đăng xuất quản trị.");
  });

  // Admin tabs
  adminTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.adminTab;
      if (target === "editor" && !editOriginalIdInput.value && !editTitleInput.value) {
        openAlbumEditor(null);
      } else {
        switchAdminTab(target);
      }
    });
  });

  createNewAlbumBtn.addEventListener("click", () => openAlbumEditor(null));
  cancelEditBtn.addEventListener("click", () => switchAdminTab("albums"));

  // Auto-slug when creating new album
  editTitleInput.addEventListener("input", () => {
    if (!editOriginalIdInput.value) {
      editIdInput.value = slugify(editTitleInput.value);
    }
  });

  editCoverInput.addEventListener("input", () => {
    updateCoverPreview(editCoverInput.value);
    renderEditorPhotos();
  });

  // Bulk add Google Drive links
  addBulkLinksBtn.addEventListener("click", () => {
    const raw = bulkLinksInput.value.trim();
    if (!raw) {
      showToast("Vui lòng dán ít nhất 1 liên kết Google Drive.");
      return;
    }

    const lines = raw
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (!lines.length) {
      showToast("Không tìm thấy liên kết hợp lệ.");
      return;
    }

    lines.forEach((link) => {
      editorPhotos.push({ url: link, caption: "" });
    });

    if (!editCoverInput.value.trim() && editorPhotos.length > 0) {
      editCoverInput.value = editorPhotos[0].url;
      updateCoverPreview(editCoverInput.value);
    }

    bulkLinksInput.value = "";
    renderEditorPhotos();
    showToast(`Đã thêm ${lines.length} ảnh vào danh sách!`);
  });

  // Save album to Firebase
  albumEditorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = editTitleInput.value.trim();
    const id = slugify(editIdInput.value || title);
    const originalId = editOriginalIdInput.value.trim();

    if (!title || !id) {
      showToast("Vui lòng nhập tên album.");
      return;
    }

    const cleanPhotos = editorPhotos
      .map((p) => ({ url: (p.url || "").trim(), caption: (p.caption || "").trim() }))
      .filter((p) => p.url);

    const cover = editCoverInput.value.trim() || (cleanPhotos[0] ? cleanPhotos[0].url : "");

    const albumPayload = {
      id,
      title,
      category: editCategoryInput.value.trim() || "Album",
      description: editDescriptionInput.value.trim(),
      updatedAt: editDateInput.value.trim() || formatTodayVN(),
      cover,
      photos: cleanPhotos
    };

    saveAlbumBtn.disabled = true;
    saveAlbumBtn.textContent = "Đang lưu lên Firebase...";

    try {
      const nextAlbumsMap = {};
      albums.forEach((a) => {
        if (a.id !== originalId && a.id !== id) {
          nextAlbumsMap[a.id] = a;
        }
      });
      nextAlbumsMap[id] = albumPayload;

      await persistDatabaseToFirebase({
        ...rawDbData,
        albums: nextAlbumsMap
      });

      renderAdminAlbumList();
      switchAdminTab("albums");
      showToast(`Đã lưu album "${title}" lên Firebase!`);
    } catch (err) {
      showToast(err.message);
    } finally {
      saveAlbumBtn.disabled = false;
      saveAlbumBtn.textContent = "Lưu album lên Firebase";
    }
  });

  // Save general settings
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = "Đang lưu...";

    try {
      const nextAlbumsMap = {};
      albums.forEach((a) => { nextAlbumsMap[a.id] = a; });

      await persistDatabaseToFirebase({
        brandName: settingBrandInput.value.trim() || "STUDIO GALLERY",
        footerText: settingFooterInput.value.trim() || "© 2026 Studio Gallery",
        albums: nextAlbumsMap
      });

      showToast("Đã cập nhật cài đặt chung!");
    } catch (err) {
      showToast(err.message);
    } finally {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = "Lưu cài đặt lên Firebase";
    }
  });

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
      if (adminModal.classList.contains("open")) closeModal(adminModal);
      if (loginModal.classList.contains("open")) closeModal(loginModal);
    }
  });

  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 45) stepLightbox(diff > 0 ? -1 : 1);
  }, { passive: true });

  // Bootstrap app
  async function init() {
    adminSession = loadStoredSession();
    updateAdminTriggerUI();

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data) {
        hydrateStateFromDb({
          brandName: "STUDIO GALLERY",
          footerText: "© 2026 Studio Gallery",
          albums: {}
        });
        return;
      }

      hydrateStateFromDb(data);
    } catch (err) {
      console.error("Firebase load error:", err);
      heroTitle.textContent = "Không thể kết nối Firebase";
      heroDesc.textContent = "Vui lòng kiểm tra kết nối mạng hoặc cấu hình Rules (.read: true) trên Firebase.";
      emptyState.hidden = false;
      emptyStateText.textContent = "Tải dữ liệu thất bại.";
    }
  }

  init();
})();
