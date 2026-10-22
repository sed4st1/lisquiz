import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronLeft, Users, Sparkles } from 'lucide-react';
import AnswerButton from '../components/AnswerButton';
import { haptics } from '../services/haptics';
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
  onAnswer?: (isCorrect: boolean) => void;
  onAnswerSubmit?: (optionId: string, isCorrect: boolean, responseTimeMs: number) => void;
  onTimeUp?: () => void;
  onBack?: () => void;
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
  questionNumber = 3,
  totalQuestions = 10,
  subjectTitle = 'Математика',
  classNameTitle = '7А',
  questionText = 'Какой результат получится при сложении дробей 2/3 и 1/6?',
  latex,
  options = DEFAULT_OPTIONS,
  correctOptionId = 'opt_1',
  timeLimitSec = 10,
  onAnswer,
  onAnswerSubmit,
  onTimeUp,
  onBack,
}: StudentGameQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimitSec);
  const startTimeRef = useRef<number>(Date.now());

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

    setSelectedOptionId(optionId);
    if (isCorrect) {
      haptics.impact('medium');
    } else {
      haptics.notification('error');
    }

    onAnswerSubmit?.(optionId, isCorrect, responseTimeMs);
    if (onAnswer) {
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 700);
    }
  };

  const hasAnswered = selectedOptionId !== null;
  const isCorrectAnswer = selectedOptionId === correctOptionId;

  // Mascot sprite determination
  const mascotSprite = hasAnswered
    ? isCorrectAnswer
      ? '/assets/mascot/sprint_celebrate.png'
      : '/assets/mascot/sprint_thinking.png'
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

        <div style={styles.playerCountPill}>
          <Users size={14} color="#D1D5DB" />
          <span>28 из 30</span>
        </div>
      </header>

      {/* Segmented Glowing Progress Bar */}
      <div style={styles.segmentedProgressRow}>
        {[1, 2, 3, 4].map((seg) => {
          const isFilled = seg <= 2;
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

      {/* Question Number Pill */}
      <div style={styles.timerRow}>
        <div style={styles.questionNumPill}>
          <Sparkles size={14} color="#34D399" />
          <span>Вопрос {questionNumber} из {totalQuestions}</span>
        </div>
      </div>

      {/* Question Card with Timer Notch Cutout */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
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
              stroke={timeLeft <= 3 ? '#EF4444' : '#F59E0B'}
              strokeWidth="3.5"
              strokeDasharray={144.5}
              strokeDashoffset={144.5 * (1 - timeLeft / timeLimitSec)}
              strokeLinecap="round"
              style={{
                filter: timeLeft <= 3 ? 'drop-shadow(0 0 8px #EF4444)' : 'drop-shadow(0 0 8px #F59E0B)',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
              }}
            />
          </svg>
          <span style={styles.timerText}>{timeLeft}</span>
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
            y: [0, -4, 0],
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

          {hasAnswered && isCorrectAnswer && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 24 }}
              style={{
                ...styles.speechBubble,
                borderColor: 'rgba(16, 185, 129, 0.6)',
                color: '#34D399',
              }}
            >
              Верно! Отличная работа!
            </motion.div>
          )}

          {hasAnswered && !isCorrectAnswer && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 24 }}
              style={{
                ...styles.speechBubble,
                borderColor: 'rgba(239, 68, 68, 0.6)',
                color: '#F87171',
              }}
            >
              Почти! В следующий раз получится!
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
    height: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '12px 14px 10px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
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
  segmentedProgressRow: {
    display: 'flex',
    gap: 6,
    width: '100%',
    margin: '4px 0 6px',
    zIndex: 4,
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
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    margin: '2px 0 6px',
    zIndex: 4,
  },
  questionNumPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 25, 45, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 999,
    padding: '5px 14px',
    fontSize: 12.5,
    fontWeight: 700,
    color: '#E5E7EB',
  },
  questionCardWrapper: {
    position: 'relative',
    width: '100%',
    margin: '2px 0 10px',
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
    marginBottom: 6,
  },
  bottomMascotArea: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 12,
    height: 105,
    paddingLeft: 6,
    zIndex: 2,
  },
  groundedSprintWrapper: {
    width: 95,
    height: 105,
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
    padding: '8px 14px',
    color: '#F9FAFB',
    fontSize: 12.5,
    fontWeight: 800,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
    whiteSpace: 'nowrap',
    marginBottom: 20,
  },
};
