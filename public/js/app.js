// ==========================================================================
// LOVESTATION FRONTEND CONTROLLER
// Handles dynamic rendering, state, API requests, and beautiful transitions.
// ==========================================================================

// Global App State
const state = {
  isAdmin: false,
  togetherSince: '2024-05-20',
  stationTitle: '我们的爱之小站',
  anniversaries: [],
  currentTagFilter: 'all'
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
  annTagsInput: document.getElementById('ann-tags-input'),
  annDescInput: document.getElementById('ann-desc-input'),
  annImageInput: document.getElementById('ann-image-input'),
  annImageUrl: document.getElementById('ann-image-url'),
  imageDragArea: document.getElementById('image-drag-area'),
  dragPrompt: document.getElementById('drag-prompt'),
  imagePreviewContainer: document.getElementById('image-preview-container'),
  imagePreview: document.getElementById('image-preview'),
  removePreviewBtn: document.getElementById('remove-preview-btn'),
  uploadStatus: document.getElementById('upload-status'),
  annErrorMsg: document.getElementById('ann-error-msg'),
  saveAnnBtn: document.getElementById('save-ann-btn'),
  
  settingsModal: document.getElementById('settings-modal'),
  settingsForm: document.getElementById('settings-form'),
  setTitleInput: document.getElementById('set-title-input'),
  setSinceInput: document.getElementById('set-since-input'),
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
    }
    
    // Render static site details
    DOM.stationTitle.textContent = state.stationTitle;
    document.title = `${state.stationTitle} - 情侣纪念日与回忆录`;
    DOM.togetherDateText.textContent = state.togetherSince;
    
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
    const eventDate = new Date(item.date + 'T00:00:00');
    eventDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - eventDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let pillClass = '';
    let pillText = '';

    if (diffDays > 0) {
      // Past event
      pillClass = 'countup';
      pillText = `已过去 ${diffDays} 天`;
    } else if (diffDays === 0) {
      // Happening today!
      pillClass = 'countup';
      pillText = '就在今天 ❤️';
    } else {
      // Future event (countdown)
      pillClass = 'countdown';
      pillText = `倒计时 ${Math.abs(diffDays)} 天`;
    }

    // Media background
    const hasImage = !!item.image;
    const mediaHTML = hasImage
      ? `<img class="card-image" src="${item.image}" alt="${item.title}" loading="lazy">`
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
          <button class="card-icon-btn btn-edit" onclick="openEditAnnModal('${item.id}')" title="编辑回忆"><i class="fas fa-edit"></i></button>
          <button class="card-icon-btn btn-delete" onclick="deleteAnniversary('${item.id}')" title="删除回忆"><i class="fas fa-trash-alt"></i></button>
         </div>`
      : '';

    html += `
      <article class="anniversary-card glass-panel" data-id="${item.id}">
        <div class="card-media-box ${hasImage ? '' : 'no-image'}">
          ${mediaHTML}
          <div class="card-days-pill ${pillClass}">${pillText}</div>
          ${adminDrawerHTML}
        </div>
        <div class="card-info">
          <div class="card-date"><i class="far fa-clock"></i> ${item.date}</div>
          <h2 class="card-title">${item.title}</h2>
          <p class="card-desc">${item.description || '这一天没有任何描述文字呢。但那些有你在的细节，我都深深记在了心里。'}</p>
          <div class="card-tags">${tagsHTML}</div>
        </div>
      </article>
    `;
  });

  DOM.anniversariesGrid.innerHTML = html;
}

// 7. Handle Image Upload & Drag/Drop Preview
async function handleImageUpload(file) {
  if (!file) return;
  
  DOM.uploadStatus.classList.remove('hidden');
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    
    if (res.ok) {
      DOM.annImageUrl.value = data.imageUrl;
      DOM.imagePreview.src = data.imageUrl;
      DOM.imagePreviewContainer.classList.remove('hidden');
      DOM.dragPrompt.classList.add('hidden');
      showToast('图片上传成功！');
    } else {
      showToast(data.error || '图片上传失败', 'error');
    }
  } catch (error) {
    showToast('图片上传发生错误，请重试', 'error');
    console.error('Upload error:', error);
  } finally {
    DOM.uploadStatus.classList.add('hidden');
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
  DOM.annTagsInput.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
  DOM.annDescInput.value = item.description || '';
  DOM.annImageUrl.value = item.image || '';

  // Handle preview rendering
  if (item.image) {
    DOM.imagePreview.src = item.image;
    DOM.imagePreviewContainer.classList.remove('hidden');
    DOM.dragPrompt.classList.add('hidden');
  } else {
    resetImageUploadArea();
  }

  DOM.annErrorMsg.classList.add('hidden');
  DOM.annModal.classList.remove('hidden');
};

function resetImageUploadArea() {
  DOM.annImageUrl.value = '';
  DOM.imagePreview.src = '';
  DOM.imagePreviewContainer.classList.add('hidden');
  DOM.dragPrompt.classList.remove('hidden');
  DOM.annImageInput.value = '';
}

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

    DOM.annModal.classList.remove('hidden');
  });

  // 5. Drag and Drop Image File Upload Area Handlers
  DOM.imageDragArea.addEventListener('click', (e) => {
    // Avoid click bubbling from remove button
    if (e.target.closest('#remove-preview-btn')) return;
    DOM.annImageInput.click();
  });

  DOM.annImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageUpload(e.target.files[0]);
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
      handleImageUpload(files[0]);
    }
  });

  DOM.removePreviewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImageUploadArea();
    showToast('照片预览已被移除', 'info');
  });

  // 6. Submit Anniversary Form (Add or Update)
  DOM.annForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = DOM.annIdInput.value;
    const title = DOM.annTitleInput.value.trim();
    const date = DOM.annDateInput.value;
    const tagsRaw = DOM.annTagsInput.value;
    const description = DOM.annDescInput.value.trim();
    const image = DOM.annImageUrl.value;

    // Convert comma/space-separated tags to list of clean tags
    const tags = tagsRaw
      ? tagsRaw.split(/[,，\s]+/).map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const payload = { title, date, tags, description, image };
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
  DOM.editSettingsBtn.addEventListener('click', () => {
    DOM.setTitleInput.value = state.stationTitle;
    DOM.setSinceInput.value = state.togetherSince;
    DOM.settingsErrorMsg.classList.add('hidden');
    DOM.settingsModal.classList.remove('hidden');
  });

  DOM.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = DOM.setTitleInput.value.trim();
    const togetherSince = DOM.setSinceInput.value;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, togetherSince })
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
