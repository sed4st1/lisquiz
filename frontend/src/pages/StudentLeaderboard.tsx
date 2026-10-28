import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { haptics } from '../services/haptics';
import { groveApi, LeaderboardData, StudentContribution } from '../services/groveApi';

const AVATAR_MAP: Record<string, string> = {
  bear: '/assets/avatars/students/bear.png',
  bunny: '/assets/avatars/students/bunny.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  squirrel: '/assets/avatars/students/squirrel.png',
  fox_smart: '/assets/avatars/students/raccoon.png',
};

const getAvatarSrc = (avatar?: string): string => {
  if (avatar && AVATAR_MAP[avatar]) return AVATAR_MAP[avatar]!;
  return AVATAR_MAP.raccoon || '/assets/avatars/students/raccoon.png';
};

export interface StudentLeaderboardProps {
  boostPoints?: number | null;
  boostRank?: number | null;
  onClearBoost?: () => void;
  onBack?: () => void;
  currentStudentName?: string;
  currentStudentAvatar?: string;
  currentScore?: number;
  currentRank?: number;
}

interface RankedStudent {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  score: number;
  isMe?: boolean;
}

const DEFAULT_LEADERBOARD_STUDENTS: RankedStudent[] = [
  { rank: 1, id: 's1', name: 'Егор Петров', avatar: 'raccoon', score: 980 },
  { rank: 2, id: 's2', name: 'София Иванова', avatar: 'owl', score: 920 },
  { rank: 3, id: 's3', name: 'Максим Соколов', avatar: 'hedgehog', score: 870 },
  { rank: 4, id: 's4', name: 'Артём Кузнецов', avatar: 'raccoon', score: 750, isMe: true },
  { rank: 5, id: 's5', name: 'Даниил Фёдоров', avatar: 'bear', score: 720 },
  { rank: 6, id: 's6', name: 'Виктория Смирнова', avatar: 'bunny', score: 690 },
  { rank: 7, id: 's7', name: 'Илья Волков', avatar: 'hedgehog', score: 660 },
  { rank: 8, id: 's8', name: 'Анна Морозова', avatar: 'owl', score: 620 },
  { rank: 9, id: 's9', name: 'Кирилл Новиков', avatar: 'squirrel', score: 580 },
  { rank: 10, id: 's10', name: 'Мария Павлова', avatar: 'bear', score: 540 },
  { rank: 11, id: 's11', name: 'Роман Васильев', avatar: 'raccoon', score: 510 },
  { rank: 12, id: 's12', name: 'Полина Зайцева', avatar: 'bunny', score: 480 },
];

export default function StudentLeaderboard({
  boostPoints,
  boostRank: _boostRank,
  onClearBoost,
  onBack,
  currentStudentName = 'Артём К',
  currentStudentAvatar = 'raccoon',
  currentScore = 750,
  currentRank = 4,
}: StudentLeaderboardProps = {}) {
  const [activeTab, setActiveTab] = useState<'quiz' | 'season'>('quiz');
  const [serverData, setServerData] = useState<LeaderboardData | null>(null);
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
    groveApi.getWeeklyLeaderboard('class_7a')
      .then((data) => setServerData(data))
      .catch((e) => console.warn('Failed to load grove leaderboard:', e));
  }, []);

  // Resolve students list
  const studentsList: RankedStudent[] = React.useMemo(() => {
    if (activeTab === 'season' && serverData) {
      const all: StudentContribution[] = [
        ...(serverData.divisions.council_of_groves || []),
        ...(serverData.divisions.forest_guardians || []),
        ...(serverData.divisions.sprout_keepers || []),
      ].sort((a, b) => a.rank - b.rank);

      if (all.length > 0) {
        return all.map((s) => ({
          rank: s.rank,
          id: s.student_id,
          name: s.student_name,
          avatar: s.avatar,
          score: s.weekly_xp,
          isMe: s.student_name.includes('(Ты)') || s.student_id === 'std_ivan',
        }));
      }
    }
    return DEFAULT_LEADERBOARD_STUDENTS.map((s) => {
      if (s.isMe) {
        return {
          ...s,
          name: `${currentStudentName} (Ты)`,
          avatar: currentStudentAvatar,
          score: currentScore,
          rank: currentRank,
        };
      }
      return s;
    });
  }, [activeTab, serverData, currentStudentName, currentStudentAvatar, currentScore, currentRank]);

  // Determine current user data
  const myEntry = studentsList.find((s) => s.isMe) || {
    rank: currentRank,
    id: 'me',
    name: `${currentStudentName} (Ты)`,
    avatar: currentStudentAvatar,
    score: currentScore,
  };

  const renderHexBadge = (rank: number) => {
    if (rank <= 5) {
      return (
        <img
          src={`/assets/leaderboard/hex_badge_${rank}.png`}
          alt={`${rank}`}
          style={styles.hexBadgeImg}
        />
      );
    }
    return (
      <div style={styles.customHexBadge}>
        <span>{rank}</span>
      </div>
    );
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            HEADER BAR: Back Button + Hanging Signboard
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
              src="/assets/leaderboard/sign_reiting.png"
              alt="Рейтинг класса"
              style={styles.hangingSignImg}
            />
          </div>

          <div style={{ width: 44 }} />
        </div>

        {/* ========================================================
            TAB SELECTOR: "За викторину" / "За неделю в Роще"
           ======================================================== */}
        <div style={styles.tabPillContainer}>
          <button
            type="button"
            onClick={() => {
              haptics.impact('light');
              setActiveTab('quiz');
            }}
            style={{
              ...styles.tabPillBtn,
              backgroundColor: activeTab === 'quiz' ? '#8B5A2B' : 'transparent',
              color: activeTab === 'quiz' ? '#FFF8F0' : '#8B5A2B',
            }}
          >
            За викторину
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.impact('light');
              setActiveTab('season');
            }}
            style={{
              ...styles.tabPillBtn,
              backgroundColor: activeTab === 'season' ? '#8B5A2B' : 'transparent',
              color: activeTab === 'season' ? '#FFF8F0' : '#8B5A2B',
            }}
          >
            Сезон в Роще
          </button>
        </div>

        {/* Temporary Animated Rank Growth Notification Banner */}
        <AnimatePresence onExitComplete={onClearBoost}>
          {showBoost && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              style={styles.rankBoostBanner}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="#15803D" strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#15803D' }}>
                  Рейтинг обновлен! Начислено +{boostPoints} очков
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================
            MAIN LEADERBOARD SCROLLABLE PANEL
           ======================================================== */}
        <div style={styles.boardCard}>
          <div style={styles.boardList}>
            {studentsList.map((st) => (
              <motion.div
                key={st.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  ...styles.studentRow,
                  backgroundColor: st.isMe ? '#FEF3C7' : '#FFFFFF',
                  borderColor: st.isMe ? '#F59E0B' : '#F2E2D0',
                }}
              >
                {/* 1. Hexagon Rank Badge */}
                <div style={styles.rankBadgeCell}>
                  {renderHexBadge(st.rank)}
                </div>

                {/* 2. Animal Avatar */}
                <div style={styles.avatarCell}>
                  <div style={styles.avatarCircleRing}>
                    <img
                      src={getAvatarSrc(st.avatar)}
                      alt={st.name}
                      style={styles.avatarImg}
                    />
                  </div>
                </div>

                {/* 3. Student Name */}
                <div style={styles.nameCell}>
                  <span
                    style={{
                      ...styles.studentNameText,
                      fontWeight: st.isMe ? 900 : 700,
                      color: st.isMe ? '#B45309' : '#2B1D0C',
                    }}
                  >
                    {st.name}
                  </span>
                </div>

                {/* 4. Acorn Score */}
                <div style={styles.scoreCell}>
                  <img
                    src="/assets/leaderboard/acorn_gold.png"
                    alt="Очки"
                    style={styles.rowAcornImg}
                  />
                  <span style={styles.rowScoreText}>{st.score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ========================================================
            STICKY BOTTOM CARD: Current User Stats
           ======================================================== */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={styles.stickyUserCard}
        >
          {/* Avatar in gold ring */}
          <div style={styles.stickyAvatarWrapper}>
            <img
              src={getAvatarSrc(myEntry.avatar)}
              alt={myEntry.name}
              style={styles.stickyAvatarImg}
            />
          </div>

          {/* Place & Label */}
          <div style={styles.stickyTextCol}>
            <span style={styles.stickyPlaceLabel}>Ты:</span>
            <span style={styles.stickyRankText}>{myEntry.rank} место</span>
          </div>

          {/* Score */}
          <div style={styles.stickyScoreCol}>
            <img
              src="/assets/leaderboard/acorn_gold.png"
              alt="Очки"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            <span style={styles.stickyScoreNumber}>{myEntry.score}</span>
            <span style={styles.stickyScoreSub}>очков</span>
          </div>
        </motion.div>
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
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    minHeight: '100vh',
    padding: '14px 14px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    minHeight: 82,
    marginTop: -18,
    marginBottom: 0,
  },
  roundBackBtn: {
    position: 'absolute',
    left: 0,
    top: 10,
    zIndex: 10,
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 86,
  },
  hangingSignImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  tabPillContainer: {
    display: 'flex',
    backgroundColor: '#F5EBDD',
    border: '1.5px solid #E5C39E',
    borderRadius: 999,
    padding: 3,
    margin: '10px 0 12px 0',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 290,
  },
  tabPillBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    outline: 'none',
  },
  rankBoostBanner: {
    width: '100%',
    backgroundColor: '#DCFCE7',
    border: '1.5px solid #86EFAC',
    borderRadius: 14,
    padding: '10px 14px',
    marginBottom: 10,
    boxSizing: 'border-box',
  },
  boardCard: {
    width: '100%',
    flex: 1,
    backgroundColor: '#FFFDF9',
    border: '2.5px solid #E5C39E',
    boxShadow: '0 4px 0 #D8BEA3, 0 8px 18px rgba(130, 80, 30, 0.08)',
    borderRadius: 24,
    padding: '12px 10px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 235px)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  boardList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    paddingRight: 4,
    boxSizing: 'border-box',
  },
  studentRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 18,
    border: '1.5px solid',
    boxShadow: '0 2px 0 #EAD7C2',
    boxSizing: 'border-box',
    transition: 'transform 0.15s ease',
  },
  rankBadgeCell: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 8,
  },
  hexBadgeImg: {
    width: 34,
    height: 34,
    objectFit: 'contain',
  },
  customHexBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#6A3C16',
    border: '1.5px solid #8D5422',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFF8F0',
    fontSize: 12.5,
    fontWeight: 900,
    boxShadow: '0 2px 0 #4A280B',
  },
  avatarCell: {
    width: 44,
    height: 44,
    marginRight: 10,
    flexShrink: 0,
  },
  avatarCircleRing: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFE9D4',
    border: '2px solid #E5C39E',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '90%',
    height: '90%',
    objectFit: 'contain',
  },
  nameCell: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  studentNameText: {
    fontSize: 14.5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '-0.01em',
  },
  scoreCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    marginLeft: 8,
  },
  rowAcornImg: {
    width: 18,
    height: 18,
    objectFit: 'contain',
  },
  rowScoreText: {
    fontSize: 15.5,
    fontWeight: 900,
    color: '#2B1D0C',
    fontVariantNumeric: 'tabular-nums',
  },
  stickyUserCard: {
    width: '100%',
    height: 64,
    borderRadius: 20,
    background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
    border: '2px solid #A7F3D0',
    boxShadow: '0 4px 0 #047857, 0 6px 16px rgba(16, 185, 129, 0.25)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    boxSizing: 'border-box',
    gap: 12,
  },
  stickyAvatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#FFE9D4',
    border: '2px solid #FFFFFF',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  stickyAvatarImg: {
    width: '90%',
    height: '90%',
    objectFit: 'contain',
  },
  stickyTextCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  stickyPlaceLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#D1FAE5',
    lineHeight: 1,
  },
  stickyRankText: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
    lineHeight: 1.2,
  },
  stickyScoreCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  stickyScoreNumber: {
    fontSize: 18,
    fontWeight: 900,
    color: '#FFFFFF',
    fontVariantNumeric: 'tabular-nums',
  },
  stickyScoreSub: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#D1FAE5',
  },
};
