import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, X } from 'lucide-react';
import { shadows } from '../theme/tokens';
import { haptics } from '../services/haptics';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';
import { TactileButton } from '../components/TactileButton';

export interface FeedbackStreakProps {
  isCorrect: boolean;
  points: number;
  streak: number;
  correctAnswer?: string;
  onContinue: () => void;
}

export default function FeedbackStreak({
  isCorrect,
  points,
  streak,
  correctAnswer,
  onContinue,
}: FeedbackStreakProps) {
  const [progress, setProgress] = useState(100);

  // Trigger Juicy confetti and haptics on mount
  useEffect(() => {
    if (isCorrect) {
      haptics.notification('success');
      if (streak > 1) {
        setTimeout(() => haptics.streak(), 220);
      }

      try {
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.52 },
          colors: ['#FF7A00', '#10B981', '#FFD700', '#3B82F6', '#FFFFFF'],
          disableForReducedMotion: true,
        });
      } catch {}
    } else {
      haptics.notification('error');
    }

    const duration = 2800;
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const interval = window.setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, intervalTime);

    const timer = window.setTimeout(() => {
      onContinue();
    }, duration);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [isCorrect, streak, onContinue]);

  const mascotSrc = isCorrect
    ? '/assets/mascot/celebrate.png'
    : '/assets/mascot/thinking.png';

  const overlayBg = isCorrect
    ? 'radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.28) 0%, rgba(13, 19, 34, 0.96) 70%)'
    : 'radial-gradient(circle at 50% 35%, rgba(239, 68, 68, 0.24) 0%, rgba(13, 19, 34, 0.96) 70%)';

  return (
    <div
      style={{
        ...styles.overlay,
        background: overlayBg,
      }}
      onClick={onContinue}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onContinue();
        }
      }}
    >
      <div style={styles.contentContainer} onClick={(e) => e.stopPropagation()}>
        {/* Animated Mascot Spring */}
        <motion.div
          initial={{ y: 90, scale: 0.6, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 480, damping: 17, mass: 0.5 }}
          style={styles.mascotWrapper}
        >
          <img
            src={mascotSrc}
            alt={isCorrect ? 'Спринт празднует' : 'Спринт размышляет'}
            style={{
              ...styles.mascotImage,
              filter: isCorrect
                ? 'drop-shadow(0 0 24px rgba(16, 185, 129, 0.6))'
                : 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))',
            }}
          />
        </motion.div>

        {/* Status Title with icon badge */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.06 }}
          style={styles.titleWrapper}
        >
          <div
            style={{
              ...styles.iconPill,
              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderColor: isCorrect ? '#10B981' : '#EF4444',
            }}
          >
            {isCorrect ? (
              <Check size={22} color="#10B981" strokeWidth={3} />
            ) : (
              <X size={22} color="#EF4444" strokeWidth={3} />
            )}
          </div>

          <h1
            style={{
              ...styles.titleText,
              color: isCorrect ? '#10B981' : '#EF4444',
            }}
          >
            {isCorrect ? 'Верно!' : 'Неверно'}
          </h1>
        </motion.div>

        {/* Score & Points Display */}
        {isCorrect ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 650, damping: 16, mass: 0.35, delay: 0.12 }}
            style={styles.pointsWrapper}
          >
            <span style={{ fontSize: 24, fontWeight: 800, color: '#FF7A00' }}>+</span>
            <JuicyScoreCounter value={points} />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#F3F4F6' }}>очков</span>
          </motion.div>
        ) : (
          <div style={styles.pointsWrapper}>
            <span style={{ fontSize: 18, color: '#9CA3AF', fontWeight: 600 }}>0 очков</span>
          </div>
        )}

        {/* Streak & Medals Row */}
        <AnimatePresence>
          {isCorrect && streak > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.18 }}
              style={styles.streakBadge}
            >
              <img src="/assets/icons/flame.png" alt="Серия" style={{ width: 22, height: 22 }} />
              <span>Серия x{streak}!</span>
              {streak >= 3 && (
                <img src="/assets/icons/star_medal.png" alt="Медаль" style={{ width: 22, height: 22 }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incorrect Answer Explanation */}
        {!isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={styles.incorrectCard}
          >
            <div style={styles.incorrectHeader}>Правильный ответ:</div>
            <div style={styles.correctAnswerText}>
              {correctAnswer || 'Ознакомьтесь с материалом урока'}
            </div>
          </motion.div>
        )}

        {/* Continue Button */}
        <div style={{ width: '100%', marginTop: 8 }}>
          <TactileButton
            theme={isCorrect ? 'green' : 'secondary'}
            size="lg"
            fullWidth
            onClick={onContinue}
            iconAfter={<ArrowRight size={18} />}
          >
            Продолжить
          </TactileButton>
        </div>

        {/* Auto-dismiss progress bar */}
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
              backgroundColor: isCorrect ? '#10B981' : '#9CA3AF',
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
    cursor: 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'default',
  },
  mascotWrapper: {
    marginBottom: 12,
  },
  mascotImage: {
    width: 140,
    height: 140,
    objectFit: 'contain',
    display: 'block',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
  },
  titleText: {
    fontSize: 28,
    fontWeight: 900,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  pointsWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  streakBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 16px',
    backgroundColor: 'rgba(255, 122, 0, 0.18)',
    color: '#FF7A00',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 800,
    border: '1.5px solid #FF7A00',
    boxShadow: '0 0 16px rgba(255, 122, 0, 0.45)',
    marginBottom: 16,
  },
  incorrectCard: {
    width: '100%',
    backgroundColor: 'rgba(22, 32, 53, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    textAlign: 'center',
    boxShadow: shadows.card,
  },
  incorrectHeader: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: 600,
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  progressTrack: {
    width: '75%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.04s linear',
    borderRadius: 999,
  },
};
