import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Send,
  Users,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { colors, spacing, borderRadius, shadows, transitions } from '../theme/tokens';

export interface QuestionAnalyticsItem {
  id: number;
  questionNumber: number;
  topic: string;
  text: string;
  correctPercentage: number;
  kesCode: string;
  totalAnswers: number;
  correctAnswers: number;
  commonMistake?: string;
}

export interface TeacherGapReportProps {
  quizTitle?: string;
  topic?: string;
  grade?: number;
  totalStudents?: number;
  questions?: QuestionAnalyticsItem[];
  onSendReviewTasks?: (topics: string[]) => void;
}

const DEFAULT_QUESTIONS: QuestionAnalyticsItem[] = [
  {
    id: 1,
    questionNumber: 1,
    topic: 'Обыкновенные дроби: понятие',
    text: 'Что показывает числитель обыкновенной дроби?',
    correctPercentage: 92,
    kesCode: '1.2.1',
    totalAnswers: 26,
    correctAnswers: 24,
  },
  {
    id: 2,
    questionNumber: 2,
    topic: 'Правильные и неправильные дроби',
    text: 'Какая из представленных дробей является правильной?',
    correctPercentage: 85,
    kesCode: '1.2.2',
    totalAnswers: 26,
    correctAnswers: 22,
  },
  {
    id: 3,
    questionNumber: 3,
    topic: 'Основное свойство дроби',
    text: 'Сократите дробь 18/24 до несократимого вида',
    correctPercentage: 73,
    kesCode: '1.2.3',
    totalAnswers: 26,
    correctAnswers: 19,
  },
  {
    id: 4,
    questionNumber: 4,
    topic: 'Приведение к общему знаменателю',
    text: 'Найдите наименьший общий знаменатель для 5/12 и 7/18',
    correctPercentage: 42,
    kesCode: '1.2.4',
    totalAnswers: 26,
    correctAnswers: 11,
    commonMistake: 'Частая ошибка: перемножение знаменателей (216 вместо 36)',
  },
  {
    id: 5,
    questionNumber: 5,
    topic: 'Сложение с одинаковыми знаменателями',
    text: 'Вычислите сумму дробей: 3/11 + 5/11',
    correctPercentage: 96,
    kesCode: '1.2.5',
    totalAnswers: 26,
    correctAnswers: 25,
  },
  {
    id: 6,
    questionNumber: 6,
    topic: 'Сложение с разными знаменателями',
    text: 'Вычислите результат сложения: 1/4 + 2/5',
    correctPercentage: 62,
    kesCode: '1.2.5',
    totalAnswers: 26,
    correctAnswers: 16,
    commonMistake: 'Сложение числителей и знаменателей на рубеже',
  },
  {
    id: 7,
    questionNumber: 7,
    topic: 'Вычитание смешанных чисел',
    text: 'Вычислите разность: 3 1/3 − 1 5/6',
    correctPercentage: 38,
    kesCode: '1.2.6',
    totalAnswers: 26,
    correctAnswers: 10,
    commonMistake: 'Затруднение при заёме единицы из целой части',
  },
  {
    id: 8,
    questionNumber: 8,
    topic: 'Умножение обыкновенных дробей',
    text: 'Найдите произведение дробей: 3/8 × 4/9',
    correctPercentage: 69,
    kesCode: '1.2.7',
    totalAnswers: 26,
    correctAnswers: 18,
  },
  {
    id: 9,
    questionNumber: 9,
    topic: 'Деление обыкновенных дробей',
    text: 'Вычислите результат деления: 5/6 ÷ 2/3',
    correctPercentage: 46,
    kesCode: '1.2.8',
    totalAnswers: 26,
    correctAnswers: 12,
    commonMistake: 'Забыли перевернуть вторую дробь при умножении',
  },
  {
    id: 10,
    questionNumber: 10,
    topic: 'Текстовая задача на части от целого',
    text: 'В книге 120 страниц. Маша прочитала 3/4. Сколько страниц осталось?',
    correctPercentage: 58,
    kesCode: '1.2.9',
    totalAnswers: 26,
    correctAnswers: 15,
  },
];

export default function TeacherGapReport({
  quizTitle = 'Обыкновенные дроби: итоговый контроль',
  topic = 'ФРП ООО «Математика» 5 класс',
  grade = 5,
  totalStudents = 26,
  questions = DEFAULT_QUESTIONS,
  onSendReviewTasks,
}: TeacherGapReportProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'weak'>('all');

  const avgScore = Math.round(
    questions.reduce((sum, q) => sum + q.correctPercentage, 0) / questions.length
  );

  const weakQuestions = questions.filter((q) => q.correctPercentage < 50);
  const weakCount = weakQuestions.length;

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 70) return colors.emeraldGreen;
    if (percentage >= 50) return colors.foxOrange;
    return colors.answerRed;
  };

  const displayedQuestions =
    filterMode === 'weak' ? weakQuestions : questions;

  const handleSendTasks = () => {
    setIsSent(true);
    const weakTopicsList = weakQuestions.map((q) => q.topic);
    if (onSendReviewTasks) {
      onSendReviewTasks(weakTopicsList);
    }
    setTimeout(() => {
      setIsSent(false);
    }, 4000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerWrapper}>
        {/* Navigation & Header */}
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>Отчёт по викторине</h1>
          <p style={styles.subtitle}>
            {quizTitle}, {topic} ({grade} класс)
          </p>
        </header>

        {/* Mascot Insight Banner */}
        <div style={styles.insightBanner}>
          <img
            src="/assets/mascot/sprint_thinking.png"
            alt="Спринт"
            style={styles.mascotSmall}
          />
          <div style={styles.insightText}>
            <span style={styles.insightTitle}>Диагностика Спринта:</span>
            <span style={styles.insightDesc}>
              Класс отлично освоил базовые понятия (92-96%), но возникли трудности при приведении к
              общему знаменателю и вычитании смешанных чисел.
            </span>
          </div>
        </div>

        {/* Summary Cards Row */}
        <div style={styles.summaryRow}>
          {/* Card 1: Participants */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryIconWrapper}>
              <Users size={18} color={colors.textSecondary} />
            </div>
            <div style={styles.summaryLabel}>Участников</div>
            <div style={{ ...styles.summaryValue, color: colors.textPrimary }}>
              {totalStudents}
            </div>
          </div>

          {/* Card 2: Average Score */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryIconWrapper}>
              <Award size={18} color={getScoreColor(avgScore)} />
            </div>
            <div style={styles.summaryLabel}>Средний балл</div>
            <div style={{ ...styles.summaryValue, color: getScoreColor(avgScore) }}>
              {avgScore}%
            </div>
          </div>

          {/* Card 3: Weak Topics */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryIconWrapper}>
              <AlertCircle size={18} color={colors.answerRed} />
            </div>
            <div style={styles.summaryLabel}>Слабых тем</div>
            <div style={{ ...styles.summaryValue, color: colors.answerRed }}>
              {weakCount}
            </div>
          </div>
        </div>

        {/* Bar Chart Section */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Результаты по вопросам</h2>
              <p style={styles.sectionSubtitle}>
                Успеваемость по каждому из 10 заданий викторины
              </p>
            </div>

            {/* Filter Toggle */}
            <div style={styles.filterPills}>
              <button
                onClick={() => setFilterMode('all')}
                style={{
                  ...styles.filterPill,
                  backgroundColor: filterMode === 'all' ? colors.foxOrange : 'transparent',
                  color: filterMode === 'all' ? '#FFFFFF' : colors.textSecondary,
                }}
              >
                Все (10)
              </button>
              <button
                onClick={() => setFilterMode('weak')}
                style={{
                  ...styles.filterPill,
                  backgroundColor: filterMode === 'weak' ? colors.answerRed : 'transparent',
                  color: filterMode === 'weak' ? '#FFFFFF' : colors.textSecondary,
                }}
              >
                Слабые ({weakCount})
              </button>
            </div>
          </div>

          {/* Bars List */}
          <div style={styles.barsContainer}>
            {displayedQuestions.map((q, index) => {
              const isWeak = q.correctPercentage < 50;
              const barColor = getScoreColor(q.correctPercentage);
              const isExpanded = selectedQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  style={{
                    ...styles.barItem,
                    borderColor: isWeak ? 'rgba(239, 68, 68, 0.25)' : colors.cardBorder,
                  }}
                  onClick={() => setSelectedQuestionId(isExpanded ? null : q.id)}
                >
                  <div style={styles.barItemHeader}>
                    <div style={styles.questionMeta}>
                      <span style={styles.questionBadge}>№{q.questionNumber}</span>
                      <span style={styles.questionTopic}>{q.topic}</span>
                      <span style={styles.kesBadge}>КЭС {q.kesCode}</span>
                    </div>

                    <div style={styles.barRightMeta}>
                      {isWeak && (
                        <span style={styles.warningTag} title="Результат ниже 50%">
                          <AlertTriangle size={14} color={colors.answerRed} />
                          <span style={styles.warningText}>Внимание</span>
                        </span>
                      )}
                      <span style={{ ...styles.percentageValue, color: barColor }}>
                        {q.correctPercentage}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} color={colors.textSecondary} />
                      ) : (
                        <ChevronDown size={16} color={colors.textSecondary} />
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar Visual */}
                  <div style={styles.barTrack}>
                    <motion.div
                      style={{
                        ...styles.barFill,
                        backgroundColor: barColor,
                        boxShadow: `0 0 10px ${barColor}40`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${q.correctPercentage}%` }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                    />
                  </div>

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={styles.expandedContent}
                      >
                        <div style={styles.expandedQuestionText}>
                          <strong>Текст вопроса:</strong> {q.text}
                        </div>
                        <div style={styles.expandedStatsRow}>
                          <span>
                            Правильных ответов: <strong>{q.correctAnswers}</strong> из {q.totalAnswers}
                          </span>
                          {q.commonMistake && (
                            <div style={styles.mistakeBox}>
                              <AlertTriangle size={14} color={colors.answerRed} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                              {q.commonMistake}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weak Topics Section at Bottom */}
        <section style={styles.weakTopicsCard}>
          <div style={styles.weakTopicsHeader}>
            <div style={styles.alertIconCircle}>
              <BookOpen size={20} color={colors.answerRed} />
            </div>
            <div>
              <h2 style={styles.weakTopicsTitle}>Слабые темы для отработки</h2>
              <p style={styles.weakTopicsSubtitle}>
                Темы, усвоенные менее чем на 50% учеников класса
              </p>
            </div>
          </div>

          <div style={styles.weakTopicsList}>
            {weakQuestions.map((item) => (
              <div key={item.id} style={styles.weakTopicItem}>
                <div style={styles.weakTopicInfo}>
                  <div style={styles.weakTopicTitle}>{item.topic}</div>
                  <div style={styles.weakTopicSub}>
                    Код ФРП: <strong>{item.kesCode}</strong>, результат класса:{' '}
                    <span style={{ color: colors.answerRed, fontWeight: 700 }}>
                      {item.correctPercentage}%
                    </span>
                  </div>
                </div>
                <div style={styles.gapTag}>Пробел в знаниях</div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div style={styles.actionContainer}>
            <motion.button
              onClick={handleSendTasks}
              style={{
                ...styles.sendButton,
                backgroundColor: isSent ? colors.emeraldGreen : colors.emeraldGreen,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSent ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Материалы отправлены в чат класса!</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Отправить задания для повторения</span>
                </>
              )}
            </motion.button>
            <p style={styles.actionHint}>
              Сформирует карточки микро-обучения и отправит в учебный чат Сферума
            </p>
          </div>
        </section>
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
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: `${spacing.md}px ${spacing.md}px 92px`,
    boxSizing: 'border-box',
    color: colors.textPrimary,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 600,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginBottom: 4,
    zIndex: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  insightBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.card,
  },
  mascotSmall: {
    width: 52,
    height: 52,
    objectFit: 'contain',
    flexShrink: 0,
  },
  insightText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.foxOrange,
  },
  insightDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 1.4,
  },
  summaryRow: {
    display: 'flex',
    gap: spacing.md,
    width: '100%',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 4,
    boxShadow: shadows.card,
  },
  summaryIconWrapper: {
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  sectionCard: {
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterPills: {
    display: 'flex',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.pill,
    padding: 3,
    gap: 2,
  },
  filterPill: {
    border: 'none',
    borderRadius: borderRadius.pill,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: transitions.fast,
  },
  barsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  barItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid',
    borderRadius: borderRadius.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    cursor: 'pointer',
    transition: transitions.fast,
  },
  barItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
  },
  questionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  questionBadge: {
    fontWeight: 700,
    color: colors.textPrimary,
  },
  questionTopic: {
    color: colors.textSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    maxWidth: 200,
  },
  kesBadge: {
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: '2px 6px',
    borderRadius: borderRadius.sm,
    color: colors.textMuted,
  },
  barRightMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  warningTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: '2px 6px',
    borderRadius: borderRadius.pill,
  },
  warningText: {
    fontSize: 11,
    color: colors.answerRed,
    fontWeight: 600,
  },
  percentageValue: {
    fontWeight: 800,
    fontSize: 14,
    minWidth: 42,
    textAlign: 'right',
  },
  barTrack: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.pill,
  },
  expandedContent: {
    overflow: 'hidden',
    paddingTop: spacing.xs,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  expandedQuestionText: {
    color: colors.textPrimary,
    lineHeight: 1.4,
  },
  expandedStatsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
  },
  mistakeBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: colors.answerRed,
    padding: '6px 10px',
    borderRadius: borderRadius.sm,
    fontSize: 12,
  },
  weakTopicsCard: {
    backgroundColor: colors.cardSurface,
    border: `1px solid rgba(239, 68, 68, 0.3)`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  weakTopicsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  weakTopicsTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: colors.textPrimary,
  },
  weakTopicsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weakTopicsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  weakTopicItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderLeft: `3px solid ${colors.answerRed}`,
  },
  weakTopicInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  weakTopicTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  weakTopicSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  gapTag: {
    fontSize: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: colors.answerRed,
    padding: '3px 8px',
    borderRadius: borderRadius.pill,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  actionContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sendButton: {
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: borderRadius.md,
    border: 'none',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    boxShadow: shadows.glow(colors.emeraldGreen),
    transition: transitions.normal,
  },
  actionHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    margin: 0,
  },
};
