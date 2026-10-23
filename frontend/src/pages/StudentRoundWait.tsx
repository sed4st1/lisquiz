import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Trophy,
  BarChart2,
  Clock,
  Heart,
} from 'lucide-react';
import { socketService } from '../services/socketService';
import { haptics } from '../services/haptics';

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
  onGameFinished: () => void;
}

type StudentRoundMode = 'waiting' | 'results' | 'leaderboard';

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
  const [countdown, setCountdown] = useState<number | null>(null);

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

    const handleGameFinished = () => {
      if (!isMounted) return;
      haptics.notification('success');
      onGameFinished();
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
  }, [onNextQuestion, onGameFinished]);

  const isCorrect = personalResult?.is_correct ?? true;
  const points = personalResult?.points_awarded ?? 550;
  const streak = personalResult?.streak ?? 1;
  const totalScore = personalResult?.total_score ?? points;

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
                backgroundColor: isCorrect ? '#065F46' : '#7F1D1D',
              }}
            >
              {isCorrect ? (
                <CheckCircle2 size={32} color="#34D399" />
              ) : (
                <Heart size={30} color="#F87171" />
              )}
            </div>

            <h2 style={styles.statusTitle}>
              {isCorrect ? 'Ответ зафиксирован!' : 'Ответ принят!'}
            </h2>
            <p style={styles.statusSubtitle}>
              {isCorrect
                ? `Отличная работа! +${points} очков в копилку`
                : 'Не расстраивайся, разберём правильный ответ!'}
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
              <span>Учитель переходит к таблице лидеров...</span>
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
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 6px 0',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    margin: 0,
    lineHeight: 1.4,
  },
  mascotWaitCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  speechBubble: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    gap: 8,
    fontSize: 13,
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
