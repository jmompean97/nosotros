const EventsStore = (() => {
  let _events = [];
  let _filters = { person: 'all', category: 'all', year: null, search: '' };
  let _sortOrder = 'asc';
  const _subscribers = [];

  function subscribe(fn) { _subscribers.push(fn); }
  function _notify() { _subscribers.forEach(fn => fn(getFiltered())); }

  async function init() {
    _events = await Storage.load();
    _notify();
  }

  function getAll() { return [..._events]; }

  function getFiltered() {
    let result = _events.filter(ev => {
      if (_filters.person !== 'all' && ev.person !== _filters.person) return false;
      if (_filters.category !== 'all' && ev.category !== _filters.category) return false;
      if (_filters.year && ev.year !== _filters.year) return false;
      if (_filters.search) {
        const q = _filters.search.toLowerCase();
        if (!ev.title.toLowerCase().includes(q) && !ev.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (_sortOrder === 'desc') {
      result.reverse();
    }
    return result;
  }

  function toggleSortOrder() {
    _sortOrder = _sortOrder === 'asc' ? 'desc' : 'asc';
    _notify();
  }

  function getSortOrder() {
    return _sortOrder;
  }

  function setFilter(key, value) {
    _filters[key] = value;
    _notify();
  }

  function getFilters() { return { ..._filters }; }

  function getById(id) { return _events.find(e => e.id === id) || null; }

  async function add(data) {
    const ev = {
      ...data,
      id: 'evt_' + Date.now(),
      images: data.images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await Storage.addEvent(ev);
    _events.push(ev);
    _events.sort((a, b) => a.date.localeCompare(b.date));
    _notify();
    return ev;
  }

  async function update(id, data) {
    const idx = _events.findIndex(e => e.id === id);
    if (idx < 0) return null;
    const updated = { ..._events[idx], ...data, id, updatedAt: new Date().toISOString() };
    await Storage.updateEvent(id, updated);
    _events[idx] = updated;
    _events.sort((a, b) => a.date.localeCompare(b.date));
    _notify();
    return _events[idx];
  }

  async function remove(id) {
    await Storage.deleteEvent(id);
    _events = _events.filter(e => e.id !== id);
    _notify();
  }

  function getYears() {
    return [...new Set(_events.map(e => e.year))].sort();
  }

  return { init, subscribe, getAll, getFiltered, getFilters, setFilter, getById, add, update, remove, getYears, toggleSortOrder, getSortOrder };
})();
