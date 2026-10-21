import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, ChevronRight } from 'lucide-react';
import { haptics } from '../services/haptics';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';
import { TactileButton } from '../components/TactileButton';

export interface FeedbackStreakProps {
  isCorrect: boolean;
  points: number;
  streak: number;
  questionNumber?: number;
  totalQuestions?: number;
  correctAnswer?: string;
  onContinue: () => void;
}

export default function FeedbackStreak({
  isCorrect,
  points = 750,
  streak = 3,
  questionNumber = 2,
  totalQuestions = 10,
  correctAnswer,
  onContinue,
}: FeedbackStreakProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isCorrect) {
      haptics.notification('success');
      if (streak > 1) {
        setTimeout(() => haptics.streak(), 200);
      }

      try {
        confetti({
          particleCount: 180,
          spread: 85,
          origin: { y: 0.45 },
          colors: ['#FF7A00', '#10B981', '#FFD700', '#3B82F6', '#FF3366'],
          disableForReducedMotion: true,
        });
      } catch {}
    } else {
      haptics.notification('error');
    }

    const duration = 3000;
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

  return (
    <div style={styles.container}>
      {/* Background with Falling Confetti / Golden Ribbons */}
      <div style={styles.backgroundLayer} />

      {/* Main Content Area */}
      <div style={styles.content}>
        {/* Top Glow Checkmark / Error Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          style={styles.iconCircle}
        >
          {isCorrect ? (
            <Check size={36} color="#FFFFFF" strokeWidth={3.5} />
          ) : (
            <span style={{ fontSize: 32, color: '#FFFFFF', fontWeight: 900 }}>✕</span>
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={styles.title}
        >
          {isCorrect ? 'Верно!' : 'Неверно'}
        </motion.h1>

        {/* Points Display */}
        {isCorrect ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={styles.pointsRow}
          >
            <span style={styles.pointsPlus}>+</span>
            <JuicyScoreCounter value={points} size="lg" />
            <span style={styles.pointsWord}>очков 🔥</span>
          </motion.div>
        ) : (
          <div style={styles.pointsRow}>
            <span style={{ fontSize: 18, color: '#9CA3AF', fontWeight: 700 }}>0 очков</span>
          </div>
        )}

        {/* Streak Pill */}
        <AnimatePresence>
          {isCorrect && streak > 0 && (
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.2 }}
              style={styles.streakPill}
            >
              <span style={{ fontSize: 18 }}>🔥</span>
              <span style={styles.streakText}>Серия x{streak}!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jumping Mascot Sprint in Center */}
        <motion.div
          initial={{ y: 60, scale: 0.6, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.12 }}
          style={styles.mascotArea}
        >
          <img
            src={isCorrect ? '/assets/mascot/celebrate.png' : '/assets/mascot/thinking.png'}
            alt="Спринт"
            style={styles.mascotImg}
          />
        </motion.div>

        {/* Incorrect Answer Card */}
        {!isCorrect && (
          <div style={styles.incorrectCard}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Правильный ответ:</span>
            <span style={{ fontSize: 16, color: '#10B981', fontWeight: 800 }}>
              {correctAnswer || 'Ознакомьтесь с материалом урока'}
            </span>
          </div>
        )}

        {/* Bottom Next Question Card */}
        <div style={styles.nextQuestionCard} onClick={onContinue}>
          <div style={styles.nextQuestionInfo}>
            <span style={styles.nextQuestionLabel}>Следующий вопрос</span>
            <span style={styles.nextQuestionNum}>
              {questionNumber} из {totalQuestions}
            </span>
          </div>
          <ChevronRight size={20} color="#9CA3AF" />
        </div>

        {/* Green "Далее" Action Button */}
        <div style={{ width: '100%', marginTop: 8 }}>
          <TactileButton
            theme={isCorrect ? 'green' : 'secondary'}
            size="lg"
            fullWidth
            onClick={onContinue}
          >
            Далее
          </TactileButton>
        </div>

        {/* Countdown Progress Track */}
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
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
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: "url('/assets/backgrounds/student_game_bg.png') center top / cover no-repeat",
    padding: '20px 16px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  backgroundLayer: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.25) 0%, rgba(11, 19, 43, 0.95) 75%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: '#10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 28px rgba(16, 185, 129, 0.8), 0 4px 12px rgba(0, 0, 0, 0.4)',
    border: '3px solid #FFFFFF',
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: '-0.5px',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
  },
  pointsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pointsPlus: {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFB800',
  },
  pointsWord: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  streakPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 20px',
    background: 'linear-gradient(90deg, #F59E0B 0%, #FF7A00 100%)',
    borderRadius: 999,
    boxShadow: '0 0 20px rgba(255, 122, 0, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
    border: '1.5px solid #FCD34D',
    margin: '4px 0 8px',
  },
  streakText: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: '0.02em',
  },
  mascotArea: {
    margin: '6px 0',
  },
  mascotImg: {
    width: 155,
    height: 155,
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 24px rgba(255, 215, 0, 0.5))',
  },
  incorrectCard: {
    width: '100%',
    backgroundColor: 'rgba(22, 32, 53, 0.92)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  nextQuestionCard: {
    width: '100%',
    backgroundColor: 'rgba(14, 30, 58, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: 20,
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    marginTop: 4,
  },
  nextQuestionInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  nextQuestionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  nextQuestionNum: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  progressTrack: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.04s linear',
  },
};
