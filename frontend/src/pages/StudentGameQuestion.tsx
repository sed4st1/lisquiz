import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CheckCircle } from 'lucide-react';
import { shadows } from '../theme/tokens';
import AnswerButton from '../components/AnswerButton';
import CountdownTimer from '../components/CountdownTimer';
import { haptics } from '../services/haptics';
import type { QuizOption } from '../types/quiz';

export interface StudentGameQuestionProps {
  questionNumber?: number;
  totalQuestions?: number;
  questionText?: string;
  latex?: string;
  options?: QuizOption[];
  correctOptionId?: string;
  timeLimitSec?: number;
  score?: number;
  streak?: number;
  onAnswer?: (isCorrect: boolean) => void;
  onAnswerSubmit?: (optionId: string, isCorrect: boolean, responseTimeMs: number) => void;
  onTimeUp?: () => void;
}

const DEFAULT_OPTIONS: QuizOption[] = [
  {
    id: 'opt_1',
    text: '',
    latex: '\\frac{5}{4}',
    color: 'red',
    shape: 'triangle',
  },
  {
    id: 'opt_2',
    text: '',
    latex: '\\frac{4}{6}',
    color: 'blue',
    shape: 'diamond',
  },
  {
    id: 'opt_3',
    text: '',
    latex: '\\frac{3}{8}',
    color: 'yellow',
    shape: 'circle',
  },
  {
    id: 'opt_4',
    text: '',
    latex: '\\frac{7}{4}',
    color: 'green',
    shape: 'square',
  },
];

export default function StudentGameQuestion({
  questionNumber = 3,
  totalQuestions = 10,
  questionText = 'Чему равно значение выражения?',
  latex = '\\frac{3}{4} + \\frac{1}{2}',
  options = DEFAULT_OPTIONS,
  correctOptionId = 'opt_1',
  timeLimitSec = 10,
  score = 1450,
  streak = 2,
  onAnswer,
  onAnswerSubmit,
  onTimeUp,
}: StudentGameQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());

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
      }, 500);
    }
  };

  // Handle countdown complete
  const handleCountdownEnd = () => {
    setIsRevealed(true);
    onTimeUp?.();
  };

  const hasAnswered = selectedOptionId !== null;

  return (
    <div style={styles.container}>
      {/* Top HUD: Question index, Score, Streak, Countdown */}
      <div style={styles.topHud}>
        <div style={styles.hudLeft}>
          <div style={styles.questionBadge}>
            Вопрос {questionNumber} / {totalQuestions}
          </div>
          <div style={styles.statsBadgesRow}>
            {streak > 0 && (
              <div style={styles.statPillOrange}>
                <img src="/assets/icons/flame.png" alt="Серия" style={{ width: 14, height: 14 }} />
                <span>x{streak}</span>
              </div>
            )}
            <div style={styles.statPillGreen}>
              <img src="/assets/icons/crystal.png" alt="Очки" style={{ width: 14, height: 14 }} />
              <span>{score}</span>
            </div>
          </div>
        </div>

        <div style={styles.hudRight}>
          <CountdownTimer
            totalSeconds={timeLimitSec}
            onComplete={handleCountdownEnd}
            isPaused={hasAnswered && !isRevealed}
            size={50}
          />
        </div>
      </div>

      {/* Main Question Board */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={styles.questionBoard}
      >
        <h2 style={styles.questionText}>{questionText}</h2>

        {questionLatexHtml && (
          <div
            style={styles.latexCard}
            dangerouslySetInnerHTML={{ __html: questionLatexHtml }}
          />
        )}
      </motion.div>

      {/* Mascot Sprint encouraging the student */}
      <div style={styles.mascotPeek}>
        <img
          src="/assets/mascot/wave.png"
          alt="Спринт подсказывает"
          style={styles.mascotImg}
        />
        <div style={styles.mascotSpeech}>
          Думай и выбирай! Ты справишься 🦊💚
        </div>
      </div>

      {/* Answer Buttons 2x2 Grid */}
      <div style={styles.answersContainer}>
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

        {/* Answer Status Toast */}
        <AnimatePresence>
          {hasAnswered && !isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={styles.statusToast}
            >
              <CheckCircle size={16} color="#10B981" />
              <span>Ответ зафиксирован! Ждём класс...</span>
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
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px 20px',
    boxSizing: 'border-box',
  },
  topHud: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22, 32, 53, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    padding: '8px 14px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: shadows.card,
  },
  hudLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  questionBadge: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    letterSpacing: '-0.2px',
  },
  statsBadgesRow: {
    display: 'flex',
    gap: 6,
  },
  statPillOrange: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    border: '1px solid rgba(255, 122, 0, 0.35)',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#FF7A00',
  },
  statPillGreen: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#10B981',
  },
  hudRight: {
    display: 'flex',
    alignItems: 'center',
  },
  questionBoard: {
    flex: 1,
    minHeight: 180,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 32, 53, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: '20px 16px',
    textAlign: 'center',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
    gap: 12,
  },
  questionText: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.35,
    color: '#FFFFFF',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  latexCard: {
    fontSize: 26,
    color: '#FFFFFF',
    padding: '10px 20px',
    backgroundColor: 'rgba(13, 20, 36, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
  },
  mascotPeek: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '4px 6px',
  },
  mascotImg: {
    width: 40,
    height: 40,
    objectFit: 'contain',
  },
  mascotSpeech: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: '6px 12px',
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: 600,
  },
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    width: '100%',
  },
  statusToast: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(22, 32, 53, 0.95)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#10B981',
  },
};
