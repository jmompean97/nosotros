const CONFIG = {
  SUPABASE_URL: 'https://enxnrnqnvbprcgdcmawb.supabase.co/rest/v1/',          // URL de tu proyecto Supabase (ej. https://xxxx.supabase.co)
  SUPABASE_KEY: 'sb_publishable_D6G4cN5hsi3I0sOTCwdH6A_JLeRYsb1',          // Clave anon/public de tu Supabase
  IMGBB_API_KEY: '',         // Añade tu API key de ImgBB: https://api.imgbb.com/
  IMGBB_ENDPOINT: 'https://api.imgbb.com/1/upload',
  STORAGE_KEY: 'nosotros_events_v1',
  DATA_PATH: './data/events.json',
  VERSION: '1.0.0',
  PERSONS: {
    jorge: { label: 'Jorge', color: 'var(--color-jorge)', emoji: '👨' },
    gema: { label: 'Gema', color: 'var(--color-gema)', emoji: '👩' },
    juntos: { label: 'Juntos', color: 'var(--color-juntos)', emoji: '❤️' }
  },
  CATEGORIES: {
    hito: { label: 'Hito', emoji: '🌟' },
    viaje: { label: 'Viaje', emoji: '✈️' },
    estudios: { label: 'Estudios', emoji: '📚' },
    trabajo: { label: 'Trabajo', emoji: '💼' },
    vida: { label: 'Vida', emoji: '🌿' },
    familia: { label: 'Familia', emoji: '👨‍👩‍👧' }
  },
  MONTH_NAMES: ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
};
