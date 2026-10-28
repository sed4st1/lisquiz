import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  CheckCircle2,
  StopCircle,
} from 'lucide-react';
import { socketService } from '../services/socketService';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import SoundToggleButton from '../components/SoundToggleButton';
import TeacherMascotRig from '../components/TeacherMascotRig';

export interface TeacherLiveGameProps {
  roomCode: string;
  initialQuestionData?: any;
  subject?: string;
  classNameTitle?: string;
  initialStudents?: Array<{ id: string; name: string; avatar: string }>;
  onFinishQuiz: () => void;
}

interface StudentLiveStatus {
  id: string;
  name: string;
  avatar: string;
  answeredCount: number;
  totalQuestions: number;
  isFinished: boolean;
  score: number;
}

export const TeacherLiveGame: React.FC<TeacherLiveGameProps> = ({
  roomCode,
  initialQuestionData,
  subject = 'Математика',
  classNameTitle = '7А',
  initialStudents,
  onFinishQuiz,
}) => {
  const totalQuestions = initialQuestionData?.total_questions || 6;
  const [students, setStudents] = useState<StudentLiveStatus[]>(() => {
    if (initialStudents && initialStudents.length > 0) {
      return initialStudents.map((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        answeredCount: 0,
        totalQuestions,
        isFinished: false,
        score: 0,
      }));
    }
    return [];
  });
  const [isFinishing, setIsFinishing] = useState(false);

  // Completed count
  const completedCount = useMemo(() => {
    return students.filter((s) => s.isFinished).length;
  }, [students]);

  const totalCount = students.length;
  const progressPct = Math.round((completedCount / Math.max(1, totalCount)) * 100);
  const isAllFinished = completedCount >= totalCount && totalCount > 0;

  // Countdown suspense BGM stream for teacher classroom projector during active quiz
  useEffect(() => {
    soundManager.playBgm('countdown', true);
    return () => {
      soundManager.stopBgm();
    };
  }, []);

  // Sync players from room on mount if none provided
  useEffect(() => {
    let isMounted = true;
    if (!roomCode) return;
    fetch(`/api/rooms/${roomCode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.players) return;
        const pList = Object.values(data.players) as any[];
        if (pList.length > 0) {
          setStudents((prev) => {
            if (prev.length > 0) return prev;
            return pList.map((p) => ({
              id: String(p.id || p.user_id || p.name),
              name: p.name || p.display_name || 'Ученик',
              avatar: p.avatar || 'fox',
              answeredCount: p.answered_count || 0,
              totalQuestions,
              isFinished: (p.answered_count || 0) >= totalQuestions,
              score: p.score || 0,
            }));
          });
        }
      })
      .catch((err) => {
        console.warn('[TeacherLiveGame] Notice syncing room players:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [roomCode, totalQuestions]);

  // Listen to live WebSocket events
  useEffect(() => {
    let isMounted = true;

    const handleAnswerCollected = (data: any) => {
      if (!isMounted) return;
      haptics.impact('light');
      soundManager.playTap();

      const studentId = data?.player_id || data?.student_id;
      const studentName = data?.player_name || data?.student_name;
      if (!studentId && !studentName) return;

      setStudents((prev) => {
        const idx = prev.findIndex((s) => (studentId && s.id === studentId) || (studentName && s.name === studentName));
        if (idx === -1) {
          return [
            ...prev,
            {
              id: studentId || String(Date.now()),
              name: studentName || 'Ученик',
              avatar: data?.avatar || 'fox',
              answeredCount: 1,
              totalQuestions,
              isFinished: 1 >= totalQuestions,
              score: data?.points_earned || 100,
            },
          ];
        }
        return prev.map((s, i) => {
          if (i === idx) {
            const nextAnswered = Math.min(totalQuestions, s.answeredCount + 1);
            return {
              ...s,
              answeredCount: nextAnswered,
              isFinished: nextAnswered >= totalQuestions,
              score: (s.score || 0) + (data?.points_earned || 100),
            };
          }
          return s;
        });
      });
    };

    const handlePlayerJoined = (data: any) => {
      if (!isMounted || !data?.player) return;
      const p = data.player;
      setStudents((prev) => {
        if (prev.some((s) => s.id === p.id || s.name === p.name)) return prev;
        return [
          ...prev,
          {
            id: p.id || String(Date.now()),
            name: p.name || p.display_name || 'Ученик',
            avatar: p.avatar || 'fox',
            answeredCount: 0,
            totalQuestions,
            isFinished: false,
            score: 0,
          },
        ];
      });
    };

    const handleGameFinished = () => {
      if (!isMounted) return;
      soundManager.stopBgm();
      soundManager.playVictory();
      haptics.notification('success');
      onFinishQuiz();
    };

    socketService.on('ANSWER_COLLECTED', handleAnswerCollected);
    socketService.on('PLAYER_JOINED', handlePlayerJoined);
    socketService.on('GAME_FINISHED', handleGameFinished);

    return () => {
      isMounted = false;
      socketService.off('ANSWER_COLLECTED', handleAnswerCollected);
      socketService.off('PLAYER_JOINED', handlePlayerJoined);
      socketService.off('GAME_FINISHED', handleGameFinished);
    };
  }, [totalQuestions, onFinishQuiz]);

  const handleEndQuiz = () => {
    soundManager.stopBgm();
    soundManager.playVictory();
    haptics.notification('success');
    setIsFinishing(true);

    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'FINISH_GAME', room_code: roomCode });
    }
    fetch(`/api/rooms/${roomCode}/close`, { method: 'POST' }).catch(() => {});

    setTimeout(() => {
      onFinishQuiz();
    }, 400);
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            TOP HEADER NAVIGATION
           ======================================================== */}
        <div style={styles.topNavRow}>
          <div style={styles.roomTagPill}>
            <span>{classNameTitle} класс</span>
            <span style={styles.dotSeparator}>•</span>
            <span>{subject}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SoundToggleButton variant="round" size={14} />
            <div style={styles.pinTagPill}>
              <span>Код комнаты:</span>
              <span style={styles.pinCodeText}>{roomCode || '482 915'}</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            HANGING SIGNBOARD: "Викторина идёт"
           ======================================================== */}
        <motion.div
          initial={{ y: -25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={styles.signHeaderWrapper}
        >
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/assets/classes/v2/sign_wood_blank.png"
              alt="Викторина идёт"
              style={styles.signHeaderImg}
            />
            <div
              style={{
                position: 'absolute',
                top: '56%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 22,
                fontWeight: 900,
                color: '#3A1E0B',
                textShadow: '0 2px 0 rgba(255, 240, 200, 0.75), 0 1px 3px rgba(58, 30, 11, 0.25)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
                pointerEvents: 'none',
              }}
            >
              Викторина идёт
            </div>
          </div>
        </motion.div>

        {/* ========================================================
            MAIN WAITING CARD
           ======================================================== */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          style={styles.woodPlateContainer}
        >
          {/* Corner leaves */}
          <img
            src="/assets/teacher/deco_leaves_left.png"
            alt=""
            style={{ ...styles.cornerLeaf, left: -6, bottom: -6 }}
          />
          <img
            src="/assets/teacher/deco_leaves_right.png"
            alt=""
            style={{ ...styles.cornerLeaf, right: -6, top: -6 }}
          />

          <div style={styles.woodPlateInner}>
            {/* Mascot on the left */}
            <div style={styles.mascotCol}>
              <TeacherMascotRig width={120} />
            </div>

            {/* Waiting prompt & progress */}
            <div style={styles.waitingContentCol}>
              <h2 style={styles.waitingTitle}>
                {totalCount === 0
                  ? 'Ожидаем подключения учеников'
                  : 'Ждём, пока ваши ученики закончат отвечать'}
              </h2>

              <p style={styles.waitingDesc}>
                {totalCount === 0
                  ? `Попросите учеников открыть Лисквиз и ввести PIN-код ${roomCode || 'комнаты'}. Как только они подключатся и начнут отвечать, их прогресс появится здесь.`
                  : 'Ученики отвечают в своём комфортном темпе. Отчёт по пробелам в знаниях и пьедестал появятся автоматически, когда все завершат тест.'}
              </p>

              {/* Progress pill & bar */}
              <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                  <div style={styles.progressCountLabel}>
                    <Clock size={16} color="#B45309" strokeWidth={2.5} />
                    <span>
                      {totalCount === 0 ? (
                        'Подключено: 0 учеников (ожидание)'
                      ) : (
                        <>Завершили: <strong>{completedCount}</strong> из <strong>{totalCount}</strong> учеников</>
                      )}
                    </span>
                  </div>
                  <span style={styles.progressPctText}>{totalCount === 0 ? '0%' : `${progressPct}%`}</span>
                </div>

                <div style={styles.progressBarTrack}>
                  <motion.div
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6 }}
                    style={{
                      ...styles.progressBarFill,
                      background: isAllFinished
                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                        : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========================================================
            LIVE STUDENT STATUS GRID
           ======================================================== */}
        <div style={styles.studentGridSection}>
          <div style={styles.gridSectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={18} color="#4A2E18" strokeWidth={2.5} />
              <span style={styles.gridSectionTitle}>Статус учеников в классе</span>
            </div>
            <span style={styles.gridSectionCount}>
              {completedCount}/{totalCount} завершено
            </span>
          </div>

          {students.length === 0 ? (
            <div style={styles.emptyStudentsCard}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#4A2E18', fontSize: 16 }}>
                Ученики ещё не начали отвечать
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#78350F', maxWidth: 320, lineHeight: 1.4 }}>
                Сообщите ученикам PIN-код <strong>{roomCode}</strong>. Карточки с именами и баллами появятся в реальном времени!
              </p>
            </div>
          ) : (
            <div style={styles.studentGrid}>
            {students.map((st) => (
              <motion.div
                key={st.id}
                layout
                style={{
                  ...styles.studentCard,
                  background: st.isFinished ? '#F0FDF4' : '#FFFFFF',
                  borderColor: st.isFinished ? '#86EFAC' : '#F5E5D0',
                }}
              >
                <div style={styles.studentAvatarWrapper}>
                  <img
                    src={`/assets/avatars/students/${st.avatar || 'fox'}.png`}
                    alt={st.name}
                    style={styles.studentAvatarImg}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/avatars/students/fox.png';
                    }}
                  />
                  {st.isFinished && (
                    <div style={styles.avatarCheckBadge}>
                      <CheckCircle2 size={13} color="#15803D" strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div style={styles.studentInfoCol}>
                  <span style={styles.studentName}>{st.name}</span>
                  <div style={styles.studentStatusRow}>
                    {st.isFinished ? (
                      <span style={styles.finishedStatusTag}>Завершил(а)</span>
                    ) : (
                      <span style={styles.inProgressStatusTag}>
                        Вопрос {st.answeredCount + 1}/{st.totalQuestions}
                      </span>
                    )}
                  </div>
                </div>

                <span style={styles.studentScoreText}>{st.score}</span>
              </motion.div>
            ))}
          </div>
          )}
        </div>

        {/* ========================================================
            BOTTOM ACTION BUTTON: Finish quiz
           ======================================================== */}
        <div style={styles.bottomBtnWrapper}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            disabled={isFinishing}
            onClick={handleEndQuiz}
            style={{
              ...styles.finishActionBtn,
              background: isAllFinished
                ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
              borderColor: isAllFinished ? '#047857' : '#B45309',
              boxShadow: isAllFinished
                ? '0 4px 0 #065F46, 0 8px 16px rgba(16, 185, 129, 0.25)'
                : '0 4px 0 #92400E, 0 8px 16px rgba(245, 158, 11, 0.25)',
            }}
          >
            <StopCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
            <span style={styles.finishActionBtnText}>
              {isAllFinished ? 'Посмотреть результаты викторины' : 'Завершить викторину досрочно'}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TeacherLiveGame;

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#FAF4E8',
    backgroundImage: 'radial-gradient(#F5EBD7 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 14px 40px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'relative',
    boxSizing: 'border-box',
  },
  topNavRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 30,
  },
  roomTagPill: {
    background: '#FFF8EC',
    border: '1.5px solid #F0D5AC',
    borderRadius: 14,
    padding: '6px 12px',
    fontSize: 12.5,
    fontWeight: 700,
    color: '#6B4219',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dotSeparator: {
    color: '#C98235',
  },
  pinTagPill: {
    background: '#FDCE8D',
    border: '2px solid #C98235',
    borderRadius: 14,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#4A2E18',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 2px 0 #9E5B1D',
  },
  pinCodeText: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: '0.05em',
    color: '#38200E',
    fontVariantNumeric: 'tabular-nums',
  },
  signHeaderWrapper: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: -4,
  },
  signHeaderImg: {
    width: '100%',
    maxHeight: 110,
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 12px rgba(74, 46, 24, 0.14))',
  },

  // Wood Plate
  woodPlateContainer: {
    position: 'relative',
    background: 'linear-gradient(180deg, #FEE6BD 0%, #F5C682 100%)',
    border: '2.5px solid #C98235',
    borderRadius: 22,
    padding: 3,
    boxShadow: '0 5px 0 #9E5B1D, 0 8px 14px rgba(74, 46, 24, 0.1)',
    boxSizing: 'border-box',
    width: '100%',
  },
  woodPlateInner: {
    background: '#FFFDF9',
    border: '1.5px solid #F5DEB3',
    borderRadius: 18,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxSizing: 'border-box',
    width: '100%',
  },
  cornerLeaf: {
    position: 'absolute',
    width: 28,
    height: 28,
    objectFit: 'contain',
    zIndex: 10,
    pointerEvents: 'none',
  },
  mascotCol: {
    width: 120,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingContentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  waitingTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
    color: '#38200E',
    lineHeight: 1.3,
  },
  waitingDesc: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: '#5D381B',
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  progressCountLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#4A2E18',
    fontSize: 12,
  },
  progressPctText: {
    fontWeight: 900,
    color: '#38200E',
    fontVariantNumeric: 'tabular-nums',
  },
  progressBarTrack: {
    width: '100%',
    height: 12,
    background: '#F3E8D2',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(74, 46, 24, 0.15)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  },

  // Student Grid
  studentGridSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  gridSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  gridSectionTitle: {
    fontSize: 13.5,
    fontWeight: 800,
    color: '#4A2E18',
  },
  gridSectionCount: {
    fontSize: 12,
    fontWeight: 700,
    color: '#784E2D',
    fontVariantNumeric: 'tabular-nums',
  },
  emptyStudentsCard: {
    background: '#FFFFFF',
    border: '2px dashed #E2D4BF',
    borderRadius: 16,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    width: '100%',
  },
  studentCard: {
    border: '1.5px solid',
    borderRadius: 14,
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxSizing: 'border-box',
    boxShadow: '0 2px 6px rgba(74, 46, 24, 0.05)',
  },
  studentAvatarWrapper: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 10,
    background: '#FDCE8D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studentAvatarImg: {
    width: 26,
    height: 26,
    objectFit: 'contain',
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    background: '#FFFFFF',
    borderRadius: 99,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  studentInfoCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  studentName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#38200E',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  studentStatusRow: {
    display: 'flex',
    alignItems: 'center',
  },
  finishedStatusTag: {
    fontSize: 10,
    fontWeight: 700,
    color: '#15803D',
  },
  inProgressStatusTag: {
    fontSize: 10,
    fontWeight: 600,
    color: '#B45309',
    fontVariantNumeric: 'tabular-nums',
  },
  studentScoreText: {
    fontSize: 12,
    fontWeight: 900,
    color: '#4A2E18',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },

  // Bottom Finish Button
  bottomBtnWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: 4,
  },
  finishActionBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 18,
    border: '2px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxSizing: 'border-box',
  },
  finishActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: '-0.01em',
  },
};
