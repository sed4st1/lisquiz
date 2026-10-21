import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import katex from 'katex';
import { hapticImpact } from '../services/maxBridge';
import { colors, borderRadius } from '../theme/tokens';

export interface AnswerButtonProps {
  color: 'red' | 'blue' | 'yellow' | 'green';
  shape: 'triangle' | 'diamond' | 'circle' | 'square';
  text: string;
  latex?: string;
  onClick?: () => void;
  disabled?: boolean;
  isCorrect?: boolean | null; // null = not revealed yet
  isSelected?: boolean;
}

const colorMap = {
  red: colors.answerRed,
  blue: colors.answerBlue,
  yellow: colors.answerYellow,
  green: colors.answerGreen,
};

const darkBorderColorMap = {
  red: '#B91C1C',
  blue: '#1D4ED8',
  yellow: '#B45309',
  green: '#15803D',
};

const shapeSymbols = {
  triangle: '▲',
  diamond: '◆',
  circle: '●',
  square: '■',
};

const styles: Record<string, React.CSSProperties> = {
  button: {
    minHeight: 80,
    borderRadius: borderRadius.md, // 12px
    border: 'none',
    boxSizing: 'border-box',
    width: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 20px',
    outline: 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  shapeIcon: {
    position: 'absolute',
    top: 8,
    left: 10,
    fontSize: 22,
    lineHeight: 1,
    color: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    pointerEvents: 'none',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 1.3,
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
    wordBreak: 'break-word',
  },
  mathContainer: {
    color: '#FFFFFF',
    display: 'inline-block',
    textAlign: 'center',
    fontSize: 17,
  },
};

export default function AnswerButton({
  color,
  shape,
  text,
  latex,
  onClick,
  disabled = false,
  isCorrect = null,
  isSelected = false,
}: AnswerButtonProps) {
  const baseBg = colorMap[color];
  const darkBorder = darkBorderColorMap[color];

  const mathHtml = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: false });
    } catch {
      return null;
    }
  }, [latex]);

  const handleClick = () => {
    if (disabled) return;
    hapticImpact('medium');
    onClick?.();
  };

  // Determine animations and visual treatments
  let animationProps = {};
  let transitionProps = {};

  if (isCorrect === true) {
    animationProps = {
      boxShadow: [
        `0 0 10px rgba(34, 197, 94, 0.4), 0 4px 0 ${darkBorder}`,
        `0 0 24px rgba(34, 197, 94, 0.95), 0 4px 0 ${darkBorder}`,
        `0 0 10px rgba(34, 197, 94, 0.4), 0 4px 0 ${darkBorder}`,
      ],
      scale: [1, 1.02, 1],
    };
    transitionProps = {
      duration: 1.4,
      repeat: Infinity,
      ease: 'easeInOut',
    };
  } else if (isCorrect === false && isSelected) {
    animationProps = {
      x: [-6, 6, -5, 5, -2, 2, 0],
      opacity: 0.55,
    };
    transitionProps = {
      duration: 0.5,
      ease: 'easeOut',
    };
  } else if (isCorrect === false && !isSelected) {
    animationProps = {
      opacity: 0.45,
    };
    transitionProps = {
      duration: 0.3,
    };
  }

  // Border & outline styles
  let dynamicOutline = 'none';
  if (isSelected && isCorrect === null) {
    dynamicOutline = '3px solid #FFFFFF';
  } else if (isCorrect === true) {
    dynamicOutline = '3px solid #22C55E';
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...styles.button,
        backgroundColor: baseBg,
        borderBottom: `4px solid ${darkBorder}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && isCorrect === null ? 0.6 : 1,
        outline: dynamicOutline,
        outlineOffset: isSelected ? 2 : 0,
      }}
      whileTap={!disabled ? { scale: 0.97, y: 2 } : undefined}
      animate={animationProps}
      transition={transitionProps}
    >
      {/* Shape symbol in top-left corner */}
      <span style={styles.shapeIcon}>{shapeSymbols[shape]}</span>

      {/* Reveal Status Badge in top-right corner */}
      {isCorrect === true && (
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: colors.emeraldGreen,
            color: '#FFFFFF',
          }}
        >
          ✓
        </span>
      )}
      {isCorrect === false && isSelected && (
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: colors.answerRed,
            color: '#FFFFFF',
          }}
        >
          ✕
        </span>
      )}

      {/* Button content */}
      <div style={styles.content}>
        {text && <span style={styles.text}>{text}</span>}
        {mathHtml && (
          <span
            style={styles.mathContainer}
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        )}
      </div>
    </motion.button>
  );
}
