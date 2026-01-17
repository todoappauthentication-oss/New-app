import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Replaced "Glass" with "Flat" components for AM Style
// Keeping file name compatible with imports, but changing implementation

interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export const AMCard: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  ...props 
}) => {
  return (
    <motion.div
      className={`bg-am-surface rounded-lg border border-am-divider shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const AMButton: React.FC<HTMLMotionProps<"button"> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ 
  children, 
  className = "", 
  variant = 'primary',
  ...props 
}) => {
  let colors = "";
  switch(variant) {
    case 'primary':
      colors = "bg-am-primary text-black hover:bg-am-primaryDark";
      break;
    case 'secondary':
      colors = "bg-am-divider text-white hover:bg-gray-700";
      break;
    case 'danger':
      colors = "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20";
      break;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={`relative px-4 py-3 rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${colors} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Legacy exports to prevent breaking if other files import them (though we update App.tsx)
export const GlassPanel = AMCard;
export const GlassButton = AMButton;
