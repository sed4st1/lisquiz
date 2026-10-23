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

  const curQ = questionData?.question;
  const qIndex = (questionData?.question_index ?? 0) + 1;
  const totalQ = questionData?.total_questions ?? 1;
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
      setCountdown(sec);

      let cur = sec;
      const interval = setInterval(() => {
        cur -= 1;
        if (cur <= 0) {
          clearInterval(interval);
          if (isMounted) setCountdown(null);
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
  }, [onFinishQuiz]);

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
    } else {
      onFinishQuiz();
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
            {isBoss && (
              <div style={styles.bossPill}>
                <Flame size={14} color="#EF4444" />
                <span>Сложная задача повышенный балл</span>
              </div>
            )}

            <h2 style={styles.questionText}>
              {curQ?.text || 'Загрузка текста вопроса...'}
            </h2>

            {latexHtml && (
              <div
                style={styles.latexBox}
                dangerouslySetInnerHTML={{ __html: latexHtml }}
              />
            )}

            {/* Answer Options Grid */}
            <div style={styles.optionsGrid}>
              {curQ?.options?.map((opt: any, idx: number) => {
                const isCorrect = Boolean(opt.is_correct);
                return (
                  <div
                    key={opt.id || idx}
                    style={{
                      ...styles.optionCard,
                      backgroundColor: isCorrect ? '#065F46' : '#0F172A',
                    }}
                  >
                    <div style={styles.optionHeader}>
                      <span
                        style={{
                          ...styles.optionLetter,
                          backgroundColor: isCorrect ? '#10B981' : '#1E293B',
                          color: '#FFFFFF',
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {isCorrect && (
                        <div style={styles.correctBadge}>
                          <Check size={13} color="#34D399" />
                          <span>Правильный</span>
                        </div>
                      )}
                    </div>
                    <span style={styles.optionText}>{opt.text}</span>
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

            {/* Distribution bars */}
            <div style={styles.distributionList}>
              {curQ?.options?.map((opt: any, idx: number) => {
                const count = resultsData?.distribution?.[String(opt.id)] || 0;
                const isCorrect = Boolean(opt.is_correct || resultsData?.correct_option_id === opt.id);
                return (
                  <div key={opt.id || idx} style={styles.distRow}>
                    <div style={styles.distLabelRow}>
                      <span style={styles.distLetter}>{String.fromCharCode(65 + idx)}. {opt.text}</span>
                      <span style={styles.distCount}>{count} чел</span>
                    </div>
                    <div style={styles.distBarBg}>
                      <div
                        style={{
                          ...styles.distBarFill,
                          width: `${Math.min(100, count * 25)}%`,
                          backgroundColor: isCorrect ? '#10B981' : '#3B82F6',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {resultsData?.explanation && (
              <div style={styles.explanationBox}>
                <Sparkles size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={styles.explanationText}>
                  <strong>Методическое пояснение:</strong> {resultsData.explanation}
                </div>
              </div>
            )}

            <div style={styles.actionRow}>
              <TactileButton
                theme="yellow"
                size="lg"
                fullWidth
                onClick={handleShowLeaderboard}
                iconBefore={<Trophy size={18} />}
              >
                Показать рейтинг участников
              </TactileButton>
            </div>
          </motion.div>
        )}

        {/* PHASE 3: LEADERBOARD */}
        {phase === 'leaderboard' && (
          <motion.div
            key="teacher_leaderboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.card}
          >
            <div style={styles.cardHeader}>
              <Trophy size={22} color="#F59E0B" />
              <h3 style={styles.cardTitle}>Лидеры викторины</h3>
            </div>

            <div style={styles.leaderList}>
              {leaderboardData?.top_players?.map((p: any, idx: number) => {
                const medals = ['🥇', '🥈', '🥉'];
                const medal = medals[idx] || `${idx + 1}`;
                return (
                  <div key={p.id || idx} style={styles.leaderRow}>
                    <span style={styles.leaderRank}>{medal}</span>
                    <span style={styles.leaderName}>{p.name}</span>
                    <span style={styles.leaderScore}>{p.score} очков</span>
                  </div>
                );
              })}
            </div>

            <div style={styles.actionRow}>
              <TactileButton
                theme="green"
                size="lg"
                fullWidth
                onClick={handleNextQuestionOrFinish}
                iconAfter={<ArrowRight size={18} />}
              >
                {isLastQuestion ? 'Завершить игру и открыть отчёт' : 'Следующий вопрос'}
              </TactileButton>
            </div>
          </motion.div>
        )}
      </div>

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
          <span style={styles.countdownLabel}>Следующий вопрос</span>
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
    marginBottom: 14,
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
  bossPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    padding: '4px 10px',
    color: '#F87171',
    fontSize: 11,
    fontWeight: 800,
    alignSelf: 'flex-start',
  },
  questionText: {
    fontSize: 18,
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
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 4,
  },
  optionCard: {
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  optionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLetter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
  },
  correctBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#34D399',
    fontSize: 11,
    fontWeight: 800,
  },
  optionText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  actionRow: {
    marginTop: 8,
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
    fontSize: 13,
    fontWeight: 700,
    color: '#E2E8F0',
  },
  distLetter: {
    flex: 1,
  },
  distCount: {
    color: '#34D399',
    fontWeight: 800,
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
