/**
 * LISQUIZ Auth Service
 * 
 * Implements seamless Zero-PII authentication:
 * 1. Bot ticket exchange (/start -> ticket -> JWT)
 * 2. MAX WebApp initData verification
 * 3. Quick dev role switcher with persistent SQLite users
 * 4. LocalStorage JWT caching and Bearer headers
 */

export interface UserProfile {
  pseudonym_id: string;
  role: 'teacher' | 'student';
  display_name: string;
  avatar?: string;
  auth_provider?: string;
  created_at?: string;
}

export interface ExchangeResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface BotSimulateResponse {
  ticket: string;
  launch_url: string;
  command: string;
  user: UserProfile;
}

const TOKEN_KEY = 'lisquiz_jwt_token';
const USER_KEY = 'lisquiz_user_profile';

export const authService = {
  getAuthToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAuthToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save auth token to localStorage', e);
    }
  },

  getCachedUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCachedUser(user: UserProfile): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user profile to localStorage', e);
    }
  },

  clearAuth(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Failed to clear auth from localStorage', e);
    }
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },

  /**
   * Exchange an auth ticket received from Sferum / MAX Bot /start command.
   */
  async exchangeTicket(ticket: string): Promise<ExchangeResponse> {
    const res = await fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось обменять тикет авторизации');
    }

    const data: ExchangeResponse = await res.json();
    this.setAuthToken(data.access_token);
    this.setCachedUser(data.user);
    return data;
  },

  /**
   * Exchange raw MAX WebApp init_data string for JWT.
   */
  async exchangeInitData(initData: string): Promise<ExchangeResponse> {
    const res = await fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: initData }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка авторизации через MAX WebApp');
    }

    const data: ExchangeResponse = await res.json();
    this.setAuthToken(data.access_token);
    this.setCachedUser(data.user);
    return data;
  },

  /**
   * Instant dev login / role switch (creates or recovers user in DB with Zero-PII).
   */
  async quickLogin(
    role: 'teacher' | 'student',
    displayName?: string,
    avatar?: string
  ): Promise<ExchangeResponse> {
    const res = await fetch('/api/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quick_role: role,
        display_name: displayName,
        avatar: avatar,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось войти в аккаунт');
    }

    const data: ExchangeResponse = await res.json();
    this.setAuthToken(data.access_token);
    this.setCachedUser(data.user);
    return data;
  },

  /**
   * Fetch current user info with JWT validation.
   */
  async getMe(): Promise<UserProfile | null> {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.clearAuth();
        }
        return null;
      }

      const user: UserProfile = await res.json();
      this.setCachedUser(user);
      return user;
    } catch {
      return this.getCachedUser();
    }
  },

  /**
   * Simulate MAX / Sferum Bot /start command for test environments.
   */
  async simulateBotStart(
    command: string = '/start',
    role: 'teacher' | 'student' = 'teacher',
    displayName?: string,
    avatar?: string
  ): Promise<BotSimulateResponse> {
    const res = await fetch('/api/auth/bot/simulate-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        role,
        display_name: displayName,
        avatar,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось симулировать команду бота');
    }

    return res.json();
  },
};
