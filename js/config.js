/**
 * Dynamic Environment & Supabase Configuration Loader
 * Strictly loads credentials from `.env.local` or environment at runtime without hardcoding secrets.
 */

const envState = {
  url: '',
  anonKey: '',
  source: 'none' // 'env.local' | 'window' | 'localStorage' | 'none'
};

export const Config = {
  async loadEnv() {
    // 1. Try to load from window.__ENV__ (if injected at build/server time)
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.SUPABASE_URL && window.__ENV__.SUPABASE_ANON_KEY) {
      envState.url = window.__ENV__.SUPABASE_URL.trim();
      envState.anonKey = window.__ENV__.SUPABASE_ANON_KEY.trim();
      envState.source = 'window';
      return true;
    }

    // 2. Fetch and parse `.env.local` dynamically at runtime
    try {
      const response = await fetch('/.env.local', { cache: 'no-cache' });
      if (response.ok) {
        const text = await response.text();
        const parsed = this.parseEnvString(text);
        if (parsed.SUPABASE_URL && parsed.SUPABASE_ANON_KEY) {
          envState.url = parsed.SUPABASE_URL.trim();
          envState.anonKey = parsed.SUPABASE_ANON_KEY.trim();
          envState.source = 'env.local';
          return true;
        }
      }
    } catch (err) {
      // Local fetch blocked or file doesn't exist
    }

    // 3. Fallback to localStorage override if user entered it in UI
    const localUrl = localStorage.getItem('fintrack_supabase_url');
    const localKey = localStorage.getItem('fintrack_supabase_anon_key');
    if (localUrl && localKey) {
      envState.url = localUrl.trim();
      envState.anonKey = localKey.trim();
      envState.source = 'localStorage';
      return true;
    }

    return false;
  },

  parseEnvString(content) {
    const result = {};
    if (!content) return result;
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        result[key] = val;
      }
    }
    return result;
  },

  getSupabaseUrl() {
    return envState.url;
  },

  getSupabaseAnonKey() {
    return envState.anonKey;
  },

  getSource() {
    return envState.source;
  },

  setSupabaseConfig(url, anonKey) {
    if (url) {
      localStorage.setItem('fintrack_supabase_url', url.trim());
      envState.url = url.trim();
    } else {
      localStorage.removeItem('fintrack_supabase_url');
      envState.url = '';
    }

    if (anonKey) {
      localStorage.setItem('fintrack_supabase_anon_key', anonKey.trim());
      envState.anonKey = anonKey.trim();
    } else {
      localStorage.removeItem('fintrack_supabase_anon_key');
      envState.anonKey = '';
    }
    envState.source = url && anonKey ? 'localStorage' : 'none';
  },

  isSupabaseConfigured() {
    const url = this.getSupabaseUrl();
    const key = this.getSupabaseAnonKey();
    return Boolean(url && key && url.startsWith('http') && key.length > 20);
  }
};
