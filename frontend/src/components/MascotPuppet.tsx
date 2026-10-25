import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { haptics } from '../services/haptics';

export interface MascotPuppetProps {
  /**
   * Primary display size (width in pixels).
   * Height is calculated automatically to maintain the canonical aspect ratio (440:480).
   * Default: 280
   */
  size?: number;
  /**
   * Explicit width override in pixels
   */
  width?: number;
  /**
   * Explicit height override in pixels
   */
  height?: number;
  /**
   * Custom CSS styles applied to the outer wrapper
   */
  style?: React.CSSProperties;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Callback fired when mascot is tapped/clicked
   */
  onTap?: () => void;
  /**
   * Whether interactive click/tap animation is enabled.
   * Default: true
   */
  interactive?: boolean;
  /**
   * Whether haptic feedback fires on tap.
   * Default: true
   */
  enableHaptics?: boolean;
  /**
   * Controlled blink state. If omitted, blinks automatically every 3.2 - 4.5 seconds.
   */
  isBlinking?: boolean;
}

const BASE_W = 440;
const BASE_H = 480;

/**
 * MascotPuppet - Канонический анимированный маскот Лисквиз «Спринт»
 * Собран из модульных слайсов `образцы дизайна/v2/маскот слайсы 2.png` в 100% соответствии
 * с эталоном `главное меню.png`.
 * 
 * Включает:
 * - 60 FPS Framer Motion анимации: виляние хвостом, дыхание, шевеление ушей, покачивание головы.
 * - Естественное периодическое моргание (130ms каждые ~3.5s).
 * - Тактильный интерактивный подскок при клике/тапе с поддержкой MAX / VK / Telegram Haptics.
 * - Чистые PNG RGBA без ореолов и зазоров на любом фоне.
 */
export const MascotPuppet: React.FC<MascotPuppetProps> = ({
  size = 280,
  width,
  height,
  style,
  className,
  onTap,
  interactive = true,
  enableHaptics = true,
  isBlinking: controlledBlinking,
}) => {
  const [internalBlinking, setInternalBlinking] = useState(false);
  const isBlinking = controlledBlinking ?? internalBlinking;
  const jumpControls = useAnimation();
  const isJumpingRef = useRef(false);

  // Auto-blink cycle: triggers natural blink every 3.2 - 4.2 seconds
  useEffect(() => {
    if (controlledBlinking !== undefined) return;

    let timeoutId: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = 3200 + Math.random() * 1200;
      timeoutId = setTimeout(() => {
        setInternalBlinking(true);
        setTimeout(() => {
          setInternalBlinking(false);
          scheduleNextBlink();
        }, 130);
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, [controlledBlinking]);

  // Cheerful tap/click bounce
  const handleTap = useCallback(async () => {
    if (!interactive || isJumpingRef.current) return;
    isJumpingRef.current = true;

    if (enableHaptics) {
      haptics.impact('light');
    }

    onTap?.();

    await jumpControls.start({
      y: [0, -18, 0],
      scaleY: [1, 1.05, 0.96, 1],
      scaleX: [1, 0.97, 1.03, 1],
      transition: {
        duration: 0.48,
        times: [0, 0.4, 0.75, 1],
        ease: 'easeOut',
      },
    });

    isJumpingRef.current = false;
  }, [interactive, enableHaptics, onTap, jumpControls]);

  // Compute responsive dimensions and scaling factor
  const finalWidth = width || size;
  const finalHeight = height || Math.round(finalWidth * (BASE_H / BASE_W));
  const scale = finalWidth / BASE_W;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: finalWidth,
        height: finalHeight,
        overflow: 'visible',
        display: 'inline-block',
        ...style,
      }}
    >
      {/* Static scale wrapper: isolates CSS transform scale so Framer Motion never overrides it */}
      <div
        style={{
          width: BASE_W,
          height: BASE_H,
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          overflow: 'visible',
        }}
      >
        {/* Animated bounce & tap container in unscaled coordinates */}
        <motion.div
          animate={jumpControls}
          whileTap={interactive ? { scale: 0.97 } : undefined}
          onClick={handleTap}
          style={{
            width: BASE_W,
            height: BASE_H,
            position: 'relative',
            cursor: interactive ? 'pointer' : 'default',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            transformOrigin: '50% 90%',
          }}
        >
          {/* Layer 0: Ground Contact Occlusion Shadow (directly hugging paws, no translucent disc) */}
          <div
            style={{
              position: 'absolute',
              left: 135,
              top: 426,
              width: 195,
              height: 10,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(14, 38, 10, 0.85) 0%, rgba(14, 38, 10, 0.35) 55%, transparent 75%)',
              filter: 'blur(2.5px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* Layer 1: Tail (flipped canonical orientation, socket deeply hidden behind rump) */}
          <motion.img
            src="/assets/mascot/orig_rig/tail.png"
            alt="Хвост"
            draggable={false}
            style={{
              position: 'absolute',
              left: 50,
              top: 160,
              width: 170,
              height: 230,
              transformOrigin: '82% 87%',
              zIndex: 1,
              pointerEvents: 'none',
            }}
            initial={{ rotate: 0 }}
            animate={{ rotate: [-4.5, 4.5, -4.5] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Layer 2: Seated Body - 100% intact rounded paws, pristine contour */}
          <motion.img
            src="/assets/mascot/orig_rig/body.png"
            alt="Туловище"
            draggable={false}
            style={{
              position: 'absolute',
              left: 120,
              top: 232,
              width: 220,
              height: 198,
              transformOrigin: '50% 100%',
              zIndex: 2,
              pointerEvents: 'none',
            }}
            animate={{ scaleY: [1.0, 1.012, 1.0] }}
            transition={{
              duration: 4.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Layer 3: Scarf (worn on neck: below head, above body, with raised back collar) */}
          <motion.img
            src="/assets/mascot/orig_rig/scarf.png"
            alt="Шарф"
            draggable={false}
            style={{
              position: 'absolute',
              left: 110,
              top: 212,
              width: 218,
              height: 98,
              transformOrigin: '35% 20%',
              zIndex: 3,
              pointerEvents: 'none',
            }}
            initial={{ rotate: -4 }}
            animate={{ rotate: [-5.2, -2.8, -5.2] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Layer 4: Head Assembly (prominent sweet chibi head above scarf and body) */}
          <motion.div
            style={{
              position: 'absolute',
              left: 66,
              top: 6,
              width: 380,
              height: 360,
              transformOrigin: '50% 85%',
              zIndex: 4,
              pointerEvents: 'none',
            }}
            initial={{ rotate: 3 }}
            animate={{
              rotate: [1.8, 4.2, 1.8],
            }}
            transition={{
              duration: 4.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
          {/* Left Ear (deeply tucked behind skull cheek) */}
          <motion.img
            src="/assets/mascot/orig_rig/ear_left.png"
            alt="Левое ухо"
            draggable={false}
            style={{
              position: 'absolute',
              left: 62,
              top: 38,
              width: 116,
              height: 141,
              transformOrigin: '70% 90%',
              zIndex: 1,
            }}
            initial={{ rotate: -3 }}
            animate={{ rotate: [-4.5, -2.0, -4.5] }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.2,
            }}
          />

          {/* Right Ear (deeply rooted behind skull) */}
          <motion.img
            src="/assets/mascot/orig_rig/ear_right.png"
            alt="Правое ухо"
            draggable={false}
            style={{
              position: 'absolute',
              left: 196,
              top: 26,
              width: 114,
              height: 141,
              transformOrigin: '25% 95%',
              zIndex: 1,
            }}
            initial={{ rotate: 7 }}
            animate={{ rotate: [5.5, 8.0, 5.5] }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
          />

          {/* Head Base with large cute eyes and sharp crown tufts */}
          <img
            src="/assets/mascot/orig_rig/head.png"
            alt="Голова"
            draggable={false}
            style={{
              position: 'absolute',
              left: 50,
              top: 38,
              width: 282,
              height: 230,
              zIndex: 2,
            }}
          />

          {/* Head Blink Overlay (Eyes Closed smiling arcs) */}
          <motion.img
            src="/assets/mascot/orig_rig/head_blink.png"
            alt="Моргание"
            draggable={false}
            style={{
              position: 'absolute',
              left: 50,
              top: 38,
              width: 282,
              height: 230,
              zIndex: 3,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isBlinking ? 1 : 0 }}
            transition={{ duration: 0.04 }}
          />
        </motion.div>

        {/* Layer 5: Meadow Grass Tufts Contact (plants paws naturally into the meadow turf) */}
        <img
          src="/assets/mascot/orig_rig/paws_grass_contact.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: 123,
            top: 416,
            width: 215,
            height: 38,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        />
        </motion.div>
      </div>
    </div>
  );
};

export default MascotPuppet;
