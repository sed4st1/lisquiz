import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronLeft, Calculator, Sparkles, Users } from 'lucide-react';
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
      }, 600);
    }
  };

  const hasAnswered = selectedOptionId !== null;

  return (
    <div style={styles.container}>
      {/* Top Header: Back, Lisquiz logo, Grade, Player count */}
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
            <span style={{ fontSize: 16 }}>🌱</span>
          </div>

          <div style={styles.headerTitles}>
            <span style={styles.brandTitle}>Lisquiz</span>
            <span style={styles.brandSub}>
              Викторина • {classNameTitle} • {subjectTitle}
            </span>
          </div>
        </div>

        <div style={styles.playerCountPill}>
          <Users size={14} color="#9CA3AF" />
          <span>28 / 30</span>
        </div>
      </header>

      {/* Segmented Progress Bar */}
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

      {/* Question Number Pill & Glowing Circular Timer */}
      <div style={styles.timerRow}>
        <div style={styles.questionNumPill}>
          <Sparkles size={14} color="#34D399" />
          <span>Вопрос {questionNumber} из {totalQuestions}</span>
        </div>

        {/* Circular Countdown Timer */}
        <div style={styles.circularTimerWrapper}>
          <svg viewBox="0 0 54 54" style={styles.timerSvg}>
            <circle
              cx="27"
              cy="27"
              r="23"
              fill="rgba(13, 20, 36, 0.75)"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="4"
            />
            <circle
              cx="27"
              cy="27"
              r="23"
              fill="transparent"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeDasharray={144.5}
              strokeDashoffset={144.5 * (1 - timeLeft / timeLimitSec)}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 6px #F59E0B)',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.8s ease',
              }}
            />
          </svg>
          <span style={styles.timerText}>{timeLeft}</span>
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={styles.questionCard}
      >
        <div style={styles.categoryBadge}>
          <div style={styles.categoryIconCircle}>
            <Calculator size={14} color="#60A5FA" />
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
      </motion.div>

      {/* Middle Glade with Fox Sprint */}
      <div style={styles.mascotGladeArea}>
        <img
          src="/assets/mascot/fox_glade_clean.png"
          alt="Спринт в лесу"
          style={styles.gladeImage}
        />

        {/* Speech Bubble */}
        <AnimatePresence>
          {!hasAnswered && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.speechBubble}
            >
              Думай и выбирай! 💚
            </motion.div>
          )}

          {hasAnswered && selectedOptionId === correctOptionId && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ ...styles.speechBubble, borderColor: '#10B981', color: '#10B981' }}
            >
              Ура! В точку! 🎉
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2x2 Answer Buttons Grid */}
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
    background: "url('/assets/backgrounds/student_game_bg.png') center top / cover no-repeat",
    padding: '12px 14px 14px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.1,
  },
  brandSub: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  playerCountPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: '#E5E7EB',
  },
  segmentedProgressRow: {
    display: 'flex',
    gap: 5,
    width: '100%',
    margin: '4px 0 8px',
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    margin: '2px 0 6px',
  },
  questionNumPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 32, 53, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#E5E7EB',
  },
  circularTimerWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSvg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
    zIndex: 1,
  },
  questionCard: {
    position: 'relative',
    zIndex: 3,
    backgroundColor: 'rgba(14, 30, 58, 0.94)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: 24,
    padding: '14px 16px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: -8,
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  categoryIconCircle: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#93C5FD',
  },
  questionHeading: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.3,
  },
  latexBox: {
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  mascotGladeArea: {
    position: 'relative',
    width: '100%',
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gladeImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 16,
  },
  speechBubble: {
    position: 'absolute',
    bottom: 8,
    right: 14,
    backgroundColor: 'rgba(13, 20, 36, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 12,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#E5E7EB',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    width: '100%',
    zIndex: 3,
  },
};
