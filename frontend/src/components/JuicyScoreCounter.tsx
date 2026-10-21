import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, motion } from 'framer-motion';

interface JuicyScoreCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: string; // image path
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const JuicyScoreCounter: React.FC<JuicyScoreCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  icon,
  size = 'md',
  className = '',
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(value);

  // Пружина плавной числовой интерполяции (без ререндеров React Fiber)
  const numericSpring = useSpring(motionVal, {
    stiffness: 140,
    damping: 15,
    mass: 0.5,
  });

  // Взрывная пружина масштабирования (Damped Harmonic Oscillator k=650, c=16, m=0.35)
  const bounceSpring = useSpring(1, {
    stiffness: 650,
    damping: 16,
    mass: 0.35,
  });

  const prevValueRef = useRef(value);

  useEffect(() => {
    motionVal.set(value);
    if (value !== prevValueRef.current) {
      bounceSpring.set(1.25);
      const timer = setTimeout(() => bounceSpring.set(1), 140);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value, motionVal, bounceSpring]);

  useEffect(() => {
    return numericSpring.on('change', (latest) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = `${prefix}${Math.round(latest).toLocaleString('ru-RU')}${suffix}`;
      }
    });
  }, [numericSpring, prefix, suffix]);

  const sizeStyles = {
    sm: { fontSize: 14, iconSize: 18, gap: 4 },
    md: { fontSize: 18, iconSize: 24, gap: 6 },
    lg: { fontSize: 26, iconSize: 32, gap: 8 },
  }[size];

  return (
    <motion.div
      className={`inline-flex items-center select-none font-black will-change-transform ${className}`}
      style={{
        scale: bounceSpring,
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        fontWeight: 900,
        letterSpacing: '-0.02em',
        color: '#FFB800',
        transformOrigin: 'center center',
      }}
    >
      {icon && (
        <img
          src={icon}
          alt="icon"
          style={{
            width: sizeStyles.iconSize,
            height: sizeStyles.iconSize,
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        />
      )}
      <span
        ref={nodeRef}
        style={{
          fontSize: sizeStyles.fontSize,
          color: '#FFFFFF',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}
      >
        {prefix}{value.toLocaleString('ru-RU')}{suffix}
      </span>
    </motion.div>
  );
};

export default JuicyScoreCounter;
