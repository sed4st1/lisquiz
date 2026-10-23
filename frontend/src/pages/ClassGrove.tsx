import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  Droplets,
  Sun,
  Layers,
  BookOpen,
  Award,
  ChevronRight,
  Timer,
  Clock,
  Moon,
  Zap,
} from 'lucide-react';
import { haptics } from '../services/haptics';
import { CanvasParticleEngine } from '../services/particles';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';
import { groveApi, GroveState } from '../services/groveApi';
import KnowledgeCardsModal from '../components/KnowledgeCardsModal';

interface ClassGroveProps {
  onStartQuiz?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenStats?: () => void;
}

const STAGE_IMAGES: Record<number, string> = {
  1: '/assets/grove/tree_stage1.png',
  2: '/assets/grove/tree_stage2.png',
  3: '/assets/grove/tree_stage3.png',
  4: '/assets/grove/tree_stage4.png',
  5: '/assets/grove/tree_stage4_clean.png',
  6: '/assets/grove/tree_stage4_clean.png',
};

const STAGE_NAMES: Record<number, string> = {
  1: 'Семечко Познания',
  2: 'Зеленый Росток',
  3: 'Молодой Саженец',
  4: 'Крепкое Дерево',
  5: 'Вековой Дуб',
  6: 'Цветущее Древо Мудрости',
};

export default function ClassGrove({
  onStartQuiz,
  onOpenLeaderboard,
  onOpenStats,
}: ClassGroveProps) {
  const [grove, setGrove] = useState<GroveState | null>(null);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [acornsBalance, setAcornsBalance] = useState<number>(120);
  const [isReviving, setIsReviving] = useState(false);

  // Canvas particle engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CanvasParticleEngine | null>(null);

  // Load live Grove state from backend
  const fetchGroveData = async () => {
    try {
      const data = await groveApi.getGroveState('class_7a');
      setGrove(data);
    } catch (err) {
      console.error('Failed to fetch grove state:', err);
    }
  };

  useEffect(() => {
    fetchGroveData();
    // Poll every 12 seconds for background sync
    const interval = setInterval(fetchGroveData, 12000);
    return () => clearInterval(interval);
  }, []);

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

    const fireflyInterval = setInterval(() => {
      engine.spawnAmbientFirefly(canvas.width, canvas.height);
    }, 700);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearInterval(fireflyInterval);
      engine.destroy();
    };
  }, []);

  // Mascot Sprint click: speaks pedagogical advice
  const handleSprintClick = () => {
    haptics.impact('light');
    const advice = grove?.mascot_advice || 'Каждый ответ на викторине питает Рощу класса!';
    setBubbleMessage(advice);
    setTimeout(() => setBubbleMessage(null), 4000);
  };

  // Tree click: triggers sparkle particles and info
  const handleTreeClick = () => {
    haptics.selection();
    const canvas = canvasRef.current;
    if (canvas && engineRef.current) {
      engineRef.current.triggerExplosion(
        canvas.width * 0.55,
        canvas.height * 0.52,
        35,
        ['#FDE047', '#34D399', '#60A5FA', '#FFFFFF']
      );
    }
    const currentName = STAGE_NAMES[grove?.stage_level || 4];
    setBubbleMessage(`${currentName}. Очки класса: ${grove?.total_xp || 0}`);
    setTimeout(() => setBubbleMessage(null), 3000);
  };

  // Complete revival quest if hibernating
  const handleReviveGrove = async () => {
    if (isReviving) return;
    haptics.notification('success');
    setIsReviving(true);
    try {
      const res = await groveApi.completeRevival('class_7a');
      setBubbleMessage(res.mascot_speech);

      const canvas = canvasRef.current;
      if (canvas && engineRef.current) {
        engineRef.current.triggerExplosion(
          canvas.width * 0.5,
          canvas.height * 0.45,
          50,
          ['#FCD34D', '#F59E0B', '#34D399', '#FFFFFF', '#60A5FA']
        );
      }

      await fetchGroveData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsReviving(false);
      setTimeout(() => setBubbleMessage(null), 4000);
    }
  };

  const stageLevel = grove?.stage_level || 4;
  const stageName = STAGE_NAMES[stageLevel] || 'Крепкое Дерево';
  const totalXp = grove?.total_xp || 3500;
  const progressPct = grove?.stage_progress_pct || 65;
  const streakDays = grove?.streak_days || 1;
  const isHibernating = Boolean(grove?.is_hibernating);
  const liebig = grove?.liebig;

  return (
    <div style={styles.container}>
      {/* Background Ambience Canvas */}
      <canvas ref={canvasRef} style={styles.particleCanvas} />

      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.headerTitle}>Роща класса</h1>
          <span style={styles.stageTitleTag}>
            Стадия {stageLevel} из 6: {stageName}
          </span>
        </div>

        {/* Streak Pill */}
        <div style={styles.streakPill}>
          <Flame size={15} color="#FF7A00" fill="#FF7A00" />
          <span>{streakDays} дн</span>
        </div>
      </header>

      {/* Hibernation Alert Banner */}
      {isHibernating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.hibernationBanner}
        >
          <div style={styles.hibernationLeft}>
            <Moon size={18} color="#93C5FD" />
            <div>
              <div style={styles.hibernationTitle}>Роща в спячке</div>
              <div style={styles.hibernationSub}>
                Класс не играл больше 5 дней. Очки в безопасности
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleReviveGrove}
            disabled={isReviving}
            style={styles.reviveBtn}
          >
            <Zap size={14} color="#0F172A" />
            <span>Разбудить (+500 XP)</span>
          </motion.button>
        </motion.div>
      )}

      {/* Stage Progress Bar (Семечко -> Цветущее Древо) */}
      <div style={styles.stageProgressCard}>
        <div style={styles.stageRow}>
          <span style={styles.stageLabel}>Прогресс стадии</span>
          <span style={styles.stagePctText}>
            {progressPct}% ({totalXp} XP)
          </span>
        </div>
        <div style={styles.progressTrack}>
          <motion.div
            style={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          />
        </div>
      </div>

      {/* Liebig's Law Widget (Бочка Либиха) */}
      {liebig && (
        <div style={styles.liebigCard}>
          <div style={styles.liebigHeader}>
            <div style={styles.liebigTitleRow}>
              <Layers size={15} color="#34D399" />
              <span style={styles.liebigTitle}>Баланс ресурсов Либиха</span>
            </div>

            {liebig.is_balanced_bonus ? (
              <span style={styles.balancedBadge}>🌟 Идеальный биом x1.5</span>
            ) : (
              <span style={styles.unbalancedBadge}>
                Лимит: {liebig.limiting_resource === 'water' ? 'Вода' : liebig.limiting_resource === 'humus' ? 'Гумус' : 'Свет'}
              </span>
            )}
          </div>

          {/* Three resources bars: Water (40%), Humus (35%), Light (25%) */}
          <div style={styles.resourcesGrid}>
            <div style={styles.resourceCol}>
              <div style={styles.resLabelRow}>
                <Droplets size={12} color="#60A5FA" />
                <span style={styles.resName}>Вода (Tier 1)</span>
              </div>
              <div style={styles.miniTrack}>
                <div
                  style={{
                    ...styles.miniFill,
                    backgroundColor: '#3B82F6',
                    width: `${Math.min(100, (liebig.water_pct / 40) * 100)}%`,
                  }}
                />
              </div>
              <span style={styles.resPct}>{liebig.water_pct}% / 40%</span>
            </div>

            <div style={styles.resourceCol}>
              <div style={styles.resLabelRow}>
                <Layers size={12} color="#F59E0B" />
                <span style={styles.resName}>Гумус (Tier 2)</span>
              </div>
              <div style={styles.miniTrack}>
                <div
                  style={{
                    ...styles.miniFill,
                    backgroundColor: '#F59E0B',
                    width: `${Math.min(100, (liebig.humus_pct / 35) * 100)}%`,
                  }}
                />
              </div>
              <span style={styles.resPct}>{liebig.humus_pct}% / 35%</span>
            </div>

            <div style={styles.resourceCol}>
              <div style={styles.resLabelRow}>
                <Sun size={12} color="#FCD34D" />
                <span style={styles.resName}>Свет (Tier 3)</span>
              </div>
              <div style={styles.miniTrack}>
                <div
                  style={{
                    ...styles.miniFill,
                    backgroundColor: '#FCD34D',
                    width: `${Math.min(100, (liebig.light_pct / 25) * 100)}%`,
                  }}
                />
              </div>
              <span style={styles.resPct}>{liebig.light_pct}% / 25%</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Glade Scene with Tree & Authentic Wooden Hanging Signs */}
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

        {/* Central Growing Tree */}
        <motion.div
          key={stageLevel}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -3, 0] }}
          transition={{
            scale: { type: 'spring', stiffness: 300, damping: 22 },
            y: { repeat: Infinity, duration: 3.8, ease: 'easeInOut' },
          }}
          onClick={handleTreeClick}
          style={styles.centerTreeContainer}
          title={`${stageName} (нажми на древо)`}
        >
          <img
            src={STAGE_IMAGES[stageLevel] || STAGE_IMAGES[4]}
            alt={stageName}
            style={{
              ...styles.centerTreeImg,
              maxHeight: stageLevel === 1 ? 160 : stageLevel === 2 ? 200 : stageLevel === 3 ? 240 : 270,
              filter: isHibernating ? 'hue-rotate(180deg) saturate(0.6)' : 'none',
            }}
          />
        </motion.div>

        {/* Sprint Mascot on Bottom Left */}
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSprintClick}
          style={styles.sprintContainer}
          title="Спринт (нажми на лисенка)"
        >
          <img
            src="/assets/mascot/sprint_watering_clean.png"
            alt="Спринт"
            style={styles.sprintImg}
          />
          <div style={styles.sprintAdviceBadge}>
            <Sparkles size={11} color="#FFFFFF" />
            <span>Совет</span>
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

      {/* Quick Action Dock: Gacha Cards & Weekly Leaderboard */}
      <div style={styles.quickDockRow}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            haptics.selection();
            setIsCardsModalOpen(true);
          }}
          style={styles.dockButton}
        >
          <BookOpen size={16} color="#F59E0B" />
          <div style={styles.dockBtnText}>
            <span style={styles.dockBtnTitle}>Карточки Знаний</span>
            <span style={styles.dockBtnSub}>{acornsBalance} 🌰 баланс</span>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            haptics.selection();
            onOpenLeaderboard?.();
          }}
          style={styles.dockButton}
        >
          <Award size={16} color="#34D399" />
          <div style={styles.dockBtnText}>
            <span style={styles.dockBtnTitle}>Рейтинг недели</span>
            <span style={styles.dockBtnSub}>Дивизионы</span>
          </div>
        </motion.button>
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
            <span style={styles.pointsCardTitle}>Общие очки класса</span>
            <div style={styles.pointsValueRow}>
              <JuicyScoreCounter value={totalXp} size="lg" />
            </div>
            <span style={styles.pointsCardSubtitle}>
              {grove?.biome_status || 'Класс растет благодаря совместным ответам'}
            </span>
          </div>
        </div>

        <ChevronRight size={22} color="#9CA3AF" />
      </motion.div>

      {/* Ethical Cards Gacha Modal */}
      <KnowledgeCardsModal
        isOpen={isCardsModalOpen}
        onClose={() => setIsCardsModalOpen(false)}
        studentId="std_ivan"
        onAcornsChange={(bal) => setAcornsBalance(bal)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    padding: '10px 14px 86px',
    boxSizing: 'border-box',
    gap: 8,
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
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  stageTitleTag: {
    fontSize: 11.5,
    color: '#34D399',
    fontWeight: 700,
  },
  streakPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 999,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 800,
    color: '#FEF3C7',
  },
  hibernationBanner: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: '10px 14px',
    gap: 10,
  },
  hibernationLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  hibernationTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  hibernationSub: {
    fontSize: 10.5,
    color: '#BFDBFE',
  },
  reviveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FCD34D',
    border: 'none',
    borderRadius: 10,
    padding: '6px 10px',
    fontSize: 11.5,
    fontWeight: 800,
    color: '#0F172A',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  stageProgressCard: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: '8px 12px',
  },
  stageRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#94A3B8',
  },
  stagePctText: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FCD34D',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
  },
  liebigCard: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: '10px 12px',
  },
  liebigHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liebigTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  liebigTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  balancedBadge: {
    backgroundColor: '#064E3B',
    color: '#6EE7B7',
    fontSize: 10.5,
    fontWeight: 800,
    borderRadius: 999,
    padding: '2px 8px',
  },
  unbalancedBadge: {
    backgroundColor: '#78350F',
    color: '#FCD34D',
    fontSize: 10.5,
    fontWeight: 700,
    borderRadius: 999,
    padding: '2px 8px',
  },
  resourcesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  resourceCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  resLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  resName: {
    fontSize: 10,
    fontWeight: 700,
    color: '#CBD5E1',
  },
  miniTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 999,
  },
  resPct: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: 600,
  },
  gladeInteractiveScene: {
    position: 'relative',
    zIndex: 3,
    flex: 1,
    width: '100%',
    minHeight: 280,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTreeContainer: {
    position: 'absolute',
    bottom: 12,
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
  },
  woodenSignTopLeft: {
    position: 'absolute',
    top: 6,
    left: 4,
    width: 100,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transformOrigin: 'top center',
    zIndex: 4,
  },
  woodenSignTopRight: {
    position: 'absolute',
    top: 10,
    right: 4,
    width: 100,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transformOrigin: 'top center',
    zIndex: 4,
  },
  signPlankImg: {
    width: '100%',
    height: 'auto',
    display: 'block',
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
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carvedSignText: {
    fontSize: 12,
    fontWeight: 900,
    color: '#451A03',
  },
  sprintContainer: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 110,
    cursor: 'pointer',
    touchAction: 'manipulation',
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sprintImg: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  },
  sprintAdviceBadge: {
    marginTop: -8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  floatingBubble: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    right: '12%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.35,
    zIndex: 6,
    pointerEvents: 'none',
  },
  quickDockRow: {
    position: 'relative',
    zIndex: 5,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  dockButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    border: 'none',
    borderRadius: 14,
    padding: '10px 12px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    textAlign: 'left',
  },
  dockBtnText: {
    display: 'flex',
    flexDirection: 'column',
  },
  dockBtnTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  dockBtnSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: 600,
  },
  pointsCard: {
    position: 'relative',
    zIndex: 5,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  pointsCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  leafIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#064E3B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsTextColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  pointsCardTitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: 700,
  },
  pointsValueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  pointsCardSubtitle: {
    fontSize: 10.5,
    color: '#34D399',
    fontWeight: 600,
  },
};
