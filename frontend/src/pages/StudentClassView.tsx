import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  LogOut,
  Trophy,
  Sparkles,
  TreePine,
  Search,
  ExternalLink,
} from 'lucide-react';
import { classApi, ClassItem, StudentRanking } from '../services/classApi';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import SoundToggleButton from '../components/SoundToggleButton';

const AVATAR_MAP: Record<string, string> = {
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  bear: '/assets/avatars/students/bear.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  bunny: '/assets/avatars/students/bunny.png',
  squirrel: '/assets/avatars/students/squirrel.png',
  fox_smart: '/assets/classes/v2/avatar_fox.png',
};

const resolveAvatarSrc = (avatar?: string): string => {
  if (!avatar) return '/assets/classes/v2/avatar_fox.png';
  if (AVATAR_MAP[avatar]) return AVATAR_MAP[avatar];
  if (avatar.startsWith('/') || avatar.startsWith('http')) return avatar;
  return '/assets/classes/v2/avatar_fox.png';
};

interface StudentClassViewProps {
  onBack: () => void;
  onGoToGrove?: () => void;
  initialClassId?: string;
}

export const StudentClassView: React.FC<StudentClassViewProps> = ({
  onBack,
  onGoToGrove,
  initialClassId,
}) => {
  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentRanking[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load current enrolled class & all available classes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const savedClassId = initialClassId || localStorage.getItem('lisquiz_student_class_id');
        let enrolledClass: ClassItem | null = null;

        if (savedClassId) {
          try {
            enrolledClass = await classApi.getClass(savedClassId);
          } catch {
            localStorage.removeItem('lisquiz_student_class_id');
          }
        }

        if (!enrolledClass) {
          // Check backend for student membership
          enrolledClass = await classApi.getStudentClass();
          if (enrolledClass) {
            localStorage.setItem('lisquiz_student_class_id', enrolledClass.id);
          }
        }

        if (isMounted) {
          setCurrentClass(enrolledClass);
        }

        // Also fetch all available classes for students to join
        const all = await classApi.listClasses();
        if (isMounted) {
          setAvailableClasses(all);
        }

        // If enrolled, load leaderboard
        if (enrolledClass) {
          const lData = await classApi.getClassLeaderboard(enrolledClass.id);
          if (isMounted && lData && lData.leaderboard) {
            setLeaderboard(lData.leaderboard);
          }
        }
      } catch (err) {
        console.warn('Error loading student class data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialClassId]);

  // Handle joining a class by invite code or direct class item
  const handleJoinByCode = async (codeToJoin: string) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Пожалуйста, введите код приглашения');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    haptics.impact('medium');

    try {
      const res = await classApi.joinClass(cleanCode);
      haptics.notification('success');
      soundManager.playVictory();

      localStorage.setItem('lisquiz_student_class_id', res.class_id);

      // Fetch joined class details and update view
      const fullClass = await classApi.getClass(res.class_id);
      setCurrentClass(fullClass);

      const lData = await classApi.getClassLeaderboard(res.class_id);
      if (lData && lData.leaderboard) {
        setLeaderboard(lData.leaderboard);
      }
    } catch (err: any) {
      haptics.notification('error');
      soundManager.playWrong();
      setErrorMessage(err.message || 'Не удалось вступить в класс. Проверьте код.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle leave/switch class
  const handleLeaveClass = () => {
    haptics.impact('light');
    localStorage.removeItem('lisquiz_student_class_id');
    setCurrentClass(null);
    setLeaderboard([]);
    setErrorMessage(null);
  };

  // Copy invite code to clipboard
  const handleCopyCode = (code: string) => {
    haptics.selection();
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* Top Navigation */}
        <div style={styles.topNav}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptics.impact('light');
              onBack();
            }}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#5C3317" strokeWidth={2.5} />
            <span>Назад</span>
          </motion.button>

          <div style={styles.topNavTitle}>
            {currentClass ? `Мой класс: ${currentClass.name}` : 'Выбор класса'}
          </div>

          <SoundToggleButton variant="round" size={15} />
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div style={styles.loadingCard}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌲</div>
            <div style={styles.loadingText}>Загружаем данные класса...</div>
          </div>
        ) : currentClass ? (
          /* =========================================================
             ENROLLED STATE: Student is already in a class!
             ========================================================= */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.contentCol}
          >
            {/* 1. Main Class Card */}
            <div style={styles.classCard}>
              <div style={styles.classHeaderRow}>
                <div style={styles.classAvatarBox}>
                  <img
                    src="/assets/classes/v2/avatar_deer.png"
                    alt="Класс"
                    style={{ width: 44, height: 44, objectFit: 'contain' }}
                  />
                </div>
                <div style={styles.classTitleCol}>
                  <div style={styles.classNameBig}>{currentClass.name} класс</div>
                  <div style={styles.classSubjectSub}>
                    {currentClass.subject || 'Все школьные предметы'} • {currentClass.grade} класс
                  </div>
                </div>
              </div>

              {/* Code & Share Pill */}
              <div style={styles.invitePillRow}>
                <span style={styles.inviteLabel}>Код для одноклассников:</span>
                <span style={styles.inviteCodeText}>{currentClass.invite_code}</span>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleCopyCode(currentClass.invite_code)}
                  style={styles.copyBtn}
                  title="Скопировать код"
                >
                  {copiedCode ? <Check size={14} color="#166534" /> : <Copy size={14} color="#5C3317" />}
                </motion.button>
              </div>

              {/* Stats Strip */}
              <div style={styles.statsStrip}>
                <div style={styles.statItem}>
                  <Users size={16} color="#784E2D" />
                  <span><strong>{currentClass.students_count || leaderboard.length || 1}</strong> учеников</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                  <Sparkles size={16} color="#D97706" />
                  <span>Активен в Роще</span>
                </div>
              </div>
            </div>

            {/* 2. Class Grove Shortcut Card */}
            {onGoToGrove && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptics.impact('medium');
                  onGoToGrove();
                }}
                style={styles.groveShortcutCard}
              >
                <div style={styles.groveIconWrapper}>
                  <TreePine size={24} color="#15803D" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.groveCardTitle}>Роща нашего класса</div>
                  <div style={styles.groveCardSub}>Поливай дерево и собирай жёлуди знаний</div>
                </div>
                <div style={styles.groveArrowPill}>
                  <span>Открыть</span>
                  <ExternalLink size={13} color="#FFFFFF" />
                </div>
              </motion.div>
            )}

            {/* 3. Classmates Leaderboard */}
            <div style={styles.leaderboardSection}>
              <div style={styles.sectionHeaderRow}>
                <Trophy size={18} color="#D97706" />
                <span style={styles.sectionTitle}>Рейтинг одноклассников</span>
                <span style={styles.sectionCount}>({leaderboard.length || 1})</span>
              </div>

              <div style={styles.leaderboardList}>
                {leaderboard.length > 0 ? (
                  leaderboard.map((st, idx) => {
                    const isTop1 = idx === 0;
                    const isTop3 = idx > 0 && idx < 3;
                    return (
                      <div
                        key={st.pseudonym_id || idx}
                        style={{
                          ...styles.studentRow,
                          backgroundColor: isTop1 ? '#FEF9C3' : isTop3 ? '#F0FDF4' : '#FFFFFF',
                          borderColor: isTop1 ? '#FDE047' : isTop3 ? '#BBF7D0' : '#E2D4BF',
                        }}
                      >
                        <div style={styles.rankBadge}>
                          {isTop1 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>

                        <div style={styles.studentAvatar}>
                          <img
                            src={resolveAvatarSrc(st.avatar)}
                            alt={st.display_name}
                            style={{ width: 28, height: 28, borderRadius: 999 }}
                          />
                        </div>

                        <div style={styles.studentNameCol}>
                          <span style={styles.studentNameText}>{st.display_name || `Ученик ${idx + 1}`}</span>
                          <span style={styles.studentStreakText}>🔥 Стрик: {st.max_streak || 0}</span>
                        </div>

                        <div style={styles.scorePill}>
                          <span>{st.total_score || 0} XP</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyLeaderboard}>
                    <span>Пока никто не завершил викторину в этом классе. Будь первым! 🚀</span>
                  </div>
                )}
              </div>
            </div>

            {/* Leave / Switch class button */}
            <button
              type="button"
              onClick={handleLeaveClass}
              style={styles.leaveClassBtn}
            >
              <LogOut size={14} color="#991B1B" />
              <span>Выйти из класса / сменить класс</span>
            </button>
          </motion.div>
        ) : (
          /* =========================================================
             ENROLL STATE: Student needs to join a class
             ========================================================= */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.contentCol}
          >
            {/* Mascot Tip Card */}
            <div style={styles.mascotTipCard}>
              <img
                src="/assets/mascot/wave.png"
                alt="Спринт"
                style={{ width: 64, height: 64, objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div style={styles.mascotTipTitle}>Вступай в свой класс!</div>
                <div style={styles.mascotTipText}>
                  Введи код от учителя или выбери свой класс из списка, чтобы соревноваться с друзьями и растить Рощу!
                </div>
              </div>
            </div>

            {/* Code Input Box */}
            <div style={styles.codeFormCard}>
              <div style={styles.formLabel}>Код приглашения от учителя:</div>
              <div style={styles.inputRow}>
                <input
                  type="text"
                  placeholder="Например: 7A-OWL"
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  style={styles.codeInput}
                  maxLength={12}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleJoinByCode(inviteInput)}
                  disabled={isSubmitting || !inviteInput.trim()}
                  style={{
                    ...styles.joinSubmitBtn,
                    opacity: isSubmitting || !inviteInput.trim() ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? 'Входим...' : 'Вступить'}
                </motion.button>
              </div>

              {errorMessage && (
                <div style={styles.errorBanner}>{errorMessage}</div>
              )}
            </div>

            {/* Available Classes List */}
            <div style={styles.availableSection}>
              <div style={styles.sectionHeaderRow}>
                <Search size={16} color="#784E2D" />
                <span style={styles.sectionTitle}>Классы школы:</span>
              </div>

              <div style={styles.availableGrid}>
                {availableClasses.length > 0 ? (
                  availableClasses.map((cls) => (
                    <motion.div
                      key={cls.id}
                      whileHover={{ scale: 1.02 }}
                      style={styles.availableClassCard}
                    >
                      <div style={styles.availCardHeader}>
                        <div style={styles.availClassName}>{cls.name} класс</div>
                        <div style={styles.availClassGrade}>{cls.grade} класс</div>
                      </div>
                      <div style={styles.availClassSubject}>
                        {cls.subject || 'Все предметы'}
                      </div>
                      <div style={styles.availClassFooter}>
                        <div style={styles.availStudentsCount}>
                          <Users size={13} color="#784E2D" />
                          <span>{cls.students_count || 1} уч.</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleJoinByCode(cls.invite_code)}
                          disabled={isSubmitting}
                          style={styles.quickJoinBtn}
                        >
                          Вступить
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div style={styles.emptyAvailableCard}>
                    Классы ещё создаются учителями. Введи код приглашения выше!
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    background: 'radial-gradient(#F5EBD7 1.5px, transparent 1.5px)',
    backgroundSize: '20px 20px',
    backgroundColor: '#FAF5ED',
    padding: '16px 12px 40px',
    boxSizing: 'border-box',
    fontFamily: '"Nunito", "Comfortaa", sans-serif',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  topNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 999,
    background: '#FFFDF9',
    border: '1.5px solid #E5C39E',
    color: '#5C3317',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 0 #D4A373',
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#4A2E18',
    textAlign: 'center',
    flex: 1,
  },
  loadingCard: {
    background: '#FFFDF9',
    border: '2px dashed #E5C39E',
    borderRadius: 20,
    padding: 32,
    textAlign: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: 700,
    color: '#784E2D',
  },
  contentCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  classCard: {
    background: '#FFFDF9',
    border: '2px solid #E5C39E',
    borderRadius: 24,
    padding: '20px 18px',
    boxShadow: '0 4px 0 #D4A373',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  classHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  classAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: '#FDF2E9',
    border: '1.5px solid #F6D8B8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTitleCol: {
    flex: 1,
  },
  classNameBig: {
    fontSize: 22,
    fontWeight: 900,
    color: '#4A2E18',
  },
  classSubjectSub: {
    fontSize: 13,
    color: '#784E2D',
    fontWeight: 600,
  },
  invitePillRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#F8F1E5',
    border: '1px solid #E5D5C0',
    borderRadius: 14,
    padding: '8px 12px',
  },
  inviteLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#784E2D',
  },
  inviteCodeText: {
    fontSize: 14,
    fontWeight: 900,
    color: '#4A2E18',
    letterSpacing: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  copyBtn: {
    background: '#FFFDF9',
    border: '1px solid #D4A373',
    borderRadius: 8,
    padding: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTop: '1px solid #F1E5D5',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#5C3317',
    fontWeight: 700,
  },
  statDivider: {
    width: 1,
    height: 16,
    background: '#E5C39E',
  },
  groveShortcutCard: {
    background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    border: '1.5px solid #A7F3D0',
    borderRadius: 20,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    boxShadow: '0 3px 0 #6EE7B7',
  },
  groveIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#FFFFFF',
    border: '1px solid #A7F3D0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groveCardTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#065F46',
  },
  groveCardSub: {
    fontSize: 12,
    color: '#047857',
    fontWeight: 600,
  },
  groveArrowPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#10B981',
    color: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  leaderboardSection: {
    background: '#FFFDF9',
    border: '2px solid #E5C39E',
    borderRadius: 24,
    padding: '18px 16px',
    boxShadow: '0 4px 0 #D4A373',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#4A2E18',
  },
  sectionCount: {
    fontSize: 13,
    color: '#784E2D',
    fontWeight: 700,
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  studentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid #E2D4BF',
  },
  rankBadge: {
    width: 26,
    fontSize: 14,
    fontWeight: 900,
    color: '#4A2E18',
    textAlign: 'center',
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: '#FDF2E9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNameCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  studentNameText: {
    fontSize: 14,
    fontWeight: 800,
    color: '#4A2E18',
  },
  studentStreakText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: 700,
  },
  scorePill: {
    padding: '4px 10px',
    borderRadius: 999,
    background: '#FEF3C7',
    color: '#92400E',
    fontSize: 12,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  emptyLeaderboard: {
    padding: '16px 8px',
    textAlign: 'center',
    fontSize: 13,
    color: '#784E2D',
    fontWeight: 600,
  },
  leaveClassBtn: {
    background: 'transparent',
    border: 'none',
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
  },
  mascotTipCard: {
    background: '#FFFDF9',
    border: '2px solid #E5C39E',
    borderRadius: 22,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0 3px 0 #D4A373',
  },
  mascotTipTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#4A2E18',
    marginBottom: 4,
  },
  mascotTipText: {
    fontSize: 13,
    lineHeight: 1.4,
    color: '#784E2D',
    fontWeight: 600,
  },
  codeFormCard: {
    background: '#FFFDF9',
    border: '2px solid #E5C39E',
    borderRadius: 22,
    padding: '18px 16px',
    boxShadow: '0 3px 0 #D4A373',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: '#4A2E18',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1.5px solid #D4A373',
    background: '#FAF5ED',
    fontSize: 16,
    fontWeight: 800,
    color: '#4A2E18',
    outline: 'none',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  joinSubmitBtn: {
    padding: '12px 20px',
    borderRadius: 14,
    background: 'linear-gradient(180deg, #FF8A00 0%, #E06D00 100%)',
    border: 'none',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 3px 0 #B25000',
  },
  errorBanner: {
    padding: '8px 12px',
    borderRadius: 10,
    background: '#FEE2E2',
    color: '#991B1B',
    fontSize: 12,
    fontWeight: 700,
  },
  availableSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  availableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  availableClassCard: {
    background: '#FFFDF9',
    border: '1.5px solid #E5C39E',
    borderRadius: 16,
    padding: 12,
    boxShadow: '0 2px 0 #D4A373',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  availCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availClassName: {
    fontSize: 16,
    fontWeight: 900,
    color: '#4A2E18',
  },
  availClassGrade: {
    fontSize: 11,
    fontWeight: 800,
    color: '#B45309',
    background: '#FEF3C7',
    padding: '2px 6px',
    borderRadius: 6,
  },
  availClassSubject: {
    fontSize: 12,
    color: '#784E2D',
    fontWeight: 600,
  },
  availClassFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #F1E5D5',
  },
  availStudentsCount: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    color: '#784E2D',
  },
  quickJoinBtn: {
    padding: '5px 12px',
    borderRadius: 999,
    background: '#10B981',
    border: 'none',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 0 #059669',
  },
  emptyAvailableCard: {
    gridColumn: 'span 2',
    padding: 20,
    textAlign: 'center',
    background: '#FFFDF9',
    border: '1.5px dashed #E5C39E',
    borderRadius: 16,
    fontSize: 13,
    color: '#784E2D',
    fontWeight: 600,
  },
};

export default StudentClassView;
