import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Save,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SavedQuiz, QuizQuestion } from '../services/quizStorage';
import { TactileButton } from './TactileButton';
import { haptics } from '../services/haptics';

export interface QuizQuestionEditorModalProps {
  quiz: SavedQuiz;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuiz: SavedQuiz) => void;
}

const OPTION_THEMES = [
  { symbol: '▲', color: '#EF4444', label: 'Красный ▲' },
  { symbol: '◆', color: '#3B82F6', label: 'Синий ◆' },
  { symbol: '●', color: '#F59E0B', label: 'Желтый ●' },
  { symbol: '■', color: '#10B981', label: 'Зеленый ■' },
];

export default function QuizQuestionEditorModal({
  quiz,
  isOpen,
  onClose,
  onSave,
}: QuizQuestionEditorModalProps) {
  const [title, setTitle] = useState(quiz.title);
  const [groupLabel, setGroupLabel] = useState(quiz.group_label || 'Основной');
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    quiz.questions.map((q) => ({
      ...q,
      options: q.options.map((opt) => ({ ...opt })),
    }))
  );
  const [activeQIndex, setActiveQIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentQ = questions[activeQIndex] || questions[0];

  const handleSetCorrectOption = (optId: number) => {
    haptics.selection();
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[activeQIndex] };
      q.options = q.options.map((opt) => ({
        ...opt,
        is_correct: opt.id === optId,
      }));
      next[activeQIndex] = q;
      return next;
    });
  };

  const handleUpdateQuestionText = (text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[activeQIndex] = { ...next[activeQIndex], text };
      return next;
    });
  };

  const handleUpdateOptionText = (optId: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[activeQIndex] };
      q.options = q.options.map((opt) => (opt.id === optId ? { ...opt, text } : opt));
      next[activeQIndex] = q;
      return next;
    });
  };

  const handleDeleteCurrentQuestion = () => {
    if (questions.length <= 1) return;
    haptics.notification('warning');
    setQuestions((prev) => prev.filter((_, idx) => idx !== activeQIndex));
    setActiveQIndex((prev) => Math.max(0, prev - 1));
  };

  const handleAddQuestion = () => {
    haptics.notification('success');
    const newId = questions.length + 1;
    const newQ: QuizQuestion = {
      id: newId,
      text: '',
      time_limit_sec: 20,
      tier: 1,
      is_boss: false,
      topic: quiz.topic,
      options: [
        { id: 0, text: '', is_correct: true, symbol: 'triangle', color: 'red' },
        { id: 1, text: '', is_correct: false, symbol: 'diamond', color: 'blue' },
        { id: 2, text: '', is_correct: false, symbol: 'circle', color: 'yellow' },
        { id: 3, text: '', is_correct: false, symbol: 'square', color: 'green' },
      ],
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveQIndex(questions.length);
  };

  const handleSaveAndApply = () => {
    haptics.notification('success');
    const updated: SavedQuiz = {
      ...quiz,
      title: title.trim() || quiz.title,
      group_label: groupLabel.trim() || 'Основной',
      questions: questions.map((q, idx) => ({ ...q, id: idx + 1 })),
      updated_at: new Date().toISOString(),
    };
    onSave(updated);
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <div style={styles.headerBadge}>
              <Sparkles size={14} color="#F59E0B" />
              <span>Редактор вопросов</span>
            </div>
            <div style={styles.titleInputsRow}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.titleInput}
                placeholder="Название викторины..."
              />
              <input
                type="text"
                value={groupLabel}
                onChange={(e) => setGroupLabel(e.target.value)}
                style={styles.groupInput}
                placeholder="Вариант 1"
                title="Обозначение группы или варианта"
              />
            </div>
          </div>

          <button onClick={onClose} style={styles.closeBtn} title="Закрыть">
            <X size={18} color="#94A3B8" />
          </button>
        </div>

        {/* Question Selector Tabs */}
        <div style={styles.questionTabsContainer}>
          <div style={styles.tabsScrollRow}>
            {questions.map((q, idx) => {
              const isActive = idx === activeQIndex;
              const hasText = q.text && q.text.trim().length > 0;
              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setActiveQIndex(idx);
                  }}
                  style={{
                    ...styles.tabPill,
                    ...(isActive ? styles.tabPillActive : {}),
                  }}
                >
                  <span style={styles.tabNum}>{idx + 1}</span>
                  {hasText && <span style={styles.tabDot} />}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAddQuestion}
              style={styles.addTabBtn}
              title="Добавить новый вопрос"
            >
              <Plus size={15} color="#38BDF8" />
              <span>Вопрос</span>
            </button>
          </div>
        </div>

        {/* Active Question Workspace (Single screen, no scrolling needed) */}
        <div style={styles.workspace}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeQIndex}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={styles.questionPane}
            >
              {/* Question Subheader */}
              <div style={styles.paneTopRow}>
                <span style={styles.paneCounter}>
                  Вопрос <strong>{activeQIndex + 1}</strong> из {questions.length}
                </span>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentQuestion}
                    style={styles.deleteQuestionBtn}
                    title="Удалить этот вопрос"
                  >
                    <Trash2 size={13} color="#EF4444" />
                    <span>Удалить вопрос</span>
                  </button>
                )}
              </div>

              {/* Question Input */}
              <textarea
                rows={2}
                value={currentQ.text}
                onChange={(e) => handleUpdateQuestionText(e.target.value)}
                style={styles.textarea}
                placeholder="Введите текст вопроса для учеников..."
                autoFocus
              />

              {/* Options Grid (4 neat rows) */}
              <div style={styles.optionsGrid}>
                {currentQ.options.map((opt, optIdx) => {
                  const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
                  const isCorrect = Boolean(opt.is_correct);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSetCorrectOption(opt.id)}
                      style={{
                        ...styles.optionCard,
                        borderColor: isCorrect ? '#10B981' : '#334155',
                        backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.14)' : '#0F172A',
                      }}
                    >
                      <div
                        style={{
                          ...styles.optionSymbolCircle,
                          backgroundColor: `${theme.color}22`,
                          color: theme.color,
                        }}
                      >
                        {theme.symbol}
                      </div>

                      <input
                        type="text"
                        value={opt.text}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateOptionText(opt.id, e.target.value)}
                        style={styles.optionInput}
                        placeholder={`Вариант ответа ${optIdx + 1}...`}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCorrectOption(opt.id);
                        }}
                        style={{
                          ...styles.correctCheckBtn,
                          backgroundColor: isCorrect ? '#065F46' : 'transparent',
                          borderColor: isCorrect ? '#10B981' : '#475569',
                          color: isCorrect ? '#34D399' : '#64748B',
                        }}
                        title={isCorrect ? 'Верный ответ' : 'Сделать верным ответом'}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={14} color="#34D399" />
                            <span>Верный</span>
                          </>
                        ) : (
                          <>
                            <Circle size={14} color="#64748B" />
                            <span>Выбрать</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Prev / Next Question Navigation */}
              <div style={styles.navArrowsRow}>
                <button
                  type="button"
                  disabled={activeQIndex === 0}
                  onClick={() => {
                    haptics.impact('light');
                    setActiveQIndex((prev) => Math.max(0, prev - 1));
                  }}
                  style={{
                    ...styles.navBtn,
                    opacity: activeQIndex === 0 ? 0.4 : 1,
                    cursor: activeQIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Предыдущий</span>
                </button>

                <button
                  type="button"
                  disabled={activeQIndex === questions.length - 1}
                  onClick={() => {
                    haptics.impact('light');
                    setActiveQIndex((prev) => Math.min(questions.length - 1, prev + 1));
                  }}
                  style={{
                    ...styles.navBtn,
                    opacity: activeQIndex === questions.length - 1 ? 0.4 : 1,
                    cursor: activeQIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Следующий</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Отмена
          </button>

          <TactileButton
            theme="green"
            size="md"
            onClick={handleSaveAndApply}
            iconBefore={<Save size={16} />}
          >
            Сохранить викторину
          </TactileButton>
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 14,
    boxSizing: 'border-box',
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: '#0B132B',
    borderRadius: 20,
    border: '1.5px solid #1E293B',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    backgroundColor: '#0F172A',
    borderBottom: '1px solid #1E293B',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  headerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 800,
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  titleInputsRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  titleInput: {
    flex: 2,
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '6px 10px',
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: 700,
    outline: 'none',
  },
  groupInput: {
    width: 120,
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '6px 10px',
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: 700,
    outline: 'none',
  },
  closeBtn: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  questionTabsContainer: {
    padding: '10px 18px',
    backgroundColor: '#091024',
    borderBottom: '1px solid #1E293B',
  },
  tabsScrollRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  tabPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 36,
    height: 34,
    padding: '0 10px',
    borderRadius: 10,
    backgroundColor: '#1E293B',
    border: '1.5px solid #334155',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    color: '#34D399',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
  },
  tabNum: {
    fontWeight: 800,
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  addTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    height: 34,
    padding: '0 10px',
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1.5px dashed rgba(56, 189, 248, 0.4)',
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  workspace: {
    padding: '14px 18px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  questionPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  paneTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paneCounter: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 600,
  },
  deleteQuestionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '3px 6px',
    borderRadius: 6,
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0F172A',
    border: '1.5px solid #334155',
    borderRadius: 12,
    padding: '10px 12px',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.4,
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 10px',
    borderRadius: 12,
    border: '1.5px solid #334155',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  optionSymbolCircle: {
    width: 26,
    height: 26,
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 900,
    flexShrink: 0,
  },
  optionInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: 600,
    outline: 'none',
  },
  correctCheckBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid #475569',
    borderRadius: 8,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  navArrowsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  navBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '5px 10px',
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: 700,
    transition: 'all 0.15s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '12px 18px',
    backgroundColor: '#0F172A',
    borderTop: '1px solid #1E293B',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 14px',
    cursor: 'pointer',
  },
};
