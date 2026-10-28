import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Flame, Award, Droplets, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import { haptics } from '../services/haptics';

interface AchievementItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
  progress?: string;
}


export interface StudentStatsProps {
  onBack?: () => void;
  xp?: number;
  acorns?: number;
  streak?: number;
  quizzesCount?: number;
  accuracy?: number | null;
}

export default function StudentStats({
  onBack,
  xp: propXp,
  acorns: propAcorns,
  streak: propStreak,
  quizzesCount: propQuizzesCount,
  accuracy: propAccuracy,
}: StudentStatsProps) {
  // Read real persisted student state or default to fresh zero-account
  const xp = propXp ?? Number(localStorage.getItem('lisquiz_student_xp') || '0');
  const acorns = propAcorns ?? Number(localStorage.getItem('lisquiz_student_acorns') || '0');
  const streak = propStreak ?? Number(localStorage.getItem('lisquiz_student_streak') || '0');
  const quizzesCount = propQuizzesCount ?? Number(localStorage.getItem('lisquiz_student_quizzes') || '0');
  const accuracy = propAccuracy ?? (quizzesCount > 0 ? 85 : null);

  const achievements: AchievementItem[] = [
    {
      id: '1',
      icon: '🌱',
      title: 'Первый росток',
      desc: 'Сыграй свою первую школьную викторину',
      unlocked: quizzesCount >= 1,
      progress: `${quizzesCount} из 1`,
    },
    {
      id: '2',
      icon: '⚡',
      title: 'Быстрый Лис',
      desc: 'Ответь правильно и набери 200 XP',
      unlocked: xp >= 200,
      progress: `${xp} из 200 XP`,
    },
    {
      id: '3',
      icon: '🌰',
      title: 'Запас желудей',
      desc: 'Собери 50 лесных желудей за правильные ответы',
      unlocked: acorns >= 50,
      progress: `${acorns} из 50 🌰`,
    },
    {
      id: '4',
      icon: '🔥',
      title: 'Горящий стрик',
      desc: 'Удерживай серию викторин 3 дня подряд',
      unlocked: streak >= 3,
      progress: `${streak} из 3 дн.`,
    },
    {
      id: '5',
      icon: '🌿',
      title: 'Страж Дубрав',
      desc: 'Набери 600 XP и перейди в Серебряный дивизион',
      unlocked: xp >= 600,
      progress: `${xp} из 600 XP`,
    },
    {
      id: '6',
      icon: '👑',
      title: 'Совет Рощи',
      desc: 'Набери 1 500 XP и войди в высший Золотой совет',
      unlocked: xp >= 1500,
      progress: `${xp} из 1 500 XP`,
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const energyPercent = Math.min(100, Math.round((xp / 2000) * 100));

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button
              onClick={() => {
                haptics.selection();
                onBack();
              }}
              style={styles.backBtn}
              title="Назад на главную"
            >
              <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
            </button>
          )}
          <h1 style={styles.headerTitle}>Статистика и достижения</h1>
        </div>
      </header>

      {/* Hero KPI Grid */}
      <div style={styles.kpiGrid}>
        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapOrange}>
            <Zap size={18} color="#FF7A00" />
          </div>
          <span style={styles.kpiValue}>{xp}</span>
          <span style={styles.kpiLabel}>Очков опыта (XP)</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapGreen}>
            <Target size={18} color="#10B981" />
          </div>
          <span style={styles.kpiValue}>{accuracy !== null ? `${accuracy}%` : '—'}</span>
          <span style={styles.kpiLabel}>Точность ответов</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapAmber}>
            <Flame size={18} color="#F59E0B" />
          </div>
          <span style={styles.kpiValue}>{streak} дн.</span>
          <span style={styles.kpiLabel}>Стрик активности</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapBlue}>
            <CheckCircle2 size={18} color="#3B82F6" />
          </div>
          <span style={styles.kpiValue}>{quizzesCount}</span>
          <span style={styles.kpiLabel}>Викторин пройдено</span>
        </motion.div>
      </div>

      {/* Class Grove Contribution Card */}
      <div style={styles.groveContributionCard}>
        <div style={styles.groveHeader}>
          <div style={styles.groveTitleRow}>
            <Droplets size={16} color="#34D399" />
            <span style={styles.groveTitle}>Твой вклад в Рощу класса</span>
          </div>
          <span style={styles.grovePercentBadge}>{energyPercent}% энергии</span>
        </div>

        <p style={styles.groveText}>
          {xp > 0
            ? 'Благодаря твоим правильным ответам Волшебный Дуб распускает новые золотые листья!'
            : 'Сыграй свою первую викторину, чтобы направить живительную энергию Древу Знаний!'}
        </p>

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.max(4, energyPercent)}%` }} />
        </div>
      </div>

      {/* Achievements Section */}
      <div style={styles.achievementsSection}>
        <div style={styles.achievementsHeader}>
          <Award size={16} color="#F59E0B" />
          <span style={styles.sectionTitle}>
            Достижения и значки ({unlockedCount} из {achievements.length})
          </span>
        </div>

        <div style={styles.achievementsList}>
          {achievements.map((a) => (
            <motion.div
              key={a.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => haptics.selection()}
              style={{
                ...styles.achievementCard,
                opacity: a.unlocked ? 1 : 0.65,
                borderColor: a.unlocked ? '#10B981' : '#283756',
              }}
            >
              <div style={styles.badgeEmoji}>{a.icon}</div>
              <div style={styles.badgeInfo}>
                <div style={styles.badgeTitleRow}>
                  <span style={styles.badgeTitle}>{a.title}</span>
                  {a.unlocked ? (
                    <span style={styles.unlockedTag}>Получено</span>
                  ) : (
                    <span style={styles.progressTag}>
                      <Lock size={10} style={{ marginRight: 3 }} />
                      {a.progress}
                    </span>
                  )}
                </div>
                <p style={styles.badgeDesc}>{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
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
    backgroundColor: 'transparent',
    padding: '14px 14px 92px',
    boxSizing: 'border-box',
    gap: 14,
    overflowY: 'auto',
    overflowX: 'hidden',
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
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  kpiCard: {
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '4px solid #1E2B45',
    borderRadius: 20,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  kpiIconWrapOrange: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 122, 0, 0.22)',
    border: '1.5px solid rgba(255, 122, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapGreen: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    border: '1.5px solid rgba(16, 185, 129, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapAmber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    border: '1.5px solid rgba(245, 158, 11, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapBlue: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    border: '1.5px solid rgba(59, 130, 246, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 900,
    color: '#FFFFFF',
    lineHeight: 1.1,
    letterSpacing: '-0.3px',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
    fontWeight: 700,
  },
  groveContributionCard: {
    backgroundColor: '#10232E',
    border: '2px solid #1B4A3C',
    borderBottom: '4px solid #14382E',
    borderRadius: 20,
    padding: '16px',
  },
  groveHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groveTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  groveTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: '#34D399',
  },
  grovePercentBadge: {
    fontSize: 11,
    fontWeight: 800,
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    border: '1.5px solid rgba(16, 185, 129, 0.45)',
    padding: '3px 10px',
    borderRadius: 999,
  },
  groveText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 1.45,
    margin: '0 0 12px 0',
    fontWeight: 500,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
    boxShadow: '0 0 10px #10B981',
  },
  achievementsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  achievementsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 900,
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  achievementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  achievementCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '3px solid #1E2B45',
    borderRadius: 16,
    padding: '12px 14px',
    cursor: 'pointer',
  },
  badgeEmoji: {
    fontSize: 28,
    flexShrink: 0,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  unlockedTag: {
    fontSize: 11,
    fontWeight: 800,
    color: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    border: '1.5px solid rgba(16, 185, 129, 0.45)',
    padding: '2px 8px',
    borderRadius: 8,
  },
  progressTag: {
    fontSize: 11,
    fontWeight: 800,
    color: '#CBD5E1',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    padding: '2px 8px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
  },
  badgeDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    margin: 0,
    lineHeight: 1.35,
    fontWeight: 500,
  },
};
