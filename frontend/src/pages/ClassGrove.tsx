import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Droplets,
  Flame,
  Sparkles,
  Timer,
  Clock,
} from 'lucide-react';
import { haptics } from '../services/haptics';
import { CanvasParticleEngine } from '../services/particles';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';

interface ClassGroveProps {
  onStartQuiz?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenStats?: () => void;
}

type TreeStage = 1 | 2 | 3 | 4;

const STAGE_IMAGES: Record<TreeStage, string> = {
  1: '/assets/grove/tree_stage1.png',
  2: '/assets/grove/tree_stage2.png',
  3: '/assets/grove/tree_stage3.png',
  4: '/assets/grove/tree_stage4_clean.png',
};

const STAGE_NAMES: Record<TreeStage, string> = {
  1: 'Росток Знаний',
  2: 'Юный Саженец',
  3: 'Молодое Древо',
  4: 'Волшебный Дуб',
};

export default function ClassGrove({
  onStartQuiz,
  onOpenStats,
}: ClassGroveProps) {
  const [points, setPoints] = useState<number>(2840);
  const [acornsFilled, setAcornsFilled] = useState<number>(4);
  const [treeStage, setTreeStage] = useState<TreeStage>(4);
  const [treeHealth, setTreeHealth] = useState<number>(95);
  const [streakDays] = useState<number>(5);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [isWatering, setIsWatering] = useState<boolean>(false);

  // Canvas particle engine for sunlight pollen, fireflies & water drops
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CanvasParticleEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 750;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const engine = new CanvasParticleEngine(canvas);
    engineRef.current = engine;

    const interval = setInterval(() => {
      engine.spawnAmbientFirefly(canvas.width, canvas.height);
    }, 700);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearInterval(interval);
      engine.destroy();
    };
  }, []);

  // Water the tree action
  const handleWaterTree = () => {
    haptics.notification('success');
    setIsWatering(true);
    setPoints((prev) => prev + 50);
    setTreeHealth(100);
    setBubbleMessage('Дерево напиталось живой водой! Серия спасена! +50 очков');

    // Spawn water droplets splashing towards the tree roots
    const canvas = canvasRef.current;
    if (canvas && engineRef.current) {
      engineRef.current.triggerExplosion(
        canvas.width * 0.55,
        canvas.height * 0.58,
        40,
        ['#60A5FA', '#34D399', '#93C5FD', '#FFFFFF', '#FCD34D']
      );
    }

    setTimeout(() => {
      setIsWatering(false);
    }, 1200);

    setTimeout(() => {
      setBubbleMessage(null);
    }, 3200);
  };

  // Click sprint mascot
  const handleSprintClick = () => {
    handleWaterTree();
    const messages = [
      'Поливай Дерево Знаний каждый день, чтобы сохранить стрик!',
      'Наш класс на 2-м месте в школе! Давай поднажмём!',
      'Чем больше правильных ответов — тем пышнее крона!',
      'Смотри, сколько золотых желудей мы уже собрали!',
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    setBubbleMessage(randomMsg);
    setTimeout(() => setBubbleMessage(null), 3200);
  };

  // Click on tree trunk rune
  const handleTreeClick = () => {
    haptics.selection();
    const canvas = canvasRef.current;
    if (canvas && engineRef.current) {
      engineRef.current.triggerExplosion(
        canvas.width * 0.58,
        canvas.height * 0.52,
        30,
        ['#FDE047', '#F59E0B', '#34D399', '#FFFFFF']
      );
    }
    setBubbleMessage('Руна Знаний сияет силой дружбы класса!');
    setTimeout(() => setBubbleMessage(null), 3000);
  };

  // Cycle tree stages for interactive exploration
  const handleCycleStage = () => {
    haptics.selection();
    setTreeStage((prev) => ((prev % 4) + 1) as TreeStage);
  };

  return (
    <div style={styles.container}>
      {/* Background Ambience Canvas for Sunlight Pollen & Water Splashes */}
      <canvas ref={canvasRef} style={styles.particleCanvas} />

      {/* 6-Acorns Progress Capsule Bar (Starts right at the top) */}
      <div style={styles.acornCapsuleBar}>
        <div style={styles.acornsRow}>
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const isFilled = num <= acornsFilled;
            return (
              <motion.div
                key={num}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  haptics.selection();
                  setAcornsFilled(num);
                }}
                style={styles.acornItemWrapper}
                title={`Желудь ${num}`}
              >
                <img
                  src={isFilled ? '/assets/icons/acorn_gold.png' : '/assets/icons/acorn_empty.png'}
                  alt={isFilled ? 'Золотой желудь' : 'Пустой желудь'}
                  style={{
                    width: 26,
                    height: 26,
                    objectFit: 'contain',
                    filter: isFilled ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.7))' : 'opacity(0.55)',
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Emerald Fill Line */}
        <div style={styles.progressTrack}>
          <motion.div
            style={styles.progressFill}
            initial={{ width: '40%' }}
            animate={{ width: `${(acornsFilled / 6) * 100}%` }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          />
        </div>
      </div>

      {/* Streak & Tree Health Status Pill */}
      <div style={styles.statusPillsRow}>
        <div style={styles.streakPill}>
          <Flame size={14} color="#F59E0B" />
          <span>{streakDays} дней стрик</span>
        </div>

        <div
          onClick={handleWaterTree}
          style={{
            ...styles.healthPill,
            backgroundColor: treeHealth >= 80 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            borderColor: treeHealth >= 80 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
          }}
          title="Полить, чтобы восстановить здоровье"
        >
          <Droplets size={14} color={treeHealth >= 80 ? '#34D399' : '#EF4444'} />
          <span>Древо: {treeHealth}%</span>
        </div>

        <button
          onClick={handleCycleStage}
          style={styles.stagePill}
          title="Сменить стадию дерева"
        >
          <Sparkles size={13} color="#FBBF24" />
          <span>Ур. {treeStage}</span>
        </button>
      </div>

      {/* Interactive Glade Layer with Tree & Authentic Wooden Hanging Signs */}
      <div style={styles.gladeInteractiveScene}>
        {/* Real Hanging Wooden Sign 1: 30 sec (Blitz quiz) - Top Left */}
        <motion.div
          animate={{ rotate: [-1.4, 1.4, -1.4] }}
          transition={{ repeat: Infinity, duration: 4.4, ease: 'easeInOut' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            haptics.impact('medium');
            onStartQuiz?.();
          }}
          style={styles.woodenSignTopLeft}
          title="Быстрый блиц на 30 секунд"
        >
          <img
            src="/assets/ui/sign_hanging.png"
            alt="Табличка 30 сек"
            style={styles.signPlankImg}
          />
          <div style={styles.signTextOverlay}>
            <div style={styles.signIconMiniCircle}>
              <Timer size={13} color="#451A03" />
            </div>
            <span style={styles.carvedSignText}>30 сек</span>
          </div>
        </motion.div>

        {/* Real Hanging Wooden Sign 2: 5 min (Lesson Quiz) - Top Right */}
        <motion.div
          animate={{ rotate: [1.4, -1.4, 1.4] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            haptics.impact('medium');
            onStartQuiz?.();
          }}
          style={styles.woodenSignTopRight}
          title="Тест урока на 5 минут"
        >
          <img
            src="/assets/ui/sign_hanging.png"
            alt="Табличка 5 мин"
            style={styles.signPlankImg}
          />
          <div style={styles.signTextOverlay}>
            <div style={styles.signIconMiniCircle}>
              <Clock size={13} color="#451A03" />
            </div>
            <span style={styles.carvedSignText}>5 мин</span>
          </div>
        </motion.div>

        {/* Central Growing Tree on its Moss Mound */}
        <motion.div
          key={treeStage}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -3, 0] }}
          transition={{
            scale: { type: 'spring', stiffness: 300, damping: 22 },
            y: { repeat: Infinity, duration: 3.8, ease: 'easeInOut' },
          }}
          onClick={handleTreeClick}
          style={styles.centerTreeContainer}
          title={`${STAGE_NAMES[treeStage]} (нажми на древо)`}
        >
          <img
            src={STAGE_IMAGES[treeStage]}
            alt={STAGE_NAMES[treeStage]}
            style={{
              ...styles.centerTreeImg,
              maxHeight: treeStage === 1 ? 160 : treeStage === 2 ? 200 : treeStage === 3 ? 240 : 280,
              filter: isWatering ? 'drop-shadow(0 0 16px rgba(52, 211, 153, 0.8))' : 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
            }}
          />
        </motion.div>

        {/* Sprint Mascot with Watering Can on Bottom Left */}
        <motion.div
          animate={
            isWatering
              ? { rotate: [-2, -8, -2], y: [0, -4, 0] }
              : { y: [0, -3, 0] }
          }
          transition={{
            repeat: isWatering ? 1 : Infinity,
            duration: isWatering ? 0.6 : 3.2,
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSprintClick}
          style={styles.sprintWateringContainer}
          title="Спринт поливает Дерево (нажми, чтобы полить)"
        >
          <img
            src="/assets/mascot/sprint_watering_clean.png"
            alt="Спринт с лейкой"
            style={styles.sprintWateringImg}
          />

          {/* Quick Water Pill badge attached below Sprint */}
          <div style={styles.sprintWaterBadge}>
            <Droplets size={12} color="#FFFFFF" />
            <span>Полить</span>
          </div>
        </motion.div>

        {/* Dynamic Speech Bubble */}
        <AnimatePresence>
          {bubbleMessage && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 450, damping: 24 }}
              style={styles.floatingBubble}
            >
              <span>{bubbleMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Common Points Card */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onOpenStats}
        style={styles.pointsCard}
      >
        <div style={styles.pointsCardLeft}>
          <div style={styles.leafIconCircle}>
            <img
              src="/assets/icons/icon_sprout.svg"
              alt="Росток"
              style={{ width: 22, height: 22 }}
            />
          </div>

          <div style={styles.pointsTextColumn}>
            <span style={styles.pointsCardTitle}>Наши общие очки</span>
            <div style={styles.pointsValueRow}>
              <JuicyScoreCounter value={points} size="lg" />
            </div>
            <span style={styles.pointsCardSubtitle}>
              Класс растёт благодаря тебе!
            </span>
          </div>
        </div>

        <ChevronRight size={22} color="#9CA3AF" />
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundImage: "url('/assets/backgrounds/grove_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '12px 14px 14px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  particleCanvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1,
  },
  header: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
    border: '1.5px solid rgba(16, 185, 129, 0.6)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.1,
  },
  brandSub: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: 600,
  },
  playerCountPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  acornCapsuleBar: {
    position: 'relative',
    zIndex: 5,
    width: '100%',
    backgroundColor: '#131F35',
    border: '2px solid #283756',
    borderBottom: '4px solid #1B263F',
    borderRadius: 999,
    padding: '8px 16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 8,
  },
  acornsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 6px',
  },
  acornItemWrapper: {
    cursor: 'pointer',
    touchAction: 'manipulation',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 10px #10B981',
    borderRadius: 999,
  },
  statusPillsRow: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  streakPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#261F12',
    border: '2px solid #5C4318',
    borderBottom: '3px solid #F59E0B',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 800,
    color: '#FEF3C7',
  },
  healthPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#132A24',
    border: '2px solid #1C5A48',
    borderBottom: '3px solid #10B981',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 800,
    color: '#E2E8F0',
    cursor: 'pointer',
  },
  stagePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '3px solid #1B263F',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 800,
    color: '#FDE68A',
    cursor: 'pointer',
  },
  gladeInteractiveScene: {
    position: 'relative',
    zIndex: 3,
    flex: 1,
    width: '100%',
    minHeight: 320,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTreeContainer: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
    zIndex: 3,
  },
  centerTreeImg: {
    width: 'auto',
    objectFit: 'contain',
    userSelect: 'none',
    pointerEvents: 'auto',
    transition: 'filter 0.3s ease',
  },
  woodenSignTopLeft: {
    position: 'absolute',
    top: 10,
    left: 4,
    width: 108,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transformOrigin: 'top center',
    zIndex: 4,
  },
  woodenSignTopRight: {
    position: 'absolute',
    top: 16,
    right: 4,
    width: 108,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transformOrigin: 'top center',
    zIndex: 4,
  },
  signPlankImg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))',
  },
  signTextOverlay: {
    position: 'absolute',
    bottom: '18%',
    left: '10%',
    right: '10%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  signIconMiniCircle: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carvedSignText: {
    fontSize: 13,
    fontWeight: 900,
    color: '#451A03',
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.4)',
    letterSpacing: '0.02em',
  },
  sprintWateringContainer: {
    position: 'absolute',
    bottom: 4,
    left: 2,
    width: 115,
    cursor: 'pointer',
    touchAction: 'manipulation',
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sprintWateringImg: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45))',
  },
  sprintWaterBadge: {
    marginTop: -8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    border: '1.5px solid #FFFFFF',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 800,
    color: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.6)',
  },
  floatingBubble: {
    position: 'absolute',
    top: '35%',
    left: '16%',
    right: '16%',
    backgroundColor: 'rgba(14, 25, 45, 0.94)',
    border: '1.5px solid rgba(255, 122, 0, 0.6)',
    borderRadius: 16,
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    fontSize: 12.5,
    fontWeight: 700,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.35,
    zIndex: 6,
    pointerEvents: 'none',
  },
  pointsCard: {
    position: 'relative',
    zIndex: 5,
    backgroundColor: 'rgba(14, 25, 45, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 20,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    cursor: 'pointer',
    touchAction: 'manipulation',
    marginBottom: 8,
  },
  pointsCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  leafIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    border: '1.5px solid rgba(16, 185, 129, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)',
  },
  pointsTextColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  pointsCardTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 700,
  },
  pointsValueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  pointsCardSubtitle: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: 600,
  },
  bottomNavDock: {
    position: 'relative',
    zIndex: 5,
    backgroundColor: 'rgba(10, 18, 34, 0.94)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 24,
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
  },
  navTabBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    padding: '4px 10px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    fontSize: 10.5,
    fontWeight: 600,
    transition: 'color 0.2s ease',
  },
  navTabBtnActive: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    padding: '2px 10px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    fontSize: 10.5,
  },
  activePillGlow: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    border: '1.5px solid rgba(16, 185, 129, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(16, 185, 129, 0.6)',
  },
};
