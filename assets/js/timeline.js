const Timeline = (() => {
  let _mode = 'vertical'; // 'vertical' | 'horizontal'
  let _onEventClick = null;

  let _resizeRaf = null;
  let _carouselIntervals = []; // IDs de setInterval activos de carruseles

  function _clearCarousels() {
    _carouselIntervals.forEach(id => clearInterval(id));
    _carouselIntervals = [];
  }

  function init(mode, onEventClick) {
    _mode = mode;
    _onEventClick = onEventClick;

    // Recalcular conectores (líneas hacia el punto común) al redimensionar
    window.addEventListener('resize', () => {
      if (_resizeRaf) cancelAnimationFrame(_resizeRaf);
      _resizeRaf = requestAnimationFrame(_drawAllConnectors);
    });

    // Redibujar cuando las fuentes terminen de cargar (cambian la altura de las tarjetas)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(_drawAllConnectors);
    }
  }

  function setMode(mode) {
    _mode = mode;
    const container = document.getElementById('timeline-container');
    container.className = 'timeline-' + mode;
  }

  function render(events) {
    _clearCarousels(); // Limpiar carruseles previos antes de re-renderizar
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';
    container.className = 'timeline-' + _mode;

    if (!events.length) {
      container.innerHTML = '<div class="empty-state"><p>No hay eventos que coincidan con los filtros.</p></div>';
      return;
    }

    const grouped = _groupByYear(events);
    if (_mode === 'vertical') _renderVertical(grouped, container);
    else _renderHorizontal(grouped, container);
  }

  function _groupByYear(events) {
    const map = {};
    events.forEach(ev => {
      if (!map[ev.year]) map[ev.year] = { year: ev.year, months: {} };
      const m = ev.month;
      if (!map[ev.year].months[m]) map[ev.year].months[m] = [];
      map[ev.year].months[m].push(ev);
    });
    const sorted = Object.values(map).sort((a, b) => a.year - b.year);
    if (EventsStore.getSortOrder() === 'desc') sorted.reverse();
    return sorted;
  }

  /* ─────────────────────────── VERTICAL ─────────────────────────── */
  function _renderVertical(groups, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'v-timeline';

    let _vIndex = 0; // alternancia global izquierda/derecha
    groups.forEach(group => {
      const yearEl = document.createElement('div');
      yearEl.className = 'v-year-group';
      yearEl.id = 'year-' + group.year;

      const yearBadge = document.createElement('div');
      yearBadge.className = 'v-year-badge';
      yearBadge.textContent = group.year;
      yearEl.appendChild(yearBadge);

      const months = Object.keys(group.months).sort((a, b) => +a - +b);
      if (EventsStore.getSortOrder() === 'desc') months.reverse();
      months.forEach(month => {
        const evs = group.months[month];

        const monthGroup = document.createElement('div');
        monthGroup.className = 'v-month-group';

        // Etiqueta de mes como título separador (encima del grupo)
        const monthLabel = document.createElement('div');
        monthLabel.className = 'v-month-label';
        monthLabel.textContent = CONFIG.MONTH_NAMES[+month];
        monthGroup.appendChild(monthLabel);

        // Nodo del mes: un único punto central + tarjetas alternando lados.
        // Las líneas (conectores) hacia el punto se dibujan en _buildConnectors.
        const node = document.createElement('div');
        node.className = 'v-month-node';

        node.appendChild(_createMonthDot(evs, 'v-month-dot'));

        evs.forEach(ev => {
          const side = _vIndex++ % 2 === 0 ? 'left' : 'right';
          node.appendChild(_createVBranch(ev, side));
        });

        monthGroup.appendChild(node);
        yearEl.appendChild(monthGroup);
      });

      wrapper.appendChild(yearEl);
    });

    container.appendChild(wrapper);
    _refreshConnectors();

    // Intersection observer for scroll animations
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    container.querySelectorAll('.v-card').forEach(c => observer.observe(c));
  }

  /* ─────────────────────────── HORIZONTAL ─────────────────────────── */
  function _renderHorizontal(groups, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'h-timeline';

    const track = document.createElement('div');
    track.className = 'h-track';

    const line = document.createElement('div');
    line.className = 'h-line';
    track.appendChild(line);

    let _hIndex = 0; // alternancia global arriba/abajo
    groups.forEach(group => {
      const yearMark = document.createElement('div');
      yearMark.className = 'h-year-marker';
      yearMark.innerHTML = `<div class="h-year-dot"></div><span>${group.year}</span>`;
      track.appendChild(yearMark);

      const months = Object.keys(group.months).sort((a, b) => +a - +b);
      if (EventsStore.getSortOrder() === 'desc') months.reverse();
      months.forEach(month => {
        const node = _createHNode(group.months[month], +month, group.year, () => _hIndex++);
        track.appendChild(node);
      });
    });

    wrapper.appendChild(track);
    container.appendChild(wrapper);
    _refreshConnectors();

    // Scroll & Drag logic for desktop
    let isDown = false;
    let isDragging = false;
    let startX;
    let scrollLeft;

    wrapper.addEventListener('mousedown', (e) => {
      isDown = true;
      isDragging = false;
      wrapper.classList.add('is-dragging');
      startX = e.pageX - wrapper.offsetLeft;
      scrollLeft = wrapper.scrollLeft;
    });

    wrapper.addEventListener('mouseleave', () => {
      isDown = false;
      wrapper.classList.remove('is-dragging');
    });

    wrapper.addEventListener('mouseup', () => {
      isDown = false;
      wrapper.classList.remove('is-dragging');
      setTimeout(() => { isDragging = false; }, 0);
    });

    wrapper.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - wrapper.offsetLeft;
      if (Math.abs(x - startX) > 5) isDragging = true;
      const walk = (x - startX) * 2;
      wrapper.scrollLeft = scrollLeft - walk;
    });

    wrapper.addEventListener('click', (e) => {
      if (isDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);



    // Animate
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    container.querySelectorAll('.h-node').forEach(n => observer.observe(n));
  }

  /* ─────────────────────────── PUNTO MULTICOLOR ─────────────────────────── */
  // Personas distintas presentes en el mes, en orden de aparición
  function _distinctPersons(evs) {
    const seen = [];
    evs.forEach(ev => { if (!seen.includes(ev.person)) seen.push(ev.person); });
    return seen;
  }

  // conic-gradient con partes iguales por persona presente
  function _dotBackground(evs) {
    const persons = _distinctPersons(evs);
    if (persons.length === 1) return CONFIG.PERSONS[persons[0]].color;
    const step = 100 / persons.length;
    const stops = persons.map((p, i) => {
      const c = CONFIG.PERSONS[p].color;
      return `${c} ${(step * i).toFixed(3)}% ${(step * (i + 1)).toFixed(3)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  function _createMonthDot(evs, className) {
    const dot = document.createElement('div');
    const persons = _distinctPersons(evs);
    dot.className = className + (persons.length === 1 ? ` person-${persons[0]}` : ' is-multi');
    dot.style.background = _dotBackground(evs);
    return dot;
  }

  /* ─────────────────────────── CARDS ─────────────────────────── */
  function _buildVCard(ev) {
    const card = document.createElement('div');
    card.className = `v-card person-${ev.person}`;
    card.setAttribute('data-id', ev.id);
    card.setAttribute('data-person', ev.person);

    const hasImages = ev.images && ev.images.length > 0;
    const personCfg = CONFIG.PERSONS[ev.person];
    const catCfg = CONFIG.CATEGORIES[ev.category] || { emoji: '•' };

    card.innerHTML = `
      ${hasImages ? `<div class="card-cover"><img src="${ev.images[0].thumb || ev.images[0].url}" alt="${ev.title}" loading="lazy"><div class="card-cover-count">${ev.images.length > 1 ? `${ev.images.length} fotos` : ''}</div></div>` : ''}
      <div class="card-body">
        <div class="card-meta">
          <span class="card-person person-badge-${ev.person}">${personCfg.label}</span>
          <span class="card-cat">${catCfg.label}</span>
        </div>
        <h3 class="card-title">${ev.title}</h3>
        <p class="card-desc">${ev.description}</p>
        <div class="card-hint">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>`;

    card.addEventListener('click', () => { if (_onEventClick) _onEventClick(ev.id); });
    return card;
  }

  function _createVBranch(ev, side) {
    const branch = document.createElement('div');
    branch.className = `v-branch side-${side}`;
    branch.appendChild(_buildVCard(ev));
    return branch;
  }

  function _createHNode(evs, month, year, nextPos) {
    const node = document.createElement('div');
    node.className = 'h-node';

    node.appendChild(_createMonthDot(evs, 'h-dot'));

    const label = document.createElement('div');
    label.className = 'h-date-label';
    label.textContent = `${CONFIG.MONTH_NAMES[month].slice(0, 3)} ${year}`;
    node.appendChild(label);

    // Tarjetas repartidas en horizontal alternando arriba/abajo (global).
    const events = document.createElement('div');
    events.className = 'h-events';
    evs.forEach(ev => {
      const pos = nextPos() % 2 === 0 ? 'top' : 'bottom';
      events.appendChild(_createHEvent(ev, pos));
    });
    node.appendChild(events);

    return node;
  }

  function _createHEvent(ev, pos) {
    const cell = document.createElement('div');
    cell.className = `h-event pos-${pos} person-${ev.person}`;
    cell.setAttribute('data-id', ev.id);

    const personCfg = CONFIG.PERSONS[ev.person];
    const hasImages = ev.images && ev.images.length > 0;
    const multiImg = hasImages && ev.images.length > 1;
    const coverAtBottom = pos === 'bottom';

    if (hasImages) cell.classList.add('has-img');

    const coverHTML = hasImages ? `<div class="h-card-cover${multiImg ? ' is-carousel' : ''}${coverAtBottom ? ' cover-bottom' : ''}">
      ${ev.images.map((img, i) =>
        `<img src="${img.thumb || img.url}" alt="${ev.title}" loading="lazy" class="h-carousel-img${i === 0 ? ' active' : ''}">`
      ).join('')}
      ${multiImg ? '<div class="h-carousel-dots">' +
        ev.images.map((_, i) => `<span class="h-carousel-dot${i === 0 ? ' active' : ''}"></span>`).join('') +
        '</div>' : ''}
    </div>` : '';

    const textHTML = `
      <span class="h-card-title">${ev.title}</span>
      <span class="h-card-person">${personCfg.label}</span>`;

    cell.innerHTML = `
      <div class="h-card person-${ev.person}${hasImages ? ' has-cover' : ''}${coverAtBottom ? ' cover-bottom' : ''}" data-person="${ev.person}">
        ${coverAtBottom ? textHTML + coverHTML : coverHTML + textHTML}
      </div>`;

    // Arrancar carrusel automático si hay más de 1 imagen
    if (multiImg) {
      const imgs = cell.querySelectorAll('.h-carousel-img');
      const dots = cell.querySelectorAll('.h-carousel-dot');
      let idx = 0;
      const id = setInterval(() => {
        imgs[idx].classList.remove('active');
        dots[idx].classList.remove('active');
        idx = (idx + 1) % imgs.length;
        imgs[idx].classList.add('active');
        dots[idx].classList.add('active');
      }, 2000);
      _carouselIntervals.push(id);
    }

    cell.addEventListener('click', () => { if (_onEventClick) _onEventClick(ev.id); });
    return cell;
  }

  /* ─────────────────────────── CONECTORES (LÍNEAS AL PUNTO) ─────────────────────────── */
  const SVGNS = 'http://www.w3.org/2000/svg';

  function _drawAllConnectors() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.querySelectorAll('.v-month-node, .h-node').forEach(_buildConnectors);
  }

  // Dibuja ya y reintenta en el siguiente frame (por si el layout aún no asentó)
  function _refreshConnectors() {
    _drawAllConnectors();
    requestAnimationFrame(_drawAllConnectors);
  }

  // Dibuja una línea desde cada tarjeta hacia el punto central común del mes.
  function _buildConnectors(node) {
    const dot = node.querySelector('.v-month-dot, .h-dot');
    if (!dot) return;

    const oldSvg = node.querySelector('svg.tl-connectors');
    if (oldSvg) oldSvg.remove();

    const w = node.offsetWidth;
    const h = node.offsetHeight;
    if (!w || !h) return;

    const nodeRect = node.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    const dx = dotRect.left + dotRect.width / 2 - nodeRect.left;
    const dy = dotRect.top + dotRect.height / 2 - nodeRect.top;

    const cards = node.querySelectorAll('.v-card, .h-card');
    if (!cards.length) return;

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'tl-connectors' + (_mode === 'horizontal' ? ' dashed' : ''));
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);

    const dirItems = []; // {angle, color} de cada tarjeta para el degradado direccional
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const left = r.left - nodeRect.left;
      const right = r.right - nodeRect.left;
      const top = r.top - nodeRect.top;
      const bottom = r.bottom - nodeRect.top;
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;

      let px, py;
      if (_mode === 'vertical') {
        // Conecta el borde de la tarjeta más cercano al punto
        if (cx >= dx) { px = left; py = cy; }
        else { px = right; py = cy; }
      } else {
        if (cy <= dy) { px = cx; py = bottom; }
        else { px = cx; py = top; }
      }

      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', dx.toFixed(1));
      line.setAttribute('y1', dy.toFixed(1));
      line.setAttribute('x2', px.toFixed(1));
      line.setAttribute('y2', py.toFixed(1));
      svg.appendChild(line);

      const person = card.getAttribute('data-person');
      if (person && CONFIG.PERSONS[person]) {
        dirItems.push({ angle: _angleTo(dx, dy, cx, cy), color: CONFIG.PERSONS[person].color });
      }
    });

    // El punto se pinta orientando cada color hacia su tarjeta
    if (dirItems.length) dot.style.background = _buildDotGradient(dirItems);

    node.insertBefore(svg, node.firstChild);
  }

  // Ángulo de brújula (0 = arriba, sentido horario) desde el punto a (x, y)
  function _angleTo(dx, dy, x, y) {
    const a = Math.atan2(x - dx, -(y - dy)) * 180 / Math.PI;
    return (a + 360) % 360;
  }

  // conic-gradient donde cada tarjeta posee el sector que mira hacia su dirección
  function _buildDotGradient(items) {
    if (items.length === 1) return items[0].color;
    const sorted = items.slice().sort((a, b) => a.angle - b.angle);
    const n = sorted.length;
    const cw = (from, to) => (to - from + 360) % 360; // distancia horaria

    // Límite (boundary) entre cada par de tarjetas consecutivas
    const bounds = sorted.map((it, i) => {
      const next = sorted[(i + 1) % n];
      return (it.angle + cw(it.angle, next.angle) / 2) % 360;
    });

    const start = bounds[n - 1];
    let cum = 0;
    const stops = [];
    for (let i = 0; i < n; i++) {
      const prevB = bounds[(i - 1 + n) % n];
      const len = cw(prevB, bounds[i]);
      stops.push(`${sorted[i].color} ${cum.toFixed(2)}deg ${(cum + len).toFixed(2)}deg`);
      cum += len;
    }
    return `conic-gradient(from ${start.toFixed(2)}deg, ${stops.join(', ')})`;
  }

  return { init, setMode, render };
})();
