const Storage = (() => {
  let _supabase = null;
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY && window.supabase) {
    _supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  }

  function isConfigured() {
    return !!_supabase;
  }

  async function login(email, password) {
    if (!_supabase) return;
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logout() {
    if (!_supabase) return;
    const { error } = await _supabase.auth.signOut();
    if (error) throw error;
  }

  function _toDbSchema(ev) {
    const dbEv = {};
    if (ev.id !== undefined) dbEv.id = ev.id;
    if (ev.date !== undefined) dbEv.date = ev.date;
    if (ev.year !== undefined) dbEv.year = parseInt(ev.year) || new Date(ev.date).getFullYear();
    if (ev.month !== undefined) dbEv.month = parseInt(ev.month) || (new Date(ev.date).getMonth() + 1);
    if (ev.title !== undefined) dbEv.title = ev.title;
    if (ev.description !== undefined) dbEv.description = ev.description;
    if (ev.person !== undefined) dbEv.person = ev.person;
    if (ev.category !== undefined) dbEv.category = ev.category;
    if (ev.emoji !== undefined) dbEv.emoji = ev.emoji;
    if (ev.images !== undefined) dbEv.images = Array.isArray(ev.images) ? ev.images : [];
    
    // Map camelCase (App) to snake_case (Database), omit tags
    if (ev.createdAt !== undefined) dbEv.created_at = ev.createdAt;
    else if (ev.created_at !== undefined) dbEv.created_at = ev.created_at;
    
    if (ev.updatedAt !== undefined) dbEv.updated_at = ev.updatedAt;
    else if (ev.updated_at !== undefined) dbEv.updated_at = ev.updated_at;
    
    return dbEv;
  }

  function _toAppSchema(dbEv) {
    if (!dbEv) return null;
    return {
      ...dbEv,
      createdAt: dbEv.created_at || dbEv.createdAt,
      updatedAt: dbEv.updated_at || dbEv.updatedAt,
      tags: dbEv.tags || []
    };
  }

  async function load() {
    if (_supabase) {
      try {
        const { data, error } = await _supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });
        if (error) throw error;
        const mappedData = data.map(_toAppSchema);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(mappedData));
        return mappedData;
      } catch(e) {
        console.error('Supabase load failed, falling back to local:', e);
      }
    }
    
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw).map(_toAppSchema); } catch(e) {}
    }
    try {
      const r = await fetch(CONFIG.DATA_PATH);
      const data = await r.json();
      const mappedData = data.map(_toAppSchema);
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(mappedData));
      return mappedData;
    } catch(e) {
      console.error('Error loading events:', e);
      return [];
    }
  }

  // Supabase mutations
  async function addEvent(ev) {
    if (_supabase) {
      const dbEv = _toDbSchema(ev);
      const { error } = await _supabase.from('events').insert([dbEv]);
      if (error) throw error;
    }
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    events.push(ev);
    events.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(events));
  }

  async function updateEvent(id, ev) {
    if (_supabase) {
      const dbEv = _toDbSchema(ev);
      const { error } = await _supabase.from('events').update(dbEv).eq('id', id);
      if (error) throw error;
    }
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    const idx = events.findIndex(e => e.id === id);
    if (idx >= 0) {
      events[idx] = { ...events[idx], ...ev };
      events.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(events));
    }
  }

  async function deleteEvent(id) {
    if (_supabase) {
      const { error } = await _supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    }
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    const filtered = events.filter(e => e.id !== id);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(filtered));
  }

  function onAuthChange(callback) {
    if (!_supabase) {
      callback(true);
      return;
    }
    _supabase.auth.getSession().then(({ data }) => {
      callback(!!data.session);
    });
    const { data: { subscription } } = _supabase.auth.onAuthStateChange((event, session) => {
      callback(!!session);
    });
    return subscription;
  }

  async function save(events) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(events));
    if (_supabase) {
      // 1. Borrar todos los eventos actuales de Supabase
      const { error: deleteError } = await _supabase.from('events').delete().neq('id', 'non_existent_id');
      if (deleteError) throw deleteError;

      // 2. Insertar en lote los nuevos registros importados
      if (events && events.length > 0) {
        const dbEvents = events.map(_toDbSchema);
        const { error: insertError } = await _supabase.from('events').insert(dbEvents);
        if (insertError) throw insertError;
      }
    }
  }

  function exportJSON(events) {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'events.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try { resolve(JSON.parse(e.target.result)); }
        catch(err) { reject(err); }
      };
      reader.readAsText(file);
    });
  }

  function reset() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
  }

  return {
    load,
    save,
    addEvent,
    updateEvent,
    deleteEvent,
    isConfigured,
    login,
    logout,
    onAuthChange,
    exportJSON,
    importJSON,
    reset
  };
})();
