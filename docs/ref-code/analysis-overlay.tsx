'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite,
  Database,
  Cpu,
  Zap,
  DollarSign,
  CheckCircle2,
  Loader2,
  Mountain,
  Sun,
  Wind,
  Battery,
  MapPin,
  TrendingUp,
  ArrowLeft,
  X,
  Save,
  Sparkles,
  type LucideIcon
} from 'lucide-react';
import type { AnalysisPhase } from '@/components/agent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnalysisOverlayProps {
  phase: AnalysisPhase;
  isAnalyzing: boolean;
  progress: number;
  locationName?: string | null;
  areaAcres?: number;
  onBack?: () => void;
  onStop?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  className?: string;
}

const phases: {
  id: AnalysisPhase;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
    {
      id: 'data-collection',
      label: 'Data Collection',
      icon: Satellite,
      description: 'Fetching satellite imagery & terrain data'
    },
    {
      id: 'constraint-integration',
      label: 'Constraint Analysis',
      icon: Database,
      description: 'Mapping boundaries & exclusion zones'
    },
    {
      id: 'technology-optimization',
      label: 'Technology Optimization',
      icon: Cpu,
      description: 'Evaluating solar & wind potential'
    },
    {
      id: 'system-design',
      label: 'System Design',
      icon: Zap,
      description: 'Computing optimal equipment layout'
    },
    {
      id: 'financial-modeling',
      label: 'Financial Modeling',
      icon: DollarSign,
      description: 'Calculating costs & projections'
    },
  ];

function PhaseIndicator({
  phaseInfo,
  isActive,
  isComplete,
  index
}: {
  phaseInfo: typeof phases[0];
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  const IconComponent = phaseInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
        isActive && "bg-white/85 border-primary/30 shadow-[0_12px_30px_-22px_rgba(16,185,129,0.45)]",
        isComplete && !isActive && "bg-white/70 border-emerald-200/50 opacity-70",
        !isActive && !isComplete && "bg-white/40 border-transparent opacity-35"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
        isActive && "bg-primary/15 text-primary ring-1 ring-primary/30",
        isComplete && !isActive && "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-200/70",
        !isActive && !isComplete && "bg-slate-100 text-slate-500"
      )}>
        {isComplete && !isActive ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <IconComponent className="w-5 h-5" />
          </motion.div>
        ) : (
          <IconComponent className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={[
          "font-medium text-sm",
          isActive ? "text-primary" : "",
          isComplete && !isActive ? "text-emerald-600" : "",
          !isActive && !isComplete ? "text-muted-foreground" : ""
        ].filter(Boolean).join(" ")}>
          {phaseInfo.label}
        </p>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-muted-foreground mt-0.5"
          >
            {phaseInfo.description}
          </motion.p>
        )}
      </div>

      {isActive && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-primary"
        />
      )}
    </motion.div>
  );
}

function MetricCard({
  icon: IconEl,
  label,
  value,
  suffix,
  color,
  delay
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 20 }}
      className="bg-white/80 backdrop-blur-md border border-emerald-100/70 rounded-xl p-4 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <IconEl className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </motion.div>
  );
}

export function AnalysisOverlay({
  phase,
  isAnalyzing,
  progress,
  locationName,
  areaAcres,
  onBack,
  onStop,
  onSave,
  isSaving,
  className
}: AnalysisOverlayProps) {
  const currentPhaseIndex = phases.findIndex(p => p.id === phase);
  const isComplete = phase === 'complete';

  return (
    <div className={cn("absolute inset-0 z-10 pointer-events-none", className)}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto">
        <div className="flex items-center justify-between">
          {/* Left - Back button and location */}
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm border border-emerald-100/60 shadow-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/85 backdrop-blur-md border border-emerald-100/60 rounded-2xl px-5 py-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center">
                  <Mountain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Terrain Analysis</p>
                  {locationName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {locationName}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stop button removed - using sidebar button only */}
        </div>
      </div>

      {/* Bottom Stats - Show after technology phase */}
      <AnimatePresence>
        {(currentPhaseIndex >= 2 || isComplete) && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-6 left-0 right-0 pointer-events-auto flex justify-center"
          >
            <div className="flex gap-3">
              <MetricCard
                icon={Sun}
                label="Solar Potential"
                value="1,927"
                suffix="kWh/kW/yr"
                color="bg-amber-500/20 text-amber-400"
                delay={0}
              />
              <MetricCard
                icon={Wind}
                label="Wind Speed"
                value="14.3"
                suffix="mph avg"
                color="bg-blue-500/20 text-blue-400"
                delay={0.1}
              />
              <MetricCard
                icon={Battery}
                label="System Size"
                value="5,000"
                suffix="kW"
                color="bg-green-500/20 text-green-400"
                delay={0.2}
              />
              <MetricCard
                icon={TrendingUp}
                label="Annual Output"
                value="9,636"
                suffix="MWh"
                color="bg-purple-500/20 text-purple-400"
                delay={0.3}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning indicator */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 right-6 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-white/85 backdrop-blur-md border border-emerald-100/60 rounded-full px-4 py-2 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Processing terrain data...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AnalysisOverlay;
