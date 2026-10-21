import React from 'react';
import { motion } from 'framer-motion';
import { colors, borderRadius, spacing } from '../theme/tokens';

export interface MascotTipProps {
  text: string;
  pose?: 'wave' | 'thinking' | 'celebrate' | 'dash';
  size?: number;
  title?: string;
}

const poseToImage: Record<string, string> = {
  wave: '/assets/mascot/wave.png',
  thinking: '/assets/mascot/thinking.png',
  celebrate: '/assets/mascot/celebrate.png',
  dash: '/assets/mascot/dash.png',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    boxSizing: 'border-box',
  },
  mascotWrapper: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    display: 'block',
    objectFit: 'contain',
    userSelect: 'none',
    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25))',
  },
  bubble: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.cardSurface,
    borderLeft: `3px solid ${colors.foxOrange}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm + 2}px ${spacing.md + 2}px`,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    minWidth: 0,
  },
  bubbleTitle: {
    margin: 0,
    marginBottom: 3,
    fontSize: 11,
    fontWeight: 600,
    color: colors.foxOrange,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  bubbleText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.45,
    color: colors.textSecondary,
    wordBreak: 'break-word',
  },
};

export default function MascotTip({
  text,
  pose = 'wave',
  size = 64,
  title = 'Совет от Спринта',
}: MascotTipProps) {
  const imageSrc = poseToImage[pose] || poseToImage.wave;

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <motion.div
        style={{ ...styles.mascotWrapper, width: size, height: size }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={imageSrc}
          alt="Лисёнок Спринт"
          style={{ ...styles.mascotImage, width: size, height: size }}
          loading="lazy"
        />
      </motion.div>

      <div style={styles.bubble}>
        {title && <p style={styles.bubbleTitle}>{title}</p>}
        <p style={styles.bubbleText}>{text}</p>
      </div>
    </motion.div>
  );
}
