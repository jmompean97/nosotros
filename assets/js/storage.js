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

  async function load() {
    if (_supabase) {
      try {
        const { data, error } = await _supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });
        if (error) throw error;
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        return data;
      } catch(e) {
        console.error('Supabase load failed, falling back to local:', e);
      }
    }
    
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch(e) {}
    }
    try {
      const r = await fetch(CONFIG.DATA_PATH);
      const data = await r.json();
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch(e) {
      console.error('Error loading events:', e);
      return [];
    }
  }

  // Supabase mutations
  async function addEvent(ev) {
    if (_supabase) {
      const { error } = await _supabase.from('events').insert([ev]);
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
      const { error } = await _supabase.from('events').update(ev).eq('id', id);
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
        const cleanEvents = events.map(e => ({
          id: e.id,
          date: e.date,
          year: parseInt(e.year) || new Date(e.date).getFullYear(),
          month: parseInt(e.month) || (new Date(e.date).getMonth() + 1),
          title: e.title || '',
          description: e.description || '',
          person: e.person || 'juntos',
          category: e.category || 'vida',
          emoji: e.emoji || '',
          images: Array.isArray(e.images) ? e.images : [],
          tags: Array.isArray(e.tags) ? e.tags : [],
          createdAt: e.createdAt || new Date().toISOString(),
          updatedAt: e.updatedAt || new Date().toISOString()
        }));

        const { error: insertError } = await _supabase.from('events').insert(cleanEvents);
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
