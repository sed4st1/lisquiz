import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lock,
  Flame,
  Target,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { colors, spacing, borderRadius, shadows, transitions } from '../theme/tokens';

export type TreeStage = 'seed' | 'sprout' | 'sapling' | 'young_tree' | 'mature_tree' | 'flowering';

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedDate?: string;
}

export interface ClassGroveProps {
  classNameTitle?: string;
  currentPoints?: number;
  targetPoints?: number;
  initialStage?: TreeStage;
  weeklyQuizzes?: number;
  streakDays?: number;
  onBack?: () => void;
}

interface StageConfig {
  id: TreeStage;
  label: string;
  level: number;
  trunkHeight: number;
  trunkWidth: number;
  trunkY: number;
  trunkX: number;
  canopyRx: number;
  canopyRy: number;
  canopyCy: number;
  canopyCx: number;
  canopyColor: string;
  description: string;
}

const STAGE_CONFIGS: Record<TreeStage, StageConfig> = {
  seed: {
    id: 'seed',
    label: 'Семя',
    level: 1,
    trunkHeight: 0,
    trunkWidth: 0,
    trunkY: 235,
    trunkX: 150,
    canopyRx: 0,
    canopyRy: 0,
    canopyCy: 235,
    canopyCx: 150,
    canopyColor: '#10B981',
    description: 'Зерно знаний бережно посажено в священной роще',
  },
  sprout: {
    id: 'sprout',
    label: 'Росток',
    level: 2,
    trunkHeight: 38,
    trunkWidth: 8,
    trunkY: 202,
    trunkX: 146,
    canopyRx: 22,
    canopyRy: 14,
    canopyCy: 198,
    canopyCx: 150,
    canopyColor: '#34D399',
    description: 'Первые нежные листочки тянутся к лучам познания',
  },
  sapling: {
    id: 'sapling',
    label: 'Саженец',
    level: 3,
    trunkHeight: 76,
    trunkWidth: 14,
    trunkY: 164,
    trunkX: 143,
    canopyRx: 52,
    canopyRy: 42,
    canopyCy: 135,
    canopyCx: 150,
    canopyColor: '#10B981',
    description: 'Ствол окреп, густая листва дарит первую тень',
  },
  young_tree: {
    id: 'young_tree',
    label: 'Молодое деревце',
    level: 4,
    trunkHeight: 110,
    trunkWidth: 22,
    trunkY: 130,
    trunkX: 139,
    canopyRx: 72,
    canopyRy: 56,
    canopyCy: 98,
    canopyCx: 150,
    canopyColor: '#059669',
    description: 'Широкие ветви защищают рощу от непогоды',
  },
  mature_tree: {
    id: 'mature_tree',
    label: 'Могучий дуб',
    level: 5,
    trunkHeight: 138,
    trunkWidth: 32,
    trunkY: 102,
    trunkX: 134,
    canopyRx: 94,
    canopyRy: 72,
    canopyCy: 76,
    canopyCx: 150,
    canopyColor: '#047857',
    description: 'Величественное дерево мудрости всего класса',
  },
  flowering: {
    id: 'flowering',
    label: 'Цветущее древо',
    level: 6,
    trunkHeight: 152,
    trunkWidth: 36,
    trunkY: 88,
    trunkX: 132,
    canopyRx: 105,
    canopyRy: 80,
    canopyCy: 65,
    canopyCx: 150,
    canopyColor: '#065F46',
    description: 'Дерево усыпано волшебными цветами и плодами побед',
  },
};

const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'first_quiz',
    title: 'Первая викторина',
    description: 'Сыграна первая командная игра',
    icon: '🏆',
    isUnlocked: true,
    unlockedDate: '12 окт',
  },
  {
    id: 'streak_5',
    title: 'Серия из 5',
    description: '5 правильных ответов подряд',
    icon: '🔥',
    isUnlocked: true,
    unlockedDate: '16 окт',
  },
  {
    id: 'math_expert',
    title: 'Знаток дробей',
    description: '85%+ верных ответов в контроле',
    icon: '📐',
    isUnlocked: true,
    unlockedDate: 'Вчера',
  },
  {
    id: 'perfect_score',
    title: '100% правильных',
    description: 'Викторина без единой ошибки',
    icon: '⭐',
    isUnlocked: false,
  },
  {
    id: 'grove_guardian',
    title: 'Хранитель рощи',
    description: 'Вырастить дерево до 5 уровня',
    icon: '🌳',
    isUnlocked: false,
  },
  {
    id: 'team_speed',
    title: 'Спринт-мастер',
    description: 'Среднее время ответа менее 5 секунд',
    icon: '⚡',
    isUnlocked: false,
  },
];

export default function ClassGrove({
  classNameTitle = '5А класс',
  currentPoints = 2450,
  targetPoints = 5000,
  initialStage = 'sapling',
  weeklyQuizzes = 3,
  streakDays = 5,
}: ClassGroveProps) {
  const [stage, setStage] = useState<TreeStage>(initialStage);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  const stageConfig = STAGE_CONFIGS[stage];
  const progressPercent = Math.min(100, Math.round((currentPoints / targetPoints) * 100));

  const stagesList: TreeStage[] = [
    'seed',
    'sprout',
    'sapling',
    'young_tree',
    'mature_tree',
    'flowering',
  ];

  return (
    <div style={styles.container}>
      <div style={styles.innerWrapper}>
        {/* Top Header */}
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.groveBadge}>
              <Sparkles size={14} color={colors.emeraldGreen} />
              <span>Роща знаний Лисквиз</span>
            </div>
            <div style={styles.stageIndicator}>
              Уровень {stageConfig.level} из 6
            </div>
          </div>

          <h1 style={styles.classNameTitle}>{classNameTitle}</h1>
          <p style={styles.classSubtitle}>
            Каждая викторина питает командное дерево вашего класса
          </p>
        </header>

        {/* Tree Stage Navigator Pill Row */}
        <div style={styles.stageNavRow}>
          {stagesList.map((stg) => {
            const isActive = stage === stg;
            const cfg = STAGE_CONFIGS[stg];
            return (
              <button
                key={stg}
                onClick={() => setStage(stg)}
                style={{
                  ...styles.stageNavButton,
                  backgroundColor: isActive ? colors.foxOrange : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isActive ? colors.foxOrange : 'rgba(255, 255, 255, 0.1)',
                  color: isActive ? '#FFFFFF' : colors.textSecondary,
                }}
              >
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Centered Tree Visualization Canvas */}
        <div style={styles.treeSection}>
          <div style={styles.treeAtmosphereGlow} />

          {/* SVG Tree */}
          <div style={styles.svgWrapper}>
            <svg
              viewBox="0 0 300 280"
              style={styles.svgElement}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#78350F" />
                  <stop offset="50%" stopColor="#92400E" />
                  <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="canopyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="60%" stopColor={stageConfig.canopyColor} />
                  <stop offset="100%" stopColor="#064E3B" />
                </linearGradient>

                <linearGradient id="canopyGradSub" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6EE7B7" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>

                <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#064E3B" />
                  <stop offset="60%" stopColor="#0F1F1C" />
                  <stop offset="100%" stopColor="#0B1514" />
                </linearGradient>

                <radialGradient id="magicFruit" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#FDE047" />
                  <stop offset="80%" stopColor="#FF7A00" />
                </radialGradient>
              </defs>

              {/* Ground Mound / Hill */}
              <ellipse
                cx="150"
                cy="255"
                rx="135"
                ry="22"
                fill="url(#groundGrad)"
                stroke="rgba(16, 185, 129, 0.25)"
                strokeWidth="1.5"
              />

              {/* Tree Roots Base */}
              {stage !== 'seed' && (
                <path
                  d="M130 240 Q150 236 170 240 L176 250 Q150 246 124 250 Z"
                  fill="#78350F"
                  opacity="0.8"
                />
              )}

              {/* Seed Visualization */}
              {stage === 'seed' && (
                <g>
                  {/* Glowing seed halo */}
                  <circle cx="150" cy="242" r="14" fill="rgba(255, 122, 0, 0.25)" />
                  {/* Seed body */}
                  <ellipse cx="150" cy="242" rx="9" ry="6" fill="#F59E0B" />
                  <path
                    d="M149 236 Q151 228 155 226"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle cx="155" cy="226" r="3" fill="#34D399" />
                </g>
              )}

              {/* Animated Tree Trunk */}
              {stage !== 'seed' && (
                <motion.rect
                  x={stageConfig.trunkX}
                  y={stageConfig.trunkY}
                  width={stageConfig.trunkWidth}
                  height={stageConfig.trunkHeight}
                  rx={stageConfig.trunkWidth > 12 ? 6 : 3}
                  fill="url(#trunkGrad)"
                  initial={{ height: 0, y: 240 }}
                  animate={{
                    height: stageConfig.trunkHeight,
                    y: stageConfig.trunkY,
                    x: stageConfig.trunkX,
                    width: stageConfig.trunkWidth,
                  }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                />
              )}

              {/* Tree Branches for larger stages */}
              {(stage === 'young_tree' || stage === 'mature_tree' || stage === 'flowering') && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {/* Left branch */}
                  <path
                    d="M140 160 Q115 140 102 145"
                    stroke="#78350F"
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Right branch */}
                  <path
                    d="M160 150 Q185 135 198 140"
                    stroke="#78350F"
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                  />
                </motion.g>
              )}

              {/* Animated Canopy */}
              {stage !== 'seed' && (
                <motion.g
                  animate={{
                    y: [0, -3, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: 'easeInOut',
                  }}
                >
                  {/* Main Canopy Ellipse */}
                  <motion.ellipse
                    cx={stageConfig.canopyCx}
                    cy={stageConfig.canopyCy}
                    rx={stageConfig.canopyRx}
                    ry={stageConfig.canopyRy}
                    fill="url(#canopyGrad)"
                    initial={{ rx: 0, ry: 0, opacity: 0 }}
                    animate={{
                      rx: stageConfig.canopyRx,
                      ry: stageConfig.canopyRy,
                      cy: stageConfig.canopyCy,
                      cx: stageConfig.canopyCx,
                      opacity: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  />

                  {/* Secondary lush top highlight */}
                  {stageConfig.canopyRx > 30 && (
                    <motion.ellipse
                      cx={stageConfig.canopyCx - 8}
                      cy={stageConfig.canopyCy - stageConfig.canopyRy * 0.25}
                      rx={stageConfig.canopyRx * 0.65}
                      ry={stageConfig.canopyRy * 0.55}
                      fill="url(#canopyGradSub)"
                      opacity="0.75"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    />
                  )}

                  {/* Flowering Magic Blossoms and Fruit */}
                  {stage === 'flowering' && (
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <circle cx="110" cy="50" r="7" fill="url(#magicFruit)" />
                      <circle cx="180" cy="55" r="8" fill="url(#magicFruit)" />
                      <circle cx="145" cy="30" r="6" fill="url(#magicFruit)" />
                      <circle cx="85" cy="80" r="6" fill="url(#magicFruit)" />
                      <circle cx="215" cy="75" r="7" fill="url(#magicFruit)" />
                      <circle cx="150" cy="85" r="6.5" fill="url(#magicFruit)" />

                      {/* Small flower stars */}
                      <circle cx="125" cy="70" r="3.5" fill="#FFFFFF" />
                      <circle cx="170" cy="95" r="3" fill="#FFFFFF" />
                      <circle cx="135" cy="110" r="3" fill="#FFFFFF" />
                    </motion.g>
                  )}
                </motion.g>
              )}

              {/* Fireflies / Magic Dust */}
              <circle cx="70" cy="120" r="2" fill="#FDE047" opacity="0.8" />
              <circle cx="230" cy="110" r="2" fill="#FDE047" opacity="0.7" />
              <circle cx="190" cy="180" r="1.5" fill="#6EE7B7" opacity="0.9" />
              <circle cx="95" cy="200" r="1.5" fill="#6EE7B7" opacity="0.9" />
            </svg>
          </div>

          {/* Current Stage Title & Description */}
          <div style={styles.stageDescriptionBox}>
            <div style={styles.stageTitleRow}>
              <span style={styles.stageNameText}>Стадия: {stageConfig.label}</span>
              <span style={styles.stageLevelPill}>Ур. {stageConfig.level}</span>
            </div>
            <p style={styles.stageDescText}>{stageConfig.description}</p>
          </div>

          {/* Progress Bar Below Tree */}
          <div style={styles.progressSection}>
            <div style={styles.progressLabelRow}>
              <span style={styles.progressPointsText}>
                {currentPoints.toLocaleString('ru-RU')} / {targetPoints.toLocaleString('ru-RU')} очков до следующего уровня
              </span>
              <span style={styles.progressPctText}>{progressPercent}%</span>
            </div>

            <div style={styles.progressTrack}>
              <motion.div
                style={styles.progressBar}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIconBox}>
              <Target size={20} color={colors.emeraldGreen} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Викторин за неделю</span>
              <span style={styles.statValue}>🎯 {weeklyQuizzes}</span>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconBox}>
              <Flame size={20} color={colors.foxOrange} />
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Дней подряд</span>
              <span style={styles.statValue}>🔥 {streakDays}</span>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <section style={styles.achievementsCard}>
          <div style={styles.achievementsHeader}>
            <div style={styles.achievementsTitleGroup}>
              <Trophy size={18} color={colors.foxOrange} />
              <h2 style={styles.achievementsTitle}>Достижения класса</h2>
            </div>
            <span style={styles.achievementsCount}>
              {DEFAULT_ACHIEVEMENTS.filter((a) => a.isUnlocked).length} из{' '}
              {DEFAULT_ACHIEVEMENTS.length}
            </span>
          </div>

          {/* Horizontal Scrollable Row */}
          <div style={styles.achievementsScrollRow}>
            {DEFAULT_ACHIEVEMENTS.map((ach) => {
              return (
                <motion.div
                  key={ach.id}
                  onClick={() => setSelectedAchievement(ach)}
                  style={{
                    ...styles.achievementBadgeCard,
                    border: ach.isUnlocked
                      ? `1.5px solid ${colors.foxOrange}`
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    opacity: ach.isUnlocked ? 1 : 0.45,
                    filter: ach.isUnlocked ? 'none' : 'grayscale(100%)',
                    boxShadow: ach.isUnlocked ? shadows.glow(colors.foxOrange) : 'none',
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={styles.badgeIconWrapper}>
                    <span style={styles.badgeEmoji}>{ach.icon}</span>
                    {!ach.isUnlocked && (
                      <div style={styles.lockOverlay}>
                        <Lock size={16} color="#FFFFFF" />
                      </div>
                    )}
                  </div>
                  <div style={styles.badgeTitle}>{ach.title}</div>
                  <div style={styles.badgeStatus}>
                    {ach.isUnlocked ? (
                      <span style={{ color: colors.foxOrange }}>Открыто</span>
                    ) : (
                      <span style={{ color: colors.textMuted }}>Заблокировано</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Achievement Detail modal/sheet */}
          <AnimatePresence>
            {selectedAchievement && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={styles.achievementDetailCard}
              >
                <div style={styles.achievementDetailContent}>
                  <span style={styles.detailEmoji}>{selectedAchievement.icon}</span>
                  <div>
                    <h3 style={styles.detailTitle}>{selectedAchievement.title}</h3>
                    <p style={styles.detailDesc}>{selectedAchievement.description}</p>
                    {selectedAchievement.isUnlocked ? (
                      <span style={styles.unlockedDate}>
                        Получено: {selectedAchievement.unlockedDate}
                      </span>
                    ) : (
                      <span style={styles.lockedHint}>
                        Сыграйте викторину с классом для разблокировки
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  style={styles.closeDetailBtn}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Mascot Mascot Card at bottom */}
        <div style={styles.mascotGroveCard}>
          <img
            src="/assets/mascot/celebrate.png"
            alt="Спринт"
            style={styles.mascotGroveImg}
          />
          <div style={styles.mascotGroveText}>
            <div style={styles.mascotGroveTitle}>Спринт заботится о роще!</div>
            <div style={styles.mascotGroveDesc}>
              Сыграйте еще одну викторину сегодня, чтобы добавить <strong>+500 капель росы</strong>{' '}
              и приблизить переход на следующий уровень.
            </div>
          </div>
          <ChevronRight size={20} color={colors.textSecondary} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.bgPrimary,
    background: 'linear-gradient(180deg, #0D1322 0%, #0F1B2E 50%, #0A2219 100%)',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: `${spacing.lg}px ${spacing.md}px ${spacing.xxxl}px`,
    boxSizing: 'border-box',
    color: colors.textPrimary,
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
    alignItems: 'center',
    textAlign: 'center',
    gap: spacing.xs,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  groveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.emeraldGreenLight,
    border: `1px solid rgba(16, 185, 129, 0.3)`,
    padding: '4px 10px',
    borderRadius: borderRadius.pill,
    fontSize: 12,
    color: colors.emeraldGreen,
    fontWeight: 600,
  },
  stageIndicator: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '4px 8px',
    borderRadius: borderRadius.pill,
  },
  classNameTitle: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.02em',
    color: colors.textPrimary,
  },
  classSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: 380,
    lineHeight: 1.4,
  },
  stageNavRow: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 4,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  stageNavButton: {
    border: '1px solid',
    borderRadius: borderRadius.pill,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: transitions.fast,
  },
  treeSection: {
    position: 'relative',
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.xl,
    padding: `${spacing.md}px ${spacing.md}px ${spacing.lg}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: shadows.card,
    overflow: 'hidden',
  },
  treeAtmosphereGlow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 260,
    height: 180,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(13, 19, 34, 0) 70%)',
    pointerEvents: 'none',
  },
  svgWrapper: {
    width: '100%',
    maxWidth: 340,
    height: 250,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgElement: {
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
  stageDescriptionBox: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    zIndex: 2,
  },
  stageTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stageNameText: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  stageLevelPill: {
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: colors.emeraldGreenLight,
    color: colors.emeraldGreen,
    padding: '2px 8px',
    borderRadius: borderRadius.pill,
  },
  stageDescText: {
    fontSize: 12,
    color: colors.textSecondary,
    margin: `${spacing.xs}px 0 0`,
    lineHeight: 1.4,
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: `0 ${spacing.sm}px`,
    boxSizing: 'border-box',
    zIndex: 2,
  },
  progressLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
  },
  progressPointsText: {
    fontWeight: 600,
    color: colors.textPrimary,
  },
  progressPctText: {
    fontWeight: 700,
    color: colors.emeraldGreen,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
    borderRadius: borderRadius.pill,
    boxShadow: shadows.glow(colors.emeraldGreen),
  },
  statsRow: {
    display: 'flex',
    gap: spacing.md,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    boxShadow: shadows.card,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  achievementsCard: {
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  achievementsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementsTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: colors.textPrimary,
  },
  achievementsCount: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.foxOrange,
    backgroundColor: colors.foxOrangeLight,
    padding: '3px 8px',
    borderRadius: borderRadius.pill,
  },
  achievementsScrollRow: {
    display: 'flex',
    gap: spacing.md,
    overflowX: 'auto',
    paddingBottom: spacing.sm,
    WebkitOverflowScrolling: 'touch',
  },
  achievementBadgeCard: {
    flex: '0 0 115px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: spacing.xs,
    cursor: 'pointer',
    userSelect: 'none',
  },
  badgeIconWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: borderRadius.pill,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textPrimary,
    lineHeight: 1.2,
    height: 28,
    display: 'flex',
    alignItems: 'center',
  },
  badgeStatus: {
    fontSize: 10,
    fontWeight: 500,
  },
  achievementDetailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  achievementDetailContent: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailEmoji: {
    fontSize: 28,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: 0,
    color: colors.textPrimary,
  },
  detailDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    margin: '3px 0',
  },
  unlockedDate: {
    fontSize: 11,
    color: colors.foxOrange,
    fontWeight: 600,
  },
  lockedHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  closeDetailBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    cursor: 'pointer',
    padding: 4,
    fontSize: 14,
  },
  mascotGroveCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardSurface,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.card,
  },
  mascotGroveImg: {
    width: 54,
    height: 54,
    objectFit: 'contain',
    flexShrink: 0,
  },
  mascotGroveText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  mascotGroveTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.foxOrange,
  },
  mascotGroveDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 1.4,
  },
};
