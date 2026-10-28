import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layers,
  Users,
  Award,
  ArrowLeft,
} from 'lucide-react';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import SoundToggleButton from '../components/SoundToggleButton';
import { MascotPuppet } from '../components/MascotPuppet';
import { ClassGroveTree, STAGE_NAMES } from '../components/ClassGroveTree';
import { WaterParticlesCanvas, WaterParticlesCanvasHandle } from '../components/WaterParticlesCanvas';
import {
  fetchGroveState,
  fetchGroveLeaderboard,
  applyWaterContribution,
  fetchStudentInventory,
  GroveStateResponse,
  GroveLeaderboardResponse,
  StudentLeaderboardEntry,
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

type ActiveSheetType = null | 'liebig' | 'leaderboard' | 'gacha' | 'dev' | 'achievements' | 'stages';

interface ClassGroveProps {
  onBack?: () => void;
  onStartQuiz?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenStats?: () => void;
  classId?: string;
  appMode?: 'user' | 'dev';
}

export default function ClassGrove({
  onBack,
  onStartQuiz: _onStartQuiz,
  onOpenLeaderboard: _onOpenLeaderboard,
  onOpenStats: _onOpenStats,
  classId = '5A',
  appMode = 'user',
}: ClassGroveProps) {
  const isDevMode = appMode === 'dev';

  // Live State
  const [grove, setGrove] = useState<GroveStateResponse>(mockDefaultGrove);
  const [leaderboard, setLeaderboard] = useState<GroveLeaderboardResponse>(mockDefaultLeaderboard);
  const [inventory, setInventory] = useState<StudentInventoryResponse>(() => {
    try {
      const savedAcorns = sessionStorage.getItem('lisquiz_user_acorns');
      const acorns = savedAcorns !== null ? parseInt(savedAcorns, 10) : (isDevMode ? 924 : 0);
      return {
        student_id: 'current_student',
        acorns_balance: isNaN(acorns) ? 0 : acorns,
        collection_progress: isDevMode ? '1/16 (6.2%)' : '0/16 (0%)',
        unique_cards_count: isDevMode ? 1 : 0,
        catalog_total: 16,
        cards: [],
      };
    } catch {
      return {
        student_id: 'current_student',
        acorns_balance: isDevMode ? 924 : 0,
        collection_progress: '0/16 (0%)',
        unique_cards_count: 0,
        catalog_total: 16,
        cards: [],
      };
    }
  });

  // UI & Interaction State
  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>(null);
  const [activeDivisionTab, setActiveDivisionTab] = useState<'council' | 'guardians' | 'sprouts'>('guardians');
  const [points, setPoints] = useState<number>(() => isDevMode ? 320 : 0);
  const maxPoints = 500;
  const [waterCount, setWaterCount] = useState<number>(() => isDevMode ? 248 : 0);
  const soilCount = isDevMode ? 186 : 0;
  const sunCount = isDevMode ? 132 : 0;
  const [isWatering, setIsWatering] = useState<boolean>(false);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);

  // Dev override stage (0..5). In user mode, stage is fixed to Stage 1 ("Росток")
  const [devStageOverride, setDevStageOverride] = useState<number | null>(() => isDevMode ? 4 : 1);

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
    } catch (err) {
      console.warn('[ClassGrove] Failed to load grove data', err);
    }
  }, [classId]);

  useEffect(() => {
    loadGroveData();
  }, [loadGroveData]);

  // Ambient BGM for Class Grove
  useEffect(() => {
    soundManager.playBgm('grove', true);
  }, []);

  // Active tree stage (0..5)
  // In user mode: locked to real class progress (Stage 1 = Росток for new class), no user override
  const activeTreeStage: number = isDevMode ? (devStageOverride ?? 1) : (grove.stage_level ?? 1);

  // Interactive watering action
  const handleWaterTree = async () => {
    if (isWatering) return;
    soundManager.playWater();
    setIsWatering(true);
    setWaterCount((prev) => prev + 1);
    setPoints((prev) => Math.min(maxPoints, prev + 25));

    // Water particles burst towards tree
    if (particlesRef.current && sceneRef.current) {
      const rect = sceneRef.current.getBoundingClientRect();
      const fromX = rect.width * 0.15;
      const fromY = 60;
      const toX = rect.width * 0.50;
      const toY = rect.height * 0.55;
      particlesRef.current.triggerWaterStream(fromX, fromY, toX, toY);
    }

    setBubbleMessage('Дерево напиталось живой водой! +25 Очков 💧');

    setTimeout(() => {
      setIsWatering(false);
    }, 1200);

    setTimeout(() => {
      setBubbleMessage(null);
    }, 3200);

    // Push to backend
    await applyWaterContribution(classId, 'current_student');
  };

  // Click on mascot Sprint (playful tap reaction)
  const handleSprintClick = () => {
    soundManager.playTap();
    const adviceList = [
      'Привет! Поливай Дерево каждый день, чтобы наш класс не потерял стрик!',
      'Сбалансированный биом даёт +50% ко всем очкам класса!',
      'Каждая правильная викторина приносит живую воду корням!',
      'Копи желуди 🌰 — в лавке знаний можно выбить легендарную карту!',
      'Вперёд, 5А! Мы уже в топ-дивизионе!',
    ];
    const idx = Math.floor(Math.random() * adviceList.length);
    const picked = adviceList[idx] || 'Привет! Поливай Дерево каждый день, чтобы наш класс не потерял стрик!';
    setBubbleMessage(picked);
    setTimeout(() => setBubbleMessage(null), 3600);
  };

  // Click on tree (runic burst; stage explorer only in dev mode)
  const handleTreeClick = () => {
    soundManager.playTap();
    if (particlesRef.current && sceneRef.current) {
      const rect = sceneRef.current.getBoundingClientRect();
      particlesRef.current.triggerExplosion(rect.width * 0.50, rect.height * 0.45, 28);
    }
    if (isDevMode) {
      setActiveSheet('stages');
    }
  };

  // Active division list
  const divisionStudents: StudentLeaderboardEntry[] =
    activeDivisionTab === 'council'
      ? leaderboard.divisions.council_of_groves
      : activeDivisionTab === 'guardians'
      ? leaderboard.divisions.forest_guardians
      : leaderboard.divisions.sprout_keepers;

  return (
    <div
      ref={sceneRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        flex: '1 1 0%',
        minHeight: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        backgroundImage: "url('/assets/grove/grove_bg.png')",
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Particle Canvas */}
      <WaterParticlesCanvas ref={particlesRef} />

      {/* Top Left: Tactile Back to Home Button */}
      {onBack && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            soundManager.playTap();
            onBack();
          }}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 38,
            height: 38,
            borderRadius: '50%',
            backgroundColor: '#FFF5EA',
            border: '2px solid #FFAF66',
            boxShadow: '0 3px 0 #C95000, 0 3px 8px rgba(245, 107, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 35,
            color: '#EA580C',
          }}
          title="Вернуться на главную"
        >
          <ArrowLeft size={20} strokeWidth={2.8} />
        </motion.button>
      )}

      {/* =========================================================================
          1. TOP RESOURCE BAR (Droplet, Soil, Sun, Settings Gear)
          ========================================================================= */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          padding: onBack ? '0 12px 0 52px' : '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          gap: 10,
        }}
      >
        {/* Droplet Pill (Water) */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleWaterTree}
          style={{
            position: 'relative',
            height: 38,
            flex: '1 1 0',
            maxWidth: 110,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Полить Древо живой водой"
        >
          <img
            src="/assets/grove/grove_pill_water.png"
            alt="Water Droplet"
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
          <div
            style={{
              position: 'absolute',
              left: '60%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(12px, 2.3vw, 15px)',
              color: '#4A2306',
              textAlign: 'center',
            }}
          >
            {waterCount}
          </div>
        </motion.div>

        {/* Sprout / Soil Pill */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveSheet('liebig')}
          style={{
            position: 'relative',
            height: 38,
            flex: '1 1 0',
            maxWidth: 110,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Почва и удобрения (Закон Либиха)"
        >
          <img
            src="/assets/grove/grove_pill_soil.png"
            alt="Soil"
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
          <div
            style={{
              position: 'absolute',
              left: '60%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(12px, 2.3vw, 15px)',
              color: '#4A2306',
              textAlign: 'center',
            }}
          >
            {soilCount}
          </div>
        </motion.div>

        {/* Sun Pill */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveSheet('gacha')}
          style={{
            position: 'relative',
            height: 38,
            flex: '1 1 0',
            maxWidth: 110,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Солнце и знания"
        >
          <img
            src="/assets/grove/grove_pill_sun.png"
            alt="Sun"
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
          <div
            style={{
              position: 'absolute',
              left: '60%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(12px, 2.3vw, 15px)',
              color: '#4A2306',
              textAlign: 'center',
            }}
          >
            {sunCount}
          </div>
        </motion.div>
      </div>

      {/* =========================================================================
          2. UPPER LEFT PANEL: "Наш класс" (Opens Divisions & Rankings Modal)
          ========================================================================= */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          haptics.impact('light');
          setActiveSheet('leaderboard');
        }}
        style={{
          position: 'absolute',
          top: 56,
          left: 10,
          width: '32%',
          maxWidth: 135,
          aspectRatio: '1 / 1.02',
          zIndex: 18,
          userSelect: 'none',
          cursor: 'pointer',
        }}
        title="Нажмите, чтобы открыть наш класс и дивизионы"
      >
        <img
          src="/assets/grove/grove_board_our_class.png"
          alt="Наш класс"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />

        {/* Content Inside "Наш класс" Board */}
        <div
          style={{
            position: 'absolute',
            top: '36%',
            left: '17%',
            right: '12%',
            bottom: '14%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12} color="#5C3317" />
            <span
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(9px, 1.6vw, 11px)',
                color: '#4A2306',
                whiteSpace: 'nowrap',
              }}
            >
              26 учеников
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Layers size={12} color="#5C3317" />
            <span
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(9px, 1.6vw, 11px)',
                color: '#4A2306',
                whiteSpace: 'nowrap',
              }}
            >
              48 викторин
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Award size={12} color="#EF4444" />
            <span
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(9px, 1.6vw, 11px)',
                color: '#4A2306',
                whiteSpace: 'nowrap',
              }}
            >
              78% точность
            </span>
          </div>
        </div>
      </motion.div>

      {/* Top Right: Sound Mute / Unmute Toggle Button */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          right: 12,
          zIndex: 22,
        }}
      >
        <SoundToggleButton variant="round" />
      </div>

      {/* =========================================================================
          4. CENTER: THE SACRED KNOWLEDGE TREE (Animated with Framer Motion)
          Grounded on the meadow grass behind the bottom board
          ========================================================================= */}
      <div
        style={{
          position: 'absolute',
          bottom: 175,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 390,
          zIndex: 8,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <ClassGroveTree
          stage={activeTreeStage}
          isWatering={isWatering}
          onTap={handleTreeClick}
        />
      </div>

      {/* =========================================================================
          5. RIGHT FOREGROUND: MASCOT SPRINT SITTING ON THE STONE
          (Inverted to face left towards the tree, seated squarely on top of the flat stone)
          ========================================================================= */}
      <div
        style={{
          position: 'absolute',
          right: 10,
          top: '47.2%',
          width: 105,
          height: 115,
          zIndex: 14,
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        <div style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}>
          <MascotPuppet
            size={105}
            onTap={handleSprintClick}
            interactive={true}
          />
        </div>
      </div>

      {/* Mascot Speech Bubble */}
      <AnimatePresence>
        {bubbleMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -4 }}
            style={{
              position: 'absolute',
              right: '18%',
              top: '40%',
              maxWidth: 190,
              backgroundColor: '#FFFFFF',
              border: '2px solid #FF7A00',
              borderRadius: 14,
              padding: '7px 11px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.16)',
              zIndex: 35,
              pointerEvents: 'none',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10.5,
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 700,
                color: '#4A2306',
                lineHeight: 1.3,
              }}
            >
              {bubbleMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          6. CENTER BOTTOM BOARD: "Роща нашего класса" (Progress & Stage Switcher)
          ========================================================================= */}
      <motion.div
        initial={{ x: '-50%', y: 20, opacity: 0 }}
        animate={{ x: '-50%', y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.2 }}
        style={{
          position: 'absolute',
          bottom: 18,
          left: '50%',
          width: '84%',
          maxWidth: 370,
          aspectRatio: '470 / 270',
          zIndex: 16,
          userSelect: 'none',
        }}
      >
        <img
          src="/assets/grove/grove_board_interactive.png"
          alt="Роща нашего класса"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />

        {/* Interactive Stage Controls Overlay on Parchment */}
        <div
          style={{
            position: 'absolute',
            top: '41%',
            left: '12%',
            right: '12%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isDevMode ? 'space-between' : 'center',
            zIndex: 2,
          }}
        >
          {/* Previous Stage Arrow (dev only) */}
          {isDevMode && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playKnock();
                setDevStageOverride((s) => Math.max(0, (s ?? 1) - 1));
              }}
              disabled={activeTreeStage <= 0}
              style={{
                background: activeTreeStage > 0 ? '#5C3317' : '#D1B89D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: activeTreeStage > 0 ? 'pointer' : 'default',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                fontSize: 11,
                fontWeight: 900,
                opacity: activeTreeStage > 0 ? 1 : 0.45,
                transition: 'all 0.15s ease',
              }}
              title="Предыдущая стадия"
            >
              ◀
            </motion.button>
          )}

          {/* Clickable Stage Title -> opens stages modal only in dev mode */}
          <div
            onClick={isDevMode ? () => {
              soundManager.playTap();
              setActiveSheet('stages');
            } : undefined}
            style={{
              cursor: isDevMode ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 8,
              backgroundColor: isDevMode ? 'rgba(255, 255, 255, 0.35)' : 'transparent',
            }}
            title={isDevMode ? 'Нажмите, чтобы посмотреть все стадии Древа' : undefined}
          >
            <span
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(11px, 2.3vw, 13.5px)',
                color: '#4A2306',
                textAlign: 'center',
                letterSpacing: -0.2,
                whiteSpace: 'nowrap',
              }}
            >
              Стадия {activeTreeStage}. {STAGE_NAMES[activeTreeStage] ?? 'Росток'}
            </span>
            {isDevMode && <span style={{ fontSize: 10, color: '#8C531B' }}>▾</span>}
          </div>

          {/* Next Stage Arrow (dev only) */}
          {isDevMode && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playKnock();
                setDevStageOverride((s) => Math.min(5, (s ?? 1) + 1));
              }}
              disabled={activeTreeStage >= 5}
              style={{
                background: activeTreeStage < 5 ? '#5C3317' : '#D1B89D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: activeTreeStage < 5 ? 'pointer' : 'default',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                fontSize: 11,
                fontWeight: 900,
                opacity: activeTreeStage < 5 ? 1 : 0.45,
                transition: 'all 0.15s ease',
              }}
              title="Следующая стадия"
            >
              ▶
            </motion.button>
          )}
        </div>

        {/* Dynamic Progress Bar & Numbers on Clean Parchment */}
        {(() => {
          const STAGE_XP: Record<number, { current: number; max: number }> = {
            0: { current: 35, max: 100 },
            1: { current: 180, max: 250 },
            2: { current: 360, max: 500 },
            3: { current: 750, max: 1000 },
            4: { current: 1680, max: 2000 },
            5: { current: 2000, max: 2000 },
          };
          const maxStageXp = STAGE_XP[activeTreeStage]?.max ?? 2000;
          const baseStageXp = STAGE_XP[activeTreeStage]?.current ?? 1680;
          const currentStageXp = Math.min(maxStageXp, baseStageXp + (points - 320));
          const pct = Math.min(100, Math.round((currentStageXp / maxStageXp) * 100));

          return (
            <div
              style={{
                position: 'absolute',
                top: '55%',
                left: '14%',
                right: '14%',
                bottom: '12%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: '84%',
                  height: 12,
                  backgroundColor: 'rgba(74, 35, 6, 0.12)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid rgba(74, 35, 6, 0.22)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
                  padding: 1.5,
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #10B981 0%, #22C55E 100%)',
                    borderRadius: 5,
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.45)',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(10.5px, 2.2vw, 12px)',
                  color: '#4A2306',
                  letterSpacing: 0.2,
                }}
              >
                {activeTreeStage === 5 ? 'МАКСИМАЛЬНЫЙ УРОВЕНЬ ✨' : `${currentStageXp} / ${maxStageXp} XP`}
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* =========================================================================
          8. INTERACTIVE MODALS & BOTTOM SHEETS
          ========================================================================= */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(3px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
            onClick={() => setActiveSheet(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '20px 20px 28px',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#4A2306',
                  }}
                >
                  {activeSheet === 'liebig' && 'Закон Минимума Либиха'}
                  {activeSheet === 'leaderboard' && '5А Класс — Дивизионы и рейтинг'}
                  {activeSheet === 'gacha' && 'Лавка Знаний & Карточки'}
                  {activeSheet === 'achievements' && 'Достижения Класса'}
                  {activeSheet === 'stages' && 'Стадии Древа Рощи'}
                  {activeSheet === 'dev' && 'Настройки и Стадии Рощи'}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  style={{
                    background: '#F3F4F6',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} color="#4A2306" />
                </button>
              </div>

              {/* SHEET 1: LIEBIG'S LAW (Bio-balance) */}
              {activeSheet === 'liebig' && (
                <div>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
                    Урожай и рост Дерева определяются самым дефицитным ресурсом. Баланс биома:{' '}
                    <strong>{grove.liebig.biome_balance}%</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                        <span>Вода (Роса Познания)</span>
                        <span>{Math.round(grove.liebig.water_pct)}%</span>
                      </div>
                      <div style={{ width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.round(grove.liebig.water_pct)}%`,
                            height: '100%',
                            backgroundColor: grove.liebig.water_pct < 50 ? '#EF4444' : '#3B82F6',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                        <span>Гумус (Базовые знания ФРП)</span>
                        <span>{Math.round(grove.liebig.humus_pct)}%</span>
                      </div>
                      <div style={{ width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.round(grove.liebig.humus_pct)}%`,
                            height: '100%',
                            backgroundColor: grove.liebig.humus_pct < 50 ? '#EF4444' : '#F59E0B',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                        <span>Свет (Регулярность викторин)</span>
                        <span>{Math.round(grove.liebig.light_pct)}%</span>
                      </div>
                      <div style={{ width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.round(grove.liebig.light_pct)}%`,
                            height: '100%',
                            backgroundColor: grove.liebig.light_pct < 50 ? '#EF4444' : '#10B981',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SHEET 2: LEADERBOARD & DIVISIONS */}
              {activeSheet === 'leaderboard' && (
                <div>
                  {/* Class Stats Summary Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-around',
                      padding: '10px 12px',
                      backgroundColor: '#FAF5ED',
                      borderRadius: 14,
                      border: '1px solid #EADBCE',
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#5C3317" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#4A2306' }}>26 учеников</span>
                    </div>
                    <div style={{ width: 1, height: 16, backgroundColor: '#D8C6B2' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} color="#5C3317" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#4A2306' }}>48 викторин</span>
                    </div>
                    <div style={{ width: 1, height: 16, backgroundColor: '#D8C6B2' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={14} color="#EF4444" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#4A2306' }}>78% точность</span>
                    </div>
                  </div>

                  {/* Division Tabs */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {(['guardians', 'sprouts', 'council'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          haptics.impact('light');
                          setActiveDivisionTab(tab);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          borderRadius: 10,
                          border: activeDivisionTab === tab ? '2px solid #2D6A4F' : '1px solid #E5E7EB',
                          backgroundColor: activeDivisionTab === tab ? '#3B7A57' : '#F9FAFB',
                          color: activeDivisionTab === tab ? '#FFFFFF' : '#4B5563',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          boxShadow: activeDivisionTab === tab ? '0 2px 8px rgba(59, 122, 87, 0.3)' : 'none',
                        }}
                      >
                        <span>
                          {tab === 'guardians' ? '🛡️ Стражи' : tab === 'sprouts' ? '🌱 Ростки' : '👑 Совет'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Student Leaderboard */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {divisionStudents.slice(0, 8).map((st, i) => (
                      <div
                        key={st.student_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          backgroundColor: i < 3 ? '#FEFBF6' : '#F9FAFB',
                          borderRadius: 12,
                          border: i === 0 ? '1.5px solid #F59E0B' : '1px solid #F3F4F6',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span
                            style={{
                              fontWeight: 900,
                              color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : '#9CA3AF',
                              fontSize: 14,
                              width: 22,
                            }}
                          >
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                          <span style={{ fontWeight: 800, color: '#1F2937', fontSize: 13 }}>
                            {st.student_name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#10B981', fontSize: 13 }}>
                          +{st.weekly_xp} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHEET: STAGE EXPLORER & PREVIEW */}
              {activeSheet === 'stages' && (
                <div>
                  <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 14px' }}>
                    Нажмите на любую стадию, чтобы посмотреть как растет и преображается Древо Рощи:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { st: 0, name: '0. Семечко Познания', xp: '100 XP', img: '/assets/grove/tree_stage_1.png' },
                      { st: 1, name: '1. Зелёный Росток', xp: '250 XP', img: '/assets/grove/tree_stage_2.png' },
                      { st: 2, name: '2. Молодой Саженец', xp: '500 XP', img: '/assets/grove/tree_stage_3.png' },
                      { st: 3, name: '3. Пышный Дуб', xp: '1000 XP', img: '/assets/grove/tree_stage_4.png' },
                      { st: 4, name: '4. Древо Мудрости', xp: '1500 XP', img: '/assets/grove/tree_stage_5.png' },
                      { st: 5, name: '5. Цветущее Древо', xp: '2000 XP', img: '/assets/grove/tree_stage_6.png' },
                    ].map((item) => {
                      const isActive = activeTreeStage === item.st;
                      return (
                        <motion.div
                          key={item.st}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            haptics.impact('medium');
                            setDevStageOverride(item.st);
                            setActiveSheet(null);
                          }}
                          style={{
                            padding: '10px 8px',
                            borderRadius: 14,
                            border: isActive ? '2px solid #10B981' : '1.5px solid #E5E7EB',
                            backgroundColor: isActive ? '#F0FDF4' : '#FAFAFA',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            position: 'relative',
                            boxShadow: isActive ? '0 4px 14px rgba(16, 185, 129, 0.2)' : 'none',
                          }}
                        >
                          <div
                            style={{
                              height: 64,
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={item.img}
                              alt={item.name}
                              style={{
                                maxHeight: 60,
                                maxWidth: '90%',
                                objectFit: 'contain',
                              }}
                            />
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: isActive ? '#065F46' : '#1F2937',
                              }}
                            >
                              {item.name}
                            </div>
                            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
                              {item.xp}
                            </div>
                          </div>

                          {isActive ? (
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 800,
                                color: '#10B981',
                                backgroundColor: '#DCFCE7',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}
                            >
                              ✓ Активна
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: '#6B7280',
                                backgroundColor: '#F3F4F6',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}
                            >
                              Выбрать
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SHEET 3: GACHA & INVENTORY */}
              {activeSheet === 'gacha' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px', backgroundColor: '#FEF3C7', borderRadius: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#92400E' }}>
                        🌰 {inventory.acorns_balance}
                      </div>
                      <div style={{ fontSize: 11, color: '#B45309' }}>Желудей на балансе</div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleWaterTree}
                      style={{
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 10,
                        padding: '8px 14px',
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Крутить (50 🌰)
                    </motion.button>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>
                    Собрано карточек: {inventory.collection_progress}
                  </p>
                </div>
              )}

              {/* SHEET 4: ACHIEVEMENTS */}
              {activeSheet === 'achievements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#334155', fontSize: 13 }}>🌱 Первые всходы</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: 6 }}>0 из 10</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>Сыграть 10 совместных викторин всем классом</div>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#334155', fontSize: 13 }}>🔥 Горячий стрик</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: 6 }}>0 из 7 дн.</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>Удерживать стрик в течение 7 дней подряд</div>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#334155', fontSize: 13 }}>👑 Совет Рощи</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: 6 }}>0% из 85%</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>Поднять среднюю точность ответов класса выше 85%</div>
                  </div>
                </div>
              )}

              {/* SHEET 5: DEV & STAGES */}
              {activeSheet === 'dev' && (
                <div>
                  <div style={{ fontWeight: 800, color: '#374151', fontSize: 13, marginBottom: 8 }}>
                    Выбор стадии Дерева:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[0, 1, 2, 3, 4, 5].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setDevStageOverride(st);
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 8,
                          border: activeTreeStage === st ? '2px solid #10B981' : '1px solid #E5E7EB',
                          backgroundColor: activeTreeStage === st ? '#ECFDF5' : '#FFFFFF',
                          fontWeight: 700,
                          fontSize: 11,
                          color: '#1F2937',
                          cursor: 'pointer',
                        }}
                      >
                        {st === 0 && '🌰 0: Семечко'}
                        {st === 1 && '🌱 1: Росток'}
                        {st === 2 && '🌿 2: Саженец'}
                        {st === 3 && '🌳 3: Молодое'}
                        {st === 4 && '🌲 4: Крепкий Дуб'}
                        {st === 5 && '✨ 5: Цветущее'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
