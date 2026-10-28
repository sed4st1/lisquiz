import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Share2,
  BarChart3,
  X,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { classApi, ClassItem, StudentRanking, TopicHeatmapItem, SpacedRepetitionBooster } from '../services/classApi';
import { haptics } from '../services/haptics';

interface TeacherClassManagementProps {
  onBack: () => void;
  onSelectClassForQuiz?: (cls: ClassItem) => void;
  initialCreateOpen?: boolean;
}

const MASCOTS = [
  { id: 'fox', name: 'Лисёнок', src: '/assets/classes/v2/avatar_fox.png' },
  { id: 'owl', name: 'Совёнок', src: '/assets/classes/v2/avatar_owl.png' },
  { id: 'deer', name: 'Оленёнок', src: '/assets/classes/v2/avatar_deer.png' },
  { id: 'bear', name: 'Медвежонок', src: '/assets/classes/v2/avatar_bear.png' },
  { id: 'bunny', name: 'Зайка', src: '/assets/classes/v2/avatar_bunny.png' },
  { id: 'raccoon', name: 'Енот', src: '/assets/classes/v2/avatar_raccoon.png' },
] as const;

export default function TeacherClassManagement({
  onBack,
  onSelectClassForQuiz,
  initialCreateOpen = false,
}: TeacherClassManagementProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'leaderboard' | 'gaps'>('roster');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return initialCreateOpen || p.get('create') === '1' || p.get('modal') === 'create';
    } catch {
      return initialCreateOpen;
    }
  });
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Create class form state
  const [newGrade, setNewGrade] = useState<number>(7);
  const [newLetter, setNewLetter] = useState<string>('А');
  const [selectedMascot, setSelectedMascot] = useState<string>('fox');
  const [createLoading, setCreateLoading] = useState(false);

  // Join by key form state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Class details
  const [leaderboard, setLeaderboard] = useState<StudentRanking[]>([]);
  const [topicsHeatmap, setTopicsHeatmap] = useState<TopicHeatmapItem[]>([]);
  const [boosters, setBoosters] = useState<SpacedRepetitionBooster[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Copy toast state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (initialCreateOpen) {
      setIsCreateModalOpen(true);
    }
  }, [initialCreateOpen]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const list = await classApi.listClasses();
      setClasses(list);
      try {
        const params = new URLSearchParams(window.location.search);
        const cid = params.get('classId');
        if (cid) {
          const found = list.find(
            (c) =>
              c.id === cid ||
              c.name.toLowerCase() === cid.toLowerCase() ||
              c.name.toLowerCase().includes(cid.toLowerCase())
          );
          if (found) setSelectedClass(found);
        }
        const subtab = params.get('tab');
        if (subtab === 'leaderboard' || subtab === 'gaps' || subtab === 'roster') {
          setActiveSubTab(subtab as 'roster' | 'leaderboard' | 'gaps');
        }
        const modal = params.get('modal');
        if (modal === 'create') setIsCreateModalOpen(true);
        if (modal === 'join') setIsJoinModalOpen(true);
      } catch {}
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
    const finalName = `${newGrade}${newLetter.trim().toUpperCase()}`;
    if (!finalName) return;

    setCreateLoading(true);
    try {
      const created = await classApi.createClass(finalName, 'Все предметы', newGrade);
      localStorage.setItem(`lisquiz_class_mascot_${created.id}`, selectedMascot);
      haptics.notification('success');
      setClasses((prev) => [created, ...prev]);
      setSelectedClass(created);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Ошибка создания класса');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinByKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await classApi.joinClass(joinCode.trim().toUpperCase());
      haptics.notification('success');
      await loadClasses();
      setIsJoinModalOpen(false);
      setJoinCode('');
      const found = classes.find((c) => c.id === res.class_id);
      if (found) setSelectedClass(found);
    } catch (err: any) {
      setJoinError(err.message || 'Неверный ключ класса');
      haptics.notification('error');
    } finally {
      setJoinLoading(false);
    }
  };

  const copyInvite = (code: string) => {
    haptics.impact('light');
    const text = `https://lisquiz.ru/?join_class=${code}`;
    navigator.clipboard?.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Helper to pick mascot for a class
  const getMascotForClass = (cls?: ClassItem | null, index: number = 0): string => {
    if (cls?.id) {
      const stored = localStorage.getItem(`lisquiz_class_mascot_${cls.id}`);
      if (stored) {
        const match = MASCOTS.find((m) => m.id === stored);
        if (match) return match.src;
      }
    }
    const m = MASCOTS[index % MASCOTS.length];
    return m ? m.src : MASCOTS[0].src;
  };

  // Helper to pick mascot for student
  const getAvatarForStudent = (student: StudentRanking, index: number = 0): string => {
    const av = student.avatar;
    if (av) {
      const match = MASCOTS.find((m) => m.id === av);
      if (match) return match.src;
    }
    const pool = [
      '/assets/classes/v2/avatar_fox.png',
      '/assets/classes/v2/avatar_owl.png',
      '/assets/classes/v2/avatar_bunny.png',
      '/assets/classes/v2/avatar_bear.png',
      '/assets/classes/v2/avatar_deer.png',
      '/assets/classes/v2/avatar_raccoon.png',
    ];
    return pool[index % pool.length] ?? '/assets/classes/v2/avatar_fox.png';
  };

  // Student pedagogical role title
  const getStudentRole = (student: StudentRanking, idx: number): string => {
    if (student.max_streak >= 10 || idx === 0) return 'Отличник';
    if (student.total_score >= 200 || idx === 1) return 'Активист';
    if (student.games_played >= 2 || idx === 2) return 'Старательный';
    if (idx === 3) return 'Умница';
    return 'Добрый';
  };

  // Subject icon helper for gap analytics
  const getSubjectIcon = (topicName: string) => {
    const lower = topicName.toLowerCase();
    if (lower.includes('англ') || lower.includes('english')) {
      return { iconSrc: '/assets/subjects/english.png', bg: '#FEF2F2', border: '#FECACA', label: 'Английский язык' };
    }
    if (lower.includes('физик') || lower.includes('энерг') || lower.includes('ньютон') || lower.includes('тяжест') || lower.includes('давлен')) {
      return { iconSrc: '/assets/subjects/physics.png', bg: '#FFF5D6', border: '#FFD966', label: 'Физика' };
    }
    if (lower.includes('матем') || lower.includes('дроб') || lower.includes('уравнен') || lower.includes('геометр') || lower.includes('логик') || lower.includes('процент')) {
      return { iconSrc: '/assets/subjects/math.png', bg: '#EBF4FF', border: '#A5C9FF', label: 'Математика' };
    }
    if (lower.includes('русск') || lower.includes('язык') || lower.includes('граммат') || lower.includes('орфограф')) {
      return { iconSrc: '/assets/subjects/russian.png', bg: '#FFF8E6', border: '#FCE1A0', label: 'Русский язык' };
    }
    if (lower.includes('литератур') || lower.includes('стихотвор') || lower.includes('пушкин') || lower.includes('чтени')) {
      return { iconSrc: '/assets/subjects/literature.png', bg: '#F3E8FF', border: '#D8B4FE', label: 'Литература' };
    }
    if (lower.includes('биолог') || lower.includes('животн') || lower.includes('растен') || lower.includes('клетк')) {
      return { iconSrc: '/assets/subjects/biology.png', bg: '#EBF9F1', border: '#A7F3D0', label: 'Биология' };
    }
    if (lower.includes('хим')) {
      return { iconSrc: '/assets/subjects/chemistry.png', bg: '#FFF1F2', border: '#FECDD3', label: 'Химия' };
    }
    if (lower.includes('географ') || lower.includes('стран') || lower.includes('карты') || lower.includes('столиц')) {
      return { iconSrc: '/assets/subjects/geography.png', bg: '#EBF8FF', border: '#BAE6FD', label: 'География' };
    }
    if (lower.includes('истор')) {
      return { iconSrc: '/assets/subjects/history.png', bg: '#FEF3C7', border: '#FDE68A', label: 'История' };
    }
    if (lower.includes('информ') || lower.includes('программ') || lower.includes('код') || lower.includes('python')) {
      return { iconSrc: '/assets/subjects/informatics.png', bg: '#ECFDF5', border: '#A7F3D0', label: 'Информатика' };
    }
    if (lower.includes('обществ') || lower.includes('прав') || lower.includes('закон')) {
      return { iconSrc: '/assets/subjects/social.png', bg: '#FFFBEB', border: '#FDE68A', label: 'Обществознание' };
    }
    return { iconSrc: '/assets/subjects/math.png', bg: '#EBF4FF', border: '#A5C9FF', label: 'Математика' };
  };

  const pluralizeStudents = (count: number) => {
    const rem10 = count % 10;
    const rem100 = count % 100;
    if (rem100 >= 11 && rem100 <= 19) return 'учеников';
    if (rem10 === 1) return 'ученик';
    if (rem10 >= 2 && rem10 <= 4) return 'ученика';
    return 'учеников';
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            VIEW 1: CLASS SELECTION ("ВЫБЕРИ КЛАСС")
           ======================================================== */}
        {!selectedClass && (
          <div style={styles.screenFlexCol}>
            {/* Top Bar with Hanging Signboard */}
            <div style={styles.topHeaderBar}>
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

              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                style={styles.hangingSignWrapper}
              >
                <img
                  src="/assets/classes/v2/sign_wood_blank.png"
                  alt="Вывеска"
                  style={styles.hangingSignImg}
                />
                <span style={styles.hangingSignText}>Выбери класс</span>
              </motion.div>

              <div style={{ width: 44 }} />
            </div>

            {/* Action Buttons: "Создать класс" & "Ввести код" */}
            <div style={styles.actionButtonsRow}>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.96, y: 2 }}
                onClick={() => {
                  haptics.impact('medium');
                  setIsCreateModalOpen(true);
                }}
                style={styles.createClassPillBtn}
              >
                <GraduationCap size={20} color="#FFFFFF" strokeWidth={2.2} />
                <span>Создать класс</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.96, y: 2 }}
                onClick={() => {
                  haptics.impact('medium');
                  setIsJoinModalOpen(true);
                }}
                style={styles.joinClassPillBtn}
              >
                <Users size={20} color="#FFFFFF" strokeWidth={2.2} />
                <span>Ввести код</span>
              </motion.button>
            </div>

            {/* Classes List */}
            <div style={styles.cardsScrollDeck}>
              {classes.map((cls, idx) => {
                const mascotSrc = getMascotForClass(cls, idx);
                const count = cls.students_count || 0;

                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: Math.min(idx * 0.06, 0.35),
                      type: 'spring',
                      stiffness: 300,
                      damping: 22,
                    }}
                    whileHover={{ scale: 1.018, y: -2 }}
                    whileTap={{ scale: 0.98, y: 3 }}
                    onClick={() => {
                      haptics.impact('medium');
                      setSelectedClass(cls);
                    }}
                    style={styles.classCard}
                  >
                    <div style={styles.classAvatarSlot}>
                      <img
                        src={mascotSrc}
                        alt="Маскот класса"
                        style={styles.classAvatarImg}
                        draggable={false}
                      />
                    </div>

                    <div style={styles.classInfoCol}>
                      <div style={styles.classTitleText}>{cls.name}</div>
                      <div style={styles.classAcornPill}>
                        <img
                          src="/assets/classes/v2/icon_acorn.png"
                          alt="Желудь"
                          style={styles.acornMiniIcon}
                        />
                        <span style={styles.classAcornCountText}>
                          {count} {pluralizeStudents(count)}
                        </span>
                      </div>
                    </div>

                    <div style={styles.chevronArrowSlot}>
                      <ChevronRight size={26} color="#B88E6A" strokeWidth={2.6} />
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty state when no classes */}
              {classes.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={styles.emptyStateCard}
                >
                  <img
                    src="/assets/classes/v2/avatar_sprint_head.png"
                    alt="Спринт"
                    style={{ width: 68, height: 68, borderRadius: 999, objectFit: 'cover', marginBottom: 8 }}
                  />
                  <h3 style={styles.emptyTitle}>Здесь пока нет классов</h3>
                  <p style={styles.emptySub}>
                    Нажмите <b>«Создать класс»</b> или введите код коллеги, чтобы начать!
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: CLASSROOM HUB WITH 3 SUB-TABS
           ======================================================== */}
        {selectedClass && (
          <div style={styles.screenFlexCol}>
            {/* Header: Back + Signboard with Class Name + Code Pill */}
            <div style={styles.hubHeaderBar}>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  haptics.impact('light');
                  setSelectedClass(null);
                }}
                style={styles.roundBackBtn}
                title="Все классы"
              >
                <ArrowLeft size={22} color="#4A2E18" strokeWidth={2.5} />
              </motion.button>

              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={styles.hangingSignWrapper}
              >
                <img
                  src="/assets/classes/v2/sign_wood_blank.png"
                  alt="Вывеска класса"
                  style={styles.hangingSignImg}
                />
                <span style={styles.hangingSignText}>{selectedClass.name} Класс</span>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => copyInvite(selectedClass.invite_code)}
                style={styles.headerCodePill}
                title="Скопировать ссылку"
              >
                <img
                  src="/assets/classes/v2/icon_acorn.png"
                  alt="Код"
                  style={{ width: 16, height: 16 }}
                />
                <span style={styles.headerCodeText}>
                  {copiedCode === selectedClass.invite_code ? 'Скопировано!' : selectedClass.invite_code}
                </span>
              </motion.button>
            </div>

            {/* 3-Tab Segmented Pill Switcher */}
            <div style={styles.tabSwitcherContainer}>
              <div style={styles.tabSwitcherBar}>
                {/* Sliding active orange pill indicator */}
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    bottom: 4,
                    left: activeSubTab === 'roster' ? '1.5%' : activeSubTab === 'leaderboard' ? '34.5%' : '67.5%',
                    width: '31%',
                    background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
                    boxShadow: '0 3px 0 #C95000, 0 4px 10px rgba(245, 107, 0, 0.35)',
                    borderRadius: 999,
                    zIndex: 1,
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setActiveSubTab('roster');
                  }}
                  style={{
                    ...styles.tabSwitcherBtn,
                    color: activeSubTab === 'roster' ? '#FFFFFF' : '#4A2E18',
                    fontWeight: activeSubTab === 'roster' ? 900 : 700,
                  }}
                >
                  Ученики
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setActiveSubTab('leaderboard');
                  }}
                  style={{
                    ...styles.tabSwitcherBtn,
                    color: activeSubTab === 'leaderboard' ? '#FFFFFF' : '#4A2E18',
                    fontWeight: activeSubTab === 'leaderboard' ? 900 : 700,
                  }}
                >
                  Лидерборд
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setActiveSubTab('gaps');
                  }}
                  style={{
                    ...styles.tabSwitcherBtn,
                    color: activeSubTab === 'gaps' ? '#FFFFFF' : '#4A2E18',
                    fontWeight: activeSubTab === 'gaps' ? 900 : 700,
                  }}
                >
                  Дефициты
                </button>
              </div>
            </div>

            {/* TAB 1: УЧЕНИКИ (ROSTER) */}
            {activeSubTab === 'roster' && (
              <div style={styles.hubTabContent}>
                <div style={styles.tabScrollableList}>
                  {leaderboard.map((student, idx) => {
                    const avatarSrc = getAvatarForStudent(student, idx);
                    const role = getStudentRole(student, idx);

                    return (
                      <motion.div
                        key={student.pseudonym_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + idx * 0.04, type: 'spring' }}
                        whileHover={{ scale: 1.015, x: 2 }}
                        style={styles.studentCard}
                      >
                        <div style={styles.studentAvatarCircle}>
                          <img
                            src={avatarSrc}
                            alt={student.display_name}
                            style={styles.studentAvatarImg}
                          />
                        </div>

                        <div style={styles.studentInfoCol}>
                          <div style={styles.studentNameText}>{student.display_name}</div>
                          <div style={styles.studentRoleText}>{role}</div>
                        </div>

                        <div style={styles.studentPointsPill}>
                          <img
                            src="/assets/classes/v2/icon_acorn.png"
                            alt="Очки"
                            style={styles.acornMiniIcon}
                          />
                          <span style={styles.studentPointsCountText}>{student.total_score}</span>
                        </div>

                        <ChevronRight size={20} color="#C4A688" strokeWidth={2.4} />
                      </motion.div>
                    );
                  })}

                  {leaderboard.length === 0 && !detailsLoading && (
                    <div style={styles.emptySubState}>
                      <Users size={32} color="#B88E6A" />
                      <p style={{ margin: '8px 0 2px', fontSize: 15, fontWeight: 800, color: '#3D2411' }}>
                        В классе пока нет учеников
                      </p>
                      <span style={{ fontSize: 13, color: '#855F3F' }}>
                        Поделитесь кодом <b>{selectedClass.invite_code}</b>
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Hub Actions */}
                <div style={styles.hubBottomBar}>
                  <img
                    src="/assets/classes/v2/icon_leaves.png"
                    alt="Листья"
                    style={{ width: 20, height: 20, flexShrink: 0, transform: 'scaleX(-1)' }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => copyInvite(selectedClass.invite_code)}
                    style={styles.inviteStudentsBtn}
                  >
                    <Share2 size={15} color="#4A2E18" style={{ flexShrink: 0 }} />
                    <span style={styles.inviteStudentsText}>Пригласить учеников</span>
                    <ChevronRight size={16} color="#855F3F" style={{ flexShrink: 0 }} />
                  </motion.button>

                  {onSelectClassForQuiz && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        haptics.impact('medium');
                        onSelectClassForQuiz(selectedClass);
                      }}
                      style={styles.launchQuizPillBtn}
                    >
                      <span>Начать викторину</span>
                    </motion.button>
                  )}
                  <img
                    src="/assets/classes/v2/icon_leaves.png"
                    alt="Листья"
                    style={{ width: 20, height: 20, flexShrink: 0 }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: ЛИДЕРБОРД (LEADERBOARD) */}
            {activeSubTab === 'leaderboard' && (
              <div style={styles.hubTabContent}>
                <div style={styles.tabScrollableList}>
                  {leaderboard.map((student, idx) => {
                    const avatarSrc = getAvatarForStudent(student, idx);
                    const role = getStudentRole(student, idx);

                    // Champion Rank 1
                    if (idx === 0) {
                      return (
                        <motion.div
                          key={student.pseudonym_id}
                          initial={{ scale: 0.92, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                          whileHover={{ scale: 1.02 }}
                          style={styles.champCardRank1}
                        >
                          <div style={styles.crownBadgeSlot}>
                            <img
                              src="/assets/classes/v2/badge_crown_1.png"
                              alt="#1"
                              style={styles.crownBadgeImg}
                            />
                          </div>

                          <div style={styles.studentAvatarCircleLg}>
                            <img
                              src={avatarSrc}
                              alt={student.display_name}
                              style={styles.studentAvatarImg}
                            />
                          </div>

                          <div style={styles.champInfoCol}>
                            <div style={styles.champNameText}>{student.display_name}</div>
                            <div style={styles.champRoleText}>{role}</div>

                            <div style={styles.champStatsRow}>
                              <div style={styles.champAcornPill}>
                                <img
                                  src="/assets/classes/v2/icon_acorn.png"
                                  alt="Очки"
                                  style={{ width: 14, height: 14 }}
                                />
                                <span>{student.total_score}</span>
                              </div>

                              <div style={styles.champFlamePill}>
                                <img
                                  src="/assets/classes/v2/icon_flame.png"
                                  alt="Стрик"
                                  style={{ width: 13, height: 13 }}
                                />
                                <span>{student.max_streak} дн. стрик</span>
                              </div>
                            </div>
                          </div>

                          <img
                            src="/assets/classes/v2/icon_trophy.png"
                            alt="Кубок"
                            style={styles.trophyIconRank1}
                          />
                        </motion.div>
                      );
                    }

                    // Champion Rank 2
                    if (idx === 1) {
                      return (
                        <motion.div
                          key={student.pseudonym_id}
                          initial={{ scale: 0.94, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.08, type: 'spring' }}
                          whileHover={{ scale: 1.02 }}
                          style={styles.champCardRank2}
                        >
                          <div style={styles.crownBadgeSlot}>
                            <img
                              src="/assets/classes/v2/badge_crown_2.png"
                              alt="#2"
                              style={styles.crownBadgeImg}
                            />
                          </div>

                          <div style={styles.studentAvatarCircleLg}>
                            <img
                              src={avatarSrc}
                              alt={student.display_name}
                              style={styles.studentAvatarImg}
                            />
                          </div>

                          <div style={styles.champInfoCol}>
                            <div style={styles.champNameText}>{student.display_name}</div>
                            <div style={styles.champRoleText}>{role}</div>

                            <div style={styles.champStatsRow}>
                              <div style={styles.champAcornPill}>
                                <img
                                  src="/assets/classes/v2/icon_acorn.png"
                                  alt="Очки"
                                  style={{ width: 14, height: 14 }}
                                />
                                <span>{student.total_score}</span>
                              </div>

                              <div style={styles.champFlamePill}>
                                <img
                                  src="/assets/classes/v2/icon_flame.png"
                                  alt="Стрик"
                                  style={{ width: 13, height: 13 }}
                                />
                                <span>{student.max_streak} дн. стрик</span>
                              </div>
                            </div>
                          </div>

                          <img
                            src="/assets/classes/v2/icon_trophy.png"
                            alt="Кубок"
                            style={styles.trophyIconRank2}
                          />
                        </motion.div>
                      );
                    }

                    // Champion Rank 3
                    if (idx === 2) {
                      return (
                        <motion.div
                          key={student.pseudonym_id}
                          initial={{ scale: 0.94, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.14, type: 'spring' }}
                          whileHover={{ scale: 1.02 }}
                          style={styles.champCardRank3}
                        >
                          <div style={styles.crownBadgeSlot}>
                            <img
                              src="/assets/classes/v2/badge_crown_3.png"
                              alt="#3"
                              style={styles.crownBadgeImg}
                            />
                          </div>

                          <div style={styles.studentAvatarCircleLg}>
                            <img
                              src={avatarSrc}
                              alt={student.display_name}
                              style={styles.studentAvatarImg}
                            />
                          </div>

                          <div style={styles.champInfoCol}>
                            <div style={styles.champNameText}>{student.display_name}</div>
                            <div style={styles.champRoleText}>{role}</div>

                            <div style={styles.champStatsRow}>
                              <div style={styles.champAcornPill}>
                                <img
                                  src="/assets/classes/v2/icon_acorn.png"
                                  alt="Очки"
                                  style={{ width: 14, height: 14 }}
                                />
                                <span>{student.total_score}</span>
                              </div>

                              <div style={styles.champFlamePill}>
                                <img
                                  src="/assets/classes/v2/icon_flame.png"
                                  alt="Стрик"
                                  style={{ width: 13, height: 13 }}
                                />
                                <span>{student.max_streak} дн. стрик</span>
                              </div>
                            </div>
                          </div>

                          <img
                            src="/assets/classes/v2/icon_trophy.png"
                            alt="Кубок"
                            style={styles.trophyIconRank3}
                          />
                        </motion.div>
                      );
                    }

                    // Rank 4+ Compact Rows
                    return (
                      <motion.div
                        key={student.pseudonym_id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16 + idx * 0.04 }}
                        style={styles.rankCompactRow}
                      >
                        <div style={styles.rankNumDigit}>{idx + 1}</div>

                        <div style={styles.rankMiniAvatarCircle}>
                          <img
                            src={avatarSrc}
                            alt={student.display_name}
                            style={styles.studentAvatarImg}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
                          <span style={styles.rankMiniNameText}>{student.display_name}</span>
                        </div>

                        <div style={styles.rankMiniScorePill}>
                          <img
                            src="/assets/classes/v2/icon_acorn.png"
                            alt="Очки"
                            style={{ width: 13, height: 13 }}
                          />
                          <span>{student.total_score}</span>
                        </div>

                        <div style={styles.rankMiniStreakPill}>
                          <img
                            src="/assets/classes/v2/icon_flame.png"
                            alt="Стрик"
                            style={{ width: 12, height: 12 }}
                          />
                          <span>{student.max_streak} дн.</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Bottom Bar: "Весь рейтинг" */}
                <div style={styles.hubBottomBar}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' }}>
                    <img
                      src="/assets/classes/v2/icon_leaves.png"
                      alt="Листья"
                      style={{ width: 22, height: 22, transform: 'scaleX(-1)' }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => haptics.impact('light')}
                      style={styles.allRatingBtn}
                    >
                      <img
                        src="/assets/classes/v2/icon_trophy.png"
                        alt="Кубок"
                        style={{ width: 18, height: 18 }}
                      />
                      <span>Весь рейтинг</span>
                      <ChevronRight size={16} color="#855F3F" />
                    </motion.button>
                    <img
                      src="/assets/classes/v2/icon_leaves.png"
                      alt="Листья"
                      style={{ width: 22, height: 22 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ДЕФИЦИТЫ (GAP DIAGNOSTICS & ANALYTICS) */}
            {activeSubTab === 'gaps' && (
              <div style={styles.hubTabContent}>
                <div style={styles.tabScrollableList}>
                  {topicsHeatmap.map((item, idx) => {
                    const info = getSubjectIcon(item.topic);
                    const parts = item.topic.includes(': ') ? item.topic.split(': ') : [info.label, item.topic];
                    const mainSubject = parts[0];
                    const subTopic = parts.slice(1).join(': ') || item.topic;

                    const getBadgeInfo = (acc: number) => {
                      if (acc >= 85) return { text: 'Отлично', bg: '#E8F8F0', border: '#A7F3D0', color: '#10B981', isGood: true };
                      if (acc >= 70) return { text: 'Хорошо', bg: '#E8F8F0', border: '#A7F3D0', color: '#10B981', isGood: true };
                      return { text: 'Требует повторения', bg: '#FFF4E6', border: '#FED7AA', color: '#F56B00', isGood: false };
                    };
                    const badge = getBadgeInfo(item.accuracy_percent);

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 + idx * 0.04 }}
                        style={styles.gapCard}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ ...styles.gapSubjectSquare, backgroundColor: info.bg, border: `1.5px solid ${info.border}` }}>
                            <img
                              src={info.iconSrc}
                              alt={info.label}
                              style={{ width: 34, height: 34, objectFit: 'contain', display: 'block' }}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.gapTopicTitle}>{mainSubject}</div>
                            <div style={styles.gapSubjectSubtitle}>{subTopic}</div>
                          </div>

                          {/* Status Pill Badge */}
                          <div
                            style={{
                              ...styles.gapStatusBadge,
                              backgroundColor: badge.bg,
                              borderColor: badge.border,
                              color: badge.color,
                            }}
                          >
                            {badge.isGood ? (
                              <CheckCircle2 size={13} strokeWidth={2.6} style={{ flexShrink: 0, display: 'block' }} />
                            ) : (
                              <AlertCircle size={13} strokeWidth={2.6} style={{ flexShrink: 0, display: 'block' }} />
                            )}
                            <span style={{ display: 'inline-block', lineHeight: 1 }}>{badge.text}</span>
                          </div>
                        </div>

                        {/* Progress Bar & Percentage */}
                        <div style={styles.gapProgressRow}>
                          <div style={styles.gapProgressTrack}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.accuracy_percent}%` }}
                              transition={{ duration: 0.8, delay: 0.1 + idx * 0.05, ease: 'easeOut' }}
                              style={{
                                ...styles.gapProgressFill,
                                background: badge.isGood
                                  ? 'linear-gradient(90deg, #34D399 0%, #10B981 100%)'
                                  : 'linear-gradient(90deg, #FBBF24 0%, #F56B00 100%)',
                              }}
                            />
                          </div>
                          <span style={styles.gapPercentText}>{item.accuracy_percent}%</span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {topicsHeatmap.length === 0 && !detailsLoading && (
                    <div style={styles.emptySubState}>
                      <BarChart3 size={32} color="#B88E6A" />
                      <p style={{ margin: '8px 0 2px', fontSize: 15, fontWeight: 800, color: '#3D2411' }}>
                        Статистика викторин собирается
                      </p>
                      <span style={{ fontSize: 13, color: '#855F3F' }}>
                        Проведите первую викторину, чтобы увидеть дефициты тем!
                      </span>
                    </div>
                  )}

                  {/* Mascot pedagogical tip card at bottom */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={styles.sprintTipCard}
                  >
                    <img
                      src="/assets/classes/v2/avatar_sprint_head.png"
                      alt="Спринт"
                      style={styles.sprintTipAvatar}
                    />
                    <div style={styles.sprintTipBubble}>
                      <div style={styles.sprintTipTitle}>Совет от Спринта:</div>
                      <div style={styles.sprintTipBody}>
                        {boosters.length > 0 && boosters[0]
                          ? `Рекомендую провести викторину по теме «${boosters[0].topic}». ${boosters[0].rationale}`
                          : 'Побольше практики по темам с оранжевой полоской — и результат класса будет 100%!'}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            MODAL 1: "СОЗДАТЬ КЛАСС" (Sweet 2D Clean Modal)
           ======================================================== */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.modalOverlay}
            >
              <motion.div
                initial={{ y: 60, scale: 0.9, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 60, scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                style={styles.modalCard}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={styles.modalCloseBtn}
                  title="Закрыть"
                >
                  <X size={18} color="#6B4A2F" strokeWidth={2.4} />
                </button>

                <div style={styles.modalHeaderTitle}>Создать новый класс</div>

                <form onSubmit={handleCreateClass}>
                  {/* Parallel Selector (1-11) */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Параллель (класс):</label>
                    <div style={styles.gradeChipsRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                        <motion.button
                          key={g}
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            haptics.selection();
                            setNewGrade(g);
                          }}
                          style={{
                            ...styles.gradeChipBtn,
                            backgroundColor: newGrade === g ? '#FF9126' : '#F7EDE4',
                            color: newGrade === g ? '#FFFFFF' : '#4A2E18',
                            boxShadow: newGrade === g ? '0 3px 0 #C95000' : '0 2px 0 #E5D2C2',
                            borderColor: newGrade === g ? '#FFAF66' : '#E8D5C6',
                          }}
                        >
                          {g}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Letter or Name Input */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Буква или название (например «А», «Б», «ФизМат»):</label>
                    <input
                      type="text"
                      value={newLetter}
                      onChange={(e) => setNewLetter(e.target.value)}
                      placeholder="А"
                      maxLength={10}
                      style={styles.modalTextInput}
                      required
                    />
                  </div>

                  {/* Mascot Selector */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Талисман класса:</label>
                    <div style={styles.mascotsGrid}>
                      {MASCOTS.map((m) => (
                        <motion.div
                          key={m.id}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            haptics.selection();
                            setSelectedMascot(m.id);
                          }}
                          style={{
                            ...styles.mascotPickSlot,
                            boxShadow: selectedMascot === m.id ? '0 0 0 3px #FF9126, 0 4px 10px rgba(255, 145, 38, 0.4)' : 'none',
                            backgroundColor: selectedMascot === m.id ? '#FFF5EA' : 'transparent',
                          }}
                        >
                          <img
                            src={m.src}
                            alt={m.name}
                            style={{ width: '100%', height: '100%', borderRadius: 999, objectFit: 'cover', display: 'block' }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div style={styles.modalActionButtonsRow}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      style={styles.modalCancelBtn}
                    >
                      Отмена
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      disabled={createLoading}
                      style={styles.modalSubmitOrangeBtn}
                    >
                      {createLoading ? 'Открываем...' : 'Открыть класс'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================
            MODAL 2: "ВВЕСТИ КОД" (Sweet 2D Clean Modal)
           ======================================================== */}
        <AnimatePresence>
          {isJoinModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.modalOverlay}
            >
              <motion.div
                initial={{ y: 60, scale: 0.9, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 60, scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                style={styles.modalCard}
              >
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  style={styles.modalCloseBtn}
                  title="Закрыть"
                >
                  <X size={18} color="#6B4A2F" strokeWidth={2.4} />
                </button>

                <div style={styles.modalHeaderTitle}>Присоединиться к классу</div>
                <p style={styles.modalHeaderSubtitle}>
                  Введите 6-значный ключ кабинета, полученный от учителя:
                </p>

                <form onSubmit={handleJoinByKey}>
                  <div style={styles.formGroup}>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="НАПРИМЕР: 7A-FOX"
                      maxLength={12}
                      style={{
                        ...styles.modalTextInput,
                        textAlign: 'center',
                        fontSize: 18,
                        fontWeight: 900,
                        letterSpacing: 2,
                      }}
                      required
                    />
                  </div>

                  {joinError && (
                    <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center', fontWeight: 800 }}>
                      {joinError}
                    </div>
                  )}

                  <div style={styles.modalActionButtonsRow}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setIsJoinModalOpen(false)}
                      style={styles.modalCancelBtn}
                    >
                      Отмена
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      disabled={joinLoading}
                      style={styles.modalSubmitYellowBtn}
                    >
                      {joinLoading ? 'Проверка...' : 'Войти в кабинет'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    position: 'relative',
    width: '100%',
    height: '100dvh',
    overflow: 'hidden',
    backgroundColor: '#FBF9F4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 480,
    height: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: 'radial-gradient(ellipse at 50% 15%, #FFFDF8 0%, #FAF5EC 65%, #F4ECE0 100%)',
  },
  screenFlexCol: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '0 16px',
    boxSizing: 'border-box',
  },
  topHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
    position: 'relative',
    zIndex: 10,
  },
  roundBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3, 0 4px 8px rgba(120, 80, 40, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    outline: 'none',
  },
  hangingSignWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    maxWidth: 260,
    height: 68,
  },
  hangingSignImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  hangingSignText: {
    position: 'relative',
    zIndex: 2,
    fontSize: 20,
    fontWeight: 900,
    color: '#3D2411',
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
    paddingTop: 7,
  },
  actionButtonsRow: {
    display: 'flex',
    gap: 12,
    width: '100%',
    margin: '12px 0 14px',
    boxSizing: 'border-box',
  },
  createClassPillBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
    border: '2px solid #FFAF66',
    boxShadow: '0 4px 0 #C95000, 0 6px 14px rgba(245, 107, 0, 0.28)',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    outline: 'none',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
  },
  joinClassPillBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FFC933 0%, #F5AE0B 100%)',
    border: '2px solid #FFE082',
    boxShadow: '0 4px 0 #C98800, 0 6px 14px rgba(245, 174, 11, 0.28)',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    outline: 'none',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
  },
  cardsScrollDeck: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 28,
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  classCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    border: '2.5px solid #E8CDB2',
    borderRadius: 24,
    boxShadow: '0 5px 0 #E2BE97, 0 8px 18px rgba(180, 130, 80, 0.12)',
    padding: '10px 18px 10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxSizing: 'border-box',
    cursor: 'pointer',
    userSelect: 'none',
  },
  classAvatarSlot: {
    width: 72,
    height: 72,
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  classInfoCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  classTitleText: {
    fontSize: 26,
    fontWeight: 900,
    color: '#3D2411',
    lineHeight: 1.15,
  },
  classAcornPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7EDE4',
    borderRadius: 999,
    padding: '3px 10px',
    alignSelf: 'flex-start',
  },
  acornMiniIcon: {
    width: 15,
    height: 15,
    objectFit: 'contain',
  },
  classAcornCountText: {
    fontSize: 13,
    fontWeight: 800,
    color: '#5C3A1E',
    fontVariantNumeric: 'tabular-nums',
  },
  chevronArrowSlot: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    border: '2.5px solid #E8CDB2',
    borderRadius: 24,
    boxShadow: '0 5px 0 #E2BE97, 0 8px 18px rgba(180, 130, 80, 0.12)',
    padding: '36px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    margin: '4px 0',
    fontSize: 17,
    fontWeight: 900,
    color: '#3D2411',
  },
  emptySub: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#855F3F',
    lineHeight: 1.4,
  },
  hubHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  headerCodePill: {
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    cursor: 'pointer',
    outline: 'none',
  },
  headerCodeText: {
    fontSize: 12,
    fontWeight: 900,
    color: '#5C3A1E',
  },
  tabSwitcherContainer: {
    width: '100%',
    margin: '10px 0 12px',
  },
  tabSwitcherBar: {
    position: 'relative',
    width: '100%',
    height: 46,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #E0B78B, 0 6px 12px rgba(140, 90, 40, 0.08)',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    padding: 3,
    boxSizing: 'border-box',
  },
  tabSwitcherBtn: {
    flex: 1,
    height: '100%',
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    cursor: 'pointer',
    position: 'relative',
    zIndex: 2,
    transition: 'color 0.15s ease',
  },
  hubTabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabScrollableList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingBottom: 16,
    scrollbarWidth: 'none',
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    border: '2px solid #E8CDB2',
    borderRadius: 20,
    boxShadow: '0 4px 0 #E2BE97, 0 6px 14px rgba(180, 130, 80, 0.08)',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxSizing: 'border-box',
  },
  studentAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  studentAvatarCircleLg: {
    width: 58,
    height: 58,
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  studentAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  studentInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: 900,
    color: '#3D2411',
  },
  studentRoleText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#855F3F',
    marginTop: 1,
  },
  studentPointsPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F7EDE4',
    borderRadius: 999,
    padding: '4px 10px',
  },
  studentPointsCountText: {
    fontSize: 14,
    fontWeight: 900,
    color: '#3D2411',
    fontVariantNumeric: 'tabular-nums',
  },
  hubBottomBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 20,
    width: '100%',
    boxSizing: 'border-box',
  },
  inviteStudentsBtn: {
    flex: 1.1,
    minWidth: 0,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3',
    color: '#4A2E18',
    fontSize: 12,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
  },
  inviteStudentsText: {
    margin: '0 2px',
    textAlign: 'center',
    lineHeight: 1.2,
    flex: 1,
    whiteSpace: 'nowrap',
  },
  launchQuizPillBtn: {
    flex: 0.9,
    minWidth: 0,
    height: 44,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
    border: '2px solid #FFAF66',
    boxShadow: '0 3px 0 #C95000, 0 6px 12px rgba(245, 107, 0, 0.3)',
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
    whiteSpace: 'nowrap',
  },
  allRatingBtn: {
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3, 0 4px 10px rgba(120, 80, 40, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 20px',
    cursor: 'pointer',
    color: '#4A2E18',
    fontSize: 14,
    fontWeight: 800,
    outline: 'none',
  },
  champCardRank1: {
    background: 'linear-gradient(180deg, #FFFDF0 0%, #FFF8D6 100%)',
    border: '2.5px solid #F5C842',
    boxShadow: '0 5px 0 #DDAE25, 0 8px 18px rgba(245, 200, 66, 0.2)',
    borderRadius: 22,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    boxSizing: 'border-box',
  },
  champCardRank2: {
    background: 'linear-gradient(180deg, #F4F9FF 0%, #E8F2FF 100%)',
    border: '2.5px solid #94C5FF',
    boxShadow: '0 5px 0 #73A9E8, 0 8px 18px rgba(115, 169, 232, 0.15)',
    borderRadius: 22,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    boxSizing: 'border-box',
  },
  champCardRank3: {
    background: 'linear-gradient(180deg, #FFF8F2 0%, #FFEEE0 100%)',
    border: '2.5px solid #E8A878',
    boxShadow: '0 5px 0 #C98452, 0 8px 18px rgba(201, 132, 82, 0.15)',
    borderRadius: 22,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    boxSizing: 'border-box',
  },
  crownBadgeSlot: {
    width: 38,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  crownBadgeImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  champInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  champNameText: {
    fontSize: 16,
    fontWeight: 900,
    color: '#3D2411',
  },
  champRoleText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#855F3F',
    marginBottom: 4,
  },
  champStatsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  champAcornPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 800,
    color: '#3D2411',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  champFlamePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 800,
    color: '#EA580C',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  trophyIconRank1: {
    width: 32,
    height: 32,
    objectFit: 'contain',
    flexShrink: 0,
  },
  trophyIconRank2: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'hue-rotate(180deg) saturate(0.6)',
  },
  trophyIconRank3: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'sepia(0.8) saturate(1.4)',
  },
  rankCompactRow: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E8CDB2',
    borderRadius: 16,
    boxShadow: '0 3px 0 #E2BE97',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  rankNumDigit: {
    fontSize: 14,
    fontWeight: 900,
    color: '#855F3F',
    width: 20,
    textAlign: 'center',
  },
  rankMiniAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  rankMiniNameText: {
    fontSize: 14,
    fontWeight: 800,
    color: '#3D2411',
  },
  rankMiniScorePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F7EDE4',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 900,
    color: '#3D2411',
  },
  rankMiniStreakPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF4EA',
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 800,
    color: '#EA580C',
  },
  gapCard: {
    backgroundColor: '#FFFFFF',
    border: '2px solid #E8CDB2',
    borderRadius: 20,
    boxShadow: '0 4px 0 #E2BE97, 0 6px 14px rgba(180, 130, 80, 0.08)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  gapSubjectSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(120, 80, 40, 0.08)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  gapTopicTitle: {
    fontSize: 15,
    fontWeight: 900,
    color: '#3D2411',
    lineHeight: 1.2,
  },
  gapSubjectSubtitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#855F3F',
    marginTop: 2,
  },
  gapStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 999,
    border: '1.5px solid',
    padding: '4px 10px',
    fontSize: 11.5,
    fontWeight: 800,
    lineHeight: 1,
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  gapProgressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  gapProgressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F5ECE3',
    borderRadius: 999,
    overflow: 'hidden',
  },
  gapProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  gapPercentText: {
    fontSize: 13,
    fontWeight: 900,
    color: '#3D2411',
    fontVariantNumeric: 'tabular-nums',
    width: 36,
    textAlign: 'right',
  },
  sprintTipCard: {
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 4px 0 #D8BEA3, 0 6px 14px rgba(120, 80, 40, 0.08)',
    borderRadius: 20,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  sprintTipAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    objectFit: 'cover',
    flexShrink: 0,
  },
  sprintTipBubble: {
    flex: 1,
  },
  sprintTipTitle: {
    fontSize: 13,
    fontWeight: 900,
    color: '#F56B00',
    marginBottom: 2,
  },
  sprintTipBody: {
    fontSize: 12,
    color: '#5C3A1E',
    lineHeight: 1.35,
    fontWeight: 600,
  },
  emptySubState: {
    backgroundColor: '#FFFFFF',
    border: '2px solid #E8CDB2',
    borderRadius: 20,
    padding: '30px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '12px 0',
  },
  modalOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(50, 30, 15, 0.55)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
  },
  modalCard: {
    position: 'relative',
    backgroundColor: '#FFFDF9',
    border: '3px solid #E5C39E',
    boxShadow: '0 8px 0 #D4AE85, 0 20px 40px rgba(80, 50, 20, 0.25)',
    borderRadius: 28,
    padding: '24px 20px',
    width: '100%',
    maxWidth: 380,
    boxSizing: 'border-box',
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#F5ECE3',
    border: '1.5px solid #E8D5C6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    outline: 'none',
  },
  modalHeaderTitle: {
    fontSize: 19,
    fontWeight: 900,
    color: '#3D2411',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalHeaderSubtitle: {
    fontSize: 13,
    color: '#855F3F',
    textAlign: 'center',
    margin: '-8px 0 14px',
    lineHeight: 1.35,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 800,
    color: '#5C3A1E',
    marginBottom: 6,
  },
  gradeChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  gradeChipBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    outline: 'none',
  },
  modalTextInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    border: '2px solid #E5C39E',
    borderRadius: 12,
    padding: '9px 12px',
    color: '#3D2411',
    fontSize: 15,
    fontWeight: 800,
    boxSizing: 'border-box',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
  },
  mascotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 6,
    width: '100%',
    boxSizing: 'border-box',
    alignItems: 'center',
    justifyItems: 'center',
  },
  mascotPickSlot: {
    width: '100%',
    maxWidth: 46,
    aspectRatio: '1/1',
    borderRadius: 999,
    padding: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  },
  modalActionButtonsRow: {
    display: 'flex',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#F5ECE3',
    border: '1.5px solid #E8D5C6',
    boxShadow: '0 3px 0 #D8BEA3',
    color: '#6B4A2F',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    outline: 'none',
  },
  modalSubmitOrangeBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
    border: '2px solid #FFAF66',
    boxShadow: '0 4px 0 #C95000, 0 6px 12px rgba(245, 107, 0, 0.3)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    outline: 'none',
  },
  modalSubmitYellowBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FFC933 0%, #F5AE0B 100%)',
    border: '2px solid #FFE082',
    boxShadow: '0 4px 0 #C98800, 0 6px 12px rgba(245, 174, 11, 0.3)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    outline: 'none',
  },
};
