import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Sparkles, Flame, Droplets } from 'lucide-react';
import { haptics } from '../services/haptics';
import { roomApi, JoinRoomResponse } from '../services/roomApi';
import { authService } from '../services/authService';

export interface JoinRoomPayload {
  pin: string;
  joinData: JoinRoomResponse;
  name: string;
  avatar: string;
}

interface StudentHomeProps {
  onJoinGame?: (payload: JoinRoomPayload) => void;
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
  const [selectedAvatar, setSelectedAvatar] = useState(() => authService.getCachedUser()?.avatar || 'fox_smart');
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      const cached = authService.getCachedUser();
      if (cached?.display_name) return cached.display_name;
      const saved = sessionStorage.getItem('lisquiz_student_name');
      if (saved) return saved;
      const pool = ['Иван К', 'Анна С', 'Михаил В', 'София М', 'Даниил Р', 'Алиса Т', 'Максим Д'];
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      sessionStorage.setItem('lisquiz_student_name', chosen);
      return chosen;
    } catch {
      return 'Иван К';
    }
  });
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    haptics.selection();
    setErrorMsg(null);

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
    setErrorMsg(null);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const fullPin = digits.join('');
  const canJoin = fullPin.length === 6;

  const handleJoin = async () => {
    if (!canJoin || isJoining) return;
    haptics.notification('success');
    setIsJoining(true);
    setErrorMsg(null);

    const trimmedName = studentName.trim() || 'Ученик';
    try {
      const joinData = await roomApi.joinRoom(fullPin, trimmedName, selectedAvatar);
      setIsJoining(false);
      onJoinGame?.({
        pin: fullPin,
        joinData,
        name: trimmedName,
        avatar: selectedAvatar,
      });
    } catch (err: any) {
      setIsJoining(false);
      setErrorMsg(err.message || 'Комната с таким кодом не найдена');
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Вход в викторину</h1>
      </header>

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
          {digits.map((digit, i) => {
            const isFilled = Boolean(digit);
            return (
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
                  backgroundColor: isFilled ? '#2A1F18' : '#1B2742',
                  borderColor: isFilled ? '#FF7A00' : '#33446B',
                  borderBottomColor: isFilled ? '#B85000' : '#23304E',
                  color: isFilled ? '#FF9E3B' : '#FFFFFF',
                }}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div style={{ color: '#EF4444', fontSize: 12, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>
            {errorMsg}
          </div>
        )}

        {/* Name Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <span style={styles.avatarLabel}>Твое имя:</span>
          <input
            type="text"
            value={studentName}
            maxLength={20}
            onChange={(e) => {
              const val = e.target.value;
              setStudentName(val);
              try { sessionStorage.setItem('lisquiz_student_name', val); } catch {}
            }}
            placeholder="Введи свое имя..."
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              backgroundColor: '#1B2742',
              border: '1.5px solid #33446B',
              borderBottom: '3px solid #23304E',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              outline: 'none',
              boxSizing: 'border-box',
              width: '100%',
            }}
          />
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
                    backgroundColor: isSelected ? '#2A1F18' : '#1B2742',
                    borderColor: isSelected ? '#FF7A00' : '#33446B',
                    borderBottomColor: isSelected ? '#B85000' : '#23304E',
                  }}
                >
                  <span style={styles.avatarEmoji}>{av.label.split(' ')[0]}</span>
                  {isSelected && <span style={styles.checkDot}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Tactile Action Button (Duolingo 3D button) */}
        <motion.button
          whileTap={canJoin && !isJoining ? { y: 2 } : {}}
          disabled={!canJoin || isJoining}
          onClick={handleJoin}
          style={{
            ...styles.joinBtn,
            opacity: canJoin ? 1 : 0.45,
            cursor: canJoin ? 'pointer' : 'not-allowed',
          }}
        >
          <Sparkles size={20} />
          <span>{isJoining ? 'Подключение...' : 'Войти в викторину'}</span>
        </motion.button>
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
    backgroundColor: 'transparent',
    padding: '14px 14px 92px',
    boxSizing: 'border-box',
    gap: 12,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  greetingCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '4px solid #1E2B45',
    borderRadius: 20,
    padding: '16px 18px',
  },
  mascotSpeech: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 17,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  greetingSub: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 4,
    lineHeight: 1.4,
    fontWeight: 500,
  },
  mascotImg: {
    width: 68,
    height: 68,
    objectFit: 'contain',
    marginLeft: 10,
    filter: 'drop-shadow(0 4px 14px rgba(255, 122, 0, 0.4))',
  },
  joinCard: {
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '4px solid #1E2B45',
    borderRadius: 22,
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
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
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: '-0.2px',
  },
  pinHint: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: 700,
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
    maxWidth: 48,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'solid',
    borderBottomWidth: 4,
    textAlign: 'center',
    fontSize: 24,
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
    fontSize: 12,
    fontWeight: 800,
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'solid',
    borderBottomWidth: 3,
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  checkDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
  },
  joinBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    border: 'none',
    borderBottom: '4px solid #B85000',
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: '0.2px',
    boxShadow: '0 4px 14px rgba(255, 122, 0, 0.4)',
    transition: 'all 0.15s ease',
  },
  groveSnapshotCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10232E',
    border: '2px solid #1B4A3C',
    borderBottom: '4px solid #14382E',
    borderRadius: 20,
    padding: '14px 16px',
    cursor: 'pointer',
  },
  groveSnapshotLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  groveIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    border: '1.5px solid rgba(16, 185, 129, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groveSnapshotTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: '#34D399',
  },
  groveSnapshotSub: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
    fontWeight: 600,
  },
  groveSnapshotBtn: {
    border: 'none',
    borderBottom: '3px solid #065F46',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '8px 14px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  questCard: {
    backgroundColor: '#192136',
    border: '1.5px solid rgba(245, 158, 11, 0.4)',
    borderBottom: '4px solid #78350F',
    borderRadius: 18,
    padding: '16px 18px',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
  },
  questHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: 900,
    color: '#FBBF24',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  questText: {
    fontSize: 13,
    color: '#E2E8F0',
    margin: 0,
    lineHeight: 1.45,
    fontWeight: 500,
  },
};
