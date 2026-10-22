import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, LogIn, Sparkles, Check } from 'lucide-react';
import { Spinner } from '@maxhub/max-ui';
import { colors, spacing, borderRadius, transitions, fonts, studentAvatars } from '../theme/tokens';
import { hapticImpact } from '../services/maxBridge';
import { TactileButton } from '../components/TactileButton';

export interface StudentJoinProps {
  initialPin?: string;
  onJoinRoom?: (data: { pin: string; displayName: string; avatar: string }) => void;
  onJoined?: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '12px 14px 18px',
    boxSizing: 'border-box',
    color: colors.textPrimary,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(14, 25, 45, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 24,
    padding: '18px 16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  mascotHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  mascotImg: {
    width: 72,
    height: 72,
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'drop-shadow(0 4px 12px rgba(255, 122, 0, 0.25))',
  },
  welcomeBubble: {
    backgroundColor: colors.bgSecondary,
    borderLeft: `3px solid ${colors.foxOrange}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm + 2}px ${spacing.md}px`,
    flex: 1,
  },
  welcomeBubbleTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: colors.textPrimary,
    margin: '0 0 2px 0',
  },
  welcomeBubbleText: {
    fontSize: 12,
    color: colors.textSecondary,
    margin: 0,
    lineHeight: 1.4,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    boxSizing: 'border-box',
  },
  pinDigitBox: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    height: 56,
    backgroundColor: colors.bgSecondary,
    border: `2px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 800,
    fontFamily: fonts.mono,
    textAlign: 'center',
    outline: 'none',
    transition: transitions.fast,
    boxSizing: 'border-box',
    caretColor: colors.foxOrange,
  },
  pinDigitBoxActive: {
    borderColor: colors.foxOrange,
    boxShadow: `0 0 12px ${colors.foxOrange}40`,
  },
  pinDigitBoxFilled: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    padding: `0 ${spacing.md}px`,
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: transitions.fast,
  },
  avatarPickerRow: {
    display: 'flex',
    gap: spacing.md,
    overflowX: 'auto',
    paddingBottom: spacing.xs,
    paddingTop: 4,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  avatarOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    flexShrink: 0,
    userSelect: 'none',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.bgSecondary,
    border: '2px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    transition: transitions.fast,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
  },
  avatarCircleSelected: {
    border: `3px solid ${colors.foxOrange}`,
    boxShadow: `0 0 16px ${colors.foxOrange}60`,
    transform: 'scale(1.05)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.foxOrange,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
  },
  avatarName: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  avatarNameSelected: {
    color: colors.foxOrange,
    fontWeight: 700,
  },
  joinButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.foxOrange,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: borderRadius.lg,
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    boxShadow: `0 4px 20px ${colors.foxOrange}55`,
    transition: transitions.fast,
    userSelect: 'none',
  },
  joinButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: colors.textMuted,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  quickNameChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  quickNameChip: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cardSurfaceHover,
    color: colors.textSecondary,
    border: `1px solid ${colors.cardBorder}`,
    cursor: 'pointer',
    userSelect: 'none',
  },
};

export default function StudentJoin({
  initialPin = '',
  onJoinRoom,
  onJoined,
}: StudentJoinProps) {
  // Parse initial PIN if provided (e.g. '482915' or '482 915')
  const cleanInitial = initialPin.replace(/\s+/g, '').slice(0, 6);
  const initialDigits = Array.from({ length: 6 }, (_, i) => cleanInitial[i] || '');

  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [activeDigitIndex, setActiveDigitIndex] = useState<number>(cleanInitial.length < 6 ? cleanInitial.length : 0);
  const [displayName, setDisplayName] = useState<string>('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('hedgehog');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto focus first empty box on load
  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => d === '');
    const indexToFocus = firstEmpty === -1 ? 0 : firstEmpty;
    inputRefs.current[indexToFocus]?.focus();
  }, []);

  // Handle digit typing
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      // Cleared
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    hapticImpact('light');

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveDigitIndex(index + 1);
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveDigitIndex(index - 1);
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle full PIN Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    hapticImpact('medium');
    const newDigits = Array.from({ length: 6 }, (_, i) => pastedData[i] || '');
    setDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setActiveDigitIndex(nextIndex);
  };

  const fullPin = digits.join('');
  const isFormValid = fullPin.length === 6 && displayName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    hapticImpact('heavy');
    setIsSubmitting(true);

    setTimeout(() => {
      onJoinRoom?.({
        pin: fullPin,
        displayName: displayName.trim(),
        avatar: selectedAvatarId,
      });
      onJoined?.();
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div style={styles.container}>
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.card}
      >
        {/* Mascot Greeting */}
        <div style={styles.mascotHeader}>
          <motion.img
            src="/assets/mascot/sprint_idle.png"
            alt="Спринт"
            style={styles.mascotImg}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          />
          <div style={styles.welcomeBubble}>
            <h2 style={styles.welcomeBubbleTitle}>Привет! Заходи в игру</h2>
            <p style={styles.welcomeBubbleText}>
              Введи 6-значный PIN от учителя, напиши своё имя и выбери лесного аватара!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* PIN Input Section */}
          <div style={styles.section}>
            <div style={styles.label}>
              <span>Код комнаты (PIN)</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>6 цифр</span>
            </div>

            <div style={styles.pinRow} onPaste={handlePaste}>
              {digits.map((digit, idx) => {
                const isFocused = activeDigitIndex === idx;
                const isFilled = digit !== '';

                return (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onFocus={() => setActiveDigitIndex(idx)}
                    style={{
                      ...styles.pinDigitBox,
                      ...(isFocused ? styles.pinDigitBoxActive : {}),
                      ...(isFilled && !isFocused ? styles.pinDigitBoxFilled : {}),
                    }}
                    autoComplete="off"
                  />
                );
              })}
            </div>
          </div>

          {/* Display Name Input Section */}
          <div style={styles.section}>
            <label style={styles.label}>
              <span>Твоё имя или никнейм</span>
              <User size={14} color={colors.textSecondary} />
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Например: Маша или Лисичка-1"
              maxLength={20}
              style={styles.input}
            />

            <div style={styles.quickNameChips}>
              <span style={{ fontSize: 11, color: colors.textMuted, alignSelf: 'center' }}>
                Быстро:
              </span>
              {['Маша', 'Артём', 'София', 'Дима'].map((sampleName) => (
                <span
                  key={sampleName}
                  style={styles.quickNameChip}
                  onClick={() => {
                    setDisplayName(sampleName);
                    hapticImpact('light');
                  }}
                >
                  {sampleName}
                </span>
              ))}
            </div>
          </div>

          {/* Avatar Picker Section */}
          <div style={styles.section}>
            <div style={styles.label}>
              <span>Выбери аватара</span>
              <Sparkles size={14} color={colors.foxOrange} />
            </div>

            <div style={styles.avatarPickerRow}>
              {studentAvatars.map((avatar) => {
                const isSelected = selectedAvatarId === avatar.id;

                return (
                  <div
                    key={avatar.id}
                    style={styles.avatarOption}
                    onClick={() => {
                      hapticImpact('light');
                      setSelectedAvatarId(avatar.id);
                    }}
                  >
                    <motion.div
                      style={{
                        ...styles.avatarCircle,
                        ...(isSelected ? styles.avatarCircleSelected : {}),
                      }}
                      whileTap={{ scale: 0.95 }}
                      animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
                    >
                      <img
                        src={avatar.src}
                        alt={avatar.name}
                        style={styles.avatarImg}
                        loading="lazy"
                      />
                      {isSelected && (
                        <div style={styles.selectedBadge}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </motion.div>
                    <span
                      style={{
                        ...styles.avatarName,
                        ...(isSelected ? styles.avatarNameSelected : {}),
                      }}
                    >
                      {avatar.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Join Room Button */}
          <TactileButton
            theme="orange"
            size="lg"
            fullWidth
            disabled={!isFormValid || isSubmitting}
            onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            iconBefore={isSubmitting ? <Spinner size={20} appearance="contrast-static" /> : <LogIn size={20} />}
          >
            {isSubmitting ? 'Подключение к викторине...' : 'Войти в комнату'}
          </TactileButton>
        </form>
      </motion.div>
    </div>
  );
}
