import React from 'react';
import { motion } from 'framer-motion';

interface SprintLobbyRigProps {
  width?: number | string;
  className?: string;
  interactive?: boolean;
}

/**
 * SprintLobbyRig
 * Puppet-rigged Sprint (the fox mascot) sitting cozily on a tree stump with an acorn mug.
 * Features:
 * - Alternating dangling/kicking feet ("болтает ножками")
 * - Expressive head bobbing and tilting side to side ("покачивает головой")
 * - Fluffy tail swaying gently
 * - Gentle breathing / cup steam rising
 */
export const SprintLobbyRig: React.FC<SprintLobbyRigProps> = ({
  width = 180,
  className = '',
  interactive = true,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width,
        aspectRatio: '370 / 340',
        userSelect: 'none',
        pointerEvents: interactive ? 'auto' : 'none',
        flexShrink: 0,
      }}
      className={className}
    >
      {/* 1. Tail Layer (Behind body, resting on moss, swaying gently) */}
      <motion.img
        src="/assets/lobby/sprint_stump_tail.png"
        alt="Sprint Tail"
        style={{
          position: 'absolute',
          left: '4.59%',
          top: '55.88%',
          width: '41.62%',
          height: 'auto',
          transformOrigin: '85% 75%',
          zIndex: 5,
          pointerEvents: 'none',
        }}
        animate={{
          rotate: [-2.5, 2.5, -2.5],
          scale: [1, 1.015, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.4,
          ease: 'easeInOut',
        }}
      />

      {/* 2. Steam Particles from Acorn Mug */}
      <div
        style={{
          position: 'absolute',
          left: '68%',
          top: '64%',
          width: '24px',
          height: '36px',
          zIndex: 22,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 3,
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            filter: 'blur(1.2px)',
          }}
          animate={{
            y: [-2, -26],
            x: [0, 3, -1],
            opacity: [0, 0.85, 0],
            scale: [0.6, 1.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
            ease: 'easeOut',
          }}
        />
        <motion.div
          style={{
            position: 'absolute',
            bottom: 2,
            left: 10,
            width: 4.5,
            height: 4.5,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.55)',
            filter: 'blur(1.2px)',
          }}
          animate={{
            y: [-1, -22],
            x: [0, -2, 2],
            opacity: [0, 0.75, 0],
            scale: [0.5, 1.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.6,
            delay: 0.9,
            ease: 'easeOut',
          }}
        />
      </div>

      {/* 3. Body Layer (Sitting cozy on tree stump, holding acorn mug with green scarf) */}
      <motion.img
        src="/assets/lobby/sprint_stump_body.png"
        alt="Sprint Body"
        style={{
          position: 'absolute',
          left: '25.68%',
          top: '58.82%',
          width: '52.70%',
          height: 'auto',
          zIndex: 10,
          pointerEvents: 'none',
          transformOrigin: '50% 90%',
        }}
        animate={{
          scale: [1, 1.01, 1],
          y: [0, -0.6, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.0,
          ease: 'easeInOut',
        }}
      />

      {/* 4. Left Dangling Foot / Paw (Alternating playful kick) */}
      <motion.img
        src="/assets/lobby/sprint_stump_left_foot.png"
        alt="Sprint Left Foot"
        style={{
          position: 'absolute',
          left: '47.30%',
          top: '79.71%',
          width: '12.70%',
          height: 'auto',
          transformOrigin: '50% 20%',
          zIndex: 25,
          pointerEvents: 'none',
        }}
        animate={{
          rotate: [-8, 6, -8],
          y: [-2, 2, -2],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.0,
          ease: 'easeInOut',
        }}
      />

      {/* 5. Right Dangling Foot / Paw (Opposite alternating kick) */}
      <motion.img
        src="/assets/lobby/sprint_stump_right_foot.png"
        alt="Sprint Right Foot"
        style={{
          position: 'absolute',
          left: '70.00%',
          top: '79.41%',
          width: '8.38%',
          height: 'auto',
          transformOrigin: '50% 20%',
          zIndex: 25,
          pointerEvents: 'none',
        }}
        animate={{
          rotate: [6, -8, 6],
          y: [2, -2, 2],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.0,
          ease: 'easeInOut',
        }}
      />

      {/* 6. Head Layer (Tilts and bobs smoothly, master reference chibi head) */}
      <motion.img
        src="/assets/lobby/sprint_stump_head.png"
        alt="Sprint Head"
        style={{
          position: 'absolute',
          left: '12.97%',
          top: '17.65%',
          width: '60.00%',
          height: 'auto',
          transformOrigin: '65% 90%',
          zIndex: 20,
          pointerEvents: 'none',
        }}
        animate={{
          rotate: [-3, 3, -3],
          y: [0, -1, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.2,
          ease: 'easeInOut',
        }}
        whileHover={interactive ? { scale: 1.04, rotate: 3 } : undefined}
      />
    </div>
  );
};

export default SprintLobbyRig;
