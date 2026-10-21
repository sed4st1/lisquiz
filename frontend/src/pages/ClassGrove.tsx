import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, Home, Award, BarChart3 } from 'lucide-react';
import { haptics } from '../services/haptics';
import { CanvasParticleEngine } from '../services/particles';
import { JuicyScoreCounter } from '../components/JuicyScoreCounter';

interface ClassGroveProps {
  onBack?: () => void;
  onStartQuiz?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenStats?: () => void;
}

export default function ClassGrove({
  onBack,
  onStartQuiz,
  onOpenLeaderboard,
  onOpenStats,
}: ClassGroveProps) {
  const [points, setPoints] = useState<number>(2840);
  const [acornsFilled, setAcornsFilled] = useState<number>(4);
  const [activeTab, setActiveTab] = useState<'home' | 'grove' | 'leaderboard' | 'stats'>('grove');
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);

  // Canvas particle engine for sunlight pollen & fireflies
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
    setPoints((prev) => prev + 50);
    setBubbleMessage('Дерево напиталось влагой! +50 очков 💧');

    const canvas = canvasRef.current;
    if (canvas && engineRef.current) {
      engineRef.current.triggerExplosion(
        canvas.width * 0.38,
        canvas.height * 0.65,
        30,
        ['#60A5FA', '#34D399', '#FFD700', '#FFFFFF']
      );
    }

    setTimeout(() => setBubbleMessage(null), 3000);
  };

  // Click sprint speech
  const handleSprintClick = () => {
    haptics.impact('light');
    setBubbleMessage('Я поливаю Дерево Знаний каждый день! 🦊💚');
    setTimeout(() => setBubbleMessage(null), 3500);
  };

  return (
    <div style={styles.container}>
      {/* Background Ambience Canvas for Sun Pollen */}
      <canvas ref={canvasRef} style={styles.particleCanvas} />

      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={onBack}
            style={styles.backBtn}
            title="Назад"
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </button>

          <div style={styles.logoBadge}>
            <span style={{ fontSize: 16 }}>🌱</span>
          </div>

          <div style={styles.headerTitles}>
            <span style={styles.brandTitle}>Роща класса</span>
            <span style={styles.brandSub}>Вместе мы растём!</span>
          </div>
        </div>

        <div style={styles.playerCountPill}>
          <Users size={14} color="#9CA3AF" />
          <span>28 / 30</span>
        </div>
      </header>

      {/* 6-Acorns Progress Capsule Bar */}
      <div style={styles.acornCapsuleBar}>
        <div style={styles.acornsRow}>
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const isFilled = num <= acornsFilled;
            return (
              <motion.div
                key={num}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  haptics.selection();
                  setAcornsFilled(num);
                }}
                style={styles.acornItemWrapper}
              >
                {isFilled ? (
                  <span style={styles.acornGlowIcon}>🌰</span>
                ) : (
                  <span style={styles.acornEmptyIcon}>🌰</span>
                )}
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
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </div>
      </div>

      {/* Center Interactive Glade Layer (Hanging wooden signs and clickable fox) */}
      <div style={styles.gladeInteractiveLayer}>
        {/* Sign: 30 sec (Blitz quiz) */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            haptics.impact('medium');
            onStartQuiz?.();
          }}
          style={styles.signTopLeft}
          title="Быстрый блиц на 30 секунд"
        >
          <div style={styles.signHitbox}>
            <span style={styles.signLabel}>⏱ 30 sec</span>
          </div>
        </motion.div>

        {/* Sign: 1 touch (Water the tree) */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleWaterTree}
          style={styles.signBottomLeft}
          title="Полить Дерево Знаний (+50 очков)"
        >
          <div style={styles.signHitbox}>
            <span style={styles.signLabel}>👆 1 touch</span>
          </div>
        </motion.div>

        {/* Sign: 5 min (Lesson Quiz) */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            haptics.impact('medium');
            onStartQuiz?.();
          }}
          style={styles.signRight}
          title="Тест урока на 5 минут"
        >
          <div style={styles.signHitbox}>
            <span style={styles.signLabel}>🕒 5 min</span>
          </div>
        </motion.div>

        {/* Fox Sprint Clickable Area */}
        <div
          onClick={handleSprintClick}
          style={styles.foxHitbox}
          title="Погладить Спринта"
        />

        {/* Dynamic Speech Bubble */}
        <AnimatePresence>
          {bubbleMessage && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 10 }}
              style={styles.floatingBubble}
            >
              {bubbleMessage}
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
            <span style={{ fontSize: 20 }}>🌱</span>
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

      {/* Bottom Navigation Dock */}
      <nav style={styles.bottomNavDock}>
        <button
          onClick={() => {
            haptics.selection();
            setActiveTab('home');
            onBack?.();
          }}
          style={{
            ...styles.navTabBtn,
            color: activeTab === 'home' ? '#34D399' : '#9CA3AF',
          }}
        >
          <Home size={18} />
          <span>Домой</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setActiveTab('grove');
          }}
          style={styles.navTabBtnActive}
        >
          <div style={styles.activePillGlow}>
            <span style={{ fontSize: 18 }}>🌱</span>
          </div>
          <span style={{ color: '#34D399', fontWeight: 800 }}>Роща</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setActiveTab('leaderboard');
            onOpenLeaderboard?.();
          }}
          style={{
            ...styles.navTabBtn,
            color: activeTab === 'leaderboard' ? '#34D399' : '#9CA3AF',
          }}
        >
          <Award size={18} />
          <span>Рейтинг</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setActiveTab('stats');
            onOpenStats?.();
          }}
          style={{
            ...styles.navTabBtn,
            color: activeTab === 'stats' ? '#34D399' : '#9CA3AF',
          }}
        >
          <BarChart3 size={18} />
          <span>Статистика</span>
        </button>
      </nav>
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
    background: "url('/assets/backgrounds/grove_fairytale.png') center top / cover no-repeat",
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
    zIndex: 4,
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
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    border: '1px solid rgba(16, 185, 129, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.1,
  },
  brandSub: {
    fontSize: 10,
    color: '#D1D5DB',
    fontWeight: 600,
  },
  playerCountPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  acornCapsuleBar: {
    position: 'relative',
    zIndex: 4,
    backgroundColor: 'rgba(14, 25, 45, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 22,
    padding: '6px 14px 8px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  acornsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 8px',
  },
  acornItemWrapper: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  acornGlowIcon: {
    fontSize: 20,
    filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))',
  },
  acornEmptyIcon: {
    fontSize: 20,
    opacity: 0.3,
    filter: 'grayscale(100%) brightness(0.5)',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981',
    borderRadius: 999,
  },
  gladeInteractiveLayer: {
    position: 'relative',
    flex: 1,
    minHeight: 280,
    zIndex: 3,
  },
  signTopLeft: {
    position: 'absolute',
    top: '12%',
    left: '2%',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  signBottomLeft: {
    position: 'absolute',
    top: '34%',
    left: '2%',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  signRight: {
    position: 'absolute',
    top: '30%',
    right: '2%',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  signHitbox: {
    backgroundColor: 'rgba(167, 105, 43, 0.85)',
    border: '2px solid rgba(255, 215, 0, 0.4)',
    borderRadius: 14,
    padding: '6px 12px',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
  },
  signLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FFF7ED',
    letterSpacing: '0.02em',
  },
  foxHitbox: {
    position: 'absolute',
    bottom: '6%',
    left: '8%',
    width: 140,
    height: 140,
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  floatingBubble: {
    position: 'absolute',
    bottom: '38%',
    left: '12%',
    backgroundColor: 'rgba(13, 20, 36, 0.94)',
    border: '1.5px solid #10B981',
    borderRadius: 16,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 800,
    color: '#FFFFFF',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.4)',
    zIndex: 10,
    maxWidth: 220,
    textAlign: 'center',
  },
  pointsCard: {
    position: 'relative',
    zIndex: 4,
    backgroundColor: 'rgba(14, 25, 45, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 22,
    padding: '12px 16px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    marginBottom: 8,
  },
  pointsCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  leafIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    border: '1.5px solid rgba(16, 185, 129, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsTextColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  pointsCardTitle: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: 600,
  },
  pointsValueRow: {
    display: 'flex',
    alignItems: 'center',
  },
  pointsCardSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  bottomNavDock: {
    position: 'relative',
    zIndex: 4,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 18, 34, 0.92)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: '6px 12px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
  },
  navTabBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 600,
    padding: '4px 8px',
  },
  navTabBtnActive: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10,
    padding: '2px 8px',
  },
  activePillGlow: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    border: '1.5px solid #10B981',
    boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
