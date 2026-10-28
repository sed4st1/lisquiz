import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { haptics } from '../services/haptics';

export interface TeacherHomeScreenProps {
  onCreateQuiz?: () => void;
  onOpenClasses: () => void;
  onOpenQuizzes: () => void;
  onSwitchRole?: () => void;
}

export default function TeacherHomeScreen({
  onCreateQuiz,
  onOpenClasses,
  onOpenQuizzes,
}: TeacherHomeScreenProps) {
  const [isJumping, setIsJumping] = useState(false);

  const handleOwlClick = () => {
    if (isJumping) return;
    haptics.impact('medium');
    setIsJumping(true);

    setTimeout(() => {
      setIsJumping(false);
    }, 750);
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            1. BASE BACKGROUND: Open terrace with river & castle
           ======================================================== */}
        <div style={styles.backgroundLayer} />

        {/* Ambient warm sunlight filter */}
        <div style={styles.sunbeamGlow} />

        {/* ========================================================
            2. TOP HANGING SIGN: "Кабинет учителя"
            Hangs on hemp ropes directly from the terrace ceiling.
            Swings gently in the breeze.
           ======================================================== */}
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            rotate: [-1.2, 1.2, -0.8, 0.8, 0],
          }}
          transition={{
            y: { type: 'spring', stiffness: 160, damping: 16 },
            opacity: { duration: 0.3 },
            rotate: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={styles.signHeaderWrapper}
        >
          <img
            src="/assets/teacher/sign_office.png"
            alt="Кабинет учителя"
            style={styles.signHeaderImg}
            draggable={false}
          />
        </motion.div>

        {/* ========================================================
            3. CONTACT SHADOW ON DESK:
            Grounds the owl's feet firmly to the wooden table.
            Reacts dynamically to the owl's jump.
           ======================================================== */}
        <motion.div
          animate={
            isJumping
              ? { scale: [1, 0.7, 1.06, 1], opacity: [0.75, 0.35, 0.85, 0.75] }
              : { scale: 1, opacity: 0.75 }
          }
          transition={{ duration: 0.75, ease: 'easeInOut' }}
          style={styles.tableShadow}
        />

        {/* ========================================================
            4. INTERACTIVE OWL PUPPET (Teacher Mascot):
            Standing confidently and sturdily on the table on her feet.
            - Torso (blue coat, folded left wing, golden button, orange feet)
            - Right wing (holds pointer stick, attaches to shoulder)
            - Head Group:
              * Bare Head (clean expressive eyes)
              * Academic Cap (tilted naturally with golden tassel)
              * Glasses (aligned precisely over eyes, flies up on jump!)
            On click: playful jump with flying spectacles!
           ======================================================== */}
        <div
          style={styles.owlPuppetContainer}
          onClick={handleOwlClick}
          title="Нажми на мудрую Совушку!"
        >
          <div style={styles.puppetInner}>
            {/* Slice 1: Torso with orange feet (Layer 1) */}
            <motion.img
              src="/assets/teacher/puppet_torso.png"
              alt="Туловище Совушки"
              animate={isJumping ? { y: [0, -20, 2, -1, 0] } : { y: 0 }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
              style={styles.sliceTorso}
              draggable={false}
            />

            {/* Slice 2: Right Wing with Pointer (Layer 2) */}
            <motion.img
              src="/assets/teacher/puppet_wing_right.png"
              alt="Крыло с указкой"
              animate={
                isJumping
                  ? {
                      y: [0, -20, 2, -1, 0],
                      rotate: [0, -24, 6, -12, 0],
                    }
                  : {
                      y: 0,
                      rotate: [0, -3, 1, 0],
                    }
              }
              transition={
                isJumping
                  ? { duration: 0.75, ease: 'easeInOut' }
                  : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
              }
              style={styles.sliceWingRight}
              draggable={false}
            />

            {/* Slice 3, 4, 5: Head Group with Cap and Flying Glasses */}
            <motion.div
              animate={isJumping ? { y: [0, -22, 2, -1, 0] } : { y: 0 }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
              style={styles.headGroup}
            >
              {/* Bare Head */}
              <img
                src="/assets/teacher/puppet_head.png"
                alt="Голова Совушки"
                style={styles.headLayer}
                draggable={false}
              />

              {/* Academic Cap */}
              <img
                src="/assets/teacher/puppet_cap.png"
                alt="Шапочка выпускника"
                style={styles.headLayer}
                draggable={false}
              />

              {/* Glasses - fly high up in the air on jump! */}
              <motion.img
                src="/assets/teacher/puppet_glasses.png"
                alt="Очки Совушки"
                animate={
                  isJumping
                    ? {
                        y: [0, -56, 6, -2, 0],
                        rotate: [0, -10, 5, -2, 0],
                      }
                    : {
                        y: 0,
                        rotate: 0,
                      }
                }
                transition={
                  isJumping
                    ? {
                        duration: 0.75,
                        times: [0, 0.35, 0.7, 0.85, 1],
                        ease: 'easeInOut',
                      }
                    : { duration: 0.2 }
                }
                style={styles.glassesLayer}
                draggable={false}
              />
            </motion.div>
          </div>
        </div>

        {/* ========================================================
            5. THREE INTERACTIVE WOODEN BUTTONS:
            Arranged on the sunlit terrace floor.
            1. Создать викторину (Yellow plank)
            2. Мои викторины (Blue plank)
            3. Мои классы (Natural wood plank)
           ======================================================== */}
        <div style={styles.buttonsContainer}>
          {/* Button 1: Создать викторину */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={() => {
              haptics.impact('medium');
              if (onCreateQuiz) {
                onCreateQuiz();
              } else {
                onOpenQuizzes();
              }
            }}
            style={styles.woodButton}
          >
            <img
              src="/assets/teacher/btn_create_quiz.png"
              alt="Создать викторину"
              style={styles.buttonImg}
              draggable={false}
            />
          </motion.button>

          {/* Button 2: Мои викторины */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={() => {
              haptics.impact('medium');
              onOpenQuizzes();
            }}
            style={styles.woodButton}
          >
            <img
              src="/assets/teacher/btn_my_quizzes.png"
              alt="Мои викторины"
              style={styles.buttonImg}
              draggable={false}
            />
          </motion.button>

          {/* Button 3: Мои классы */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={() => {
              haptics.impact('medium');
              onOpenClasses();
            }}
            style={styles.woodButton}
          >
            <img
              src="/assets/teacher/btn_my_classes.png"
              alt="Мои классы"
              style={styles.buttonImg}
              draggable={false}
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    position: 'relative',
    width: '100%',
    height: '100dvh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    userSelect: 'none',
  },
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 480,
    height: '100%',
    maxHeight: 960,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 0 40px rgba(0, 0, 0, 0.7)',
  },
  backgroundLayer: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(/assets/teacher/teacher_bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
    zIndex: 1,
  },
  sunbeamGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 75% 20%, rgba(254, 240, 138, 0.14) 0%, transparent 60%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  signHeaderWrapper: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 25,
    marginTop: -4,
    pointerEvents: 'none',
  },
  signHeaderImg: {
    width: '62%',
    maxWidth: 270,
    height: 'auto',
    filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.35))',
    display: 'block',
  },
  tableShadow: {
    position: 'absolute',
    left: '21%',
    top: '56.8%',
    width: '33%',
    height: '2.4%',
    background:
      'radial-gradient(ellipse at center, rgba(30, 12, 5, 0.65) 0%, rgba(45, 20, 10, 0.3) 50%, transparent 75%)',
    borderRadius: '50%',
    filter: 'blur(3px)',
    zIndex: 9,
    pointerEvents: 'none',
  },
  owlPuppetContainer: {
    position: 'absolute',
    left: '15.5%',
    top: '36.0%',
    width: '48%',
    maxWidth: 240,
    aspectRatio: '1 / 1',
    zIndex: 10,
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  puppetInner: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  sliceTorso: {
    position: 'absolute',
    left: '10.7%',
    top: '35.7%',
    width: '65.0%',
    height: 'auto',
    zIndex: 1,
    pointerEvents: 'none',
    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25))',
  },
  sliceWingRight: {
    position: 'absolute',
    left: '54.3%',
    top: '30.0%',
    width: '47.7%',
    height: 'auto',
    zIndex: 2,
    transformOrigin: '25% 70%',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22))',
  },
  headGroup: {
    position: 'absolute',
    left: '8.0%',
    top: '2.0%',
    width: '72.0%',
    aspectRatio: '1 / 1',
    zIndex: 3,
    pointerEvents: 'none',
  },
  headLayer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25))',
  },
  glassesLayer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transformOrigin: '53.7% 63.9%',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35))',
  },
  buttonsContainer: {
    position: 'absolute',
    top: '67.5%',
    bottom: 'clamp(8px, 1.5vh, 16px)',
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    padding: '0 16px',
    boxSizing: 'border-box',
  },
  woodButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    outline: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    touchAction: 'manipulation',
    filter: 'drop-shadow(0 5px 12px rgba(0, 0, 0, 0.35))',
  },
  buttonImg: {
    width: 'auto',
    maxWidth: '82%',
    maxHeight: 'clamp(68px, 9.5vh, 92px)',
    height: 'auto',
    display: 'block',
  },
};
