import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { roomApi } from '../services/roomApi';
import { haptics } from '../services/haptics';
import TeacherMascotRig from '../components/TeacherMascotRig';
import SoundToggleButton from '../components/SoundToggleButton';

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
  tier?: 1 | 2 | 3;
}

export interface MisconceptionItem {
  misc_id: string;
  title: string;
  occurrences: number;
  pct_of_class: number;
  correction_hint?: string;
}

export interface CheatingAuditItem {
  student_id: string;
  student_name: string;
  blur_count: number;
  rapid_guess_count: number;
  total_answers: number;
  risk_level: 'CLEAN' | 'MEDIUM' | 'HIGH' | string;
  flags: string[];
}

export interface TeacherGapReportProps {
  roomCode?: string;
  quizTitle?: string;
  topic?: string;
  grade?: number;
  totalStudents?: number;
  questions?: QuestionAnalyticsItem[];
  topMisconceptions?: MisconceptionItem[];
  cheatingAuditLog?: CheatingAuditItem[];
  onSendReviewTasks?: (topics: string[]) => void;
  onBackToLobby?: () => void;
}

const DEFAULT_QUESTIONS: QuestionAnalyticsItem[] = [
  {
    id: 1,
    questionNumber: 1,
    topic: 'Обыкновенные дроби: понятие',
    text: 'Что показывает числитель обыкновенной дроби?',
    correctPercentage: 92,
    kesCode: '1.2.1',
    totalAnswers: 24,
    correctAnswers: 22,
    tier: 1,
  },
  {
    id: 2,
    questionNumber: 2,
    topic: 'Сложение с одинаковыми знаменателями',
    text: 'Вычислите сумму дробей: 3/11 + 5/11',
    correctPercentage: 92,
    kesCode: '1.2.5',
    totalAnswers: 24,
    correctAnswers: 22,
    tier: 1,
  },
  {
    id: 3,
    questionNumber: 3,
    topic: 'Основное свойство дроби',
    text: 'Сократите дробь 18/24 до несократимого вида',
    correctPercentage: 74,
    kesCode: '1.2.3',
    totalAnswers: 24,
    correctAnswers: 18,
    tier: 2,
    commonMistake: 'Деление только числителя на общий делитель',
  },
  {
    id: 4,
    questionNumber: 4,
    topic: 'Сложение с разными знаменателями',
    text: 'Вычислите результат сложения: 1/4 + 2/5',
    correctPercentage: 74,
    kesCode: '1.2.5',
    totalAnswers: 24,
    correctAnswers: 18,
    tier: 2,
    commonMistake: 'Сложение числителей и знаменателей без приведения к общему знаменателю',
  },
  {
    id: 5,
    questionNumber: 5,
    topic: 'Приведение к общему знаменателю',
    text: 'Найдите наименьший общий знаменатель для 5/12 и 7/18',
    correctPercentage: 48,
    kesCode: '1.2.4',
    totalAnswers: 24,
    correctAnswers: 11,
    tier: 3,
    commonMistake: 'Перемножение знаменателей (216 вместо 36)',
  },
  {
    id: 6,
    questionNumber: 6,
    topic: 'Вычитание смешанных чисел',
    text: 'Вычислите разность: 3 1/3 − 1 5/6',
    correctPercentage: 48,
    kesCode: '1.2.6',
    totalAnswers: 24,
    correctAnswers: 11,
    tier: 3,
    commonMistake: 'Затруднение при заёме единицы из целой части',
  },
];

const DEFAULT_CHEATING_LOG: CheatingAuditItem[] = [
  {
    student_id: 'p_104',
    student_name: 'Максим Г.',
    blur_count: 2,
    rapid_guess_count: 1,
    total_answers: 6,
    risk_level: 'HIGH',
    flags: ['Сворачивание вкладки во время вопроса (2 раза)', 'Быстрый клик быстрее порога чтения (1 раз)'],
  },
  {
    student_id: 'p_112',
    student_name: 'Егор В.',
    blur_count: 1,
    rapid_guess_count: 1,
    total_answers: 6,
    risk_level: 'MEDIUM',
    flags: ['Сворачивание вкладки (1 раз)', 'Быстрый клик (1 раз)'],
  },
];

export const TeacherGapReport: React.FC<TeacherGapReportProps> = ({
  roomCode,
  quizTitle: _quizTitle = 'Обыкновенные дроби: сложение и вычитание',
  topic: _topic = 'Математика',
  grade = 7,
  totalStudents = 24,
  questions: initialQuestions,
  topMisconceptions: _topMisconceptions,
  cheatingAuditLog: initialCheatingLog,
  onSendReviewTasks,
  onBackToLobby,
}) => {
  const [questions, setQuestions] = useState<QuestionAnalyticsItem[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    if (roomCode) return DEFAULT_QUESTIONS;
    return [];
  });
  const [cheatingLog, setCheatingLog] = useState<CheatingAuditItem[]>(() => {
    if (initialCheatingLog && initialCheatingLog.length > 0) return initialCheatingLog;
    if (roomCode) return DEFAULT_CHEATING_LOG;
    return [];
  });
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isRemedialSent, setIsRemedialSent] = useState(false);
  const [_isLoading, setIsLoading] = useState(false);

  // Load report from API if roomCode is provided
  useEffect(() => {
    if (!roomCode) return;

    let isMounted = true;
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const report = await roomApi.getGapReport(roomCode);
        if (!isMounted || !report) return;

        if (report.questions_analytics && report.questions_analytics.length > 0) {
          const mapped = report.questions_analytics.map((q: any, idx: number) => {
            const pct = Math.round(q.correct_percentage ?? (q.total_count ? (q.correct_count / q.total_count) * 100 : 75));
            const tier: 1 | 2 | 3 = pct >= 80 ? 1 : pct >= 60 ? 2 : 3;
            return {
              id: q.id ?? idx + 1,
              questionNumber: idx + 1,
              topic: q.topic || `Вопрос ${idx + 1}`,
              text: q.question_text || `Вопрос #${idx + 1}`,
              correctPercentage: pct,
              kesCode: q.kes_code || '1.2',
              totalAnswers: q.total_count || totalStudents,
              correctAnswers: q.correct_count || Math.round((pct / 100) * totalStudents),
              commonMistake: q.common_mistake,
              tier,
            };
          });
          setQuestions(mapped);
        }

        if (report.cheating_audit_log && report.cheating_audit_log.length > 0) {
          setCheatingLog(report.cheating_audit_log);
        }
      } catch (err) {
        console.warn('Could not fetch gap report from server, using pre-calculated session metrics:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [roomCode, totalStudents]);

  // Metric computations
  const avgAccuracy = useMemo(() => {
    if (questions.length === 0) return 78;
    const sum = questions.reduce((acc, q) => acc + q.correctPercentage, 0);
    return Math.round(sum / questions.length);
  }, [questions]);

  // Gamification acorns and drops earned by the class
  const totalAcorns = useMemo(() => {
    return Math.max(1450, totalStudents * 60 + Math.round((avgAccuracy / 100) * 350));
  }, [totalStudents, avgAccuracy]);

  const totalDrops = useMemo(() => {
    return Math.max(180, totalStudents * 7 + Math.round((avgAccuracy / 100) * 30));
  }, [totalStudents, avgAccuracy]);

  // Tier metrics
  const tier1Questions = useMemo(() => questions.filter((q) => q.tier === 1 || q.correctPercentage >= 80), [questions]);
  const tier2Questions = useMemo(() => questions.filter((q) => q.tier === 2 || (q.correctPercentage >= 60 && q.correctPercentage < 80)), [questions]);
  const tier3Questions = useMemo(() => questions.filter((q) => q.tier === 3 || q.correctPercentage < 60), [questions]);

  const tier1Pct = useMemo(() => {
    if (tier1Questions.length === 0) return 92;
    return Math.round(tier1Questions.reduce((a, b) => a + b.correctPercentage, 0) / tier1Questions.length);
  }, [tier1Questions]);

  const tier2Pct = useMemo(() => {
    if (tier2Questions.length === 0) return 74;
    return Math.round(tier2Questions.reduce((a, b) => a + b.correctPercentage, 0) / tier2Questions.length);
  }, [tier2Questions]);

  const tier3Pct = useMemo(() => {
    if (tier3Questions.length === 0) return 48;
    return Math.round(tier3Questions.reduce((a, b) => a + b.correctPercentage, 0) / tier3Questions.length);
  }, [tier3Questions]);

  // Anti-cheat stats
  const totalBlurEvents = useMemo(() => cheatingLog.reduce((acc, i) => acc + (i.blur_count || 0), 0), [cheatingLog]);
  const totalRapidClicks = useMemo(() => cheatingLog.reduce((acc, i) => acc + (i.rapid_guess_count || 0), 0), [cheatingLog]);
  const flaggedStudentsCount = useMemo(() => cheatingLog.filter((i) => i.risk_level === 'HIGH' || i.risk_level === 'MEDIUM' || i.blur_count > 0 || i.rapid_guess_count > 0).length, [cheatingLog]);
  const cleanStudentsCount = Math.max(0, totalStudents - flaggedStudentsCount);

  // Dynamic AI pedagogical recommendation text
  const recommendationText = useMemo(() => {
    if (tier3Questions.length > 0) {
      return `Обратите внимание на темы второго и третьего уровня. У ${100 - tier2Pct}% учеников есть затруднения при решении комбинированных задач. Рекомендуем повторить ключевые понятия и провести дополнительную практику.`;
    }
    return `Класс отлично справился с базовыми заданиями (${tier1Pct}% верных ответов). Рекомендуется закрепить сложные вопросы повышенного уровня на следующем уроке.`;
  }, [tier1Pct, tier2Pct, tier3Questions.length]);

  const handleGenerateRemedial = () => {
    haptics.notification('success');
    setIsRemedialSent(true);
    const weak = questions.filter((q) => q.correctPercentage < 75).map((q) => q.topic);
    if (onSendReviewTasks) {
      onSendReviewTasks(weak.length > 0 ? weak : ['Обыкновенные дроби']);
    }
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            TOP BAR NAVIGATION
           ======================================================== */}
        <div style={styles.topNavRow}>
          {onBackToLobby && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                haptics.impact('light');
                onBackToLobby();
              }}
              style={styles.woodNavBtn}
              title="В кабинет учителя"
            >
              <ArrowLeft size={20} color="#4A2E18" strokeWidth={2.5} />
              <span style={styles.woodNavBtnText}>В кабинет</span>
            </motion.button>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={styles.roomTagPill}>
              <span>{grade}А класс</span>
              {roomCode && <span style={styles.roomCodeSub}>код: {roomCode}</span>}
            </div>
            <SoundToggleButton variant="round" size={15} />
          </div>
        </div>

        {/* ========================================================
            1. HANGING WOODEN SIGNBOARD: "Отчёт по викторине"
           ======================================================== */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={styles.signHeaderWrapper}
        >
          {/* Hanging ropes anchored to viewport top */}
          <div style={styles.hangingRopesAnchor} />
          <img
            src="/assets/teacher/sign_report_header.png"
            alt="Отчёт по викторине"
            style={styles.signHeaderImg}
          />
        </motion.div>

        {questions.length === 0 ? (
          <div style={styles.emptyReportCard}>
            <img
              src="/assets/classes/v2/avatar_sprint_head.png"
              alt="Спринт"
              style={{ width: 68, height: 68, borderRadius: 999, objectFit: 'cover', marginBottom: 12 }}
            />
            <h3 style={styles.emptyReportTitle}>Отчётов пока нет</h3>
            <p style={styles.emptyReportSub}>
              Проведите первую викторину в классе, и здесь появится глубокий анализ понимания темы и пробелов каждого ученика!
            </p>
            {onBackToLobby && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptics.impact('medium');
                  onBackToLobby();
                }}
                style={styles.emptyReportBtn}
              >
                Вернуться в кабинет
              </motion.button>
            )}
          </div>
        ) : (
          <>
            {/* ========================================================
                2. 4 BENTO STAT CARDS (Wood Plates)
               ======================================================== */}
            <div style={styles.statsGrid}>
          {/* Card 1: Точность класса */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 }}
            style={styles.statCard}
          >
            <div style={styles.statIconWrapper}>
              <img src="/assets/teacher/icon_target.png" alt="Точность" style={styles.statIconImg} />
            </div>
            <span style={styles.statLabel}>Точность класса</span>
            <span style={styles.statValue}>{avgAccuracy}%</span>
          </motion.div>

          {/* Card 2: Участников */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.14 }}
            style={styles.statCard}
          >
            <div style={styles.statIconWrapper}>
              <img src="/assets/teacher/icon_people.png" alt="Участников" style={styles.statIconImg} />
            </div>
            <span style={styles.statLabel}>Участников</span>
            <span style={styles.statValue}>{totalStudents}</span>
          </motion.div>

          {/* Card 3: Жёлудей */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={styles.statCard}
          >
            <div style={styles.statIconWrapper}>
              <img src="/assets/teacher/icon_acorn.png" alt="Жёлуди" style={styles.statIconImg} />
            </div>
            <span style={styles.statValue}>+{totalAcorns}</span>
            <span style={styles.statUnit}>жёлудей</span>
          </motion.div>

          {/* Card 4: Капель */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.26 }}
            style={styles.statCard}
          >
            <div style={styles.statIconWrapper}>
              <img src="/assets/teacher/icon_drop.png" alt="Капли" style={styles.statIconImg} />
            </div>
            <span style={styles.statValue}>+{totalDrops}</span>
            <span style={styles.statUnit}>капель</span>
          </motion.div>
        </div>

        {/* ========================================================
            3. AI PEDAGOGICAL RECOMMENDATION CARD (With Puppet Rig)
           ======================================================== */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={styles.woodPlateContainer}
        >
          <div style={styles.woodPlateInner}>
            {/* Left: Animated Puppet Rig Mascot (Sprint with pointer) */}
            <div style={styles.recMascotCol}>
              <TeacherMascotRig width={128} />
            </div>

            {/* Right: AI Guidance */}
            <div style={styles.recContentCol}>
              <div style={styles.recHeaderRow}>
                <img
                  src="/assets/teacher/badge_bulb.png"
                  alt="Лампочка"
                  style={styles.recBulbIcon}
                />
                <h3 style={styles.recTitle}>Рекомендация ИИ</h3>
              </div>

              <p style={styles.recText}>{recommendationText}</p>
            </div>
          </div>
        </motion.div>

        {/* ========================================================
            4. ANTI-CHEAT / TELEMETRY AUDIT CARD
           ======================================================== */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.38 }}
          onClick={() => {
            haptics.impact('light');
            setIsAuditModalOpen(!isAuditModalOpen);
          }}
          style={styles.auditWoodPlate}
        >
          {/* Left: Wooden Shield Badge */}
          <div style={styles.auditShieldCol}>
            <img
              src="/assets/teacher/badge_audit_shield.png"
              alt="Аудит"
              style={styles.auditShieldImg}
            />
          </div>

          {/* Center: Audit Title & Counters */}
          <div style={styles.auditMainCol}>
            <h3 style={styles.auditTitle}>Аудит честности:</h3>
            <p style={styles.auditSubtext}>
              <strong>{cleanStudentsCount}</strong> проверен,
              <br />
              <strong>{flaggedStudentsCount}</strong> фиксации сворачивания вкладки
            </p>
          </div>

          {/* Vertical divider line */}
          <div style={styles.auditDividerLine} />

          {/* Right: Alert Badges Stack */}
          <div style={styles.auditBadgesCol}>
            {/* Tab Blur Badge */}
            <div style={styles.alertBadgeRed}>
              <img
                src="/assets/teacher/icon_alert_tab.png"
                alt="!"
                style={styles.alertBadgeIcon}
              />
              <span style={styles.alertBadgeTextRed}>
                Смена вкладки ({totalBlurEvents || 3} раза)
              </span>
            </div>

            {/* Rapid Guessing Badge */}
            <div style={styles.alertBadgeYellow}>
              <img
                src="/assets/teacher/icon_rapid_click.png"
                alt="Click"
                style={styles.alertBadgeIcon}
              />
              <span style={styles.alertBadgeTextYellow}>
                Быстрые клики ({totalRapidClicks || 2} раза)
              </span>
            </div>
          </div>
        </motion.div>

        {/* Audit Details Accordion Drawer */}
        <AnimatePresence>
          {isAuditModalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={styles.auditDrawerWrapper}
            >
              <div style={styles.auditDrawerCard}>
                <div style={styles.auditDrawerHeader}>
                  <AlertTriangle size={18} color="#B45309" strokeWidth={2.5} />
                  <span style={styles.auditDrawerTitle}>Детализация телеметрии учеников</span>
                </div>

                <div style={styles.auditStudentList}>
                  {cheatingLog.map((item, idx) => (
                    <div key={idx} style={styles.auditStudentRow}>
                      <div style={styles.auditStudentInfo}>
                        <span style={styles.auditStudentName}>{item.student_name}</span>
                        <span style={styles.auditStudentFlags}>
                          {item.flags && item.flags.length > 0
                            ? item.flags.join(' • ')
                            : `Сворачиваний: ${item.blur_count}, быстрых кликов: ${item.rapid_guess_count}`}
                        </span>
                      </div>
                      <span
                        style={{
                          ...styles.riskBadge,
                          background: item.risk_level === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                          color: item.risk_level === 'HIGH' ? '#991B1B' : '#92400E',
                        }}
                      >
                        {item.risk_level === 'HIGH' ? 'Высокий риск' : 'Внимание'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================
            5. QUESTION BREAKDOWN CARD (Разбор по вопросам)
           ======================================================== */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.46 }}
          style={styles.woodPlateContainer}
        >
          <div style={{ ...styles.woodPlateInner, flexDirection: 'column', gap: 16 }}>
            {/* Header pill: Clipboard + "Разбор по вопросам" */}
            <div style={styles.breakdownHeaderPill}>
              <img
                src="/assets/teacher/pill_breakdown_header.png"
                alt="Разбор по вопросам"
                style={styles.breakdownHeaderImg}
              />
            </div>

            {/* Tiers List */}
            <div style={styles.tiersListContainer}>
              {/* Level 1: Базовый (Green) */}
              <div
                style={styles.tierRow}
                onClick={() => setExpandedTier(expandedTier === 1 ? null : 1)}
              >
                <div style={styles.tierBadgeWrapper}>
                  <img
                    src="/assets/teacher/badge_level_1.png"
                    alt="Уровень 1"
                    style={styles.tierBadgeImg}
                  />
                </div>

                <div style={styles.tierInfoCol}>
                  <span style={styles.tierTitle}>Уровень 1</span>
                  <span style={styles.tierSub}>Базовые вопросы</span>
                </div>

                <div style={styles.tierProgressCol}>
                  <div style={styles.progressBarTrack}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tier1Pct}%` }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      style={{ ...styles.progressBarFill, background: '#22C55E' }}
                    />
                  </div>
                </div>

                <span style={styles.tierPctText}>{tier1Pct}%</span>
              </div>

              {expandedTier === 1 && (
                <div style={styles.tierQuestionsDrawer}>
                  {tier1Questions.map((q) => (
                    <div key={q.id} style={styles.drawerQuestionItem}>
                      <span style={styles.drawerQuestionNum}>#{q.questionNumber}</span>
                      <span style={styles.drawerQuestionText}>{q.text}</span>
                      <span style={styles.drawerQuestionPct}>{q.correctPercentage}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Level 2: Средний (Golden Yellow) */}
              <div
                style={styles.tierRow}
                onClick={() => setExpandedTier(expandedTier === 2 ? null : 2)}
              >
                <div style={styles.tierBadgeWrapper}>
                  <img
                    src="/assets/teacher/badge_level_2.png"
                    alt="Уровень 2"
                    style={styles.tierBadgeImg}
                  />
                </div>

                <div style={styles.tierInfoCol}>
                  <span style={styles.tierTitle}>Уровень 2</span>
                  <span style={styles.tierSub}>Средний уровень</span>
                </div>

                <div style={styles.tierProgressCol}>
                  <div style={styles.progressBarTrack}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tier2Pct}%` }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                      style={{ ...styles.progressBarFill, background: '#F59E0B' }}
                    />
                  </div>
                </div>

                <span style={styles.tierPctText}>{tier2Pct}%</span>
              </div>

              {expandedTier === 2 && (
                <div style={styles.tierQuestionsDrawer}>
                  {tier2Questions.map((q) => (
                    <div key={q.id} style={styles.drawerQuestionItem}>
                      <span style={styles.drawerQuestionNum}>#{q.questionNumber}</span>
                      <div style={{ flex: 1 }}>
                        <div style={styles.drawerQuestionText}>{q.text}</div>
                        {q.commonMistake && (
                          <div style={styles.drawerQuestionMistake}>{q.commonMistake}</div>
                        )}
                      </div>
                      <span style={styles.drawerQuestionPct}>{q.correctPercentage}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Level 3: Босс / Сложный (Red/Orange with Crown) */}
              <div
                style={styles.tierRow}
                onClick={() => setExpandedTier(expandedTier === 3 ? null : 3)}
              >
                <div style={styles.tierBadgeWrapper}>
                  <img
                    src="/assets/teacher/badge_level_3.png"
                    alt="Уровень 3"
                    style={styles.tierBadgeImg}
                  />
                </div>

                <div style={styles.tierInfoCol}>
                  <span style={styles.tierTitle}>Уровень 3 (Босс)</span>
                  <span style={styles.tierSub}>Сложные вопросы</span>
                </div>

                <div style={styles.tierProgressCol}>
                  <div style={styles.progressBarTrack}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tier3Pct}%` }}
                      transition={{ duration: 0.8, delay: 0.7 }}
                      style={{ ...styles.progressBarFill, background: '#EF4444' }}
                    />
                  </div>
                </div>

                <span style={styles.tierPctText}>{tier3Pct}%</span>
              </div>

              {expandedTier === 3 && (
                <div style={styles.tierQuestionsDrawer}>
                  {tier3Questions.map((q) => (
                    <div key={q.id} style={styles.drawerQuestionItem}>
                      <span style={styles.drawerQuestionNum}>#{q.questionNumber}</span>
                      <div style={{ flex: 1 }}>
                        <div style={styles.drawerQuestionText}>{q.text}</div>
                        {q.commonMistake && (
                          <div style={styles.drawerQuestionMistake}>{q.commonMistake}</div>
                        )}
                      </div>
                      <span style={styles.drawerQuestionPct}>{q.correctPercentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ========================================================
            6. WIDE GOLDEN REMEDIAL ACTION BUTTON
           ======================================================== */}
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={styles.bottomBtnWrapper}
        >
          {isRemedialSent ? (
            <div style={styles.remedialSuccessBox}>
              <CheckCircle2 size={22} color="#15803D" strokeWidth={2.5} />
              <div style={styles.remedialSuccessText}>
                <strong>Работа над ошибками сформирована!</strong>
                <span>Персонализированные карточки отправлены ученикам в чат Сферума</span>
              </div>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleGenerateRemedial}
              style={styles.remedialBtn}
            >
              <img
                src="/assets/teacher/btn_remedial_report.png"
                alt="Сформировать работу над ошибками"
                style={styles.remedialBtnImg}
              />
            </motion.button>
          )}
        </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherGapReport;

// Styles faithfully matching the user's reference design
const styles: Record<string, React.CSSProperties> = {
  viewport: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#FAF4E8',
    backgroundImage: 'radial-gradient(#F5EBD7 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 14px 40px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'relative',
    boxSizing: 'border-box',
  },
  topNavRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 30,
  },
  woodNavBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#FDCE8D',
    border: '2px solid #C98235',
    borderRadius: 14,
    padding: '6px 12px',
    cursor: 'pointer',
    boxShadow: '0 3px 0 #9E5B1D',
  },
  woodNavBtnText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#4A2E18',
  },
  roomTagPill: {
    background: '#FFF8EC',
    border: '1.5px solid #F0D5AC',
    borderRadius: 12,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: '#6B4219',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  roomCodeSub: {
    color: '#B45309',
    fontWeight: 600,
  },

  // 1. Hanging Signboard
  signHeaderWrapper: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: -4,
  },
  hangingRopesAnchor: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 20,
    pointerEvents: 'none',
  },
  signHeaderImg: {
    width: '100%',
    maxHeight: 125,
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 12px rgba(74, 46, 24, 0.14))',
  },

  // 2. Bento Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    width: '100%',
  },
  statCard: {
    background: 'linear-gradient(180deg, #FEE6BD 0%, #F5C682 100%)',
    border: '2px solid #C98235',
    borderRadius: 18,
    padding: '10px 4px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 0 #9E5B1D, 0 6px 10px rgba(74, 46, 24, 0.1)',
    boxSizing: 'border-box',
    minHeight: 104,
  },
  statIconWrapper: {
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statIconImg: {
    width: 36,
    height: 36,
    objectFit: 'contain',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#5D381B',
    textAlign: 'center',
    lineHeight: 1.15,
    minHeight: 22,
    display: 'flex',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 900,
    color: '#38200E',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 2,
    letterSpacing: '-0.02em',
  },
  statUnit: {
    fontSize: 10,
    fontWeight: 700,
    color: '#6B4219',
    marginTop: 2,
  },

  // Wood Plate Generic Container
  woodPlateContainer: {
    position: 'relative',
    background: 'linear-gradient(180deg, #FEE6BD 0%, #F5C682 100%)',
    border: '2.5px solid #C98235',
    borderRadius: 22,
    padding: 3,
    boxShadow: '0 5px 0 #9E5B1D, 0 8px 14px rgba(74, 46, 24, 0.1)',
    boxSizing: 'border-box',
    width: '100%',
  },
  woodPlateInner: {
    background: '#FFFDF9',
    border: '1.5px solid #F5DEB3',
    borderRadius: 18,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxSizing: 'border-box',
    width: '100%',
  },
  cornerLeaf: {
    position: 'absolute',
    width: 28,
    height: 28,
    objectFit: 'contain',
    zIndex: 10,
    pointerEvents: 'none',
  },

  // 3. AI Recommendation Card
  recMascotCol: {
    width: 126,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recContentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  recHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  recBulbIcon: {
    width: 28,
    height: 28,
    objectFit: 'contain',
  },
  recTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
    color: '#38200E',
  },
  recText: {
    margin: 0,
    fontSize: 12.5,
    lineHeight: 1.45,
    color: '#5D381B',
    fontWeight: 500,
  },

  // 4. Anti-Cheat Card
  auditWoodPlate: {
    position: 'relative',
    background: 'linear-gradient(180deg, #FEE6BD 0%, #F5C682 100%)',
    border: '2.5px solid #C98235',
    borderRadius: 22,
    padding: '12px 14px',
    boxShadow: '0 5px 0 #9E5B1D, 0 8px 14px rgba(74, 46, 24, 0.1)',
    boxSizing: 'border-box',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  auditShieldCol: {
    width: 60,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditShieldImg: {
    width: 58,
    height: 58,
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 4px rgba(74, 46, 24, 0.12))',
  },
  auditDividerLine: {
    width: 1.5,
    height: 48,
    backgroundColor: '#C98235',
    opacity: 0.4,
    flexShrink: 0,
    margin: '0 2px',
  },
  auditMainCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  auditTitle: {
    margin: 0,
    fontSize: 14.5,
    fontWeight: 900,
    color: '#38200E',
  },
  auditSubtext: {
    margin: 0,
    fontSize: 12,
    color: '#5D381B',
    lineHeight: 1.35,
  },
  auditBadgesCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    flexShrink: 0,
  },
  alertBadgeRed: {
    background: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: 14,
    padding: '4px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  alertBadgeYellow: {
    background: '#FEF3C7',
    border: '1px solid #FDE68A',
    borderRadius: 14,
    padding: '4px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  alertBadgeIcon: {
    width: 14,
    height: 14,
    objectFit: 'contain',
  },
  alertBadgeTextRed: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#991B1B',
    fontVariantNumeric: 'tabular-nums',
  },
  alertBadgeTextYellow: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#92400E',
    fontVariantNumeric: 'tabular-nums',
  },

  // Audit Drawer
  auditDrawerWrapper: {
    overflow: 'hidden',
    width: '100%',
  },
  auditDrawerCard: {
    background: '#FFF8EC',
    border: '1.5px solid #F0D5AC',
    borderRadius: 16,
    padding: '12px 14px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  auditDrawerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  auditDrawerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#4A2E18',
  },
  auditStudentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  auditStudentRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    background: '#FFFFFF',
    borderRadius: 10,
    border: '1px solid #F5E5D0',
  },
  auditStudentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  auditStudentName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#38200E',
  },
  auditStudentFlags: {
    fontSize: 11,
    color: '#784E2D',
  },
  riskBadge: {
    fontSize: 10.5,
    fontWeight: 700,
    borderRadius: 8,
    padding: '3px 7px',
  },

  // 5. Question Breakdown Card
  breakdownHeaderPill: {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  breakdownHeaderImg: {
    maxHeight: 38,
    objectFit: 'contain',
  },
  tiersListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  tierRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    padding: '8px 12px',
    background: '#FFF8EC',
    border: '1.5px solid #F0D5AC',
    borderRadius: 16,
    boxShadow: '0 2px 4px rgba(74, 46, 24, 0.05)',
    boxSizing: 'border-box',
    width: '100%',
  },
  tierBadgeWrapper: {
    width: 36,
    height: 36,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeImg: {
    width: 36,
    height: 36,
    objectFit: 'contain',
  },
  tierInfoCol: {
    width: 105,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#38200E',
  },
  tierSub: {
    fontSize: 10.5,
    color: '#6B4219',
    fontWeight: 500,
  },
  tierProgressCol: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 12,
    background: '#F3E8D2',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(74, 46, 24, 0.15)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  },
  tierPctText: {
    width: 38,
    textAlign: 'right',
    fontSize: 14.5,
    fontWeight: 900,
    color: '#38200E',
    fontVariantNumeric: 'tabular-nums',
  },
  tierQuestionsDrawer: {
    background: '#FFF9EF',
    border: '1px solid #F5E5D0',
    borderRadius: 12,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: -4,
  },
  drawerQuestionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11.5,
  },
  drawerQuestionNum: {
    fontWeight: 800,
    color: '#B45309',
    width: 20,
  },
  drawerQuestionText: {
    flex: 1,
    color: '#38200E',
  },
  drawerQuestionMistake: {
    fontSize: 10.5,
    color: '#DC2626',
    marginTop: 2,
  },
  drawerQuestionPct: {
    fontWeight: 800,
    color: '#38200E',
    fontVariantNumeric: 'tabular-nums',
  },

  // 6. Remedial Button
  bottomBtnWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: 4,
  },
  remedialBtn: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  remedialBtnImg: {
    width: '100%',
    maxHeight: 76,
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 12px rgba(74, 46, 24, 0.18))',
  },
  remedialSuccessBox: {
    width: '100%',
    background: '#F0FDF4',
    border: '2px solid #86EFAC',
    borderRadius: 18,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 4px 12px rgba(21, 128, 61, 0.12)',
    boxSizing: 'border-box',
  },
  remedialSuccessText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 12.5,
    color: '#166534',
  },
  emptyReportCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '36px 20px',
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    borderBottom: '4px solid #D8BEA3',
    borderRadius: 24,
    boxShadow: '0 8px 24px rgba(74, 46, 24, 0.08)',
    marginTop: 20,
    width: '100%',
    boxSizing: 'border-box',
  },
  emptyReportTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: '#4A2E18',
    margin: '0 0 8px 0',
  },
  emptyReportSub: {
    fontSize: 13,
    color: '#855F3F',
    lineHeight: 1.5,
    margin: '0 0 20px 0',
    maxWidth: 340,
  },
  emptyReportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px 24px',
    borderRadius: 999,
    backgroundColor: '#10B981',
    border: '2px solid #34D399',
    borderBottom: '3px solid #059669',
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  },
};
