import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { haptics } from '../services/haptics';
import { socketService } from '../services/socketService';
import { soundManager } from '../services/soundManager';
import SoundToggleButton from '../components/SoundToggleButton';
import type { QuizOption } from '../types/quiz';

export interface StudentGameQuestionProps {
  questionNumber?: number;
  totalQuestions?: number;
  subjectTitle?: string;
  classNameTitle?: string;
  questionText?: string;
  latex?: string;
  options?: QuizOption[];
  questions?: any[];
  correctOptionId?: string;
  timeLimitSec?: number;
  tier?: number;
  is_boss?: boolean;
  answeredCount?: number;
  totalStudents?: number;
  onAnswer?: (isCorrect: boolean) => void;
  onAnswerSubmit?: (optionId: string, isCorrect: boolean, responseTimeMs: number, tabBlurred: boolean, questionId?: string | number) => void;
  onTimeUp?: () => void;
  onBack?: () => void;
  onGameFinished?: (data?: any) => void;
}

export interface QuestionItem {
  id: string;
  number: number;
  text: string;
  latex?: string;
  timeLimit: number;
  tier?: number;
  is_boss?: boolean;
  options: {
    id: string;
    text: string;
    color: 'red' | 'blue' | 'yellow' | 'green';
    shape: 'triangle' | 'diamond' | 'circle' | 'square';
    isCorrect?: boolean;
  }[];
}

const DEFAULT_QUIZ_QUESTIONS: QuestionItem[] = [
  {
    id: 'q1',
    number: 1,
    text: 'Чему равна сила тяжести, действующая на тело массой 5 кг?',
    timeLimit: 25,
    options: [
      { id: 'opt_1', text: '49 Н', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: '25 Н', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: '5 Н', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: '50 Н', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q2',
    number: 2,
    text: 'Какая формула выражает второй закон Ньютона?',
    timeLimit: 25,
    options: [
      { id: 'opt_1', text: 'F = m · a', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: 'E = m · c²', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: 'p = m · v', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: 'A = F · s', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q3',
    number: 3,
    text: 'В каких единицах измеряется механическая работа в системе СИ?',
    timeLimit: 20,
    options: [
      { id: 'opt_1', text: 'Ватт (Вт)', color: 'red', shape: 'triangle', isCorrect: false },
      { id: 'opt_2', text: 'Джоуль (Дж)', color: 'blue', shape: 'diamond', isCorrect: true },
      { id: 'opt_3', text: 'Паскаль (Па)', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: 'Ньютон (Н)', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q4',
    number: 4,
    text: 'Какое свойство тел характеризует их инертность?',
    timeLimit: 20,
    options: [
      { id: 'opt_1', text: 'Масса', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: 'Объем', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: 'Плотность', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: 'Скорость', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q5',
    number: 5,
    text: 'Чему равна равнодействующая сил 3 Н и 4 Н, направленных под углом 90°?',
    timeLimit: 25,
    options: [
      { id: 'opt_1', text: '5 Н', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: '7 Н', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: '1 Н', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: '12 Н', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q6',
    number: 6,
    text: 'По какой формуле рассчитывается кинетическая энергия тела?',
    timeLimit: 25,
    options: [
      { id: 'opt_1', text: '(m · v²) / 2', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: 'm · g · h', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: 'F · s', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: 'm · v', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q7',
    number: 7,
    text: 'Какое тело обладает потенциальной энергией?',
    timeLimit: 20,
    options: [
      { id: 'opt_1', text: 'Поднятый камень', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: 'Катящийся мяч', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: 'Летящая стрела', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: 'Текущая вода', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
  {
    id: 'q8',
    number: 8,
    text: 'Кто сформулировал закон всемирного тяготения?',
    timeLimit: 20,
    options: [
      { id: 'opt_1', text: 'Исаак Ньютон', color: 'red', shape: 'triangle', isCorrect: true },
      { id: 'opt_2', text: 'Альберт Эйнштейн', color: 'blue', shape: 'diamond', isCorrect: false },
      { id: 'opt_3', text: 'Галилео Галилей', color: 'yellow', shape: 'circle', isCorrect: false },
      { id: 'opt_4', text: 'Джеймс Джоуль', color: 'green', shape: 'square', isCorrect: false },
    ],
  },
];

export const renderShapeIcon = (shape: 'triangle' | 'diamond' | 'circle' | 'square') => {
  switch (shape) {
    case 'triangle':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}>
          <path
            d="M10.27 4.2a2 2 0 0 1 3.46 0l7.5 13.5A2 2 0 0 1 19.5 20.5H4.5a2 2 0 0 1-1.73-2.8l7.5-13.5Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'diamond':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}>
          <path
            d="M10.59 2.59a2 2 0 0 1 2.82 0l7.5 7.5a2 2 0 0 1 0 2.82l-7.5 7.5a2 2 0 0 1-2.82 0l-7.5-7.5a2 2 0 0 1 0-2.82l7.5-7.5Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'circle':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}>
          <circle cx="12" cy="12" r="9" fill="#FFFFFF" />
        </svg>
      );
    case 'square':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}>
          <rect x="3" y="3" width="18" height="18" rx="4.5" fill="#FFFFFF" />
        </svg>
      );
  }
};

const BUTTON_CONFIGS = {
  red: {
    gradient: 'linear-gradient(180deg, #F87171 0%, #EF4444 100%)',
    border: '#FCA5A5',
    shadow: '0 6px 0 #991B1B, 0 8px 18px rgba(239, 68, 68, 0.28)',
    activeShadow: '0 2px 0 #991B1B',
  },
  blue: {
    gradient: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)',
    border: '#93C5FD',
    shadow: '0 6px 0 #1D4ED8, 0 8px 18px rgba(59, 130, 246, 0.28)',
    activeShadow: '0 2px 0 #1D4ED8',
  },
  yellow: {
    gradient: 'linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)',
    border: '#FDE68A',
    shadow: '0 6px 0 #B45309, 0 8px 18px rgba(245, 158, 11, 0.28)',
    activeShadow: '0 2px 0 #B45309',
  },
  green: {
    gradient: 'linear-gradient(180deg, #4ADE80 0%, #22C55E 100%)',
    border: '#86EFAC',
    shadow: '0 6px 0 #15803D, 0 8px 18px rgba(34, 197, 94, 0.28)',
    activeShadow: '0 2px 0 #15803D',
  },
};

export default function StudentGameQuestion({
  questionNumber,
  totalQuestions,
  questionText,
  latex,
  options,
  questions,
  timeLimitSec,
  tier = 1,
  is_boss = false,
  answeredCount = 0,
  totalStudents = 0,
  onAnswerSubmit,
  onBack,
  onGameFinished,
}: StudentGameQuestionProps) {
  // Normalize dynamic question list if provided, otherwise fallback to single question or demo set
  const activeQuestionsList: QuestionItem[] = (questions && questions.length > 0)
    ? questions.map((q: any, idx: number) => ({
        id: String(q.id ?? `q_${idx + 1}`),
        number: idx + 1,
        text: q.text || '',
        latex: q.latex,
        timeLimit: q.time_limit_sec || q.timeLimit || 25,
        tier: q.tier || tier,
        is_boss: q.is_boss || (idx === questions.length - 1 && is_boss),
        options: (q.options || []).map((opt: any, optIdx: number) => ({
          id: String(opt.id),
          text: opt.text || '',
          color: opt.color || (['red', 'blue', 'yellow', 'green'] as const)[optIdx % 4],
          shape: opt.shape || (['triangle', 'diamond', 'circle', 'square'] as const)[optIdx % 4],
          isCorrect: opt.isCorrect ?? opt.is_correct ?? false,
        })),
      }))
    : (questionText
        ? [{
            id: 'q1',
            number: questionNumber || 1,
            text: questionText,
            latex: latex,
            timeLimit: timeLimitSec || 25,
            tier: tier,
            is_boss: is_boss,
            options: (options || []).map((opt: any, optIdx: number) => ({
              id: String(opt.id),
              text: opt.text,
              color: opt.color || (['red', 'blue', 'yellow', 'green'] as const)[optIdx % 4],
              shape: opt.shape || (['triangle', 'diamond', 'circle', 'square'] as const)[optIdx % 4],
              isCorrect: false,
            })),
          }]
        : DEFAULT_QUIZ_QUESTIONS);

  // In multi-question mode, track current question index
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [isFinishedWaiting, setIsFinishedWaiting] = useState<boolean>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('waiting') === 'true' || p.get('state') === 'waiting') return true;
    } catch {}
    return false;
  });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [liveAnsweredCount, setLiveAnsweredCount] = useState<number>(answeredCount);
  const [liveTotalStudents, setLiveTotalStudents] = useState<number>(totalStudents);
  const [finishPayload, setFinishPayload] = useState<any>(null);

  useEffect(() => {
    if (answeredCount > 0) setLiveAnsweredCount(answeredCount);
  }, [answeredCount]);

  useEffect(() => {
    if (totalStudents > 0) setLiveTotalStudents(totalStudents);
  }, [totalStudents]);

  useEffect(() => {
    let isMounted = true;
    const handleAnswerCollected = (data: any) => {
      if (!isMounted) return;
      if (typeof data.answered_count === 'number') {
        setLiveAnsweredCount(data.answered_count);
      }
      if (typeof data.total_players === 'number') {
        setLiveTotalStudents(data.total_players);
      }
    };

    const handleGameFinished = (data: any) => {
      if (!isMounted) return;
      setFinishPayload(data);
    };

    socketService.on('ANSWER_COLLECTED', handleAnswerCollected);
    socketService.on('GAME_FINISHED', handleGameFinished);

    return () => {
      isMounted = false;
      socketService.off('ANSWER_COLLECTED', handleAnswerCollected);
      socketService.off('GAME_FINISHED', handleGameFinished);
    };
  }, []);

  // Auto-advance to finish screen after receiving GAME_FINISHED
  useEffect(() => {
    if (finishPayload && onGameFinished) {
      const timer = setTimeout(() => {
        haptics.notification('success');
        onGameFinished(finishPayload);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [finishPayload, onGameFinished]);

  // Live timer for current question
  const currentQ = activeQuestionsList[currentQIndex] || activeQuestionsList[0]!;
  const effectiveTotalQ = activeQuestionsList.length || totalQuestions || 1;
  const effectiveCurrentNumber = currentQIndex + 1;

  const activeTimeLimit = currentQ.timeLimit || timeLimitSec || 25;
  const [timeLeft, setTimeLeft] = useState<number>(activeTimeLimit);

  const startTimeRef = useRef<number>(Date.now());
  const hasBlurredRef = useRef<boolean>(false);

  // Track window blur for anti-cheat
  useEffect(() => {
    const onBlur = () => {
      hasBlurredRef.current = true;
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isFinishedWaiting) return;
    setTimeLeft(activeTimeLimit);
    startTimeRef.current = Date.now();
    hasBlurredRef.current = false;
    setSelectedOptionId(null);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        if (prev <= 4) {
          soundManager.playKnock();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQIndex, activeTimeLimit, isFinishedWaiting]);

  // Handle when time runs out on question
  const handleTimeUp = () => {
    if (selectedOptionId) return; // already answered
    handleSelectOption('timeout');
  };

  // Student selects an option
  const handleSelectOption = (optId: string) => {
    if (selectedOptionId) return; // already chosen
    setSelectedOptionId(optId);
    haptics.impact('medium');
    soundManager.playTap();

    const responseTimeMs = Date.now() - startTimeRef.current;
    const isCorrect = Boolean(currentQ.options.find((o) => o.id === optId)?.isCorrect);

    // Call submit callback to transmit via socket
    if (onAnswerSubmit) {
      onAnswerSubmit(optId, isCorrect, responseTimeMs, hasBlurredRef.current, currentQ.id);
    } else if (socketService.isConnected()) {
      socketService.send('SUBMIT_ANSWER', {
        question_id: currentQ.id,
        option_id: optId,
        time_taken_sec: responseTimeMs / 1000,
        tab_blurred: hasBlurredRef.current,
      });
    }

    // Smooth 450ms physical feedback, then advance to next question
    setTimeout(() => {
      if (currentQIndex + 1 < activeQuestionsList.length) {
        soundManager.playKnock();
        setCurrentQIndex((prev) => prev + 1);
      } else {
        // Last question answered! Transition to waiting state
        soundManager.playVictory();
        setIsFinishedWaiting(true);
      }
    }, 450);
  };

  // Determine active question and options
  const displayedText = currentQ.text;
  const displayedLatex = currentQ.latex;
  const displayedOptions = currentQ.options;


  // Render LaTeX if available
  const renderedLatex = displayedLatex
    ? (() => {
        try {
          return katex.renderToString(displayedLatex, { displayMode: true, throwOnError: false });
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            HEADER BAR: Back + Hanging Signboard ("Вопрос 3 из 8")
           ======================================================== */}
        <div style={styles.headerBar}>
          {onBack ? (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                haptics.impact('light');
                onBack();
              }}
              style={styles.roundBackBtn}
              title="Назад"
            >
              <ArrowLeft size={22} color="#4A2E18" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <div style={{ width: 44 }} />
          )}

          <div style={styles.hangingSignWrapper}>
            <img
              src="/assets/classes/v2/sign_wood_blank.png"
              alt="Вывеска"
              style={styles.hangingSignImg}
            />
            <span style={styles.hangingSignText}>
              {isFinishedWaiting
                ? 'Ответы приняты'
                : `Вопрос ${effectiveCurrentNumber} из ${effectiveTotalQ}`}
            </span>
          </div>

          <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <SoundToggleButton variant="round" size={14} />
          </div>
        </div>

        {/* ========================================================
            NORMAL GAMEPLAY MODE: Trail, Question Card, 4 Buttons
           ======================================================== */}
        {!isFinishedWaiting ? (
          <div style={styles.gameContent}>
            {/* 1. SPRINT RUNNING TRAIL & TIMER DISC */}
            <div style={styles.trailRow}>
              {/* Forest running track */}
              <div style={styles.trackWrapper}>
                <img
                  src="/assets/quiz/track_forest.png"
                  alt="Беговая дорожка"
                  style={styles.trackImg}
                />

                {/* Animated Running Fox Sprint - Smooth 60 FPS Linear Glide */}
                <motion.div
                  key={`runner_glide_${currentQIndex}`}
                  initial={{ left: '4%' }}
                  animate={{ left: '74%' }}
                  transition={{
                    duration: activeTimeLimit,
                    ease: 'linear',
                  }}
                  style={styles.sprintRunner}
                >
                  <motion.div
                    animate={{
                      y: [-2.5, 2.5, -2.5],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.26,
                      ease: 'easeInOut',
                    }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <img
                      src="/assets/mascot/sprint_dash_clean.png"
                      alt="Спринт бежит"
                      style={styles.sprintImg}
                    />
                  </motion.div>
                </motion.div>

                {/* Golden glowing acorn at finish */}
                <motion.div
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.6,
                    ease: 'easeInOut',
                  }}
                  style={styles.finishAcorn}
                >
                  <img
                    src="/assets/quiz/target_acorn.png"
                    alt="Финишный жёлудь"
                    style={styles.acornImg}
                  />
                </motion.div>
              </div>

              {/* Wooden tree slice timer disc */}
              <div style={styles.discWrapper}>
                <img
                  src="/assets/quiz/timer_disc.png"
                  alt="Таймер"
                  style={styles.discImg}
                />
                <span
                  style={{
                    ...styles.discText,
                    color: timeLeft <= 5 ? '#DC2626' : '#3D2411',
                  }}
                >
                  {timeLeft}с
                </span>
              </div>
            </div>

            {/* 2. QUESTION CARD (With Boss Tier 3 Animation and visual aura) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`q_card_${effectiveCurrentNumber}`}
                initial={{ opacity: 0, scale: currentQ.is_boss || (currentQ.tier || tier) === 3 ? 0.94 : 1, y: 15 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  boxShadow: (currentQ.is_boss || (currentQ.tier || tier) === 3)
                    ? '0 0 25px rgba(239, 68, 68, 0.35), 0 6px 0 #991B1B, 0 12px 24px rgba(153, 27, 27, 0.2)'
                    : '0 4px 0 #D8BEA3, 0 8px 18px rgba(130, 80, 30, 0.08)',
                }}
                exit={{ opacity: 0, x: -25 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{
                  ...styles.questionCard,
                  borderColor: (currentQ.is_boss || (currentQ.tier || tier) === 3) ? '#EF4444' : '#E5C39E',
                  background: (currentQ.is_boss || (currentQ.tier || tier) === 3)
                    ? 'radial-gradient(circle at 50% 0%, #FFF5F5 0%, #FFFDF9 100%)'
                    : '#FFFDF9',
                }}
              >
                {/* Boss / Tier Badge */}
                {(currentQ.is_boss || (currentQ.tier || tier) === 3) ? (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      color: '#FFFFFF',
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                    }}
                  >
                    <span>🔥</span>
                    <span>Сложный вопрос · БОСС (х2 очков)</span>
                  </motion.div>
                ) : (currentQ.tier || tier) === 2 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#FEF3C7',
                      color: '#B45309',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <span>⚡</span>
                    <span>Уровень 2 · Практика</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#ECFDF5',
                      color: '#047857',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <span>🌱</span>
                    <span>Уровень 1 · Базовый</span>
                  </div>
                )}

                <div style={styles.questionText}>{displayedText}</div>

                {renderedLatex && (
                  <div
                    style={styles.latexContainer}
                    dangerouslySetInnerHTML={{ __html: renderedLatex }}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* 3. 2x2 TACTILE ANSWER BUTTONS */}
            <div style={styles.buttonsGrid}>
              {displayedOptions.map((opt) => {
                const cfg = BUTTON_CONFIGS[opt.color] || BUTTON_CONFIGS.blue;
                const isSelected = selectedOptionId === opt.id;
                const isOtherSelected = Boolean(selectedOptionId && !isSelected);

                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    whileHover={{ scale: isOtherSelected ? 1 : 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={Boolean(selectedOptionId)}
                    style={{
                      ...styles.answerBtn,
                      background: cfg.gradient,
                      borderColor: isSelected ? '#FFFFFF' : cfg.border,
                      boxShadow: isSelected ? cfg.activeShadow : cfg.shadow,
                      transform: isSelected ? 'translateY(4px)' : 'none',
                      opacity: isOtherSelected ? 0.48 : 1,
                      outline: isSelected ? '3px solid #FFFFFF' : 'none',
                    }}
                  >
                    {/* Top Shape Symbol */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderShapeIcon(opt.shape)}
                    </div>

                    {/* Bottom Answer Text */}
                    <span style={styles.answerText}>{opt.text}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* 4. BOTTOM HELPER STATUS PILL */}
            <div style={styles.bottomPillWrapper}>
              <div style={styles.bottomPill}>
                {selectedOptionId ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle2 size={17} color="#15803D" strokeWidth={2.5} />
                    <span>Ответ принят. Переходим дальше...</span>
                  </div>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <img
                      src="/assets/quiz/target_acorn.png"
                      alt=""
                      style={{ width: 17, height: 17, objectFit: 'contain' }}
                    />
                    <span>Выберите один правильный вариант</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
              WAITING FOR CLASS FINISH STATE
              (Пользователь ответил на все вопросы и ждет остальных)
             ======================================================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={styles.waitingCardContainer}
          >
            <div style={styles.waitingCard}>
              <div style={styles.waitingMascotWrapper}>
                <img
                  src="/assets/mascot/sprint_waiting_v2.png"
                  alt="Спринт ждет"
                  style={styles.waitingMascotImg}
                />
              </div>

              <h2 style={styles.waitingTitle}>Вы ответили на все вопросы!</h2>

              <p style={styles.waitingSub}>
                Отличная скорость! Теперь ожидаем, пока остальные ученики класса завершат викторину.
                Все результаты, очки и победный пьедестал появятся одновременно.
              </p>

              <div style={styles.waitingProgressPill}>
                <Clock size={16} color="#B45309" strokeWidth={2.5} />
                {liveTotalStudents > 1 ? (
                  <span>Завершили: {Math.max(1, liveAnsweredCount)} из {liveTotalStudents} учеников</span>
                ) : (
                  <span>Все вопросы пройдены! Ожидаем завершения викторины...</span>
                )}
              </div>

              {/* Action button to finish when everyone is done */}
              <motion.button
                whileHover={{ scale: finishPayload ? 1.03 : 1 }}
                whileTap={{ scale: finishPayload ? 0.96 : 1 }}
                disabled={!finishPayload}
                onClick={() => {
                  if (!finishPayload) return;
                  haptics.notification('success');
                  if (onGameFinished) {
                    onGameFinished(finishPayload);
                  } else if (onBack) {
                    onBack();
                  }
                }}
                style={{
                  ...styles.finishWaitingBtn,
                  opacity: finishPayload ? 1 : 0.65,
                  cursor: finishPayload ? 'pointer' : 'not-allowed',
                  filter: finishPayload ? 'none' : 'grayscale(0.35)',
                }}
              >
                <span>{finishPayload ? '🏆 Посмотреть результаты викторины' : '⏳ Ожидаем завершения викторины учителем...'}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#FFF9F0',
    display: 'flex',
    justifyContent: 'center',
    padding: 0,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    minHeight: '100vh',
    padding: '14px 14px 28px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  roundBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3, 0 4px 10px rgba(120, 80, 40, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  },
  hangingSignWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 236,
    height: 64,
  },
  hangingSignImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  hangingSignText: {
    position: 'relative',
    zIndex: 2,
    fontSize: 16.5,
    fontWeight: 900,
    color: '#3D2411',
    letterSpacing: '0.01em',
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.7)',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    marginTop: -2,
    pointerEvents: 'none',
  },
  gameContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    marginTop: 8,
  },
  trailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  trackWrapper: {
    position: 'relative',
    flex: 1,
    height: 82,
    display: 'flex',
    alignItems: 'center',
  },
  trackImg: {
    width: '100%',
    height: '100%',
    objectFit: 'fill',
    display: 'block',
    pointerEvents: 'none',
  },
  sprintRunner: {
    position: 'absolute',
    top: '38%',
    transform: 'translateY(-50%)',
    width: 46,
    height: 46,
    pointerEvents: 'none',
    zIndex: 3,
  },
  sprintImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  finishAcorn: {
    position: 'absolute',
    right: 20,
    top: '38%',
    transform: 'translateY(-50%)',
    width: 34,
    height: 34,
    pointerEvents: 'none',
    zIndex: 2,
  },
  acornImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  discWrapper: {
    position: 'relative',
    width: 62,
    height: 62,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  discImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  discText: {
    position: 'relative',
    zIndex: 2,
    fontSize: 16.5,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
    marginTop: -1,
  },
  questionCard: {
    width: '100%',
    minHeight: 165,
    backgroundColor: '#FFFDF9',
    border: '2.5px solid #E5C39E',
    boxShadow: '0 4px 0 #D8BEA3, 0 8px 18px rgba(130, 80, 30, 0.08)',
    borderRadius: 24,
    padding: '28px 22px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  questionText: {
    fontSize: 21,
    fontWeight: 900,
    color: '#2B1D0C',
    textAlign: 'center',
    lineHeight: 1.36,
    letterSpacing: '-0.01em',
  },
  latexContainer: {
    marginTop: 12,
    fontSize: 22,
    color: '#2B1D0C',
  },
  buttonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: '1fr 1fr',
    gap: 'clamp(8px, 2.5vw, 14px)',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    flex: 1,
    minHeight: 280,
    maxHeight: 440,
    marginBottom: 16,
  },
  answerBtn: {
    height: '100%',
    minHeight: 120,
    width: '100%',
    minWidth: 0,
    borderRadius: 20,
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 8px',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
    userSelect: 'none',
    overflow: 'hidden',
    transition: 'opacity 0.2s ease, transform 0.15s ease',
  },
  shapeSymbol: {
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 1,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
  },
  answerText: {
    fontSize: 'clamp(14px, 4vw, 21px)',
    fontWeight: 900,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.2,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    maxWidth: '100%',
  },
  bottomPillWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 8,
    paddingBottom: 6,
  },
  bottomPill: {
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3, 0 4px 10px rgba(120, 80, 40, 0.08)',
    borderRadius: 999,
    padding: '10px 22px',
    fontSize: 13.5,
    fontWeight: 800,
    color: '#5C3E21',
  },
  waitingCardContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 0',
  },
  waitingCard: {
    width: '100%',
    backgroundColor: '#FFFDF9',
    border: '2.5px solid #E5C39E',
    boxShadow: '0 4px 0 #D8BEA3, 0 10px 24px rgba(130, 80, 30, 0.09)',
    borderRadius: 24,
    padding: '32px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  waitingMascotWrapper: {
    width: 136,
    height: 136,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingMascotImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  waitingTitle: {
    fontSize: 21,
    fontWeight: 900,
    color: '#2B1D0C',
    margin: '0 0 10px 0',
  },
  waitingSub: {
    fontSize: 14,
    fontWeight: 500,
    color: '#6B4A2F',
    lineHeight: 1.45,
    margin: '0 0 18px 0',
    maxWidth: 320,
  },
  waitingProgressPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5EA',
    border: '1.5px solid #F5D0A9',
    borderRadius: 999,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 800,
    color: '#B45309',
    marginBottom: 24,
  },
  finishWaitingBtn: {
    width: '100%',
    maxWidth: 300,
    height: 48,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
    border: '2.5px solid #6EE7B7',
    boxShadow: '0 4px 0 #047857, 0 8px 18px rgba(16, 185, 129, 0.3)',
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
  },
};
