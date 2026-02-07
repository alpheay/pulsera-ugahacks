'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Zap, Mountain, Satellite } from 'lucide-react';

interface MapTo3DTransitionProps {
  isTransitioning: boolean;
  onTransitionComplete: () => void;
  locationName?: string | null;
}

export function MapTo3DTransition({
  isTransitioning,
  onTransitionComplete,
  locationName
}: MapTo3DTransitionProps) {
  const [phase, setPhase] = useState<'zoom' | 'process' | 'reveal'>('zoom');
  const [loadingText, setLoadingText] = useState('Initializing analysis...');

  useEffect(() => {
    if (isTransitioning) {
      setPhase('zoom');
      setLoadingText('Capturing satellite imagery...');

      // Phase 1: Zoom effect (0-800ms)
      const timer1 = setTimeout(() => {
        setPhase('process');
        setLoadingText('Processing terrain data...');
      }, 800);

      // Update loading text
      const timer2 = setTimeout(() => {
        setLoadingText('Generating 3D topography...');
      }, 1400);

      const timer3 = setTimeout(() => {
        setLoadingText('Initializing analysis engine...');
      }, 2000);

      // Phase 2: Reveal (2500ms)
      const timer4 = setTimeout(() => {
        setPhase('reveal');
        setLoadingText('Launching visualization...');
      }, 2500);

      // Complete transition
      const timer5 = setTimeout(() => {
        onTransitionComplete();
      }, 3200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    }
  }, [isTransitioning, onTransitionComplete]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 bottom-0 right-[420px] z-50 flex items-center justify-center overflow-hidden"
        >
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0"
            initial={{ background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, rgba(226, 232, 240, 1) 100%)' }}
            animate={{
              background: phase === 'reveal'
                ? 'radial-gradient(circle at 50% 50%, rgba(236, 253, 245, 0.9) 0%, rgba(226, 232, 240, 1) 100%)'
                : 'radial-gradient(circle at 50% 50%, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 1) 100%)'
            }}
            transition={{ duration: 0.5 }}
          />

          {/* Zoom burst effect */}
          <AnimatePresence>
            {phase === 'zoom' && (
              <motion.div
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 20, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeIn' }}
                className="absolute w-32 h-32 rounded-full border-2 border-primary/50"
                style={{
                  background: 'radial-gradient(circle, rgba(74, 222, 128, 0.3) 0%, transparent 70%)'
                }}
              />
            )}
          </AnimatePresence>

          {/* Concentric rings animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-primary/20"
                initial={{ width: 100, height: 100, opacity: 0 }}
                animate={{
                  width: [100, 400 + i * 150],
                  height: [100, 400 + i * 150],
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>

          {/* Scanning lines */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'process' ? 1 : 0 }}
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                initial={{ y: -20 }}
                animate={{ y: ['0%', '100%'] }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.15,
                  repeat: Infinity,
                  ease: 'linear'
                }}
                style={{ top: `${i * 12}%` }}
              />
            ))}
          </motion.div>

          {/* Central content */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Animated icon */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(74, 222, 128, 0.4) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />

              {/* Icon container */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-green-500/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border border-dashed border-primary/30"
                />

                {phase === 'zoom' && <Satellite className="w-10 h-10 text-primary" />}
                {phase === 'process' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-10 h-10 text-primary" />
                  </motion.div>
                )}
                {phase === 'reveal' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    <Mountain className="w-10 h-10 text-primary" />
                  </motion.div>
                )}
              </div>

              {/* Orbiting particles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-primary"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: [0, Math.cos((i * Math.PI * 2) / 3) * 50, 0],
                    y: [0, Math.sin((i * Math.PI * 2) / 3) * 50, 0],
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              ))}
            </motion.div>

            {/* Loading text */}
            <motion.div
              className="text-center space-y-2"
              key={loadingText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Terrain Analysis
              </h2>
              <p className="text-sm text-muted-foreground">{loadingText}</p>
              {locationName && (
                <p className="text-xs text-primary/70 mt-1">{locationName}</p>
              )}
            </motion.div>

            {/* Progress dots */}
            <div className="flex gap-2">
              {['zoom', 'process', 'reveal'].map((p, i) => (
                <motion.div
                  key={p}
                  className={`w-2 h-2 rounded-full ${['zoom', 'process', 'reveal'].indexOf(phase) >= i
                      ? 'bg-primary'
                      : 'bg-muted'
                    }`}
                  animate={{
                    scale: phase === p ? [1, 1.3, 1] : 1,
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: phase === p ? Infinity : 0,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Corner decorations */}
          <motion.div
            className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          />
          <motion.div
            className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          />
          <motion.div
            className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          />
          <motion.div
            className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          />

          {/* Energy lines shooting to corners */}
          {phase === 'reveal' && (
            <>
              <motion.div
                className="absolute top-0 left-1/2 h-1/2 w-px bg-gradient-to-t from-primary to-transparent"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4 }}
                style={{ transformOrigin: 'bottom' }}
              />
              <motion.div
                className="absolute bottom-0 left-1/2 h-1/2 w-px bg-gradient-to-b from-primary to-transparent"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4 }}
                style={{ transformOrigin: 'top' }}
              />
              <motion.div
                className="absolute left-0 top-1/2 w-1/2 h-px bg-gradient-to-l from-primary to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4 }}
                style={{ transformOrigin: 'right' }}
              />
              <motion.div
                className="absolute right-0 top-1/2 w-1/2 h-px bg-gradient-to-r from-primary to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4 }}
                style={{ transformOrigin: 'left' }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MapTo3DTransition;
