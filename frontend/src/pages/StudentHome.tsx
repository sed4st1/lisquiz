import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  BookOpen,
  User,
  Check,
} from 'lucide-react';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import SoundToggleButton from '../components/SoundToggleButton';
import { roomApi, JoinRoomResponse } from '../services/roomApi';
import { pullKnowledgeCard, fetchStudentInventory, KnowledgeCard } from '../services/groveApi';
import MascotPuppet from '../components/MascotPuppet';

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
  onGoToClasses?: () => void;
  onSwitchToTeacher?: () => void;
  groveStage?: number;
  groveHealth?: number;
  appMode?: 'user' | 'dev';
}

export type DivisionType = 'sprout_keepers' | 'forest_guardians' | 'council_of_groves';

export const DIVISION_META: Record<
  DivisionType,
  {
    id: DivisionType;
    title: string;
    badge: string;
    color: string;
    lightBg: string;
    border: string;
    frame: string;
    role: string;
    bonus: string;
    tier: string;
    description: string;
    aspectRatio: number;
    avatarTop: string;
    avatarWidth: string;
    currentXp: number;
    nextTierXp: number;
  }
> = {
  sprout_keepers: {
    id: 'sprout_keepers',
    title: 'Хранители Ростков',
    badge: '🌱',
    color: '#059669',
    lightBg: '#ECFDF5',
    border: '#A7F3D0',
    frame: '/assets/frames/frame_sprout_keepers.png',
    role: '💧 Добытчик Воды',
    bonus: '+15% к поливу Рощи',
    tier: 'Бронзовый дивизион',
    description: 'Начальная ступень. Полив корней и базовая подготовка по предметам.',
    aspectRatio: 574 / 540,
    avatarTop: '49.2%',
    avatarWidth: '64%',
    currentXp: 380,
    nextTierXp: 600,
  },
  forest_guardians: {
    id: 'forest_guardians',
    title: 'Стражи Леса',
    badge: '🛡️',
    color: '#0284C7',
    lightBg: '#F0F9FF',
    border: '#BAE6FD',
    frame: '/assets/frames/frame_forest_guardians.png',
    role: '🌿 Поставщик Гумуса',
    bonus: '+25% к очкам класса',
    tier: 'Серебряный дивизион',
    description: 'Опытные защитники биома. Помогают классу преодолевать барьер Либиха.',
    aspectRatio: 599 / 540,
    avatarTop: '56.5%',
    avatarWidth: '62%',
    currentXp: 860,
    nextTierXp: 1200,
  },
  council_of_groves: {
    id: 'council_of_groves',
    title: 'Совет Дубрав',
    badge: '👑',
    color: '#D97706',
    lightBg: '#FFFBEB',
    border: '#FDE68A',
    frame: '/assets/frames/frame_council_of_groves.png',
    role: '☀️ Поставщик Солнца',
    bonus: '+35% к очкам Рощи',
    tier: 'Золотой дивизион • Элита',
    description: 'Высшая лига знатоков. Решение сложнейших заданий и олимпиадных квестов.',
    aspectRatio: 639 / 533,
    avatarTop: '56.0%',
    avatarWidth: '62%',
    currentXp: 1420,
    nextTierXp: 2000,
  },
};

export const AVATAR_MAP: Record<string, string> = {
  fox_smart: '/assets/classes/v2/avatar_fox.png',
  fox: '/assets/classes/v2/avatar_fox.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  bear: '/assets/avatars/students/bear.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  bunny: '/assets/avatars/students/bunny.png',
  squirrel: '/assets/avatars/students/squirrel.png',
};

export const AVATARS = [
  { id: 'fox_smart', label: 'Лис', emoji: '🦊', img: '/assets/classes/v2/avatar_fox.png' },
  { id: 'owl', label: 'Сова', emoji: '🦉', img: '/assets/avatars/students/owl.png' },
  { id: 'raccoon', label: 'Енот', emoji: '🦝', img: '/assets/avatars/students/raccoon.png' },
  { id: 'bear', label: 'Медведь', emoji: '🐻', img: '/assets/avatars/students/bear.png' },
  { id: 'hedgehog', label: 'Ёжик', emoji: '🦔', img: '/assets/avatars/students/hedgehog.png' },
  { id: 'bunny', label: 'Зайчик', emoji: '🐰', img: '/assets/avatars/students/bunny.png' },
  { id: 'squirrel', label: 'Белка', emoji: '🐿️', img: '/assets/avatars/students/squirrel.png' },
];

const FOX_QUOTES = [
  'Каждая решённая задача поливает Древо нашего 5А класса! 🌿',
  'Закон Либиха: один за всех, и все за одного! 💪',
  'Вчера наш класс полил Рощу на 95%! Так держать! 💧',
  'Сложные задачи дают золотые жёлуди и солнечный свет! ☀️',
  'Введи PIN с доски учителя прямо на карточке, и начнём! 🎮',
];

interface FramedAvatarProps {
  avatarKey: string;
  division: DivisionType;
  size?: number;
  glow?: boolean;
}

export const FramedAvatar: React.FC<FramedAvatarProps> = ({
  avatarKey,
  division,
  size = 40,
  glow = false,
}) => {
  const meta = DIVISION_META[division] || DIVISION_META.forest_guardians;
  const height = Math.round(size * meta.aspectRatio);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Layer 1: Circular Avatar Masked Image */}
      <div
        style={{
          position: 'absolute',
          left: '49%',
          top: meta.avatarTop,
          transform: 'translate(-50%, -50%)',
          width: meta.avatarWidth,
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#FFF7ED',
          zIndex: 1,
          boxShadow: glow ? `0 0 18px ${meta.color}66` : 'none',
        }}
      >
        <img
          src={AVATAR_MAP[avatarKey] || AVATAR_MAP.fox_smart}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          draggable={false}
        />
      </div>

      {/* Layer 2: Division Frame Placed Over Avatar Hole */}
      <img
        src={meta.frame}
        alt={meta.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 2,
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.16))',
        }}
        draggable={false}
      />
    </div>
  );
};

export default function StudentHome({
  onJoinGame,
  onGoToGrove,
  onGoToLeaderboard,
  onGoToClasses,
  onSwitchToTeacher,
  appMode = 'user',
}: StudentHomeProps) {
  // Start ambient BGM on mount
  useEffect(() => {
    soundManager.playBgm('grove', true);
  }, []);

  // Profile & Division state (Defaults for a fresh new student: 0 stats, sprout_keepers tier)
  const [division, setDivision] = useState<DivisionType>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_student_division') as DivisionType;
      if (saved && ['sprout_keepers', 'forest_guardians', 'council_of_groves'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'sprout_keepers';
  });

  const [studentName, setStudentName] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_student_name');
      if (saved) return saved;
      return 'Новый ученик';
    } catch {
      return 'Новый ученик';
    }
  });

  const [selectedAvatar, setSelectedAvatar] = useState('fox_smart');

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQuestsModalOpen, setIsQuestsModalOpen] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);

  // Gacha & Cards state
  const [inventoryCards, setInventoryCards] = useState<KnowledgeCard[]>([]);
  const [pulledCardResult, setPulledCardResult] = useState<any | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  // Sync cards from backend on modal open or mount
  useEffect(() => {
    let isMounted = true;
    fetchStudentInventory('current_student')
      .then((inv) => {
        if (!isMounted || !inv) return;
        if (inv.cards && inv.cards.length > 0) {
          setInventoryCards(inv.cards);
        }
        if (inv.acorns_balance !== undefined && inv.acorns_balance > 0) {
          setAcorns(inv.acorns_balance);
          sessionStorage.setItem('lisquiz_user_acorns', String(inv.acorns_balance));
          localStorage.setItem('lisquiz_student_acorns', String(inv.acorns_balance));
        }
      })
      .catch((e) => console.warn('[StudentHome] Notice syncing inventory:', e));
    return () => {
      isMounted = false;
    };
  }, [isCardsModalOpen]);

  const handlePullCard = async () => {
    if (isPulling) return;
    if (acorns < 50) {
      haptics.notification('warning');
      soundManager.playWrong();
      alert('Нужно 50 желудей для открытия пака. Решай викторины с классом!');
      return;
    }

    try {
      setIsPulling(true);
      haptics.impact('medium');
      const res = await pullKnowledgeCard('current_student', 50);
      if (res.success && res.card) {
        soundManager.playCollect();
        haptics.notification('success');
        setPulledCardResult(res);
        const nextAcorns = res.remaining_acorns ?? (acorns - 50);
        setAcorns(nextAcorns);
        sessionStorage.setItem('lisquiz_user_acorns', String(nextAcorns));
        localStorage.setItem('lisquiz_student_acorns', String(nextAcorns));

        const updated = await fetchStudentInventory('current_student');
        if (updated?.cards) {
          setInventoryCards(updated.cards);
        }
      } else {
        soundManager.playWrong();
        alert(res.error || 'Не удалось открыть пак');
      }
    } catch (e: any) {
      soundManager.playWrong();
      alert(e.message || 'Ошибка связи с сервером');
    } finally {
      setIsPulling(false);
    }
  };

  // Economy & Progression state (Fresh player begins with 0)
  const [acorns, setAcorns] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_user_acorns');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 0 : val;
      }
    } catch {}
    return 0;
  });

  const [xp, setXp] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_user_xp');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 0 : val;
      }
    } catch {}
    return 0;
  });

  const [streak, setStreak] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_user_streak');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 0 : val;
      }
    } catch {}
    return 0;
  });

  const [quizzesCount, setQuizzesCount] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('lisquiz_user_quizzes');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 0 : val;
      }
    } catch {}
    return 0;
  });

  // PIN inputs directly on hero card
  const [digits, setDigits] = useState<string[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = (params.get('pin') || '').replace(/\D/g, '').slice(0, 6);
      if (p.length > 0) {
        return Array.from({ length: 6 }, (_, i) => p[i] || '');
      }
    } catch {}
    return ['', '', '', '', '', ''];
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
    soundManager.playTap();
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
    soundManager.playTap();
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
    soundManager.playKnock();
    setIsJoining(true);
    setErrorMsg(null);

    const trimmedName = studentName.trim() || 'Ученик';
    try {
      const joinData = await roomApi.joinRoom(fullPin, trimmedName, selectedAvatar);
      setIsJoining(false);
      soundManager.playCorrect();
      onJoinGame?.({
        pin: fullPin,
        joinData,
        name: trimmedName,
        avatar: selectedAvatar,
      });
    } catch (err: any) {
      setIsJoining(false);
      soundManager.playWrong();
      setErrorMsg(err.message || 'Комната с таким кодом не найдена');
    }
  };

  const activeDivision = DIVISION_META[division] || DIVISION_META.forest_guardians;

  return (
    <div style={styles.container}>
      {/* ========================================================
          1. TOP APP BAR: PROFILE PILL (WITH DIVISION FRAME) + ACORNS / STREAK
         ======================================================== */}
      <header style={styles.topBar}>
        {/* Student Profile Pill (Click to open rich Profile & Division Modal) */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            haptics.selection();
            soundManager.playKnock();
            setIsProfileModalOpen(true);
          }}
          style={styles.studentProfilePill}
          title="Открыть профиль и дивизион"
        >
          {/* Mini Avatar wearing the division frame */}
          <FramedAvatar
            avatarKey={selectedAvatar}
            division={division}
            size={36}
          />
          <div style={styles.profilePillInfo}>
            <div style={styles.studentProfileNameRow}>
              <span style={styles.studentProfileName}>{studentName}</span>
              <span style={styles.studentProfilePencil}>✎</span>
            </div>
            <span style={{ ...styles.studentProfileDivisionBadge, color: activeDivision.color }}>
              {activeDivision.badge} {activeDivision.title}
            </span>
          </div>
        </motion.div>

        {/* Currency & Daily Streak Status Pills + Sound Toggle */}
        <div style={styles.topRightStats}>
          <SoundToggleButton variant="round" size={14} />
          {onSwitchToTeacher && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                haptics.selection();
                onSwitchToTeacher();
              }}
              style={styles.teacherSwitchChip}
              title="Перейти в режим Учителя"
            >
              <span>🦉 Учитель</span>
            </motion.button>
          )}
          <motion.div
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              haptics.impact('light');
              soundManager.playKnock();
              setIsCardsModalOpen(true);
            }}
            style={styles.statPill}
            title="Баланс желудей (нажмите, чтобы открыть паки карточек)"
          >
            <span style={styles.statPillIcon}>🌰</span>
            <span style={styles.statPillValue}>{acorns}</span>
          </motion.div>
          <div style={styles.statPill} title={`Ударный режим: ${streak} дней`}>
            <span style={styles.statPillIcon}>🔥</span>
            <span style={styles.statPillValue}>{streak}</span>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. SCENIC MEADOW SECTION: SPRINT MASCOT + HERO CARD WITH PIN
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
          3. LOWER INTERFACE GROUP (3 Feature Cards)
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
              soundManager.playTap();
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
              soundManager.playTap();
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
              soundManager.playTap();
              if (onGoToClasses) {
                onGoToClasses();
              } else if (onGoToLeaderboard) {
                onGoToLeaderboard();
              } else if (onGoToGrove) {
                onGoToGrove();
              }
            }}
            style={{
              ...styles.featureCard,
              backgroundImage: "url('/assets/ui/card_frame_purple_clay.png')",
            }}
          >
            <div style={styles.featureCardContent}>
              <img
                src="/assets/icons/shield_rank.png"
                alt="Классы"
                style={styles.featureIcon}
                draggable={false}
              />
              <h3 style={styles.featureTitle}>Классы</h3>
            </div>
          </motion.div>
        </section>
      </div>

      {/* ========================================================
          4. RICH STUDENT PROFILE & DIVISION MODAL
         ======================================================== */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={styles.profileModalBox}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsProfileModalOpen(false)}
                style={styles.modalCloseBtn}
                title="Закрыть"
              >
                <X size={20} color="#64748B" />
              </button>

              {/* Modal Header */}
              <div style={styles.profileHeader}>
                <h2 style={styles.profileModalTitle}>Профиль исследователя</h2>
                <p style={styles.profileModalSub}>Твоя статистика и дивизион в Роще 5А класса</p>
              </div>

              {/* Hero Avatar with Division Frame */}
              <div style={styles.profileHeroSection}>
                <div style={{ ...styles.avatarGlowWrap, borderColor: activeDivision.color }}>
                  <FramedAvatar
                    avatarKey={selectedAvatar}
                    division={division}
                    size={114}
                    glow={true}
                  />
                </div>

                <div style={styles.profileHeroInfo}>
                  <div style={{ ...styles.divisionBadgeLarge, backgroundColor: activeDivision.lightBg, borderColor: activeDivision.border }}>
                    <span style={{ fontSize: 16 }}>{activeDivision.badge}</span>
                    <span style={{ ...styles.divisionBadgeTitle, color: activeDivision.color }}>
                      {activeDivision.title}
                    </span>
                    <span style={styles.divisionTierText}>• {activeDivision.tier}</span>
                  </div>

                  <div style={styles.roleBenefitPill}>
                    <span style={styles.roleBenefitRole}>{activeDivision.role}</span>
                    <span style={styles.roleBenefitBonus}>{activeDivision.bonus}</span>
                  </div>
                </div>
              </div>

              {/* Division Level Progress Bar */}
              <div style={styles.xpProgressSection}>
                <div style={styles.xpProgressHeader}>
                  <span style={styles.xpProgressLabel}>Прогресс дивизиона</span>
                  <span style={styles.xpProgressVal}>
                    {xp} / {activeDivision.nextTierXp} XP ({Math.min(100, Math.round((xp / Math.max(1, activeDivision.nextTierXp)) * 100))}%)
                  </span>
                </div>
                <div style={styles.xpTrack}>
                  <div
                    style={{
                      ...styles.xpBarFill,
                      width: `${Math.min(100, (xp / Math.max(1, activeDivision.nextTierXp)) * 100)}%`,
                      backgroundColor: activeDivision.color,
                    }}
                  />
                </div>
              </div>

              {/* Division Switcher (3 Tabs) */}
              <div style={styles.divisionSwitchRow}>
                {(['sprout_keepers', 'forest_guardians', 'council_of_groves'] as DivisionType[]).map((divKey) => {
                  const dMeta = DIVISION_META[divKey];
                  const isSelected = division === divKey;
                  return (
                    <button
                      key={divKey}
                      onClick={() => {
                        haptics.selection();
                        soundManager.playTap();
                        setDivision(divKey);
                        sessionStorage.setItem('lisquiz_student_division', divKey);
                      }}
                      style={{
                        ...styles.divisionTabBtn,
                        backgroundColor: isSelected ? dMeta.color : '#FFFFFF',
                        borderColor: isSelected ? dMeta.color : '#E2E8F0',
                        color: isSelected ? '#FFFFFF' : '#475569',
                      }}
                    >
                      <span>{dMeta.badge}</span>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>{dMeta.title.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bento Statistics Grid (6 key indicators - 0 defaults for fresh user) */}
              <div style={styles.statsBentoGrid}>
                {/* 1. Acorns */}
                <div style={styles.statBentoCard}>
                  <div style={styles.statBentoTop}>
                    <span style={{ fontSize: 18 }}>🌰</span>
                    <span style={styles.statBentoLabel}>Жёлуди</span>
                  </div>
                  <span style={styles.statBentoVal}>{acorns}</span>
                </div>

                {/* 2. Total XP */}
                <div style={styles.statBentoCard}>
                  <div style={styles.statBentoTop}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <span style={styles.statBentoLabel}>Опыт (XP)</span>
                  </div>
                  <span style={styles.statBentoVal}>{xp.toLocaleString('ru-RU')}</span>
                </div>

                {/* 3. Daily Streak */}
                <div style={styles.statBentoCard}>
                  <div style={styles.statBentoTop}>
                    <span style={{ fontSize: 18 }}>🔥</span>
                    <span style={styles.statBentoLabel}>Серия</span>
                  </div>
                  <span style={styles.statBentoVal}>{streak === 0 ? '0 дн.' : `${streak} дн.`}</span>
                </div>

                {/* 4. Accuracy */}
                <div style={styles.statBentoCard}>
                  <div style={styles.statBentoTop}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <span style={styles.statBentoLabel}>Точность</span>
                  </div>
                  <span style={styles.statBentoVal}>{quizzesCount === 0 ? '—' : '92%'}</span>
                </div>

                {/* 5. Quizzes Completed */}
                <div style={styles.statBentoCard}>
                  <div style={styles.statBentoTop}>
                    <span style={{ fontSize: 18 }}>📚</span>
                    <span style={styles.statBentoLabel}>Викторин</span>
                  </div>
                  <span style={styles.statBentoVal}>{quizzesCount}</span>
                </div>

                {/* 6. Class Rank */}
                <div style={styles.statBentoCard}>
                  <div style={styles.statBentoTop}>
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span style={styles.statBentoLabel}>Ранг</span>
                  </div>
                  <span style={styles.statBentoVal}>{quizzesCount === 0 ? '—' : '#3 в классе'}</span>
                </div>
              </div>

              {/* Developer Testing Controls (Visible ONLY in dev mode) */}
              {appMode === 'dev' && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1.5px dashed #F59E0B',
                    borderRadius: 14,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#92400E',
                    }}
                  >
                    <span>🛠️ Панель прокачки (Developer Mode)</span>
                    <span style={{ fontSize: 10, color: '#B45309' }}>быстрый тест</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.impact('light');
                        soundManager.playAcorn();
                        setAcorns((a) => {
                          const next = a + 50;
                          sessionStorage.setItem('lisquiz_user_acorns', String(next));
                          return next;
                        });
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #D97706',
                        backgroundColor: '#FFFFFF',
                        color: '#92400E',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      +50 🌰
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.impact('light');
                        soundManager.playCorrect();
                        setXp((x) => {
                          const next = x + 200;
                          sessionStorage.setItem('lisquiz_user_xp', String(next));
                          return next;
                        });
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #D97706',
                        backgroundColor: '#FFFFFF',
                        color: '#92400E',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      +200 ⚡ XP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.impact('light');
                        soundManager.playTap();
                        setStreak((s) => {
                          const next = s + 1;
                          sessionStorage.setItem('lisquiz_user_streak', String(next));
                          return next;
                        });
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #D97706',
                        backgroundColor: '#FFFFFF',
                        color: '#92400E',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      +1 🔥 Стрик
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.impact('light');
                        soundManager.playTap();
                        setQuizzesCount((q) => {
                          const next = q + 1;
                          sessionStorage.setItem('lisquiz_user_quizzes', String(next));
                          return next;
                        });
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #D97706',
                        backgroundColor: '#FFFFFF',
                        color: '#92400E',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      +1 📚
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.notification('warning');
                        soundManager.playKnock();
                        setAcorns(0);
                        setXp(0);
                        setStreak(0);
                        setQuizzesCount(0);
                        setDivision('sprout_keepers');
                        sessionStorage.setItem('lisquiz_user_acorns', '0');
                        sessionStorage.setItem('lisquiz_user_xp', '0');
                        sessionStorage.setItem('lisquiz_user_streak', '0');
                        sessionStorage.setItem('lisquiz_user_quizzes', '0');
                        sessionStorage.setItem('lisquiz_student_division', 'sprout_keepers');
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #DC2626',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Сброс (0)
                    </button>
                  </div>
                </div>
              )}

              {/* Name & Avatar Customization Section */}
              <div style={styles.editSectionCard}>
                <div style={styles.editSectionHeader}>
                  <User size={15} color="#FF7A00" />
                  <span style={styles.editSectionTitle}>Настройки персонажа</span>
                </div>

                {/* Name Input */}
                <div style={{ marginBottom: 12 }}>
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

                {/* Avatar Picker Row */}
                <div style={styles.avatarPickerRow}>
                  {AVATARS.map((av) => {
                    const isSelected = selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        onClick={() => {
                          haptics.selection();
                          soundManager.playTap();
                          setSelectedAvatar(av.id);
                        }}
                        style={{
                          ...styles.avatarBtn,
                          borderColor: isSelected ? '#FF7A00' : '#E2E8F0',
                          backgroundColor: isSelected ? '#FFF7ED' : '#FFFFFF',
                          transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                        }}
                        title={av.label}
                      >
                        <img
                          src={av.img}
                          alt={av.label}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tactile Close Button */}
              <motion.button
                whileTap={{ y: 2 }}
                onClick={() => {
                  haptics.notification('success');
                  soundManager.playKnock();
                  setIsProfileModalOpen(false);
                }}
                style={styles.gachaPullBtn}
              >
                <Check size={18} strokeWidth={3} />
                <span>Сохранить профиль</span>
              </motion.button>

              {onSwitchToTeacher && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setIsProfileModalOpen(false);
                    onSwitchToTeacher();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    borderRadius: 14,
                    backgroundColor: 'rgba(255, 122, 0, 0.08)',
                    border: '1.5px solid rgba(255, 122, 0, 0.25)',
                    color: '#D97706',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: 8,
                    width: '100%',
                  }}
                >
                  <span>🦉 Переключиться в режим Учителя</span>
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                onClick={() => {
                  soundManager.playKnock();
                  setIsQuestsModalOpen(false);
                }}
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
                onClick={() => {
                  soundManager.playKnock();
                  setIsQuestsModalOpen(false);
                }}
                style={{ ...styles.gachaPullBtn, backgroundColor: '#0284C7', borderBottom: '4px solid #0369A1' }}
              >
                Понятно!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          6. KNOWLEDGE CARDS GACHA MODAL
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
                onClick={() => {
                  soundManager.playKnock();
                  setIsCardsModalOpen(false);
                }}
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

              {/* Recently Pulled Card Banner */}
              {pulledCardResult?.card && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '2px solid #F59E0B',
                    borderRadius: 16,
                    padding: '12px 14px',
                    marginBottom: 14,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                    🎉 {pulledCardResult.is_duplicate ? 'Повторная карточка (Кэшбэк +25 🌰)' : 'Новая карточка!'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#78350F', marginTop: 3 }}>
                    {pulledCardResult.card.card_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#92400E', marginTop: 2, fontStyle: 'italic' }}>
                    «{pulledCardResult.card.lore_microfact}»
                  </div>
                </motion.div>
              )}

              {/* Showcase preview cards */}
              <div style={styles.gachaCardsRow}>
                {inventoryCards.length > 0 ? (
                  inventoryCards.slice(0, 3).map((c) => (
                    <div key={c.card_id} style={styles.gachaCardItem}>
                      <div style={{
                        ...styles.gachaRarityTag,
                        backgroundColor: c.rarity === 'legendary' ? '#F59E0B' : c.rarity === 'epic' ? '#8B5CF6' : '#10B981',
                      }}>
                        {c.rarity === 'legendary' ? 'Легендарная' : c.rarity === 'epic' ? 'Эпическая' : 'Редкая'}
                      </div>
                      <div style={{ fontSize: 30 }}>📜</div>
                      <div style={styles.gachaCardName}>{c.card_name}</div>
                      <div style={styles.gachaCardFact}>«{c.lore_microfact}»</div>
                    </div>
                  ))
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Gacha Pull Action */}
              <motion.button
                whileTap={{ y: 2 }}
                onClick={handlePullCard}
                disabled={isPulling}
                style={{
                  ...styles.gachaPullBtn,
                  opacity: isPulling ? 0.7 : 1,
                  cursor: isPulling ? 'wait' : 'pointer',
                }}
              >
                <span>{isPulling ? 'Открываем пак...' : 'Открыть пак'}</span>
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
    gap: 8,
  },
  studentProfilePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF2',
    border: '2px solid #F3EEDB',
    borderBottom: '4px solid #E5DBC7',
    borderRadius: 9999,
    padding: '3px 12px 3px 6px',
    boxShadow: '0 4px 14px rgba(28, 41, 61, 0.10)',
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  },
  profilePillInfo: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    lineHeight: 1.1,
  },
  studentProfileNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  studentProfileName: {
    fontFamily: "'Comfortaa', 'Nunito', sans-serif",
    fontSize: 13.5,
    fontWeight: 900,
    color: '#1E293B',
    maxWidth: 95,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  studentProfilePencil: {
    fontSize: 10,
    color: '#94A3B8',
  },
  studentProfileDivisionBadge: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10,
    fontWeight: 800,
    marginTop: 1,
    whiteSpace: 'nowrap',
  },
  topRightStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  teacherSwitchChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFDF2',
    border: '1.5px solid #FDE68A',
    borderBottom: '2.5px solid #F59E0B',
    borderRadius: 9999,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 800,
    color: '#D97706',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
    userSelect: 'none',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFDF2',
    border: '1.5px solid #F3EEDB',
    borderBottom: '3px solid #E5DBC7',
    borderRadius: 9999,
    padding: '4px 9px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  statPillIcon: {
    fontSize: 13,
    lineHeight: 1,
  },
  statPillValue: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 12.5,
    fontWeight: 900,
    color: '#1E293B',
    fontVariantNumeric: 'tabular-nums',
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
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    zIndex: 100,
  },
  profileModalBox: {
    position: 'relative',
    width: '100%',
    maxWidth: 390,
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#FFFDF2',
    border: '3px solid #FFFDF2',
    borderBottom: '8px solid #E5DBC7',
    borderRadius: 28,
    padding: '22px 18px 20px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.30)',
    boxSizing: 'border-box',
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
    zIndex: 2,
  },
  profileHeader: {
    textAlign: 'center',
    marginBottom: 14,
    paddingRight: 24,
  },
  profileModalTitle: {
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 19,
    fontWeight: 900,
    color: '#1E293B',
    margin: '0 0 3px',
  },
  profileModalSub: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11.5,
    fontWeight: 700,
    color: '#64748B',
    margin: 0,
  },

  // Profile Hero
  profileHeroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '8px 0 14px',
  },
  avatarGlowWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: '50%',
  },
  profileHeroInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  divisionBadgeLarge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1.5px solid',
    borderRadius: 9999,
    padding: '4px 12px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  divisionBadgeTitle: {
    fontFamily: "'Comfortaa', 'Nunito', sans-serif",
    fontSize: 13,
    fontWeight: 900,
  },
  divisionTierText: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10.5,
    fontWeight: 700,
    color: '#64748B',
  },
  roleBenefitPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: '4px 10px',
  },
  roleBenefitRole: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11,
    fontWeight: 800,
    color: '#334155',
  },
  roleBenefitBonus: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11,
    fontWeight: 900,
    color: '#10B981',
  },

  // XP Progress
  xpProgressSection: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #F1F5F9',
    borderRadius: 14,
    padding: '10px 12px',
    marginBottom: 12,
  },
  xpProgressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpProgressLabel: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11,
    fontWeight: 800,
    color: '#64748B',
  },
  xpProgressVal: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11,
    fontWeight: 900,
    color: '#1E293B',
    fontVariantNumeric: 'tabular-nums',
  },
  xpTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 9999,
    transition: 'width 0.3s ease',
  },

  // Division Switcher Tabs
  divisionSwitchRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    marginBottom: 14,
  },
  divisionTabBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '8px 4px',
    borderRadius: 12,
    border: '1.5px solid',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
  },

  // Bento Stats
  statsBentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    marginBottom: 14,
  },
  statBentoCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #F1F5F9',
    borderBottom: '3px solid #E2E8F0',
    borderRadius: 14,
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  statBentoTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  statBentoLabel: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    color: '#64748B',
  },
  statBentoVal: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 13,
    fontWeight: 900,
    color: '#1E293B',
    fontVariantNumeric: 'tabular-nums',
  },

  // Edit Section
  editSectionCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #F1F5F9',
    borderRadius: 14,
    padding: '12px',
    marginBottom: 16,
  },
  editSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  editSectionTitle: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11.5,
    fontWeight: 800,
    color: '#334155',
  },
  nameInput: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1.5px solid #E2E8F0',
    borderBottom: '2.5px solid #CBD5E1',
    fontFamily: "'Nunito', sans-serif",
    fontSize: 14,
    fontWeight: 800,
    color: '#1E293B',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#F8FAFC',
  },
  avatarPickerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 4,
  },
  avatarBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    border: '2px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
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
