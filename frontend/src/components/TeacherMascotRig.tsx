import React from 'react';
import { motion } from 'framer-motion';

interface TeacherMascotRigProps {
  width?: number | string;
  className?: string;
  interactive?: boolean;
}

/**
 * TeacherMascotRig
 * Puppet-rigged Sprint (the fox mascot as teacher) with animated head and pointing arm.
 * Uses layers extracted from design assets:
 * - Body: holding green textbook
 * - Head: expressive face with green scarf collar
 * - Arm: right hand holding wooden pointer stick pointing upward
 */
export const TeacherMascotRig: React.FC<TeacherMascotRigProps> = ({
  width = 130,
  className = '',
  interactive = true,
}) => {
  // Proportions based on 728 x 772 bounding box:
  // Container: 728 x 772
  // Body: x=0, y=360, w=531, h=412 -> left: 0%, top: 46.63%, width: 72.94%
  // Head: x=145, y=0, w=450, h=415 -> left: 19.92%, top: 0%, width: 61.81%
  // Arm:  x=480, y=260, w=248, h=311 -> left: 65.93%, top: 33.68%, width: 34.07%

  return (
    <div
      style={{
        position: 'relative',
        width,
        aspectRatio: '728 / 772',
        userSelect: 'none',
        pointerEvents: 'none',
        flexShrink: 0,
      }}
      className={className}
    >
      {/* 1. Arm with wooden pointer stick (under body shoulder fold, full forearm visible) */}
      <motion.img
        src="/assets/teacher/sprint_teacher_arm.png"
        alt="Teacher Sprint Pointer Arm"
        style={{
          position: 'absolute',
          left: '65.93%',
          top: '33.68%',
          width: '34.07%',
          height: 'auto',
          transformOrigin: '28% 78%',
          zIndex: 5,
          pointerEvents: 'none',
        }}
        animate={{
          rotate: [-4, 6, -4],
          y: [0, -2, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.2,
          ease: 'easeInOut',
        }}
        whileHover={interactive ? { rotate: 14, scale: 1.03 } : undefined}
      />

      {/* 2. Body layer (behind chin, connected to arm shoulder) */}
      <motion.img
        src="/assets/teacher/sprint_teacher_body.png"
        alt="Teacher Sprint Body"
        style={{
          position: 'absolute',
          left: '0%',
          top: '46.63%',
          width: '72.94%',
          height: 'auto',
          zIndex: 10,
          pointerEvents: 'none',
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* 3. Head with neck pivot (sits over scarf collar) */}
      <motion.img
        src="/assets/teacher/sprint_teacher_head.png"
        alt="Teacher Sprint Head"
        style={{
          position: 'absolute',
          left: '19.92%',
          top: '0%',
          width: '61.81%',
          height: 'auto',
          transformOrigin: '46% 99%',
          zIndex: 20,
          pointerEvents: 'none',
        }}
        animate={{
          rotate: [-2, 3, -2],
          y: [0, -2, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.6,
          ease: 'easeInOut',
        }}
        whileHover={interactive ? { rotate: -6, scale: 1.04 } : undefined}
      />
    </div>
  );
};

export default TeacherMascotRig;
