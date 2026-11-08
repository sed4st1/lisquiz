import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import { assignmentApi, DailyQuestData, StudentMistake, TeacherAssignment } from '../services/assignmentApi';

interface StudentQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  acorns?: number;
  streak: number;
  className?: string;
  onAddAcorns: (amount: number) => void;
  onAddXp?: (amount: number) => void;
  onGoToGrove?: () => void;
  onJoinGameWithPin?: (pin: string) => void;
}

interface QuestionChallenge {
  id: string | number;
  title: string;
  subject: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  rewardAcorns: number;
  rewardXp: number;
  isMistake?: boolean;
}

export default function StudentQuestsModal({
  isOpen,
  onClose,
  streak: propStreak,
  className = '5А',
  onAddAcorns,
  onAddXp,
  onGoToGrove,
  onJoinGameWithPin,
}: StudentQuestsModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'daily' | 'redemption' | 'teacher'>('daily');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Real backend data
  const [dailyData, setDailyData] = useState<DailyQuestData | null>(null);
  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [studentClassName, setStudentClassName] = useState<string>(className);

  // Active Challenge modal state
  const [activeChallenge, setActiveChallenge] = useState<QuestionChallenge | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Load real data from DB whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([
      assignmentApi.getDailyQuests(),
      assignmentApi.getMistakes(),
      assignmentApi.getMyAssignments(),
    ]).then(([dailyRes, mistakesRes, asgRes]) => {
      if (!isMounted) return;
      if (dailyRes.status === 'fulfilled') {
        setDailyData(dailyRes.value);
      }
      if (mistakesRes.status === 'fulfilled') {
        setMistakes(mistakesRes.value);
      }
      if (asgRes.status === 'fulfilled') {
        setAssignments(asgRes.value.assignments || []);
        if (asgRes.value.class_name) {
          setStudentClassName(asgRes.value.class_name);
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Derived daily progress
  const quests = dailyData?.quests;
  const streakDays = dailyData?.streak_days ?? propStreak ?? 1;
  const dailyTotal = 3;
  const dailyClaimedCount =
    (quests?.warmup_claimed ? 1 : 0) +
    (quests?.grove_claimed ? 1 : 0) +
    (quests?.quiz_claimed ? 1 : 0);
  const isAllDailyClaimed = dailyClaimedCount >= dailyTotal;

  // Handle Challenge Option Click
  const handleSelectOption = async (idx: number) => {
    if (isAnswered || !activeChallenge) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const correct = idx === activeChallenge.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      soundManager.playCorrect();
      haptics.notification('success');
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FF7A00', '#10B981', '#F59E0B', '#3B82F6'],
        });
      } catch {}

      if (activeChallenge.isMistake) {
        // Resolve real mistake in DB
        try {
          const res = await assignmentApi.resolveMistake(Number(activeChallenge.id));
          onAddAcorns(res.reward_acorns || 40);
          if (onAddXp) onAddXp(100);
          // Remove from local list
          setMistakes((prev) => prev.filter((m) => m.id !== activeChallenge.id));
        } catch (e) {
          console.warn('Resolve mistake error:', e);
        }
      } else {
        // Warmup quest completed in dailyData
        setDailyData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            quests: { ...prev.quests, warmup_solved: true },
          };
        });
      }
    } else {
      soundManager.playWrong();
      haptics.notification('error');
    }
  };

  // Claim Daily Quest Reward from DB
  const handleClaimDaily = async (questId: 'warmup' | 'grove' | 'quiz' | 'chest') => {
    soundManager.playCorrect();
    haptics.impact('medium');
    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#F59E0B', '#10B981', '#FF7A00'],
      });
    } catch {}

    try {
      const res = await assignmentApi.claimDaily(questId);
      onAddAcorns(res.acorns_awarded || 20);
      if (res.xp_awarded && onAddXp) onAddXp(res.xp_awarded);

      setDailyData((prev) => {
        if (!prev) return prev;
        const patch: any = {};
        if (questId === 'warmup') patch.warmup_claimed = true;
        if (questId === 'grove') patch.grove_claimed = true;
        if (questId === 'quiz') patch.quiz_claimed = true;
        if (questId === 'chest') patch.chest_claimed = true;
        return {
          ...prev,
          quests: { ...prev.quests, ...patch },
        };
      });
    } catch (e) {
      console.warn('Claim daily quest error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={styles.modalOverlay}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          style={styles.modalBox}
        >
          {/* Close button */}
          <button
            onClick={() => {
              soundManager.playKnock();
              onClose();
            }}
            style={styles.modalCloseBtn}
            aria-label="Закрыть"
          >
            <X size={20} color="#64748B" />
          </button>

          {/* Header */}
          <div style={styles.modalHeader}>
            <div style={styles.modalIconWrap}>
              <img
                src="/assets/icons/quest_book.png"
                alt="Задания"
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
            </div>
            <div>
              <h2 style={styles.modalTitle}>Квесты и Задания</h2>
              <p style={styles.modalSub}>Выполняй задания, закрывай ошибки и копи жёлуди!</p>
            </div>
          </div>

          {/* Daily Progress & Chest Card */}
          <div style={styles.dailyProgressCard}>
            <div style={styles.progressTopRow}>
              <div style={styles.progressInfoWrap}>
                <span style={styles.progressLabel}>Дневные квесты</span>
                <span style={styles.progressCount}>{dailyClaimedCount} из {dailyTotal}</span>
              </div>
              <div style={styles.streakPill}>
                <img src="/assets/icons/flame.png" alt="Огонёк" style={{ width: 14, height: 14 }} />
                <span>{streakDays} дн. стрик</span>
              </div>
            </div>

            {/* Progress Fill Bar */}
            <div style={styles.progressBarTrack}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(dailyClaimedCount / dailyTotal) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={styles.progressBarFill}
              />
            </div>

            {/* Bonus Chest Action */}
            <div style={styles.chestRow}>
              <div style={styles.chestLeft}>
                <img
                  src="/assets/icons/chest.png"
                  alt="Сундук дня"
                  style={{
                    width: 38,
                    height: 38,
                    objectFit: 'contain',
                    filter: isAllDailyClaimed && !quests?.chest_claimed ? 'drop-shadow(0 0 8px #F59E0B)' : 'none',
                  }}
                />
                <div>
                  <div style={styles.chestTitle}>
                    {quests?.chest_claimed
                      ? '🎉 Бонус дня получен!'
                      : isAllDailyClaimed
                      ? 'Золотой сундук разблокирован!'
                      : 'Сундук за 3 дейлика'}
                  </div>
                  <div style={styles.chestSubtitle}>
                    {quests?.chest_claimed ? '+50 желудей начислено' : '+50 желудей и +200 XP'}
                  </div>
                </div>
              </div>

              {isAllDailyClaimed && !quests?.chest_claimed ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleClaimDaily('chest')}
                  style={styles.claimChestBtn}
                >
                  <Sparkles size={14} />
                  <span>Открыть</span>
                </motion.button>
              ) : (
                <div style={styles.chestStatusBadge}>
                  {quests?.chest_claimed ? 'Забрано ✓' : `${dailyClaimedCount}/3`}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Category Tabs */}
          <div style={styles.tabsRow}>
            <button
              onClick={() => {
                soundManager.playTap();
                setActiveTab('daily');
              }}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'daily' ? styles.tabBtnActive : {}),
              }}
            >
              <span>⚡ Ежедневные</span>
              <span style={styles.tabBadge}>{dailyTotal}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playTap();
                setActiveTab('redemption');
              }}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'redemption' ? styles.tabBtnActive : {}),
              }}
            >
              <span>🛠 Ошибки</span>
              <span style={{
                ...styles.tabBadge,
                backgroundColor: mistakes.length > 0 ? '#EF4444' : '#10B981',
              }}>
                {mistakes.length}
              </span>
            </button>

            <button
              onClick={() => {
                soundManager.playTap();
                setActiveTab('teacher');
              }}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'teacher' ? styles.tabBtnActive : {}),
              }}
            >
              <span>📚 От учителя</span>
              <span style={styles.tabBadge}>{assignments.length}</span>
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B', fontSize: 13 }}>
              Загрузка заданий из базы данных...
            </div>
          ) : (
            <>
              {/* TAB 1: DAILY QUESTS */}
              {activeTab === 'daily' && (
                <div style={styles.questList}>
                  {/* Quest 1: Разминка */}
                  <div style={styles.questCard}>
                    <div style={styles.questIconCol}>
                      <div style={{ ...styles.questIconCircle, backgroundColor: '#FEF3C7' }}>
                        <img src="/assets/icons/star_medal.png" alt="Разминка" style={styles.questIconImg} />
                      </div>
                    </div>
                    <div style={styles.questBodyCol}>
                      <div style={styles.questCardTitle}>Разминка со Спринтом</div>
                      <div style={styles.questCardDesc}>
                        {dailyData?.daily_question?.text || 'Реши быстрый мини-вопрос дня'}
                      </div>
                      <div style={styles.questRewardTag}>
                        <span>+20</span>
                        <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                        <span style={styles.xpBonus}>+50 XP</span>
                      </div>
                    </div>
                    <div style={styles.questActionCol}>
                      {quests?.warmup_claimed ? (
                        <div style={styles.claimedBadge}>
                          <Check size={14} /> Выполнено
                        </div>
                      ) : quests?.warmup_solved ? (
                        <button
                          onClick={() => handleClaimDaily('warmup')}
                          style={styles.claimBtn}
                        >
                          Забрать
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundManager.playTap();
                            const q = dailyData?.daily_question;
                            if (q) {
                              setActiveChallenge({
                                id: q.id,
                                title: '⚡ Разминка от Спринта',
                                subject: q.subject,
                                text: q.text,
                                options: q.options,
                                correctIndex: q.correct_index,
                                explanation: q.explanation,
                                rewardAcorns: q.reward_acorns,
                                rewardXp: q.reward_xp,
                                isMistake: false,
                              });
                              setSelectedOption(null);
                              setIsAnswered(false);
                            }
                          }}
                          style={styles.actionBtn}
                        >
                          Решить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quest 2: Забота о Роще */}
                  <div style={styles.questCard}>
                    <div style={styles.questIconCol}>
                      <div style={{ ...styles.questIconCircle, backgroundColor: '#E0F2FE' }}>
                        <img src="/assets/icons/water_drop.png" alt="Вода" style={styles.questIconImg} />
                      </div>
                    </div>
                    <div style={styles.questBodyCol}>
                      <div style={styles.questCardTitle}>Забота о Роще</div>
                      <div style={styles.questCardDesc}>Полей Древо {studentClassName} класса 1 раз сегодня</div>
                      <div style={styles.questRewardTag}>
                        <span>+20</span>
                        <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                        <span style={styles.xpBonus}>+40 XP</span>
                      </div>
                    </div>
                    <div style={styles.questActionCol}>
                      {quests?.grove_claimed ? (
                        <div style={styles.claimedBadge}>
                          <Check size={14} /> Выполнено
                        </div>
                      ) : quests?.grove_watered ? (
                        <button
                          onClick={() => handleClaimDaily('grove')}
                          style={styles.claimBtn}
                        >
                          Забрать
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundManager.playTap();
                            handleClaimDaily('grove');
                            onClose();
                            if (onGoToGrove) onGoToGrove();
                          }}
                          style={styles.actionBtn}
                        >
                          Полить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quest 3: Охотник за знаниями */}
                  <div style={styles.questCard}>
                    <div style={styles.questIconCol}>
                      <div style={{ ...styles.questIconCircle, backgroundColor: '#FEE2E2' }}>
                        <img src="/assets/icons/sun.png" alt="Викторина" style={styles.questIconImg} />
                      </div>
                    </div>
                    <div style={styles.questBodyCol}>
                      <div style={styles.questCardTitle}>Охотник за знаниями</div>
                      <div style={styles.questCardDesc}>Сыграй в любую викторину на уроке или дома</div>
                      <div style={styles.questRewardTag}>
                        <span>+35</span>
                        <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                        <span style={styles.xpBonus}>+100 XP</span>
                      </div>
                    </div>
                    <div style={styles.questActionCol}>
                      {quests?.quiz_claimed ? (
                        <div style={styles.claimedBadge}>
                          <Check size={14} /> Выполнено
                        </div>
                      ) : quests?.quiz_played ? (
                        <button
                          onClick={() => handleClaimDaily('quiz')}
                          style={styles.claimBtn}
                        >
                          Забрать
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundManager.playTap();
                            onClose();
                          }}
                          style={{ ...styles.actionBtn, backgroundColor: '#3B82F6' }}
                        >
                          К викторине
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REDEMPTION (РЕАЛЬНЫЕ ОШИБКИ ИЗ ВИКТОРИН) */}
              {activeTab === 'redemption' && (
                <div style={styles.questList}>
                  {mistakes.length === 0 ? (
                    <div style={styles.emptyStateBox}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>
                        Ошибок не найдено!
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                        Вы ответили верно на все вопросы в последних викторинах. Сыграйте новую викторину на уроке!
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.infoBanner}>
                        <div style={{ fontSize: 20 }}>🧠</div>
                        <div style={styles.infoBannerText}>
                          Реальные ошибки из ваших последних викторин. Исправьте их, чтобы вернуть очки и получить жёлуди!
                        </div>
                      </div>

                      {mistakes.map((m) => (
                        <div key={m.id} style={styles.questCard}>
                          <div style={styles.questIconCol}>
                            <div style={{ ...styles.questIconCircle, backgroundColor: '#EDE9FE' }}>
                              <img src="/assets/icons/star_medal.png" alt="Ошибка" style={styles.questIconImg} />
                            </div>
                          </div>
                          <div style={styles.questBodyCol}>
                            <div style={styles.questCardTitle}>{m.topic || 'Повторение темы'}</div>
                            <div style={styles.questCardDesc}>{m.question_text}</div>
                            <div style={styles.questRewardTag}>
                              <span>+{m.reward_acorns}</span>
                              <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                              <span style={styles.xpBonus}>+{m.reward_xp} XP</span>
                            </div>
                          </div>
                          <div style={styles.questActionCol}>
                            <button
                              onClick={() => {
                                soundManager.playTap();
                                setActiveChallenge({
                                  id: m.id,
                                  title: `🛠 ${m.topic}`,
                                  subject: 'Работа над ошибками',
                                  text: m.question_text,
                                  options: m.options,
                                  correctIndex: m.correct_index,
                                  explanation: m.explanation,
                                  rewardAcorns: m.reward_acorns,
                                  rewardXp: m.reward_xp,
                                  isMistake: true,
                                });
                                setSelectedOption(null);
                                setIsAnswered(false);
                              }}
                              style={{ ...styles.actionBtn, backgroundColor: '#8B5CF6' }}
                            >
                              Исправить
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: TEACHER ASSIGNMENTS (РЕАЛЬНЫЕ ЗАДАНИЯ ОТ УЧИТЕЛЯ) */}
              {activeTab === 'teacher' && (
                <div style={styles.questList}>
                  {assignments.length === 0 ? (
                    <div style={styles.emptyStateBox}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📚</div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>
                        Заданий от учителя пока нет
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                        Когда учитель назначит домашнее задание для {studentClassName} класса, оно сразу появится здесь.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ ...styles.infoBanner, backgroundColor: '#ECFDF5', borderColor: '#10B981' }}>
                        <div style={{ fontSize: 20 }}>👩‍🏫</div>
                        <div style={{ ...styles.infoBannerText, color: '#065F46' }}>
                          Домашние задания, выданные вашим учителем для {studentClassName} класса.
                        </div>
                      </div>

                      {assignments.map((asg) => (
                        <div key={asg.id} style={styles.questCard}>
                          <div style={styles.questIconCol}>
                            <div style={{ ...styles.questIconCircle, backgroundColor: '#D1FAE5' }}>
                              <img src="/assets/icons/shield_rank.png" alt="Задание" style={styles.questIconImg} />
                            </div>
                          </div>
                          <div style={styles.questBodyCol}>
                            <div style={styles.questCardTitle}>{asg.title}</div>
                            <div style={styles.questCardDesc}>
                              {asg.subject} ({asg.grade} класс) • Срок: {asg.deadline_days} дн.
                            </div>
                            <div style={styles.questRewardTag}>
                              <span>+{asg.reward_acorns}</span>
                              <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                              <span style={styles.xpBonus}>+{asg.reward_xp} XP</span>
                            </div>
                          </div>
                          <div style={styles.questActionCol}>
                            {asg.is_completed ? (
                              <div style={styles.claimedBadge}>
                                <Check size={14} /> Сдано
                              </div>
                            ) : (
                              <button
                                onClick={async () => {
                                  soundManager.playTap();
                                  try {
                                    if (asg.quiz_id && onJoinGameWithPin) {
                                      onClose();
                                      onJoinGameWithPin(asg.quiz_id);
                                      return;
                                    }
                                    // Submit assignment directly or launch quiz
                                    const res = await assignmentApi.submitAssignment(asg.id, 850, 100);
                                    onAddAcorns(res.reward_acorns || asg.reward_acorns);
                                    if (onAddXp) onAddXp(asg.reward_xp);
                                    setAssignments((prev) =>
                                      prev.map((a) => (a.id === asg.id ? { ...a, is_completed: true } : a))
                                    );
                                    soundManager.playCorrect();
                                    haptics.notification('success');
                                  } catch (e) {
                                    console.warn('Submit error:', e);
                                  }
                                }}
                                style={{ ...styles.actionBtn, backgroundColor: '#059669' }}
                              >
                                Сдать
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Interactive Challenge Sub-Modal Overlay */}
          <AnimatePresence>
            {activeChallenge && (
              <div style={styles.challengeOverlay}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={styles.challengeBox}
                >
                  <div style={styles.challengeHeader}>
                    <div>
                      <div style={styles.challengeSubject}>{activeChallenge.subject}</div>
                      <div style={styles.challengeTitle}>{activeChallenge.title}</div>
                    </div>
                    <button
                      onClick={() => {
                        soundManager.playKnock();
                        setActiveChallenge(null);
                      }}
                      style={styles.challengeCloseBtn}
                    >
                      <X size={18} color="#64748B" />
                    </button>
                  </div>

                  {/* Mascot Tip */}
                  <div style={styles.mascotSpeechRow}>
                    <img
                      src={isAnswered ? (isCorrect ? '/assets/mascot/celebrate.png' : '/assets/mascot/thinking.png') : '/assets/mascot/wave.png'}
                      alt="Спринт"
                      style={styles.mascotAvatar}
                    />
                    <div style={styles.speechBubble}>
                      {!isAnswered
                        ? 'Реши этот вопрос, чтобы доказать знание темы и забрать жёлуди!'
                        : isCorrect
                        ? '🎉 Отлично! Абсолютно верно. Ты закрыл пробел!'
                        : 'Немного не так. Прочитай объяснение ниже и попробуй ещё раз!'}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div style={styles.questionText}>{activeChallenge.text}</div>

                  {/* Options */}
                  <div style={styles.optionsGrid}>
                    {activeChallenge.options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isOptionCorrect = idx === activeChallenge.correctIndex;

                      let btnBg = '#FFFFFF';
                      let btnBorder = '#CBD5E1';
                      let textColor = '#1E293B';

                      if (isAnswered) {
                        if (isOptionCorrect) {
                          btnBg = '#DCFCE7';
                          btnBorder = '#16A34A';
                          textColor = '#166534';
                        } else if (isSelected) {
                          btnBg = '#FEE2E2';
                          btnBorder = '#DC2626';
                          textColor = '#991B1B';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(idx)}
                          disabled={isAnswered}
                          style={{
                            ...styles.optionBtn,
                            backgroundColor: btnBg,
                            borderColor: btnBorder,
                            color: textColor,
                          }}
                        >
                          <span style={styles.optionLetter}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span style={{ fontWeight: 700 }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation when answered */}
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        ...styles.explanationBox,
                        backgroundColor: isCorrect ? '#F0FDF4' : '#FFF1F2',
                        borderColor: isCorrect ? '#86EFAC' : '#FECDD3',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13, color: isCorrect ? '#166534' : '#991B1B', marginBottom: 4 }}>
                        {isCorrect ? '✓ Правильно!' : 'Объяснение:'}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                        {activeChallenge.explanation}
                      </div>
                    </motion.div>
                  )}

                  {/* Finish / Retry Button */}
                  {isAnswered && (
                    <button
                      onClick={() => {
                        soundManager.playKnock();
                        if (isCorrect) {
                          setActiveChallenge(null);
                        } else {
                          // Allow retry
                          setIsAnswered(false);
                          setSelectedOption(null);
                        }
                      }}
                      style={{
                        ...styles.challengeDoneBtn,
                        backgroundColor: isCorrect ? '#10B981' : '#F59E0B',
                      }}
                    >
                      {isCorrect ? 'Готово!' : 'Попробовать снова'}
                    </button>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    boxSizing: 'border-box',
  },
  modalBox: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#FFFDF2',
    border: '3px solid #FFFDF2',
    borderBottom: '8px solid #E5DBC7',
    borderRadius: 28,
    padding: '20px 18px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.30)',
    boxSizing: 'border-box',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingRight: 28,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    border: '2px solid #BAE6FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 19,
    fontWeight: 900,
    color: '#1E293B',
    margin: 0,
  },
  modalSub: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11.5,
    color: '#64748B',
    margin: '3px 0 0',
  },

  // Daily Progress Card
  dailyProgressCard: {
    backgroundColor: '#FFFFFF',
    border: '2px solid #E2E8F0',
    borderRadius: 18,
    padding: '12px 14px',
    marginBottom: 14,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  progressTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressInfoWrap: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 900,
    color: '#1E293B',
    fontFamily: "'Comfortaa', sans-serif",
  },
  progressCount: {
    fontSize: 12,
    fontWeight: 800,
    color: '#059669',
  },
  streakPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    border: '1px solid #FFEDD5',
    borderRadius: 9999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 800,
    color: '#EA580C',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 9999,
  },
  chestRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '1px dashed #E2E8F0',
  },
  chestLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  chestTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#1E293B',
  },
  chestSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 600,
  },
  claimChestBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
  },
  chestStatusBadge: {
    fontSize: 11,
    fontWeight: 800,
    color: '#94A3B8',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: '3px 8px',
  },

  // Tabs Row
  tabsRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    border: '1.5px solid #E2E8F0',
    borderRadius: 12,
    padding: '8px 4px',
    fontSize: 11.5,
    fontWeight: 800,
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    color: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
  },
  tabBadge: {
    fontSize: 10,
    fontWeight: 900,
    backgroundColor: 'rgba(0,0,0,0.15)',
    color: 'inherit',
    borderRadius: 9999,
    padding: '1px 5px',
  },

  // Quest List
  questList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    border: '2px dashed #CBD5E1',
    borderRadius: 18,
    padding: '24px 16px',
    textAlign: 'center',
  },
  questCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderBottom: '3.5px solid #CBD5E1',
    borderRadius: 16,
    padding: '10px 12px',
    boxSizing: 'border-box',
  },
  questIconCol: {
    flexShrink: 0,
  },
  questIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questIconImg: {
    width: 22,
    height: 22,
    objectFit: 'contain',
  },
  questBodyCol: {
    flex: 1,
    minWidth: 0,
  },
  questCardTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#1E293B',
    fontFamily: "'Comfortaa', sans-serif",
  },
  questCardDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 1.25,
  },
  questRewardTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 11.5,
    fontWeight: 900,
    color: '#D97706',
    marginTop: 4,
  },
  miniAcorn: {
    width: 13,
    height: 13,
    objectFit: 'contain',
  },
  xpBonus: {
    fontSize: 10,
    fontWeight: 700,
    color: '#10B981',
    marginLeft: 4,
  },
  questActionCol: {
    flexShrink: 0,
  },
  actionBtn: {
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    padding: '7px 12px',
    fontSize: 11.5,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(255, 122, 0, 0.25)',
  },
  claimBtn: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    padding: '7px 12px',
    fontSize: 11.5,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
  },
  claimedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 11,
    fontWeight: 700,
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    padding: '4px 8px',
    borderRadius: 8,
  },
  infoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 14,
    padding: '10px 12px',
    marginBottom: 10,
  },
  infoBannerText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: 600,
    lineHeight: 1.35,
  },

  // Interactive Challenge Overlay
  challengeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255, 253, 242, 0.98)',
    borderRadius: 28,
    padding: '20px 18px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  challengeBox: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  challengeHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  challengeSubject: {
    fontSize: 10.5,
    fontWeight: 800,
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#1E293B',
    fontFamily: "'Comfortaa', sans-serif",
  },
  challengeCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  mascotSpeechRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0',
    borderRadius: 16,
    padding: '8px 12px',
    marginBottom: 14,
  },
  mascotAvatar: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    flexShrink: 0,
  },
  speechBubble: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  questionText: {
    fontSize: 15,
    fontWeight: 800,
    color: '#0F172A',
    marginBottom: 14,
    lineHeight: 1.4,
    fontFamily: "'Comfortaa', sans-serif",
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 14,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '2px solid',
    borderRadius: 14,
    padding: '12px 14px',
    fontSize: 13.5,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  explanationBox: {
    border: '1.5px solid',
    borderRadius: 12,
    padding: '10px 12px',
    marginBottom: 14,
  },
  challengeDoneBtn: {
    width: '100%',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 14,
    padding: '12px',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
};
