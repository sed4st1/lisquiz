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
  { id: '5', icon: '💎', title: 'Мастер Дробей', desc: 'Реши 15 задач на сложение дробей', unlocked: false, progress: '8/15' },
  { id: '6', icon: '🐾', title: 'Друг Спринта', desc: 'Сыграй 20 викторин в Лисквизе', unlocked: false, progress: '12/20' },
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
          <span style={styles.sectionTitle}>Достижения и значки (4/6)</span>
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
                borderColor: a.unlocked ? 'rgba(255, 122, 0, 0.35)' : 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(22, 32, 53, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
  },
  kpiIconWrapOrange: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapAmber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapBlue: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFFFFF',
    lineHeight: 1.1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: 600,
  },
  groveContributionCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 18,
    padding: '14px',
  },
  groveHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groveTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  groveTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#34D399',
  },
  grovePercentBadge: {
    fontSize: 11,
    fontWeight: 800,
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    padding: '2px 8px',
    borderRadius: 999,
  },
  groveText: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 1.4,
    margin: '0 0 10px 0',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
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
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  achievementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  achievementCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid',
    borderRadius: 14,
    padding: '10px 12px',
    cursor: 'pointer',
  },
  badgeEmoji: {
    fontSize: 26,
    flexShrink: 0,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  unlockedTag: {
    fontSize: 10,
    fontWeight: 700,
    color: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: '2px 6px',
    borderRadius: 6,
  },
  progressTag: {
    fontSize: 10,
    fontWeight: 700,
    color: '#9CA3AF',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: '2px 6px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    margin: 0,
    lineHeight: 1.3,
  },
};
