import React from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';
import { haptics } from '../services/haptics';

interface TeacherHomeScreenProps {
  onOpenClasses: () => void;
  onOpenQuizzes: () => void;
}

export default function TeacherHomeScreen({
  onOpenClasses,
  onOpenQuizzes,
}: TeacherHomeScreenProps) {
  return (
    <div style={styles.container}>
      {/* Title */}
      <div style={styles.headerBox}>
        <h1 style={styles.title}>ЛисийКвиз</h1>
        <p style={styles.subtitle}>Панель учителя</p>
      </div>

      {/* Two Main Primary Buttons */}
      <div style={styles.buttonsContainer}>
        {/* Button 1: Классы */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            haptics.impact('medium');
            onOpenClasses();
          }}
          style={styles.btnClasses}
        >
          <div style={styles.iconCircleBlue}>
            <Users size={32} color="#60A5FA" />
          </div>
          <span style={styles.btnTitle}>Классы</span>
        </motion.button>

        {/* Button 2: Викторины */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            haptics.impact('medium');
            onOpenQuizzes();
          }}
          style={styles.btnQuizzes}
        >
          <div style={styles.iconCircleOrange}>
            <Sparkles size={32} color="#FBBF24" />
          </div>
          <span style={styles.btnTitle}>Викторины</span>
        </motion.button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  headerBox: {
    textAlign: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: '0 0 6px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    margin: 0,
    fontWeight: 600,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 380,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  btnClasses: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 20px',
    borderRadius: 22,
    backgroundColor: '#131F38',
    border: '2px solid rgba(59, 130, 246, 0.45)',
    borderBottom: '5px solid #1D4ED8',
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.4)',
    touchAction: 'manipulation',
  },
  btnQuizzes: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 20px',
    borderRadius: 22,
    backgroundColor: '#261B12',
    border: '2px solid rgba(245, 158, 11, 0.45)',
    borderBottom: '5px solid #D97706',
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.4)',
    touchAction: 'manipulation',
  },
  iconCircleBlue: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleOrange: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#FFFFFF',
    letterSpacing: '-0.3px',
  },
};
