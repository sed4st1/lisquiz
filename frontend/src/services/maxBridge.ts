// Types for the MAX WebApp API
export interface MaxWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme: 'light' | 'dark';
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }> }) => void;
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
  }
}

// Check if running inside MAX WebApp
export function isInsideMax(): boolean {
  return typeof window !== 'undefined' && !!window.WebApp;
}

// Get the WebApp instance or a mock
export function getWebApp(): MaxWebApp {
  if (isInsideMax()) return window.WebApp!;
  // Mock for browser development
  return { ...mockWebApp };
}

// Create a comprehensive mock object for development outside MAX
const mockWebApp: MaxWebApp = {
  ready: () => console.log('[MaxBridge Mock] ready()'),
  expand: () => console.log('[MaxBridge Mock] expand()'),
  close: () => console.log('[MaxBridge Mock] close()'),
  colorScheme: 'dark',
  initData: '',
  initDataUnsafe: {
    user: {
      id: 12345,
      first_name: 'Тестовый',
      last_name: 'Учитель',
      username: 'test_teacher',
    },
    start_param: '',
  },
  HapticFeedback: {
    impactOccurred: (style) => console.log(`[Haptic Mock] impact: ${style}`),
    notificationOccurred: (type) => console.log(`[Haptic Mock] notification: ${type}`),
    selectionChanged: () => console.log('[Haptic Mock] selection changed'),
  },
  MainButton: {
    text: '',
    show: () => {},
    hide: () => {},
    onClick: () => {},
    offClick: () => {},
    setParams: () => {},
  },
  BackButton: {
    show: () => {},
    hide: () => {},
    onClick: () => {},
    offClick: () => {},
  },
  showPopup: (params) => alert(params.message),
};

// Convenience helpers
export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  getWebApp().HapticFeedback.impactOccurred(style);
}

export function hapticSuccess() {
  getWebApp().HapticFeedback.notificationOccurred('success');
}

export function hapticError() {
  getWebApp().HapticFeedback.notificationOccurred('error');
}

// Initialize the bridge on app load
export function initMaxBridge() {
  const app = getWebApp();
  app.ready();
  app.expand();
}
