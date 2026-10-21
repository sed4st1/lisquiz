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

const CARD_ASSETS: Record<'red' | 'blue' | 'yellow' | 'green', string> = {
  red: '/assets/ui/btn_red_clean.png',
  blue: '/assets/ui/btn_blue_clean.png',
  yellow: '/assets/ui/btn_yellow_clean.png',
  green: '/assets/ui/btn_green_clean.png',
};

const GLOW_COLORS: Record<'red' | 'blue' | 'yellow' | 'green', string> = {
  red: 'rgba(239, 68, 68, 0.85)',
  blue: 'rgba(59, 130, 246, 0.85)',
  yellow: 'rgba(245, 158, 11, 0.85)',
  green: 'rgba(16, 185, 129, 0.85)',
};

export default function AnswerButton({
  color,
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

  const handleClick = () => {
    if (disabled) return;
    haptics.impact('light');
    onClick?.();
  };

  const isWrong = isCorrect === false && isSelected;
  const isWinner = isCorrect === true;
  const hasTextOrMath = Boolean(text || mathHtml);

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
        aspectRatio: '1.34 / 1',
        display: 'flex',
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
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
        {/* Contact Shadow */}
        <span
          style={{
            position: 'absolute',
            inset: 2,
            transform: 'translateY(6px)',
            borderRadius: 24,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            filter: 'blur(3px)',
            pointerEvents: 'none',
          }}
        />

        {/* Card Face */}
        <span
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            borderRadius: 24,
            backgroundImage: `url(${CARD_ASSETS[color]})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            boxShadow: isWinner
              ? `0 0 24px ${GLOW_COLORS[color]}, inset 0 0 12px rgba(255, 255, 255, 0.6)`
              : isSelected
              ? `0 0 16px rgba(255, 255, 255, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.4)`
              : 'none',
            outline: isSelected ? '3.5px solid #FFFFFF' : 'none',
            outlineOffset: 2,
            transition: 'transform 0.08s ease-out, filter 0.08s ease-out, box-shadow 0.2s ease',
          }}
          className="tactile-btn-front"
        >
          {/* If there is text or LaTeX, display it in the center */}
          {hasTextOrMath && (
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '4px 12px',
                pointerEvents: 'none',
              }}
            >
              {text && (
                <span
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: 22,
                    textAlign: 'center',
                    lineHeight: 1.25,
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
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
                    fontSize: 24,
                    fontWeight: 900,
                    textAlign: 'center',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                  }}
                  dangerouslySetInnerHTML={{ __html: mathHtml }}
                />
              )}
            </div>
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
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                border: '2px solid #FFFFFF',
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
                right: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 900,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                border: '2px solid #FFFFFF',
              }}
            >
              ✕
            </span>
          )}
        </span>
      </button>
    </motion.div>
  );
}
