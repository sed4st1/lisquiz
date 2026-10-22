import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Flame, Award, Droplets, CheckCircle2, Lock } from 'lucide-react';
import { haptics } from '../services/haptics';

interface AchievementItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
  progress?: string;
}

const ACHIEVEMENTS: AchievementItem[] = [
  { id: '1', icon: '🌳', title: 'Хранитель Рощи', desc: 'Полил Древо Знаний 5 дней подряд', unlocked: true },
  { id: '2', icon: '⚡', title: 'Быстрый Лис', desc: 'Ответил верно быстрее чем за 3 секунды', unlocked: true },
  { id: '3', icon: '🦉', title: 'Мудрая Сова', desc: 'Серия из 10 правильных ответов', unlocked: true },
  { id: '4', icon: '👑', title: 'Топ-3 Класса', desc: 'Вошел в тройку лидеров викторины', unlocked: true },
  { id: '5', icon: '💎', title: 'Мастер Дробей', desc: 'Реши 15 задач на сложение дробей', unlocked: false, progress: '8 из 15' },
  { id: '6', icon: '🐾', title: 'Друг Спринта', desc: 'Сыграй 20 викторин в Лисквизе', unlocked: false, progress: '12 из 20' },
];

export default function StudentStats() {
  return (
    <div style={styles.container}>
      {/* Hero KPI Grid */}
      <div style={styles.kpiGrid}>
        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapOrange}>
            <Zap size={18} color="#FF7A00" />
          </div>
          <span style={styles.kpiValue}>1 450</span>
          <span style={styles.kpiLabel}>Очков набрано</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapGreen}>
            <Target size={18} color="#10B981" />
          </div>
          <span style={styles.kpiValue}>88%</span>
          <span style={styles.kpiLabel}>Точность ответов</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapAmber}>
            <Flame size={18} color="#F59E0B" />
          </div>
          <span style={styles.kpiValue}>5 дней</span>
          <span style={styles.kpiLabel}>Стрик активности</span>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={styles.kpiCard}>
          <div style={styles.kpiIconWrapBlue}>
            <CheckCircle2 size={18} color="#3B82F6" />
          </div>
          <span style={styles.kpiValue}>42</span>
          <span style={styles.kpiLabel}>Вопросов решено</span>
        </motion.div>
      </div>

      {/* Class Grove Contribution Card */}
      <div style={styles.groveContributionCard}>
        <div style={styles.groveHeader}>
          <div style={styles.groveTitleRow}>
            <Droplets size={16} color="#34D399" />
            <span style={styles.groveTitle}>Твой вклад в Рощу класса</span>
          </div>
          <span style={styles.grovePercentBadge}>18% энергии</span>
        </div>

        <p style={styles.groveText}>
          Благодаря твоим правильным ответам Волшебный Дуб распустил 4 новых золотых листа!
        </p>

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: '72%' }} />
        </div>
      </div>

      {/* Achievements Section */}
      <div style={styles.achievementsSection}>
        <div style={styles.achievementsHeader}>
          <Award size={16} color="#F59E0B" />
          <span style={styles.sectionTitle}>Достижения и значки (4 из 6)</span>
        </div>

        <div style={styles.achievementsList}>
          {ACHIEVEMENTS.map((a) => (
            <motion.div
              key={a.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => haptics.selection()}
              style={{
                ...styles.achievementCard,
                opacity: a.unlocked ? 1 : 0.6,
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
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '14px 14px 20px',
    boxSizing: 'border-box',
    gap: 14,
    overflowY: 'auto',
    overflowX: 'hidden',
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
