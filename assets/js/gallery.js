const Gallery = (() => {
  let _lightboxImages = [];
  let _lightboxIndex = 0;

  /* ── Upload to ImgBB ── */
  async function uploadToImgBB(file, apiKey) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        const base64 = e.target.result.split(',')[1];
        const form = new FormData();
        form.append('key', apiKey);
        form.append('image', base64);
        try {
          const res = await fetch(CONFIG.IMGBB_ENDPOINT, { method: 'POST', body: form });
          const json = await res.json();
          if (json.success) {
            resolve({ url: json.data.url, thumb: json.data.thumb?.url || json.data.url, deleteUrl: json.data.delete_url });
          } else {
            reject(json.error?.message || 'Upload failed');
          }
        } catch(err) { reject(err); }
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Local base64 fallback ── */
  async function toBase64(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  /* ── Process files (upload or base64) ── */
  async function processFiles(files, onProgress) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (onProgress) onProgress(i + 1, files.length, file.name);
      try {
        if (CONFIG.IMGBB_API_KEY) {
          const img = await uploadToImgBB(file, CONFIG.IMGBB_API_KEY);
          results.push(img);
        } else {
          const data = await toBase64(file);
          results.push({ url: data, thumb: data, deleteUrl: null });
        }
      } catch(err) {
        console.error('Error uploading', file.name, err);
      }
    }
    return results;
  }

  /* ── Drop Zone ── */
  function initDropZone(el, previewEl, onFilesSelected) {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('drag-over');
      handleFiles(Array.from(e.dataTransfer.files), previewEl, onFilesSelected);
    });
    el.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.multiple = true; input.accept = 'image/*';
      input.onchange = () => handleFiles(Array.from(input.files), previewEl, onFilesSelected);
      input.click();
    });
  }

  function handleFiles(files, previewEl, cb) {
    const images = files.filter(f => f.type.startsWith('image/'));
    renderPreview(images, previewEl);
    if (cb) cb(images);
  }

  function renderPreview(files, container) {
    if (!container) return;
    files.forEach(file => {
      const thumb = document.createElement('div');
      thumb.className = 'upload-preview-item';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      const name = document.createElement('span');
      name.textContent = file.name.length > 15 ? file.name.slice(0,12)+'...' : file.name;
      thumb.append(img, name);
      container.appendChild(thumb);
    });
  }

  /* ── Gallery render ── */
  function renderGallery(images, container) {
    container.innerHTML = '';
    if (!images || !images.length) return;
    images.forEach((img, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `<img src="${img.thumb || img.url}" alt="foto ${i+1}" loading="lazy">`;
      item.addEventListener('click', () => openLightbox(images, i));
      container.appendChild(item);
    });
  }

  /* ── Lightbox ── */
  function openLightbox(images, index) {
    _lightboxImages = images;
    _lightboxIndex = index;
    const lb = document.getElementById('lightbox');
    lb.removeAttribute('hidden');
    lb.classList.add('active');
    _renderLightboxSlide();
    document.body.style.overflow = 'hidden';
  }

  function _renderLightboxSlide() {
    const lb = document.getElementById('lightbox');
    const img = lb.querySelector('#lb-img');
    const counter = lb.querySelector('#lb-counter');
    const cur = _lightboxImages[_lightboxIndex];
    img.src = cur.url;
    if (counter) counter.textContent = `${_lightboxIndex + 1} / ${_lightboxImages.length}`;
  }

  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.setAttribute('hidden', '');
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  function prevSlide() {
    _lightboxIndex = (_lightboxIndex - 1 + _lightboxImages.length) % _lightboxImages.length;
    _renderLightboxSlide();
  }

  function nextSlide() {
    _lightboxIndex = (_lightboxIndex + 1) % _lightboxImages.length;
    _renderLightboxSlide();
  }

  return { initDropZone, renderGallery, processFiles, openLightbox, closeLightbox, prevSlide, nextSlide };
})();
