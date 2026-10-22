import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import katex from 'katex';
import { haptics } from '../services/haptics';

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

const BUTTON_THEMES: Record<
  'red' | 'blue' | 'yellow' | 'green',
  { bg: string; shadow: string; glow: string }
> = {
  red: {
    bg: '#EF4444',
    shadow: '#B91C1C',
    glow: 'rgba(239, 68, 68, 0.8)',
  },
  blue: {
    bg: '#3B82F6',
    shadow: '#1D4ED8',
    glow: 'rgba(59, 130, 246, 0.8)',
  },
  yellow: {
    bg: '#F59E0B',
    shadow: '#B45309',
    glow: 'rgba(245, 158, 11, 0.8)',
  },
  green: {
    bg: '#10B981',
    shadow: '#047857',
    glow: 'rgba(16, 185, 129, 0.8)',
  },
};

const SHAPE_SYMBOLS: Record<'triangle' | 'diamond' | 'circle' | 'square', string> = {
  triangle: '▲',
  diamond: '◆',
  circle: '●',
  square: '■',
};

export default function AnswerButton({
  color,
  shape = 'triangle',
  text,
  latex,
  onClick,
  disabled = false,
  isCorrect = null,
  isSelected = false,
}: AnswerButtonProps) {
  const mathHtml = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: false });
    } catch {
      return null;
    }
  }, [latex]);

  const fontSize = useMemo(() => {
    if (!text) return 22;
    const len = text.length;
    if (len <= 4) return 24;
    if (len <= 10) return 20;
    if (len <= 22) return 16;
    if (len <= 40) return 14;
    return 12;
  }, [text]);

  const handleClick = () => {
    if (disabled) return;
    haptics.impact('light');
    onClick?.();
  };

  const isWrong = isCorrect === false && isSelected;
  const isWinner = isCorrect === true;
  const theme = BUTTON_THEMES[color];

  return (
    <motion.div
      animate={
        isWrong
          ? { x: [-8, 8, -6, 6, -3, 3, 0] }
          : isWinner
          ? { scale: [1, 1.04, 1] }
          : {}
      }
      transition={
        isWrong
          ? { duration: 0.45, ease: 'easeOut' }
          : isWinner
          ? { repeat: Infinity, duration: 1.4, ease: 'easeInOut' }
          : undefined
      }
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 88,
        display: 'flex',
      }}
    >
      <motion.button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        whileTap={!disabled ? { y: 3, scale: 0.98 } : undefined}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 88,
          backgroundColor: theme.bg,
          border: 'none',
          borderBottom: `5px solid ${theme.shadow}`,
          borderRadius: 22,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 12px',
          boxShadow: isWinner
            ? `0 0 28px ${theme.glow}, 0 6px 16px rgba(0, 0, 0, 0.45)`
            : isSelected
            ? `0 0 20px rgba(255, 255, 255, 0.85), 0 6px 16px rgba(0, 0, 0, 0.45)`
            : '0 6px 16px rgba(0, 0, 0, 0.35)',
          outline: isSelected ? '3.5px solid #FFFFFF' : 'none',
          outlineOffset: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled && !isSelected && isCorrect === null ? 0.65 : 1,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Subtle Foliage Motif in Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 20,
            overflow: 'hidden',
            pointerEvents: 'none',
            opacity: 0.12,
            backgroundImage:
              'radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(0, 0, 0, 0.6) 0%, transparent 40%)',
          }}
        />

        {/* Geometric Shape at Top */}
        <span
          style={{
            fontSize: 22,
            color: 'rgba(255, 255, 255, 0.92)',
            lineHeight: 1,
            marginBottom: 4,
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))',
          }}
        >
          {SHAPE_SYMBOLS[shape]}
        </span>

        {/* Answer Text in Bottom Half with Dynamic Responsive Typography */}
        {text && (
          <span
            style={{
              color: '#FFFFFF',
              fontWeight: fontSize > 16 ? 900 : 700,
              fontSize,
              textAlign: 'center',
              lineHeight: 1.25,
              letterSpacing: '0.01em',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
              wordBreak: 'break-word',
              maxWidth: '100%',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {text}
          </span>
        )}

        {mathHtml && (
          <span
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: 900,
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            }}
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        )}

        {/* Reveal Status Badge */}
        {isWinner && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              border: '2px solid #FFFFFF',
            }}
          >
            <Check size={14} strokeWidth={3} />
          </span>
        )}

        {isWrong && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              border: '2px solid #FFFFFF',
            }}
          >
            <X size={14} strokeWidth={3} />
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
