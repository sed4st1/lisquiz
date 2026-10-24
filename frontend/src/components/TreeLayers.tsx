import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TreeStage = 1 | 2 | 3 | 4 | 5 | 6;

export interface TreeLayersProps {
  stage: TreeStage;
  health?: number;
  isWatering?: boolean;
  onClick?: () => void;
}

const STAGE_IMAGES: Record<TreeStage, string> = {
  1: '/assets/grove/tree_perfect_stage1.png',
  2: '/assets/grove/tree_perfect_stage1.png',
  3: '/assets/grove/tree_perfect_stage2.png',
  4: '/assets/grove/tree_perfect_stage3.png',
  5: '/assets/grove/tree_perfect_stage4.png',
  6: '/assets/grove/tree_perfect_stage4.png',
};

export const STAGE_CONFIGS: Record<
  TreeStage,
  { maxHeight: number; shadowWidth: number; shadowHeight: number; scaleMod: number; title: string }
> = {
  1: { maxHeight: 180, shadowWidth: 170, shadowHeight: 28, scaleMod: 0.85, title: 'Семечко Познания' },
  2: { maxHeight: 220, shadowWidth: 200, shadowHeight: 32, scaleMod: 1.02, title: 'Зелёный Росток' },
  3: { maxHeight: 275, shadowWidth: 230, shadowHeight: 36, scaleMod: 1.0, title: 'Молодой Саженец' },
  4: { maxHeight: 335, shadowWidth: 270, shadowHeight: 42, scaleMod: 1.0, title: 'Крепкое Дерево' },
  5: { maxHeight: 390, shadowWidth: 310, shadowHeight: 48, scaleMod: 1.0, title: 'Вековой Дуб' },
  6: { maxHeight: 415, shadowWidth: 330, shadowHeight: 52, scaleMod: 1.0, title: 'Цветущее Древо Мудрости' },
};

export const TreeLayers: React.FC<TreeLayersProps> = ({
  stage,
  health = 100,
  isWatering = false,
  onClick,
}) => {
  const config = STAGE_CONFIGS[stage] ?? STAGE_CONFIGS[3];
  const isThirsty = health < 60;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      {/* Grounding Contact Shadow underneath the moss mound */}
      <motion.div
        animate={isWatering ? { scale: [1, 1.15, 1], opacity: [0.65, 0.9, 0.65] } : {}}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: -8,
          width: config.shadowWidth,
          height: config.shadowHeight,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(10, 26, 6, 0.8) 0%, rgba(10, 26, 6, 0.4) 50%, transparent 80%)',
          filter: 'blur(3px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main Tree Sprite: Roots firmly anchored at bottom, canopy gently sways */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ scaleY: 0.88, scaleX: 0.92, opacity: 0 }}
          animate={{
            scaleY: config.scaleMod,
            scaleX: config.scaleMod,
            opacity: 1,
            rotate: stage >= 3 ? [-0.5, 0.5, -0.5] : 0,
          }}
          exit={{ scaleY: 0.92, scaleX: 0.96, opacity: 0 }}
          transition={{
            scaleY: { type: 'spring', stiffness: 280, damping: 22 },
            scaleX: { type: 'spring', stiffness: 280, damping: 22 },
            opacity: { duration: 0.25 },
            rotate: { repeat: Infinity, duration: 5.6, ease: 'easeInOut' },
          }}
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            transformOrigin: '50% 95%', // Roots firmly anchored into the earth
          }}
        >
          <motion.img
            src={STAGE_IMAGES[stage]}
            alt={`Древо Знаний — ${config.title}`}
            animate={
              stage >= 5
                ? {
                    filter: [
                      'drop-shadow(0 10px 22px rgba(0, 0, 0, 0.4)) brightness(1)',
                      'drop-shadow(0 12px 28px rgba(245, 158, 11, 0.35)) brightness(1.04)',
                      'drop-shadow(0 10px 22px rgba(0, 0, 0, 0.4)) brightness(1)',
                    ],
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 4.2,
              ease: 'easeInOut',
            }}
            style={{
              maxHeight: config.maxHeight,
              width: 'auto',
              display: 'block',
              objectFit: 'contain',
              filter: isWatering
                ? 'drop-shadow(0 0 26px rgba(52, 211, 153, 0.95)) brightness(1.12)'
                : isThirsty
                ? 'grayscale(0.35) brightness(0.9) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))'
                : 'drop-shadow(0 10px 22px rgba(0, 0, 0, 0.4))',
              transition: 'filter 0.5s ease',
            }}
            draggable={false}
          />

          {/* Stage 1: Glowing Golden Core in the Acorn */}
          {stage === 1 && (
            <motion.div
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: [0.95, 1.1, 0.95],
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                bottom: '30%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(253, 224, 71, 0.8) 0%, transparent 70%)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}

          {/* Stage 5 & 6: Pulsing Mystical Golden Rune Aura in Ancient Oak Hollow */}
          {stage >= 5 && (
            <motion.div
              animate={{
                opacity: [0.65, 0.95, 0.65],
                scale: [0.98, 1.04, 0.98],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.8,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                top: '61%',
                left: '53.5%',
                transform: 'translate(-50%, -50%)',
                width: 76,
                height: 98,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 50% 50%, rgba(253, 224, 71, 0.7) 0%, rgba(245, 158, 11, 0.4) 45%, transparent 75%)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}

          {/* Stage 6: Crown of Blossoms & Celestial Starlight */}
          {stage === 6 && (
            <motion.div
              animate={{
                opacity: [0.7, 1, 0.7],
                rotate: [0, 360],
              }}
              transition={{
                opacity: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
                rotate: { repeat: Infinity, duration: 28, ease: 'linear' },
              }}
              style={{
                position: 'absolute',
                top: '18%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 190,
                height: 190,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(52, 211, 153, 0.15) 50%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
