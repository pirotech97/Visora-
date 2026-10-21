export interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      throw new Error('Failed to load server config');
    }
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch server config:', err);
    return {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  }
}
