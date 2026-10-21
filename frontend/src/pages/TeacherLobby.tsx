import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Users,
  Copy,
  Check,
  Share2,
  Volume2,
  VolumeX,
  QrCode,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import { colors, spacing, borderRadius, shadows, transitions, fonts } from '../theme/tokens';
import AvatarGrid from '../components/AvatarGrid';
import { hapticImpact } from '../services/maxBridge';
import type { Player } from '../types/quiz';

export interface TeacherLobbyProps {
  pin?: string;
  quizTitle?: string;
  subject?: string;
  grade?: number;
  maxStudents?: number;
  onStartQuiz?: () => void;
  onBack?: () => void;
}

const INITIAL_PLAYERS: Player[] = [
  {
    id: 'p1',
    user_id: 'u1',
    display_name: 'Маша К.',
    avatar: 'hedgehog',
    score: 0,
    streak: 0,
    answers: [],
    is_online: true,
  },
  {
    id: 'p2',
    user_id: 'u2',
    display_name: 'Артём В.',
    avatar: 'raccoon',
    score: 0,
    streak: 0,
    answers: [],
    is_online: true,
  },
  {
    id: 'p3',
    user_id: 'u3',
    display_name: 'София Л.',
    avatar: 'owl',
    score: 0,
    streak: 0,
    answers: [],
    is_online: true,
  },
  {
    id: 'p4',
    user_id: 'u4',
    display_name: 'Дима С.',
    avatar: 'bear',
    score: 0,
    streak: 0,
    answers: [],
    is_online: true,
  },
  {
    id: 'p5',
    user_id: 'u5',
    display_name: 'Полина Т.',
    avatar: 'bunny',
    score: 0,
    streak: 0,
    answers: [],
    is_online: true,
  },
];

const EXTRA_STUDENTS: Array<{ name: string; avatar: string }> = [
  { name: 'Кирилл М.', avatar: 'squirrel' },
  { name: 'Алина Д.', avatar: 'hedgehog' },
  { name: 'Никита Б.', avatar: 'raccoon' },
  { name: 'Лена О.', avatar: 'owl' },
  { name: 'Иван З.', avatar: 'bear' },
];

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
    padding: `${spacing.md}px 0`,
    boxSizing: 'border-box',
    color: colors.textPrimary,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: 13,
    padding: 0,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: colors.emeraldGreen,
    padding: '4px 10px',
    borderRadius: borderRadius.pill,
    fontSize: 12,
    fontWeight: 600,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: colors.textPrimary,
    margin: 0,
    letterSpacing: '-0.3px',
  },
  quizMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    margin: 0,
  },
  pinPanel: {
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    boxShadow: `0 0 24px rgba(255, 122, 0, 0.12), ${shadows.card}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pinPanelGlow: {
    position: 'absolute',
    top: -40,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 200,
    height: 80,
    background: 'radial-gradient(circle, rgba(255, 122, 0, 0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  },
  pinDisplayContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pinNumber: {
    fontSize: 38,
    fontFamily: fonts.mono,
    fontWeight: 800,
    letterSpacing: '5px',
    color: '#FFFFFF',
    textShadow: '0 2px 12px rgba(255, 122, 0, 0.35)',
    userSelect: 'all',
  },
  copyBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSurfaceHover,
    border: `1px solid ${colors.cardBorder}`,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: transitions.fast,
  },
  qrAndStepsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    padding: `${spacing.sm}px 0`,
    borderTop: `1px solid ${colors.cardBorder}`,
    justifyContent: 'center',
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    color: '#111827',
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    padding: 6,
    boxSizing: 'border-box',
    position: 'relative',
  },
  qrInstruction: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textAlign: 'left',
  },
  playersCard: {
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  playersHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterBadge: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  counterHighlight: {
    color: colors.foxOrange,
    fontWeight: 800,
  },
  startButton: {
    width: '100%',
    height: 54,
    backgroundColor: colors.foxOrange,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: borderRadius.lg,
    fontSize: 18,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    boxShadow: `0 4px 20px ${colors.foxOrange}66`,
    userSelect: 'none',
  },
  startButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: colors.textMuted,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  controlsRow: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardSurfaceHover,
    border: `1px solid ${colors.cardBorder}`,
    color: colors.textSecondary,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: borderRadius.md,
    fontSize: 13,
    cursor: 'pointer',
    transition: transitions.fast,
  },
  countdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 19, 34, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    gap: spacing.lg,
  },
};

export default function TeacherLobby({
  pin = '482 915',
  quizTitle = 'Обыкновенные дроби: сложение и вычитание',
  subject = 'Математика',
  grade = 5,
  maxStudents = 30,
  onStartQuiz,
  onBack,
}: TeacherLobbyProps) {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [copied, setCopied] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [startCountdown, setStartCountdown] = useState<number>(3);

  // Copy PIN to clipboard
  const handleCopyPin = () => {
    hapticImpact('light');
    const cleanPin = pin.replace(/\s+/g, '');
    navigator.clipboard?.writeText(cleanPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add mock student for testing
  const handleAddMockStudent = () => {
    hapticImpact('light');
    if (players.length >= maxStudents) return;
    const nextMock = EXTRA_STUDENTS[players.length % EXTRA_STUDENTS.length];
    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      user_id: `u-${Date.now()}`,
      display_name: `${nextMock.name}`,
      avatar: nextMock.avatar,
      score: 0,
      streak: 0,
      answers: [],
      is_online: true,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  };

  // Start Quiz flow with countdown
  const handleStart = () => {
    if (players.length === 0) return;
    hapticImpact('heavy');
    setIsStarting(true);
    setStartCountdown(3);

    const interval = setInterval(() => {
      setStartCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            onStartQuiz?.();
          }, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 900);
  };

  const isReady = players.length > 0;

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        {onBack ? (
          <button onClick={onBack} style={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Завершить комнату</span>
          </button>
        ) : (
          <div style={{ width: 1 }} />
        )}

        <div style={styles.statusBadge}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: borderRadius.pill,
              backgroundColor: colors.emeraldGreen,
              boxShadow: `0 0 8px ${colors.emeraldGreen}`,
            }}
          />
          <span>Комната открыта</span>
        </div>
      </div>

      {/* Header Info */}
      <div style={styles.headerInfo}>
        <h1 style={styles.quizTitle}>{quizTitle}</h1>
        <p style={styles.quizMeta}>
          {subject} • {grade} класс • 5 заданий
        </p>
      </div>

      {/* PIN & QR Panel */}
      <div style={styles.pinPanel}>
        <div style={styles.pinPanelGlow} />

        <p style={styles.pinLabel}>Код для подключения (PIN)</p>

        <div style={styles.pinDisplayContainer}>
          <span style={styles.pinNumber}>{pin}</span>
          <button
            type="button"
            onClick={handleCopyPin}
            style={styles.copyBtn}
            title="Скопировать PIN"
          >
            {copied ? <Check size={18} color={colors.emeraldGreen} /> : <Copy size={18} />}
          </button>
        </div>

        {copied && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 12, color: colors.emeraldGreen, fontWeight: 600 }}
          >
            ✓ Скопировано в буфер обмена
          </motion.span>
        )}

        {/* QR Code and Instructions */}
        <div style={styles.qrAndStepsRow}>
          {/* QR Code Graphic Placeholder */}
          <div style={styles.qrPlaceholder} title="QR-код для входа">
            <QrCode size={48} color="#0D1322" />
            <span style={{ fontSize: 9, letterSpacing: '0.5px' }}>Лисквиз</span>
          </div>

          <div style={styles.qrInstruction}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
              Как подключиться?
            </span>
            <span style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.4 }}>
              1. Отсканируйте QR или откройте Лисквиз в Сферуме<br />
              2. Введите код комнаты: <b>{pin}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Connected Players Section */}
      <div style={styles.playersCard}>
        <div style={styles.playersHeader}>
          <div style={styles.counterBadge}>
            <Users size={16} color={colors.foxOrange} />
            <span>
              Подключено: <span style={styles.counterHighlight}>{players.length}</span> из {maxStudents} учеников
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddMockStudent}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Добавить тестового ученика для демонстрации"
          >
            <UserPlus size={14} />
            <span>+ Тестовый</span>
          </button>
        </div>

        {/* Avatar Grid */}
        <AvatarGrid players={players} maxDisplay={maxStudents} />
      </div>

      {/* Start Button with Pulse animation when ready */}
      <motion.button
        type="button"
        onClick={handleStart}
        disabled={!isReady}
        style={{
          ...styles.startButton,
          ...(!isReady ? styles.startButtonDisabled : {}),
        }}
        whileTap={isReady ? { scale: 0.98 } : undefined}
        animate={
          isReady
            ? {
                boxShadow: [
                  `0 4px 16px ${colors.foxOrange}40`,
                  `0 4px 28px ${colors.foxOrange}80`,
                  `0 4px 16px ${colors.foxOrange}40`,
                ],
              }
            : {}
        }
        transition={
          isReady
            ? {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
      >
        <Play size={20} fill="#FFFFFF" />
        <span>Начать викторину ({players.length})</span>
      </motion.button>

      {/* Secondary Controls (Share & Audio) */}
      <div style={styles.controlsRow}>
        <button
          type="button"
          onClick={() => {
            hapticImpact('light');
            navigator.clipboard?.writeText(window.location.href);
            alert('Ссылка на комнату скопирована для отправки в чат Сферума');
          }}
          style={styles.secondaryBtn}
        >
          <Share2 size={15} />
          <span>Отправить ссылку в чат</span>
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled((v) => !v)}
          style={styles.secondaryBtn}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>Звук {soundEnabled ? 'вкл' : 'выкл'}</span>
        </button>
      </div>

      {/* Starting Countdown Overlay */}
      <AnimatePresence>
        {isStarting && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.countdownOverlay}
          >
            <motion.img
              src="/assets/mascot/dash.png"
              alt="Спринт на старте"
              style={{ width: 140, height: 140, objectFit: 'contain' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />

            <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
              Викторина начинается!
            </h2>

            <motion.span
              key={startCountdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: colors.foxOrange,
                fontFamily: fonts.mono,
              }}
            >
              {startCountdown > 0 ? startCountdown : 'ПОЕХАЛИ!'}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
