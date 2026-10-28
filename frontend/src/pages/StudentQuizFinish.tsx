import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle2, FileEdit, Trophy } from 'lucide-react';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';
import { soundManager } from '../services/soundManager';
import StudentRedemptionModal from '../components/StudentRedemptionModal';

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
  onBackToHome?: () => void;
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

export const getStudentAvatarSrc = (avatar?: string): string => {
  if (avatar && AVATAR_MAP[avatar]) return AVATAR_MAP[avatar]!;
  return AVATAR_MAP.raccoon || '/assets/avatars/students/raccoon.png';
};

export default function StudentQuizFinish({
  playerId,
  playerName = 'Артём К',
  playerAvatar = 'raccoon',
  topPlayers = [],
  myScore = 750,
  myRank: myRankProp,
  correctCount = 4,
  wrongCount = 1,
  totalQuestions = 5,
  onGoToLeaderboard,
  onBackToHome,
}: StudentQuizFinishProps) {
  const [currentScore, setCurrentScore] = useState<number>(myScore);
  const [isRedemptionOpen, setIsRedemptionOpen] = useState<boolean>(false);
  const [redemptionDone, setRedemptionDone] = useState<boolean>(false);
  const [restoredPoints, setRestoredPoints] = useState<number>(0);

  // Animated counters
  const [displayScore, setDisplayScore] = useState<number>(0);
  const [displayTop1, setDisplayTop1] = useState<number>(0);
  const [displayTop2, setDisplayTop2] = useState<number>(0);
  const [displayTop3, setDisplayTop3] = useState<number>(0);

  // Default mock top players if none supplied from server
  const resolvedTop = topPlayers.length >= 3
    ? topPlayers
    : [
        { rank: 1, id: 'p1', name: 'Егор Петров', avatar: 'raccoon', score: 980 },
        { rank: 2, id: 'p2', name: 'София Иванова', avatar: 'owl', score: 920 },
        { rank: 3, id: 'p3', name: 'Максим Соколов', avatar: 'hedgehog', score: 870 },
      ];

  const top1 = resolvedTop[0] || { rank: 1, name: 'Егор Петров', avatar: 'raccoon', score: 980 };
  const top2 = resolvedTop[1] || { rank: 2, name: 'София Иванова', avatar: 'owl', score: 920 };
  const top3 = resolvedTop[2] || { rank: 3, name: 'Максим Соколов', avatar: 'hedgehog', score: 870 };

  const effectiveRank = myRankProp ?? 4;
  const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 80;
  const waterDropsCount = Math.max(40, Math.round(currentScore * 0.16));

  useEffect(() => {
    // Disconnect active socket room upon quiz finish
    socketService.disconnect();

    // Play triumphant victory stinger
    soundManager.playVictory();

    // Fire celebratory confetti on mount
    try {
      haptics.notification('success');
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444'],
      });
    } catch {}

    // Number counting up animation
    const durationMs = 900;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startTime) / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayScore(Math.round(currentScore * ease));
      setDisplayTop1(Math.round(top1.score * ease));
      setDisplayTop2(Math.round(top2.score * ease));
      setDisplayTop3(Math.round(top3.score * ease));
      if (progress >= 1) clearInterval(interval);
    }, 25);

    return () => clearInterval(interval);
  }, [currentScore, top1.score, top2.score, top3.score]);

  const handlePointsRestored = (points: number) => {
    setRestoredPoints(points);
    setRedemptionDone(true);
    setCurrentScore((prev) => prev + points);
    haptics.notification('success');
    soundManager.playCollect();
    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10B981', '#F59E0B'],
      });
    } catch {}
  };

  const isMe = (p?: { id?: string; name?: string }) => {
    if (!p) return false;
    if (playerId && p.id === playerId) return true;
    return p.name?.trim().toLowerCase() === playerName?.trim().toLowerCase();
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            HEADER BAR: Back Button + Hanging Signboard
           ======================================================== */}
        <div style={styles.headerBar}>
          {onBackToHome ? (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                haptics.impact('light');
                onBackToHome();
              }}
              style={styles.roundBackBtn}
              title="Назад"
            >
              <ArrowLeft size={22} color="#4A2E18" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <div style={{ width: 44 }} />
          )}

          <div style={styles.hangingSignWrapper}>
            <img
              src="/assets/leaderboard/sign_itogi.png"
              alt="Итоги викторины"
              style={styles.hangingSignImg}
            />
          </div>

          <div style={{ width: 44 }} />
        </div>

        {/* ========================================================
            PODIUM SCENE: 3 Blocks + Laurel Frames + Standing Fox
           ======================================================== */}
        <div style={styles.podiumStage}>
          {/* Wooden Podium Blocks (1, 2, 3) + Anchored Winners */}
          <motion.div
            initial={{ scaleY: 0.3, x: '-50%', y: 60, opacity: 0 }}
            animate={{ scaleY: 1, x: '-50%', y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.15 }}
            style={styles.podiumBlockWrapper}
          >
            <img
              src="/assets/leaderboard/podium_empty.png"
              alt="Пьедестал"
              style={styles.podiumBlockImg}
            />

            {/* 2nd Place: Silver Laurel Frame + Avatar */}
            <motion.div
              initial={{ scale: 0, x: '-50%', y: -25, opacity: 0 }}
              animate={{ scale: 1, x: '-50%', y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.35 }}
              style={styles.top2Slot}
            >
              <div style={styles.avatarCropCircle}>
                <img
                  src={getStudentAvatarSrc(top2.avatar)}
                  alt={top2.name}
                  style={styles.avatarImg}
                />
              </div>
              <img
                src="/assets/leaderboard/frame_silver.png"
                alt="2 место"
                style={styles.frameImg}
              />
              {/* Tactile Carved Wooden Score Frame */}
              <div style={styles.woodenScoreCapsule}>
                <img
                  src="/assets/leaderboard/acorn_gold.png"
                  alt=""
                  style={styles.capsuleAcornImg}
                />
                <span style={styles.capsuleScoreText}>+{displayTop2}</span>
              </div>
              <span style={styles.studentNameLabel}>
                {top2.name.split(' ')[0]}{isMe(top2) && ' (Ты)'}
              </span>
            </motion.div>

            {/* 1st Place: Gold Laurel Frame + Avatar */}
            <motion.div
              initial={{ scale: 0, x: '-50%', y: -30, opacity: 0 }}
              animate={{ scale: 1, x: '-50%', y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.5 }}
              style={styles.top1Slot}
            >
              <div style={{ ...styles.avatarCropCircle, width: 62, height: 62, top: 8 }}>
                <img
                  src={getStudentAvatarSrc(top1.avatar)}
                  alt={top1.name}
                  style={styles.avatarImg}
                />
              </div>
              <img
                src="/assets/leaderboard/frame_gold.png"
                alt="1 место"
                style={styles.frameImg}
              />
              {/* Tactile Carved Wooden Score Frame */}
              <div style={{ ...styles.woodenScoreCapsule, padding: '3px 10px 3px 6px' }}>
                <img
                  src="/assets/leaderboard/acorn_gold.png"
                  alt=""
                  style={{ width: 15, height: 19, objectFit: 'contain' }}
                />
                <span style={{ ...styles.capsuleScoreText, fontSize: 13.5 }}>
                  +{displayTop1}
                </span>
              </div>
              <span style={{ ...styles.studentNameLabel, fontWeight: 900, color: '#3D2411' }}>
                {top1.name.split(' ')[0]}{isMe(top1) && ' (Ты)'}
              </span>
            </motion.div>

            {/* 3rd Place: Bronze Laurel Frame + Avatar */}
            <motion.div
              initial={{ scale: 0, x: '-50%', y: -25, opacity: 0 }}
              animate={{ scale: 1, x: '-50%', y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.65 }}
              style={styles.top3Slot}
            >
              <div style={styles.avatarCropCircle}>
                <img
                  src={getStudentAvatarSrc(top3.avatar)}
                  alt={top3.name}
                  style={styles.avatarImg}
                />
              </div>
              <img
                src="/assets/leaderboard/frame_bronze.png"
                alt="3 место"
                style={styles.frameImg}
              />
              {/* Tactile Carved Wooden Score Frame */}
              <div style={styles.woodenScoreCapsule}>
                <img
                  src="/assets/leaderboard/acorn_gold.png"
                  alt=""
                  style={styles.capsuleAcornImg}
                />
                <span style={styles.capsuleScoreText}>+{displayTop3}</span>
              </div>
              <span style={styles.studentNameLabel}>
                {top3.name.split(' ')[0]}{isMe(top3) && ' (Ты)'}
              </span>
            </motion.div>
          </motion.div>

          {/* Mascot Sprint with Golden Acorn stepping out from right */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 190, damping: 20, delay: 0.75 }}
            style={styles.mascotHolder}
          >
            <motion.div
              animate={{
                rotate: [0, 1.2, 0, -1, 0],
                scale: [1, 1.018, 1, 1.012, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 4.2,
                ease: 'easeInOut',
              }}
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: 'bottom center',
              }}
            >
              <img
                src="/assets/leaderboard/sprint_with_acorn.png"
                alt="Спринт"
                style={styles.mascotImg}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* ========================================================
            BENTO CARD: "Твой результат" (Rank, Acorns, Accuracy, Drops)
           ======================================================== */}
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.95 }}
          style={styles.bentoCard}
        >
          {/* Left Avatar & Rank Badge */}
          <div style={styles.bentoAvatarCol}>
            <div style={styles.bentoAvatarRing}>
              <img
                src={getStudentAvatarSrc(playerAvatar)}
                alt={playerName}
                style={styles.bentoAvatarImg}
              />
            </div>
            <div style={styles.bentoRankBadge}>
              <span>{effectiveRank} место</span>
            </div>
          </div>

          <div style={styles.bentoDivider} />

          {/* Right 3 Stat Columns */}
          <div style={styles.bentoStatsRow}>
            {/* Stat 1: Acorns / Score */}
            <div style={styles.bentoStatItem}>
              <img
                src="/assets/leaderboard/acorn_gold.png"
                alt="Очки"
                style={styles.bentoStatIcon}
              />
              <span style={styles.bentoStatValue}>+{displayScore}</span>
              <span style={styles.bentoStatLabel}>очков</span>
            </div>

            {/* Stat 2: Accuracy */}
            <div style={styles.bentoStatItem}>
              <div style={styles.checkIconWrapper}>
                <CheckCircle2 size={24} color="#15803D" strokeWidth={2.8} />
              </div>
              <span style={styles.bentoStatLabel}>Точность</span>
              <span style={styles.bentoStatValue}>{accuracyPercent}%</span>
            </div>

            {/* Stat 3: Water Drops for Grove */}
            <div style={styles.bentoStatItem}>
              <img
                src="/assets/leaderboard/water_drop.png"
                alt="Капли"
                style={{ ...styles.bentoStatIcon, width: 22, height: 28 }}
              />
              <span style={styles.bentoStatValue}>+{waterDropsCount}</span>
              <span style={styles.bentoStatLabel}>капель</span>
            </div>
          </div>
        </motion.div>

        {/* Restored Points Notification Badge */}
        {redemptionDone && restoredPoints > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={styles.restoredPointsBanner}
          >
            <span>Ошибки исправлены! Возвращено +{restoredPoints} очков</span>
          </motion.div>
        )}

        {/* ========================================================
            TACTILE ACTION BUTTONS (Redemption & Class Leaderboard)
           ======================================================== */}
        <div style={styles.actionsContainer}>
          {/* Button 1: "Работа над ошибками" (shown if had mistakes) */}
          {wrongCount > 0 && !redemptionDone && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                haptics.impact('medium');
                setIsRedemptionOpen(true);
              }}
              style={styles.amberBtn}
            >
              <FileEdit size={22} color="#854D0E" strokeWidth={2.5} />
              <span>Работа над ошибками</span>
            </motion.button>
          )}

          {/* Button 2: "Рейтинг класса" */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              haptics.notification('success');
              onGoToLeaderboard(currentScore, effectiveRank);
            }}
            style={styles.emeraldBtn}
          >
            <Trophy size={22} color="#FFFFFF" strokeWidth={2.5} />
            <span>Рейтинг класса</span>
          </motion.button>
        </div>

        {/* Redemption Round Modal */}
        <StudentRedemptionModal
          isOpen={isRedemptionOpen}
          onClose={() => setIsRedemptionOpen(false)}
          studentId={playerId || 'std_ivan'}
          basePoints={750}
          onPointsRestored={handlePointsRestored}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#FFF9F0',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    minHeight: '100vh',
    padding: '14px 14px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    justifyContent: 'space-between',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    minHeight: 82,
    marginTop: -18,
    marginBottom: 0,
  },
  roundBackBtn: {
    position: 'absolute',
    left: 0,
    top: 10,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3, 0 4px 10px rgba(120, 80, 40, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  },
  hangingSignWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 86,
  },
  hangingSignImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  podiumStage: {
    position: 'relative',
    width: '100%',
    height: 310,
    marginTop: 6,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  podiumBlockWrapper: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    width: 326,
    aspectRatio: '438 / 275',
    zIndex: 2,
    transformOrigin: 'bottom center',
  },
  podiumBlockImg: {
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
  },
  top1Slot: {
    position: 'absolute',
    bottom: '91%',
    left: '49.7%',
    width: 96,
    height: 82,
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top2Slot: {
    position: 'absolute',
    bottom: '71%',
    left: '16.7%',
    width: 82,
    height: 72,
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top3Slot: {
    position: 'absolute',
    bottom: '65.5%',
    left: '82.2%',
    width: 82,
    height: 72,
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCropCircle: {
    position: 'absolute',
    top: 6,
    width: 52,
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#EBF4FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  frameImg: {
    position: 'relative',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    zIndex: 2,
    pointerEvents: 'none',
  },
  woodenScoreCapsule: {
    position: 'absolute',
    bottom: -6,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'linear-gradient(180deg, #FFE8B8 0%, #F5C775 100%)',
    border: '2px solid #C4823F',
    boxShadow: '0 3px 0 #874C1E, 0 4px 8px rgba(100, 50, 10, 0.25)',
    borderRadius: 999,
    padding: '2px 8px 3px 5px',
    whiteSpace: 'nowrap',
  },
  capsuleAcornImg: {
    width: 14,
    height: 18,
    objectFit: 'contain',
    display: 'block',
  },
  capsuleScoreText: {
    fontSize: 12.5,
    fontWeight: 900,
    color: '#4A2800',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.5)',
  },
  studentNameLabel: {
    position: 'absolute',
    top: -16,
    fontSize: 11.5,
    fontWeight: 800,
    color: '#4A2E18',
    backgroundColor: '#FFFDF9',
    border: '1.5px solid #E5C39E',
    borderRadius: 999,
    padding: '1px 8px',
    boxShadow: '0 2px 0 #D8BEA3',
    whiteSpace: 'nowrap',
    zIndex: 5,
  },
  mascotHolder: {
    position: 'absolute',
    right: -4,
    bottom: 0,
    width: 90,
    height: 130,
    zIndex: 4,
    pointerEvents: 'none',
  },
  mascotImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  bentoCard: {
    width: '100%',
    backgroundColor: '#FFFDF9',
    border: '2.5px solid #E5C39E',
    boxShadow: '0 4px 0 #D8BEA3, 0 8px 18px rgba(130, 80, 30, 0.08)',
    borderRadius: 24,
    padding: '16px 16px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  bentoAvatarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
    width: 72,
  },
  bentoAvatarRing: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#FFE9D4',
    border: '2.5px solid #E5C39E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bentoAvatarImg: {
    width: '90%',
    height: '90%',
    objectFit: 'contain',
  },
  bentoRankBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#6A3C16',
    border: '1.5px solid #8D5422',
    boxShadow: '0 2px 0 #4A280B',
    borderRadius: 999,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 900,
    color: '#FFF8F0',
    whiteSpace: 'nowrap',
  },
  bentoDivider: {
    width: 1.5,
    height: 52,
    backgroundColor: '#EED9C4',
    margin: '0 12px',
  },
  bentoStatsRow: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bentoStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bentoStatIcon: {
    width: 26,
    height: 26,
    objectFit: 'contain',
  },
  checkIconWrapper: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoStatValue: {
    fontSize: 16.5,
    fontWeight: 900,
    color: '#2B1D0C',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  bentoStatLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#7D5A3A',
    lineHeight: 1,
  },
  restoredPointsBanner: {
    width: '100%',
    backgroundColor: '#DCFCE7',
    border: '1.5px solid #86EFAC',
    borderRadius: 14,
    padding: '8px 12px',
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: 800,
    color: '#15803D',
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  amberBtn: {
    width: '100%',
    height: 54,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)',
    border: '2.5px solid #FEF08A',
    boxShadow: '0 5px 0 #A16207, 0 8px 18px rgba(234, 179, 8, 0.3)',
    color: '#713F12',
    fontSize: 16,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    outline: 'none',
  },
  emeraldBtn: {
    width: '100%',
    height: 54,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
    border: '2.5px solid #A7F3D0',
    boxShadow: '0 5px 0 #047857, 0 8px 18px rgba(16, 185, 129, 0.3)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    outline: 'none',
  },
};
