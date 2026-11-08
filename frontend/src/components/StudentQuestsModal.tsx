import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';

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
  id: string;
  title: string;
  subject: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  rewardAcorns: number;
  rewardXp: number;
}

export default function StudentQuestsModal({
  isOpen,
  onClose,
  streak,
  className = '5А',
  onAddAcorns,
  onAddXp,
  onGoToGrove,
  onJoinGameWithPin,
}: StudentQuestsModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'daily' | 'redemption' | 'teacher'>('daily');

  // Today key for persistent quest progress (resets daily)
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Persistent Quest State in localStorage
  const storageKey = `lisquiz_quests_state_${todayKey}`;
  const [questState, setQuestState] = useState<{
    warmupSolved: boolean;
    warmupClaimed: boolean;
    groveWatered: boolean;
    groveClaimed: boolean;
    quizPlayed: boolean;
    quizClaimed: boolean;
    chestClaimed: boolean;
    redemptionSolved: boolean;
    redemptionClaimed: boolean;
    teacherDone: boolean;
    teacherClaimed: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      warmupSolved: false,
      warmupClaimed: false,
      groveWatered: false,
      groveClaimed: false,
      quizPlayed: false,
      quizClaimed: false,
      chestClaimed: false,
      redemptionSolved: false,
      redemptionClaimed: false,
      teacherDone: false,
      teacherClaimed: false,
    };
  });

  // Save changes to localStorage
  const updateQuestState = (patch: Partial<typeof questState>) => {
    setQuestState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Interactive Question Challenge Modal state
  const [activeChallenge, setActiveChallenge] = useState<QuestionChallenge | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Challenge definitions
  const challenges: Record<'warmup' | 'redemption', QuestionChallenge> = {
    warmup: {
      id: 'warmup',
      title: '⚡ Разминка от Спринта',
      subject: 'Математика',
      text: 'Чему равна дробь 6/8, если сократить её до несократимой?',
      options: ['3/4', '1/2', '2/3', '3/8'],
      correctIndex: 0,
      explanation: 'Делим числитель и знаменатель на 2: 6:2 / 8:2 = 3/4!',
      rewardAcorns: 20,
      rewardXp: 50,
    },
    redemption: {
      id: 'redemption',
      title: '🛠 Работа над ошибками (§22)',
      subject: 'Физика (7 класс)',
      text: 'Брусок массой 800 г имеет объём 100 см³. Найдите его плотность:',
      options: ['8 г/см³', '80 000 г·см³', '0.125 г/см³', '700 г/см³'],
      correctIndex: 0,
      explanation: 'Формула плотности: ρ = m / V. Делим массу на объём: 800 / 100 = 8 г/см³!',
      rewardAcorns: 40,
      rewardXp: 100,
    },
  };

  // Daily Quests Progress calculation
  const dailyTotal = 3;
  const dailyClaimedCount =
    (questState.warmupClaimed ? 1 : 0) +
    (questState.groveClaimed ? 1 : 0) +
    (questState.quizClaimed ? 1 : 0);
  const isAllDailyClaimed = dailyClaimedCount >= dailyTotal;

  // Handle Challenge Option Click
  const handleSelectOption = (idx: number) => {
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

      if (activeChallenge.id === 'warmup') {
        updateQuestState({ warmupSolved: true });
      } else if (activeChallenge.id === 'redemption') {
        updateQuestState({ redemptionSolved: true });
      }
    } else {
      soundManager.playWrong();
      haptics.notification('error');
    }
  };

  // Claim Quest Reward
  const handleClaim = (questId: 'warmup' | 'grove' | 'quiz' | 'redemption' | 'teacher') => {
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

    let acornsReward = 0;
    let xpReward = 0;

    if (questId === 'warmup') {
      acornsReward = 20;
      xpReward = 50;
      updateQuestState({ warmupClaimed: true });
    } else if (questId === 'grove') {
      acornsReward = 20;
      xpReward = 40;
      updateQuestState({ groveClaimed: true });
    } else if (questId === 'quiz') {
      acornsReward = 35;
      xpReward = 100;
      updateQuestState({ quizClaimed: true });
    } else if (questId === 'redemption') {
      acornsReward = 40;
      xpReward = 120;
      updateQuestState({ redemptionClaimed: true });
    } else if (questId === 'teacher') {
      acornsReward = 60;
      xpReward = 150;
      updateQuestState({ teacherClaimed: true });
    }

    if (acornsReward > 0) onAddAcorns(acornsReward);
    if (xpReward > 0 && onAddXp) onAddXp(xpReward);
  };

  // Claim Daily Chest Bonus
  const handleClaimChest = () => {
    if (!isAllDailyClaimed || questState.chestClaimed) return;
    soundManager.playVictory();
    haptics.notification('success');
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#10B981', '#3B82F6'],
      });
    } catch {}
    updateQuestState({ chestClaimed: true });
    onAddAcorns(50);
    if (onAddXp) onAddXp(200);
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
              <p style={styles.modalSub}>Выполняй задания, поливай Рощу и собирай жёлуди!</p>
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
                <span>{streak} дн. стрик</span>
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
                    filter: isAllDailyClaimed && !questState.chestClaimed ? 'drop-shadow(0 0 8px #F59E0B)' : 'none',
                  }}
                />
                <div>
                  <div style={styles.chestTitle}>
                    {questState.chestClaimed
                      ? '🎉 Бонус дня получен!'
                      : isAllDailyClaimed
                      ? 'Золотой сундук разблокирован!'
                      : 'Сундук за 3 дейлика'}
                  </div>
                  <div style={styles.chestSubtitle}>
                    {questState.chestClaimed ? '+50 желудей начислено' : '+50 желудей и +200 XP'}
                  </div>
                </div>
              </div>

              {isAllDailyClaimed && !questState.chestClaimed ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClaimChest}
                  style={styles.claimChestBtn}
                >
                  <Sparkles size={14} />
                  <span>Открыть</span>
                </motion.button>
              ) : (
                <div style={styles.chestStatusBadge}>
                  {questState.chestClaimed ? 'Забрано ✓' : `${dailyClaimedCount}/3`}
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
              <span style={{ ...styles.tabBadge, backgroundColor: questState.redemptionClaimed ? '#10B981' : '#EF4444' }}>
                {questState.redemptionClaimed ? '0' : '1'}
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
              <span style={styles.tabBadge}>1</span>
            </button>
          </div>

          {/* TAB 1: DAILY QUESTS */}
          {activeTab === 'daily' && (
            <div style={styles.questList}>
              {/* Quest 1: Разминка со Спринтом */}
              <div style={styles.questCard}>
                <div style={styles.questIconCol}>
                  <div style={{ ...styles.questIconCircle, backgroundColor: '#FEF3C7' }}>
                    <img src="/assets/icons/star_medal.png" alt="Разминка" style={styles.questIconImg} />
                  </div>
                </div>
                <div style={styles.questBodyCol}>
                  <div style={styles.questCardTitle}>Разминка со Спринтом</div>
                  <div style={styles.questCardDesc}>Реши 1 быстрый мини-вопрос по математике</div>
                  <div style={styles.questRewardTag}>
                    <span>+20</span>
                    <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                    <span style={styles.xpBonus}>+50 XP</span>
                  </div>
                </div>
                <div style={styles.questActionCol}>
                  {questState.warmupClaimed ? (
                    <div style={styles.claimedBadge}>
                      <Check size={14} /> Выполнено
                    </div>
                  ) : questState.warmupSolved ? (
                    <button
                      onClick={() => handleClaim('warmup')}
                      style={styles.claimBtn}
                    >
                      Забрать
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playTap();
                        setActiveChallenge(challenges.warmup);
                        setSelectedOption(null);
                        setIsAnswered(false);
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
                  <div style={styles.questCardDesc}>Полей Древо {className} класса 1 раз сегодня</div>
                  <div style={styles.questRewardTag}>
                    <span>+20</span>
                    <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                    <span style={styles.xpBonus}>+40 XP</span>
                  </div>
                </div>
                <div style={styles.questActionCol}>
                  {questState.groveClaimed ? (
                    <div style={styles.claimedBadge}>
                      <Check size={14} /> Выполнено
                    </div>
                  ) : questState.groveWatered ? (
                    <button
                      onClick={() => handleClaim('grove')}
                      style={styles.claimBtn}
                    >
                      Забрать
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playTap();
                        updateQuestState({ groveWatered: true });
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
                  {questState.quizClaimed ? (
                    <div style={styles.claimedBadge}>
                      <Check size={14} /> Выполнено
                    </div>
                  ) : questState.quizPlayed ? (
                    <button
                      onClick={() => handleClaim('quiz')}
                      style={styles.claimBtn}
                    >
                      Забрать
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playTap();
                        updateQuestState({ quizPlayed: true });
                        onClose();
                      }}
                      style={{ ...styles.actionBtn, backgroundColor: '#3B82F6' }}
                    >
                      К игре
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REDEMPTION (РАБОТА НАД ОШИБКАМИ) */}
          {activeTab === 'redemption' && (
            <div style={styles.questList}>
              <div style={styles.infoBanner}>
                <div style={{ fontSize: 20 }}>🧠</div>
                <div style={styles.infoBannerText}>
                  Спринт проанализировал ошибки на уроке и собрал адаптивные вопросы для возврата очков!
                </div>
              </div>

              <div style={styles.questCard}>
                <div style={styles.questIconCol}>
                  <div style={{ ...styles.questIconCircle, backgroundColor: '#EDE9FE' }}>
                    <img src="/assets/icons/star_medal.png" alt="Ошибки" style={styles.questIconImg} />
                  </div>
                </div>
                <div style={styles.questBodyCol}>
                  <div style={styles.questCardTitle}>Устрани пробел: Плотность (§22)</div>
                  <div style={styles.questCardDesc}>
                    Закрой ошибку в формуле ρ = m / V и верни баллы в рейтинг класса
                  </div>
                  <div style={styles.questRewardTag}>
                    <span>+40</span>
                    <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                    <span style={styles.xpBonus}>+120 XP</span>
                  </div>
                </div>
                <div style={styles.questActionCol}>
                  {questState.redemptionClaimed ? (
                    <div style={styles.claimedBadge}>
                      <Check size={14} /> Закрыто
                    </div>
                  ) : questState.redemptionSolved ? (
                    <button
                      onClick={() => handleClaim('redemption')}
                      style={styles.claimBtn}
                    >
                      Забрать
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playTap();
                        setActiveChallenge(challenges.redemption);
                        setSelectedOption(null);
                        setIsAnswered(false);
                      }}
                      style={{ ...styles.actionBtn, backgroundColor: '#8B5CF6' }}
                    >
                      Решить
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEACHER ASSIGNMENTS */}
          {activeTab === 'teacher' && (
            <div style={styles.questList}>
              <div style={{ ...styles.infoBanner, backgroundColor: '#ECFDF5', borderColor: '#10B981' }}>
                <div style={{ fontSize: 20 }}>👩‍🏫</div>
                <div style={{ ...styles.infoBannerText, color: '#065F46' }}>
                  Задания, назначенные вашим учителем для {className} класса с автоматической проверкой.
                </div>
              </div>

              <div style={styles.questCard}>
                <div style={styles.questIconCol}>
                  <div style={{ ...styles.questIconCircle, backgroundColor: '#D1FAE5' }}>
                    <img src="/assets/icons/shield_rank.png" alt="Домашка" style={styles.questIconImg} />
                  </div>
                </div>
                <div style={styles.questBodyCol}>
                  <div style={styles.questCardTitle}>§22 Плотность вещества (Физика)</div>
                  <div style={styles.questCardDesc}>
                    Домашняя тренировка от учителя. Дедлайн: 2 дня
                  </div>
                  <div style={styles.questRewardTag}>
                    <span>+60</span>
                    <img src="/assets/icons/acorn_gold.png" alt="Жёлуди" style={styles.miniAcorn} />
                    <span style={styles.xpBonus}>+150 XP</span>
                  </div>
                </div>
                <div style={styles.questActionCol}>
                  {questState.teacherClaimed ? (
                    <div style={styles.claimedBadge}>
                      <Check size={14} /> Сдано
                    </div>
                  ) : questState.teacherDone ? (
                    <button
                      onClick={() => handleClaim('teacher')}
                      style={styles.claimBtn}
                    >
                      Забрать
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playTap();
                        updateQuestState({ teacherDone: true });
                        onClose();
                        if (onJoinGameWithPin) onJoinGameWithPin('482915');
                      }}
                      style={{ ...styles.actionBtn, backgroundColor: '#059669' }}
                    >
                      Начать
                    </button>
                  )}
                </div>
              </div>
            </div>
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
                        ? '🎉 Отлично! Абсолютно верно. Ты молодец!'
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
    animation: 'pulse 1.5s infinite',
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
