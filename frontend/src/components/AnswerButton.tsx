import { useMemo } from 'react';
import { motion } from 'framer-motion';
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

interface ColorPalette {
  front: string;
  edge: string;
  highlight: string;
  glow: string;
  shadow: string;
}

const PALETTES: Record<'red' | 'blue' | 'yellow' | 'green', ColorPalette> = {
  red: {
    front: '#EF4444',
    edge: '#B91C1C',
    highlight: 'rgba(254, 202, 202, 0.45)',
    glow: 'rgba(239, 68, 68, 0.7)',
    shadow: 'rgba(185, 28, 28, 0.5)',
  },
  blue: {
    front: '#3B82F6',
    edge: '#1D4ED8',
    highlight: 'rgba(191, 219, 254, 0.45)',
    glow: 'rgba(59, 130, 246, 0.7)',
    shadow: 'rgba(29, 78, 216, 0.5)',
  },
  yellow: {
    front: '#F59E0B',
    edge: '#B45309',
    highlight: 'rgba(254, 243, 199, 0.5)',
    glow: 'rgba(245, 158, 11, 0.7)',
    shadow: 'rgba(180, 83, 9, 0.5)',
  },
  green: {
    front: '#10B981',
    edge: '#047857',
    highlight: 'rgba(209, 250, 229, 0.5)',
    glow: 'rgba(16, 185, 129, 0.7)',
    shadow: 'rgba(4, 120, 87, 0.5)',
  },
};

const SHAPES: Record<'triangle' | 'diamond' | 'circle' | 'square', string> = {
  triangle: '▲',
  diamond: '◆',
  circle: '●',
  square: '■',
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
  const palette = PALETTES[color];

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
    haptics.impact('light');
    onClick?.();
  };

  // Wrong answer shake animation
  const isWrong = isCorrect === false && isSelected;
  const isWinner = isCorrect === true;

  return (
    <motion.div
      animate={
        isWrong
          ? { x: [-8, 8, -6, 6, -3, 3, 0] }
          : isWinner
          ? { scale: [1, 1.03, 1] }
          : {}
      }
      transition={
        isWrong
          ? { duration: 0.45, ease: 'easeOut' }
          : isWinner
          ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }
          : undefined
      }
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 88,
        display: 'flex',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 88,
          border: 'none',
          background: 'transparent',
          padding: 0,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled && !isSelected && isCorrect === null ? 0.75 : 1,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
        className="tactile-btn-root"
      >
        {/* Слой 1: Размытая рассеянная контактная тень */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translateY(6px)',
            borderRadius: 18,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            filter: 'blur(2px)',
          }}
        />

        {/* Слой 2: Жесткое 3D-ребро (Beveled Edge) */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translateY(5px)',
            borderRadius: 18,
            backgroundColor: palette.edge,
          }}
        />

        {/* Слой 3: Лицевая тактильная поверхность с продавливанием */}
        <span
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            minHeight: 88,
            padding: '14px 16px',
            borderRadius: 18,
            backgroundColor: palette.front,
            borderTop: `2px solid ${palette.highlight}`,
            boxShadow: isWinner
              ? `0 0 20px ${palette.glow}, inset 0 0 12px rgba(255, 255, 255, 0.4)`
              : isSelected
              ? `0 0 14px rgba(255, 255, 255, 0.8), inset 0 0 8px rgba(255, 255, 255, 0.3)`
              : 'none',
            outline: isSelected ? '3px solid #FFFFFF' : 'none',
            outlineOffset: 1,
            boxSizing: 'border-box',
            transition: 'transform 0.06s ease-out, filter 0.06s ease-out, box-shadow 0.2s ease',
          }}
          className="tactile-btn-front"
        >
          {/* Символ фигуры в верхнем левом углу */}
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 12,
              fontSize: 20,
              lineHeight: 1,
              color: 'rgba(255, 255, 255, 0.35)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {SHAPES[shape]}
          </span>

          {/* Индикатор победы / ошибки в верхнем правом углу */}
          {isWinner && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 12,
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.35)',
              }}
            >
              ✓
            </span>
          )}

          {isWrong && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 12,
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.35)',
              }}
            >
              ✕
            </span>
          )}

          {/* Текст или KaTeX формула */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {text && (
              <span
                style={{
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 16,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
                  wordBreak: 'break-word',
                }}
              >
                {text}
              </span>
            )}
            {mathHtml && (
              <span
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  textAlign: 'center',
                  display: 'inline-block',
                }}
                dangerouslySetInnerHTML={{ __html: mathHtml }}
              />
            )}
          </div>
        </span>
      </button>
    </motion.div>
  );
}
