import React from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp, Sparkles, Users } from 'lucide-react';
import { haptics } from '../services/haptics';

const CLASS_PLAYERS = [
  { rank: 1, id: 'p_1', name: 'Артём В.', avatar: '🦊', score: 1820, streak: 6, isCurrent: false },
  { rank: 2, id: 'p_2', name: 'София Л.', avatar: '🦉', score: 1570, streak: 4, isCurrent: false },
  { rank: 3, id: 'p_current', name: 'Иван К. (Ты)', avatar: '🦝', score: 1450, streak: 5, isCurrent: true },
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
      <div style={styles.podiumContainer}>
        {/* 2nd Place */}
        <div style={styles.podiumColumn}>
          <span style={styles.podiumAvatar}>{CLASS_PLAYERS[1].avatar}</span>
          <span style={styles.podiumName}>{CLASS_PLAYERS[1].name}</span>
          <span style={styles.podiumScore}>{CLASS_PLAYERS[1].score} б.</span>
          <div style={{ ...styles.podiumBlock, height: 70, backgroundColor: 'rgba(156, 163, 175, 0.28)' }}>
            <span style={styles.podiumMedal}>🥈 2</span>
          </div>
        </div>

        {/* 1st Place */}
        <div style={styles.podiumColumn}>
          <div style={styles.crownIcon}>👑</div>
          <span style={{ ...styles.podiumAvatar, fontSize: 36 }}>{CLASS_PLAYERS[0].avatar}</span>
          <span style={{ ...styles.podiumName, fontWeight: 800 }}>{CLASS_PLAYERS[0].name}</span>
          <span style={styles.podiumScore}>{CLASS_PLAYERS[0].score} б.</span>
          <div style={{ ...styles.podiumBlock, height: 95, backgroundColor: 'rgba(245, 158, 11, 0.32)' }}>
            <span style={styles.podiumMedal}>🥇 1</span>
          </div>
        </div>

        {/* 3rd Place (Current student) */}
        <div style={styles.podiumColumn}>
          <span style={styles.podiumAvatar}>{CLASS_PLAYERS[2].avatar}</span>
          <span style={{ ...styles.podiumName, color: '#34D399', fontWeight: 800 }}>
            {CLASS_PLAYERS[2].name}
          </span>
          <span style={styles.podiumScore}>{CLASS_PLAYERS[2].score} б.</span>
          <div style={{ ...styles.podiumBlock, height: 55, backgroundColor: 'rgba(217, 119, 6, 0.28)' }}>
            <span style={styles.podiumMedal}>🥉 3</span>
          </div>
        </div>
      </div>

      {/* Full Class Ranking List */}
      <div style={styles.listSection}>
        <div style={styles.listHeader}>
          <span>Рейтинг 5А класса ({CLASS_PLAYERS.length} учеников)</span>
          <Users size={14} color="#9CA3AF" />
        </div>

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
                  backgroundColor: isMe ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.05)',
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
                  <div style={styles.studentInfo}>
                    <span style={{ ...styles.studentName, color: isMe ? '#34D399' : '#FFFFFF', fontWeight: isMe ? 800 : 600 }}>
                      {p.name}
                    </span>
                    {p.streak > 1 && (
                      <span style={styles.streakTag}>
                        <Flame size={10} color="#F59E0B" />
                        <span>x{p.streak}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div style={styles.rankRowRight}>
                  <span style={styles.scoreNumber}>{p.score} б.</span>
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
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '14px 14px 18px',
    boxSizing: 'border-box',
    gap: 12,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  myRankCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    border: 'none',
    borderRadius: 18,
    padding: '12px 14px',
    boxShadow: 'none',
  },
  myRankLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  myRankNumber: {
    fontSize: 26,
    fontWeight: 900,
    color: '#34D399',
    lineHeight: 1,
  },
  myRankTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  myRankSub: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 2,
  },
  myRankBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color: '#34D399',
  },
  goalBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    border: 'none',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 12,
    color: '#FDE68A',
    boxShadow: 'none',
  },
  podiumContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    padding: '8px 4px 4px',
  },
  podiumColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: 96,
  },
  crownIcon: {
    fontSize: 16,
    marginBottom: -4,
  },
  podiumAvatar: {
    fontSize: 30,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 80,
  },
  podiumScore: {
    fontSize: 11,
    fontWeight: 700,
    color: '#F59E0B',
    marginBottom: 4,
  },
  podiumBlock: {
    width: '100%',
    borderRadius: '12px 12px 6px 6px',
    border: 'none',
    boxShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumMedal: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    padding: '0 4px',
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  rankRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 14,
    border: 'none',
    boxShadow: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  rankRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    fontSize: 13,
    fontWeight: 800,
    width: 24,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    fontSize: 13,
  },
  streakTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    padding: '2px 5px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    color: '#F59E0B',
  },
  rankRowRight: {
    display: 'flex',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
  },
};
