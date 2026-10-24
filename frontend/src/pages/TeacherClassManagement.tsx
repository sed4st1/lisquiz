import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Share2,
  Check,
  Trophy,
  BarChart3,
  Flame,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { classApi, ClassItem, StudentRanking, TopicHeatmapItem, SpacedRepetitionBooster } from '../services/classApi';
import { haptics } from '../services/haptics';

interface TeacherClassManagementProps {
  onBack: () => void;
  onSelectClassForQuiz?: (cls: ClassItem) => void;
  initialCreateOpen?: boolean;
}

export default function TeacherClassManagement({
  onBack,
  onSelectClassForQuiz,
  initialCreateOpen = false,
}: TeacherClassManagementProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'leaderboard' | 'gaps'>('roster');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialCreateOpen);

  useEffect(() => {
    if (initialCreateOpen) {
      setIsCreateModalOpen(true);
    }
  }, [initialCreateOpen]);

  // Form state
  const [newClassName, setNewClassName] = useState('7А');
  const [newClassSubject, setNewClassSubject] = useState('Математика');
  const [newClassGrade, setNewClassGrade] = useState(7);
  const [createLoading, setCreateLoading] = useState(false);

  // Class details
  const [leaderboard, setLeaderboard] = useState<StudentRanking[]>([]);
  const [topicsHeatmap, setTopicsHeatmap] = useState<TopicHeatmapItem[]>([]);
  const [boosters, setBoosters] = useState<SpacedRepetitionBooster[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Copy toast state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const list = await classApi.listClasses();
      setClasses(list);
      if (list.length > 0 && !selectedClass) {
        setSelectedClass(list[0]);
      }
    } catch (e) {
      console.warn('Failed to load classes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadClassDetails(selectedClass.id);
    }
  }, [selectedClass?.id]);

  const loadClassDetails = async (classId: string) => {
    setDetailsLoading(true);
    try {
      const [lbRes, analyticsRes] = await Promise.all([
        classApi.getClassLeaderboard(classId).catch(() => ({ leaderboard: [] })),
        classApi.getClassAnalytics(classId).catch(() => ({ topics_heatmap: [], spaced_repetition_boosters: [] })),
      ]);
      setLeaderboard(lbRes.leaderboard || []);
      setTopicsHeatmap(analyticsRes.topics_heatmap || []);
      setBoosters(analyticsRes.spaced_repetition_boosters || []);
    } catch (e) {
      console.warn('Failed to load class analytics:', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setCreateLoading(true);
    try {
      const created = await classApi.createClass(newClassName, newClassSubject, newClassGrade);
      haptics.notification('success');
      setClasses((prev) => [created, ...prev]);
      setSelectedClass(created);
      setIsCreateModalOpen(false);
      setNewClassName('');
    } catch (err: any) {
      alert(err.message || 'Ошибка создания класса');
    } finally {
      setCreateLoading(false);
    }
  };

  const copyInvite = (code: string) => {
    haptics.impact('light');
    const text = `https://lisquiz.ru/?join_class=${code}`;
    navigator.clipboard?.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.headerRow}>
        <button onClick={onBack} style={styles.backBtn} title="Назад">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>🏫 Мои классы (152-ФЗ)</h2>
          <p style={styles.subtitle}>Постоянные группы и накопительный рейтинг</p>
        </div>
        <button
          onClick={() => {
            haptics.impact('light');
            setIsCreateModalOpen(true);
          }}
          style={styles.addClassBtn}
        >
          <Plus size={16} />
          <span>Создать</span>
        </button>
      </div>

      {/* Class Pills Carousel */}
      <div style={styles.classChipsScroll}>
        {classes.map((cls) => {
          const isSelected = selectedClass?.id === cls.id;
          return (
            <button
              key={cls.id}
              onClick={() => {
                haptics.selection();
                setSelectedClass(cls);
              }}
              style={{
                ...styles.classChip,
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: isSelected ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                color: isSelected ? '#93C5FD' : '#9CA3AF',
              }}
            >
              <GraduationCap size={14} color={isSelected ? '#3B82F6' : '#9CA3AF'} />
              <span style={{ fontWeight: 800 }}>{cls.name}</span>
              <span style={styles.chipSubject}>{cls.subject}</span>
              <span style={styles.chipCount}>{cls.students_count} уч.</span>
            </button>
          );
        })}
        {classes.length === 0 && !isLoading && (
          <div style={styles.emptyNotice}>
            Классы пока не созданы. Нажмите «Создать», чтобы добавить ваш первый класс!
          </div>
        )}
      </div>

      {selectedClass && (
        <>
          {/* Active Class Info & Bot Invite Card */}
          <div style={styles.inviteCard}>
            <div style={styles.inviteInfo}>
              <div style={styles.classBadge}>
                <span style={{ fontSize: 22 }}>🎓</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.classNameLarge}>{selectedClass.name}</span>
                  <span style={styles.classSubjectBadge}>{selectedClass.subject} ({selectedClass.grade} класс)</span>
                </div>
                <div style={styles.inviteCodeRow}>
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>Код вступления:</span>
                  <code style={styles.inviteCodeBadge}>{selectedClass.invite_code}</code>
                </div>
              </div>
            </div>

            <div style={styles.inviteActions}>
              <button
                onClick={() => copyInvite(selectedClass.invite_code)}
                style={styles.copyInviteBtn}
              >
                {copiedCode === selectedClass.invite_code ? (
                  <>
                    <Check size={14} color="#34D399" />
                    <span>Ссылка скопирована!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    <span>Отправить в чат класса Сферума</span>
                  </>
                )}
              </button>

              {onSelectClassForQuiz && (
                <button
                  onClick={() => onSelectClassForQuiz(selectedClass)}
                  style={styles.launchForClassBtn}
                >
                  <Sparkles size={14} />
                  <span>Начать квиз для {selectedClass.name}</span>
                </button>
              )}
            </div>
          </div>

          {/* Subtabs: Состав / Рейтинг / Дефициты */}
          <div style={styles.subTabBar}>
            <button
              onClick={() => {
                haptics.selection();
                setActiveSubTab('roster');
              }}
              style={{
                ...styles.subTabBtn,
                borderBottomColor: activeSubTab === 'roster' ? '#3B82F6' : 'transparent',
                color: activeSubTab === 'roster' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              <Users size={14} />
              <span>Ученики ({leaderboard.length})</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                setActiveSubTab('leaderboard');
              }}
              style={{
                ...styles.subTabBtn,
                borderBottomColor: activeSubTab === 'leaderboard' ? '#F59E0B' : 'transparent',
                color: activeSubTab === 'leaderboard' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              <Trophy size={14} />
              <span>Лидерборд</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                setActiveSubTab('gaps');
              }}
              style={{
                ...styles.subTabBtn,
                borderBottomColor: activeSubTab === 'gaps' ? '#10B981' : 'transparent',
                color: activeSubTab === 'gaps' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              <BarChart3 size={14} />
              <span>Дефициты (Heatmap)</span>
            </button>
          </div>

          {/* Subtab 1: Roster */}
          {activeSubTab === 'roster' && (
            <div style={styles.tabContent}>
              {leaderboard.map((student) => (
                <div key={student.pseudonym_id} style={styles.studentRow}>
                  <div style={styles.studentAvatar}>
                    {student.avatar === 'owl' ? '🦉' : '🦊'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.studentName}>{student.display_name}</div>
                    <div style={styles.studentSub}>
                      <span>152-ФЗ ID: <code>{student.pseudonym_id.slice(0, 10)}...</code></span>
                    </div>
                  </div>
                  <div style={styles.studentStatPill}>
                    <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 800 }}>{student.total_score} б.</span>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{student.games_played} игр</span>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && !detailsLoading && (
                <div style={styles.emptyStateBox}>
                  <Users size={32} color="#6B7280" />
                  <p style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 700, color: '#E5E7EB' }}>
                    В классе пока нет учеников
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>
                    Отправьте код <b>{selectedClass.invite_code}</b> или ссылку в чат Сферума, и ученики появятся здесь автоматически!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: Cumulative Leaderboard */}
          {activeSubTab === 'leaderboard' && (
            <div style={styles.tabContent}>
              <div style={styles.leaderboardHeader}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Накопительный рейтинг за четверть</span>
              </div>
              {leaderboard.map((student) => (
                <div
                  key={student.pseudonym_id}
                  style={{
                    ...styles.leaderboardRow,
                    backgroundColor: student.rank === 1 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: student.rank === 1 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={styles.rankBadge}>
                    {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.studentName}>{student.display_name}</div>
                    <div style={styles.studentSub}>
                      <Flame size={12} color="#FF7A00" />
                      <span>Макс. стрик: {student.max_streak}</span>
                    </div>
                  </div>
                  <div style={styles.scoreBadge}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#FBBF24' }}>
                      {student.total_score}
                    </span>
                    <span style={{ fontSize: 9, color: '#9CA3AF' }}>очков</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtab 3: Class Gap Heatmap & Spaced Repetition */}
          {activeSubTab === 'gaps' && (
            <div style={styles.tabContent}>
              {/* Spaced Repetition Boosters (Level 2) */}
              {boosters.length > 0 && (
                <div style={styles.boosterSection}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Lightbulb size={16} color="#FBBF24" />
                    <span style={styles.boosterSectionTitle}>
                      Spaced Repetition: Вопросы-Реванши для класса
                    </span>
                  </div>
                  {boosters.map((b, idx) => (
                    <div key={idx} style={styles.boosterCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={styles.boosterTopic}>{b.topic}</span>
                        {b.is_boss_candidate && (
                          <span style={styles.bossCandidateBadge}>Босс-вопрос</span>
                        )}
                      </div>
                      <p style={styles.boosterRationale}>{b.rationale}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Topics Heatmap list */}
              <div style={styles.heatmapHeader}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF' }}>
                  Освоение тем (Class Gap Heatmap)
                </span>
              </div>

              {topicsHeatmap.map((item, idx) => (
                <div key={idx} style={styles.heatmapItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={styles.heatmapTopicName}>{item.topic}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: item.status === 'critical_gap' ? '#EF4444' : item.status === 'moderate_gap' ? '#F59E0B' : '#10B981',
                      }}
                    >
                      {item.accuracy_percent}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={styles.progressBarTrack}>
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${item.accuracy_percent}%`,
                        backgroundColor: item.status === 'critical_gap' ? '#EF4444' : item.status === 'moderate_gap' ? '#F59E0B' : '#10B981',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.status_text}</span>
                    <span style={{ fontSize: 10, color: '#6B7280' }}>{item.correct_answers} из {item.total_answers} верно</span>
                  </div>
                </div>
              ))}

              {topicsHeatmap.length === 0 && !detailsLoading && (
                <div style={styles.emptyStateBox}>
                  <BarChart3 size={32} color="#6B7280" />
                  <p style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 700, color: '#E5E7EB' }}>
                    Нет данных викторин
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>
                    Проведите викторину для этого класса, и здесь появится кумулятивная матрица дефицитов!
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Create Class */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setIsCreateModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              style={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={styles.modalTitle}>Создать класс</h3>
              <form onSubmit={handleCreateClass}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Название класса (буква и параллель)</label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Например, 7А или 8Б"
                    style={styles.formInput}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Предмет</label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="Например, Алгебра или Физика"
                    style={styles.formInput}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Класс (1-11)</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(Number(e.target.value))}
                    style={styles.formSelect}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                      <option key={g} value={g}>{g} класс</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    style={styles.cancelBtn}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    style={styles.submitBtn}
                  >
                    {createLoading ? 'Создание...' : 'Создать класс'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 14px 80px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    margin: 0,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    margin: 0,
  },
  addClassBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3B82F6',
    border: 'none',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    padding: '7px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
  },
  classChipsScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  classChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 12,
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  chipSubject: {
    fontSize: 10,
    opacity: 0.8,
  },
  chipCount: {
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: '2px 6px',
    borderRadius: 999,
  },
  emptyNotice: {
    fontSize: 12,
    color: '#9CA3AF',
    padding: '12px 0',
  },
  inviteCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 14,
    backdropFilter: 'blur(10px)',
  },
  inviteInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  classBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classNameLarge: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  classSubjectBadge: {
    fontSize: 11,
    color: '#93C5FD',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: '2px 6px',
    borderRadius: 6,
  },
  inviteCodeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  inviteCodeBadge: {
    fontSize: 12,
    fontWeight: 800,
    color: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: '2px 6px',
    borderRadius: 6,
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  inviteActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  copyInviteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    padding: '9px 12px',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  launchForClassBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF7A00',
    border: 'none',
    borderRadius: 10,
    padding: '9px 12px',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  subTabBar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 4px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  studentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '10px 12px',
  },
  studentAvatar: {
    fontSize: 20,
  },
  studentName: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  studentSub: {
    fontSize: 10,
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  studentStatPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  leaderboardHeader: {
    padding: '4px 2px',
  },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid',
    borderRadius: 12,
    padding: '10px 12px',
  },
  rankBadge: {
    fontSize: 14,
    fontWeight: 800,
    minWidth: 24,
    textAlign: 'center',
  },
  scoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  boosterSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
  },
  boosterSectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FBBF24',
  },
  boosterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: '8px 10px',
    marginTop: 6,
  },
  boosterTopic: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  bossCandidateBadge: {
    fontSize: 9,
    fontWeight: 800,
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: '2px 5px',
    borderRadius: 4,
  },
  boosterRationale: {
    margin: '4px 0 0',
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 1.35,
  },
  heatmapHeader: {
    padding: '6px 2px 2px',
  },
  heatmapItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '10px 12px',
  },
  heatmapTopicName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  emptyStateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    border: '1px dashed rgba(255, 255, 255, 0.1)',
  },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
  },
  modalCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: 18,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 800,
    margin: '0 0 14px',
    color: '#FFFFFF',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#9CA3AF',
    marginBottom: 5,
  },
  formInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#FFFFFF',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    backgroundColor: '#1F2937',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#FFFFFF',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  cancelBtn: {
    flex: 1,
    background: 'none',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: '9px',
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: 8,
    padding: '9px',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
