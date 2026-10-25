import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, BookOpen, User } from 'lucide-react';
import { haptics } from '../services/haptics';
import { roomApi, JoinRoomResponse } from '../services/roomApi';
import MascotPuppet from '../components/MascotPuppet';
import DynamicClassTree from '../components/DynamicClassTree';

export interface JoinRoomPayload {
  pin: string;
  joinData: JoinRoomResponse;
  name: string;
  avatar: string;
}

export interface StudentHomeProps {
  onJoinGame?: (payload: JoinRoomPayload) => void;
  onGoToGrove?: () => void;
  onGoToLeaderboard?: () => void;
  onSwitchToTeacher?: () => void;
  groveStage?: number;
  groveHealth?: number;
}

const AVATARS = [
  { id: 'fox_smart', label: '🦊 Лис Спринт' },
  { id: 'owl', label: '🦉 Сова' },
  { id: 'raccoon', label: '🦝 Енот' },
  { id: 'bear', label: '🐻 Медведь' },
  { id: 'hedgehog', label: '🦔 Ёжик' },
  { id: 'bunny', label: '🐰 Зайчик' },
];

const FOX_QUOTES = [
  'Каждая решённая задача поливает Древо нашего 5А класса! 🌿',
  'Закон Либиха: один за всех, и все за одного! 💪',
  'Вчера наш класс полил Рощу на 95%! Так держать! 💧',
  'Сложные задачи дают золотые жёлуди и солнечный свет! ☀️',
  'Введи PIN с доски учителя прямо на карточке, и начнём! 🎮',
];

export default function StudentHome({
  onJoinGame,
  onGoToGrove,
  onGoToLeaderboard,
  onSwitchToTeacher,
  groveStage = 5,
  groveHealth = 95,
}: StudentHomeProps) {
  // Tree stage interactive inspection (1 to 6)
  const [treeStage, setTreeStage] = useState<number>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = parseInt(params.get('stage') || '', 10);
      if (q >= 1 && q <= 6) return q;
    } catch {}
    return groveStage || 5;
  });

  // Modal states
  const [isQuestsModalOpen, setIsQuestsModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);

  // Economy state
  const [acorns, setAcorns] = useState(128);

  // PIN inputs directly on hero card
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [selectedAvatar, setSelectedAvatar] = useState('fox_smart');
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_student_name');
      if (saved) return saved;
      const pool = ['Иван К', 'Анна С', 'Михаил В', 'София М', 'Даниил Р', 'Алиса Т', 'Максим Д'];
      const chosen = pool[Math.floor(Math.random() * pool.length)] ?? 'Иван К';
      sessionStorage.setItem('lisquiz_student_name', chosen);
      return chosen;
    } catch {
      return 'Иван К';
    }
  });

  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [foxBubbleText, setFoxBubbleText] = useState<string>(FOX_QUOTES[0] ?? 'Привет!');
  const [isFoxBubbleVisible, setIsFoxBubbleVisible] = useState(false);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mascot tap speech bubble cycle
  const handleMascotTap = () => {
    haptics.impact('light');
    const curIdx = FOX_QUOTES.indexOf(foxBubbleText);
    const nextIdx = (curIdx >= 0 ? curIdx + 1 : 0) % FOX_QUOTES.length;
    setFoxBubbleText(FOX_QUOTES[nextIdx] ?? 'Привет!');
    setIsFoxBubbleVisible(true);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => setIsFoxBubbleVisible(false), 4000);
  };

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    haptics.selection();
    setErrorMsg(null);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    setDigits(newDigits);
    setErrorMsg(null);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const fullPin = digits.join('');
  const canJoin = fullPin.length === 6;

  const handleJoin = async () => {
    if (!canJoin || isJoining) return;
    haptics.notification('success');
    setIsJoining(true);
    setErrorMsg(null);

    const trimmedName = studentName.trim() || 'Ученик';
    try {
      const joinData = await roomApi.joinRoom(fullPin, trimmedName, selectedAvatar);
      setIsJoining(false);
      onJoinGame?.({
        pin: fullPin,
        joinData,
        name: trimmedName,
        avatar: selectedAvatar,
      });
    } catch (err: any) {
      setIsJoining(false);
      setErrorMsg(err.message || 'Комната с таким кодом не найдена');
    }
  };

  return (
    <div style={styles.container}>
      {/* ========================================================
          1. TOP APP BAR (CURRENCY, STAGE SWITCHER, TEACHER SHORTCUT)
         ======================================================== */}
      <header style={styles.topBar}>
        {/* Student Profile Pill (opens edit name & avatar modal) */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            haptics.selection();
            setIsNameModalOpen(true);
          }}
          style={styles.studentProfilePill}
          title="Нажмите, чтобы изменить имя или аватар"
        >
          <span style={styles.studentProfileAvatar}>
            {AVATARS.find((a) => a.id === selectedAvatar)?.label.split(' ')[0] || '🦊'}
          </span>
          <span style={styles.studentProfileName}>{studentName}</span>
          <span style={styles.studentProfilePencil}>✎</span>
        </motion.div>

        {/* Tree Stage Switcher Pill (Stage 1 to 6) */}
        <div style={styles.stageSwitcherPill} title="Переключить стадию Древа (1..6)">
          <span style={styles.stageSwitcherLabel}>Древо:</span>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                setTreeStage(s);
              }}
              style={{
                ...styles.stageDotBtn,
                backgroundColor: treeStage === s ? '#10B981' : '#FFFFFF',
                color: treeStage === s ? '#FFFFFF' : '#475569',
                borderColor: treeStage === s ? '#059669' : '#E2E8F0',
                fontWeight: treeStage === s ? 900 : 700,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Right Status: Subtle Teacher switcher shortcut */}
        <div style={styles.topRightGroup}>
          {onSwitchToTeacher && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                haptics.selection();
                onSwitchToTeacher();
              }}
              style={styles.teacherSwitchBtn}
              title="Режим учителя"
            >
              Учитель
            </motion.button>
          )}
        </div>
      </header>

      {/* ========================================================
          2. DYNAMIC CLASS TREE (Tied to Class Grove stage 1..6)
             Overlaid naturally on the hill in top-right overlooking river
         ======================================================== */}
      <DynamicClassTree
        stage={treeStage}
        health={groveHealth}
        classNameTitle="5А класс"
        onStageChange={setTreeStage}
        onClick={onGoToGrove}
      />

      {/* ========================================================
          3. SCENIC MEADOW SECTION: SPRINT MASCOT + HERO CARD WITH PIN
             Left: Fox sitting on the meadow path (firmly on the ground!)
             Right: User's Clay Frame with Direct PIN Input & Join CTA
         ======================================================== */}
      <section style={styles.heroSection}>
        {/* Left: Animated Mascot Sprint - Chibi & Firmly Grounded on meadow */}
        <div style={styles.mascotArea}>
          <div onClick={handleMascotTap} style={{ cursor: 'pointer', zIndex: 2, position: 'relative' }}>
            <MascotPuppet size={190} />
          </div>

          {/* Cheerful Speech Bubble from Sprint (only on tap) */}
          <AnimatePresence>
            {isFoxBubbleVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={styles.foxBubble}
                onClick={handleMascotTap}
              >
                <div style={styles.foxBubbleTail} />
                <p style={styles.foxBubbleText}>{foxBubbleText}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Hero Card (User's Genuine Clay Frame with Direct PIN Input) */}
        <motion.div
          initial={false}
          style={styles.heroCard}
        >
          {/* Header with Sunbeams / Sparkles radiating outward */}
          <div style={styles.heroTitleWrap}>
            <div style={styles.heroTitleColumn}>
              <div style={styles.heroTitleTopRow}>
                <img
                  src="/assets/ui/spark_burst_left.png"
                  alt=""
                  style={styles.sparkBurstLeftImg}
                />
                <span style={styles.heroTitle}>Вход</span>
                <img
                  src="/assets/ui/spark_burst_right.png"
                  alt=""
                  style={styles.sparkBurstRightImg}
                />
              </div>
              <span style={styles.heroTitleSecond}>в викторину</span>
            </div>
          </div>

          {/* 6-Digit PIN Direct Input Field - Darker Parchment Inset */}
          <div style={styles.heroPinRow} onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                style={{
                  ...styles.heroPinDigit,
                  borderColor: digit ? '#D97706' : '#B8A88A',
                  backgroundColor: digit ? '#FDE68A' : '#E8DCBF',
                  marginRight: idx === 2 ? 6 : 2,
                }}
              />
            ))}
          </div>

          {/* Error Message if room not found */}
          {errorMsg && <p style={styles.heroErrorText}>{errorMsg}</p>}

          {/* Tactile 3D CTA Button: "Войти в игру →" */}
          <motion.button
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={handleJoin}
            disabled={!canJoin || isJoining}
            style={{
              ...styles.ctaButton,
              opacity: canJoin ? 1 : 0.75,
              cursor: canJoin ? 'pointer' : 'default',
            }}
          >
            <span>{isJoining ? 'Вход...' : 'Войти в игру'}</span>
            <ArrowRight size={17} strokeWidth={3} />
          </motion.button>
        </motion.div>
      </section>

      {/* ========================================================
          4. LOWER INTERFACE GROUP (3 Feature Cards)
             Anchored comfortably at bottom
         ======================================================== */}
      <div style={styles.lowerGroup}>
        {/* Three Feature Cards with User's Genuine Clay Frames */}
        <section style={styles.cardsRow}>
          {/* Card 1: Задания (Blue Clay Frame) */}
          <motion.div
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={() => {
              haptics.impact('light');
              setIsQuestsModalOpen(true);
            }}
            style={{
              ...styles.featureCard,
              backgroundImage: "url('/assets/ui/card_frame_blue_clay.png')",
            }}
          >
            <div style={styles.featureCardContent}>
              <img
                src="/assets/icons/quest_book.png"
                alt="Задания"
                style={styles.featureIcon}
                draggable={false}
              />
              <h3 style={styles.featureTitle}>Задания</h3>
            </div>
          </motion.div>

          {/* Card 2: Роща класса (Green Clay Frame) */}
          <motion.div
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={() => {
              haptics.impact('light');
              onGoToGrove?.();
            }}
            style={{
              ...styles.featureCard,
              backgroundImage: "url('/assets/ui/card_frame_green_clay.png')",
            }}
          >
            <div style={styles.featureCardContent}>
              <img
                src="/assets/icons/sprout.png"
                alt="Роща"
                style={styles.featureIcon}
                draggable={false}
              />
              <h3 style={styles.featureTitle}>Роща</h3>
            </div>
          </motion.div>

          {/* Card 3: Мой класс / Рейтинг (Purple Clay Frame) */}
          <motion.div
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={() => {
              haptics.impact('light');
              onGoToLeaderboard?.() ?? onGoToGrove?.();
            }}
            style={{
              ...styles.featureCard,
              backgroundImage: "url('/assets/ui/card_frame_purple_clay.png')",
            }}
          >
            <div style={styles.featureCardContent}>
              <img
                src="/assets/icons/shield_rank.png"
                alt="Класс"
                style={styles.featureIcon}
                draggable={false}
              />
              <h3 style={styles.featureTitle}>Класс</h3>
            </div>
          </motion.div>
        </section>
      </div>

      {/* ========================================================
          5. QUESTS & PRACTICE MODAL ("ЗАДАНИЯ")
         ======================================================== */}
      <AnimatePresence>
        {isQuestsModalOpen && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={styles.modalBox}
            >
              <button
                onClick={() => setIsQuestsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </button>

              <div style={styles.modalHeader}>
                <div style={styles.modalIconWrap}>
                  <BookOpen size={24} color="#0284C7" />
                </div>
                <div>
                  <h2 style={styles.modalTitle}>Квесты и Задания</h2>
                  <p style={styles.modalSub}>Выполняй задания и поливай Рощу класса!</p>
                </div>
              </div>

              <div style={styles.questList}>
                <div style={styles.questItem}>
                  <div style={styles.questIcon}>🎯</div>
                  <div style={styles.questInfo}>
                    <div style={styles.questTitle}>Дроби и проценты</div>
                    <div style={styles.questDesc}>Пройди викторину от учителя на уроке</div>
                  </div>
                  <div style={styles.questReward}>+40 🌰</div>
                </div>

                <div style={styles.questItem}>
                  <div style={styles.questIcon}>💧</div>
                  <div style={styles.questInfo}>
                    <div style={styles.questTitle}>Забота о Роще</div>
                    <div style={styles.questDesc}>Полей Древо 5А класса 1 раз сегодня</div>
                  </div>
                  <div style={styles.questReward}>+20 🌰</div>
                </div>

                <div style={styles.questItem}>
                  <div style={styles.questIcon}>🔥</div>
                  <div style={styles.questInfo}>
                    <div style={styles.questTitle}>Серия 5 дней</div>
                    <div style={styles.questDesc}>Решай викторины каждый день без пропусков</div>
                  </div>
                  <div style={styles.questReward}>+60 🌰</div>
                </div>
              </div>

              <button
                onClick={() => setIsQuestsModalOpen(false)}
                style={{ ...styles.gachaPullBtn, backgroundColor: '#0284C7', borderBottom: '4px solid #0369A1' }}
              >
                Понятно!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          6. STUDENT NAME / AVATAR MODAL
         ======================================================== */}
      <AnimatePresence>
        {isNameModalOpen && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={styles.modalBox}
            >
              <button
                onClick={() => setIsNameModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </button>

              <div style={styles.modalHeader}>
                <div style={styles.modalIconWrap}>
                  <User size={24} color="#FF7A00" />
                </div>
                <div>
                  <h2 style={styles.modalTitle}>Имя ученика</h2>
                  <p style={styles.modalSub}>Как тебя называть на экране викторины</p>
                </div>
              </div>

              <div style={{ margin: '14px 0 16px' }}>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    sessionStorage.setItem('lisquiz_student_name', e.target.value);
                  }}
                  placeholder="Введи своё имя..."
                  style={styles.nameInput}
                />
              </div>

              <div style={styles.avatarPickerRow}>
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => {
                      haptics.selection();
                      setSelectedAvatar(av.id);
                    }}
                    style={{
                      ...styles.avatarBtn,
                      borderColor: selectedAvatar === av.id ? '#FF7A00' : '#E2E8F0',
                      backgroundColor: selectedAvatar === av.id ? '#FFF7ED' : '#FFFFFF',
                    }}
                  >
                    {av.label.split(' ')[0]}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsNameModalOpen(false)}
                style={styles.gachaPullBtn}
              >
                Сохранить
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          7. KNOWLEDGE CARDS GACHA MODAL
         ======================================================== */}
      <AnimatePresence>
        {isCardsModalOpen && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={styles.modalBox}
            >
              <button
                onClick={() => setIsCardsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </button>

              <div style={styles.modalHeader}>
                <div style={{ ...styles.modalIconWrap, backgroundColor: '#EDE9FE' }}>
                  <img
                    src="/assets/icons/knowledge_card.png"
                    alt="Карточка"
                    style={{ width: 28, height: 28, objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <h2 style={styles.modalTitle}>Карточки Знаний</h2>
                  <p style={styles.modalSub}>Коллекция великих учёных и открытий</p>
                </div>
              </div>

              {/* Showcase preview cards */}
              <div style={styles.gachaCardsRow}>
                <div style={styles.gachaCardItem}>
                  <div style={styles.gachaRarityTag}>Легендарная</div>
                  <div style={{ fontSize: 32 }}>🏛️</div>
                  <div style={styles.gachaCardName}>Архимед</div>
                  <div style={styles.gachaCardFact}>«Эврика! Законы физики»</div>
                </div>
                <div style={styles.gachaCardItem}>
                  <div style={styles.gachaRarityTag}>Легендарная</div>
                  <div style={{ fontSize: 32 }}>🦊</div>
                  <div style={styles.gachaCardName}>Лис Спринт</div>
                  <div style={styles.gachaCardFact}>Хранитель Сердца Рощи</div>
                </div>
                <div style={{ ...styles.gachaCardItem, borderStyle: 'dashed' }}>
                  <div style={{ ...styles.gachaRarityTag, backgroundColor: '#94A3B8' }}>Эпическая</div>
                  <div style={{ fontSize: 32, opacity: 0.4 }}>🍎</div>
                  <div style={styles.gachaCardName}>Ньютон</div>
                  <div style={styles.gachaCardFact}>Закрыто (в паках)</div>
                </div>
              </div>

              {/* Gacha Pull Action */}
              <motion.button
                whileTap={{ y: 2 }}
                onClick={() => {
                  if (acorns >= 50) {
                    haptics.notification('success');
                    setAcorns((prev) => prev - 50);
                    alert('🎉 Поздравляем! Открыта карта «Золотое Яблоко Ньютона»!');
                  } else {
                    haptics.notification('warning');
                    alert('Нужно 50 желудей для открытия пака. Решай викторины!');
                  }
                }}
                style={styles.gachaPullBtn}
              >
                <span>Открыть пак</span>
                <span style={styles.gachaCost}>50 🌰</span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// STYLES (MATCHING CANONICAL V2 LISQUIZ CLAY AESTHETICS)
// =========================================================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    padding: '12px 14px 18px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  // 1. Top Bar
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 10,
    paddingTop: 2,
    gap: 6,
  },
  studentProfilePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF2',
    border: '2px solid #F3EEDB',
    borderBottom: '4px solid #E5DBC7',
    borderRadius: 9999,
    padding: '4px 12px 4px 8px',
    boxShadow: '0 4px 14px rgba(28, 41, 61, 0.10)',
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  },
  studentProfileAvatar: {
    fontSize: 20,
    lineHeight: 1,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12))',
  },
  studentProfileName: {
    fontFamily: "'Comfortaa', 'Nunito', sans-serif",
    fontSize: 14,
    fontWeight: 900,
    color: '#1E293B',
    maxWidth: 90,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  studentProfilePencil: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 1,
  },
  stageSwitcherPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 253, 242, 0.95)',
    border: '1.5px solid #F3EEDB',
    borderBottom: '3px solid #E5DBC7',
    borderRadius: 9999,
    padding: '3px 8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  stageSwitcherLabel: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10.5,
    fontWeight: 800,
    color: '#64748B',
    marginRight: 2,
  },
  stageDotBtn: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  topRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  teacherSwitchBtn: {
    backgroundColor: '#FFFDF2',
    border: '2px solid #F3EEDB',
    borderBottom: '3px solid #E5DBC7',
    borderRadius: 9999,
    padding: '5px 11px',
    fontSize: 11.5,
    fontWeight: 800,
    color: '#64748B',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
  },

  // 2. Scenic Meadow Section: Fox + Main Card
  heroSection: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 'auto',
    marginBottom: 8,
    minHeight: 200,
    zIndex: 5,
  },
  mascotArea: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '43%',
    zIndex: 6,
  },
  foxBubble: {
    position: 'absolute',
    left: 80,
    top: -20,
    minWidth: 150,
    maxWidth: 190,
    backgroundColor: '#FFFDF2',
    border: '2px solid #F3EEDB',
    borderBottom: '4px solid #E5DBC7',
    borderRadius: 16,
    padding: '8px 12px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
    zIndex: 10,
    cursor: 'pointer',
  },
  foxBubbleTail: {
    position: 'absolute',
    left: -7,
    top: 18,
    width: 0,
    height: 0,
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderRight: '8px solid #FFFDF2',
  },
  foxBubbleText: {
    fontSize: 11,
    lineHeight: 1.3,
    fontWeight: 700,
    color: '#1E293B',
    margin: 0,
  },

  // Hero Card with User's Genuine Clay Frame
  heroCard: {
    position: 'relative',
    width: '57%',
    aspectRatio: '1700 / 1674',
    backgroundImage: "url('/assets/ui/hero_frame_clay.png')",
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    filter: 'drop-shadow(0 8px 20px rgba(28, 41, 61, 0.16))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7% 6% 11%',
    boxSizing: 'border-box',
    zIndex: 5,
    transform: 'rotate(-2deg)',
    transformOrigin: 'bottom center',
  },
  heroTitleWrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 0 8px',
  },
  heroTitleColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroTitleTopRow: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkBurstLeftImg: {
    position: 'absolute',
    right: '100%',
    marginRight: 6,
    top: '48%',
    transform: 'translateY(-50%)',
    width: 17,
    height: 25,
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  sparkBurstRightImg: {
    position: 'absolute',
    left: '100%',
    marginLeft: 5,
    top: -7,
    width: 20,
    height: 20,
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  heroTitle: {
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 22,
    fontWeight: 900,
    color: '#141A36',
    lineHeight: 1,
    letterSpacing: '-0.3px',
    display: 'inline-block',
    WebkitFontSmoothing: 'antialiased',
    textRendering: 'optimizeLegibility',
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.7)',
  },
  heroTitleSecond: {
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 22,
    fontWeight: 900,
    color: '#141A36',
    lineHeight: 1,
    letterSpacing: '-0.3px',
    margin: '2px 0 0',
    display: 'block',
    WebkitFontSmoothing: 'antialiased',
    textRendering: 'optimizeLegibility',
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.7)',
  },
  heroPinRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    margin: '0 0 8px',
    width: '100%',
  },
  heroPinDigit: {
    width: 27,
    height: 36,
    borderRadius: 8,
    border: '2px solid #B8A88A',
    borderBottom: '3.5px solid #9C8C70',
    textAlign: 'center',
    fontFamily: "'Comfortaa', 'Nunito', monospace",
    fontSize: 18,
    fontWeight: 900,
    color: '#0F172A',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(60, 40, 20, 0.22), 0 1px 1px rgba(255, 255, 255, 0.7)',
    WebkitFontSmoothing: 'antialiased',
  },
  heroErrorText: {
    fontFamily: "'Comfortaa', 'Nunito', sans-serif",
    fontSize: 9.5,
    fontWeight: 800,
    color: '#DC2626',
    margin: '-3px 0 5px',
    textAlign: 'center',
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    maxWidth: 140,
    padding: '8px 12px',
    borderRadius: 9999,
    backgroundColor: '#FFB800',
    border: 'none',
    borderBottom: '4px solid #D97706',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
    color: '#451A03',
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 14.5,
    fontWeight: 900,
    userSelect: 'none',
    WebkitFontSmoothing: 'antialiased',
  },

  // 3. Lower Interface Group
  lowerGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
    zIndex: 6,
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    width: '100%',
    marginTop: 2,
  },
  featureCard: {
    position: 'relative',
    aspectRatio: '1355 / 1536',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    filter: 'drop-shadow(0 6px 14px rgba(28, 41, 61, 0.12))',
    boxSizing: 'border-box',
  },
  featureCardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '6% 6% 16%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  featureIcon: {
    width: '54%',
    aspectRatio: '1',
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.12))',
    marginBottom: 6,
  },
  featureTitle: {
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 15,
    fontWeight: 900,
    color: '#1E293B',
    margin: 0,
    lineHeight: 1.15,
    WebkitFontSmoothing: 'antialiased',
  },

  // Modals Styling
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
  },
  modalBox: {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFDF2',
    border: '3px solid #FFFDF2',
    borderBottom: '8px solid #E5DBC7',
    borderRadius: 28,
    padding: '24px 20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
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
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    border: '1.5px solid #FFEDD5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontFamily: "'Nunito', 'Comfortaa', -apple-system, sans-serif",
    fontSize: 18,
    fontWeight: 900,
    color: '#1E293B',
    margin: '0 0 2px',
  },
  modalSub: {
    fontFamily: "'Nunito', -apple-system, sans-serif",
    fontSize: 11.5,
    fontWeight: 700,
    color: '#64748B',
    margin: 0,
  },

  // Quests list
  questList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    margin: '16px 0 20px',
  },
  questItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #F1F5F9',
    borderBottom: '3px solid #E2E8F0',
    borderRadius: 16,
    padding: '10px 12px',
  },
  questIcon: {
    fontSize: 22,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 13,
    fontWeight: 800,
    color: '#1E293B',
  },
  questDesc: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10.5,
    color: '#64748B',
  },
  questReward: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 13,
    fontWeight: 900,
    color: '#D97706',
  },

  // Student name input
  nameInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 14,
    border: '2px solid #E2E8F0',
    borderBottom: '3px solid #CBD5E1',
    fontFamily: "'Nunito', sans-serif",
    fontSize: 15,
    fontWeight: 800,
    color: '#1E293B',
    boxSizing: 'border-box',
    outline: 'none',
  },
  avatarPickerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 18,
  },
  avatarBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    border: '2px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    cursor: 'pointer',
  },

  // Gacha showcase
  gachaCardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    margin: '16px 0 20px',
  },
  gachaCardItem: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    border: '2px solid #E2E8F0',
    borderBottom: '4px solid #CBD5E1',
    borderRadius: 16,
    padding: '14px 6px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  gachaRarityTag: {
    position: 'absolute',
    top: 4,
    fontSize: 8,
    fontWeight: 900,
    color: '#FFFFFF',
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    padding: '1px 5px',
  },
  gachaCardName: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11,
    fontWeight: 900,
    color: '#1E293B',
    marginTop: 6,
  },
  gachaCardFact: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 1.2,
  },
  gachaPullBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: 9999,
    backgroundColor: '#FF7A00',
    border: 'none',
    borderBottom: '4px solid #EA580C',
    color: '#FFFFFF',
    fontFamily: "'Nunito', 'Comfortaa', -apple-system, sans-serif",
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 4px 14px rgba(255, 122, 0, 0.35)',
  },
  gachaCost: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 12,
  },
};
