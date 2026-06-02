const App = (() => {
  let _pendingFiles = [];
  let _editingId = null;

  async function init() {
    _applyTheme(localStorage.getItem('nosotros_theme') || 'dark');
    _applyView(localStorage.getItem('nosotros_view') || 'vertical');
    Timeline.init(localStorage.getItem('nosotros_view') || 'vertical', openDetail);
    _setupLightbox();
    _setupHeader();
    _setupFilters();
    _setupModals();
    _setupFormModal();
    _setupAuth();

    EventsStore.subscribe(events => {
      Timeline.render(events);
      _renderYearPills();
    });

    await EventsStore.init();
    _renderYearPills();
  }

  /* ── Theme ── */
  function _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nosotros_theme', theme);
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    });
  }

  function _applyView(view) {
    localStorage.setItem('nosotros_view', view);
    document.getElementById('btn-vertical')?.classList.toggle('active', view === 'vertical');
    document.getElementById('btn-horizontal')?.classList.toggle('active', view === 'horizontal');
  }

  /* ── Header controls ── */
  function _setupHeader() {
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        _applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
    });

    document.getElementById('btn-vertical')?.addEventListener('click', () => {
      Timeline.setMode('vertical'); _applyView('vertical');
      Timeline.render(EventsStore.getFiltered());
    });

    document.getElementById('btn-horizontal')?.addEventListener('click', () => {
      Timeline.setMode('horizontal'); _applyView('horizontal');
      Timeline.render(EventsStore.getFiltered());
    });

    document.getElementById('btn-add-event')?.addEventListener('click', openAddModal);
    document.getElementById('btn-export')?.addEventListener('click', () => Storage.exportJSON(EventsStore.getAll()));
    document.getElementById('btn-import-file')?.addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = await Storage.importJSON(f);
        await Storage.save(data);
        await EventsStore.init();
        Toast.show('Datos importados correctamente');
      } catch(err) {
        console.error('Error al importar datos:', err);
        Toast.show('Error al importar el fichero', 'error');
      }
    });

    document.getElementById('btn-search')?.addEventListener('input', e => {
      EventsStore.setFilter('search', e.target.value.trim());
    });
  }

  /* ── Filters ── */
  function _setupFilters() {
    document.querySelectorAll('[data-filter-person]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-person]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        EventsStore.setFilter('person', btn.dataset.filterPerson);
        // Actualizar label del trigger
        const label = document.getElementById('dd-persona-label');
        if (label) label.textContent = btn.dataset.filterPerson === 'all' ? 'Persona' : btn.textContent;
        // Cerrar dropdown
        document.getElementById('dd-persona-panel')?.setAttribute('hidden', '');
        document.getElementById('dd-persona-btn')?.setAttribute('aria-expanded', 'false');
      });
    });

    document.querySelectorAll('[data-filter-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        EventsStore.setFilter('category', btn.dataset.filterCat);
        // Actualizar label del trigger
        const label = document.getElementById('dd-cat-label');
        if (label) label.textContent = btn.dataset.filterCat === 'all' ? 'Categoría' : btn.textContent;
        // Cerrar dropdown
        document.getElementById('dd-cat-panel')?.setAttribute('hidden', '');
        document.getElementById('dd-cat-btn')?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function _renderYearPills() {
    const container = document.getElementById('year-pills');
    if (!container) return;
    const years = EventsStore.getYears();
    const filters = EventsStore.getFilters();
    container.innerHTML = '<button class="year-pill' + (filters.year === null ? ' active' : '') + '" data-year="all">Todos</button>';
    years.forEach(y => {
      const pill = document.createElement('button');
      pill.className = 'year-pill' + (filters.year === y ? ' active' : '');
      pill.dataset.year = y;
      pill.textContent = y;
      container.appendChild(pill);
    });
    container.querySelectorAll('.year-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.year-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.year === 'all' ? null : +btn.dataset.year;
        EventsStore.setFilter('year', val);
        // Actualizar label del trigger
        const label = document.getElementById('dd-year-label');
        if (label) label.textContent = val ? btn.textContent : 'Año';
        // Cerrar dropdown
        document.getElementById('dd-year-panel')?.setAttribute('hidden', '');
        document.getElementById('dd-year-btn')?.setAttribute('aria-expanded', 'false');
        if (val) {
          setTimeout(() => {
            const el = document.getElementById('year-' + val);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      });
    });
  }

  /* ── Modal helpers ── */
  function _setupModals() {
    // Detail modal close
    document.getElementById('modal-detail-close')?.addEventListener('click', closeDetail);
    document.getElementById('modal-detail')?.addEventListener('click', e => {
      if (e.target.id === 'modal-detail') closeDetail();
    });
    // Login modal close
    document.getElementById('modal-login-close')?.addEventListener('click', closeLogin);
    document.getElementById('modal-login')?.addEventListener('click', e => {
      if (e.target.id === 'modal-login') closeLogin();
    });
    // Lightbox keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDetail(); closeForm(); closeLogin(); Gallery.closeLightbox(); }
      if (e.key === 'ArrowLeft') Gallery.prevSlide();
      if (e.key === 'ArrowRight') Gallery.nextSlide();
    });
  }

  function _setupLightbox() {
    document.getElementById('lb-close')?.addEventListener('click', Gallery.closeLightbox);
    document.getElementById('lb-prev')?.addEventListener('click', Gallery.prevSlide);
    document.getElementById('lb-next')?.addEventListener('click', Gallery.nextSlide);
    document.getElementById('lightbox')?.addEventListener('click', e => {
      if (e.target.id === 'lightbox') Gallery.closeLightbox();
    });
  }

  /* ── Detail Modal ── */
  function openDetail(id) {
    const ev = EventsStore.getById(id);
    if (!ev) return;
    const modal = document.getElementById('modal-detail');
    const personCfg = CONFIG.PERSONS[ev.person];
    const catCfg = CONFIG.CATEGORIES[ev.category] || { emoji: '•', label: ev.category };

    modal.querySelector('#detail-title').textContent = ev.title;
    modal.querySelector('#detail-date').textContent = `${CONFIG.MONTH_NAMES[ev.month]} ${ev.year}`;
    modal.querySelector('#detail-person').textContent = personCfg.label;
    modal.querySelector('#detail-person').className = `detail-badge person-badge-${ev.person}`;
    modal.querySelector('#detail-cat').textContent = catCfg.label;
    modal.querySelector('#detail-desc').textContent = ev.description;


    const galleryEl = modal.querySelector('#detail-gallery');
    Gallery.renderGallery(ev.images || [], galleryEl);

    modal.querySelector('#detail-btn-edit').onclick = () => { closeDetail(); openEditModal(id); };
    modal.querySelector('#detail-btn-delete').onclick = () => _confirmDelete(id);

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    document.getElementById('modal-detail')?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  async function _confirmDelete(id) {
    const ev = EventsStore.getById(id);
    if (!ev) return;
    if (confirm(`¿Eliminar "${ev.title}"? Esta acción no se puede deshacer.`)) {
      try {
        await EventsStore.remove(id);
        closeDetail();
        Toast.show('Evento eliminado');
      } catch (err) {
        Toast.show('Error al eliminar el evento', 'error');
        console.error(err);
      }
    }
  }

  /* ── Form Modal (Add/Edit) ── */
  function _setupFormModal() {
    document.getElementById('modal-form-close')?.addEventListener('click', closeForm);
    document.getElementById('modal-form')?.addEventListener('click', e => {
      if (e.target.id === 'modal-form') closeForm();
    });
    document.getElementById('form-event')?.addEventListener('submit', handleFormSubmit);

    const dropZone = document.getElementById('form-dropzone');
    const preview = document.getElementById('form-img-preview');
    if (dropZone) {
      Gallery.initDropZone(dropZone, preview, files => { _pendingFiles.push(...files); });
    }
  }

  function openAddModal() {
    _editingId = null;
    _pendingFiles = [];
    _resetForm();
    document.getElementById('form-modal-title').textContent = 'Nuevo evento';
    document.getElementById('modal-form').removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function openEditModal(id) {
    const ev = EventsStore.getById(id);
    if (!ev) return;
    _editingId = id;
    _pendingFiles = [];
    _fillForm(ev);
    document.getElementById('form-modal-title').textContent = 'Editar evento';
    document.getElementById('modal-form').removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeForm() {
    document.getElementById('modal-form')?.setAttribute('hidden', '');
    document.body.style.overflow = '';
    _pendingFiles = [];
    _editingId = null;
  }

  function _resetForm() {
    const form = document.getElementById('form-event');
    if (form) form.reset();
    const preview = document.getElementById('form-img-preview');
    if (preview) preview.innerHTML = '';
    const existingGallery = document.getElementById('form-existing-gallery');
    if (existingGallery) existingGallery.innerHTML = '';
  }

  function _fillForm(ev) {
    _resetForm();
    const f = document.getElementById('form-event');
    f.querySelector('#f-year').value = ev.year || '';
    f.querySelector('#f-month').value = ev.month || '';
    f.querySelector('#f-title').value = ev.title || '';
    f.querySelector('#f-desc').value = ev.description || '';
    f.querySelector('#f-person').value = ev.person || 'juntos';
    f.querySelector('#f-category').value = ev.category || 'vida';

    // Show existing images
    const gallery = document.getElementById('form-existing-gallery');
    if (gallery && ev.images && ev.images.length) {
      gallery.innerHTML = '<p class="form-label">Imágenes actuales:</p>';
      ev.images.forEach((img, i) => {
        const item = document.createElement('div');
        item.className = 'upload-preview-item';
        item.innerHTML = `<img src="${img.thumb || img.url}" alt="img ${i}">
          <button type="button" class="remove-img" data-i="${i}">✕</button>`;
        item.querySelector('.remove-img').onclick = () => {
          const cur = EventsStore.getById(_editingId);
          if (cur) {
            cur.images.splice(i, 1);
            _fillForm(cur);
          }
        };
        gallery.appendChild(item);
      });
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const submitBtn = f.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const year = +f.querySelector('#f-year').value;
    const month = +f.querySelector('#f-month').value;
    const date = `${year}-${String(month).padStart(2,'0')}`;

    // Upload pending images
    let newImages = [];
    if (_pendingFiles.length > 0) {
      Toast.show(`Subiendo ${_pendingFiles.length} imagen(es)...`);
      newImages = await Gallery.processFiles(_pendingFiles, (cur, total) => {
        submitBtn.textContent = `Subiendo ${cur}/${total}...`;
      });
    }

    const data = {
      date, year, month,
      title: f.querySelector('#f-title').value.trim(),
      emoji: '',
      description: f.querySelector('#f-desc').value.trim(),
      person: f.querySelector('#f-person').value,
      category: f.querySelector('#f-category').value,
      tags: [],
      images: []
    };

    try {
      if (_editingId) {
        const cur = EventsStore.getById(_editingId);
        data.images = [...(cur?.images || []), ...newImages];
        await EventsStore.update(_editingId, data);
        Toast.show('Evento actualizado');
      } else {
        data.images = newImages;
        await EventsStore.add(data);
        Toast.show('Evento añadido');
      }
      closeForm();
    } catch (err) {
      Toast.show('Error al guardar el evento', 'error');
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar';
    }
  }

  /* ── Auth (Supabase) ── */
  function _setupAuth() {
    // Open login modal
    const openLoginBtnDesktop = document.getElementById('btn-login-desktop');
    const openLoginBtnMobile = document.getElementById('btn-login-mobile');
    const openLogin = () => {
      document.getElementById('modal-login').removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    };
    openLoginBtnDesktop?.addEventListener('click', openLogin);
    openLoginBtnMobile?.addEventListener('click', openLogin);

    // Logout triggers
    const logoutBtnDesktop = document.getElementById('btn-logout-desktop');
    const logoutBtnMobile = document.getElementById('btn-logout-mobile');
    const handleLogout = async () => {
      try {
        await Storage.logout();
        Toast.show('Sesión cerrada');
      } catch (err) {
        Toast.show('Error al cerrar sesión', 'error');
      }
    };
    logoutBtnDesktop?.addEventListener('click', handleLogout);
    logoutBtnMobile?.addEventListener('click', handleLogout);

    // Submit login form
    document.getElementById('form-login')?.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Accediendo...';
      
      const email = form.querySelector('#l-email').value.trim();
      const password = form.querySelector('#l-password').value.trim();

      try {
        await Storage.login(email, password);
        Toast.show('Sesión iniciada correctamente');
        closeLogin();
      } catch (err) {
        Toast.show('Credenciales incorrectas', 'error');
        console.error(err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Acceder';
      }
    });

    // Listen to changes
    Storage.onAuthChange(isLoggedIn => {
      _updateAuthUI(isLoggedIn);
    });
  }

  function closeLogin() {
    document.getElementById('modal-login')?.setAttribute('hidden', '');
    document.body.style.overflow = '';
    const form = document.getElementById('form-login');
    if (form) form.reset();
  }

  function _updateAuthUI(isLoggedIn) {
    const isConfigured = Storage.isConfigured();
    
    // Auth header buttons
    const loginBtnDesktop = document.getElementById('btn-login-desktop');
    const loginBtnMobile = document.getElementById('btn-login-mobile');
    const logoutBtnDesktop = document.getElementById('btn-logout-desktop');
    const logoutBtnMobile = document.getElementById('btn-logout-mobile');

    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');

    if (!isConfigured) {
      if (loginBtnDesktop) loginBtnDesktop.style.display = 'none';
      if (loginBtnMobile) loginBtnMobile.style.display = 'none';
      if (logoutBtnDesktop) logoutBtnDesktop.style.display = 'none';
      if (logoutBtnMobile) logoutBtnMobile.style.display = 'none';
      if (btnExport) btnExport.style.display = '';
      if (btnImport) btnImport.style.display = '';
      
      const btnAdd = document.getElementById('btn-add-event');
      if (btnAdd) btnAdd.style.display = '';
      const fabAdd = document.getElementById('fab-add');
      if (fabAdd) fabAdd.style.display = '';
      const detailEdit = document.getElementById('detail-btn-edit');
      if (detailEdit) detailEdit.style.display = '';
      const detailDel = document.getElementById('detail-btn-delete');
      if (detailDel) detailDel.style.display = '';
      return;
    }

    if (isLoggedIn) {
      if (loginBtnDesktop) loginBtnDesktop.style.display = 'none';
      if (loginBtnMobile) loginBtnMobile.style.display = 'none';
      if (logoutBtnDesktop) logoutBtnDesktop.style.display = '';
      if (logoutBtnMobile) logoutBtnMobile.style.display = '';
      if (btnExport) btnExport.style.display = '';
      if (btnImport) btnImport.style.display = '';

      const btnAdd = document.getElementById('btn-add-event');
      if (btnAdd) btnAdd.style.display = '';
      const fabAdd = document.getElementById('fab-add');
      if (fabAdd) {
        if (window.innerWidth < 1090) {
          fabAdd.style.display = '';
        } else {
          fabAdd.style.display = 'none';
        }
      }
      const detailEdit = document.getElementById('detail-btn-edit');
      if (detailEdit) detailEdit.style.display = '';
      const detailDel = document.getElementById('detail-btn-delete');
      if (detailDel) detailDel.style.display = '';
    } else {
      if (loginBtnDesktop) loginBtnDesktop.style.display = '';
      if (loginBtnMobile) loginBtnMobile.style.display = '';
      if (logoutBtnDesktop) logoutBtnDesktop.style.display = 'none';
      if (logoutBtnMobile) logoutBtnMobile.style.display = 'none';
      if (btnExport) btnExport.style.display = 'none';
      if (btnImport) btnImport.style.display = 'none';

      const btnAdd = document.getElementById('btn-add-event');
      if (btnAdd) btnAdd.style.display = 'none';
      const fabAdd = document.getElementById('fab-add');
      if (fabAdd) fabAdd.style.display = 'none';
      const detailEdit = document.getElementById('detail-btn-edit');
      if (detailEdit) detailEdit.style.display = 'none';
      const detailDel = document.getElementById('detail-btn-delete');
      if (detailDel) detailDel.style.display = 'none';
    }
  }

  /* ── Toast ── */
  const Toast = {
    show(msg, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = msg;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    }
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
