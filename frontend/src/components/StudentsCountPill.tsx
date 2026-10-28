import React from 'react';
import { motion } from 'framer-motion';

interface StudentsCountPillProps {
  count: number;
  max?: number;
  className?: string;
}

export const StudentsCountPill: React.FC<StudentsCountPillProps> = ({
  count,
  max = 25,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 380,
        margin: '0 auto',
        aspectRatio: '607 / 100',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className={className}
    >
      <img
        src="/assets/lobby/pill_students_count.png"
        alt="Ученики в классе"
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

      {/* Dynamic Text "Ученики в классе: {count} из {max}" */}
      <div
        style={{
          position: 'absolute',
          left: '53.5%',
          top: '49%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#5C3317',
          fontWeight: 800,
          fontSize: 'clamp(11px, 1.8vw, 15px)',
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.75)',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          userSelect: 'none',
        }}
      >
        <span>Ученики в классе:</span>
        <span
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 900,
            fontSize: '1.08em',
            color: '#4A2306',
          }}
        >
          {count} {max ? `из ${max}` : ''}
        </span>
      </div>
    </motion.div>
  );
};

export default StudentsCountPill;
