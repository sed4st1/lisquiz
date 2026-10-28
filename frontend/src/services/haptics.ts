/**
 * CrossPlatformHapticBridge - Мультисенсорная тактильная отдача для мобильных WebApp
 * Поддерживает:
 * - VK / Сферум: vkBridge (VKWebAppTapticImpactOccurred, VKWebAppTapticNotificationOccurred)
 * - Telegram WebApp: Telegram.WebApp.HapticFeedback
 * - Browser Fallback: W3C navigator.vibrate
 */

export type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotification = 'success' | 'warning' | 'error';

interface TelegramHapticApi {
  impactOccurred: (style: HapticImpact) => void;
  notificationOccurred: (type: HapticNotification) => void;
  selectionChanged: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: TelegramHapticApi;
      };
    };
    vkBridge?: {
      send: (method: string, props?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

class CrossPlatformHapticBridge {
  private get tg(): TelegramHapticApi | null {
    return typeof window !== 'undefined'
      ? (window.Telegram?.WebApp?.HapticFeedback || (window.WebApp as any)?.HapticFeedback || null)
      : null;
  }

  private get isVk(): boolean {
    return typeof window !== 'undefined' && typeof window.vkBridge !== 'undefined';
  }

  /**
   * Тактильный импульс столкновения (клик кнопки, выбор опции)
   */
  public impact(style: HapticImpact = 'medium') {
    if (this.tg) {
      try {
        this.tg.impactOccurred(style);
      } catch {}
      return;
    }

    if (this.isVk) {
      const vkMapping = style === 'rigid' || style === 'heavy' ? 'heavy' : style === 'light' ? 'light' : 'medium';
      try {
        window.vkBridge?.send('VKWebAppTapticImpactOccurred', { style: vkMapping }).catch(() => {});
      } catch {}
      return;
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const ms = style === 'heavy' || style === 'rigid' ? 24 : style === 'medium' ? 14 : 8;
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }

  /**
   * Тактильное уведомление об успехе, ошибке или предупреждении
   */
  public notification(type: HapticNotification) {
    if (this.tg) {
      try {
        this.tg.notificationOccurred(type);
      } catch {}
      return;
    }

    if (this.isVk) {
      try {
        window.vkBridge?.send('VKWebAppTapticNotificationOccurred', { result: type }).catch(() => {});
      } catch {}
      return;
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'success') {
          // Двойной упругий щелчок триумфа
          navigator.vibrate([12, 50, 18]);
        } else if (type === 'error') {
          // Резкая серия предупреждения
          navigator.vibrate([30, 40, 30, 40, 45]);
        } else {
          navigator.vibrate(20);
        }
      } catch {}
    }
  }

  /**
   * Сухой микроклик переключателя при смене выбора
   */
  public selection() {
    if (this.tg) {
      try {
        this.tg.selectionChanged();
      } catch {}
      return;
    }

    if (this.isVk) {
      try {
        window.vkBridge?.send('VKWebAppTapticSelectionChanged', {}).catch(() => {});
      } catch {}
      return;
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(6);
      } catch {}
    }
  }

  /**
   * Каскад открытия сундука: 3 нарастающих импульса
   */
  public chestOpen() {
    this.impact('rigid');
    setTimeout(() => this.impact('rigid'), 80);
    setTimeout(() => this.notification('success'), 180);
  }

  /**
   * Каскад серии побед (Streak Counter): нарастание энергии
   */
  public streak() {
    this.impact('medium');
    setTimeout(() => this.impact('heavy'), 50);
  }
}

export const haptics = new CrossPlatformHapticBridge();
