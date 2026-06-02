const Timeline = (() => {
  let _mode = 'vertical'; // 'vertical' | 'horizontal'
  let _onEventClick = null;

  function init(mode, onEventClick) {
    _mode = mode;
    _onEventClick = onEventClick;
  }

  function setMode(mode) {
    _mode = mode;
    const container = document.getElementById('timeline-container');
    container.className = 'timeline-' + mode;
  }

  function render(events) {
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
    return Object.values(map).sort((a, b) => a.year - b.year);
  }

  /* ─────────────────────────── VERTICAL ─────────────────────────── */
  function _renderVertical(groups, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'v-timeline';

    groups.forEach(group => {
      const yearEl = document.createElement('div');
      yearEl.className = 'v-year-group';
      yearEl.id = 'year-' + group.year;

      const yearBadge = document.createElement('div');
      yearBadge.className = 'v-year-badge';
      yearBadge.textContent = group.year;
      yearEl.appendChild(yearBadge);

      let cardIndex = 0;
      const months = Object.keys(group.months).sort((a,b) => +a - +b);
      months.forEach(month => {
        const monthGroup = document.createElement('div');
        monthGroup.className = 'v-month-group';

        const monthLabel = document.createElement('div');
        monthLabel.className = 'v-month-label';
        monthLabel.textContent = CONFIG.MONTH_NAMES[+month];
        monthGroup.appendChild(monthLabel);

        group.months[month].forEach(ev => {
          const side = cardIndex % 2 === 0 ? 'left' : 'right';
          const card = _createCard(ev, side);
          monthGroup.appendChild(card);
          cardIndex++;
        });

        yearEl.appendChild(monthGroup);
      });

      wrapper.appendChild(yearEl);
    });

    container.appendChild(wrapper);

    // Intersection observer for scroll animations
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }});
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

    let evIndex = 0;
    groups.forEach(group => {
      const yearMark = document.createElement('div');
      yearMark.className = 'h-year-marker';
      yearMark.innerHTML = `<div class="h-year-dot"></div><span>${group.year}</span>`;
      track.appendChild(yearMark);

      const months = Object.keys(group.months).sort((a,b) => +a - +b);
      months.forEach(month => {
        group.months[month].forEach(ev => {
          const pos = evIndex % 2 === 0 ? 'top' : 'bottom';
          const node = _createHNode(ev, pos);
          track.appendChild(node);
          evIndex++;
        });
      });
    });

    wrapper.appendChild(track);
    container.appendChild(wrapper);

    // Animate
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }});
    }, { threshold: 0.1 });
    container.querySelectorAll('.h-node').forEach(n => observer.observe(n));
  }

  /* ─────────────────────────── CARD ─────────────────────────── */
  function _createCard(ev, side) {
    const wrapper = document.createElement('div');
    wrapper.className = `v-card-wrapper side-${side}`;

    const dot = document.createElement('div');
    dot.className = `v-dot person-${ev.person}`;

    const card = document.createElement('div');
    card.className = `v-card person-${ev.person}`;
    card.setAttribute('data-id', ev.id);

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
        <button class="card-btn" data-id="${ev.id}">Ver más →</button>
      </div>`;

    card.querySelector('.card-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (_onEventClick) _onEventClick(ev.id);
    });
    card.addEventListener('click', () => { if (_onEventClick) _onEventClick(ev.id); });

    if (side === 'left') wrapper.append(card, dot);
    else wrapper.append(dot, card);

    return wrapper;
  }

  function _createHNode(ev, pos) {
    const node = document.createElement('div');
    node.className = `h-node pos-${pos} person-${ev.person}`;
    node.setAttribute('data-id', ev.id);

    const personCfg = CONFIG.PERSONS[ev.person];
    node.innerHTML = `
      <div class="h-card person-${ev.person}">
        <span class="h-card-title">${ev.title}</span>
        <span class="h-card-person">${personCfg.label}</span>
      </div>
      <div class="h-dot person-${ev.person}"></div>
      <div class="h-stem"></div>
      <div class="h-date-label">${CONFIG.MONTH_NAMES[ev.month].slice(0,3)} ${ev.year}</div>`;

    node.addEventListener('click', () => { if (_onEventClick) _onEventClick(ev.id); });
    return node;
  }

  return { init, setMode, render };
})();
