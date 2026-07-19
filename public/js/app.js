// ==========================================================================
// LOVESTATION FRONTEND CONTROLLER
// Handles dynamic rendering, state, API requests, and beautiful transitions.
// ==========================================================================

// Global App State
const state = {
  isAdmin: false,
  togetherSince: '2024-05-20',
  stationTitle: '我们的爱之小站',
  favicon: '',
  anniversaries: [],
  currentTagFilter: 'all',
  uploadedImages: [] // tracks images uploaded for the active form modal
};

// DOM References
const DOM = {
  stationTitle: document.getElementById('station-title'),
  countdownDays: document.getElementById('countdown-days'),
  togetherDateText: document.getElementById('together-date-text'),
  adminLockBtn: document.getElementById('admin-lock-btn'),
  lockIcon: document.getElementById('lock-icon'),
  lockText: document.getElementById('lock-text'),
  adminControlsPanel: document.getElementById('admin-controls-panel'),
  tagsContainer: document.getElementById('tags-container'),
  emptyState: document.getElementById('empty-state'),
  anniversariesGrid: document.getElementById('anniversaries-grid'),
  
  // Modals & Forms
  loginModal: document.getElementById('login-modal'),
  loginForm: document.getElementById('login-form'),
  passcodeInput: document.getElementById('passcode-input'),
  togglePassword: document.getElementById('toggle-password'),
  loginErrorMsg: document.getElementById('login-error-msg'),
  
  annModal: document.getElementById('ann-modal'),
  annForm: document.getElementById('ann-form'),
  modalTitleText: document.getElementById('modal-title-text'),
  annIdInput: document.getElementById('ann-id-input'),
  annTitleInput: document.getElementById('ann-title-input'),
  annDateInput: document.getElementById('ann-date-input'),
  annTypeInput: document.getElementById('ann-type-input'),
  annTagsInput: document.getElementById('ann-tags-input'),
  annDescInput: document.getElementById('ann-desc-input'),
  annImageInput: document.getElementById('ann-image-input'),
  annImagesJson: document.getElementById('ann-images-json'),
  imageDragArea: document.getElementById('image-drag-area'),
  dragPrompt: document.getElementById('drag-prompt'),
  imagePreviewsGrid: document.getElementById('image-previews-grid'),
  uploadStatus: document.getElementById('upload-status'),
  annErrorMsg: document.getElementById('ann-error-msg'),
  saveAnnBtn: document.getElementById('save-ann-btn'),


  settingsModal: document.getElementById('settings-modal'),
  settingsForm: document.getElementById('settings-form'),
  setTitleInput: document.getElementById('set-title-input'),
  setSinceInput: document.getElementById('set-since-input'),
  setPasscodeInput: document.getElementById('set-passcode-input'),
  toggleSetPassword: document.getElementById('toggle-set-password'),
  faviconUploadBtn: document.getElementById('favicon-upload-btn'),
  setFaviconUpload: document.getElementById('set-favicon-upload'),
  faviconPreviewBox: document.getElementById('favicon-preview-box'),
  setFaviconUrl: document.getElementById('set-favicon-url'),
  settingsErrorMsg: document.getElementById('settings-error-msg'),
  
  // Action triggers
  addAnnBtn: document.getElementById('add-ann-btn'),
  editSettingsBtn: document.getElementById('edit-settings-btn'),
  exportBtn: document.getElementById('export-btn'),
  importTriggerBtn: document.getElementById('import-trigger-btn'),
  backupFileInput: document.getElementById('backup-file-input'),
  logoutBtn: document.getElementById('logout-btn')
};

// ==========================================================================
// TOAST NOTIFICATIONS SYSTEM
// ==========================================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'info') icon = 'fa-info-circle';
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Slide out and remove toast
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3500);
}

// ==========================================================================
// BUSINESS LOGIC & API ENDPOINTS
// ==========================================================================

// 1. Check if user is Admin
async function checkAdminStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    state.isAdmin = data.isAdmin;
    updateAdminUI();
  } catch (error) {
    console.error('Failed to verify admin status:', error);
  }
}

// 2. Refresh UI elements after Admin state changes
function updateAdminUI() {
  if (state.isAdmin) {
    DOM.adminLockBtn.classList.add('unlocked');
    DOM.lockIcon.className = 'fas fa-lock-open';
    DOM.lockText.textContent = '管理员模式';
    DOM.adminControlsPanel.classList.remove('hidden');
  } else {
    DOM.adminLockBtn.classList.remove('unlocked');
    DOM.lockIcon.className = 'fas fa-lock';
    DOM.lockText.textContent = '访客模式';
    DOM.adminControlsPanel.classList.add('hidden');
  }
  // Re-render cards so that Edit/Delete buttons dynamically appear or disappear
  renderAnniversaries();
}

// 3. Load entire database (Anniversaries & Settings)
async function fetchAllData() {
  try {
    const res = await fetch('/api/anniversaries');
    const data = await res.json();
    
    state.anniversaries = data.anniversaries || [];
    if (data.settings) {
      state.togetherSince = data.settings.togetherSince || '2024-05-20';
      state.stationTitle = data.settings.title || '我们的爱之小站';
      state.favicon = data.settings.favicon || '';
    }
    
    // Render static site details
    DOM.stationTitle.textContent = state.stationTitle;
    document.title = `${state.stationTitle} - 情侣纪念日与回忆录`;
    DOM.togetherDateText.textContent = state.togetherSince;
    
    // Dynamically apply favicon to browser tab
    const faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink) {
      faviconLink.href = state.favicon || "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>❤️</text></svg>";
    }
    
    calculateTogetherDays();
    renderTagsFilter();
    renderAnniversaries();
  } catch (error) {
    showToast('获取数据失败，请检查服务器连接', 'error');
    console.error('Error fetching data:', error);
  }
}

// 4. Calculate Days Difference
function calculateTogetherDays() {
  const start = new Date(state.togetherSince + 'T00:00:00');
  const today = new Date();
  
  // Zero out hours to calculate whole calendar day difference accurately
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  DOM.countdownDays.textContent = diffDays >= 0 ? diffDays : 0;
}

// 5. Compile tag list dynamically and render tags filter bar
function renderTagsFilter() {
  // Collect all unique tags
  const tagsSet = new Set();
  state.anniversaries.forEach(item => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        if (tag.trim()) tagsSet.add(tag.trim());
      });
    }
  });

  const activeTag = state.currentTagFilter;
  let html = `<button class="tag-filter ${activeTag === 'all' ? 'active' : ''}" data-tag="all">全部</button>`;
  
  tagsSet.forEach(tag => {
    html += `<button class="tag-filter ${activeTag === tag ? 'active' : ''}" data-tag="${tag}">#${tag}</button>`;
  });
  
  DOM.tagsContainer.innerHTML = html;

  // Add click listeners to tags
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentTagFilter = btn.getAttribute('data-tag');
      document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAnniversaries();
    });
  });
}

// Helper to compute next occurrence details for a yearly recurring event
function getYearlyEventStatus(originalDateStr) {
  const originalDate = new Date(originalDateStr + 'T00:00:00');
  const today = new Date();
  
  // Strip hours to calculate whole calendar day difference accurately
  originalDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const currentYear = today.getFullYear();
  const eventMonth = originalDate.getMonth();
  const eventDay = originalDate.getDate();
  
  // Create this year's occurrence
  let nextOccurrence = new Date(currentYear, eventMonth, eventDay);
  nextOccurrence.setHours(0, 0, 0, 0);
  
  // If this year's occurrence has already passed, the next occurrence is next year
  if (nextOccurrence < today) {
    nextOccurrence.setFullYear(currentYear + 1);
  }
  
  // Compute difference in days
  const diffTime = nextOccurrence - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Compute anniversary count (e.g. occurrence's year minus original year)
  const occurrenceYear = nextOccurrence.getFullYear();
  const originalYear = originalDate.getFullYear();
  const anniversaryIndex = occurrenceYear - originalYear;
  
  return {
    daysLeft: diffDays,
    anniversaryIndex: anniversaryIndex
  };
}

// 6. Render anniversary list
function renderAnniversaries() {
  // Filter anniversaries by tag
  let filtered = state.anniversaries;
  if (state.currentTagFilter !== 'all') {
    filtered = state.anniversaries.filter(item => 
      Array.isArray(item.tags) && item.tags.includes(state.currentTagFilter)
    );
  }

  // Sort: Show newest dates first (most recent memories at the top)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    DOM.emptyState.classList.remove('hidden');
    DOM.anniversariesGrid.classList.add('hidden');
    return;
  }

  DOM.emptyState.classList.add('hidden');
  DOM.anniversariesGrid.classList.remove('hidden');

  let html = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  sorted.forEach(item => {
    let pillClass = '';
    let pillText = '';

    if (item.type === 'yearly') {
      const { daysLeft, anniversaryIndex } = getYearlyEventStatus(item.date);
      const isBirthday = item.title.includes('生日') || (Array.isArray(item.tags) && item.tags.includes('生日'));
      
      if (daysLeft === 0) {
        pillClass = 'countup';
        pillText = isBirthday ? `今天生日啦！🎂 (满 ${anniversaryIndex} 岁)` : `今天第 ${anniversaryIndex} 周年纪念 ❤️`;
      } else {
        pillClass = 'countdown';
        pillText = isBirthday 
          ? `距离生日还有 ${daysLeft} 天 (将满 ${anniversaryIndex} 岁)` 
          : `还有 ${daysLeft} 天 (第 ${anniversaryIndex} 周年)`;
      }
    } else {
      // One-time event
      const eventDate = new Date(item.date + 'T00:00:00');
      eventDate.setHours(0, 0, 0, 0);
      
      const diffTime = today - eventDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        pillClass = 'countup';
        pillText = `已过去 ${diffDays} 天`;
      } else if (diffDays === 0) {
        pillClass = 'countup';
        pillText = '就在今天 ❤️';
      } else {
        pillClass = 'countdown';
        pillText = `倒计时 ${Math.abs(diffDays)} 天`;
      }
    }

    // Media background with backward compatibility
    const itemImages = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
    const hasImage = itemImages.length > 0;
    const coverUrl = hasImage ? itemImages[0] : '';
    const mediaHTML = hasImage
      ? `<img class="card-image" src="${coverUrl}" alt="${item.title}" loading="lazy">`
      : '';

    // Multiple images count overlay badge
    const countBadgeHTML = itemImages.length > 1
      ? `<div class="card-image-count-badge"><i class="fas fa-images"></i> ${itemImages.length} 张</div>`
      : '';

    // Tags list
    let tagsHTML = '';
    if (Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        if (tag.trim()) {
          tagsHTML += `<span class="card-tag">#${tag}</span>`;
        }
      });
    }

    // Admin control buttons overlay drawer
    const adminDrawerHTML = state.isAdmin
      ? `<div class="card-admin-drawer">
          <button class="card-icon-btn btn-edit" onclick="event.stopPropagation(); openEditAnnModal('${item.id}')" title="编辑回忆"><i class="fas fa-edit"></i></button>
          <button class="card-icon-btn btn-delete" onclick="event.stopPropagation(); deleteAnniversary('${item.id}')" title="删除回忆"><i class="fas fa-trash-alt"></i></button>
         </div>`
      : '';

    // Truncate long descriptions
    const fullDesc = item.description || '这一天没有任何描述文字呢。但那些有你在的细节，我都深深记在了心里。';
    const isTruncated = fullDesc.length > 80;
    const truncatedDesc = isTruncated ? fullDesc.substring(0, 80) + '...' : fullDesc;
    const readStoryBtnHTML = isTruncated
      ? `<div class="card-read-story-btn">展开日记全文 <i class="fas fa-arrow-right"></i></div>`
      : '';

    html += `
      <article class="anniversary-card glass-panel" data-id="${item.id}" onclick="openDetailModal('${item.id}', event)">
        <div class="card-media-box ${hasImage ? '' : 'no-image'}">
          ${mediaHTML}
          ${countBadgeHTML}
          <div class="card-days-pill ${pillClass}">${pillText}</div>
          ${adminDrawerHTML}
        </div>
        <div class="card-info">
          <div class="card-date"><i class="far fa-clock"></i> ${item.date}</div>
          <h2 class="card-title">${item.title}</h2>
          <p class="card-desc">${truncatedDesc}</p>
          ${readStoryBtnHTML}
          <div class="card-tags">${tagsHTML}</div>
        </div>
      </article>
    `;
  });

  DOM.anniversariesGrid.innerHTML = html;
}

// Render thumbnails grid inside the form
function renderThumbnails() {
  if (state.uploadedImages.length === 0) {
    DOM.imagePreviewsGrid.innerHTML = '';
    DOM.imagePreviewsGrid.classList.add('hidden');
    DOM.dragPrompt.classList.remove('hidden');
    DOM.annImagesJson.value = '[]';
    return;
  }

  DOM.dragPrompt.classList.add('hidden');
  DOM.imagePreviewsGrid.classList.remove('hidden');
  DOM.annImagesJson.value = JSON.stringify(state.uploadedImages);

  let html = '';
  state.uploadedImages.forEach((imgUrl, index) => {
    html += `
      <div class="thumb-preview-box" data-index="${index}">
        <img src="${imgUrl}" alt="照片预览">
        <button type="button" class="thumb-remove-btn" onclick="removeUploadedImage(${index})" title="移除此照片">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  });
  DOM.imagePreviewsGrid.innerHTML = html;
}

// Global hook to delete an uploaded image from active form state
window.removeUploadedImage = function(index) {
  state.uploadedImages.splice(index, 1);
  renderThumbnails();
  showToast('已移除选中的照片', 'info');
};

function resetImageUploadArea() {
  state.uploadedImages = [];
  renderThumbnails();
  DOM.annImageInput.value = '';
}

// 7. Handle Image Uploads & Drag/Drop Previews (Multi-image)
async function handleImageUploads(files) {
  if (!files || files.length === 0) return;
  
  DOM.uploadStatus.classList.remove('hidden');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        state.uploadedImages.push(data.imageUrl);
        successCount++;
      } else {
        failCount++;
        console.error('Upload fail:', data.error);
      }
    } catch (error) {
      failCount++;
      console.error('Upload exception:', error);
    }
  }

  DOM.uploadStatus.classList.add('hidden');
  renderThumbnails();

  if (successCount > 0 && failCount === 0) {
    showToast(`成功上传了 ${successCount} 张照片！`);
  } else if (successCount > 0 && failCount > 0) {
    showToast(`上传了 ${successCount} 张照片，另有 ${failCount} 张上传失败`, 'warning');
  } else if (failCount > 0) {
    showToast('照片上传失败，请重试', 'error');
  }
}

// 8. Open Edit modal pre-populated
window.openEditAnnModal = function(id) {
  const item = state.anniversaries.find(ann => ann.id === id);
  if (!item) return;

  DOM.modalTitleText.innerHTML = '<i class="fas fa-edit"></i> 编辑回忆';
  DOM.annIdInput.value = item.id;
  DOM.annTitleInput.value = item.title;
  DOM.annDateInput.value = item.date;
  DOM.annTypeInput.value = item.type || 'one-time';
  DOM.annTagsInput.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
  DOM.annDescInput.value = item.description || '';

  // Handle multi-image mapping with backward compatibility
  const itemImages = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
  state.uploadedImages = [...itemImages];
  renderThumbnails();

  DOM.annErrorMsg.classList.add('hidden');
  DOM.annModal.classList.remove('hidden');
};

// 8.5 Open Read-Only Memory Detail page in new tab
window.openDetailModal = function(id, event) {
  // If the click is on admin buttons, don't open the detail page
  if (event && (event.target.closest('.card-admin-drawer') || event.target.closest('.card-icon-btn'))) {
    return;
  }
  window.open(`detail.html?id=${id}`, '_blank');
};

// 9. Delete Anniversary
window.deleteAnniversary = async function(id) {
  const item = state.anniversaries.find(ann => ann.id === id);
  if (!item) return;

  if (confirm(`确定要彻底删除回忆“${item.title}”吗？这个操作不可撤销。`)) {
    try {
      const res = await fetch(`/api/anniversaries/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        showToast('回忆已被尘封删除');
        fetchAllData();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除操作发生网络错误', 'error');
    }
  }
};

// ==========================================================================
// EVENT LISTENERS & MODAL TOGGLERS
// ==========================================================================

function initEventListeners() {
  
  // 1. Modal toggle clicks
  const closeModal = (modal) => {
    modal.classList.add('hidden');
  };



  DOM.adminLockBtn.addEventListener('click', () => {
    if (state.isAdmin) {
      // If already logged in, prompt to log out immediately
      if (confirm('确定要退出管理员模式吗？')) {
        logoutAdmin();
      }
    } else {
      DOM.passcodeInput.value = '';
      DOM.loginErrorMsg.classList.add('hidden');
      DOM.loginModal.classList.remove('hidden');
      DOM.passcodeInput.focus();
    }
  });

  // Attach cancel modal button actions
  document.querySelectorAll('.cancel-modal, .close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });

  // Hide modal on outer overlay click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Password visibility eye toggle
  DOM.togglePassword.addEventListener('click', () => {
    const isPassword = DOM.passcodeInput.type === 'password';
    DOM.passcodeInput.type = isPassword ? 'text' : 'password';
    DOM.togglePassword.className = isPassword ? 'far fa-eye-slash password-eye' : 'far fa-eye password-eye';
  });

  // 2. Submit Login passcode form
  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passcode = DOM.passcodeInput.value.trim();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message);
        closeModal(DOM.loginModal);
        checkAdminStatus();
      } else {
        DOM.loginErrorMsg.textContent = data.error || '验证失败';
        DOM.loginErrorMsg.classList.remove('hidden');
      }
    } catch (error) {
      DOM.loginErrorMsg.textContent = '服务器连线失败，请重试';
      DOM.loginErrorMsg.classList.remove('hidden');
    }
  });

  // 3. Admin Logout trigger
  async function logoutAdmin() {
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'info');
        checkAdminStatus();
      }
    } catch (error) {
      showToast('安全退出发生网络错误', 'error');
    }
  }
  DOM.logoutBtn.addEventListener('click', logoutAdmin);

  // 4. Create New Anniversary Button Trigger
  DOM.addAnnBtn.addEventListener('click', () => {
    DOM.modalTitleText.innerHTML = '<i class="fas fa-calendar-plus"></i> 添加纪念日';
    DOM.annIdInput.value = '';
    DOM.annForm.reset();
    resetImageUploadArea();
    DOM.annErrorMsg.classList.add('hidden');
    
    // Default date value to today
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    DOM.annDateInput.value = `${year}-${month}-${day}`;
    DOM.annTypeInput.value = 'one-time';
    DOM.annModal.classList.remove('hidden');
  });

  // 5. Drag and Drop Image File Upload Area Handlers
  DOM.imageDragArea.addEventListener('click', (e) => {
    // Avoid click bubbling from thumbnail delete button
    if (e.target.closest('.thumb-remove-btn')) return;
    DOM.annImageInput.click();
  });

  DOM.annImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageUploads(e.target.files);
    }
  });

  // Drag over/leave area styles
  ['dragenter', 'dragover'].forEach(eventName => {
    DOM.imageDragArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      DOM.imageDragArea.style.borderColor = 'var(--primary-neon)';
      DOM.imageDragArea.style.background = 'rgba(255, 51, 102, 0.05)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    DOM.imageDragArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      DOM.imageDragArea.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      DOM.imageDragArea.style.background = 'rgba(255, 255, 255, 0.02)';
    }, false);
  });

  DOM.imageDragArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleImageUploads(files);
    }
  });

  // 6. Submit Anniversary Form (Add or Update)
  DOM.annForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = DOM.annIdInput.value;
    const title = DOM.annTitleInput.value.trim();
    const date = DOM.annDateInput.value;
    const type = DOM.annTypeInput.value;
    const tagsRaw = DOM.annTagsInput.value;
    const description = DOM.annDescInput.value.trim();
    const images = state.uploadedImages;

    // Convert comma/space-separated tags to list of clean tags
    const tags = tagsRaw
      ? tagsRaw.split(/[,，\s]+/).map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const payload = { title, date, type, tags, description, images };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/anniversaries/${id}` : '/api/anniversaries';

    try {
      DOM.saveAnnBtn.disabled = true;
      DOM.saveAnnBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(id ? '回忆更新成功！' : '新的甜蜜纪念已被封存记录！');
        closeModal(DOM.annModal);
        fetchAllData();
      } else {
        DOM.annErrorMsg.textContent = data.error || '保存回忆失败';
        DOM.annErrorMsg.classList.remove('hidden');
      }
    } catch (error) {
      DOM.annErrorMsg.textContent = '保存失败，服务器网络连接超时';
      DOM.annErrorMsg.classList.remove('hidden');
    } finally {
      DOM.saveAnnBtn.disabled = false;
      DOM.saveAnnBtn.innerHTML = '保存回忆';
    }
  });

  // 7. Site Configuration Settings Trigger and Submit
  DOM.toggleSetPassword.addEventListener('click', () => {
    const isPassword = DOM.setPasscodeInput.type === 'password';
    DOM.setPasscodeInput.type = isPassword ? 'text' : 'password';
    DOM.toggleSetPassword.className = isPassword ? 'far fa-eye-slash password-eye' : 'far fa-eye password-eye';
  });

  DOM.faviconUploadBtn.addEventListener('click', () => {
    DOM.setFaviconUpload.click();
  });

  DOM.setFaviconUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      DOM.faviconUploadBtn.disabled = true;
      DOM.faviconUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        DOM.setFaviconUrl.value = data.imageUrl;
        DOM.faviconPreviewBox.innerHTML = `<img src="${data.imageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        showToast('网站图标上传成功！');
      } else {
        showToast(data.error || '上传图标失败', 'error');
      }
    } catch (error) {
      showToast('上传图标发生网络错误', 'error');
    } finally {
      DOM.faviconUploadBtn.disabled = false;
      DOM.faviconUploadBtn.innerHTML = '<i class="fas fa-upload"></i> 上传新图标';
    }
  });

  DOM.editSettingsBtn.addEventListener('click', () => {
    DOM.setTitleInput.value = state.stationTitle || '';
    DOM.setSinceInput.value = state.togetherSince || '';
    DOM.setPasscodeInput.value = '';
    DOM.setPasscodeInput.type = 'password';
    DOM.toggleSetPassword.className = 'far fa-eye password-eye';

    const favUrl = state.favicon || '';
    DOM.setFaviconUrl.value = favUrl;
    if (favUrl) {
      DOM.faviconPreviewBox.innerHTML = `<img src="${favUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
      DOM.faviconPreviewBox.innerHTML = '❤️';
    }

    DOM.settingsErrorMsg.classList.add('hidden');
    DOM.settingsModal.classList.remove('hidden');
  });

  DOM.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = DOM.setTitleInput.value.trim();
    const togetherSince = DOM.setSinceInput.value;
    const adminPasscode = DOM.setPasscodeInput.value;
    const favicon = DOM.setFaviconUrl.value;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, togetherSince, adminPasscode, favicon })
      });
      const data = await res.json();

      if (res.ok) {
        showToast('小站配置更新成功！');
        closeModal(DOM.settingsModal);
        fetchAllData();
      } else {
        DOM.settingsErrorMsg.textContent = data.error || '更新配置失败';
        DOM.settingsErrorMsg.classList.remove('hidden');
      }
    } catch (error) {
      DOM.settingsErrorMsg.textContent = '更新配置网络通信错误';
      DOM.settingsErrorMsg.classList.remove('hidden');
    }
  });

  // 8. ZIP Backup Export Trigger
  DOM.exportBtn.addEventListener('click', () => {
    showToast('正在为您打包并下载整站备份 (JSON + 上传的所有图片)...', 'info');
    // Using window.location.href to prompt immediate download
    window.location.href = '/api/export';
  });

  // 9. ZIP Backup Import Trigger
  DOM.importTriggerBtn.addEventListener('click', () => {
    if (confirm('警告！导入备份包将会覆盖现有的所有数据和上传的图片，且不可撤销！确定要导入吗？')) {
      DOM.backupFileInput.click();
    }
  });

  DOM.backupFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('backup', file);

    showToast('备份文件上传导入中，请不要关闭页面...', 'info');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        showToast('恭喜！系统数据及历史相册成功全量恢复！');
        // Clear value to allow re-trigger on same file
        DOM.backupFileInput.value = '';
        fetchAllData();
      } else {
        showToast(data.error || '数据导入还原失败', 'error');
      }
    } catch (error) {
      showToast('导入备份发生意外网络错误', 'error');
      console.error('Import backup error:', error);
    }
  });
}

// ==========================================================================
// ON PAGE LOAD INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkAdminStatus();
  fetchAllData();
});
