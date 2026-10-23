import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';
import { roomApi } from '../services/roomApi';

export interface ConnectedStudent {
  id: string;
  name: string;
  avatar: string;
}

export interface TeacherLobbyProps {
  pin?: string;
  teacherToken?: string;
  quizTitle?: string;
  subject?: string;
  grade?: number;
  maxStudents?: number;
  onStartQuiz?: () => void;
  onRoomReady?: (pin: string, token: string) => void;
}

const AVATAR_MAP: Record<string, string> = {
  bear: '/assets/avatars/students/bear.png',
  bunny: '/assets/avatars/students/bunny.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  squirrel: '/assets/avatars/students/squirrel.png',
  fox_smart: '/assets/avatars/students/raccoon.png',
  fox_1: '/assets/avatars/students/raccoon.png',
  fox_happy: '/assets/avatars/students/raccoon.png',
  fox_detective: '/assets/avatars/students/raccoon.png',
};

export default function TeacherLobby({
  pin: propPin,
  teacherToken: propToken,
  quizTitle = 'Викторина по математике',
  grade = 7,
  onStartQuiz,
  onRoomReady,
}: TeacherLobbyProps) {
  const [activePin, setActivePin] = useState<string>(propPin || '');
  const [students, setStudents] = useState<ConnectedStudent[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedStudentToKick, setSelectedStudentToKick] = useState<ConnectedStudent | null>(null);

  // Initialize Room & WebSocket
  useEffect(() => {
    let isMounted = true;

    const setupRoom = async () => {
      let code = propPin;
      let token = propToken;

      if (!code || !token) {
        try {
          const res = await roomApi.createRoom();
          code = res.room_code;
          token = res.teacher_token;
          if (isMounted) {
            setActivePin(code);
            onRoomReady?.(code, token);
          }
        } catch (e) {
          console.error('Failed to create room:', e);
          code = '482915';
          token = 'mock_teacher_token';
          if (isMounted) {
            setActivePin(code);
          }
        }
      }

      if (!code || !token) return;

      try {
        await socketService.connect(code, token);

        socketService.on('SYNC_STATE', (data: any) => {
          if (!isMounted) return;
          if (data && Array.isArray(data.players)) {
            const list: ConnectedStudent[] = data.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
            }));
            setStudents(list);
          } else if (data && data.players && typeof data.players === 'object') {
            const list: ConnectedStudent[] = Object.values(data.players).map((p: any) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
            }));
            setStudents(list);
          }
        });

        socketService.on('PLAYER_JOINED', (data: any) => {
          if (!isMounted) return;
          haptics.notification('success');
          setStudents((prev) => {
            if (prev.some((s) => s.id === data.player_id)) return prev;
            return [...prev, { id: data.player_id, name: data.name, avatar: data.avatar }];
          });
        });

        socketService.on('PLAYER_LEFT', (data: any) => {
          if (!isMounted) return;
          setStudents((prev) => prev.filter((s) => s.id !== data.player_id));
        });

        socketService.on('COUNTDOWN_START', (data: any) => {
          if (!isMounted) return;
          const sec = data.countdown_sec || 3;
          setCountdown(sec);

          let current = sec;
          const interval = setInterval(() => {
            current -= 1;
            if (current <= 0) {
              clearInterval(interval);
              if (isMounted) {
                setCountdown(null);
                if (socketService.isConnected()) {
                  socketService.send('TEACHER_ACTION', { action: 'START_QUESTION', question_index: 0 });
                }
                onStartQuiz?.();
              }
            } else {
              if (isMounted) setCountdown(current);
            }
          }, 1000);
        });
      } catch (err) {
        console.error('WebSocket connection error in TeacherLobby:', err);
      }
    };

    setupRoom();

    return () => {
      isMounted = false;
      socketService.off('SYNC_STATE', () => {});
      socketService.off('PLAYER_JOINED', () => {});
      socketService.off('PLAYER_LEFT', () => {});
      socketService.off('COUNTDOWN_START', () => {});
    };
  }, [propPin, propToken]);

  const handleCopyPin = () => {
    haptics.notification('success');
    navigator.clipboard?.writeText(activePin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleStartGame = () => {
    haptics.notification('success');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'START_GAME' });
    } else {
      // Fallback
      setCountdown(3);
      setTimeout(() => {
        setCountdown(null);
        onStartQuiz?.();
      }, 3000);
    }
  };

  const handleKickStudent = (studentId: string) => {
    haptics.impact('medium');
    if (socketService.isConnected()) {
      socketService.send('KICK_PLAYER', { player_id: studentId });
    }
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setSelectedStudentToKick(null);
  };

  const getAvatarSrc = (av: string) => {
    if (av.startsWith('/')) return av;
    return AVATAR_MAP[av] || AVATAR_MAP.bear;
  };

  const displayPin = activePin || '482915';
  const digits = displayPin.split('');

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Комната ожидания</h1>
      </header>

      {/* Quiz Title Pill */}
      <div style={styles.topicBadgeWrapper}>
        <div style={styles.topicBadge}>
          <img
            src="/assets/icons/icon_sprout.svg"
            alt="Росток"
            style={{ width: 16, height: 16 }}
          />
          <span>{quizTitle}, {grade} класс</span>
        </div>
      </div>

      {/* PIN Code Panel */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={styles.pinCard}
      >
        <span style={styles.pinCardTitle}>PIN код для учеников</span>

        <div style={styles.pinRow} onClick={handleCopyPin} title="Нажмите для копирования">
          <div style={styles.digitBoxesRow}>
            {digits.map((digit, i) => (
              <div key={i} style={styles.digitBox}>
                <span style={styles.digitChar}>{digit}</span>
              </div>
            ))}
          </div>

          <button style={styles.copyBtn} aria-label="Скопировать PIN">
            {copied ? <Check size={18} color="#10B981" /> : <Copy size={18} color="#94A3B8" />}
          </button>
        </div>

        {/* Connected Count Indicator */}
        <div style={styles.statusRow}>
          <span style={styles.statusDot} />
          <span style={styles.statusText}>
            Подключились: <strong style={{ color: '#FFFFFF' }}>{students.length} учеников</strong>
          </span>
        </div>
      </motion.div>

      {/* Students Avatar Grid */}
      <div style={styles.avatarsCard}>
        {students.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyPulseCircle}>
              <Users size={26} color="#34D399" />
            </div>
            <p style={styles.emptyTitle}>Ждём подключения учеников...</p>
            <p style={styles.emptySubtitle}>
              Откройте Лисквиз в Сферуме и введите PIN-код выше
            </p>
          </div>
        ) : (
          <div style={styles.avatarGrid}>
            {students.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 500, damping: 22 }}
                onClick={() => {
                  haptics.selection();
                  setSelectedStudentToKick(student);
                }}
                style={styles.avatarItem}
                title="Нажмите чтобы исключить"
              >
                <div style={styles.avatarCircle}>
                  <img
                    src={getAvatarSrc(student.avatar)}
                    alt={student.name}
                    style={styles.avatarImg}
                  />
                  <span style={styles.avatarOnlineDot} />
                </div>
                <span style={styles.avatarName}>{student.name}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Launch Quiz Button */}
      <div style={styles.actionSection}>
        <TactileButton
          theme="green"
          size="lg"
          fullWidth
          onClick={handleStartGame}
          iconBefore={<Rocket size={20} />}
        >
          {countdown !== null ? `Старт через ${countdown}...` : 'Начать викторину'}
        </TactileButton>
      </div>

      {/* Bottom Glade with Mascot */}
      <div style={styles.bottomGladeSection}>
        <div style={styles.mascotSpeechBubble}>
          <Sparkles size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span>Ученики входят по PIN коду с экрана. Все готовы к старту!</span>
        </div>

        <div style={styles.mascotWrapper}>
          <img
            src="/assets/mascot/sprint_idle.png"
            alt="Спринт"
            style={styles.mascotImg}
          />
        </div>
      </div>

      {/* Kick Student Modal */}
      <AnimatePresence>
        {selectedStudentToKick && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setSelectedStudentToKick(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              style={styles.kickModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={styles.kickTitle}>Исключить ученика?</h3>
              <p style={styles.kickDesc}>
                {selectedStudentToKick.name} будет удален из текущей игры
              </p>

              <div style={styles.kickBtnRow}>
                <button
                  onClick={() => setSelectedStudentToKick(null)}
                  style={styles.cancelBtn}
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleKickStudent(selectedStudentToKick.id)}
                  style={styles.kickConfirmBtn}
                >
                  Исключить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Countdown Overlay */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <motion.div
            key={countdown}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            style={styles.countdownNumber}
          >
            {countdown}
          </motion.div>
          <span style={styles.countdownLabel}>Приготовьтесь!</span>
        </div>
      )}
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
    padding: '12px 14px 92px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
    zIndex: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  topicBadgeWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
    zIndex: 3,
  },
  topicBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 999,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#34D399',
  },
  pinCard: {
    position: 'relative',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 14,
    zIndex: 3,
  },
  pinCardTitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  pinRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    marginBottom: 10,
  },
  digitBoxesRow: {
    display: 'flex',
    gap: 6,
  },
  digitBox: {
    width: 42,
    height: 52,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitChar: {
    fontSize: 26,
    fontWeight: 900,
    color: '#FCD34D',
    lineHeight: 1,
  },
  copyBtn: {
    width: 42,
    height: 52,
    backgroundColor: '#0F172A',
    border: 'none',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 600,
  },
  avatarsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '14px',
    marginBottom: 14,
    zIndex: 3,
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '28px 12px',
    textAlign: 'center',
  },
  emptyPulseCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 4px 0',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    margin: 0,
    maxWidth: 240,
    lineHeight: 1.4,
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  avatarItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
  },
  avatarCircle: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: '50%',
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImg: {
    width: 42,
    height: 42,
    objectFit: 'contain',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#10B981',
    border: '2px solid #0F172A',
  },
  avatarName: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: 700,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 64,
  },
  actionSection: {
    width: '100%',
    marginBottom: 12,
    zIndex: 3,
  },
  bottomGladeSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: '10px 14px',
    zIndex: 3,
  },
  mascotSpeechBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11.5,
    color: '#CBD5E1',
    fontWeight: 600,
    lineHeight: 1.35,
    flex: 1,
  },
  mascotWrapper: {
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  kickModalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    textAlign: 'center',
  },
  kickTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  kickDesc: {
    fontSize: 12,
    color: '#94A3B8',
    margin: 0,
  },
  kickBtnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  kickConfirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  countdownOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  countdownNumber: {
    fontSize: 84,
    fontWeight: 900,
    color: '#FCD34D',
    lineHeight: 1,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
  },
};
