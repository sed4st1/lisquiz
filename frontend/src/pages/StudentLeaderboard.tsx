import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Sparkles, Crown, Star } from 'lucide-react';
import { haptics } from '../services/haptics';
import { groveApi, LeaderboardData, StudentContribution } from '../services/groveApi';

const AVATAR_MAP: Record<string, string> = {
  bear: '/assets/avatars/students/bear.png',
  bunny: '/assets/avatars/students/bunny.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  squirrel: '/assets/avatars/students/squirrel.png',
};

export interface StudentLeaderboardProps {
  boostPoints?: number | null;
  boostRank?: number | null;
  onClearBoost?: () => void;
}

export default function StudentLeaderboard({
  boostPoints,
  boostRank,
  onClearBoost,
}: StudentLeaderboardProps = {}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [showBoost, setShowBoost] = useState<boolean>(Boolean(boostPoints && boostPoints > 0));

  useEffect(() => {
    if (boostPoints && boostPoints > 0) {
      setShowBoost(true);
      const timer = setTimeout(() => {
        setShowBoost(false);
      }, 4500);
      return () => clearTimeout(timer);
    } else {
      setShowBoost(false);
    }
  }, [boostPoints]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await groveApi.getWeeklyLeaderboard('class_7a');
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      }
    };
    fetchLeaderboard();
  }, []);

  const allStudents: StudentContribution[] = [
    ...(leaderboard?.divisions.council_of_groves || []),
    ...(leaderboard?.divisions.forest_guardians || []),
    ...(leaderboard?.divisions.sprout_keepers || []),
  ].sort((a, b) => a.rank - b.rank);

  // Fallback if empty
  const currentStudent = allStudents.find((s) => s.student_id === 'std_ivan') || allStudents[2] || {
    student_id: 'std_ivan',
    student_name: 'Иван К (Ты)',
    avatar: 'raccoon',
    rank: 3,
    weekly_xp: 1450,
    prev_week_xp: 900,
    total_xp: 3200,
    delta_xp: 550,
    flair: 'top3_emerald',
    flair_title: '🥈 Призер Недели',
    division: 'council_of_groves',
    division_title: '👑 Совет Дубрав',
    division_role: '☀️ Поставщик Солнечного Света',
  };

  const top1 = leaderboard?.mvp_top1 || allStudents[0];
  const top2 = allStudents[1];
  const top3 = allStudents[2];
  const mostImproved = leaderboard?.most_improved;

  const getAvatarSrc = (avatar: string) => {
    return AVATAR_MAP[avatar] || AVATAR_MAP.raccoon;
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Рейтинг и дивизионы недели</h1>
      </header>

      {/* Temporary Animated Rank Growth Notification Banner */}
      <AnimatePresence onExitComplete={onClearBoost}>
        {showBoost && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', y: 0, marginBottom: 14 }}
            exit={{
              opacity: 0,
              height: 0,
              y: -8,
              paddingTop: 0,
              paddingBottom: 0,
              marginTop: 0,
              marginBottom: 0,
              borderWidth: 0,
            }}
            transition={{
              duration: 0.55,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              ...styles.rankBoostBanner,
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div style={styles.rankBoostLeft}>
              <div style={styles.rankBoostIconBox}>
                <TrendingUp size={16} color="#34D399" />
              </div>
              <div style={styles.rankBoostTextCol}>
                <span style={styles.rankBoostTitle}>Рейтинг обновлен</span>
                <span style={styles.rankBoostDesc}>
                  {boostRank
                    ? `${boostRank}-е место в викторине`
                    : currentStudent?.rank
                    ? `${currentStudent.rank}-е место в классе`
                    : 'Отличный результат!'}
                </span>
              </div>
            </div>
            <span style={styles.rankDeltaPill}>+{boostPoints || 150} XP</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero: My Rank in Class */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.myRankCard}
      >
        <div style={styles.myRankLeft}>
          <div style={styles.myRankNumber}>#{currentStudent.rank}</div>
          <div style={styles.myRankInfo}>
            <div style={styles.myRankTitle}>{currentStudent.student_name}</div>
            <div style={styles.myRankSub}>
              {currentStudent.weekly_xp} очков на этой неделе
            </div>
          </div>
        </div>

        <div style={styles.myRankBadge}>
          <TrendingUp size={15} color="#34D399" />
          <span>{currentStudent.rank <= 3 ? 'Топ 3' : 'В игре'}</span>
        </div>
      </motion.div>

      {/* Most Improved Award Card (Прорыв недели) */}
      {mostImproved && (
        <div style={styles.mostImprovedCard}>
          <div style={styles.mostImprovedIcon}>
            <Star size={18} color="#F59E0B" fill="#F59E0B" />
          </div>
          <div style={styles.mostImprovedContent}>
            <span style={styles.mostImprovedTitle}>Прорыв недели</span>
            <span style={styles.mostImprovedDesc}>
              <b>{mostImproved.student_name}</b> показал максимальный рост: +{mostImproved.delta_xp} очков
            </span>
          </div>
        </div>
      )}

      {/* Podium Top-3 */}
      {top1 && top2 && top3 && (
        <div style={styles.podiumWrapper}>
          <div style={styles.podiumContainer}>
            {/* 2nd Place */}
            <div style={styles.podiumColumn}>
              <div style={styles.podiumAvatarEmerald}>
                <img
                  src={getAvatarSrc(top2.avatar)}
                  alt={top2.student_name}
                  style={styles.avatarImg}
                />
              </div>
              <span style={styles.podiumName}>{top2.student_name}</span>
              <span style={styles.podiumScore}>{top2.weekly_xp} б</span>
              <div style={{ ...styles.podiumBlock, ...styles.podiumSilver, height: 70 }}>
                <span style={styles.podiumMedal}>🥈 2</span>
              </div>
            </div>

            {/* 1st Place with Crown and '1' */}
            <div style={styles.podiumColumn}>
              <Crown size={22} color="#F59E0B" style={{ marginBottom: 2 }} />
              <div style={styles.podiumAvatarGold}>
                <img
                  src={getAvatarSrc(top1.avatar)}
                  alt={top1.student_name}
                  style={styles.avatarImg}
                />
              </div>
              <span style={{ ...styles.podiumName, fontWeight: 900, color: '#FCD34D' }}>
                {top1.student_name}
              </span>
              <span style={{ ...styles.podiumScore, color: '#FBBF24' }}>
                {top1.weekly_xp} б
              </span>
              <div style={{ ...styles.podiumBlock, ...styles.podiumGold, height: 95 }}>
                <span style={{ ...styles.podiumMedal, fontSize: 14 }}>👑 1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div style={styles.podiumColumn}>
              <div style={styles.podiumAvatarEmerald}>
                <img
                  src={getAvatarSrc(top3.avatar)}
                  alt={top3.student_name}
                  style={styles.avatarImg}
                />
              </div>
              <span style={{ ...styles.podiumName, color: '#34D399', fontWeight: 800 }}>
                {top3.student_name}
              </span>
              <span style={styles.podiumScore}>{top3.weekly_xp} б</span>
              <div style={{ ...styles.podiumBlock, ...styles.podiumBronze, height: 55 }}>
                <span style={styles.podiumMedal}>🥉 3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Division Role Explain Banner (Закон Либиха) */}
      <div style={styles.divisionExplainer}>
        <span>🌿 <b>Закон Либиха:</b> класс побеждает только когда все три дивизиона работают вместе</span>
      </div>

      {/* Ranking List */}
      <div style={styles.rankingList}>
        {allStudents.map((s) => {
          const isMe = s.student_id === 'std_ivan';
          const isMvp = s.rank === 1;
          const isTop3 = s.rank === 2 || s.rank === 3;
          const isMostImproved = mostImproved?.student_id === s.student_id;

          return (
            <motion.div
              key={s.student_id}
              whileTap={{ scale: 0.98 }}
              onClick={() => haptics.selection()}
              style={{
                ...styles.rankRow,
                backgroundColor: isMe ? '#143128' : '#152033',
              }}
            >
              <div style={styles.rankRowLeft}>
                <div
                  style={{
                    ...styles.rankBadge,
                    color: s.rank <= 3 ? '#F59E0B' : '#94A3B8',
                  }}
                >
                  #{s.rank}
                </div>

                {/* Avatar with Flair Border */}
                <div
                  style={{
                    ...styles.avatarWrapper,
                    border: isMvp
                      ? '2.5px solid #FCD34D'
                      : isTop3
                      ? '2px solid #34D399'
                      : '1.5px solid transparent',
                  }}
                >
                  <img
                    src={getAvatarSrc(s.avatar)}
                    alt={s.student_name}
                    style={styles.avatarImg}
                  />
                  {isMvp && <span style={styles.miniCrown}>👑</span>}
                </div>

                <div style={styles.studentInfoCol}>
                  <div style={styles.nameRow}>
                    <span
                      style={{
                        ...styles.studentName,
                        color: isMe ? '#34D399' : '#FFFFFF',
                        fontWeight: isMe ? 900 : 700,
                      }}
                    >
                      {s.student_name}
                    </span>
                    {isMostImproved && (
                      <span style={styles.mostImprovedBadge} title="Прорыв недели">
                        🌟 +{s.delta_xp}
                      </span>
                    )}
                  </div>

                  <span style={styles.divisionSubTitle}>
                    {s.division === 'council_of_groves'
                      ? '👑 Совет Дубрав'
                      : s.division === 'forest_guardians'
                      ? '🛡️ Лесные Стражи'
                      : '🌱 Хранители Ростков'}
                  </span>
                </div>
              </div>

              <div style={styles.rankRowRight}>
                <span style={styles.scoreNumber}>{s.weekly_xp} б</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fresh Start Notice Banner */}
      <div style={styles.freshStartCard}>
        <Sparkles size={16} color="#A78BFA" />
        <span style={styles.freshStartText}>
          Каждое воскресенье в 23:59 недельный счет обнуляется. Все карточки, титулы и общий опыт сохраняются.
        </span>
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
    padding: '12px 14px 90px',
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
  rankBoostBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    border: '1.5px solid rgba(52, 211, 153, 0.45)',
    borderRadius: 18,
    padding: '13px 16px',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
  },
  rankBoostLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  rankBoostIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankBoostTextCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  rankBoostTitle: {
    fontSize: 12.5,
    fontWeight: 900,
    color: '#34D399',
  },
  rankBoostDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: 600,
  },
  rankDeltaPill: {
    backgroundColor: '#065F46',
    color: '#34D399',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 900,
    border: '1px solid rgba(52, 211, 153, 0.5)',
  },
  myRankCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: '14px 16px',
  },
  myRankLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  myRankNumber: {
    fontSize: 26,
    fontWeight: 900,
    color: '#34D399',
    lineHeight: 1,
  },
  myRankInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  myRankTitle: {
    fontSize: 15,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  myRankSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 600,
  },
  myRankBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 800,
    color: '#34D399',
  },
  mostImprovedCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: '10px 14px',
  },
  mostImprovedIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostImprovedContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  mostImprovedTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FCD34D',
  },
  mostImprovedDesc: {
    fontSize: 11.5,
    color: '#CBD5E1',
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
  podiumAvatarEmerald: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: '#064E3B',
    border: '2px solid #34D399',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  podiumAvatarGold: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    backgroundColor: '#78350F',
    border: '2.5px solid #FCD34D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  avatarImg: {
    width: '88%',
    height: '88%',
    objectFit: 'contain',
  },
  podiumName: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: 700,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 88,
  },
  podiumScore: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#E2E8F0',
    marginBottom: 6,
  },
  podiumBlock: {
    width: '100%',
    borderRadius: '14px 14px 4px 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  podiumGold: {
    backgroundColor: '#B45309',
  },
  podiumSilver: {
    backgroundColor: '#334155',
  },
  podiumBronze: {
    backgroundColor: '#854D0E',
  },
  podiumMedal: {
    fontSize: 12.5,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  tabsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  tabBtn: {
    border: 'none',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    touchAction: 'manipulation',
  },
  divisionExplainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 1.35,
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
    cursor: 'pointer',
  },
  rankRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    fontSize: 13,
    fontWeight: 900,
    width: 20,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  miniCrown: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 12,
  },
  studentInfoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    fontSize: 14,
  },
  mostImprovedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    color: '#FCD34D',
    fontSize: 10.5,
    fontWeight: 800,
    borderRadius: 6,
    padding: '1px 6px',
  },
  divisionSubTitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 500,
  },
  rankRowRight: {
    display: 'flex',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 14.5,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  freshStartCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: '10px 12px',
    marginTop: 4,
  },
  freshStartText: {
    fontSize: 11,
    color: '#A78BFA',
    lineHeight: 1.35,
    fontWeight: 500,
  },
};
