import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Crown,
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  Target,
  ArrowRight,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';

export interface StudentQuizFinishProps {
  playerId?: string;
  playerName: string;
  playerAvatar: string;
  topPlayers?: Array<{
    rank: number;
    id: string;
    name: string;
    avatar: string;
    score: number;
    streak?: number;
  }>;
  myScore?: number;
  myRank?: number;
  correctCount?: number;
  wrongCount?: number;
  totalQuestions?: number;
  onGoToLeaderboard: (earnedPoints?: number, rank?: number) => void;
}

const AVATAR_MAP: Record<string, string> = {
  bear: '/assets/avatars/students/bear.png',
  bunny: '/assets/avatars/students/bunny.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  squirrel: '/assets/avatars/students/squirrel.png',
  fox_smart: '/assets/avatars/students/raccoon.png',
};

export default function StudentQuizFinish({
  playerId,
  playerName,
  playerAvatar,
  topPlayers = [],
  myScore = 850,
  myRank: myRankProp,
  correctCount = 3,
  wrongCount = 0,
  totalQuestions = 3,
  onGoToLeaderboard,
}: StudentQuizFinishProps) {
  const [autoExitSeconds, setAutoExitSeconds] = React.useState(10);

  useEffect(() => {
    // Немедленно разрываем связь с завершенной комнатой, чтобы ученик не висел в сети
    socketService.disconnect();

    const exitTimer = setInterval(() => {
      setAutoExitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(exitTimer);
          onGoToLeaderboard(myScore, myRankProp);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(exitTimer);
  }, [myScore, myRankProp, onGoToLeaderboard]);

  useEffect(() => {
    haptics.notification('success');
    // Multi-stage confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#34D399', '#FBBF24', '#60A5FA', '#F472B6'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#F59E0B', '#10B981'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3B82F6', '#10B981'],
        });
      }, 350);
    } catch {
      // ignore
    }
  }, []);

  const getAvatarSrc = (avatar?: string) => {
    return AVATAR_MAP[avatar || ''] || AVATAR_MAP[playerAvatar] || AVATAR_MAP.raccoon;
  };

  // Determine top 3 or fallback
  const resolvedTopPlayers = topPlayers.length > 0
    ? topPlayers
    : [
        { rank: 1, id: playerId || 'me', name: playerName, avatar: playerAvatar, score: myScore },
      ];

  const top1 = resolvedTopPlayers[0];
  const top2 = resolvedTopPlayers[1];
  const top3 = resolvedTopPlayers[2];

  const isMe = (p?: { id?: string; name?: string }) => {
    if (!p) return false;
    if (playerId && p.id === playerId) return true;
    return p.name?.trim().toLowerCase() === playerName?.trim().toLowerCase();
  };

  // Точный расчет реального места ученика
  const myRank = myRankProp ?? (() => {
    const found = resolvedTopPlayers.find(
      (p) =>
        (playerId && p.id === playerId) ||
        (p.name && p.name.trim().toLowerCase() === playerName.trim().toLowerCase()) ||
        p.id === 'me'
    );
    if (found && typeof found.rank === 'number') return found.rank;
    const higherScoreCount = resolvedTopPlayers.filter((p) => (p.score || 0) > myScore).length;
    return higherScoreCount + 1;
  })();

  const wrongCountResolved = Math.max(wrongCount || 0, totalQuestions - correctCount);
  const accuracy = totalQuestions > 0 ? Math.round(((correctCount || 0) / totalQuestions) * 100) : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.header}
      >
        <div style={styles.headerTitleRow}>
          <Sparkles size={20} color="#FBBF24" />
          <h1 style={styles.headerTitle}>Викторина завершена!</h1>
          <Sparkles size={20} color="#FBBF24" />
        </div>
        <p style={styles.headerSub}>Отличная работа всего класса в Роще знаний!</p>
      </motion.div>

      {/* Podium Top-3 (Identical styling to StudentLeaderboard) */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 24, delay: 0.1 }}
        style={styles.podiumWrapper}
      >
        <div style={styles.podiumContainer}>
          {/* 2nd Place */}
          {top2 && (
            <div style={styles.podiumColumn}>
              <div style={styles.podiumAvatarEmerald}>
                <img
                  src={getAvatarSrc(top2.avatar)}
                  alt={top2.name}
                  style={styles.avatarImg}
                />
              </div>
              <span style={{ ...styles.podiumName, ...(isMe(top2) ? { color: '#6EE7B7', fontWeight: 900 } : {}) }}>
                {top2.name}{isMe(top2) && ' (Ты)'}
              </span>
              <span style={styles.podiumScore}>{top2.score} б</span>
              <div style={{ ...styles.podiumBlock, ...styles.podiumSilver, height: 65 }}>
                <span style={styles.podiumMedal}>🥈 2</span>
              </div>
            </div>
          )}

          {/* 1st Place MVP with Crown */}
          {top1 && (
            <div style={styles.podiumColumn}>
              <Crown size={22} color="#F59E0B" style={{ marginBottom: 2 }} />
              <div style={styles.podiumAvatarGold}>
                <img
                  src={getAvatarSrc(top1.avatar)}
                  alt={top1.name}
                  style={styles.avatarImg}
                />
              </div>
              <span style={{ ...styles.podiumName, fontWeight: 900, color: '#FCD34D' }}>
                {top1.name}{isMe(top1) && ' (Ты)'}
              </span>
              <span style={{ ...styles.podiumScore, color: '#FBBF24' }}>
                {top1.score} б
              </span>
              <div style={{ ...styles.podiumBlock, ...styles.podiumGold, height: 90 }}>
                <span style={{ ...styles.podiumMedal, fontSize: 13.5 }}>👑 1</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3 && (
            <div style={styles.podiumColumn}>
              <div style={styles.podiumAvatarEmerald}>
                <img
                  src={getAvatarSrc(top3.avatar)}
                  alt={top3.name}
                  style={styles.avatarImg}
                />
              </div>
              <span style={{ ...styles.podiumName, color: '#34D399', fontWeight: 800, ...(isMe(top3) ? { color: '#6EE7B7', fontWeight: 900 } : {}) }}>
                {top3.name}{isMe(top3) && ' (Ты)'}
              </span>
              <span style={styles.podiumScore}>{top3.score} б</span>
              <div style={{ ...styles.podiumBlock, ...styles.podiumBronze, height: 50 }}>
                <span style={styles.podiumMedal}>🥉 3</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Personal Result Summary Card */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={styles.personalCard}
      >
        <div style={styles.personalCardTop}>
          <div
            style={{
              ...styles.myRankCircle,
              ...(myRank === 1
                ? { backgroundColor: '#78350F', borderColor: '#FCD34D', color: '#FCD34D' }
                : myRank === 2
                ? { backgroundColor: '#1E293B', borderColor: '#CBD5E1', color: '#E2E8F0' }
                : myRank === 3
                ? { backgroundColor: '#854D0E', borderColor: '#F59E0B', color: '#FCD34D' }
                : { backgroundColor: '#064E3B', borderColor: '#34D399', color: '#34D399' }),
            }}
          >
            #{myRank}
          </div>
          <div style={styles.personalInfoCol}>
            <span style={styles.personalTitle}>Твой результат</span>
            <span style={styles.personalSub}>
              {myRank === 1
                ? '👑 Потрясающе! 1-е место в викторине!'
                : myRank <= 3
                ? `🎉 Отлично! ${myRank}-е место в топе призёров!`
                : `👍 ${myRank}-е место. Хорошая командная игра!`}
            </span>
          </div>
          <div style={styles.scorePill}>
            <Trophy size={14} color="#FBBF24" />
            <span>{myScore} б</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statIconRow}>
              <CheckCircle2 size={15} color="#34D399" />
              <span style={styles.statLabel}>Верных</span>
            </div>
            <span style={{ ...styles.statVal, color: '#34D399' }}>
              {correctCount} из {totalQuestions}
            </span>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statIconRow}>
              <XCircle size={15} color={wrongCountResolved > 0 ? '#EF4444' : '#94A3B8'} />
              <span style={styles.statLabel}>Ошибок</span>
            </div>
            <span style={{ ...styles.statVal, color: wrongCountResolved > 0 ? '#EF4444' : '#E2E8F0' }}>
              {wrongCountResolved}
            </span>
          </div>

          <div style={styles.statBox}>
            <div style={styles.statIconRow}>
              <Target size={15} color="#60A5FA" />
              <span style={styles.statLabel}>Точность</span>
            </div>
            <span style={{ ...styles.statVal, color: '#60A5FA' }}>
              {accuracy}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Exit Button: Directly to class leaderboard */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={styles.actionArea}
      >
        <TactileButton
          theme="orange"
          size="lg"
          fullWidth
          onClick={() => {
            haptics.impact('medium');
            onGoToLeaderboard(myScore, myRank);
          }}
          iconAfter={<ArrowRight size={18} />}
        >
          {autoExitSeconds > 0 ? `Перейти в рейтинг класса (${autoExitSeconds}с)` : 'Перейти в рейтинг класса'}
        </TactileButton>
        <span style={styles.actionHint}>
          {autoExitSeconds > 0 ? `Автоматический переход в класс через ${autoExitSeconds}с` : 'Завершение...'}
        </span>
      </motion.div>
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
    padding: '16px 14px 24px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    gap: 14,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  headerSub: {
    fontSize: 12,
    color: '#CBD5E1',
    margin: '3px 0 0',
    fontWeight: 600,
  },
  podiumWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: 'rgba(14, 30, 58, 0.88)',
    border: '1.5px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 22,
    padding: '14px 10px 10px',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
  },
  podiumContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  podiumColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: 96,
  },
  podiumAvatarEmerald: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: '#064E3B',
    border: '2px solid #34D399',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  },
  podiumAvatarGold: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    backgroundColor: '#78350F',
    border: '2.5px solid #FCD34D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
    boxShadow: '0 0 16px rgba(251, 191, 36, 0.5)',
  },
  avatarImg: {
    width: '88%',
    height: '88%',
    objectFit: 'contain',
  },
  podiumName: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: 700,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 82,
  },
  podiumScore: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#E2E8F0',
    marginBottom: 5,
  },
  podiumBlock: {
    width: '100%',
    borderRadius: '12px 12px 4px 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.2)',
  },
  podiumGold: {
    backgroundColor: '#B45309',
    borderTop: '2px solid #FCD34D',
  },
  podiumSilver: {
    backgroundColor: '#334155',
    borderTop: '2px solid #CBD5E1',
  },
  podiumBronze: {
    backgroundColor: '#854D0E',
    borderTop: '2px solid #F59E0B',
  },
  podiumMedal: {
    fontSize: 12.5,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  personalCard: {
    backgroundColor: 'rgba(14, 30, 58, 0.92)',
    border: '1.5px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 22,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    backdropFilter: 'blur(16px)',
  },
  personalCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  myRankCircle: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#064E3B',
    border: '2px solid #34D399',
    color: '#34D399',
    fontSize: 15,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 10px rgba(52, 211, 153, 0.4)',
  },
  personalInfoCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  personalTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  personalSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: 600,
  },
  scorePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    borderRadius: 999,
    padding: '5px 10px',
    color: '#FBBF24',
    fontSize: 12.5,
    fontWeight: 800,
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  statBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  statIconRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 700,
  },
  statVal: {
    fontSize: 13,
    fontWeight: 900,
  },
  actionArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  actionHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 600,
    textAlign: 'center',
  },
};
