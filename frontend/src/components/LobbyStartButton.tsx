import React from 'react';
import { motion } from 'framer-motion';

interface LobbyStartButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  countdown?: number | null;
  className?: string;
}

export const LobbyStartButton: React.FC<LobbyStartButtonProps> = ({
  onClick,
  disabled = false,
  countdown = null,
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { scale: 1.03, filter: 'brightness(1.06)' } : undefined}
      whileTap={!disabled ? { scale: 0.96, y: 2 } : undefined}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        aspectRatio: '740 / 157',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? 'grayscale(0.35)' : 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
      }}
      className={className}
    >
      <img
        src="/assets/lobby/btn_start_quiz.png"
        alt="Начать викторину!"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Countdown Overlay (only rendered during active countdown) */}
      {countdown !== null && (
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            borderRadius: 30,
            padding: '8px 24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#B45309',
            fontWeight: 900,
            fontSize: 'clamp(15px, 2.6vw, 22px)',
            letterSpacing: '0.02em',
          }}
        >
          Старт через {countdown}...
        </div>
      )}
    </motion.button>
  );
};

export default LobbyStartButton;
