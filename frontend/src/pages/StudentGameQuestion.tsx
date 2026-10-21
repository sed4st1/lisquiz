import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Flame, Trophy, CheckCircle } from 'lucide-react';
import { colors, spacing, borderRadius, shadows } from '../theme/tokens';
import AnswerButton from '../components/AnswerButton';
import CountdownTimer from '../components/CountdownTimer';
import { hapticImpact } from '../services/maxBridge';
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '85vh',
    padding: `${spacing.md}px 0`,
    boxSizing: 'border-box',
    color: colors.textPrimary,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: `${spacing.sm + 2}px ${spacing.md}px`,
    boxShadow: shadows.card,
  },
  questionProgress: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  questionNumberText: {
    fontSize: 16,
    fontWeight: 800,
    color: colors.textPrimary,
    letterSpacing: '-0.3px',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  streakBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    color: colors.foxOrange,
    fontWeight: 700,
  },
  scoreBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    color: colors.textMuted,
  },
  questionArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.xl}px ${spacing.md}px`,
    textAlign: 'center',
    gap: spacing.md,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.35,
    color: '#FFFFFF',
    margin: 0,
    maxWidth: 520,
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  latexContainer: {
    fontSize: 28,
    color: '#FFFFFF',
    padding: `${spacing.md}px ${spacing.lg}px`,
    backgroundColor: 'rgba(22, 32, 53, 0.75)',
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    margin: '4px 0',
  },
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
    width: '100%',
    boxSizing: 'border-box',
  },
  statusNotice: {
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm + 2}px ${spacing.md}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
};

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
    hapticImpact(isCorrect ? 'medium' : 'heavy');

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
      {/* Top Bar with Question Progress, Score, Streak, and Countdown */}
      <div style={styles.topBar}>
        <div style={styles.questionProgress}>
          <span style={styles.questionNumberText}>
            Вопрос {questionNumber} из {totalQuestions}
          </span>
          <div style={styles.statsRow}>
            {streak > 0 && (
              <span style={styles.streakBadge} title="Текущая серия правильных ответов">
                <Flame size={14} fill={colors.foxOrange} />
                <span>{streak} подряд</span>
              </span>
            )}
            <span style={styles.scoreBadge}>
              <Trophy size={13} />
              <span>{score} очков</span>
            </span>
          </div>
        </div>

        <CountdownTimer
          totalSeconds={timeLimitSec}
          onComplete={handleCountdownEnd}
          isPaused={hasAnswered && !isRevealed}
          size={52}
        />
      </div>

      {/* Center Question Area */}
      <motion.div
        style={styles.questionArea}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 style={styles.questionTitle}>{questionText}</h2>

        {questionLatexHtml && (
          <div
            style={styles.latexContainer}
            dangerouslySetInnerHTML={{ __html: questionLatexHtml }}
          />
        )}
      </motion.div>

      {/* Answer Buttons Section (2x2 Grid) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
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

        {/* Selected Confirmation Notice */}
        <AnimatePresence>
          {hasAnswered && !isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={styles.statusNotice}
            >
              <CheckCircle size={16} color={colors.emeraldGreen} />
              <span>Ответ принят! Ждём остальных участников...</span>
            </motion.div>
          )}

          {isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                ...styles.statusNotice,
                color: selectedOptionId === correctOptionId ? colors.emeraldGreen : colors.answerRed,
              }}
            >
              {selectedOptionId === correctOptionId ? (
                <>
                  <CheckCircle size={16} color={colors.emeraldGreen} />
                  <span>Верно! Отличная работа!</span>
                </>
              ) : (
                <>
                  <span>Правильный ответ выделен зелёным</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
