import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ClassGroveTreeProps {
  stage?: number; // 0: Acorn, 1: Sprout, 2: Sapling, 3: Young Tree, 4: Oak, 5: Sacred Rune Oak
  health?: number; // 0..100
  isWatering?: boolean;
  onTap?: () => void;
  width?: number | string;
}

export const STAGE_NAMES = [
  'Семечко Познания',
  'Зелёный Росток',
  'Молодой Саженец',
  'Пышный Дуб',
  'Древо Мудрости',
  'Цветущее Древо Мудрости',
];

export const STAGE_CONFIGS: Record<
  number,
  {
    name: string;
    src: string;
    aspectRatio: string;
    maxWidth: number;
    runePosition?: { top: string; left: string };
  }
> = {
  0: {
    name: 'Семечко Познания',
    src: '/assets/grove/tree_stage_1.png',
    aspectRatio: '400 / 344',
    maxWidth: 250,
  },
  1: {
    name: 'Зелёный Росток',
    src: '/assets/grove/tree_stage_2.png',
    aspectRatio: '380 / 344',
    maxWidth: 250,
  },
  2: {
    name: 'Молодой Саженец',
    src: '/assets/grove/tree_stage_3.png',
    aspectRatio: '400 / 363',
    maxWidth: 270,
  },
  3: {
    name: 'Пышный Дуб',
    src: '/assets/grove/tree_stage_4.png',
    aspectRatio: '460 / 480',
    maxWidth: 345,
  },
  4: {
    name: 'Древо Мудрости',
    src: '/assets/grove/tree_stage_5.png',
    aspectRatio: '480 / 490',
    maxWidth: 360,
    runePosition: { top: '65.2%', left: '50.2%' },
  },
  5: {
    name: 'Цветущее Древо Мудрости',
    src: '/assets/grove/tree_stage_6.png',
    aspectRatio: '550 / 520',
    maxWidth: 385,
    runePosition: { top: '65.2%', left: '50.2%' },
  },
};

export const ClassGroveTree: React.FC<ClassGroveTreeProps> = ({
  stage = 4,
  health: _health = 100,
  isWatering = false,
  onTap,
  width = '100%',
}) => {
  // Clamp stage to 0..5
  const activeStage = Math.max(0, Math.min(5, stage));
  const cfg = STAGE_CONFIGS[activeStage] ?? STAGE_CONFIGS[4]!;

  return (
    <div
      onClick={onTap}
      style={{
        position: 'relative',
        width,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
      title="Нажмите, чтобы посмотреть все стадии Древа"
    >
      {/* Grounding Contact Shadow underneath the roots */}
      <motion.div
        animate={isWatering ? { scale: [1, 1.15, 1], opacity: [0.65, 0.9, 0.65] } : {}}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: activeStage === 0 ? -2 : -6,
          width: activeStage >= 4 ? 260 : activeStage >= 2 ? 200 : 150,
          height: activeStage >= 4 ? 32 : 22,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(20, 40, 10, 0.75) 0%, rgba(20, 40, 10, 0.3) 50%, transparent 80%)',
          filter: 'blur(3px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main Tree Visuals */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`stage-${activeStage}`}
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: cfg.maxWidth,
            aspectRatio: cfg.aspectRatio,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          {/* Natural Tree Sprite (Roots grounded naturally, no artificial tilted mound) */}
          <motion.img
            src={cfg.src}
            alt={cfg.name}
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              pointerEvents: 'none',
              transformOrigin: '50% 90%',
            }}
            animate={{
              rotate: [0, 0.45, -0.45, 0],
              scale: [1, 1.012, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 6.8,
              ease: 'easeInOut',
            }}
          />

          {/* Golden Pulse for the Acorn of Knowledge (Stage 0) */}
          {activeStage === 0 && (
            <motion.div
              style={{
                position: 'absolute',
                top: '56%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 230, 100, 0.85) 0%, rgba(255, 180, 40, 0.35) 50%, transparent 75%)',
                filter: 'blur(4px)',
                pointerEvents: 'none',
                zIndex: 4,
              }}
              animate={{
                opacity: [0.55, 1, 0.55],
                scale: [0.92, 1.15, 0.92],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Glowing Golden Spiral Rune on Trunk (Stage 4 & 5) */}
          {cfg.runePosition && (
            <motion.div
              style={{
                position: 'absolute',
                top: cfg.runePosition.top,
                left: cfg.runePosition.left,
                transform: 'translate(-50%, -50%)',
                width: 44,
                height: 52,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 225, 110, 0.9) 0%, rgba(255, 180, 40, 0.45) 45%, transparent 75%)',
                filter: 'blur(3px)',
                pointerEvents: 'none',
                zIndex: 6,
              }}
              animate={{
                opacity: [0.65, 1, 0.65],
                scale: [0.95, 1.18, 0.95],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.8,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Floating magical leaf & sparkle particles for mature tree (Stage 4 & 5) */}
          {activeStage >= 4 && (
            <>
              <motion.div
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '32%',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 230, 130, 0.75)',
                  filter: 'blur(1px)',
                  pointerEvents: 'none',
                  zIndex: 8,
                }}
                animate={{
                  y: [-4, 18, -4],
                  x: [-3, 8, -3],
                  opacity: [0.2, 0.85, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3.6,
                  ease: 'easeInOut',
                }}
              />

              <motion.div
                style={{
                  position: 'absolute',
                  top: '32%',
                  right: '30%',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(160, 235, 120, 0.75)',
                  filter: 'blur(1px)',
                  pointerEvents: 'none',
                  zIndex: 8,
                }}
                animate={{
                  y: [2, -16, 2],
                  x: [3, -6, 3],
                  opacity: [0.3, 0.9, 0.3],
                  scale: [0.7, 1.1, 0.7],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4.2,
                  delay: 1.2,
                  ease: 'easeInOut',
                }}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Watering splash effect */}
      <AnimatePresence>
        {isWatering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1.15, y: -20 }}
            exit={{ opacity: 0, scale: 1.3, y: -40 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 28 }}>💧</span>
            <span
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 900,
                fontSize: 22,
                color: '#38BDF8',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              +50 Росы!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClassGroveTree;
