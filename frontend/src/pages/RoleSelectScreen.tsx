import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Sparkles } from 'lucide-react';
import { haptics } from '../services/haptics';

export interface RoleSelectScreenProps {
  currentRole?: 'student' | 'teacher';
  onSelectRole: (role: 'student' | 'teacher') => void;
  onClose?: () => void;
}

export default function RoleSelectScreen({
  currentRole: _currentRole = 'student',
  onSelectRole,
  onClose,
}: RoleSelectScreenProps) {
  const [selectedRoleState, setSelectedRoleState] = useState<'student' | 'teacher' | null>(null);

  const handleRoleClick = (role: 'student' | 'teacher') => {
    setSelectedRoleState(role);
    haptics.impact('medium');

    // Give a brief moment for visual spark/pulse before navigating
    setTimeout(() => {
      onSelectRole(role);
    }, 280);
  };

  return (
    <div style={styles.container}>
      {/* Background with scenic meadow and sunny forest */}
      <div style={styles.bgOverlay} />

      {/* Gentle ambient sunbeam / warm glow effect */}
      <div style={styles.sunbeamGlow} />

      {/* Optional Top Close Button (if user opened as switcher modal) */}
      {onClose && (
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            haptics.selection();
            onClose();
          }}
          style={styles.closeBtn}
          title="Назад"
        >
          <X size={18} color="#5C3B1E" strokeWidth={2.8} />
        </motion.button>
      )}

      {/* Main Content Area */}
      <div style={styles.contentWrapper}>
        {/* ========================================================
            1. TOP HANGING SIGN: "Выбери роль"
            Swings gently on ropes like a real wooden park sign
           ======================================================== */}
        <motion.div
          initial={{ y: -120, opacity: 0, rotate: -4 }}
          animate={{
            y: 0,
            opacity: 1,
            rotate: [-1, 1, -0.6, 0.6, 0],
          }}
          transition={{
            y: { type: 'spring', stiffness: 140, damping: 14 },
            opacity: { duration: 0.3 },
            rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={styles.signHeaderWrapper}
        >
          <img
            src="/assets/roles/role_sign_header.png"
            alt="Выбери роль"
            style={styles.signHeaderImg}
            draggable={false}
          />
        </motion.div>

        {/* ========================================================
            2. INTERACTIVE ROLE CARDS (Student & Teacher)
            Staggered organic layout matching the reference image.
            No internal character breathing animation.
           ======================================================== */}
        <div style={styles.cardsContainer}>
          {/* CARD 1: УЧЕНИК (Student - Fox with backpack) */}
          <motion.div
            initial={{ scale: 0.82, opacity: 0, y: 35 }}
            animate={{
              scale: selectedRoleState === 'student' ? 1.04 : 1,
              opacity: 1,
              y: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.12,
            }}
            whileHover={{
              scale: 1.035,
              y: -5,
              filter: 'drop-shadow(0 20px 28px rgba(255, 122, 0, 0.38))',
            }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={() => handleRoleClick('student')}
            style={{
              ...styles.cardWrapper,
              ...styles.studentCardOffset,
              filter:
                selectedRoleState === 'student'
                  ? 'drop-shadow(0 0 24px rgba(255, 122, 0, 0.7)) brightness(1.05)'
                  : 'drop-shadow(0 14px 22px rgba(45, 25, 5, 0.28))',
            }}
          >
            <img
              src="/assets/roles/role_card_student.png"
              alt="Я Ученик"
              style={styles.cardImage}
              draggable={false}
            />

            {/* Sparkle burst badge on selection */}
            <AnimatePresence>
              {selectedRoleState === 'student' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.25, 1.1], opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={styles.sparkleBadgeStudent}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* CARD 2: УЧИТЕЛЬ (Teacher - Wise Owl in graduation cap) */}
          <motion.div
            initial={{ scale: 0.82, opacity: 0, y: 35 }}
            animate={{
              scale: selectedRoleState === 'teacher' ? 1.04 : 1,
              opacity: 1,
              y: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.24,
            }}
            whileHover={{
              scale: 1.035,
              y: -5,
              filter: 'drop-shadow(0 20px 28px rgba(59, 130, 246, 0.45))',
            }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={() => handleRoleClick('teacher')}
            style={{
              ...styles.cardWrapper,
              ...styles.teacherCardOffset,
              filter:
                selectedRoleState === 'teacher'
                  ? 'drop-shadow(0 0 24px rgba(59, 130, 246, 0.75)) brightness(1.05)'
                  : 'drop-shadow(0 14px 22px rgba(10, 25, 60, 0.28))',
            }}
          >
            <img
              src="/assets/roles/role_card_teacher.png"
              alt="Я Учитель"
              style={styles.cardImage}
              draggable={false}
            />

            {/* Sparkle burst badge on selection */}
            <AnimatePresence>
              {selectedRoleState === 'teacher' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.25, 1.1], opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={styles.sparkleBadgeTeacher}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ========================================================
            3. SUBTLE FOOTER: Safe Sferum MAX Badge
           ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.4 }}
          style={styles.footerBadge}
        >
          <ShieldCheck size={14} color="#10B981" />
          <span style={styles.footerText}>Вход через Сферум / MAX</span>
        </motion.div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundImage: "url('/assets/roles/role_bg.jpg')",
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    boxSizing: 'border-box',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    pointerEvents: 'none',
  },
  sunbeamGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 240, 180, 0.35) 0%, rgba(255, 255, 255, 0) 70%)',
    pointerEvents: 'none',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#FFF8E7',
    border: '2px solid #E5D2A8',
    boxShadow: '0 4px 12px rgba(45, 25, 5, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 30,
  },
  contentWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 14px',
    boxSizing: 'border-box',
    zIndex: 10,
  },
  signHeaderWrapper: {
    width: '100%',
    maxWidth: 320,
    display: 'flex',
    justifyContent: 'center',
    transformOrigin: 'top center',
    marginTop: -8,
    marginBottom: 4,
  },
  signHeaderImg: {
    width: '100%',
    height: 'auto',
    maxHeight: 155,
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 16px rgba(45, 25, 5, 0.22))',
  },
  cardsContainer: {
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '4px 0',
  },
  cardWrapper: {
    position: 'relative',
    cursor: 'pointer',
    transition: 'filter 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  studentCardOffset: {
    alignSelf: 'center',
    transform: 'translateX(-12px)',
  },
  teacherCardOffset: {
    alignSelf: 'center',
    transform: 'translateX(16px)',
  },
  cardImage: {
    width: '100%',
    maxWidth: 268,
    height: 'auto',
    display: 'block',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  sparkleBadgeStudent: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#FF7A00',
    borderRadius: '50%',
    padding: 8,
    boxShadow: '0 4px 14px rgba(255, 122, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBadgeTeacher: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#3B82F6',
    borderRadius: '50%',
    padding: 8,
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1.5px solid rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    padding: '6px 14px',
    boxShadow: '0 4px 14px rgba(45, 25, 5, 0.12)',
    marginTop: 6,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1F2937',
    letterSpacing: '0.2px',
  },
};
