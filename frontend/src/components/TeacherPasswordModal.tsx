import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, AlertCircle, ArrowLeft, CheckCircle2, Bot } from 'lucide-react';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import { authService } from '../services/authService';

export interface TeacherPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const TEACHER_PASSWORD = 'староста';

export const TeacherPasswordModal: React.FC<TeacherPasswordModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = password.trim();
    if (!clean) {
      setError('Введите код из бота или пароль');
      haptics.notification('error');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // 1. Проверка мастер-пароля разработчика/пилота
    if (clean.toLowerCase() === TEACHER_PASSWORD) {
      setIsSuccess(true);
      try {
        localStorage.setItem('lisquiz_teacher_unlocked', 'true');
        soundManager.playVictory();
      } catch {}
      haptics.notification('success');

      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        setPassword('');
        onSuccess();
      }, 400);
      return;
    }

    // 2. Проверка 6-значного OTP тикета из бота MAX
    try {
      const res = await authService.exchangeTicket(clean);
      if (res && res.user) {
        setIsSuccess(true);
        try {
          localStorage.setItem('lisquiz_teacher_unlocked', 'true');
          soundManager.playVictory();
        } catch {}
        haptics.notification('success');

        setTimeout(() => {
          setIsSuccess(false);
          setIsSubmitting(false);
          setPassword('');
          onSuccess();
        }, 400);
        return;
      } else {
        throw new Error('Код не найден');
      }
    } catch (err: any) {
      setError(
        clean.length >= 6
          ? 'Код из бота не найден или истёк (срок 5 мин). Запросите новый в боте @ideya_fiks_131_bot'
          : 'Неверный код или пароль учителя'
      );
      haptics.notification('error');
      try {
        soundManager.playKnock();
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setPassword('');
    setIsSuccess(false);
    setIsSubmitting(false);
    haptics.selection();
    onCancel();
  };

  return (
    <AnimatePresence>
      <div style={styles.backdrop}>
        {/* Click outside to cancel */}
        <div style={styles.backdropCover} onClick={handleCancel} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          style={styles.modalCard}
        >
          {/* Header icon badge */}
          <div style={styles.iconWrapper}>
            {isSuccess ? (
              <CheckCircle2 size={32} color="#10B981" strokeWidth={2.5} />
            ) : (
              <Lock size={30} color="#FF7A00" strokeWidth={2.4} />
            )}
          </div>

          <h2 style={styles.title}>
            {isSuccess ? 'Доступ разрешён!' : 'Вход для учителя'}
          </h2>

          <p style={styles.subtitle}>
            {isSuccess
              ? 'Добро пожаловать в кабинет учителя!'
              : 'Введите 6-значный код из бота Сферум/MAX или пароль доступа'}
          </p>

          {!isSuccess && (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} color="#94A3B8" style={styles.inputIcon} />
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Код из бота (729-104) или пароль"
                  style={{
                    ...styles.input,
                    borderColor: error ? '#EF4444' : 'rgba(255, 255, 255, 0.15)',
                    textAlign: 'center',
                    letterSpacing: password.includes('-') || password.length === 6 ? '2px' : 'normal',
                    fontWeight: 700,
                  }}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={styles.errorBox}
                >
                  <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
                  <span style={styles.errorText}>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...styles.submitBtn,
                  opacity: isSubmitting ? 0.7 : 1,
                }}
                onClick={handleSubmit}
              >
                <span>{isSubmitting ? 'Проверка...' : 'Войти в кабинет'}</span>
              </button>

              {/* Bot instructions banner */}
              <div style={styles.botHintCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Bot size={15} color="#60A5FA" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#93C5FD' }}>
                    Как получить код в боте:
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.4, textAlign: 'left' }}>
                  1. Откройте чат с <b>@ideya_fiks_131_bot</b> в MAX/Сферуме<br />
                  2. Нажмите <b>«💻 Вход на школьном ПК»</b><br />
                  3. Введите полученный 6-значный код сюда
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelBtn}
              >
                <ArrowLeft size={16} />
                <span>Ой, я ученик! Вернуться</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(10, 16, 28, 0.82)',
    backdropFilter: 'blur(8px)',
  },
  backdropCover: {
    position: 'absolute',
    inset: 0,
  },
  modalCard: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 380,
    background: 'linear-gradient(160deg, #1A253D 0%, #111A2D 100%)',
    borderRadius: 20,
    padding: '28px 24px 24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
    border: '2px solid rgba(255, 122, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    margin: '0 0 8px',
    fontFamily: 'Comfortaa, system-ui, sans-serif',
    fontSize: 20,
    fontWeight: 900,
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  subtitle: {
    margin: '0 0 20px',
    fontSize: 13,
    lineHeight: 1.5,
    color: '#94A3B8',
    maxWidth: 300,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px 13px 42px',
    backgroundColor: 'rgba(13, 20, 36, 0.95)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    textAlign: 'left',
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    lineHeight: 1.3,
  },
  submitBtn: {
    width: '100%',
    padding: '13px 16px',
    backgroundColor: '#FF7A00',
    backgroundImage: 'linear-gradient(180deg, #FF8C1A 0%, #E66A00 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 800,
    fontFamily: 'Comfortaa, system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(255, 122, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s, filter 0.2s',
  },
  cancelBtn: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'color 0.2s',
  },
  botHintCard: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 6,
  },
};

export default TeacherPasswordModal;
