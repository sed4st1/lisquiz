import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { shadows } from '../theme/tokens';
import { CanvasParticleEngine } from '../services/particles';
import { haptics } from '../services/haptics';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';
import { TactileButton } from '../components/TactileButton';

export type TreeStage = 1 | 2 | 3 | 4;

interface StageInfo {
  stage: TreeStage;
  title: string;
  image: string;
  description: string;
  acornsRequired: number;
  level: number;
}

const STAGES: Record<TreeStage, StageInfo> = {
  1: {
    stage: 1,
    title: 'Росток из золотого жёлудя',
    image: '/assets/grove/tree_stage_1.png',
    description: 'Первые ростки знаний пробились сквозь мох священной рощи!',
    acornsRequired: 6,
    level: 1,
  },
  2: {
    stage: 2,
    title: 'Молодой дубок познания',
    image: '/assets/grove/tree_stage_2.png',
    description: 'Крепкие изумрудные ветви тянутся к лучам школьных открытий.',
    acornsRequired: 6,
    level: 2,
  },
  3: {
    stage: 3,
    title: 'Солнечный дуб класса',
    image: '/assets/grove/tree_stage_3.png',
    description: 'Широкая густая крона дарит мудрость и силу всей параллели.',
    acornsRequired: 6,
    level: 3,
  },
  4: {
    stage: 4,
    title: 'Вековое древо святилища',
    image: '/assets/grove/tree_stage_4.png',
    description: 'Древний хранитель школьных тайн, украшенный светящимися рунами!',
    acornsRequired: 6,
    level: 4,
  },
};

interface ClassGroveProps {
  classNameTitle?: string;
  onBack?: () => void;
}

export default function ClassGrove({
  classNameTitle = '5А класс',
  onBack,
}: ClassGroveProps) {
  const [currentStage, setCurrentStage] = useState<TreeStage>(3);
  const [points, setPoints] = useState(2450);
  const [acornsCollected, setAcornsCollected] = useState(4);
  const [isChestOpen, setIsChestOpen] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  // Canvas Particle Engine ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleEngineRef = useRef<CanvasParticleEngine | null>(null);

  // Initialize Canvas particles (golden fireflies)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    const updateSize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 380;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const engine = new CanvasParticleEngine(canvas);
    particleEngineRef.current = engine;

    // Spawn ambient golden fireflies every 700ms
    const fireflyInterval = setInterval(() => {
      engine.spawnAmbientFirefly(canvas.width, canvas.height);
    }, 600);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearInterval(fireflyInterval);
      engine.destroy();
    };
  }, []);

  // Handle chest interaction
  const handleChestClick = () => {
    if (isChestOpen) {
      setShowRewardModal(true);
      return;
    }

    haptics.chestOpen();
    setIsChestOpen(true);
    setPoints((prev) => prev + 500);
    setAcornsCollected((c) => Math.min(6, c + 1));

    // Fire fireworks explosion from chest location
    const canvas = canvasRef.current;
    if (canvas && particleEngineRef.current) {
      particleEngineRef.current.triggerExplosion(
        canvas.width * 0.8,
        canvas.height * 0.72,
        45,
        ['#FFD700', '#10B981', '#FF7A00', '#FFFFFF', '#6EE7B7']
      );
    }

    setShowRewardModal(true);
  };

  // Change stage
  const handleStageSelect = (stage: TreeStage) => {
    haptics.selection();
    setCurrentStage(stage);
  };

  const currentInfo = STAGES[currentStage];

  return (
    <div style={styles.container}>
      {/* Background Ambience Canvas for Fireflies */}
      <canvas ref={canvasRef} style={styles.particleCanvas} />

      {/* Top Header / School & Class HUD */}
      <header style={styles.hudHeader}>
        <div style={styles.classTitleGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
                title="Назад"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div style={styles.grovePill}>
              <Sparkles size={13} color="#10B981" />
              <span>Священная роща Лисквиз</span>
            </div>
          </div>
          <h1 style={styles.classNameText}>{classNameTitle}</h1>
        </div>

        {/* Currency & Streaks Badges */}
        <div style={styles.statsHudRow}>
          {/* XP Crystals */}
          <div style={styles.hudPill}>
            <img src="/assets/icons/crystal.png" alt="Кристалл" style={styles.hudIcon} />
            <JuicyScoreCounter value={points} />
          </div>

          {/* Flame Streak */}
          <div style={styles.hudPill}>
            <img src="/assets/icons/flame.png" alt="Серия" style={styles.hudIcon} />
            <span style={{ fontWeight: 800, color: '#FF7A00', fontSize: 15 }}>5 дн.</span>
          </div>

          {/* Trophy rank */}
          <div style={styles.hudPill}>
            <img src="/assets/icons/trophy.png" alt="Рейтинг" style={styles.hudIcon} />
            <span style={{ fontWeight: 800, color: '#FCD34D', fontSize: 14 }}>#1</span>
          </div>
        </div>
      </header>

      {/* Stage Evolution Switcher Pills */}
      <div style={styles.stageTabsWrapper}>
        {([1, 2, 3, 4] as TreeStage[]).map((stg) => {
          const isActive = currentStage === stg;
          return (
            <button
              key={stg}
              onClick={() => handleStageSelect(stg)}
              style={{
                ...styles.stageTabBtn,
                backgroundColor: isActive ? '#FF7A00' : 'rgba(255, 255, 255, 0.08)',
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                borderColor: isActive ? '#FF7A00' : 'rgba(255, 255, 255, 0.12)',
              }}
            >
              Ур. {stg}
            </button>
          );
        })}
      </div>

      {/* Central Sacred Tree Section */}
      <div style={styles.treeStageArea}>
        {/* Soft magical backdrop glow */}
        <div style={styles.treeAuraGlow} />

        {/* Animated Evolutionary Tree Sprite */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -15 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            style={styles.treeContainer}
          >
            {/* Gentle breathing animation */}
            <motion.img
              src={currentInfo.image}
              alt={currentInfo.title}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut' }}
              style={styles.treeImage}
            />
          </motion.div>
        </AnimatePresence>

        {/* Interactive Treasure Chest on the Ground */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleChestClick}
          style={styles.chestWrapper}
        >
          <motion.img
            src="/assets/icons/chest.png"
            alt="Сундук сокровищ"
            animate={
              isChestOpen
                ? { filter: 'drop-shadow(0 0 16px #10B981)' }
                : { y: [0, -4, 0], filter: 'drop-shadow(0 0 12px #FFD700)' }
            }
            transition={
              isChestOpen
                ? {}
                : { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
            }
            style={styles.chestImage}
          />
          <div style={styles.chestBadge}>
            {isChestOpen ? 'Открыт ✓' : 'Сундук недели!'}
          </div>
        </motion.div>
      </div>

      {/* Tree Info & Description */}
      <div style={styles.treeInfoCard}>
        <div style={styles.treeTitleRow}>
          <span style={styles.treeTitle}>{currentInfo.title}</span>
          <span style={styles.levelBadge}>Уровень {currentInfo.level}</span>
        </div>
        <p style={styles.treeDesc}>{currentInfo.description}</p>

        {/* 6-Acorn Evolutionary Progress Bar */}
        <div style={styles.acornProgressSection}>
          <div style={styles.acornProgressHeader}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F3F4F6' }}>
              Прогресс эволюции ({acornsCollected}/6 желудей)
            </span>
            <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>
              {Math.round((acornsCollected / 6) * 100)}%
            </span>
          </div>

          {/* Acorn Slots Row */}
          <div style={styles.acornsRow}>
            {[1, 2, 3, 4, 5, 6].map((idx) => {
              const isFilled = idx <= acornsCollected;
              return (
                <div key={idx} style={styles.acornSlotWrapper}>
                  {/* Base wooden socket */}
                  <img
                    src="/assets/icons/acorn_slot.png"
                    alt="Гнездо"
                    style={styles.acornSlotBase}
                  />
                  {/* Glowing golden acorn pop-in */}
                  {isFilled && (
                    <motion.img
                      src="/assets/icons/acorn.png"
                      alt="Золотой жёлудь"
                      initial={{ scale: 0, opacity: 0, rotate: -25 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 18,
                        delay: idx * 0.08,
                      }}
                      style={styles.acornItem}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.acornTipText}>
            💡 Еще <strong>2 победы в викторинах</strong> на этой неделе, и Дерево эволюционирует!
          </div>
        </div>
      </div>

      {/* Active Classmates Watering Tree */}
      <div style={styles.classmatesSection}>
        <div style={styles.sectionTitleRow}>
          <span style={styles.sectionTitle}>Одноклассники в роще:</span>
          <span style={styles.onlineBadge}>● 5 онлайн</span>
        </div>
        <div style={styles.classmatesAvatarsRow}>
          {[
            { name: 'Маша', avatar: '/assets/avatars/students/bunny.png' },
            { name: 'Артём', avatar: '/assets/avatars/students/hedgehog.png' },
            { name: 'Соня', avatar: '/assets/avatars/students/owl.png' },
            { name: 'Дима', avatar: '/assets/avatars/students/bear.png' },
            { name: 'Алиса', avatar: '/assets/avatars/students/squirrel.png' },
          ].map((mate, i) => (
            <div key={i} style={styles.mateAvatarCard}>
              <img src={mate.avatar} alt={mate.name} style={styles.mateAvatarImg} />
              <span style={styles.mateName}>{mate.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mascot Sprint Tip Bubble */}
      <div style={styles.sprintTipCard}>
        <img
          src="/assets/mascot/celebrate.png"
          alt="Спринт"
          style={styles.sprintImg}
        />
        <div style={styles.sprintTipContent}>
          <div style={styles.sprintTipTitle}>Спринт в восторге! 🦊</div>
          <div style={styles.sprintTipText}>
            Ваш класс опережает 5Б на <strong>350 очков</strong>. Держите серию ответов, чтобы открыть сундук мудрости!
          </div>
        </div>
        <ChevronRight size={20} color="#9CA3AF" />
      </div>

      {/* Chest Reward Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setShowRewardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              style={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowRewardModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#9CA3AF" />
              </button>

              <img
                src="/assets/icons/chest.png"
                alt="Сундук открыт"
                style={{ width: 88, height: 88, marginBottom: 12 }}
              />

              <h2 style={styles.modalTitle}>Сундук недели открыт! 🎉</h2>
              <p style={styles.modalSubtitle}>
                Весь 5А класс получает сокровища за отличные результаты в викторинах:
              </p>

              <div style={styles.rewardBadgesRow}>
                <div style={styles.rewardItem}>
                  <img src="/assets/icons/crystal.png" alt="Кристаллы" style={{ width: 28, height: 28 }} />
                  <span style={{ fontWeight: 800, color: '#10B981' }}>+500 💎</span>
                </div>
                <div style={styles.rewardItem}>
                  <img src="/assets/icons/acorn.png" alt="Жёлудь" style={{ width: 28, height: 28 }} />
                  <span style={{ fontWeight: 800, color: '#F59E0B' }}>+1 🌰</span>
                </div>
              </div>

              <TactileButton
                theme="green"
                size="md"
                fullWidth
                onClick={() => setShowRewardModal(false)}
              >
                Отлично! Забрать в рощу
              </TactileButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    gap: 16,
    padding: '12px 14px 28px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  particleCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1,
  },
  hudHeader: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    backgroundColor: 'rgba(22, 32, 53, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: '12px 14px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  classTitleGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grovePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    color: '#10B981',
    fontWeight: 700,
  },
  classNameText: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: '#FFFFFF',
    letterSpacing: '-0.3px',
  },
  statsHudRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  hudPill: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(13, 20, 36, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '6px 8px',
  },
  hudIcon: {
    width: 20,
    height: 20,
    objectFit: 'contain',
  },
  stageTabsWrapper: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
  },
  stageTabBtn: {
    padding: '6px 14px',
    borderRadius: 999,
    border: '1px solid',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transition: 'all 0.15s ease',
  },
  treeStageArea: {
    position: 'relative',
    zIndex: 2,
    minHeight: 280,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '10px 0 4px',
  },
  treeAuraGlow: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 240,
    height: 240,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(255, 215, 0, 0.12) 40%, transparent 70%)',
    pointerEvents: 'none',
  },
  treeContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 290,
    height: 280,
  },
  treeImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 14px 20px rgba(0, 0, 0, 0.45))',
  },
  chestWrapper: {
    position: 'absolute',
    bottom: -6,
    right: 14,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  chestImage: {
    width: 68,
    height: 68,
    objectFit: 'contain',
  },
  chestBadge: {
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: 999,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
    marginTop: -4,
  },
  treeInfoCard: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: 'rgba(22, 32, 53, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: '16px',
    boxShadow: shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  treeTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  treeTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  levelBadge: {
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    padding: '2px 8px',
    borderRadius: 999,
  },
  treeDesc: {
    margin: 0,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 1.4,
  },
  acornProgressSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  acornProgressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acornsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  acornSlotWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acornSlotBase: {
    position: 'absolute',
    width: 38,
    height: 38,
    objectFit: 'contain',
    opacity: 0.85,
  },
  acornItem: {
    position: 'absolute',
    width: 34,
    height: 34,
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 6px rgba(245, 158, 11, 0.8))',
  },
  acornTipText: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '8px 12px',
    borderRadius: 12,
  },
  classmatesSection: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: 'rgba(22, 32, 53, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#9CA3AF',
  },
  onlineBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#10B981',
  },
  classmatesAvatarsRow: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  mateAvatarCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  mateAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1.5px solid rgba(16, 185, 129, 0.4)',
    objectFit: 'contain',
  },
  mateName: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: 600,
  },
  sprintTipCard: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
    border: '1px solid rgba(255, 122, 0, 0.3)',
    borderRadius: 18,
    padding: '12px 14px',
  },
  sprintImg: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  sprintTipContent: {
    flex: 1,
  },
  sprintTipTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FF7A00',
    marginBottom: 2,
  },
  sprintTipText: {
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 1.35,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  modalCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#162035',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  modalSubtitle: {
    margin: '0 0 16px',
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 1.4,
  },
  rewardBadgesRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
  },
  rewardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: '8px 14px',
  },
};
