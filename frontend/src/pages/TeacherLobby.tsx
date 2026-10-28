import React, { useState, useEffect, useRef } from 'react';
import { quizApi } from '../services/quizApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Trash2,
  Edit3,
  Plus,
  X,
  UserPlus,
  RotateCcw,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';
import { roomApi } from '../services/roomApi';
import { quizStorage, SavedQuiz } from '../services/quizStorage';
import QRCode from 'qrcode';
import QuizQuestionEditorModal from '../components/QuizQuestionEditorModal';
import { LobbyBoardScene, DivisionType } from '../components/LobbyBoardScene';
import { soundManager } from '../services/soundManager';
import SoundToggleButton from '../components/SoundToggleButton';
import { HangingPinSign } from '../components/HangingPinSign';
import { StudentsCountPill } from '../components/StudentsCountPill';
import { LobbyStartButton } from '../components/LobbyStartButton';

export interface ConnectedStudent {
  id: string;
  name: string;
  avatar: string;
  division?: DivisionType;
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
  onNavigateToCreateQuiz?: () => void;
  onGoHome?: () => void;
}

const DEMO_NAMES = [
  'Артём К.',
  'София М.',
  'Максим В.',
  'Полина Д.',
  'Иван С.',
  'Алиса Б.',
  'Егор Н.',
  'Милана Т.',
  'Дмитрий Р.',
  'Варвара Л.',
  'Тимофей П.',
  'Ева К.',
];

const DEMO_AVATARS = ['bear', 'bunny', 'hedgehog', 'owl', 'raccoon', 'squirrel'];

const DEMO_DIVISIONS: DivisionType[] = [
  'sprout_keepers',
  'forest_guardians',
  'council_of_groves',
];

const getSubjectIconPath = (subj?: string): string => {
  const s = (subj || '').toLowerCase();
  if (s.includes('физик')) return '/assets/subjects/physics.png';
  if (s.includes('алгебр') || s.includes('матем') || s.includes('геометр')) return '/assets/subjects/math.png';
  if (s.includes('русск')) return '/assets/subjects/russian.png';
  if (s.includes('литерат')) return '/assets/subjects/literature.png';
  if (s.includes('биолог')) return '/assets/subjects/biology.png';
  if (s.includes('хим')) return '/assets/subjects/chemistry.png';
  if (s.includes('истор')) return '/assets/subjects/history.png';
  if (s.includes('географ')) return '/assets/subjects/geography.png';
  if (s.includes('информ')) return '/assets/subjects/informatics.png';
  if (s.includes('англ')) return '/assets/subjects/english.png';
  if (s.includes('обществ')) return '/assets/subjects/social.png';
  return '/assets/subjects/math.png';
};

export default function TeacherLobby({
  pin: propPin,
  teacherToken: propToken,
  quizTitle = 'Викторина по математике',
  subject = 'Математика',
  grade = 7,
  maxStudents = 25,
  onStartQuiz,
  onRoomReady,
  onQuizTitleChange,
  onNavigateToCreateQuiz,
  onGoHome,
}: TeacherLobbyProps) {
  const [activePin, setActivePin] = useState<string>(propPin || '482915');
  const [currentQuizTitle, setCurrentQuizTitle] = useState<string>(quizTitle);
  const [students, setStudents] = useState<ConnectedStudent[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedStudentToKick, setSelectedStudentToKick] = useState<ConnectedStudent | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<SavedQuiz | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [showTemplatesSection, setShowTemplatesSection] = useState(false);

  // Quizzes list from DB
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(() => quizStorage.getSavedQuizzes());
  const [activeQuizId, setActiveQuizId] = useState<string>(() => {
    const list = quizStorage.getSavedQuizzes();
    const active = list.find((q) => q.is_active);
    return active?.id || list[0]?.id || '';
  });
  const setupDoneRef = useRef<string | null>(null);

  const activeQuiz = savedQuizzes.find((q) => q.id === activeQuizId) || (savedQuizzes.length > 0 ? savedQuizzes[0] : null);
  const [editingQuiz, setEditingQuiz] = useState<SavedQuiz | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [gameJoinUrl, setGameJoinUrl] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Generate real, scannable QR code matching game visual aesthetic
  useEffect(() => {
    const pin = activePin || '482915';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lisquiz.ru';
    const url = `${origin}/?pin=${pin}`;
    setGameJoinUrl(url);

    QRCode.toDataURL(url, {
      width: 280,
      margin: 1,
      color: {
        dark: '#4A2306', // warm dark chocolate brown modules
        light: '#FFFDF7', // warm parchment light modules
      },
      errorCorrectionLevel: 'Q',
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate real QR code:', err));
  }, [activePin]);

  // Ambient BGM loop for teacher classroom projector lobby
  useEffect(() => {
    soundManager.playBgm('grove', true);
    return () => {
      soundManager.stopBgm();
    };
  }, []);

  // 1. Fetch real quizzes from backend DB
  useEffect(() => {
    quizStorage.syncFromDb().then((dbQuizzes) => {
      if (dbQuizzes && dbQuizzes.length > 0) {
        setSavedQuizzes(dbQuizzes);
        setActiveQuizId((prev) => {
          if (prev && dbQuizzes.some((q) => q.id === prev)) return prev;
          const active = dbQuizzes.find((q) => q.is_active);
          return active?.id || dbQuizzes[0]?.id || '';
        });
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
    let syncInterval: any = null;

    const setupRoom = async () => {
      let code = propPin && propPin !== '482915' ? propPin : '';
      let token = propToken && propToken !== 'mock_teacher_token' ? propToken : '';

      let validRoom = false;
      let existingRoomQuizTitle = '';
      if (code && token) {
        try {
          const info = await roomApi.getRoomInfo(code);
          if (info && info.status === 'lobby') {
            validRoom = true;
            existingRoomQuizTitle = info.quiz_title || '';
          }
        } catch {
          validRoom = false;
        }
      }

      if (!validRoom) {
        try {
          if (isMounted) {
            setActivePin('');
            setStudents([]);
          }
          const res = await roomApi.createRoom();
          code = res.room_code;
          token = res.teacher_token;
          if (isMounted) {
            setActivePin(code);
            setStudents([]);
            onRoomReady?.(code, token);
          }
        } catch (e) {
          console.error('Failed to create room:', e);
          return;
        }
      }

      if (!code || !token) return;
      if (setupDoneRef.current === code && socketService.isConnected()) {
        return;
      }
      setupDoneRef.current = code;

      try {
        const dbQuizzes = await quizStorage.syncFromDb();
        if (isMounted && dbQuizzes.length > 0) {
          setSavedQuizzes(dbQuizzes);
          const matchQuiz =
            dbQuizzes.find((q) => q.title === existingRoomQuizTitle) ||
            dbQuizzes.find((q) => q.is_active) ||
            dbQuizzes[0];
          if (matchQuiz) {
            setActiveQuizId(matchQuiz.id);
            setCurrentQuizTitle(matchQuiz.title);
            if (!validRoom) {
              await roomApi.updateRoomQuiz(code, {
                title: matchQuiz.title,
                subject: matchQuiz.subject,
                grade: matchQuiz.grade,
                topic: matchQuiz.topic,
                questions: matchQuiz.questions,
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn('Could not sync quizzes from db:', e);
      }

      try {
        await socketService.connect(code, token);

        handleSync = (data: any) => {
          if (!isMounted) return;
          if (data && data.players) {
            const list: ConnectedStudent[] = Object.values(data.players)
              .filter((p: any) => p.connected !== false)
              .map((p: any, idx: number) => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                division: p.division || DEMO_DIVISIONS[idx % 3],
              }));
            setStudents(list);
          } else {
            setStudents([]);
          }
        };

        handleJoined = (data: any) => {
          if (!isMounted) return;
          haptics.notification('success');
          soundManager.playKnock();
          setStudents((prev) => {
            const exists = prev.some((s) => s.id === data.player_id);
            if (exists) return prev;
            return [
              ...prev,
              {
                id: data.player_id,
                name: data.name,
                avatar: data.avatar || 'raccoon',
                division: data.division || DEMO_DIVISIONS[prev.length % 3],
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
          soundManager.stopBgm();
          soundManager.playKnock();
          const sec = data.countdown_sec || 3;
          setCountdown(sec);
          let cur = sec;
          const timer = setInterval(() => {
            cur -= 1;
            if (cur <= 0) {
              clearInterval(timer);
              if (isMounted) {
                setCountdown(null);
                onStartQuiz?.();
              }
            } else {
              if (isMounted) {
                soundManager.playKnock();
                setCountdown(cur);
              }
            }
          }, 1000);
        };

        socketService.on('ROOM_SYNC', handleSync);
        socketService.on('PLAYER_JOINED', handleJoined);
        socketService.on('PLAYER_LEFT', handleLeft);
        socketService.on('COUNTDOWN_START', handleCountdown);

        syncInterval = setInterval(async () => {
          if (isMounted && code) {
            try {
              const info = await roomApi.getRoomInfo(code) as any;
              if (info && info.players) {
                const list: ConnectedStudent[] = Object.values(info.players)
                  .filter((p: any) => p.connected !== false)
                  .map((p: any, idx: number) => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    division: p.division || DEMO_DIVISIONS[idx % 3],
                  }));
                setStudents(list);
              }
            } catch {}
          }
        }, 5000);
      } catch (e) {
        console.error('Failed to establish socket connection in teacher lobby:', e);
      }
    };

    setupRoom();

    return () => {
      isMounted = false;
      if (syncInterval) clearInterval(syncInterval);
      if (handleSync) socketService.off('ROOM_SYNC', handleSync);
      if (handleJoined) socketService.off('PLAYER_JOINED', handleJoined);
      if (handleLeft) socketService.off('PLAYER_LEFT', handleLeft);
      if (handleCountdown) socketService.off('COUNTDOWN_START', handleCountdown);
    };
  }, [propPin, propToken]);

  const handleStartGame = () => {
    haptics.notification('success');
    soundManager.playKnock();
    soundManager.stopBgm();
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'START_GAME' });
    } else {
      setCountdown(3);
      soundManager.playKnock();
      let cur = 3;
      const timer = setInterval(() => {
        cur -= 1;
        if (cur <= 0) {
          clearInterval(timer);
          setCountdown(null);
          onStartQuiz?.();
        } else {
          soundManager.playKnock();
          setCountdown(cur);
        }
      }, 1000);
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

  const handleAddDemoStudent = () => {
    haptics.impact('light');
    const nextIdx = students.length;
    const name = DEMO_NAMES[nextIdx % DEMO_NAMES.length] || `Ученик ${nextIdx + 1}`;
    const avatar = DEMO_AVATARS[nextIdx % DEMO_AVATARS.length] || 'bear';
    const division = DEMO_DIVISIONS[nextIdx % DEMO_DIVISIONS.length];
    const newStudent: ConnectedStudent = {
      id: `demo_student_${Date.now()}_${nextIdx}`,
      name,
      avatar,
      division,
    };
    setStudents((prev) => [...prev, newStudent]);
    showToast(`Ученик ${name} подключился!`);
  };

  const handleClearDemoStudents = () => {
    haptics.impact('medium');
    setStudents([]);
    showToast('Список учеников очищен');
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
    try {
      await quizApi.saveQuiz(updatedQuiz);
    } catch (e) {
      console.warn('Failed to save quiz to DB in lobby:', e);
    }
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

  const confirmDeleteQuiz = () => {
    if (!quizToDelete) return;
    haptics.notification('success');
    const updated = quizStorage.deleteQuiz(quizToDelete.id);
    setSavedQuizzes(updated);
    if (activeQuizId === quizToDelete.id) {
      const nextActive = updated[0];
      if (nextActive) {
        setActiveQuizId(nextActive.id);
        setCurrentQuizTitle(nextActive.title);
        onQuizTitleChange?.(nextActive.title);
      }
    }
    setQuizToDelete(null);
    showToast('Викторина удалена');
  };

  return (
    <div style={styles.container}>
      {/* Floating Header: Back to Cabinet (Left) & Sound Toggle (Right) */}
      <div style={{ position: 'fixed', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 90, pointerEvents: 'none' }}>
        {onGoHome ? (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              soundManager.playTap();
              onGoHome();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 24,
              backgroundColor: '#FFFDF9',
              border: '2px solid #E5C39E',
              boxShadow: '0 3px 0 #D8BEA3, 0 3px 10px rgba(0, 0, 0, 0.12)',
              cursor: 'pointer',
              color: '#4A2E18',
              fontWeight: 800,
              fontSize: 12,
              pointerEvents: 'auto',
            }}
            title="Вернуться в кабинет учителя"
          >
            <ArrowLeft size={16} color="#4A2E18" strokeWidth={2.5} />
            <span>Кабинет</span>
          </motion.button>
        ) : <div />}

        <div style={{ pointerEvents: 'auto' }}>
          <SoundToggleButton variant="round" size={16} />
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            style={styles.toastContainer}
          >
            <CheckCircle2 size={16} color="#10B981" />
            <span style={styles.toastText}>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Hanging Wooden PIN Sign (with integrated top plank back button and subject title) */}
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 10 }} title={currentQuizTitle}>
        <HangingPinSign
          pin={activePin}
          onBack={onNavigateToCreateQuiz}
          subject={activeQuiz?.subject || subject}
          grade={activeQuiz?.grade || grade}
          onCopy={() => showToast('PIN скопирован в буфер обмена')}
          onOpenQr={() => setIsQrModalOpen(true)}
        />
      </div>

      {/* 2. Wooden Students Count Pill */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <StudentsCountPill count={students.length} max={maxStudents} />
      </div>

      {/* 3. Center Scene: Mossy Stump + Animated Sprint + 12-Slot Board */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 680, marginBottom: 14 }}>
        <LobbyBoardScene
          students={students}
          maxSlots={12}
          onStudentClick={(student) => setSelectedStudentToKick(student)}
          isTeacher={true}
        />
      </div>

      {/* 4. Golden Start Quiz Button */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <LobbyStartButton
          onClick={handleStartGame}
          disabled={!activeQuiz}
          countdown={countdown}
        />
      </div>

      {/* 5. Developer & Demo Helpers Toolbar */}
      <div style={styles.devControlsRow}>
        <button
          type="button"
          onClick={handleAddDemoStudent}
          style={styles.devBtn}
          title="Подключить тестового ученика для демонстрации динамики"
        >
          <UserPlus size={14} color="#5C3317" />
          <span>+ Ученик</span>
        </button>

        {students.length > 0 && (
          <button
            type="button"
            onClick={handleClearDemoStudents}
            style={{ ...styles.devBtn, color: '#B91C1C' }}
            title="Очистить список учеников"
          >
            <RotateCcw size={14} color="#B91C1C" />
            <span>Очистить</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowTemplatesSection((prev) => !prev)}
          style={styles.devBtn}
          title="Управление темами викторин"
        >
          <BookOpen size={14} color="#5C3317" />
          <span>{showTemplatesSection ? 'Скрыть темы' : 'Сменить тему'}</span>
        </button>
      </div>

      {/* 6. Quiz Templates Management Section (Collapsible) */}
      <AnimatePresence>
        {showTemplatesSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.templatesSection}
          >
            <div style={styles.templatesHeader}>
              <span style={styles.templatesSectionTitle}>Темы викторин</span>
              <button
                type="button"
                onClick={() => {
                  haptics.impact('light');
                  onNavigateToCreateQuiz ? onNavigateToCreateQuiz() : handleCreateNewQuizTemplate();
                }}
                style={styles.createTestBtn}
              >
                <Plus size={14} color="#15803D" />
                <span>+ Новая викторина</span>
              </button>
            </div>

            <div style={styles.templatesList}>
              {savedQuizzes.map((q) => {
                const isSel = q.id === activeQuizId;
                const icon = getSubjectIconPath(q.subject);

                return (
                  <motion.div
                    key={q.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectQuiz(q)}
                    style={{
                      ...styles.templateCard,
                      backgroundColor: isSel ? '#FDF6E2' : '#FFFFFF',
                      borderColor: isSel ? '#D97706' : 'rgba(160, 110, 60, 0.25)',
                    }}
                  >
                    <div style={styles.templateCardLeft}>
                      <span style={styles.templateEmoji}>{icon}</span>
                      <div>
                        <div style={{ ...styles.templateTitle, color: isSel ? '#92400E' : '#451A03' }}>
                          {q.title}
                        </div>
                        <div style={styles.templateMeta}>
                          {q.subject} • {q.grade} класс • {q.questions?.length || 0} вопр.
                        </div>
                      </div>
                    </div>

                    <div style={styles.templateCardRight}>
                      {!isSel && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditQuiz(q);
                            }}
                            style={styles.iconActionBtn}
                            title="Редактировать"
                          >
                            <Edit3 size={13} color="#78350F" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuizToDelete(q);
                            }}
                            style={styles.iconActionBtn}
                            title="Удалить"
                          >
                            <Trash2 size={13} color="#DC2626" />
                          </button>
                        </div>
                      )}
                      {isSel && (
                        <span style={styles.activeCheckBadge}>Выбрана</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kick Student Confirmation Modal */}
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
              initial={{ scale: 0.9, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              style={styles.confirmModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={styles.confirmTitle}>Исключить ученика?</h3>
              <p style={styles.confirmDesc}>
                <strong>{selectedStudentToKick.name}</strong> будет исключен из текущей комнаты викторины.
              </p>

              <div style={styles.confirmBtnRow}>
                <button
                  type="button"
                  onClick={() => setSelectedStudentToKick(null)}
                  style={styles.cancelBtn}
                >
                  Отмена
                </button>
                <button
                  type="button"
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

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setIsQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              style={styles.qrModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.qrModalHeader}>
                <h3 style={styles.qrModalTitle}>Подключение по QR</h3>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#5C3317" />
                </button>
              </div>

              {/* Real Scannable QR Code */}
              <div style={styles.qrBox}>
                {qrDataUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={qrDataUrl}
                      alt="Game QR Code"
                      style={{
                        width: 210,
                        height: 210,
                        display: 'block',
                        borderRadius: 12,
                      }}
                    />
                    {/* Centered Oak Acorn Emblem Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 44,
                        height: 44,
                        backgroundColor: '#FFFDF7',
                        borderRadius: '50%',
                        border: '2.5px solid #4A2306',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 8px rgba(74, 35, 6, 0.25)',
                      }}
                    >
                      <img
                        src="/assets/icons/acorn.png"
                        alt="Acorn"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ width: 210, height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, color: '#78350F' }}>Генерация QR-кода...</span>
                  </div>
                )}
              </div>

              <div style={styles.qrPinDisplay}>
                PIN: <strong>{activePin ? `${activePin.slice(0, 3)} ${activePin.slice(3, 6)}` : '482 915'}</strong>
              </div>

              {/* Direct Game Join Link with Copy Button */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#FDF6E2',
                  border: '1.5px solid #D97706',
                  borderRadius: 14,
                  padding: '8px 12px',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#78350F',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                    fontFamily: "'SF Mono', monospace",
                    fontWeight: 600,
                  }}
                  title={gameJoinUrl}
                >
                  {gameJoinUrl}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptics.notification('success');
                    navigator.clipboard?.writeText(gameJoinUrl);
                    showToast('Ссылка на игру скопирована!');
                  }}
                  style={{
                    backgroundColor: '#FF7A00',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(255, 122, 0, 0.3)',
                  }}
                >
                  Копировать
                </button>
              </div>

              <p style={styles.qrInstructions}>
                Ученики могут отсканировать этот код камерой смартфона в приложении Сферум / MAX и сразу перейти к викторине
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3 style={styles.confirmTitle}>Удалить викторину?</h3>
              <p style={styles.confirmDesc}>
                Викторина «{quizToDelete.title}» будет удалена без возможности восстановления.
              </p>

              <div style={styles.confirmBtnRow}>
                <button
                  type="button"
                  onClick={() => setQuizToDelete(null)}
                  style={styles.cancelBtn}
                >
                  Отмена
                </button>
                <button
                  type="button"
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

      {/* Quiz Editor Modal */}
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
    alignItems: 'center',
    padding: '10px 14px 40px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
    backgroundColor: '#FAF5EE', // Warm light parchment background from design reference!
  },
  toastContainer: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #10B981',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    padding: '8px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1E293B',
  },
  topNavBar: {
    width: '100%',
    maxWidth: 680,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(160, 110, 60, 0.25)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
  },
  titleCapsule: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(160, 110, 60, 0.22)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  subjectIcon: {
    fontSize: 16,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 800,
    color: '#5C3317',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  qrHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(160, 110, 60, 0.25)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
  },
  devControlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 440,
    margin: '0 auto 16px',
  },
  devBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(160, 110, 60, 0.22)',
    fontSize: 12,
    fontWeight: 700,
    color: '#5C3317',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
  },
  templatesSection: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: '16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
    border: '1.5px solid rgba(160, 110, 60, 0.2)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  templatesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  templatesSectionTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#5C3317',
  },
  createTestBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#15803D',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  templatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  templateCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 14,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  templateCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  templateEmoji: {
    fontSize: 20,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  templateMeta: {
    fontSize: 11,
    color: '#78350F',
    opacity: 0.8,
    marginTop: 2,
  },
  templateCardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  activeCheckBadge: {
    fontSize: 11,
    fontWeight: 800,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    padding: '3px 8px',
    borderRadius: 8,
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  confirmModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: '24px',
    maxWidth: 340,
    width: '100%',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#1E293B',
    margin: '0 0 8px',
  },
  confirmDesc: {
    fontSize: 13,
    color: '#64748B',
    margin: '0 0 20px',
    lineHeight: 1.4,
  },
  confirmBtnRow: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    border: 'none',
    color: '#475569',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  dangerConfirmBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 12,
    backgroundColor: '#EF4444',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: '22px',
    maxWidth: 320,
    width: '100%',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  qrModalTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#5C3317',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    border: '2px solid rgba(160, 110, 60, 0.2)',
    marginBottom: 14,
  },
  qrPinDisplay: {
    fontSize: 18,
    fontWeight: 800,
    color: '#5C3317',
    marginBottom: 8,
  },
  qrInstructions: {
    fontSize: 12,
    color: '#78350F',
    margin: 0,
    lineHeight: 1.4,
    opacity: 0.85,
  },
};
