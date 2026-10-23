import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronLeft, Users, Flame } from 'lucide-react';
import AnswerButton from '../components/AnswerButton';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';
import type { QuizOption } from '../types/quiz';

export interface StudentGameQuestionProps {
  questionNumber?: number;
  totalQuestions?: number;
  subjectTitle?: string;
  classNameTitle?: string;
  questionText?: string;
  latex?: string;
  options?: QuizOption[];
  correctOptionId?: string;
  timeLimitSec?: number;
  tier?: number;
  is_boss?: boolean;
  answeredCount?: number;
  totalStudents?: number;
  onAnswer?: (isCorrect: boolean) => void;
  onAnswerSubmit?: (optionId: string, isCorrect: boolean, responseTimeMs: number, tabBlurred: boolean) => void;
  onTimeUp?: () => void;
  onBack?: () => void;
  onGameFinished?: () => void;
}

const DEFAULT_OPTIONS: QuizOption[] = [
  {
    id: 'opt_1',
    text: '5/6',
    color: 'red',
    shape: 'triangle',
  },
  {
    id: 'opt_2',
    text: '3/9',
    color: 'blue',
    shape: 'diamond',
  },
  {
    id: 'opt_3',
    text: '7/6',
    color: 'yellow',
    shape: 'circle',
  },
  {
    id: 'opt_4',
    text: '1/2',
    color: 'green',
    shape: 'square',
  },
];

export default function StudentGameQuestion({
  questionNumber = 1,
  totalQuestions = 3,
  subjectTitle = 'Математика',
  classNameTitle = '7А',
  questionText = 'Какой результат получится при сложении дробей 2/3 и 1/6?',
  latex,
  options = DEFAULT_OPTIONS,
  correctOptionId = 'opt_1',
  timeLimitSec,
  tier = 2,
  is_boss = false,
  answeredCount = 0,
  totalStudents = 0,
  onAnswer,
  onAnswerSubmit,
  onTimeUp,
  onBack,
  onGameFinished,
}: StudentGameQuestionProps) {
  const isBossQuestion = Boolean(is_boss || tier === 3);
  const initialTimeLimit = isBossQuestion ? 40 : (timeLimitSec || (tier === 1 ? 15 : 25));

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLimit);
  const [liveAnswered, setLiveAnswered] = useState<number>(answeredCount);
  const [liveTotal, setLiveTotal] = useState<number>(totalStudents);

  const startTimeRef = useRef<number>(Date.now());
  const hasBlurredRef = useRef<boolean>(false);

  // Sync props to live state
  useEffect(() => {
    setLiveAnswered(answeredCount);
  }, [answeredCount]);

  useEffect(() => {
    setLiveTotal(totalStudents);
  }, [totalStudents]);

  // Real-time socket events for live player progress and game finish
  useEffect(() => {
    const handleAnswerCollected = (data: any) => {
      if (typeof data.answered_count === 'number') {
        setLiveAnswered(data.answered_count);
      }
      if (typeof data.total_players === 'number') {
        setLiveTotal(data.total_players);
      }
    };

    const handleFinished = () => {
      haptics.notification('success');
      onGameFinished?.();
    };

    socketService.on('ANSWER_COLLECTED', handleAnswerCollected);
    socketService.on('GAME_FINISHED', handleFinished);

    return () => {
      socketService.off('ANSWER_COLLECTED', handleAnswerCollected);
      socketService.off('GAME_FINISHED', handleFinished);
    };
  }, [onGameFinished]);

  // Silent anti-cheat: track window blur / tab switch silently without warning student
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hasBlurredRef.current = true;
      }
    };
    const handleBlur = () => {
      hasBlurredRef.current = true;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (selectedOptionId !== null || isRevealed) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRevealed(true);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedOptionId, isRevealed, onTimeUp]);

  // Render question LaTeX if provided
  const questionLatexHtml = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
      return null;
    }
  }, [latex]);

  // Handle student selecting an answer
  const handleSelectOption = (optionId: string) => {
    if (selectedOptionId !== null || isRevealed) return;

    const responseTimeMs = Date.now() - startTimeRef.current;
    const isCorrect = optionId === correctOptionId;
    const tabBlurred = hasBlurredRef.current;

    setSelectedOptionId(optionId);
    haptics.impact('medium');

    if (onAnswerSubmit) {
      onAnswerSubmit(optionId, isCorrect, responseTimeMs, tabBlurred);
    } else if (onAnswer) {
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 700);
    }
  };

  const hasAnswered = selectedOptionId !== null;

  // Mascot sprite determination
  const mascotSprite = hasAnswered
    ? '/assets/mascot/sprint_thinking.png'
    : '/assets/mascot/sprint_idle.png';

  return (
    <div style={styles.container}>
      {/* Top Header: Back, Sprout badge, Title, Student count */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={onBack}
            style={styles.backBtn}
            title="Назад"
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </button>

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
              Викторина, {classNameTitle}, {subjectTitle}
            </span>
          </div>
        </div>

        {/* Live Online Players Count Pill */}
        <div style={styles.playerCountPill}>
          <Users size={14} color="#D1D5DB" />
          <span>
            {liveAnswered > 0
              ? `${liveAnswered} из ${liveTotal > 0 ? liveTotal : 1}`
              : liveTotal > 0
              ? `${liveTotal} онлайн`
              : '1 онлайн'}
          </span>
        </div>
      </header>

      {/* Progress Section: Counter text directly above glowing dashes */}
      <div style={styles.progressSection}>
        <div style={styles.progressMetaRow}>
          <span style={styles.progressCounterText}>
            Вопрос {questionNumber} из {totalQuestions}
          </span>

          {isBossQuestion && (
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

        {/* Dynamic Segmented Glowing Progress Dashes */}
        <div style={styles.segmentedProgressRow}>
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((seg) => {
            const isFilled = seg <= questionNumber;
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

      {/* Question Card with Timer Notch Cutout */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        style={styles.questionCardWrapper}
      >
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
                isBossQuestion
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
                filter:
                  timeLeft <= (isBossQuestion ? 8 : 3)
                    ? 'drop-shadow(0 0 8px #EF4444)'
                    : isBossQuestion
                    ? 'drop-shadow(0 0 8px #F97316)'
                    : 'drop-shadow(0 0 8px #F59E0B)',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
              }}
            />
          </svg>
          <span
            style={{
              ...styles.timerText,
              color: (isBossQuestion && timeLeft <= 8) || timeLeft <= 3 ? '#EF4444' : '#FFFFFF',
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
            <span style={styles.categoryText}>{subjectTitle}</span>
          </div>

          <h2 style={styles.questionHeading}>{questionText}</h2>

          {questionLatexHtml && (
            <div
              style={styles.latexBox}
              dangerouslySetInnerHTML={{ __html: questionLatexHtml }}
            />
          )}
        </div>
      </motion.div>

      {/* 2x2 Tactile Answer Buttons Grid (Immediately below Question Card) */}
      <div style={styles.answersGrid}>
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          let isCorrect: boolean | null = null;

          if (isRevealed) {
            isCorrect = option.id === correctOptionId;
          }

          return (
            <AnswerButton
              key={option.id}
              color={option.color}
              shape={option.shape}
              text={option.text}
              latex={option.latex}
              isSelected={isSelected}
              isCorrect={isCorrect}
              disabled={hasAnswered}
              onClick={() => handleSelectOption(option.id)}
            />
          );
        })}
      </div>

      {/* Bottom Forest Glade: Sprint Grounded at Bottom Peeking Out */}
      <div style={styles.bottomMascotArea}>
        <motion.div
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 3.2,
            ease: 'easeInOut',
          }}
          style={styles.groundedSprintWrapper}
        >
          <img
            src={mascotSprite}
            alt="Спринт"
            style={styles.groundedMascotImg}
          />
        </motion.div>

        {/* Speech Bubble */}
        <AnimatePresence>
          {!hasAnswered && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 24 }}
              style={styles.speechBubble}
            >
              Думай и выбирай!
            </motion.div>
          )}

          {hasAnswered && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 24 }}
              style={{
                ...styles.speechBubble,
                borderColor: 'rgba(59, 130, 246, 0.6)',
                color: '#93C5FD',
              }}
            >
              Ответ принят! Ждём результат...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
    padding: '12px 14px 16px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
    gap: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 4,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
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
  segmentedProgressRow: {
    display: 'flex',
    gap: 5,
    width: '100%',
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
  questionCardWrapper: {
    position: 'relative',
    width: '100%',
    marginTop: 2,
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
    marginTop: 2,
  },
  bottomMascotArea: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 10,
    marginTop: 4,
    height: 90,
    paddingLeft: 4,
    zIndex: 2,
  },
  groundedSprintWrapper: {
    width: 80,
    height: 90,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groundedMascotImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'bottom center',
    filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.6))',
  },
  speechBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    border: '1.5px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 16,
    padding: '7px 13px',
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: 800,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
    whiteSpace: 'nowrap',
    marginBottom: 16,
  },
};
