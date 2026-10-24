import React, { useState, useEffect, useMemo } from 'react';
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
  subject?: string;
  classNameTitle?: string;
  onFinishQuiz: () => void;
}

type TeacherPhase = 'question' | 'results' | 'leaderboard';

const TEACHER_OPTION_THEMES = [
  { color: 'red' as const, shape: 'triangle' as const, symbol: '▲', bg: '#EF4444', shadow: '#B91C1C' },
  { color: 'blue' as const, shape: 'diamond' as const, symbol: '◆', bg: '#3B82F6', shadow: '#1D4ED8' },
  { color: 'yellow' as const, shape: 'circle' as const, symbol: '●', bg: '#F59E0B', shadow: '#B45309' },
  { color: 'green' as const, shape: 'square' as const, symbol: '■', bg: '#10B981', shadow: '#047857' },
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
  subject = 'Математика',
  classNameTitle = '7А',
  onFinishQuiz,
}: TeacherLiveGameProps) {
  const [questionData, setQuestionData] = useState<any>(initialQuestionData);
  const [phase, setPhase] = useState<TeacherPhase>('question');
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(initialQuestionData?.total_players ?? 0);
  const [resultsData, setResultsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const curQ = questionData?.question || initialQuestionData?.question || DEFAULT_TEACHER_QUESTION;
  const qIndex = (questionData?.question_index ?? initialQuestionData?.question_index ?? 0) + 1;
  const totalQ = questionData?.total_questions ?? initialQuestionData?.total_questions ?? 3;
  const isBoss = Boolean(questionData?.is_boss || curQ?.tier === 3);
  const isLastQuestion = qIndex >= totalQ;

  const initialTimeLimit = isBoss ? 40 : (questionData?.time_limit_sec || initialQuestionData?.time_limit_sec || curQ?.time_limit_sec || (curQ?.tier === 1 ? 15 : 25));
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLimit);

  // Synchronized timer for the teacher matching the students' clock
  useEffect(() => {
    if (phase !== 'question') return;
    const initialSec = isBoss ? 40 : (questionData?.time_limit_sec || initialQuestionData?.time_limit_sec || curQ?.time_limit_sec || (curQ?.tier === 1 ? 15 : 25));
    setTimeLeft(initialSec);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, curQ?.id, questionData?.time_limit_sec, isBoss]);



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
      setAnsweredCount(typeof data.answered_count === 'number' ? data.answered_count : 0);
      if (typeof data.total_players === 'number') {
        setTotalStudents(data.total_players);
      }
      setPhase('question');
      setCountdown(null);
    };

    const handleGameFinished = () => {
      if (!isMounted) return;
      haptics.notification('success');
      fetch(`/api/rooms/${roomCode}/close`, { method: 'POST' }).catch(() => {});
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
      if (isLastQuestion) {
        socketService.send('TEACHER_ACTION', { action: 'CLOSE_ROOM' });
        fetch(`/api/rooms/${roomCode}/close`, { method: 'POST' }).catch(() => {});
      }
    }
  };

  // Render question LaTeX if provided
  const latexHtml = useMemo(() => {
    if (!curQ?.latex) return null;
    try {
      return katex.renderToString(curQ.latex, { throwOnError: false, displayMode: true });
    } catch {
      return null;
    }
  }, [curQ?.latex]);

  return (
    <div style={styles.container}>
      {/* Top Header: Logo badge, Title, Student count */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBadge}>
            <img
              src="/assets/icons/icon_sprout.svg"
              alt="Росток"
              style={{ width: 18, height: 18 }}
            />
          </div>

          <div style={styles.headerTitles}>
            <span style={styles.brandTitle}>Lisquiz</span>
            <span style={styles.brandSub}>
              {questionData?.class_name || classNameTitle}, {questionData?.subject || subject}
            </span>
          </div>
        </div>

        <div style={styles.playerCountPill}>
          <Users size={14} color="#D1D5DB" />
          <span>
            {answeredCount} из {totalStudents > 0 ? totalStudents : 1}
          </span>
        </div>
      </header>

      {/* Progress Section: Counter text directly above glowing dashes */}
      <div style={styles.progressSection}>
        <div style={styles.progressMetaRow}>
          <span style={styles.progressCounterText}>
            Вопрос {qIndex} из {totalQ}
          </span>

          {isBoss && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={styles.bossMiniPill}
            >
              <Flame size={12} color="#EF4444" fill="#EF4444" />
              <span>Сложная задача (х2 очков)</span>
            </motion.div>
          )}
        </div>

        {/* Segmented Glowing Progress Bar */}
        <div style={styles.segmentedProgressRow}>
          {Array.from({ length: totalQ }, (_, i) => i + 1).map((seg) => {
            const isFilled = seg <= qIndex;
            return (
              <div key={seg} style={styles.progressSegment}>
                <div
                  style={{
                    ...styles.segmentFill,
                    width: isFilled ? '100%' : '0%',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* PHASE 1: QUESTION */}
        {phase === 'question' && (
          <motion.div
            key="teacher_question"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Question Card with Timer Notch Cutout */}
            <div style={styles.questionCardWrapper}>
              {/* Circular Countdown Timer Nestled in Top-Right Notch */}
              <div style={styles.circularTimerWrapper}>
                <svg viewBox="0 0 54 54" style={styles.timerSvg}>
                  <circle
                    cx="27"
                    cy="27"
                    r="23"
                    fill="rgba(10, 18, 36, 0.95)"
                    stroke="rgba(255, 255, 255, 0.16)"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="27"
                    cy="27"
                    r="23"
                    fill="transparent"
                    stroke={
                      isBoss
                        ? timeLeft <= 8
                          ? '#EF4444'
                          : '#F97316'
                        : timeLeft <= 3
                        ? '#EF4444'
                        : '#F59E0B'
                    }
                    strokeWidth="3.5"
                    strokeDasharray={144.5}
                    strokeDashoffset={144.5 * (1 - Math.max(0, timeLeft) / (initialTimeLimit || 25))}
                    strokeLinecap="round"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
                    }}
                  />
                </svg>
                <span
                  style={{
                    ...styles.timerText,
                    color: (isBoss && timeLeft <= 8) || timeLeft <= 3 ? '#EF4444' : '#FFFFFF',
                  }}
                >
                  {timeLeft}
                </span>
              </div>

              {/* The Card Body */}
              <div style={styles.questionCard}>
                <div style={styles.categoryBadge}>
                  <div style={styles.categoryIconCircle}>
                    <img
                      src="/assets/icons/icon_calc.svg"
                      alt="Калькулятор"
                      style={{ width: 14, height: 14 }}
                    />
                  </div>
                  <span style={styles.categoryText}>{questionData?.subject || subject}</span>
                </div>

                <h2 style={styles.questionHeading}>{curQ.text}</h2>

                {latexHtml && (
                  <div
                    style={styles.latexBox}
                    dangerouslySetInnerHTML={{ __html: latexHtml }}
                  />
                )}
              </div>
            </div>

            {/* 2x2 Tactile Answer Buttons Grid (Matching Student Layout) */}
            <div style={styles.answersGrid}>
              {curQ.options?.map((opt: any, idx: number) => {
                const theme = TEACHER_OPTION_THEMES[idx % TEACHER_OPTION_THEMES.length];
                const isCorrect = Boolean(opt.is_correct);
                const textLen = opt.text?.length || 0;
                const fontSize = textLen <= 4 ? 24 : textLen <= 10 ? 20 : textLen <= 22 ? 16 : 14;

                let optLatexHtml: string | null = null;
                if (opt.latex) {
                  try {
                    optLatexHtml = katex.renderToString(opt.latex, { throwOnError: false, displayMode: false });
                  } catch {
                    optLatexHtml = null;
                  }
                }

                return (
                  <div
                    key={opt.id ?? idx}
                    style={{
                      position: 'relative',
                      width: '100%',
                      minHeight: 88,
                      display: 'flex',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        minHeight: 88,
                        backgroundColor: theme.bg,
                        border: 'none',
                        borderBottom: `5px solid ${theme.shadow}`,
                        borderRadius: 22,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 12px',
                        boxShadow: isCorrect
                          ? `0 0 28px rgba(16, 185, 129, 0.85), 0 6px 16px rgba(0, 0, 0, 0.45)`
                          : '0 6px 16px rgba(0, 0, 0, 0.35)',
                        outline: isCorrect ? '3.5px solid #FFFFFF' : 'none',
                        outlineOffset: 2,
                        userSelect: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Subtle Foliage Motif in Background */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 20,
                          overflow: 'hidden',
                          pointerEvents: 'none',
                          opacity: 0.12,
                          backgroundImage:
                            'radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(0, 0, 0, 0.6) 0%, transparent 40%)',
                        }}
                      />

                      {/* Geometric Shape at Top */}
                      <span
                        style={{
                          fontSize: 22,
                          color: 'rgba(255, 255, 255, 0.92)',
                          lineHeight: 1,
                          marginBottom: 4,
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))',
                        }}
                      >
                        {theme.symbol}
                      </span>

                      {/* Answer Text */}
                      {opt.text && (
                        <span
                          style={{
                            color: '#FFFFFF',
                            fontWeight: fontSize > 16 ? 900 : 700,
                            fontSize,
                            textAlign: 'center',
                            lineHeight: 1.25,
                            letterSpacing: '0.01em',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                            wordBreak: 'break-word',
                            maxWidth: '100%',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {opt.text}
                        </span>
                      )}

                      {optLatexHtml && (
                        <span
                          style={{
                            color: '#FFFFFF',
                            fontSize: 22,
                            fontWeight: 900,
                            textAlign: 'center',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                          }}
                          dangerouslySetInnerHTML={{ __html: optLatexHtml }}
                        />
                      )}

                      {/* Highlight Badge for Correct Answer */}
                      {isCorrect && (
                        <div style={styles.teacherCorrectPill}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                          <span>Верный</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Teacher Control Actions Immediately Below 2x2 Grid */}
            {(() => {
              const canProceed = (totalStudents > 0 && answeredCount >= totalStudents) || timeLeft <= 0;
              return (
                <div style={styles.actionRowColumn}>
                  <TactileButton
                    theme="green"
                    size="lg"
                    fullWidth
                    disabled={!canProceed}
                    onClick={handleShowResults}
                    iconBefore={<BarChart2 size={18} />}
                  >
                    Показать результаты раунда
                  </TactileButton>

                  <TactileButton
                    theme="orange"
                    size="lg"
                    fullWidth
                    disabled={!canProceed}
                    onClick={handleNextQuestionOrFinish}
                    iconAfter={<ArrowRight size={18} />}
                  >
                    {isLastQuestion ? 'Завершить викторину' : 'Следующий вопрос'}
                  </TactileButton>
                </div>
              );
            })()}
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
    position: 'relative',
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '12px 14px 24px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
    zIndex: 4,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
    border: '1.5px solid rgba(16, 185, 129, 0.6)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.1,
  },
  brandSub: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: 600,
  },
  playerCountPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  segmentedProgressRow: {
    display: 'flex',
    gap: 6,
    width: '100%',
    margin: '4px 0 6px',
    zIndex: 4,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 10px #10B981',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    zIndex: 4,
  },
  progressMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 2px',
  },
  progressCounterText: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#E5E7EB',
    letterSpacing: '0.02em',
  },
  bossMiniPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    border: '1px solid #EF4444',
    color: '#F87171',
    fontSize: 11,
    fontWeight: 800,
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.35)',
  },
  mainContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    position: 'relative',
    zIndex: 4,
  },
  questionCardWrapper: {
    position: 'relative',
    width: '100%',
    margin: '2px 0 10px',
    zIndex: 4,
  },
  circularTimerWrapper: {
    position: 'absolute',
    top: -12,
    right: 8,
    width: 54,
    height: 54,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  timerSvg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  timerText: {
    fontSize: 17,
    fontWeight: 900,
    color: '#FFFFFF',
    zIndex: 1,
  },
  questionCard: {
    position: 'relative',
    zIndex: 3,
    backgroundColor: 'rgba(14, 30, 58, 0.94)',
    border: '1.5px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    padding: '16px 20px',
    paddingRight: 68,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maskImage: 'radial-gradient(circle 38px at calc(100% - 35px) 15px, transparent 0, transparent 38px, black 39px)',
    WebkitMaskImage: 'radial-gradient(circle 38px at calc(100% - 35px) 15px, transparent 0, transparent 38px, black 39px)',
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    borderRadius: 999,
    padding: '3px 10px',
    width: 'fit-content',
  },
  categoryIconCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#93C5FD',
  },
  questionHeading: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    lineHeight: 1.35,
    letterSpacing: '-0.3px',
  },
  latexBox: {
    padding: '4px 0',
    color: '#FDE047',
    fontSize: 20,
    fontWeight: 700,
  },
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    width: '100%',
    position: 'relative',
    zIndex: 3,
    marginBottom: 0,
  },
  teacherCorrectPill: {
    position: 'absolute',
    top: 7,
    right: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    borderRadius: 999,
    padding: '2.5px 8px',
    fontSize: 11,
    fontWeight: 800,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
    border: '1.5px solid #FFFFFF',
    zIndex: 2,
  },
  simulateBotsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px dashed rgba(59, 130, 246, 0.45)',
    borderRadius: 12,
    padding: '9px 12px',
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  actionRowColumn: {
    marginTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    zIndex: 3,
  },
  waitingNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center' as const,
  },
  allAnsweredNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#34D399',
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: 'rgba(14, 30, 58, 0.94)',
    border: '1.5px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    padding: '18px 16px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
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
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
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
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    padding: '16px',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
  },
  leaderRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    borderRadius: 14,
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
