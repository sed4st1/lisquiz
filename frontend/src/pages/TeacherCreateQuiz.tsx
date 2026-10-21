import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { Spinner } from '@maxhub/max-ui';
import { colors, spacing, borderRadius, shadows, transitions } from '../theme/tokens';
import MascotTip from '../components/MascotTip';
import type { Quiz, DifficultyLevel } from '../types/quiz';

export interface TeacherCreateQuizProps {
  onQuizCreated?: (quiz: Quiz) => void;
  onNavigateToLobby?: (quizId?: string) => void;
  onBack?: () => void;
}

const SUBJECT_OPTIONS = [
  'Математика',
  'Русский язык',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'География',
  'Обществознание',
  'Информатика',
  'Литература',
  'Английский язык',
] as const;

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  'Математика': [
    'Обыкновенные дроби: сложение и вычитание',
    'Линейные уравнения с одной переменной',
    'Признаки равенства треугольников',
    'Квадратные уравнения и теорема Виета',
  ],
  'Физика': [
    'Законы Ньютона и сила тяжести',
    'Закон сохранения механической энергии',
    'Давление в жидкостях и газах',
  ],
  'Информатика': [
    'Двоичная система счисления и кодирование',
    'Алгоритмы ветвления и циклов в Python',
    'Основы баз данных и SQL',
  ],
  'Русский язык': [
    'Правописание корней с чередованием',
    'Сложноподчинённые предложения с придаточными цели',
    'Одна и две буквы Н в суффиксах прилагательных',
  ],
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
    padding: `${spacing.md}px 0`,
    boxSizing: 'border-box',
    color: colors.textPrimary,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '-0.5px',
    color: colors.textPrimary,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    margin: 0,
    lineHeight: 1.4,
  },
  card: {
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  select: {
    width: '100%',
    height: 48,
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    padding: `0 ${spacing.md}px`,
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    backgroundSize: '16px',
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    padding: `0 ${spacing.md}px`,
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: transitions.fast,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 44,
    height: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.foxOrange,
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    transition: transitions.fast,
  },
  stepperVal: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  suggestionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  suggestionChip: {
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cardSurfaceHover,
    color: colors.textSecondary,
    border: `1px solid ${colors.cardBorder}`,
    cursor: 'pointer',
    userSelect: 'none',
    transition: transitions.fast,
  },
  uploadBox: {
    border: `2px dashed ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: `${spacing.lg}px ${spacing.md}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    transition: transitions.fast,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  uploadBoxActive: {
    borderColor: colors.foxOrange,
    backgroundColor: colors.foxOrangeLight,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.foxOrangeLight,
    color: colors.foxOrange,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    border: `1px solid ${colors.cardBorder}`,
    backgroundColor: colors.bgSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    boxSizing: 'border-box',
  },
  previewImg: {
    width: 64,
    height: 64,
    objectFit: 'cover',
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  previewInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: transitions.fast,
  },
  createButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.foxOrange,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: borderRadius.lg,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    boxShadow: `0 4px 16px ${colors.foxOrange}4D`,
    transition: transitions.fast,
    userSelect: 'none',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.xxxl}px ${spacing.lg}px`,
    gap: spacing.lg,
    textAlign: 'center',
  },
  loadingMascot: {
    width: 120,
    height: 120,
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 24px rgba(255, 122, 0, 0.35))',
  },
  progressBarContainer: {
    width: '100%',
    maxWidth: 280,
    height: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.foxOrange,
    borderRadius: borderRadius.pill,
  },
};

export default function TeacherCreateQuiz({
  onQuizCreated,
  onNavigateToLobby,
  onBack,
}: TeacherCreateQuizProps) {
  // Form State
  const [subject, setSubject] = useState<string>('Математика');
  const [grade, setGrade] = useState<number>(5);
  const [topic, setTopic] = useState<string>('Сложение и вычитание обыкновенных дробей');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('Анализирую тему ФРП...');
  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null);

  // Handle Photo Selection
  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit and Generate Quiz
  const handleCreate = () => {
    setIsGenerating(true);
    setGenerationStep('Анализирую требования ФРП и кодификатор КЭС...');

    // Progress step simulation
    setTimeout(() => {
      setGenerationStep('Генерирую вопросы с математическими формулами...');
    }, 800);

    setTimeout(() => {
      setGenerationStep('Формирую правдоподобные дистракторы и подсказки...');
    }, 1500);

    // Mock completion after 2.2 seconds
    setTimeout(() => {
      const mockQuiz: Quiz = {
        id: 'quiz-' + Date.now(),
        title: `${subject}: ${topic}`,
        subject,
        grade,
        topic,
        kes_codes: ['1.2.1', '1.2.2', '1.2.4'],
        created_at: new Date().toISOString(),
        created_by: 'Учитель Сферума',
        is_ai_generated: true,
        source_image_url: photoPreview || undefined,
        questions: [
          {
            id: 'q1',
            text: 'Чему равно значение выражения?',
            latex: '\\frac{3}{4} + \\frac{1}{2}',
            type: 'multiple_choice',
            difficulty: 'medium',
            time_limit_sec: 15,
            points: 1000,
            options: [
              { id: 'opt1', text: '', latex: '\\frac{5}{4}', color: 'red', shape: 'triangle' },
              { id: 'opt2', text: '', latex: '\\frac{4}{6}', color: 'blue', shape: 'diamond' },
              { id: 'opt3', text: '', latex: '\\frac{3}{8}', color: 'yellow', shape: 'circle' },
              { id: 'opt4', text: '', latex: '\\frac{7}{4}', color: 'green', shape: 'square' },
            ],
            correct_option_ids: ['opt1'],
          },
          {
            id: 'q2',
            text: 'Какая из дробей является правильной?',
            type: 'multiple_choice',
            difficulty: 'easy',
            time_limit_sec: 12,
            points: 1000,
            options: [
              { id: 'opt2_1', text: '', latex: '\\frac{7}{5}', color: 'red', shape: 'triangle' },
              { id: 'opt2_2', text: '', latex: '\\frac{3}{8}', color: 'blue', shape: 'diamond' },
              { id: 'opt2_3', text: '', latex: '\\frac{9}{9}', color: 'yellow', shape: 'circle' },
              { id: 'opt2_4', text: '', latex: '\\frac{11}{4}', color: 'green', shape: 'square' },
            ],
            correct_option_ids: ['opt2_2'],
          },
        ],
      };

      setIsGenerating(false);
      setCreatedQuiz(mockQuiz);
      onQuizCreated?.(mockQuiz);
    }, 2200);
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={styles.pageTitle}>
            <span>🦊</span>
            <span>Создание викторины</span>
          </h1>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Назад
            </button>
          )}
        </div>
        <p style={styles.pageSubtitle}>
          Генерация проверочной работы по стандартам ФРП за считанные секунды
        </p>
      </div>

      {/* Mascot Tip Bubble */}
      <MascotTip
        pose="thinking"
        text="Выберите тему из рубрикатора ФРП или загрузите фото страницы учебника — я сгенерирую вопросы за 30 секунд!"
        title="Совет от Спринта"
        size={64}
      />

      {/* Generation Loading State */}
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="generating-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ ...styles.card, ...styles.loadingContainer }}
          >
            <motion.img
              src="/assets/mascot/thinking.png"
              alt="Спринт думает"
              style={styles.loadingMascot}
              animate={{
                y: [0, -8, 0],
                rotate: [0, -2, 2, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <Spinner size={24} appearance="themed" />
                <span style={{ fontSize: 18, fontWeight: 700, color: colors.foxOrange }}>
                  ИИ создаёт викторину...
                </span>
              </div>
              <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0, maxWidth: 360 }}>
                {generationStep}
              </p>
            </div>

            <div style={styles.progressBarContainer}>
              <motion.div
                style={styles.progressBarFill}
                initial={{ width: '10%' }}
                animate={{ width: '92%' }}
                transition={{ duration: 2.2, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        ) : createdQuiz ? (
          /* Success Screen */
          <motion.div
            key="success-view"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.card}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <img
                src="/assets/mascot/celebrate.png"
                alt="Успех"
                style={{ width: 72, height: 72, objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.emeraldGreen }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Викторина готова!</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0', color: colors.textPrimary }}>
                  {createdQuiz.title}
                </h3>
                <span style={{ fontSize: 12, color: colors.textMuted }}>
                  {createdQuiz.grade} класс • {questionCount} вопросов по ФРП
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                display: 'flex',
                justifyContent: 'space-around',
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: colors.textMuted, display: 'block' }}>Вопросов</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: colors.foxOrange }}>{questionCount}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: colors.textMuted, display: 'block' }}>Сложность</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: colors.emeraldGreen }}>
                  {difficulty === 'easy' ? 'Базовая' : difficulty === 'medium' ? 'Средняя' : 'Повышенная'}
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: colors.textMuted, display: 'block' }}>Коды КЭС</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: colors.answerBlue }}>3 темы</span>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => onNavigateToLobby?.(createdQuiz.id)}
              style={styles.createButton}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
            >
              <span>🚀 Перейти в лобби и позвать класс</span>
              <ArrowRight size={18} />
            </motion.button>

            <button
              type="button"
              onClick={() => setCreatedQuiz(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textSecondary,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                padding: spacing.xs,
              }}
            >
              🔄 Сгенерировать другие параметры
            </button>
          </motion.div>
        ) : (
          /* Creation Form */
          <motion.div
            key="form-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.card}
          >
            {/* Subject & Grade Row */}
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <BookOpen size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  Предмет
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={styles.select}
                >
                  {SUBJECT_OPTIONS.map((sub) => (
                    <option key={sub} value={sub} style={{ backgroundColor: colors.bgSecondary }}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <GraduationCap size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  Класс
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  style={styles.select}
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i + 1} value={i + 1} style={{ backgroundColor: colors.bgSecondary }}>
                      {i + 1} класс
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topic Input */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Layers size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                Тема урока
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например: Сложение и вычитание обыкновенных дробей"
                style={styles.input}
              />
              {TOPIC_SUGGESTIONS[subject] && (
                <div style={styles.suggestionsList}>
                  {TOPIC_SUGGESTIONS[subject].slice(0, 3).map((item) => (
                    <span
                      key={item}
                      style={styles.suggestionChip}
                      onClick={() => setTopic(item)}
                      title="Кликните, чтобы подставить"
                    >
                      + {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Question Count & Difficulty */}
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <HelpCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  Вопросов
                </label>
                <div style={styles.stepper}>
                  <button
                    type="button"
                    style={styles.stepperBtn}
                    onClick={() => setQuestionCount((c: number) => Math.max(3, c - 1))}
                    disabled={questionCount <= 3}
                  >
                    −
                  </button>
                  <span style={styles.stepperVal}>{questionCount}</span>
                  <button
                    type="button"
                    style={styles.stepperBtn}
                    onClick={() => setQuestionCount((c: number) => Math.min(15, c + 1))}
                    disabled={questionCount >= 15}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <Sliders size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  Уровень
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  style={styles.select}
                >
                  <option value="easy" style={{ backgroundColor: colors.bgSecondary }}>Базовый</option>
                  <option value="medium" style={{ backgroundColor: colors.bgSecondary }}>Средний</option>
                  <option value="hard" style={{ backgroundColor: colors.bgSecondary }}>Продвинутый</option>
                </select>
              </div>
            </div>

            {/* Photo Upload Area */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Источник материалов (фото учебника / доски)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              {photoPreview ? (
                <div style={styles.previewContainer}>
                  <img src={photoPreview} alt="Предпросмотр фото" style={styles.previewImg} />
                  <div style={styles.previewInfo}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                      {photoFile?.name || 'Фото страницы учебника'}
                    </span>
                    <span style={{ fontSize: 11, color: colors.emeraldGreen, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} />
                      ИИ распознает формулы и задания
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={styles.removeBtn}
                    title="Удалить фото"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    ...styles.uploadBox,
                    ...(isDragOver ? styles.uploadBoxActive : {}),
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handlePhotoSelect(file);
                  }}
                >
                  <div style={styles.uploadIconCircle}>
                    <Camera size={24} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                    Загрузить фото учебника или доски
                  </span>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>
                    Нажмите или перетащите файл (JPG, PNG) • ИИ считает формулы и текст
                  </span>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <motion.button
              type="button"
              onClick={handleCreate}
              style={styles.createButton}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
            >
              <Sparkles size={18} />
              <span>✨ Создать викторину с ИИ</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
