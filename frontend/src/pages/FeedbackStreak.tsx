import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Flame, ArrowRight, Check, X } from 'lucide-react';
import { colors, spacing, borderRadius, shadows, transitions } from '../theme/tokens';

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

  // Trigger confetti and auto-dismiss countdown
  useEffect(() => {
    if (isCorrect) {
      try {
        confetti({
          particleCount: 150,
          spread: 75,
          origin: { y: 0.55 },
          colors: [colors.foxOrange, colors.emeraldGreen, '#FFD166', '#FFFFFF', '#06D6A0'],
          disableForReducedMotion: true,
        });
      } catch {
        // Fallback if canvas-confetti fails in headless environments
      }
    }

    const duration = 2500;
    const intervalTime = 50;
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
  }, [isCorrect, onContinue]);

  const mascotSrc = isCorrect
    ? '/assets/mascot/celebrate.png'
    : '/assets/mascot/thinking.png';

  const overlayBg = isCorrect
    ? `radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.18) 0%, ${colors.bgPrimary} 75%)`
    : `radial-gradient(circle at 50% 40%, rgba(239, 68, 68, 0.16) 0%, ${colors.bgPrimary} 75%)`;

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
        {/* Animated Mascot */}
        <motion.div
          initial={{ y: 70, scale: 0.75, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={transitions.springBouncy}
          style={styles.mascotWrapper}
        >
          <img
            src={mascotSrc}
            alt={isCorrect ? 'Спринт празднует' : 'Спринт размышляет'}
            style={{
              ...styles.mascotImage,
              filter: isCorrect
                ? shadows.glow(colors.emeraldGreen)
                : shadows.glow(colors.answerRed),
            }}
          />
        </motion.div>

        {/* Status Text */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.08 }}
          style={styles.titleWrapper}
        >
          <div
            style={{
              ...styles.iconPill,
              backgroundColor: isCorrect ? colors.emeraldGreenLight : 'rgba(239, 68, 68, 0.15)',
              borderColor: isCorrect ? colors.emeraldGreen : colors.answerRed,
            }}
          >
            {isCorrect ? (
              <Check size={20} color={colors.emeraldGreen} strokeWidth={3} />
            ) : (
              <X size={20} color={colors.answerRed} strokeWidth={3} />
            )}
          </div>

          <h1
            style={{
              ...styles.titleText,
              color: isCorrect ? colors.emeraldGreen : colors.answerRed,
            }}
          >
            {isCorrect ? 'Верно!' : 'Неверно'}
          </h1>
        </motion.div>

        {/* Points Display */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            ...styles.pointsText,
            color: isCorrect ? colors.foxOrange : colors.textMuted,
          }}
        >
          {isCorrect ? `+${points} очков` : '0 очков'}
        </motion.div>

        {/* Streak Badge */}
        <AnimatePresence>
          {isCorrect && streak > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22, delay: 0.22 }}
              style={styles.streakBadge}
            >
              <Flame size={18} color={colors.foxOrange} style={{ fill: colors.foxOrange }} />
              <span>Серия x{streak}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incorrect Answer Explanation */}
        {!isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={styles.incorrectCard}
          >
            <div style={styles.incorrectHeader}>Правильный ответ:</div>
            <div style={styles.correctAnswerText}>
              {correctAnswer || 'Ознакомьтесь с материалом урока'}
            </div>
          </motion.div>
        )}

        {/* Continue Button */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onContinue}
          style={{
            ...styles.continueButton,
            backgroundColor: isCorrect ? colors.emeraldGreen : colors.cardSurfaceHover,
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>Продолжить</span>
          <ArrowRight size={18} />
        </motion.button>

        {/* Auto-dismiss progress bar */}
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
              backgroundColor: isCorrect ? colors.emeraldGreen : colors.textMuted,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 1000,
    cursor: 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'default',
  },
  mascotWrapper: {
    marginBottom: spacing.lg,
  },
  mascotImage: {
    width: 150,
    height: 150,
    objectFit: 'contain',
    display: 'block',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.pill,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
  },
  titleText: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  pointsText: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: spacing.md,
  },
  streakBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs}px ${spacing.lg}px`,
    backgroundColor: colors.foxOrangeLight,
    color: colors.foxOrange,
    borderRadius: borderRadius.pill,
    fontSize: 15,
    fontWeight: 700,
    border: `1px solid ${colors.foxOrange}`,
    boxShadow: shadows.glow(colors.foxOrange),
    marginBottom: spacing.lg,
  },
  incorrectCard: {
    width: '100%',
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'left',
    boxShadow: shadows.card,
  },
  incorrectHeader: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: 500,
  },
  correctAnswerText: {
    fontSize: 16,
    color: colors.emeraldGreen,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  continueButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: `${spacing.md}px ${spacing.xl}px`,
    borderRadius: borderRadius.md,
    border: 'none',
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: spacing.md,
    boxShadow: shadows.card,
    transition: transitions.normal,
  },
  progressTrack: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.05s linear',
    borderRadius: borderRadius.pill,
  },
};
