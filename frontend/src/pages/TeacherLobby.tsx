import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Rocket,
  Users,
  Eye,
  Plus,
  BookOpen,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';
import { roomApi } from '../services/roomApi';
import { quizStorage, SavedQuiz } from '../services/quizStorage';
import QuizQuestionEditorModal from '../components/QuizQuestionEditorModal';

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
  onQuizTitleChange?: (newTitle: string) => void;
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

const getSubjectIcon = (subj?: string) => {
  const s = (subj || '').toLowerCase();
  if (s.includes('физик')) return '⚡';
  if (s.includes('алгебр')) return '🔢';
  if (s.includes('геометр')) return '📐';
  if (s.includes('матем')) return '➗';
  if (s.includes('русск')) return '📝';
  return '📚';
};

export default function TeacherLobby({
  pin: propPin,
  teacherToken: propToken,
  quizTitle = 'Викторина по математике',
  subject,
  grade = 7,
  onStartQuiz,
  onRoomReady,
  onQuizTitleChange,
}: TeacherLobbyProps) {
  const [activePin, setActivePin] = useState<string>(propPin || '');
  const [currentQuizTitle, setCurrentQuizTitle] = useState<string>(quizTitle);
  const [students, setStudents] = useState<ConnectedStudent[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedStudentToKick, setSelectedStudentToKick] = useState<ConnectedStudent | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<SavedQuiz | null>(null);

  // Quizzes list with real textbook quizzes from Ivan's bank
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(() => quizStorage.getSavedQuizzes());
  const [activeQuizId, setActiveQuizId] = useState<string>(() => {
    const list = quizStorage.getSavedQuizzes();
    const act = list.find((q) => q.is_active);
    return act ? act.id : list[0]?.id || '';
  });
  const [editingQuiz, setEditingQuiz] = useState<SavedQuiz | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // 1. Fetch real quizzes from backend DB
  useEffect(() => {
    quizStorage.syncFromDb().then((dbQuizzes) => {
      if (dbQuizzes && dbQuizzes.length > 0) {
        setSavedQuizzes(dbQuizzes);
        if (!activeQuizId) {
          setActiveQuizId(dbQuizzes[0].id);
        }
      }
    });
  }, []);

  // 2. Room lifecycle and WebSocket connection
  useEffect(() => {
    let isMounted = true;
    let handleSync: ((data: any) => void) | null = null;
    let handleJoined: ((data: any) => void) | null = null;
    let handleLeft: ((data: any) => void) | null = null;
    let handleCountdown: ((data: any) => void) | null = null;

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

      // Sync active room quiz from backend if available
      try {
        const roomQuiz = await roomApi.getRoomQuiz(code);
        if (isMounted && roomQuiz && roomQuiz.questions && roomQuiz.questions.length > 0) {
          const existingList = quizStorage.getSavedQuizzes();
          const existing = existingList.find((q) => q.id === `room_quiz_${code}`);
          const quizObj: SavedQuiz = {
            id: `room_quiz_${code}`,
            title: roomQuiz.title || quizTitle || 'Викторина по теме',
            subject: roomQuiz.subject || subject || 'Математика',
            grade: roomQuiz.grade || grade || 7,
            topic: roomQuiz.topic || 'Школьная программа',
            group_label: existing?.group_label || 'Текущий',
            is_active: true,
            updated_at: new Date().toISOString(),
            questions: roomQuiz.questions.map((q: any, idx: number) => ({
              id: q.id ?? (idx + 1),
              text: q.text || '',
              explanation: q.explanation || '',
              time_limit_sec: q.time_limit_sec ?? 20,
              tier: q.tier ?? 1,
              is_boss: q.is_boss ?? false,
              topic: q.topic ?? '',
              options: (q.options || []).map((opt: any, oIdx: number) => ({
                id: opt.id ?? oIdx,
                text: opt.text ?? '',
                is_correct: !!opt.is_correct,
                symbol: opt.symbol,
                color: opt.color,
              })),
            })),
          };
          quizStorage.upsertQuiz(quizObj);
          quizStorage.setActiveQuiz(quizObj.id);
          setSavedQuizzes(quizStorage.getSavedQuizzes());
          setActiveQuizId(quizObj.id);
          setCurrentQuizTitle(quizObj.title);
          onQuizTitleChange?.(quizObj.title);
        }
      } catch (e) {
        console.warn('Could not fetch room quiz from backend:', e);
      }

      try {
        await socketService.connect(code, token);

        handleSync = (data: any) => {
          if (!isMounted) return;
          if (data && data.players) {
            const list: ConnectedStudent[] = Object.values(data.players)
              .filter((p: any) => p.connected !== false)
              .map((p: any) => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
              }));
            setStudents(list);
          }
        };

        handleJoined = (data: any) => {
          if (!isMounted) return;
          haptics.notification('success');
          setStudents((prev) => {
            const exists = prev.some((s) => s.id === data.player_id);
            if (exists) return prev;
            return [
              ...prev,
              {
                id: data.player_id,
                name: data.name,
                avatar: data.avatar || 'fox_smart',
              },
            ];
          });
        };

        handleLeft = (data: any) => {
          if (!isMounted) return;
          setStudents((prev) => prev.filter((s) => s.id !== data.player_id));
        };

        handleCountdown = (data: any) => {
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
                onStartQuiz?.();
              }
            } else {
              if (isMounted) setCountdown(current);
            }
          }, 1000);
        };

        socketService.on('SYNC_STATE', handleSync);
        socketService.on('PLAYER_JOINED', handleJoined);
        socketService.on('PLAYER_LEFT', handleLeft);
        socketService.on('COUNTDOWN_START', handleCountdown);
      } catch (err) {
        console.error('WebSocket connection error in TeacherLobby:', err);
      }
    };

    setupRoom();

    return () => {
      isMounted = false;
      if (handleSync) socketService.off('SYNC_STATE', handleSync);
      if (handleJoined) socketService.off('PLAYER_JOINED', handleJoined);
      if (handleLeft) socketService.off('PLAYER_LEFT', handleLeft);
      if (handleCountdown) socketService.off('COUNTDOWN_START', handleCountdown);
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
      socketService.send('TEACHER_ACTION', {
        action: 'KICK_PLAYER',
        player_id: studentId,
      });
    }
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setSelectedStudentToKick(null);
  };

  const handleSelectQuiz = async (q: SavedQuiz) => {
    haptics.selection();
    quizStorage.setActiveQuiz(q.id);
    setActiveQuizId(q.id);
    setSavedQuizzes(quizStorage.getSavedQuizzes());
    setCurrentQuizTitle(q.title);
    onQuizTitleChange?.(q.title);

    if (activePin) {
      try {
        await roomApi.updateRoomQuiz(activePin, {
          title: q.title,
          subject: q.subject,
          grade: q.grade,
          topic: q.topic,
          questions: q.questions,
        });
        showToast(`Викторина «${q.title}» активирована!`);
      } catch (err) {
        console.error('Failed to sync quiz with room:', err);
        showToast(`Викторина выбрана для запуска!`);
      }
    } else {
      showToast(`Викторина выбрана для запуска!`);
    }
  };

  const handleEditQuiz = (q: SavedQuiz) => {
    haptics.impact('light');
    setEditingQuiz(q);
    setIsEditorOpen(true);
  };

  const handleSaveEditedQuiz = async (updatedQuiz: SavedQuiz) => {
    haptics.notification('success');
    const list = quizStorage.upsertQuiz(updatedQuiz);
    setSavedQuizzes(list);
    setIsEditorOpen(false);
    setEditingQuiz(null);

    if (updatedQuiz.id === activeQuizId) {
      setCurrentQuizTitle(updatedQuiz.title);
      onQuizTitleChange?.(updatedQuiz.title);
      if (activePin) {
        try {
          await roomApi.updateRoomQuiz(activePin, {
            title: updatedQuiz.title,
            subject: updatedQuiz.subject,
            grade: updatedQuiz.grade,
            topic: updatedQuiz.topic,
            questions: updatedQuiz.questions,
          });
        } catch (e) {
          console.error('Failed to sync updated quiz with room:', e);
        }
      }
    }
    showToast(`Вопросы сохранены!`);
  };

  const handleCreateNewQuizTemplate = () => {
    haptics.impact('light');
    const newQuiz: SavedQuiz = {
      id: `quiz_custom_${Date.now()}`,
      title: 'Своя проверочная викторина',
      subject: subject || 'Математика',
      grade: grade || 7,
      topic: 'Тематический опрос',
      group_label: 'Свой вариант',
      is_active: false,
      updated_at: new Date().toISOString(),
      questions: [
        {
          id: 1,
          text: 'Введите текст первого вопроса...',
          explanation: '',
          time_limit_sec: 20,
          tier: 1,
          is_boss: false,
          topic: 'Вопрос 1',
          options: [
            { id: 0, text: 'Правильный ответ', is_correct: true, symbol: 'triangle', color: 'red' },
            { id: 1, text: 'Вариант 2', is_correct: false, symbol: 'diamond', color: 'blue' },
            { id: 2, text: 'Вариант 3', is_correct: false, symbol: 'circle', color: 'yellow' },
            { id: 3, text: 'Вариант 4', is_correct: false, symbol: 'square', color: 'green' },
          ],
        },
      ],
    };
    const list = quizStorage.upsertQuiz(newQuiz);
    setSavedQuizzes(list);
    setEditingQuiz(newQuiz);
    setIsEditorOpen(true);
  };

  const handleRequestDelete = (q: SavedQuiz) => {
    if (savedQuizzes.length <= 1) {
      showToast('Должна остаться хотя бы одна викторина');
      return;
    }
    haptics.notification('warning');
    setQuizToDelete(q);
  };

  const confirmDeleteQuiz = () => {
    if (!quizToDelete) return;
    haptics.notification('success');
    const updated = quizStorage.deleteQuiz(quizToDelete.id);
    setSavedQuizzes(updated);
    if (activeQuizId === quizToDelete.id) {
      const nextActive = updated[0];
      if (nextActive) {
        handleSelectQuiz(nextActive);
      }
    }
    setQuizToDelete(null);
    showToast('Викторина удалена');
  };

  const getAvatarSrc = (avatar?: string) => {
    return AVATAR_MAP[avatar || ''] || AVATAR_MAP.raccoon;
  };

  const digits = activePin.padEnd(6, '·').slice(0, 6).split('');

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -16, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.95 }}
            style={styles.toastContainer}
          >
            <CheckCircle2 size={16} color="#10B981" />
            <span style={styles.toastText}>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Active Quiz Badge */}
      <div style={styles.topInfoBar}>
        <div style={styles.activeQuizPill}>
          <span style={styles.sproutDot}>🌱</span>
          <span style={styles.activeQuizTitle} title={currentQuizTitle}>
            {currentQuizTitle || 'Викторина урока'}
          </span>
          <span style={styles.activeQuizGrade}>{grade}А класс</span>
        </div>
      </div>

      {/* PIN Code Panel */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={styles.pinCard}
      >
        <div style={styles.pinHeader}>
          <span style={styles.pinCardTitle}>PIN КОД ДЛЯ ПОДКЛЮЧЕНИЯ</span>
          <div style={styles.onlineBadge}>
            <span style={styles.onlineDot} />
            <span>В сети: <strong>{students.length}</strong></span>
          </div>
        </div>

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
      </motion.div>

      {/* Students Avatar Strip */}
      <div style={styles.studentsCard}>
        {students.length === 0 ? (
          <div style={styles.emptyStudents}>
            <Users size={18} color="#60A5FA" />
            <span>Ученики подключаются...</span>
          </div>
        ) : (
          <div style={styles.studentsGrid}>
            {students.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.02, type: 'spring', stiffness: 500, damping: 22 }}
                onClick={() => {
                  haptics.selection();
                  setSelectedStudentToKick(student);
                }}
                style={styles.studentItem}
                title="Нажмите чтобы исключить"
              >
                <div style={styles.studentAvatarCircle}>
                  <img
                    src={getAvatarSrc(student.avatar)}
                    alt={student.name}
                    style={styles.studentAvatarImg}
                  />
                  <span style={styles.studentOnlineDot} />
                </div>
                <span style={styles.studentName}>{student.name}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quizzes Templates (Simplified Mobile View) */}
      <div style={styles.templatesSectionCard}>
        <div style={styles.templatesHeader}>
          <div style={styles.templatesTitleRow}>
            <BookOpen size={16} color="#60A5FA" />
            <h2 style={styles.templatesTitle}>Викторина для игры</h2>
          </div>

          <TactileButton
            theme="blue"
            size="sm"
            onClick={handleCreateNewQuizTemplate}
            iconBefore={<Plus size={14} />}
          >
            Свой тест
          </TactileButton>
        </div>

        {/* Active Quiz Card */}
        {(() => {
          const activeQuiz = savedQuizzes.find((q) => q.id === activeQuizId) || savedQuizzes[0];
          if (!activeQuiz) return null;
          const qCount = activeQuiz.questions?.length || 0;
          return (
            <div style={styles.activeQuizCard}>
              <div style={styles.activeQuizTopRow}>
                <span style={styles.activeQuizBadge}>
                  {getSubjectIcon(activeQuiz.subject)} {activeQuiz.subject} • {activeQuiz.grade} кл
                </span>
                <span style={styles.activeQuizQuestionsCount}>
                  {qCount} вопр.
                </span>
              </div>
              <h3 style={styles.activeQuizTitleText}>{activeQuiz.title}</h3>
              <div style={styles.activeQuizFooter}>
                <button
                  type="button"
                  onClick={() => handleEditQuiz(activeQuiz)}
                  style={styles.editQuizActionBtn}
                >
                  <Eye size={14} color="#60A5FA" />
                  <span>Редактировать вопросы</span>
                </button>
                {savedQuizzes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRequestDelete(activeQuiz)}
                    style={styles.deleteActiveQuizBtn}
                    title="Удалить викторину"
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Compact Horizontal Scroll / Chips for Selecting Other Quizzes */}
        <div style={styles.quizChipsScroll}>
          {savedQuizzes.map((q) => {
            const isSel = q.id === activeQuizId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectQuiz(q)}
                style={{
                  ...styles.quizChipItem,
                  borderColor: isSel ? '#FF7A00' : 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: isSel ? 'rgba(255, 122, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isSel && <CheckCircle2 size={13} color="#FF7A00" />}
                  <span style={{ color: isSel ? '#FF7A00' : '#FFFFFF', fontWeight: 700, fontSize: 12.5 }}>
                    {q.title}
                  </span>
                </div>
                <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>
                  {q.subject} • {q.questions?.length || 0} в.
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Static Sticky Bottom Action Bar (Transparent background, floating button) */}
      <div style={styles.stickyBottomBar}>
        <div style={{ width: '100%', pointerEvents: 'auto' }}>
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
      </div>

      {/* Delete Quiz Confirmation Modal */}
      <AnimatePresence>
        {quizToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setQuizToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              style={styles.confirmModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.deleteWarningIconCircle}>
                <Trash2 size={24} color="#EF4444" />
              </div>

              <h3 style={styles.confirmTitle}>Удалить викторину?</h3>
              <p style={styles.confirmDesc}>
                Викторина «{quizToDelete.title}» будет удалена без возможности восстановления.
              </p>

              <div style={styles.confirmBtnRow}>
                <button
                  onClick={() => setQuizToDelete(null)}
                  style={styles.cancelBtn}
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDeleteQuiz}
                  style={styles.dangerConfirmBtn}
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              style={styles.confirmModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={styles.confirmTitle}>Исключить ученика?</h3>
              <p style={styles.confirmDesc}>
                {selectedStudentToKick.name} будет удален из текущей комнаты
              </p>

              <div style={styles.confirmBtnRow}>
                <button
                  onClick={() => setSelectedStudentToKick(null)}
                  style={styles.cancelBtn}
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleKickStudent(selectedStudentToKick.id)}
                  style={styles.dangerConfirmBtn}
                >
                  Исключить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Question Inspector & Editor Modal */}
      {editingQuiz && (
        <QuizQuestionEditorModal
          quiz={editingQuiz}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingQuiz(null);
          }}
          onSave={handleSaveEditedQuiz}
        />
      )}

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
    padding: '12px 14px 170px', // Extra bottom space for static sticky button!
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  toastContainer: {
    position: 'fixed',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#0F172A',
    border: '1.5px solid #10B981',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    borderRadius: 12,
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#F8FAFC',
  },
  topInfoBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeQuizPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid #334155',
    borderRadius: 999,
    padding: '4px 12px',
  },
  sproutDot: {
    fontSize: 13,
  },
  activeQuizTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#F8FAFC',
    maxWidth: 220,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activeQuizGrade: {
    fontSize: 11,
    fontWeight: 700,
    color: '#FBBF24',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: '1px 6px',
    borderRadius: 6,
  },
  pinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: '12px 14px',
    border: '1.5px solid #1E293B',
    marginBottom: 10,
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
  },
  pinHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pinCardTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#94A3B8',
    letterSpacing: '0.06em',
  },
  onlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#10B981',
    boxShadow: '0 0 6px #10B981',
  },
  pinRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    cursor: 'pointer',
  },
  digitBoxesRow: {
    display: 'flex',
    gap: 6,
    flex: 1,
  },
  digitBox: {
    flex: 1,
    height: 48,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    border: '1.5px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitChar: {
    fontSize: 24,
    fontWeight: 900,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  copyBtn: {
    width: 46,
    height: 48,
    backgroundColor: '#1E293B',
    border: '1.5px solid #334155',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  testBotsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    padding: '8px 12px',
    marginBottom: 4,
    gap: 8,
  },
  testBotBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: '4px 9px',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  studentsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: '10px 12px',
    border: '1px solid #1E293B',
    marginBottom: 12,
  },
  emptyStudents: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 0',
  },
  studentsGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  studentItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    cursor: 'pointer',
    flexShrink: 0,
  },
  studentAvatarCircle: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#1E293B',
    border: '1.5px solid #10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studentAvatarImg: {
    width: 32,
    height: 32,
    objectFit: 'cover',
  },
  studentOnlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  studentName: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#E2E8F0',
    maxWidth: 50,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  templatesSectionCard: {
    backgroundColor: '#0B132B',
    borderRadius: 18,
    padding: '14px',
    border: '1px solid #1E293B',
    marginBottom: 12,
  },
  templatesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  templatesTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  templatesTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  activeQuizCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: '12px 14px',
    border: '1.5px solid rgba(59, 130, 246, 0.35)',
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  activeQuizTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeQuizBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#93C5FD',
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    padding: '2px 8px',
    borderRadius: 6,
  },
  activeQuizQuestionsCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 600,
  },
  activeQuizTitleText: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    lineHeight: 1.35,
  },
  activeQuizFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  editQuizActionBtn: {
    flex: 1,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  deleteActiveQuizBtn: {
    width: 34,
    height: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  quizChipsScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  quizChipItem: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid',
    cursor: 'pointer',
    textAlign: 'left',
    maxWidth: 200,
  },
  mobileSquareTile: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: '12px 10px',
    border: '1.5px solid #1E293B',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 148,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.18s ease',
    boxSizing: 'border-box',
  },
  mobileSquareTileActive: {
    borderColor: '#10B981',
    backgroundColor: '#09211A',
    boxShadow: '0 0 0 1.5px #10B981, 0 6px 20px rgba(16, 185, 129, 0.22)',
  },
  tileTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  subjectPill: {
    fontSize: 10,
    fontWeight: 800,
    color: '#CBD5E1',
    backgroundColor: '#1E293B',
    padding: '2px 6px',
    borderRadius: 6,
    maxWidth: 90,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activeCheckBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  deleteMiniBtn: {
    background: 'transparent',
    border: 'none',
    padding: 3,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tileCenter: {
    margin: '8px 0',
  },
  tileTitleText: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  tileSubtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: 600,
    marginTop: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tileBottom: {
    width: '100%',
    marginTop: 4,
  },
  bigTouchViewBtn: {
    width: '100%',
    height: 36, // Finger-friendly touch height >= 36px
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  // Fixed / Static Bottom Button (Transparent container, floating above bottom dock)
  stickyBottomBar: {
    position: 'fixed',
    bottom: 74,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 420,
    padding: '0 16px',
    boxSizing: 'border-box',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    pointerEvents: 'none',
    zIndex: 22,
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 16,
  },
  confirmModalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 22,
    border: '1.5px solid #334155',
    maxWidth: 320,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
  },
  deleteWarningIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 8px',
  },
  confirmDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 1.4,
    margin: '0 0 18px',
  },
  confirmBtnRow: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: '#1E293B',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  dangerConfirmBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: 10,
    border: 'none',
    background: '#EF4444',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
  },
  countdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 10, 20, 0.9)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  countdownNumber: {
    fontSize: 90,
    fontWeight: 900,
    color: '#10B981',
    lineHeight: 1,
  },
  countdownLabel: {
    fontSize: 20,
    fontWeight: 800,
    color: '#FFFFFF',
    marginTop: 12,
  },
};
