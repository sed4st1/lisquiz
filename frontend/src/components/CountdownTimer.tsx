import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { colors } from '../theme/tokens';

export interface CountdownTimerProps {
  totalSeconds: number;
  onComplete?: () => void;
  isPaused?: boolean;
  size?: number;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
  },
  svg: {
    display: 'block',
    overflow: 'visible',
  },
  textWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.5px',
  },
};

export default function CountdownTimer({
  totalSeconds,
  onComplete,
  isPaused = false,
  size = 80,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(totalSeconds);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset when totalSeconds changes
  useEffect(() => {
    setTimeLeft(totalSeconds);
    completedRef.current = false;
  }, [totalSeconds]);

  // Accurate ticking mechanism using performance.now()
  useEffect(() => {
    if (isPaused || totalSeconds <= 0) return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        const next = prev - deltaSec;
        if (next <= 0) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current?.();
          }
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, totalSeconds]);

  // Calculate progress (1 down to 0)
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, timeLeft / totalSeconds)) : 0;

  // Determine color based on remaining progress
  // emeraldGreen > foxOrange (at 50%) > answerRed (at 25%)
  let currentColor: string = colors.emeraldGreen;
  if (progress <= 0.25) {
    currentColor = colors.answerRed;
  } else if (progress <= 0.5) {
    currentColor = colors.foxOrange;
  }

  const isCritical = progress <= 0.25 && timeLeft > 0 && !isPaused;

  // SVG Geometry
  const strokeWidth = Math.max(4, Math.round(size * 0.08));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const displaySeconds = Math.max(0, Math.ceil(timeLeft));

  return (
    <motion.div
      style={{ ...styles.container, width: size, height: size }}
      animate={
        isCritical
          ? { scale: [1, 1.06, 1], filter: [`drop-shadow(0 0 6px ${currentColor}80)`, `drop-shadow(0 0 14px ${currentColor})`, `drop-shadow(0 0 6px ${currentColor}80)`] }
          : { scale: 1, filter: 'none' }
      }
      transition={
        isCritical
          ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={styles.svg}
      >
        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke 0.25s ease, stroke-dashoffset 0.05s linear',
          }}
        />
      </svg>

      {/* Center text with remaining seconds */}
      <div style={styles.textWrapper}>
        <span
          style={{
            ...styles.number,
            fontSize: Math.round(size * 0.36),
            color: currentColor,
          }}
        >
          {displaySeconds}
        </span>
      </div>
    </motion.div>
  );
}
