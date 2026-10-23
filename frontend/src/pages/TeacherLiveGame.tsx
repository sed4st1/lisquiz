import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Trophy,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { socketService } from '../services/socketService';
import { haptics } from '../services/haptics';

export interface TeacherLiveGameProps {
  roomCode: string;
  initialQuestionData?: any;
  onFinishGame: () => void;
}

type LiveMode = 'question' | 'results' | 'leaderboard';

const SHAPE_MAP: Record<string, string> = {
  triangle: '▲',
  diamond: '◆',
  circle: '●',
  square: '■',
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  red: { bg: '#EF4444', text: '#FFFFFF' },
  orange: { bg: '#F97316', text: '#FFFFFF' },
  blue: { bg: '#3B82F6', text: '#FFFFFF' },
  yellow: { bg: '#EAB308', text: '#0F172A' },
  green: { bg: '#10B981', text: '#FFFFFF' },
};

export default function TeacherLiveGame({
  roomCode,
  initialQuestionData,
  onFinishGame,
}: TeacherLiveGameProps) {
  const [mode, setMode] = useState<LiveMode>('question');
  const [questionData, setQuestionData] = useState<any>(initialQuestionData);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(
    initialQuestionData?.time_limit_sec || 20
  );
  const [resultsData, setResultsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  // Timer countdown in question mode
  useEffect(() => {
    if (mode !== 'question' || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, timeRemaining]);

  // WebSocket listeners
  useEffect(() => {
    let isMounted = true;

    const handleQuestionStart = (data: any) => {
      if (!isMounted) return;
      setQuestionData(data);
      setMode('question');
      setAnsweredCount(0);
      setTimeRemaining(data.time_limit_sec || 20);
      setResultsData(null);
      setLeaderboardData(null);
    };

    const handleAnswerCollected = (data: any) => {
      if (!isMounted) return;
      haptics.selection();
      setAnsweredCount(data.answered_count || 0);
      if (data.total_players) {
        setTotalStudents(data.total_players);
      }
    };

    const handleQuestionResults = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      setResultsData(data);
      setMode('results');
    };

    const handleLeaderboardUpdate = (data: any) => {
      if (!isMounted) return;
      haptics.impact('medium');
      setLeaderboardData(data);
      setMode('leaderboard');
    };

    const handleGameFinished = () => {
      if (!isMounted) return;
      haptics.notification('success');
      onFinishGame();
    };

    socketService.on('QUESTION_START', handleQuestionStart);
    socketService.on('ANSWER_COLLECTED', handleAnswerCollected);
    socketService.on('QUESTION_RESULTS', handleQuestionResults);
    socketService.on('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
    socketService.on('GAME_FINISHED', handleGameFinished);

    return () => {
      isMounted = false;
      socketService.off('QUESTION_START', handleQuestionStart);
      socketService.off('ANSWER_COLLECTED', handleAnswerCollected);
      socketService.off('QUESTION_RESULTS', handleQuestionResults);
      socketService.off('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
      socketService.off('GAME_FINISHED', handleGameFinished);
    };
  }, [onFinishGame]);

  const qObj = questionData?.question;
  const qIndex = questionData?.question_index ?? 0;
  const totalQ = questionData?.total_questions ?? 5;
  const tier = questionData?.tier ?? 2;
  const isBoss = questionData?.is_boss ?? false;

  // LaTeX renderer
  const renderedText = useMemo(() => {
    const raw = qObj?.text || 'Загрузка вопроса...';
    try {
      if (raw.includes('$')) {
        const parts = raw.split('$');
        return parts.map((part: string, idx: number) => {
          if (idx % 2 === 1) {
            try {
              const html = katex.renderToString(part, { throwOnError: false });
              return (
                <span
                  key={idx}
                  dangerouslySetInnerHTML={{ __html: html }}
                  style={{ display: 'inline-block', margin: '0 2px' }}
                />
              );
            } catch {
              return <span key={idx}>${part}$</span>;
            }
          }
          return <span key={idx}>{part}</span>;
        });
      }
      return <span>{raw}</span>;
    } catch {
      return <span>{raw}</span>;
    }
  }, [qObj?.text]);

  // Actions
  const handleRevealResults = () => {
    haptics.notification('success');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'SHOW_RESULTS' });
    } else {
      // Local fallback
      setResultsData({
        correct_option_id: 0,
        explanation: qObj?.explanation || 'Ответ основан на базовом свойстве дробей.',
        distribution: { '0': Math.max(1, answeredCount), '1': 0, '2': 0, '3': 0 },
      });
      setMode('results');
    }
  };

  const handleShowLeaderboard = () => {
    haptics.impact('light');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'SHOW_LEADERBOARD' });
    } else {
      setLeaderboardData({
        top_players: [
          { rank: 1, name: 'Маша К', score: 1350, streak: 2 },
          { rank: 2, name: 'Иван К', score: 1100, streak: 1 },
          { rank: 3, name: 'София Л', score: 850, streak: 1 },
        ],
        is_last_question: qIndex + 1 >= totalQ,
        grove_energy: 35,
      });
      setMode('leaderboard');
    }
  };

  const handleNextQuestion = () => {
    haptics.notification('success');
    if (socketService.isConnected()) {
      socketService.send('TEACHER_ACTION', { action: 'NEXT_QUESTION' });
    } else {
      if (qIndex + 1 >= totalQ) {
        onFinishGame();
      } else {
        setMode('question');
        setTimeRemaining(20);
        setAnsweredCount(0);
      }
    }
  };

  const answerProgressPercent = totalStudents > 0
    ? Math.min(100, Math.round((answeredCount / totalStudents) * 100))
    : 0;

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.badgeRow}>
          <div style={styles.questionBadge}>
            Вопрос {qIndex + 1} из {totalQ}
          </div>
          {isBoss ? (
            <div style={styles.bossBadge}>⚡ БОСС РАУНД</div>
          ) : (
            <div style={styles.tierBadge}>Tier {tier}</div>
          )}
          <div style={styles.pinBadge}>PIN {roomCode}</div>
        </div>

        {/* Live Timer Indicator */}
        <div style={styles.timerWrapper}>
          <Clock size={16} color="#94A3B8" />
          <span
            style={{
              ...styles.timerValue,
              color: timeRemaining <= 5 ? '#EF4444' : '#FFFFFF',
            }}
          >
            {timeRemaining} сек
          </span>
        </div>
      </header>

      {/* Mode: QUESTION */}
      {mode === 'question' && (
        <motion.div
          key="mode_question"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.contentColumn}
        >
          {/* Question Box */}
          <div style={styles.questionCard}>
            <div style={styles.questionText}>{renderedText}</div>
          </div>

          {/* Answer Progress Counter */}
          <div style={styles.counterCard}>
            <div style={styles.counterHeader}>
              <span style={styles.counterTitle}>Ответы учеников</span>
              <span style={styles.counterNumber}>
                {answeredCount} из {totalStudents}
              </span>
            </div>
            <div style={styles.progressTrack}>
              <motion.div
                style={styles.progressBar}
                animate={{ width: `${answerProgressPercent}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            </div>
          </div>

          {/* Options Grid (Teacher view highlights the correct answer) */}
          <div style={styles.optionsGrid}>
            {qObj?.options?.map((opt: any) => {
              const colorInfo = COLOR_MAP[opt.color] || COLOR_MAP.blue;
              const shapeIcon = SHAPE_MAP[opt.symbol] || '●';
              const isCorrect = Boolean(opt.is_correct);

              return (
                <div
                  key={opt.id}
                  style={{
                    ...styles.optionCard,
                    backgroundColor: isCorrect ? '#065F46' : '#1E293B',
                  }}
                >
                  <div
                    style={{
                      ...styles.shapeBadge,
                      backgroundColor: colorInfo.bg,
                      color: colorInfo.text,
                    }}
                  >
                    {shapeIcon}
                  </div>
                  <span style={styles.optionText}>{opt.text}</span>
                  {isCorrect && (
                    <CheckCircle2
                      size={18}
                      color="#34D399"
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <div style={styles.footerAction}>
            <TactileButton
              theme={answeredCount >= totalStudents && totalStudents > 0 ? 'green' : 'yellow'}
              size="lg"
              fullWidth
              onClick={handleRevealResults}
              iconAfter={<ChevronRight size={20} />}
            >
              {answeredCount >= totalStudents && totalStudents > 0
                ? 'Все ответили! Раскрыть результаты'
                : 'Раскрыть результаты'}
            </TactileButton>
          </div>
        </motion.div>
      )}

      {/* Mode: RESULTS */}
      {mode === 'results' && (
        <motion.div
          key="mode_results"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.contentColumn}
        >
          <div style={styles.resultsCard}>
            <div style={styles.resultsHeader}>
              <BarChart3 size={20} color="#34D399" />
              <h3 style={styles.resultsTitle}>Распределение ответов класса</h3>
            </div>

            {/* Answer Distribution Bars */}
            <div style={styles.distributionList}>
              {qObj?.options?.map((opt: any) => {
                const count = resultsData?.distribution?.[String(opt.id)] || 0;
                const pct =
                  answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                const isCorrect = Boolean(opt.is_correct);
                const colorInfo = COLOR_MAP[opt.color] || COLOR_MAP.blue;
                const shapeIcon = SHAPE_MAP[opt.symbol] || '●';

                return (
                  <div key={opt.id} style={styles.distributionRow}>
                    <div style={styles.distribInfo}>
                      <span
                        style={{
                          ...styles.distribShape,
                          backgroundColor: colorInfo.bg,
                        }}
                      >
                        {shapeIcon}
                      </span>
                      <span style={styles.distribText}>{opt.text}</span>
                      {isCorrect && (
                        <span style={styles.correctPill}>Верный</span>
                      )}
                      <span style={styles.distribCount}>
                        {count} чел ({pct}%)
                      </span>
                    </div>

                    <div style={styles.distribBarTrack}>
                      <div
                        style={{
                          ...styles.distribBarFill,
                          width: `${pct}%`,
                          backgroundColor: isCorrect ? '#10B981' : '#64748B',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sprint Mascot Explanation */}
            {resultsData?.explanation && (
              <div style={styles.explanationBox}>
                <Sparkles size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={styles.explanationText}>
                  <strong>Методическое пояснение:</strong> {resultsData.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div style={styles.footerAction}>
            <TactileButton
              theme="blue"
              size="lg"
              fullWidth
              onClick={handleShowLeaderboard}
              iconAfter={<Trophy size={20} />}
            >
              Таблица лидеров
            </TactileButton>
          </div>
        </motion.div>
      )}

      {/* Mode: LEADERBOARD */}
      {mode === 'leaderboard' && (
        <motion.div
          key="mode_leaderboard"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.contentColumn}
        >
          <div style={styles.leaderboardCard}>
            <div style={styles.resultsHeader}>
              <Trophy size={22} color="#F59E0B" />
              <h3 style={styles.resultsTitle}>Лидеры раунда</h3>
            </div>

            <div style={styles.leaderList}>
              {leaderboardData?.top_players?.map((p: any, idx: number) => {
                const medals = ['🥇', '🥈', '🥉'];
                const medal = medals[idx] || `${idx + 1}`;

                return (
                  <div key={p.id || idx} style={styles.leaderRow}>
                    <span style={styles.leaderRank}>{medal}</span>
                    <span style={styles.leaderName}>{p.name}</span>
                    <div style={styles.leaderScoreGroup}>
                      <span style={styles.leaderScore}>{p.score} очк</span>
                      {p.streak > 1 && (
                        <span style={styles.leaderStreak}>
                          <Flame size={14} color="#F97316" /> {p.streak}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Class Grove Energy Progress */}
            {leaderboardData?.grove_energy !== undefined && (
              <div style={styles.groveEnergyBox}>
                <span style={styles.groveEnergyLabel}>
                  🌱 Рост Классной Рощи: {leaderboardData.grove_energy}%
                </span>
                <div style={styles.groveEnergyTrack}>
                  <div
                    style={{
                      ...styles.groveEnergyFill,
                      width: `${leaderboardData.grove_energy}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div style={styles.footerAction}>
            {leaderboardData?.is_last_question || qIndex + 1 >= totalQ ? (
              <TactileButton
                theme="green"
                size="lg"
                fullWidth
                onClick={onFinishGame}
                iconAfter={<CheckCircle2 size={20} />}
              >
                Завершить викторину и отчёт
              </TactileButton>
            ) : (
              <TactileButton
                theme="green"
                size="lg"
                fullWidth
                onClick={handleNextQuestion}
                iconAfter={<ChevronRight size={20} />}
              >
                Следующий вопрос ({qIndex + 2} из {totalQ})
              </TactileButton>
            )}
          </div>
        </motion.div>
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
    padding: '12px 14px 92px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  questionBadge: {
    backgroundColor: '#1E293B',
    color: '#34D399',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 8,
    padding: '4px 10px',
  },
  tierBadge: {
    backgroundColor: '#0F172A',
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 8,
    padding: '4px 8px',
  },
  bossBadge: {
    backgroundColor: '#7C2D12',
    color: '#FDBA74',
    fontSize: 11,
    fontWeight: 800,
    borderRadius: 8,
    padding: '4px 8px',
  },
  pinBadge: {
    backgroundColor: '#0F172A',
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 8,
    padding: '4px 8px',
  },
  timerWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: '4px 10px',
  },
  timerValue: {
    fontSize: 13,
    fontWeight: 800,
  },
  contentColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  questionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '18px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.4,
  },
  counterCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  counterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterTitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  counterNumber: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 800,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: '12px 14px',
  },
  shapeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 800,
    flexShrink: 0,
  },
  optionText: {
    fontSize: 15,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  resultsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  distributionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  distributionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  distribInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },
  distribShape: {
    width: 18,
    height: 18,
    borderRadius: 5,
    color: '#FFFFFF',
    fontSize: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distribText: {
    fontWeight: 700,
    color: '#FFFFFF',
  },
  correctPill: {
    backgroundColor: '#065F46',
    color: '#34D399',
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
  },
  distribCount: {
    marginLeft: 'auto',
    color: '#94A3B8',
    fontWeight: 700,
  },
  distribBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  distribBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.4s ease',
  },
  explanationBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '10px 12px',
    display: 'flex',
    gap: 8,
  },
  explanationText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 1.4,
  },
  leaderboardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
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
    padding: '10px 12px',
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
  leaderScoreGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  leaderScore: {
    fontSize: 14,
    fontWeight: 800,
    color: '#34D399',
  },
  leaderStreak: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: 12,
    fontWeight: 800,
    color: '#F97316',
  },
  groveEnergyBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  groveEnergyLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 700,
  },
  groveEnergyTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  groveEnergyFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  footerAction: {
    marginTop: 4,
  },
};
