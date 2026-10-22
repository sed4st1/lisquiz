import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Sparkles, Flame, Droplets } from 'lucide-react';
import { haptics } from '../services/haptics';

interface StudentHomeProps {
  onJoinGame?: (pin: string) => void;
  onGoToGrove?: () => void;
}

const AVATARS = [
  { id: 'fox_smart', label: '🦊 Лис Спринт' },
  { id: 'owl', label: '🦉 Сова' },
  { id: 'raccoon', label: '🦝 Енот' },
  { id: 'bear', label: '🐻 Медведь' },
  { id: 'hedgehog', label: '🦔 Ёжик' },
  { id: 'bunny', label: '🐰 Зайчик' },
];

export default function StudentHome({ onJoinGame, onGoToGrove }: StudentHomeProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [selectedAvatar, setSelectedAvatar] = useState('fox_smart');
  const [studentName] = useState('Иван К.');
  const [isJoining, setIsJoining] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    haptics.selection();

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const fullPin = digits.join('');
  const canJoin = fullPin.length === 6;

  const handleJoin = () => {
    if (!canJoin) return;
    haptics.notification('success');
    setIsJoining(true);
    setTimeout(() => {
      setIsJoining(false);
      onJoinGame?.(fullPin);
    }, 500);
  };

  return (
    <div style={styles.container}>
      {/* Mascot Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.greetingCard}
      >
        <div style={styles.mascotSpeech}>
          <h2 style={styles.greetingTitle}>Привет, {studentName}! 🦊</h2>
          <p style={styles.greetingSub}>
            5А класс, введи PIN с доски учителя для входа в игру
          </p>
        </div>

        <img
          src="/assets/mascot/sprint_idle.png"
          alt="Спринт"
          style={styles.mascotImg}
        />
      </motion.div>

      {/* Primary Join Game Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.joinCard}
      >
        <div style={styles.joinCardHeader}>
          <div style={styles.joinCardTitleRow}>
            <LogIn size={18} color="#FF7A00" />
            <span style={styles.joinCardTitle}>Подключение к уроку</span>
          </div>
          <span style={styles.pinHint}>6 цифр с экрана</span>
        </div>

        {/* 6-Digit PIN Boxes */}
        <div style={styles.pinRow} onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                ...styles.digitInput,
                backgroundColor: digit ? 'rgba(255, 122, 0, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                color: digit ? '#FFB366' : '#FFFFFF',
              }}
            />
          ))}
        </div>

        {/* Avatar Picker Chips */}
        <div style={styles.avatarSection}>
          <span style={styles.avatarLabel}>Твой персонаж:</span>
          <div style={styles.avatarRow}>
            {AVATARS.map((av) => {
              const isSelected = selectedAvatar === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setSelectedAvatar(av.id);
                  }}
                  style={{
                    ...styles.avatarChip,
                    backgroundColor: isSelected ? 'rgba(255, 122, 0, 0.28)' : 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={styles.avatarEmoji}>{av.label.split(' ')[0]}</span>
                  {isSelected && <span style={styles.checkDot}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Tactile Action Button */}
        <button
          disabled={!canJoin || isJoining}
          onClick={handleJoin}
          style={{
            ...styles.joinBtn,
            opacity: canJoin ? 1 : 0.45,
            cursor: canJoin ? 'pointer' : 'not-allowed',
          }}
        >
          <Sparkles size={18} />
          <span>{isJoining ? 'Подключение...' : 'Войти в викторину'}</span>
        </button>
      </motion.div>

      {/* Class Grove Mini Snapshot Card */}
      <div onClick={onGoToGrove} style={styles.groveSnapshotCard}>
        <div style={styles.groveSnapshotLeft}>
          <div style={styles.groveIconBadge}>
            <Droplets size={18} color="#34D399" />
          </div>
          <div>
            <div style={styles.groveSnapshotTitle}>Роща 5А класса (95%)</div>
            <div style={styles.groveSnapshotSub}>Волшебный Дуб, 5 дней стрик 🔥</div>
          </div>
        </div>

        <button style={styles.groveSnapshotBtn}>
          Перейти →
        </button>
      </div>

      {/* Daily Quest Card */}
      <div style={styles.questCard}>
        <div style={styles.questHeader}>
          <Flame size={16} color="#F59E0B" />
          <span style={styles.questTitle}>Задание дня</span>
        </div>
        <p style={styles.questText}>
          Поливай Древо Знаний каждый день и держи стрик, чтобы заработать золотые желуди!
        </p>
      </div>
    </div>
  );
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
    padding: '14px 14px 20px',
    boxSizing: 'border-box',
    gap: 12,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  greetingCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22, 32, 53, 0.9)',
    border: 'none',
    borderRadius: 20,
    padding: '14px 16px',
    boxShadow: 'none',
  },
  mascotSpeech: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
  },
  greetingSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 1.35,
  },
  mascotImg: {
    width: 62,
    height: 62,
    objectFit: 'contain',
    marginLeft: 8,
    filter: 'drop-shadow(0 4px 12px rgba(255, 122, 0, 0.3))',
  },
  joinCard: {
    backgroundColor: 'rgba(22, 32, 53, 0.95)',
    border: 'none',
    borderRadius: 22,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: 'none',
  },
  joinCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  joinCardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  joinCardTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  pinHint: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  pinRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    boxSizing: 'border-box',
  },
  digitInput: {
    flex: '1 1 0',
    minWidth: 0,
    maxWidth: 46,
    height: 48,
    borderRadius: 12,
    border: 'none',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 900,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  avatarRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  avatarChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  checkDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 800,
    boxShadow: 'none',
    transition: 'all 0.15s ease',
  },
  groveSnapshotCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    border: 'none',
    borderRadius: 18,
    padding: '12px 14px',
    boxShadow: 'none',
    cursor: 'pointer',
  },
  groveSnapshotLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  groveIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groveSnapshotTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  groveSnapshotSub: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
  },
  groveSnapshotBtn: {
    border: 'none',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    color: '#34D399',
    padding: '6px 12px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  questCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    borderRadius: 16,
    padding: '12px 14px',
    boxShadow: 'none',
  },
  questHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#F59E0B',
  },
  questText: {
    fontSize: 11,
    color: '#9CA3AF',
    margin: 0,
    lineHeight: 1.4,
  },
};
