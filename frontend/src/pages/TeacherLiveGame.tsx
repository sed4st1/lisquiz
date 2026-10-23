import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  Users,
  Sparkles,
  BarChart2,
  Trophy,
  ArrowRight,
  Flame,
  Check,
  Sprout,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { socketService } from '../services/socketService';
import { haptics } from '../services/haptics';

export interface TeacherLiveGameProps {
  roomCode: string;
  initialQuestionData: any;
  onFinishQuiz: () => void;
}

type TeacherPhase = 'question' | 'results' | 'leaderboard';

const TEACHER_OPTION_THEMES = [
  { color: 'red', shape: 'triangle', symbol: '▲', bg: '#EF4444', shadow: '#B91C1C' },
  { color: 'blue', shape: 'diamond', symbol: '◆', bg: '#3B82F6', shadow: '#1D4ED8' },
  { color: 'yellow', shape: 'circle', symbol: '●', bg: '#F59E0B', shadow: '#B45309' },
  { color: 'green', shape: 'square', symbol: '■', bg: '#10B981', shadow: '#047857' },
];

const DEFAULT_TEACHER_QUESTION = {
  id: 1,
  text: 'Чему равна сумма 1/4 + 2/4?',
  latex: '\\frac{1}{4} + \\frac{2}{4}',
  options: [
    { id: 0, text: '3/4', is_correct: true },
    { id: 1, text: '3/8', is_correct: false },
    { id: 2, text: '2/4', is_correct: false },
    { id: 3, text: '1/2', is_correct: false },
  ],
  explanation: 'Складываем числители при одинаковом знаменателе: (1 + 2) / 4 = 3/4.',
};

export default function TeacherLiveGame({
  roomCode,
  initialQuestionData,
  onFinishQuiz,
}: TeacherLiveGameProps) {
  const [questionData, setQuestionData] = useState<any>(initialQuestionData);
  const [phase, setPhase] = useState<TeacherPhase>('question');
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [resultsData, setResultsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Sync state if initialQuestionData updates from parent
  useEffect(() => {
    if (initialQuestionData) {
      setQuestionData(initialQuestionData);
    }
  }, [initialQuestionData]);

  const curQ = questionData?.question || initialQuestionData?.question || DEFAULT_TEACHER_QUESTION;
  const qIndex = (questionData?.question_index ?? initialQuestionData?.question_index ?? 0) + 1;
  const totalQ = questionData?.total_questions ?? initialQuestionData?.total_questions ?? 3;
  const isBoss = Boolean(questionData?.is_boss);
  const isLastQuestion = qIndex >= totalQ;

  // Listen to WebSocket events
  useEffect(() => {
    let isMounted = true;

    const handleAnswerCollected = (data: any) => {
      if (!isMounted) return;
      haptics.impact('light');
      if (typeof data.answered_count === 'number') {
        setAnsweredCount(data.answered_count);
      }
      if (typeof data.total_players === 'number') {
        setTotalStudents(data.total_players);
      }
    };

    const handleQuestionResults = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      setResultsData(data);
      setPhase('results');
    };

    const handleLeaderboardUpdate = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      setLeaderboardData(data);
      setPhase('leaderboard');
    };

    const handleCountdownStart = (data: any) => {
      if (!isMounted) return;
      const sec = data.countdown_sec || 3;
      const nextIdx = typeof data.question_index === 'number' ? data.question_index : qIndex;
      setCountdown(sec);

      let cur = sec;
      const interval = setInterval(() => {
        cur -= 1;
        if (cur <= 0) {
          clearInterval(interval);
          if (isMounted) {
            setCountdown(null);
            if (socketService.isConnected()) {
              socketService.send('TEACHER_ACTION', { action: 'START_QUESTION', question_index: nextIdx });
            }
          }
        } else {
          if (isMounted) setCountdown(cur);
        }
      }, 1000);
    };

    const handleQuestionStart = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      setQuestionData(data);
      setAnsweredCount(0);
      setPhase('question');
      setCountdown(null);
    };

    const handleGameFinished = () => {
      if (!isMounted) return;
      haptics.notification('success');
      onFinishQuiz();
    };

    socketService.on('ANSWER_COLLECTED', handleAnswerCollected);
    socketService.on('QUESTION_RESULTS', handleQuestionResults);
    socketService.on('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
    socketService.on('COUNTDOWN_START', handleCountdownStart);
    socketService.on('QUESTION_START', handleQuestionStart);
    socketService.on('GAME_FINISHED', handleGameFinished);

    return () => {
      isMounted = false;
      socketService.off('ANSWER_COLLECTED', handleAnswerCollected);
      socketService.off('QUESTION_RESULTS', handleQuestionResults);
      socketService.off('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
      socketService.off('COUNTDOWN_START', handleCountdownStart);
      socketService.off('QUESTION_START', handleQuestionStart);
      socketService.off('GAME_FINISHED', handleGameFinished);
    };
  }, [qIndex, onFinishQuiz]);

  // Actions
  const handleShowResults = () => {
    haptics.impact('medium');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'SHOW_RESULTS' });
    } else {
      setPhase('results');
    }
  };

  const handleShowLeaderboard = () => {
    haptics.impact('medium');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'SHOW_LEADERBOARD' });
    } else {
      setPhase('leaderboard');
    }
  };

  const handleNextQuestionOrFinish = () => {
    haptics.impact('medium');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'NEXT_QUESTION' });
    }
  };

  // Render question LaTeX if provided
  const latexHtml = React.useMemo(() => {
    if (!curQ?.latex) return null;
    try {
      return katex.renderToString(curQ.latex, { throwOnError: false, displayMode: true });
    } catch {
      return null;
    }
  }, [curQ?.latex]);

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.roomBadge}>Комната {roomCode}</div>

        <div style={styles.questionBadge}>
          <Sparkles size={14} color="#34D399" />
          <span>
            Вопрос {qIndex} из {totalQ}
          </span>
        </div>

        <div style={styles.answeredBadge}>
          <Users size={14} color="#60A5FA" />
          <span>
            {answeredCount} {totalStudents > 0 ? `из ${totalStudents}` : 'ответов'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* PHASE 1: QUESTION */}
        {phase === 'question' && (
          <motion.div
            key="teacher_question"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.card}
          >
            {/* Category badge & Boss Pill */}
            <div style={styles.cardTopRow}>
              <div style={styles.categoryBadge}>
                <img
                  src="/assets/icons/icon_calc.svg"
                  alt="Калькулятор"
                  style={{ width: 14, height: 14 }}
                />
                <span style={styles.categoryText}>Математика</span>
              </div>
              {isBoss && (
                <div style={styles.bossPill}>
                  <Flame size={14} color="#EF4444" fill="#EF4444" />
                  <span>Сложная задача (х2 очков)</span>
                </div>
              )}
            </div>

            <h2 style={styles.questionText}>
              {curQ.text}
            </h2>

            {latexHtml && (
              <div
                style={styles.latexBox}
                dangerouslySetInnerHTML={{ __html: latexHtml }}
              />
            )}

            {/* Answer Options Grid - matching StudentGameQuestion's 2x2 buttons! */}
            <div style={styles.optionsGrid}>
              {curQ.options?.map((opt: any, idx: number) => {
                const theme = TEACHER_OPTION_THEMES[idx % TEACHER_OPTION_THEMES.length];
                const isCorrect = Boolean(opt.is_correct);
                return (
                  <div
                    key={opt.id ?? idx}
                    style={{
                      ...styles.teacherOptionCard,
                      backgroundColor: theme.bg,
                      boxShadow: `0 4px 0 ${theme.shadow}`,
                      border: isCorrect ? '3px solid #FFFFFF' : 'none',
                    }}
                  >
                    <div style={styles.teacherOptionShape}>
                      {theme.symbol}
                    </div>
                    <span style={styles.teacherOptionText}>{opt.text}</span>
                    {isCorrect && (
                      <div style={styles.teacherCorrectPill}>
                        <Check size={13} color="#065F46" strokeWidth={3} />
                        <span>Верный</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div style={styles.actionRow}>
              <TactileButton
                theme="green"
                size="lg"
                fullWidth
                onClick={handleShowResults}
                iconBefore={<BarChart2 size={18} />}
              >
                Показать результаты раунда
              </TactileButton>
            </div>
          </motion.div>
        )}

        {/* PHASE 2: RESULTS */}
        {phase === 'results' && (
          <motion.div
            key="teacher_results"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.card}
          >
            <div style={styles.cardHeader}>
              <BarChart2 size={20} color="#34D399" />
              <h3 style={styles.cardTitle}>Распределение ответов класса</h3>
            </div>

            {/* Distribution bars matching colors and shapes */}
            <div style={styles.distributionList}>
              {curQ.options?.map((opt: any, idx: number) => {
                const theme = TEACHER_OPTION_THEMES[idx % TEACHER_OPTION_THEMES.length];
                const count = resultsData?.distribution?.[String(opt.id)] ?? resultsData?.distribution?.[opt.id] ?? 0;
                const isCorrect = Boolean(opt.is_correct || resultsData?.correct_option_id === opt.id);
                const totalVotes = Object.values(resultsData?.distribution || {}).reduce(
                  (acc: number, val: any) => acc + Number(val),
                  0
                ) as number;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : (count > 0 ? 100 : 0);

                return (
                  <div key={opt.id ?? idx} style={styles.distRow}>
                    <div style={styles.distLabelRow}>
                      <div style={styles.distLabelShapeGroup}>
                        <span style={{ color: theme.bg, fontWeight: 900, fontSize: 16 }}>{theme.symbol}</span>
                        <span style={styles.distLetter}>{opt.text}</span>
                        {isCorrect && (
                          <span style={styles.distCorrectTag}>
                            <Check size={11} color="#34D399" strokeWidth={3} /> Верный ответ
                          </span>
                        )}
                      </div>
                      <span style={styles.distCount}>{count} чел ({pct}%)</span>
                    </div>
                    <div style={styles.distBarBg}>
                      <div
                        style={{
                          ...styles.distBarFill,
                          width: `${pct}%`,
                          backgroundColor: isCorrect ? '#10B981' : theme.bg,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Buttons immediately under round results */}
            <div style={styles.actionRowColumn}>
              <TactileButton
                theme="orange"
                size="lg"
                fullWidth
                onClick={handleNextQuestionOrFinish}
                iconAfter={<ArrowRight size={18} />}
              >
                {isLastQuestion ? 'Завершить викторину' : 'Следующий вопрос'}
              </TactileButton>

              <TactileButton
                theme="yellow"
                size="md"
                fullWidth
                onClick={handleShowLeaderboard}
                iconBefore={<Trophy size={18} />}
              >
                Показать рейтинг участников
              </TactileButton>
            </div>

            {resultsData?.explanation && (
              <div style={styles.explanationBox}>
                <Sparkles size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={styles.explanationText}>
                  <strong>Методическое пояснение:</strong> {resultsData.explanation}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* PHASE 3: LEADERBOARD */}
        {phase === 'leaderboard' && (
          <motion.div
            key="teacher_leaderboard"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.card}
          >
            <div style={styles.cardHeader}>
              <Trophy size={20} color="#F59E0B" />
              <h3 style={styles.cardTitle}>Лидеры викторины (Раунд {qIndex})</h3>
            </div>

            <div style={styles.leaderList}>
              {(!leaderboardData?.top_players || leaderboardData.top_players.length === 0) ? (
                <div style={styles.emptyLeaderBox}>
                  <span>Подсчёт результатов участников...</span>
                </div>
              ) : (
                leaderboardData.top_players.map((p: any, idx: number) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const medal = medals[idx] || `${idx + 1}`;
                  return (
                    <div key={p.id || idx} style={styles.leaderRow}>
                      <span style={styles.leaderRank}>{medal}</span>
                      <span style={styles.leaderName}>{p.name}</span>
                      <span style={styles.leaderScore}>{p.score} очков</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Class Grove Energy Growth Pill */}
            <div style={styles.groveEnergyPill}>
              <Sprout size={16} color="#34D399" />
              <span>Энергия Рощи класса: +15% к здоровью дерева</span>
            </div>

            <div style={styles.actionRowColumn}>
              <TactileButton
                theme="orange"
                size="lg"
                fullWidth
                onClick={handleNextQuestionOrFinish}
                iconAfter={<ArrowRight size={18} />}
              >
                {isLastQuestion ? 'Завершить викторину' : 'Следующий вопрос'}
              </TactileButton>

              <TactileButton
                theme="secondary"
                size="md"
                fullWidth
                onClick={() => setPhase('results')}
                iconBefore={<BarChart2 size={18} />}
              >
                Вернуться к результатам раунда
              </TactileButton>
            </div>
          </motion.div>
        )}
      </div>

      {/* Countdown overlay between rounds */}
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
          <span style={styles.countdownLabel}>Следующий вопрос!</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    padding: '14px 14px 92px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  roomBadge: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 8,
    padding: '5px 10px',
  },
  questionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 8,
    padding: '5px 12px',
  },
  answeredBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 8,
    padding: '5px 10px',
  },
  mainContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  cardTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    padding: '4px 10px',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#94A3B8',
  },
  bossPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    border: '1px solid #EF4444',
    borderRadius: 999,
    padding: '4px 10px',
    color: '#F87171',
    fontSize: 11,
    fontWeight: 800,
  },
  questionText: {
    fontSize: 19,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    lineHeight: 1.35,
  },
  latexBox: {
    padding: '6px 0',
    color: '#FCD34D',
    fontSize: 18,
    fontWeight: 700,
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginTop: 4,
  },
  teacherOptionCard: {
    borderRadius: 16,
    padding: '16px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    minHeight: 68,
    boxSizing: 'border-box',
    transition: 'all 0.15s ease',
  },
  teacherOptionShape: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 900,
    flexShrink: 0,
  },
  teacherOptionText: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 1.25,
  },
  teacherCorrectPill: {
    position: 'absolute',
    top: 6,
    right: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    color: '#065F46',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  actionRow: {
    marginTop: 8,
  },
  actionRowColumn: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  distributionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  distRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  distLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#E2E8F0',
  },
  distLabelShapeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  distCorrectTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#065F46',
    color: '#34D399',
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 6,
    fontWeight: 800,
    marginLeft: 4,
  },
  distLetter: {
    fontWeight: 700,
    color: '#FFFFFF',
  },
  distCount: {
    color: '#34D399',
    fontWeight: 800,
    fontSize: 12.5,
  },
  distBarBg: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  explanationBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '12px',
    display: 'flex',
    gap: 8,
  },
  explanationText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 1.4,
  },
  leaderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyLeaderBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '16px',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
  },
  leaderRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '10px 14px',
    gap: 10,
  },
  leaderRank: {
    fontSize: 16,
    fontWeight: 800,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FFFFFF',
    flex: 1,
  },
  leaderScore: {
    fontSize: 14,
    fontWeight: 800,
    color: '#34D399',
  },
  groveEnergyPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 12.5,
    fontWeight: 700,
    color: '#34D399',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  countdownNumber: {
    fontSize: 84,
    fontWeight: 900,
    color: '#F59E0B',
    lineHeight: 1,
    marginBottom: 10,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
  },
};
