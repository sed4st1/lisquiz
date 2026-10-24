import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Flame,
  Droplets,
  Sparkles,
  Zap,
  Wrench,
  X,
  Crown,
  CheckCircle2,
  Gift,
  HelpCircle,
  Timer,
  Target,
  RefreshCw,
  Sun,
  Leaf,
  Layers,
} from 'lucide-react';
import { haptics } from '../services/haptics';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';
import { TreeLayers, TreeStage, STAGE_CONFIGS } from '../components/TreeLayers';
import { WaterParticlesCanvas, WaterParticlesCanvasHandle } from '../components/WaterParticlesCanvas';
import {
  fetchGroveState,
  fetchGroveLeaderboard,
  applyWaterContribution,
  reviveGrove,
  pullKnowledgeCard,
  fetchStudentInventory,
  GroveStateResponse,
  GroveLeaderboardResponse,
  StudentLeaderboardEntry,
  CardPullResponse,
  StudentInventoryResponse,
  mockDefaultGrove,
  mockDefaultLeaderboard,
} from '../services/groveApi';

export function formatDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} дней`;
  if (mod10 === 1) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

type ActiveSheetType = null | 'liebig' | 'leaderboard' | 'gacha' | 'dev';

interface ClassGroveProps {
  onBack?: () => void;
  onStartQuiz?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenStats?: () => void;
  classId?: string;
}

export default function ClassGrove({
  onBack,
  onStartQuiz,
  classId = '5A',
}: ClassGroveProps) {
  // Live State
  const [grove, setGrove] = useState<GroveStateResponse>(mockDefaultGrove);
  const [leaderboard, setLeaderboard] = useState<GroveLeaderboardResponse>(mockDefaultLeaderboard);
  const [inventory, setInventory] = useState<StudentInventoryResponse>({
    student_id: 'current_student',
    acorns_balance: 924,
    collection_progress: '1/16 (6.2%)',
    unique_cards_count: 1,
    catalog_total: 16,
    cards: [],
  });

  // UI & Interaction State
  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>(null);
  const [activeDivisionTab, setActiveDivisionTab] = useState<'council' | 'guardians' | 'sprouts'>('council');
  const [points, setPoints] = useState<number>(1850);
  const [acorns, setAcorns] = useState<number>(924);
  const [isWatering, setIsWatering] = useState<boolean>(false);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [floatingScorePop, setFloatingScorePop] = useState<number | null>(null);
  const [sprintJumping, setSprintJumping] = useState<boolean>(false);

  // Gacha Pull Modal State
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pulledCardResult, setPulledCardResult] = useState<CardPullResponse | null>(null);

  // Dev override stage (1..6)
  const [devStageOverride, setDevStageOverride] = useState<TreeStage | null>(null);

  // Canvas ref
  const particlesRef = useRef<WaterParticlesCanvasHandle | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Load Data
  const loadGroveData = useCallback(async () => {
    try {
      const [stateData, lbData, invData] = await Promise.all([
        fetchGroveState(classId),
        fetchGroveLeaderboard(classId),
        fetchStudentInventory('current_student'),
      ]);
      setGrove(stateData);
      setLeaderboard(lbData);
      setInventory(invData);
      setPoints(stateData.total_xp);
      setAcorns(invData.acorns_balance);
    } catch (err) {
      console.warn('[ClassGrove] Failed to load grove data', err);
    }
  }, [classId]);

  useEffect(() => {
    loadGroveData();
  }, [loadGroveData]);

  // Map stage level (1..6) to TreeStage
  const activeTreeStage: TreeStage = devStageOverride ?? (Math.min(6, Math.max(1, grove.stage_level)) as TreeStage);

  // Interactive watering action
  const handleWaterTree = async () => {
    if (isWatering) return;
    haptics.notification('success');
    setIsWatering(true);
    setPoints((prev) => prev + 50);
    setAcorns((prev) => prev + 10);
    setFloatingScorePop(50);

    // Ballistic water stream from watering can to tree roots
    if (particlesRef.current && sceneRef.current) {
      const rect = sceneRef.current.getBoundingClientRect();
      const fromX = 98;
      const fromY = rect.height - 130;
      const toX = rect.width * 0.50;
      const toY = rect.height - 110;
      particlesRef.current.triggerWaterStream(fromX, fromY, toX, toY);
    }

    setBubbleMessage('Дерево напиталось живой водой! +50 XP и +10 🌰');

    setTimeout(() => {
      setIsWatering(false);
      setFloatingScorePop(null);
    }, 1500);

    setTimeout(() => {
      setBubbleMessage(null);
    }, 3800);

    // Push to backend
    await applyWaterContribution(classId, 'current_student');
  };

  // Click on mascot Sprint (playful tap reaction)
  const handleSprintClick = () => {
    haptics.impact('light');
    setSprintJumping(true);
    setTimeout(() => setSprintJumping(false), 450);

    const adviceList = [
      grove.mascot_advice,
      'Привет! Поливай Дерево каждый день, чтобы класс не потерял стрик!',
      'Сбалансированный биом даёт +50% ко всем очкам класса!',
      'Каждая правильная база Tier 1 приносит живую воду корням!',
      'Копи желуди 🌰 — в лавке знаний можно выбить легендарную карту!',
    ];
    const picked = adviceList[Math.floor(Math.random() * adviceList.length)] ?? grove.mascot_advice;
    setBubbleMessage(picked);
    setTimeout(() => setBubbleMessage(null), 3600);
  };

  // Click on tree (runic burst)
  const handleTreeClick = () => {
    haptics.selection();
    if (particlesRef.current && sceneRef.current) {
      const rect = sceneRef.current.getBoundingClientRect();
      particlesRef.current.triggerExplosion(rect.width * 0.50, rect.height - 160, 36);
    }
    setBubbleMessage(`Уровень ${activeTreeStage}: ${grove.stage_info.title}!`);
    setTimeout(() => setBubbleMessage(null), 3000);
  };

  // Gacha Card Pull Action
  const handlePullCard = async () => {
    if (isPulling) return;
    if (acorns < 50) {
      haptics.notification('warning');
      alert('Недостаточно желудей! Сыграйте блиц или викторину урока, чтобы заработать 🌰');
      return;
    }

    haptics.impact('heavy');
    setIsPulling(true);

    try {
      const res = await pullKnowledgeCard('current_student', 50);
      if (res.success && res.card) {
        haptics.notification('success');
        setPulledCardResult(res);
        if (res.remaining_acorns !== undefined) {
          setAcorns(res.remaining_acorns);
        } else {
          setAcorns((prev) => Math.max(0, prev - 50 + (res.refund_acorns ?? 0)));
        }
        // Refresh inventory
        const inv = await fetchStudentInventory('current_student');
        setInventory(inv);
      } else {
        alert(res.error || 'Ошибка крутки');
      }
    } catch (err) {
      console.warn('[ClassGrove] Pull card failed', err);
    } finally {
      setIsPulling(false);
    }
  };

  // Wake up tree from hibernation
  const handleRevival = async () => {
    haptics.notification('success');
    if (particlesRef.current && sceneRef.current) {
      const rect = sceneRef.current.getBoundingClientRect();
      particlesRef.current.triggerExplosion(rect.width * 0.50, rect.height * 0.55, 48);
    }
    await reviveGrove(classId);
    setBubbleMessage('Роща проснулась! +500 XP получено!');
    loadGroveData();
  };

  // Active division list
  const divisionStudents: StudentLeaderboardEntry[] =
    activeDivisionTab === 'council'
      ? leaderboard.divisions.council_of_groves
      : activeDivisionTab === 'guardians'
      ? leaderboard.divisions.forest_guardians
      : leaderboard.divisions.sprout_keepers;

  return (
    <div style={styles.outerContainer}>
      {/* =========================================================================
          LAYER 0: STATIC WORLD SCENE (Never moves when sheets open!)
          ========================================================================= */}
      <div style={styles.worldBackground} />

      {/* Particle Canvas */}
      <WaterParticlesCanvas ref={particlesRef} />

      {/* =========================================================================
          LAYER 1: INTERACTIVE WORLD ACTORS (Fixed coordinates on the meadow)
          ========================================================================= */}
      <div ref={sceneRef} style={styles.worldSceneLayer}>
        {/* Growing Tree (Roots anchored at ground level) */}
        <div style={styles.treeGroundAnchor}>
          {/* Duolingo-style XP / Stage Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
            transition={{
              y: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' },
              opacity: { duration: 0.25 },
            }}
            onClick={handleTreeClick}
            style={styles.treeLevelBadge}
            title="Нажмите на Дерево"
          >
            <Sparkles size={11} color="#F59E0B" />
            <span style={styles.treeLevelBadgeText}>
              Ур. {activeTreeStage}: {STAGE_CONFIGS[activeTreeStage]?.title || grove.stage_info.title}
            </span>
            <span style={styles.treeLevelBadgeXp} className="tabular-nums">
              <JuicyScoreCounter value={points} suffix=" XP" size="sm" />
            </span>
          </motion.div>

          {/* Floating Score Pop when watered */}
          <AnimatePresence>
            {floatingScorePop && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: -50, scale: 1.15 }}
                exit={{ opacity: 0, y: -70 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={styles.floatingXpPop}
              >
                +{floatingScorePop} XP
              </motion.div>
            )}
          </AnimatePresence>

          <TreeLayers
            stage={activeTreeStage}
            health={grove.is_hibernating ? 50 : 100}
            isWatering={isWatering}
            onClick={handleTreeClick}
          />
        </div>

        {/* Sprint Mascot (Grounded on the dirt trail) */}
        <div style={styles.sprintGroundAnchor}>
          <motion.div
            animate={
              isWatering
                ? { rotate: [-2, -16, -14, 0] }
                : sprintJumping
                ? { y: [0, -22, 0], scale: [1, 1.1, 1] }
                : { y: [0, -3.5, 0], rotate: [-1.2, 1.8, -1.2] }
            }
            transition={{
              rotate: isWatering
                ? { duration: 0.9, ease: 'easeInOut' }
                : { repeat: Infinity, duration: 2.8, ease: 'easeInOut' },
              y: sprintJumping
                ? { duration: 0.45, ease: 'easeOut' }
                : { repeat: Infinity, duration: 2.8, ease: 'easeInOut' },
            }}
            onClick={handleSprintClick}
            style={{
              ...styles.sprintClickTarget,
              transformOrigin: '50% 95%',
            }}
            title="Лисёнок Спринт (нажмите, чтобы поприветствовать)"
          >
            {/* Ground Contact Shadow under paws */}
            <div style={styles.sprintContactShadow} />

            <AnimatePresence mode="wait">
              <motion.img
                key={
                  isWatering
                    ? 'watering'
                    : sprintJumping
                    ? 'celebrate'
                    : 'wave'
                }
                initial={{ opacity: 0.8, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.8 }}
                transition={{ duration: 0.15 }}
                src={
                  isWatering
                    ? '/assets/mascot/sprint_watering_perfect.png'
                    : sprintJumping
                    ? '/assets/mascot/celebrate.png'
                    : '/assets/mascot/wave.png'
                }
                alt="Спринт"
                style={styles.sprintImg}
                draggable={false}
              />
            </AnimatePresence>
          </motion.div>

          {/* Tactile 3D Watering Button below Sprint */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94, y: 2 }}
            onClick={handleWaterTree}
            disabled={isWatering}
            style={{
              ...styles.tactileWaterBtn,
              opacity: isWatering ? 0.75 : 1,
            }}
            type="button"
          >
            <Droplets size={14} color="#FFFFFF" />
            <span>Полить (+50)</span>
          </motion.button>

          {/* Mascot Speech Bubble with Tail */}
          <AnimatePresence>
            {bubbleMessage && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 6 }}
                transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                style={styles.speechBubble}
              >
                <span>{bubbleMessage}</span>
                <div style={styles.speechBubbleTail} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* =========================================================================
          LAYER 2: GAME HUD (Top Bar with Class Info, Wallet, Streak, Dev)
          ========================================================================= */}
      <header style={styles.gameHudHeader}>
        <div style={styles.hudLeft}>
          <button
            onClick={onBack}
            style={styles.hudRoundBtn}
            title="Назад"
            type="button"
          >
            <ChevronLeft size={16} color="#FFFFFF" />
          </button>
          <div style={styles.hudClassBadge}>
            <span style={styles.hudClassTitle}>{classId} Класс</span>
            <span style={styles.hudStatusDot}>
              {grove.is_hibernating ? '❄️ Спит' : '🟢 Цветёт'}
            </span>
          </div>
        </div>

        {/* Center / Right Pills: Acorn Wallet, Streak, Dev Panel */}
        <div style={styles.hudRight}>
          {/* Acorn Wallet Pill (Click opens Cards Album) */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptics.selection();
              setActiveSheet('gacha');
            }}
            style={styles.hudAcornWalletBtn}
            title="Желуди Знаний (нажмите, чтобы открыть альбом карточек)"
            type="button"
          >
            <span style={styles.acornIcon}>🌰</span>
            <span className="tabular-nums" style={styles.acornCountText}>
              {acorns}
            </span>
          </motion.button>

          {/* Streak Pill */}
          <div style={styles.hudStreakPill} title={`Стрик класса: ${grove.streak_days} дн.`}>
            <Flame size={13} color="#F59E0B" />
            <span className="tabular-nums" style={styles.streakText}>
              {grove.streak_days} дн
            </span>
          </div>

          {/* Dev Sandbox Button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              haptics.selection();
              setActiveSheet('dev');
            }}
            style={styles.hudDevBtn}
            title="Панель разработчика: переключение стадий и симуляция"
            type="button"
          >
            <Wrench size={13} color="#D1D5DB" />
            <span style={styles.devBtnText}>Дев</span>
          </motion.button>
        </div>
      </header>

      {/* Hibernation Wakeup Banner (If inactive) */}
      {grove.is_hibernating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.hibernationBanner}
        >
          <div style={styles.hibernationLeft}>
            <span style={{ fontSize: 20 }}>❄️</span>
            <div>
              <p style={styles.hibernationTitle}>Дерево уснуло</p>
              <p style={styles.hibernationSub}>Простой {grove.hibernation_days} дн. Нужен совместный полив!</p>
            </div>
          </div>
          <button onClick={handleRevival} style={styles.reviveBtn} type="button">
            <Zap size={13} color="#0D1322" />
            <span>Разбудить (+500)</span>
          </button>
        </motion.div>
      )}

      {/* =========================================================================
          LAYER 3: BOTTOM NAVIGATION DOCK (4 Tactile Tabs)
          ========================================================================= */}
      <nav style={styles.bottomNavDock}>
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveSheet(null);
          }}
          style={activeSheet === null ? styles.navTabActive : styles.navTab}
        >
          <div style={activeSheet === null ? styles.navIconGlowEmerald : styles.navIconNormal}>
            <Leaf size={16} color={activeSheet === null ? '#34D399' : '#9CA3AF'} />
          </div>
          <span style={{ color: activeSheet === null ? '#34D399' : '#9CA3AF', fontWeight: activeSheet === null ? 800 : 600 }}>
            Роща
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveSheet(activeSheet === 'liebig' ? null : 'liebig');
          }}
          style={activeSheet === 'liebig' ? styles.navTabActive : styles.navTab}
        >
          <div style={activeSheet === 'liebig' ? styles.navIconGlowAmber : styles.navIconNormal}>
            <Layers size={16} color={activeSheet === 'liebig' ? '#FBBF24' : '#9CA3AF'} />
          </div>
          <span style={{ color: activeSheet === 'liebig' ? '#FBBF24' : '#9CA3AF', fontWeight: activeSheet === 'liebig' ? 800 : 600 }}>
            Баланс
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveSheet(activeSheet === 'leaderboard' ? null : 'leaderboard');
          }}
          style={activeSheet === 'leaderboard' ? styles.navTabActive : styles.navTab}
        >
          <div style={activeSheet === 'leaderboard' ? styles.navIconGlowAmber : styles.navIconNormal}>
            <Crown size={16} color={activeSheet === 'leaderboard' ? '#FBBF24' : '#9CA3AF'} />
          </div>
          <span style={{ color: activeSheet === 'leaderboard' ? '#FBBF24' : '#9CA3AF', fontWeight: activeSheet === 'leaderboard' ? 800 : 600 }}>
            Рейтинг
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveSheet(activeSheet === 'gacha' ? null : 'gacha');
          }}
          style={activeSheet === 'gacha' ? styles.navTabActive : styles.navTab}
        >
          <div style={activeSheet === 'gacha' ? styles.navIconGlowEmerald : styles.navIconNormal}>
            <Gift size={16} color={activeSheet === 'gacha' ? '#34D399' : '#9CA3AF'} />
          </div>
          <span style={{ color: activeSheet === 'gacha' ? '#34D399' : '#9CA3AF', fontWeight: activeSheet === 'gacha' ? 800 : 600 }}>
            Карточки
          </span>
        </button>
      </nav>

      {/* =========================================================================
          LAYER 4: OVERLAY BOTTOM SHEETS (Never moves the world scene!)
          ========================================================================= */}
      <AnimatePresence>
        {activeSheet && (
          <>
            {/* Backdrop Dimmer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSheet(null)}
              style={styles.sheetBackdrop}
            />

            {/* Modal Bottom Sheet Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={styles.modalBottomSheet}
            >
              {/* Sheet Drag Indicator & Header */}
              <div style={styles.sheetTopBar}>
                <div style={styles.sheetHandleIndicator} />
                <div style={styles.sheetHeaderRow}>
                  <div style={styles.sheetTitleGroup}>
                    {activeSheet === 'liebig' && <Layers size={16} color="#FBBF24" />}
                    {activeSheet === 'leaderboard' && <Crown size={16} color="#FBBF24" />}
                    {activeSheet === 'gacha' && <Gift size={16} color="#34D399" />}
                    {activeSheet === 'dev' && <Wrench size={16} color="#D1D5DB" />}
                    <span style={styles.sheetMainTitle}>
                      {activeSheet === 'liebig' && 'Баланс Биома (Закон Либиха)'}
                      {activeSheet === 'leaderboard' && 'Недельные Дивизионы Класса'}
                      {activeSheet === 'gacha' && 'Коллекция Карточек Знаний'}
                      {activeSheet === 'dev' && 'Песочница Разработчика'}
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveSheet(null)}
                    style={styles.sheetCloseBtn}
                    type="button"
                    title="Закрыть"
                  >
                    <X size={16} color="#9CA3AF" />
                  </button>
                </div>
              </div>

              {/* SHEET 1: LIEBIG'S LAW BARREL */}
              {activeSheet === 'liebig' && (
                <div style={styles.sheetScrollBody}>
                  {/* Status Banner */}
                  <div
                    style={{
                      ...styles.biomeStatusBox,
                      borderColor: grove.liebig.is_balanced_bonus
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)',
                      backgroundColor: grove.liebig.is_balanced_bonus
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    }}
                  >
                    <div style={styles.biomeStatusTitleRow}>
                      <Sparkles size={14} color={grove.liebig.is_balanced_bonus ? '#34D399' : '#FBBF24'} />
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 12,
                          color: grove.liebig.is_balanced_bonus ? '#34D399' : '#FBBF24',
                        }}
                      >
                        {grove.liebig.is_balanced_bonus
                          ? '🌿 Супер-Бонус x1.5 активен!'
                          : '⚠️ Дефицит ресурса в классе'}
                      </span>
                    </div>
                    <p style={styles.biomeStatusText}>{grove.biome_status}</p>
                    <p style={styles.biomeAdviceText}>💡 {grove.mascot_advice}</p>
                  </div>

                  {/* 3 Physical Element Vessels */}
                  <div style={styles.liebigVesselsGrid}>
                    {/* Water Vessel (Tier 1) */}
                    <div style={styles.vesselCard}>
                      <div style={styles.vesselHeader}>
                        <div style={styles.vesselIconWrapBlue}>
                          <Droplets size={16} color="#60A5FA" />
                        </div>
                        <div>
                          <div style={styles.vesselName}>Живая Вода</div>
                          <div style={styles.vesselTier}>Простые разминки</div>
                        </div>
                      </div>
                      <div className="tabular-nums" style={styles.vesselPctBlue}>
                        {grove.liebig.water_pct.toFixed(0)}%
                      </div>
                      <div style={styles.vesselTrack}>
                        <div
                          style={{
                            ...styles.vesselFill,
                            backgroundColor: '#3B82F6',
                            width: `${Math.min(100, (grove.liebig.water_pct / 35) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Humus Vessel (Tier 2) */}
                    <div style={styles.vesselCard}>
                      <div style={styles.vesselHeader}>
                        <div style={styles.vesselIconWrapGreen}>
                          <Leaf size={16} color="#34D399" />
                        </div>
                        <div>
                          <div style={styles.vesselName}>Питательный Гумус</div>
                          <div style={styles.vesselTier}>Вопросы урока</div>
                        </div>
                      </div>
                      <div className="tabular-nums" style={styles.vesselPctGreen}>
                        {grove.liebig.humus_pct.toFixed(0)}%
                      </div>
                      <div style={styles.vesselTrack}>
                        <div
                          style={{
                            ...styles.vesselFill,
                            backgroundColor: '#10B981',
                            width: `${Math.min(100, (grove.liebig.humus_pct / 35) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Light Vessel (Tier 3) */}
                    <div style={styles.vesselCard}>
                      <div style={styles.vesselHeader}>
                        <div style={styles.vesselIconWrapAmber}>
                          <Sun size={16} color="#FBBF24" />
                        </div>
                        <div>
                          <div style={styles.vesselName}>Солнечный Свет</div>
                          <div style={styles.vesselTier}>Сложные олимпиады</div>
                        </div>
                      </div>
                      <div className="tabular-nums" style={styles.vesselPctAmber}>
                        {grove.liebig.light_pct.toFixed(0)}%
                      </div>
                      <div style={styles.vesselTrack}>
                        <div
                          style={{
                            ...styles.vesselFill,
                            backgroundColor: '#F59E0B',
                            width: `${Math.min(100, (grove.liebig.light_pct / 35) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pedagogical Note */}
                  <div style={styles.pedagogicalFootnote}>
                    <HelpCircle size={13} color="#9CA3AF" />
                    <span>
                      По закону Либиха рост Дерева ограничен самым дефицитным ресурсом. Отличникам нужны ответы новичков, а новичкам — победы олимпиадников!
                    </span>
                  </div>
                </div>
              )}

              {/* SHEET 2: WEEKLY DIVISIONS & LEADERBOARD */}
              {activeSheet === 'leaderboard' && (
                <div style={styles.sheetScrollBody}>
                  {/* MVP Top 1 Card */}
                  {leaderboard.mvp_top1 && (
                    <div style={styles.mvpHighlightCard}>
                      <div style={styles.mvpLeft}>
                        <Crown size={22} color="#FBBF24" />
                        <div>
                          <div style={styles.mvpLabel}>👑 MVP НЕДЕЛИ КЛАССА</div>
                          <div style={styles.mvpName}>{leaderboard.mvp_top1.student_name}</div>
                          <div style={styles.mvpRole}>
                            {leaderboard.mvp_top1.division_role ?? 'Главный защитник Сердца Рощи'}
                          </div>
                        </div>
                      </div>
                      <div style={styles.mvpRight}>
                        <span className="tabular-nums" style={styles.mvpXpVal}>
                          +{leaderboard.mvp_top1.weekly_xp}
                        </span>
                        <span style={styles.mvpXpSub}>XP за неделю</span>
                      </div>
                    </div>
                  )}

                  {/* Division Tabs */}
                  <div style={styles.divisionBtnRow}>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setActiveDivisionTab('council');
                      }}
                      style={activeDivisionTab === 'council' ? styles.divBtnActive : styles.divBtn}
                    >
                      <span>👑 Совет (25%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setActiveDivisionTab('guardians');
                      }}
                      style={activeDivisionTab === 'guardians' ? styles.divBtnActive : styles.divBtn}
                    >
                      <span>🛡️ Стражи (50%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setActiveDivisionTab('sprouts');
                      }}
                      style={activeDivisionTab === 'sprouts' ? styles.divBtnActive : styles.divBtn}
                    >
                      <span>🌱 Ростки (25%)</span>
                    </button>
                  </div>

                  {/* Student Rows */}
                  <div style={styles.divisionListContainer}>
                    {divisionStudents.map((st) => {
                      const isMVP = st.flair === 'mvp_gold';
                      const isBreakthrough = st.flair === 'breakthrough_star';
                      return (
                        <div
                          key={st.student_id}
                          style={{
                            ...styles.studentListItem,
                            ...(isMVP ? styles.studentItemMvp : {}),
                          }}
                        >
                          <div style={styles.studentRankBadge}>#{st.rank}</div>
                          <div style={styles.studentInfoCol}>
                            <div style={styles.studentNameLine}>
                              <span style={styles.studentName}>{st.student_name}</span>
                              {isMVP && <span style={styles.crownBadge}>👑 Топ-1</span>}
                              {isBreakthrough && (
                                <span style={styles.starBadge}>🌟 Прорыв +{st.delta_xp} XP</span>
                              )}
                            </div>
                            <span style={styles.studentRoleText}>
                              {st.division_role ?? 'Участник Рощи'}
                            </span>
                          </div>
                          <div style={styles.studentXpCol}>
                            <span className="tabular-nums" style={styles.studentXpNumber}>
                              +{st.weekly_xp}
                            </span>
                            <span style={styles.studentXpUnit}>XP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SHEET 3: GACHA KNOWLEDGE CARDS */}
              {activeSheet === 'gacha' && (
                <div style={styles.sheetScrollBody}>
                  {/* Top Gacha Balance & Pity Box */}
                  <div style={styles.gachaHeaderBox}>
                    <div style={styles.gachaAcornBalanceRow}>
                      <div style={styles.gachaBalanceLeft}>
                        <span style={{ fontSize: 24 }}>🌰</span>
                        <div>
                          <div style={styles.gachaBalanceNum} className="tabular-nums">
                            {acorns}
                          </div>
                          <div style={styles.gachaBalanceLabel}>Желудей на балансе</div>
                        </div>
                      </div>

                      {/* Pull Button */}
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94, y: 2 }}
                        onClick={handlePullCard}
                        disabled={isPulling || acorns < 50}
                        style={{
                          ...styles.gachaPullBtn,
                          opacity: acorns < 50 || isPulling ? 0.6 : 1,
                        }}
                        type="button"
                      >
                        <Sparkles size={14} color="#0D1322" />
                        <span>{isPulling ? 'Открываем...' : 'Крутить (50 🌰)'}</span>
                      </motion.button>
                    </div>

                    {/* Ethical Pity Guarantees */}
                    <div style={styles.gachaPityInfoRow}>
                      <span style={styles.pityPill}>
                        🛡️ Soft-pity (Epic): 10 круток
                      </span>
                      <span style={styles.pityPill}>
                        👑 Hard-pity (Legendary): 30 круток
                      </span>
                    </div>
                  </div>

                  {/* Album Collection Progress */}
                  <div style={styles.albumSectionTitle}>
                    <span>Альбом Знаний ({inventory.collection_progress})</span>
                  </div>

                  {/* Cards Grid */}
                  <div style={styles.cardsGrid}>
                    {inventory.cards.length === 0 ? (
                      <div style={styles.emptyCardsNotice}>
                        <Gift size={28} color="#9CA3AF" />
                        <p style={styles.emptyNoticeTitle}>Карточки пока не открыты</p>
                        <p style={styles.emptyNoticeSub}>
                          Нажмите «Крутить (50 🌰)», чтобы открыть свою первую научную карточку!
                        </p>
                      </div>
                    ) : (
                      inventory.cards.map((c) => {
                        const isLeg = c.rarity === 'legendary';
                        const isEpic = c.rarity === 'epic';
                        const isRare = c.rarity === 'rare';
                        return (
                          <div
                            key={c.card_id}
                            style={{
                              ...styles.cardItemBox,
                              borderColor: isLeg
                                ? '#F59E0B'
                                : isEpic
                                ? '#A855F7'
                                : isRare
                                ? '#3B82F6'
                                : 'rgba(255,255,255,0.12)',
                            }}
                          >
                            <div style={styles.cardItemRarityBadge}>
                              {isLeg && '👑 LEGENDARY'}
                              {isEpic && '💜 EPIC'}
                              {isRare && '💎 RARE'}
                              {!isLeg && !isEpic && !isRare && 'COMMON'}
                            </div>
                            <div style={styles.cardItemName}>{c.card_name}</div>
                            <div style={styles.cardItemSubject}>{c.subject}</div>
                            <p style={styles.cardItemFact}>{c.lore_microfact}</p>
                            {c.count && c.count > 1 && (
                              <span style={styles.cardCountPill}>x{c.count}</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SHEET 4: DEVELOPER SANDBOX (Stage Switcher & Simulation) */}
              {activeSheet === 'dev' && (
                <div style={styles.sheetScrollBody}>
                  <div style={styles.devSectionTitle}>
                    <span>Мгновенный просмотр стадий Дерева (1..6)</span>
                  </div>

                  {/* Stage Switcher Buttons */}
                  <div style={styles.devStageBtnGrid}>
                    {([1, 2, 3, 4, 5, 6] as TreeStage[]).map((st) => {
                      const isCurrent = activeTreeStage === st;
                      const titles = [
                        '🌱 1: Семечко (0-499 XP)',
                        '🌿 2: Росток (500-1499 XP)',
                        '🌳 3: Саженец (1500-3499 XP)',
                        '🌲 4: Дерево (3500-7499 XP)',
                        '👑 5: Вековой Дуб (7500-14999 XP)',
                        '✨ 6: Цветущее Древо (15000+ XP)',
                      ];
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            haptics.selection();
                            setDevStageOverride(st);
                          }}
                          style={{
                            ...styles.devStageBtn,
                            ...(isCurrent ? styles.devStageBtnActive : {}),
                          }}
                        >
                          <span>{titles[st - 1]}</span>
                          {isCurrent && <CheckCircle2 size={13} color="#10B981" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dev Sandbox Actions */}
                  <div style={styles.devSectionTitle}>
                    <span>Симуляция событий и валюты</span>
                  </div>
                  <div style={styles.devActionRow}>
                    <button
                      type="button"
                      onClick={() => {
                        setPoints((p) => p + 500);
                        haptics.notification('success');
                      }}
                      style={styles.devActionBtn}
                    >
                      <Zap size={13} color="#FBBF24" />
                      <span>+500 Очков</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAcorns((a) => a + 100);
                        haptics.notification('success');
                      }}
                      style={styles.devActionBtn}
                    >
                      <span>🌰 +100 Желудей</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGrove((g) => ({
                          ...g,
                          is_hibernating: !g.is_hibernating,
                          hibernation_days: g.is_hibernating ? 0 : 7,
                        }));
                        haptics.selection();
                      }}
                      style={styles.devActionBtn}
                    >
                      <span>❄️ Переключить Спячку</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDevStageOverride(null);
                        loadGroveData();
                        haptics.selection();
                      }}
                      style={styles.devActionBtn}
                    >
                      <RefreshCw size={13} color="#9CA3AF" />
                      <span>Сбросить к БД</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =========================================================================
          PULLED CARD REVEAL MODAL (Gacha Unboxing Animation)
          ========================================================================= */}
      <AnimatePresence>
        {pulledCardResult && pulledCardResult.card && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.cardRevealOverlay}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40, rotateY: 90 }}
              animate={{ scale: 1, y: 0, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              style={styles.cardRevealModal}
            >
              <div style={styles.cardRevealTopGlow}>
                <Sparkles size={18} color="#F59E0B" />
                <span style={styles.cardRevealCongrats}>НОВАЯ КАРТОЧКА ЗНАНИЙ!</span>
              </div>

              {/* The Card Artifact */}
              <div
                style={{
                  ...styles.cardArtifact,
                  borderColor:
                    pulledCardResult.card.rarity === 'legendary'
                      ? '#F59E0B'
                      : pulledCardResult.card.rarity === 'epic'
                      ? '#A855F7'
                      : pulledCardResult.card.rarity === 'rare'
                      ? '#3B82F6'
                      : '#9CA3AF',
                }}
              >
                <div style={styles.cardArtifactRarityBadge}>
                  {pulledCardResult.card.rarity.toUpperCase()}
                </div>
                <div style={styles.cardArtifactTitle}>{pulledCardResult.card.card_name}</div>
                <div style={styles.cardArtifactSubject}>{pulledCardResult.card.subject}</div>
                <p style={styles.cardArtifactFact}>{pulledCardResult.card.lore_microfact}</p>
                {pulledCardResult.is_duplicate && (
                  <div style={styles.duplicateNotice}>
                    <span>Дубликат! Начислен кэшбэк +25 🌰</span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPulledCardResult(null)}
                style={styles.cardRevealCloseBtn}
                type="button"
              >
                <span>Забрать в альбом</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// STYLES (Game-grade, Anti-AI-Slop, Pure Mobile Playable Canvas)
// =============================================================================
const styles: Record<string, React.CSSProperties> = {
  outerContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#07100D',
    fontFamily: "Manrope, Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  worldBackground: {
    position: 'absolute',
    inset: 0,
    backgroundImage: "url('/assets/backgrounds/grove_bg_v2.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
    pointerEvents: 'none',
  },
  worldSceneLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    pointerEvents: 'auto',
    overflow: 'hidden',
  },

  // Game Mode Action Nodes (Left & Right)
  blitzNodeBtn: {
    position: 'absolute',
    top: 76,
    left: 14,
    zIndex: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '6px 12px 6px 8px',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 25, 20, 0.88)',
    border: '1.5px solid #F59E0B',
    borderBottom: '3.5px solid #B45309',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  nodeIconCircleAmber: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#F59E0B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNodeBtn: {
    position: 'absolute',
    top: 76,
    right: 14,
    zIndex: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '6px 12px 6px 8px',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 25, 20, 0.88)',
    border: '1.5px solid #10B981',
    borderBottom: '3.5px solid #047857',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  nodeIconCircleEmerald: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTextCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: 1.1,
  },
  nodeTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  nodeSub: {
    fontSize: 9,
    fontWeight: 700,
    color: '#FDE68A',
  },

  // Tree Ground Anchor (Fixed bottom meadow coordinates!)
  treeGroundAnchor: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 12,
    pointerEvents: 'auto',
  },
  treeLevelBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    border: '2px solid #F59E0B',
    borderBottom: '4px solid #D97706',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(245, 158, 11, 0.35)',
    cursor: 'pointer',
    marginBottom: 10,
  },
  treeLevelBadgeText: {
    fontSize: 13,
    fontWeight: 900,
    color: '#78350F',
    letterSpacing: -0.2,
  },
  treeLevelBadgeXp: {
    fontSize: 12.5,
    fontWeight: 900,
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid #A7F3D0',
  },
  floatingXpPop: {
    position: 'absolute',
    top: -30,
    fontSize: 18,
    fontWeight: 900,
    color: '#34D399',
    textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(52, 211, 153, 0.6)',
    pointerEvents: 'none',
    zIndex: 20,
  },

  // Sprint Ground Anchor (Fixed bottom meadow coordinates!)
  sprintGroundAnchor: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    zIndex: 14,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sprintClickTarget: {
    position: 'relative',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sprintContactShadow: {
    position: 'absolute',
    bottom: 12,
    width: 82,
    height: 15,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse at center, rgba(8, 20, 5, 0.85) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  sprintImg: {
    width: 112,
    height: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
    userSelect: 'none',
  },
  tactileWaterBtn: {
    marginTop: -2,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 999,
    backgroundColor: '#10B981',
    border: 'none',
    borderBottom: '4px solid #047857',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 900,
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.45)',
    cursor: 'pointer',
  },
  speechBubble: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    maxWidth: 220,
    padding: '10px 14px',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    border: '2px solid #F59E0B',
    borderBottom: '4px solid #D97706',
    color: '#1F2937',
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.35,
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    zIndex: 25,
  },
  speechBubbleTail: {
    position: 'absolute',
    bottom: -7,
    left: 32,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRight: '2px solid #F59E0B',
    borderBottom: '2px solid #D97706',
    transform: 'rotate(45deg)',
  },

  // Game HUD (Top Bar)
  gameHudHeader: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    zIndex: 25,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderRadius: 16,
    backgroundColor: 'rgba(13, 23, 19, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  hudLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  hudRoundBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderBottom: '2.5px solid rgba(0, 0, 0, 0.5)',
    cursor: 'pointer',
  },
  hudClassBadge: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.15,
  },
  hudClassTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#F9FAFB',
  },
  hudStatusDot: {
    fontSize: 9.5,
    fontWeight: 600,
    color: '#34D399',
  },
  hudRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  hudAcornWalletBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    borderBottom: '2.5px solid rgba(180, 83, 9, 0.6)',
    cursor: 'pointer',
  },
  acornIcon: {
    fontSize: 12,
  },
  acornCountText: {
    fontSize: 11,
    fontWeight: 800,
    color: '#FDE68A',
  },
  hudStreakPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '4px 7px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  streakText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#E5E7EB',
  },
  hudDevBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '4px 7px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    cursor: 'pointer',
  },
  devBtnText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#D1D5DB',
  },

  // Hibernation Banner
  hibernationBanner: {
    position: 'absolute',
    top: 56,
    left: 10,
    right: 10,
    zIndex: 24,
    padding: '8px 12px',
    borderRadius: 14,
    backgroundColor: 'rgba(30, 58, 138, 0.92)',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hibernationLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  hibernationTitle: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#BFDBFE',
    margin: 0,
  },
  hibernationSub: {
    fontSize: 9.5,
    color: '#93C5FD',
    margin: 0,
  },
  reviveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 9px',
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    border: 'none',
    borderBottom: '2.5px solid #B45309',
    color: '#0D1322',
    fontSize: 10.5,
    fontWeight: 800,
    cursor: 'pointer',
  },

  // Bottom Navigation Dock (Always accessible on top!)
  bottomNavDock: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '6px 8px',
    borderRadius: 18,
    backgroundColor: 'rgba(13, 23, 19, 0.94)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
  },
  navTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    fontSize: 10,
    cursor: 'pointer',
  },
  navTabActive: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    fontSize: 10,
    cursor: 'pointer',
  },
  navIconNormal: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconGlowEmerald: {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
  },
  navIconGlowAmber: {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
  },

  // Modal Bottom Sheet Overlays (Floats right above the dock)
  sheetBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 40,
    backdropFilter: 'blur(3px)',
  },
  modalBottomSheet: {
    position: 'absolute',
    bottom: 58,
    left: 10,
    right: 10,
    maxHeight: '68%',
    zIndex: 45,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 24,
    backgroundColor: 'rgba(12, 22, 18, 0.97)',
    border: '1.5px solid rgba(245, 158, 11, 0.35)',
    boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(20px)',
  },
  sheetTopBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 14px 10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  sheetHandleIndicator: {
    width: 36,
    height: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 8,
  },
  sheetHeaderRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  sheetMainTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#F9FAFB',
  },
  sheetCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    cursor: 'pointer',
  },
  sheetScrollBody: {
    padding: '12px 14px 20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  // Sheet 1: Liebig Styles
  biomeStatusBox: {
    padding: '10px 12px',
    borderRadius: 14,
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  biomeStatusTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  biomeStatusText: {
    fontSize: 11,
    color: '#D1D5DB',
    margin: 0,
    lineHeight: 1.3,
  },
  biomeAdviceText: {
    fontSize: 10.5,
    color: '#FDE68A',
    margin: 0,
    lineHeight: 1.3,
  },
  liebigVesselsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  vesselCard: {
    padding: '10px 12px',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    rowGap: 8,
    alignItems: 'center',
  },
  vesselHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  vesselIconWrapBlue: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vesselIconWrapGreen: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vesselIconWrapAmber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vesselName: {
    fontSize: 12,
    fontWeight: 800,
    color: '#F9FAFB',
  },
  vesselTier: {
    fontSize: 9.5,
    color: '#9CA3AF',
  },
  vesselPctBlue: {
    fontSize: 14,
    fontWeight: 800,
    color: '#60A5FA',
  },
  vesselPctGreen: {
    fontSize: 14,
    fontWeight: 800,
    color: '#34D399',
  },
  vesselPctAmber: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FBBF24',
  },
  vesselTrack: {
    gridColumn: '1 / -1',
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  vesselFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  pedagogicalFootnote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 1.35,
    padding: '4px 2px',
  },

  // Sheet 2: Leaderboard Styles
  mvpHighlightCard: {
    padding: '10px 12px',
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1.5px solid rgba(245, 158, 11, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mvpLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  mvpLabel: {
    fontSize: 9,
    fontWeight: 800,
    color: '#FDE68A',
  },
  mvpName: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  mvpRole: {
    fontSize: 9.5,
    color: '#D1D5DB',
  },
  mvpRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  mvpXpVal: {
    fontSize: 14,
    fontWeight: 900,
    color: '#F59E0B',
  },
  mvpXpSub: {
    fontSize: 8.5,
    color: '#9CA3AF',
  },
  divisionBtnRow: {
    display: 'flex',
    gap: 5,
  },
  divBtn: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid transparent',
    color: '#9CA3AF',
    fontSize: 10.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  divBtnActive: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#FDE68A',
    fontSize: 10.5,
    fontWeight: 800,
    cursor: 'pointer',
  },
  divisionListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  studentListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  studentItemMvp: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  studentRankBadge: {
    width: 24,
    fontSize: 11,
    fontWeight: 800,
    color: '#9CA3AF',
  },
  studentInfoCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  studentNameLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  studentName: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#F9FAFB',
  },
  crownBadge: {
    fontSize: 9,
    padding: '1px 5px',
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    color: '#0D1322',
    fontWeight: 800,
  },
  starBadge: {
    fontSize: 9,
    padding: '1px 5px',
    borderRadius: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    color: '#34D399',
    fontWeight: 700,
  },
  studentRoleText: {
    fontSize: 9,
    color: '#6B7280',
  },
  studentXpCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  studentXpNumber: {
    fontSize: 12,
    fontWeight: 800,
    color: '#10B981',
  },
  studentXpUnit: {
    fontSize: 8,
    color: '#6B7280',
  },

  // Sheet 3: Gacha Cards Styles
  gachaHeaderBox: {
    padding: '12px 14px',
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1.5px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  gachaAcornBalanceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gachaBalanceLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  gachaBalanceNum: {
    fontSize: 20,
    fontWeight: 900,
    color: '#FDE68A',
    lineHeight: 1,
  },
  gachaBalanceLabel: {
    fontSize: 9.5,
    color: '#D1D5DB',
  },
  gachaPullBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 14px',
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    border: 'none',
    borderBottom: '3.5px solid #B45309',
    color: '#0D1322',
    fontWeight: 900,
    fontSize: 12,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
  },
  gachaPityInfoRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  pityPill: {
    fontSize: 9,
    fontWeight: 700,
    padding: '3px 7px',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#D1D5DB',
  },
  albumSectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#F9FAFB',
    padding: '0 2px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  emptyCardsNotice: {
    gridColumn: '1 / -1',
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
  },
  emptyNoticeTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#E5E7EB',
    margin: 0,
  },
  emptyNoticeSub: {
    fontSize: 10,
    color: '#9CA3AF',
    margin: 0,
  },
  cardItemBox: {
    position: 'relative',
    padding: '10px 10px 8px',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  cardItemRarityBadge: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 0.5,
    color: '#9CA3AF',
  },
  cardItemName: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.2,
  },
  cardItemSubject: {
    fontSize: 9.5,
    color: '#34D399',
    fontWeight: 600,
  },
  cardItemFact: {
    fontSize: 9,
    color: '#9CA3AF',
    margin: '3px 0 0',
    lineHeight: 1.25,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardCountPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 8.5,
    fontWeight: 800,
    padding: '1px 5px',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#F9FAFB',
  },

  // Sheet 4: Developer Sandbox Styles
  devSectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#9CA3AF',
    margin: '2px 0',
  },
  devStageBtnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 6,
  },
  devStageBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  devStageBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    color: '#34D399',
  },
  devActionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 6,
  },
  devActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 10px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#F9FAFB',
    fontSize: 10.5,
    fontWeight: 700,
    cursor: 'pointer',
  },

  // Gacha Reveal Overlay Modal
  cardRevealOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backdropFilter: 'blur(8px)',
  },
  cardRevealModal: {
    width: '100%',
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  cardRevealTopGlow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  cardRevealCongrats: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.8,
    color: '#FDE68A',
  },
  cardArtifact: {
    width: '100%',
    padding: '18px 16px',
    borderRadius: 20,
    backgroundColor: 'rgba(15, 27, 22, 0.96)',
    border: '2.5px solid',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 28px rgba(245, 158, 11, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 6,
  },
  cardArtifactRarityBadge: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1,
    padding: '2px 8px',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FDE68A',
  },
  cardArtifactTitle: {
    fontSize: 17,
    fontWeight: 900,
    color: '#FFFFFF',
    marginTop: 4,
  },
  cardArtifactSubject: {
    fontSize: 12,
    fontWeight: 700,
    color: '#34D399',
  },
  cardArtifactFact: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 1.4,
    margin: '6px 0 0',
  },
  duplicateNotice: {
    marginTop: 6,
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: 700,
  },
  cardRevealCloseBtn: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 14,
    backgroundColor: '#10B981',
    border: 'none',
    borderBottom: '3.5px solid #047857',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
  },
};
