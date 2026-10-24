import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Trophy,
  BarChart2,
  Clock,
  Heart,
  Sprout,
  Check,
} from 'lucide-react';
import { socketService } from '../services/socketService';
import { haptics } from '../services/haptics';
import { TactileButton } from '../components/TactileButton';

export interface StudentRoundWaitProps {
  roomCode: string;
  playerName: string;
  playerAvatar: string;
  personalResult?: {
    is_correct?: boolean;
    points_awarded?: number;
    total_score?: number;
    streak?: number;
  } | null;
  onNextQuestion: (questionData: any) => void;
  onGameFinished: (finishData?: any) => void;
}

type StudentRoundMode = 'waiting' | 'results' | 'leaderboard' | 'finished';

const SHAPE_THEMES = [
  { symbol: '▲', color: '#EF4444' },
  { symbol: '◆', color: '#3B82F6' },
  { symbol: '●', color: '#F59E0B' },
  { symbol: '■', color: '#10B981' },
];

export default function StudentRoundWait({
  roomCode,
  playerName,
  personalResult,
  onNextQuestion,
  onGameFinished,
}: StudentRoundWaitProps) {
  const [mode, setMode] = useState<StudentRoundMode>('waiting');
  const [resultsData, setResultsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [finishData, setFinishData] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const hasAnswered = personalResult !== null && personalResult !== undefined;
  const isCorrect = hasAnswered ? Boolean(personalResult?.is_correct) : false;
  const points = personalResult?.points_awarded ?? 0;
  const streak = personalResult?.streak ?? 0;
  const totalScore = personalResult?.total_score ?? points;

  // Celebratory confetti on mount if correct
  useEffect(() => {
    if (personalResult?.is_correct) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#FF7A00', '#10B981', '#FFD700', '#3B82F6'],
          disableForReducedMotion: true,
        });
      } catch {}
    }
  }, [personalResult?.is_correct]);

  useEffect(() => {
    let isMounted = true;

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

    const handleCountdownStart = (data: any) => {
      if (!isMounted) return;
      const sec = data.countdown_sec || 3;
      setCountdown(sec);

      let cur = sec;
      const timer = setInterval(() => {
        cur -= 1;
        if (cur <= 0) {
          clearInterval(timer);
          if (isMounted) setCountdown(null);
        } else {
          if (isMounted) setCountdown(cur);
        }
      }, 1000);
    };

    const handleQuestionStart = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      onNextQuestion(data);
    };

    const handleGameFinished = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      setFinishData(data);
      try {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.45 },
          colors: ['#F59E0B', '#10B981', '#FF7A00', '#60A5FA', '#EC4899'],
        });
      } catch {}
      setMode('finished');
    };

    socketService.on('QUESTION_RESULTS', handleQuestionResults);
    socketService.on('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
    socketService.on('COUNTDOWN_START', handleCountdownStart);
    socketService.on('QUESTION_START', handleQuestionStart);
    socketService.on('GAME_FINISHED', handleGameFinished);

    return () => {
      isMounted = false;
      socketService.off('QUESTION_RESULTS', handleQuestionResults);
      socketService.off('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
      socketService.off('COUNTDOWN_START', handleCountdownStart);
      socketService.off('QUESTION_START', handleQuestionStart);
      socketService.off('GAME_FINISHED', handleGameFinished);
    };
  }, [onNextQuestion]);

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.pinBadge}>Комната {roomCode}</div>
        <div style={styles.scorePill}>
          <Sparkles size={14} color="#FBBF24" />
          <span>{totalScore} очков</span>
          {streak > 1 && (
            <span style={styles.streakInline}>
              <Flame size={13} color="#FF7A00" />
              {streak}
            </span>
          )}
        </div>
      </header>

      {/* Mode: WAITING */}
      {mode === 'waiting' && (
        <motion.div
          key="wait_mode"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.contentColumn}
        >
          {/* Status Plate */}
          <div style={styles.statusPlate}>
            <div
              style={{
                ...styles.statusIconCircle,
                backgroundColor: !hasAnswered ? '#7F1D1D' : isCorrect ? '#065F46' : '#7F1D1D',
              }}
            >
              {!hasAnswered ? (
                <Clock size={30} color="#F87171" />
              ) : isCorrect ? (
                <CheckCircle2 size={32} color="#34D399" />
              ) : (
                <Heart size={30} color="#F87171" />
              )}
            </div>

            <h2 style={styles.statusTitle}>
              {!hasAnswered ? 'Время вышло' : isCorrect ? 'Ответ зафиксирован!' : 'Ответ принят!'}
            </h2>
            <p style={styles.statusSubtitle}>
              {!hasAnswered
                ? 'Ответ не выбран в срок — засчитано как ошибка.'
                : isCorrect
                ? `Отличная работа! +${points} очков в копилку`
                : 'Не расстраивайся, сейчас разберём правильный ответ!'}
            </p>
          </div>

          {/* Mascot Waiting Card */}
          <div style={styles.mascotWaitCard}>
            <div style={styles.speechBubble}>
              <Sparkles size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Учитель ждёт ответы остальных ребят. Скоро откроем результаты раунда!
              </span>
            </div>

            <div style={styles.mascotImgWrapper}>
              <motion.img
                src={
                  isCorrect
                    ? '/assets/mascot/sprint_celebrate.png'
                    : '/assets/mascot/sprint_thinking.png'
                }
                alt="Спринт"
                style={styles.mascotImg}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Mode: RESULTS */}
      {mode === 'results' && (
        <motion.div
          key="results_mode"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.contentColumn}
        >
          <div style={styles.resultsCard}>
            <div style={styles.cardHeader}>
              <BarChart2 size={20} color="#34D399" />
              <h3 style={styles.cardTitle}>Как ответил наш класс</h3>
            </div>

            {/* Answer distribution breakdown */}
            {resultsData?.distribution && (
              <div style={styles.distList}>
                {Object.entries(resultsData.distribution).map(([key, val], idx) => {
                  const count = Number(val) || 0;
                  const theme = SHAPE_THEMES[idx % SHAPE_THEMES.length];
                  const total = Object.values(resultsData.distribution).reduce(
                    (acc: number, c: any) => acc + Number(c),
                    0
                  ) as number;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isCorrectOpt = String(resultsData?.correct_option_id) === String(key);

                  return (
                    <div key={key} style={styles.distRow}>
                      <div style={styles.distLabelRow}>
                        <div style={styles.distSymbolBadge}>
                          <span style={{ color: theme.color, fontWeight: 900 }}>{theme.symbol}</span>
                          <span>Вариант {idx + 1}</span>
                          {isCorrectOpt && (
                            <span style={styles.distCorrectTag}>
                              <Check size={11} color="#34D399" /> Верно
                            </span>
                          )}
                        </div>
                        <span style={styles.distCountText}>{count} чел ({pct}%)</span>
                      </div>
                      <div style={styles.distBarBg}>
                        <div
                          style={{
                            ...styles.distBarFill,
                            width: `${pct}%`,
                            backgroundColor: isCorrectOpt ? '#10B981' : theme.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Explanation Note */}
            {resultsData?.explanation && (
              <div style={styles.explanationBox}>
                <Sparkles size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={styles.explanationText}>
                  <strong>Пояснение Спринта:</strong> {resultsData.explanation}
                </div>
              </div>
            )}

            <div style={styles.waitingNextPill}>
              <Clock size={16} color="#94A3B8" />
              <span>Учитель открывает таблицу лидеров...</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mode: LEADERBOARD */}
      {mode === 'leaderboard' && (
        <motion.div
          key="leaderboard_mode"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.contentColumn}
        >
          <div style={styles.resultsCard}>
            <div style={styles.cardHeader}>
              <Trophy size={22} color="#F59E0B" />
              <h3 style={styles.cardTitle}>Топ лидеров раунда</h3>
            </div>

            <div style={styles.leaderList}>
              {leaderboardData?.top_players?.map((p: any, idx: number) => {
                const medals = ['🥇', '🥈', '🥉'];
                const medal = medals[idx] || `${idx + 1}`;
                const isMe = p.name === playerName;

                return (
                  <div
                    key={p.id || idx}
                    style={{
                      ...styles.leaderRow,
                      backgroundColor: isMe ? '#065F46' : '#0F172A',
                      border: isMe ? '1.5px solid #34D399' : 'none',
                    }}
                  >
                    <span style={styles.leaderRank}>{medal}</span>
                    <span style={styles.leaderName}>
                      {p.name} {isMe && '(Ты)'}
                    </span>
                    <span style={styles.leaderScore}>{p.score} очк</span>
                  </div>
                );
              })}
            </div>

            <div style={styles.waitingNextPill}>
              <Sparkles size={16} color="#34D399" />
              <span>Приготовьтесь к следующему вопросу!</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mode: FINISHED (Podium & Final Summary) */}
      {mode === 'finished' && (
        <motion.div
          key="finished_mode"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.contentColumn}
        >
          <div style={styles.finishCard}>
            <div style={styles.trophyWrapper}>
              <Trophy size={54} color="#F59E0B" />
            </div>

            <h2 style={styles.finishTitle}>Викторина завершена!</h2>
            <p style={styles.finishSub}>
              Ты отлично справился и помог классу вырастить Древо Мудрости!
            </p>

            <div style={styles.finishStatsGrid}>
              <div style={styles.finishStatBox}>
                <span style={styles.finishStatLabel}>Всего набрано</span>
                <span style={styles.finishStatValue}>{totalScore} очков</span>
              </div>
              <div style={styles.finishStatBox}>
                <span style={styles.finishStatLabel}>Лучший стрик</span>
                <span style={{ ...styles.finishStatValue, color: '#FF7A00' }}>
                  {streak} подряд 🔥
                </span>
              </div>
            </div>

            {/* Class Grove Energy contribution */}
            <div style={styles.groveFinishPill}>
              <Sprout size={18} color="#34D399" />
              <span>Вклад в Рощу: +15% к здоровью класса</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <TactileButton
                onClick={() => onGameFinished(finishData)}
                theme="green"
                size="lg"
                fullWidth
              >
                Вернуться в класс
              </TactileButton>
            </div>
          </div>
        </motion.div>
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
  pinBadge: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 8,
    padding: '5px 12px',
  },
  scorePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: '5px 12px',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 800,
  },
  streakInline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    color: '#FF7A00',
    marginLeft: 4,
  },
  contentColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    width: '100%',
  },
  statusPlate: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  statusIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: '0 0 6px 0',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    margin: 0,
    fontWeight: 600,
  },
  mascotWaitCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  speechBubble: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#CBD5E1',
    lineHeight: 1.4,
    width: '100%',
    boxSizing: 'border-box',
  },
  mascotImgWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px 0',
  },
  mascotImg: {
    width: 140,
    height: 140,
    objectFit: 'contain',
  },
  resultsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '18px 16px',
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
  distList: {
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
  },
  distSymbolBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#E2E8F0',
    fontWeight: 700,
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
  distCountText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 700,
  },
  distBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease',
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
  waitingNextPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '12px',
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 700,
  },
  leaderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  leaderRow: {
    display: 'flex',
    alignItems: 'center',
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
  finishCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: '28px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
  },
  trophyWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  finishTitle: {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
  },
  finishSub: {
    fontSize: 13.5,
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.4,
  },
  finishStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    width: '100%',
    margin: '10px 0',
  },
  finishStatBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  finishStatLabel: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: 700,
  },
  finishStatValue: {
    fontSize: 17,
    fontWeight: 900,
    color: '#34D399',
  },
  groveFinishPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#34D399',
    width: '100%',
    boxSizing: 'border-box',
    justifyContent: 'center',
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
    fontSize: 96,
    fontWeight: 900,
    color: '#F59E0B',
    lineHeight: 1,
    marginBottom: 12,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
  },
};
