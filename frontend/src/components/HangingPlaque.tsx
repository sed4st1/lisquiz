import React from 'react';
import { motion } from 'framer-motion';
import { haptics } from '../services/haptics';

export interface HangingPlaqueProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  swayDuration?: number;
  swayDelay?: number;
  shape?: 'wide' | 'square';
}

export const HangingPlaque: React.FC<HangingPlaqueProps> = ({
  icon,
  title,
  subtitle,
  onClick,
  style,
  swayDuration = 4.2,
  swayDelay = 0,
  shape = 'wide',
}) => {
  const imgSrc =
    shape === 'square'
      ? '/assets/ui/sign_hanging_square_v2.png'
      : '/assets/ui/sign_hanging_wide_v2.png';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('medium');
    onClick?.();
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 5,
        ...style,
      }}
    >
      <motion.div
        animate={{
          rotate: [-1.8, 1.8, -1.8],
        }}
        transition={{
          repeat: Infinity,
          duration: swayDuration,
          delay: swayDelay,
          ease: 'easeInOut',
        }}
        whileHover={{ scale: 1.05, rotate: 0 }}
        whileTap={{ scale: 0.95, y: 2 }}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          transformOrigin: '50% 0px',
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'manipulation',
        }}
        title={subtitle || title}
      >
        {/* Texture image of the hanging wooden plank */}
        <img
          src={imgSrc}
          alt={title}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 6px 12px rgba(10, 20, 10, 0.45))',
            pointerEvents: 'none',
          }}
          draggable={false}
        />

        {/* Carved typography and icon overlay perfectly centered on the wooden board */}
        <div
          style={{
            position: 'absolute',
            top: shape === 'square' ? '58%' : '53%',
            left: '8%',
            right: '8%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            pointerEvents: 'none',
          }}
        >
          {icon && (
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: '#321402',
                lineHeight: 1.1,
                letterSpacing: '0.02em',
                textShadow: '0 1px 0 rgba(255, 240, 180, 0.7), 0 -1px 0 rgba(0, 0, 0, 0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </span>
            {subtitle && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  color: '#5C2D08',
                  lineHeight: 1,
                  marginTop: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
