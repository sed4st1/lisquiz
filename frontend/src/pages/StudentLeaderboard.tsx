import React from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp, Sparkles } from 'lucide-react';
import { haptics } from '../services/haptics';

const CLASS_PLAYERS = [
  { rank: 1, id: 'p_1', name: 'Артём В.', avatar: '🦊', score: 1820, streak: 6, isCurrent: false },
  { rank: 2, id: 'p_2', name: 'София Л.', avatar: '🦉', score: 1570, streak: 4, isCurrent: false },
  { rank: 3, id: 'p_current', name: 'Иван К.', avatar: '🦝', score: 1450, streak: 5, isCurrent: true },
  { rank: 4, id: 'p_4', name: 'Маша К.', avatar: '🦔', score: 1290, streak: 3, isCurrent: false },
  { rank: 5, id: 'p_5', name: 'Дима С.', avatar: '🐻', score: 1180, streak: 2, isCurrent: false },
  { rank: 6, id: 'p_6', name: 'Полина Т.', avatar: '🦊', score: 1040, streak: 4, isCurrent: false },
  { rank: 7, id: 'p_7', name: 'Кирилл М.', avatar: '🦉', score: 960, streak: 1, isCurrent: false },
  { rank: 8, id: 'p_8', name: 'Алина Д.', avatar: '🦔', score: 890, streak: 3, isCurrent: false },
  { rank: 9, id: 'p_9', name: 'Никита Б.', avatar: '🐻', score: 810, streak: 2, isCurrent: false },
  { rank: 10, id: 'p_10', name: 'Лена О.', avatar: '🦊', score: 750, streak: 1, isCurrent: false },
];

export default function StudentLeaderboard() {
  const currentStudent = CLASS_PLAYERS.find((p) => p.isCurrent) || CLASS_PLAYERS[2];
  const pointsToNext = CLASS_PLAYERS[1].score - currentStudent.score;

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Рейтинг класса</h1>
      </header>

      {/* Top Hero Pill: My Place in Class */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.myRankCard}
      >
        <div style={styles.myRankLeft}>
          <div style={styles.myRankNumber}>#{currentStudent.rank}</div>
          <div>
            <div style={styles.myRankTitle}>Твоё место в классе</div>
            <div style={styles.myRankSub}>
              {currentStudent.score} очков, стрик {currentStudent.streak} дней 🔥
            </div>
          </div>
        </div>

        <div style={styles.myRankBadge}>
          <TrendingUp size={16} color="#10B981" />
          <span>Топ-3</span>
        </div>
      </motion.div>

      {/* Motivational Goal Banner */}
      <div style={styles.goalBanner}>
        <Sparkles size={16} color="#F59E0B" />
        <span>До 2-го места осталось всего <b>{pointsToNext} очков</b>! Догоняй 🚀</span>
      </div>

      {/* Podium Top-3 */}
      <div style={styles.podiumWrapper}>
        <div style={styles.podiumContainer}>
          {/* 2nd Place */}
          <div style={styles.podiumColumn}>
            <div style={styles.podiumAvatarWrap}>
              <span>{CLASS_PLAYERS[1].avatar}</span>
            </div>
            <span style={styles.podiumName}>{CLASS_PLAYERS[1].name}</span>
            <span style={styles.podiumScore}>{CLASS_PLAYERS[1].score} б</span>
            <div style={{ ...styles.podiumBlock, ...styles.podiumSilver, height: 72 }}>
              <span style={styles.podiumMedal}>🥈 2</span>
            </div>
          </div>

          {/* 1st Place */}
          <div style={styles.podiumColumn}>
            <div style={styles.crownIcon}>👑</div>
            <div style={{ ...styles.podiumAvatarWrap, ...styles.podiumAvatarGold }}>
              <span style={{ fontSize: 32 }}>{CLASS_PLAYERS[0].avatar}</span>
            </div>
            <span style={{ ...styles.podiumName, fontWeight: 800, color: '#FCD34D' }}>
              {CLASS_PLAYERS[0].name}
            </span>
            <span style={{ ...styles.podiumScore, color: '#FBBF24' }}>
              {CLASS_PLAYERS[0].score} б
            </span>
            <div style={{ ...styles.podiumBlock, ...styles.podiumGold, height: 96 }}>
              <span style={{ ...styles.podiumMedal, fontSize: 14 }}>🥇 1</span>
            </div>
          </div>

          {/* 3rd Place (Current student) */}
          <div style={styles.podiumColumn}>
            <div style={styles.podiumAvatarWrap}>
              <span>{CLASS_PLAYERS[2].avatar}</span>
            </div>
            <span style={{ ...styles.podiumName, color: '#34D399', fontWeight: 800 }}>
              {CLASS_PLAYERS[2].name}
            </span>
            <span style={styles.podiumScore}>{CLASS_PLAYERS[2].score} б</span>
            <div style={{ ...styles.podiumBlock, ...styles.podiumBronze, height: 56 }}>
              <span style={styles.podiumMedal}>🥉 3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Class Ranking List */}
      <div style={styles.listSection}>
        <div style={styles.rankingList}>
          {CLASS_PLAYERS.map((p) => {
            const isMe = p.isCurrent;
            return (
              <motion.div
                key={p.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => haptics.selection()}
                style={{
                  ...styles.rankRow,
                  backgroundColor: isMe ? '#122E28' : '#151F36',
                  borderColor: isMe ? '#1D705B' : '#28385C',
                  borderBottomColor: isMe ? '#134D3E' : '#1B2742',
                }}
              >
                <div style={styles.rankRowLeft}>
                  <div
                    style={{
                      ...styles.rankBadge,
                      color: p.rank <= 3 ? '#F59E0B' : '#9CA3AF',
                    }}
                  >
                    #{p.rank}
                  </div>
                  <span style={styles.avatarEmoji}>{p.avatar}</span>
                  <div style={styles.studentInfoCol}>
                    <span
                      style={{
                        ...styles.studentName,
                        color: isMe ? '#34D399' : '#FFFFFF',
                        fontWeight: isMe ? 900 : 700,
                      }}
                    >
                      {p.name}
                    </span>
                    <div style={styles.streakSubRow}>
                      <Flame size={13} color="#FF7A00" />
                      <span style={styles.streakCount}>{p.streak}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.rankRowRight}>
                  <span style={styles.scoreNumber}>{p.score} б</span>
                </div>
              </motion.div>
            );
          })}
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
    gap: 12,
    overflowY: 'auto',
    overflowX: 'hidden',
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
  myRankCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#132435',
    border: '2px solid #1C4D40',
    borderBottom: '4px solid #11362D',
    borderRadius: 20,
    padding: '14px 16px',
  },
  myRankLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  myRankNumber: {
    fontSize: 28,
    fontWeight: 900,
    color: '#34D399',
    lineHeight: 1,
  },
  myRankTitle: {
    fontSize: 15,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: '-0.2px',
  },
  myRankSub: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 2,
    fontWeight: 600,
  },
  myRankBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    border: '1.5px solid rgba(16, 185, 129, 0.45)',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    color: '#34D399',
  },
  goalBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#18243A',
    border: '1.5px solid rgba(245, 158, 11, 0.35)',
    borderBottom: '4px solid #141C2E',
    borderRadius: 16,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#FEF3C7',
    lineHeight: 1.4,
  },
  podiumWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: '4px 0',
  },
  podiumContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  podiumColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: 104,
  },
  crownIcon: {
    fontSize: 22,
    marginBottom: -6,
    filter: 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.6))',
  },
  podiumAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: '#151F36',
    border: '2px solid rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    marginBottom: 4,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
  },
  podiumAvatarGold: {
    width: 52,
    height: 52,
    border: '2.5px solid #FCD34D',
    boxShadow: '0 0 16px rgba(251, 191, 36, 0.5)',
  },
  podiumName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 700,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 90,
  },
  podiumScore: {
    fontSize: 12,
    fontWeight: 800,
    color: '#E2E8F0',
    marginBottom: 6,
  },
  podiumBlock: {
    width: '100%',
    borderRadius: '16px 16px 4px 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  podiumGold: {
    backgroundColor: '#D97706',
    border: '2px solid #FCD34D',
    borderBottom: '6px solid #78350F',
    boxShadow: '0 8px 24px rgba(217, 119, 6, 0.45)',
  },
  podiumSilver: {
    backgroundColor: '#475569',
    border: '2px solid #94A3B8',
    borderBottom: '6px solid #1E293B',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
  },
  podiumBronze: {
    backgroundColor: '#9A3412',
    border: '2px solid #FB923C',
    borderBottom: '6px solid #431407',
    boxShadow: '0 8px 20px rgba(154, 52, 18, 0.35)',
  },
  podiumMedal: {
    fontSize: 13,
    fontWeight: 900,
    color: '#FFFFFF',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
    letterSpacing: '0.3px',
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  rankRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'solid',
    borderBottomWidth: 3,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  rankRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    fontSize: 13,
    fontWeight: 900,
    width: 22,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  studentInfoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  studentName: {
    fontSize: 15,
    letterSpacing: '-0.2px',
  },
  streakSubRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: 700,
    color: '#FF9E3B',
  },
  rankRowRight: {
    display: 'flex',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 15,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: '-0.2px',
  },
};
