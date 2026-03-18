import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import {
  Droplets, Zap, Cloud, Trophy, Leaf,
  RefreshCw, Send, ZapOff, Clock,
} from 'lucide-react';

// --- Types ---
type ViewMode = 'simulation' | 'daily' | 'weekly' | 'monthly';
type AIModel =
  | 'ChatGPT' | 'Microsoft Copilot' | 'Google Gemini' | 'Claude'
  | 'Perplexity' | 'Grok' | 'NotebookLM' | 'DALL·E'
  | 'Canva AI' | 'Runway' | 'Pika' | 'Notion AI';
type WidgetSize = 'small' | 'medium' | 'large' | 'xlarge';

interface Stats { prompts: number; water: number; energy: number; }
interface LightningPaths { main: string; branch: string; }

// --- Constants ---
const MODEL_MULTIPLIERS: Record<AIModel, number> = {
  'ChatGPT': 1.8, 'Microsoft Copilot': 1.8, 'Google Gemini': 1.2, 'Claude': 1.4,
  'Perplexity': 1.3, 'Grok': 1.6, 'NotebookLM': 1.2, 'DALL·E': 2.5,
  'Canva AI': 2.0, 'Runway': 3.5, 'Pika': 3.5, 'Notion AI': 1.2,
};
const BASE_WATER_PER_PROMPT = 0.5;
const BASE_ENERGY_PER_PROMPT = 0.003;

const ECO_TIPS = [
  "Bruk AI smart og riktig – kvalitet over kvantitet.",
  "Skriv detaljerte prompter fremfor mange små for å redusere energibruk.",
  "Gjør enkle oppgaver selv uten AI når det er mulig.",
  "Gjenbruk svar i stedet for å generere nye prompter.",
  "Samle flere spørsmål i én grundig melding.",
];

const MOCK_DATA: Record<Exclude<ViewMode, 'simulation'>, Stats> = {
  daily: { prompts: 12, water: 6.5, energy: 0.04 },
  weekly: { prompts: 84, water: 45.2, energy: 0.28 },
  monthly: { prompts: 360, water: 194.0, energy: 1.2 },
};

const SCHOOL_PROMPTS_BASE: Record<string, number> = {
  'UiB': 12, 'NHH': 14, 'BI': 16, 'UiO': 18,
  'NTNU': 22, 'UiS': 15, 'HVL': 13, 'OsloMet': 17,
};

const LAST_MONTH_LEADERBOARD = [
  { name: 'UiB', impact: 1.2 }, { name: 'HVL', impact: 1.4 },
  { name: 'NHH', impact: 1.5 }, { name: 'UiS', impact: 1.8 },
  { name: 'BI', impact: 2.1 }, { name: 'OsloMet', impact: 2.3 },
  { name: 'UiO', impact: 2.5 }, { name: 'NTNU', impact: 3.2 },
];

// Simple leaf shape: teardrop pointed at top, rounded at bottom
const makeLeafPath = (r: number): string => {
  const w = r * 0.60;
  return [
    `M 0,${(-r).toFixed(1)}`,
    `C ${(w*1.1).toFixed(1)},${(-r*0.35).toFixed(1)} ${w.toFixed(1)},${(r*0.35).toFixed(1)} 0,${(r*0.72).toFixed(1)}`,
    `C ${(-w).toFixed(1)},${(r*0.35).toFixed(1)} ${(-w*1.1).toFixed(1)},${(-r*0.35).toFixed(1)} 0,${(-r).toFixed(1)}`,
    'Z',
  ].join(' ');
};

// 4 concentric rings, round-robin interleaved so leaves fall from ALL over as stress rises
const LEAF_RING_DATA = (() => {
  const rings = [
    { r: 50, n: 28, sizes: [11,7,13,9,15,8,12,10,14,7,11,13,9,15,8,12,7,14,10,11,13,7,9,15,12,8,14,10] },
    { r: 38, n: 22, sizes: [10,6,12,8,14,9,11,7,13,10,8,12,6,14,9,11,7,13,10,8,12,9] },
    { r: 26, n: 16, sizes: [9,5,11,7,13,8,10,6,12,9,7,11,5,13,8,10] },
    { r: 14, n: 10, sizes: [7,10,5,12,8,6,11,9,5,8] },
  ];
  const perRing = rings.map(({ r, n, sizes }, ri) =>
    Array.from({ length: n }, (_, i) => {
      const angle = (i / n + ri * 0.11) * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.86;
      return { x, y, r: sizes[i], path: makeLeafPath(sizes[i]) };
    })
  );
  const result: { x: number; y: number; r: number; path: string }[] = [];
  const maxN = Math.max(...perRing.map(ring => ring.length));
  for (let i = 0; i < maxN; i++) {
    for (const ring of perRing) {
      if (i < ring.length) result.push(ring[i]);
    }
  }
  return result;
})();
const LEAF_COUNT = LEAF_RING_DATA.length;
const LEAF_DATA = LEAF_RING_DATA;

const generateLightningPaths = (): LightningPaths => {
  const pts: [number, number][] = [[0, -135]];
  let cx = 0;
  for (let i = 1; i <= 12; i++) {
    cx += (Math.random() - 0.5) * 22;
    pts.push([cx, -135 + (i / 12) * 68]);
  }
  const main = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const si = Math.floor(pts.length * 0.4);
  const [bx0, by0] = pts[si];
  const bPts: [number, number][] = [[bx0, by0]];
  let bx = bx0, by = by0;
  for (let i = 0; i < 5; i++) { bx += Math.random() * 14 + 7; by += 9 + Math.random() * 5; bPts.push([bx, by]); }
  const branch = bPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  return { main, branch };
};

// --- Base components ---

const LightningStrike = ({ active, paths }: { active: boolean; paths: LightningPaths | null }) => (
  <AnimatePresence>
    {active && paths && (
      <>
        <motion.div
          initial={{ opacity: 0.85 }} animate={{ opacity: [0.85, 0.15, 0.6, 0] }} exit={{ opacity: 0 }}
          transition={{ duration: 0.38, times: [0, 0.2, 0.5, 1] }}
          className="absolute inset-0 bg-white z-30 pointer-events-none"
        />
        <motion.svg
          viewBox="-100 -145 200 165" initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0.9, 1, 0.55, 0] }} exit={{ opacity: 0 }}
          transition={{ duration: 0.55, times: [0, 0.1, 0.3, 0.7, 1] }}
          className="absolute inset-0 w-full h-full z-20 pointer-events-none" style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="lightning-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d={paths.main} stroke="rgba(255,240,100,0.55)" strokeWidth="10" fill="none" filter="url(#lightning-glow)" strokeLinecap="round" strokeLinejoin="round" />
          <path d={paths.branch} stroke="rgba(255,240,100,0.45)" strokeWidth="7" fill="none" filter="url(#lightning-glow)" strokeLinecap="round" strokeLinejoin="round" />
          <path d={paths.main} stroke="#fffde7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={paths.branch} stroke="#fffde7" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </>
    )}
  </AnimatePresence>
);

const FallingLeaf = ({ id }: { id: number; key?: React.Key }) => {
  const startX = (id * 89.7 % 100) - 50;
  const wobble = (id * 63.1 % 60) - 30;
  const initRotate = (id * 137.5) % 360;
  const leafColors = ['#4ade80', '#86efac', '#bbf7d0', '#fbbf24', '#fb923c', '#a3e635', '#34d399'];
  const color = leafColors[Math.floor(id * 17.3 % leafColors.length)];
  return (
    <motion.div
      initial={{ y: -10, x: startX, opacity: 1, rotate: initRotate, scale: 1 }}
      animate={{ y: 175, x: startX + wobble, opacity: 0, rotate: initRotate + 360, scale: 0.65 }}
      transition={{ duration: 2.3, ease: 'easeIn' }}
      className="absolute top-1/3 left-1/2 z-10 pointer-events-none"
      style={{ width: '11px', height: '7px', backgroundColor: color, borderRadius: '60% 0 60% 0', marginLeft: '-5.5px' }}
    />
  );
};

// Tree SVG path content — organic trunk + leaf shapes
const TreePaths = ({ stress }: { stress: number }) => {
  const trunkColor = stress > 0.85 ? '#451a03' : '#FFFFFF';
  return (
    <>
      {/* Organic trunk — wider at base, narrows toward branch fork */}
      <motion.path
        d="M -10 78 C -9 55, -5 28, -4 8 C -3 3, 3 3, 4 8 C 5 28, 9 55, 10 78 Z"
        animate={{ fill: trunkColor }}
        transition={{ duration: 1 }}
      />
      {/* Main branches */}
      <motion.path
        d="M -3 8 C -10 2, -22 -8, -42 -36 M 3 8 C 10 2, 22 -8, 42 -36 M 0 6 C 0 -10, 1 -30, 1 -60"
        animate={{ stroke: trunkColor }}
        strokeWidth="5.5" fill="none" strokeLinecap="round"
        transition={{ duration: 1 }}
      />
      {/* Sub-branches */}
      <motion.path
        d="M -26 -20 C -29 -29, -35 -38, -31 -50 M 26 -20 C 29 -29, 35 -38, 31 -50"
        animate={{ stroke: trunkColor }}
        strokeWidth="3.5" fill="none" strokeLinecap="round"
        transition={{ duration: 1 }}
      />
      {/* Leaves — teardrop shapes rotated to point outward from crown center */}
      <g transform="translate(0, -42)">
        {LEAF_DATA.map((leaf, i) => {
          const isDead = i > LEAF_COUNT * (1 - stress);
          // +90 so tip of leaf (pointing up at 0°) aligns with radial outward direction
          const radialAngle = Math.atan2(leaf.y, leaf.x) * (180 / Math.PI);
          const rotation = radialAngle + 90 + ((i * 41) % 56) - 28;
          return (
            <motion.path
              key={i}
              d={leaf.path}
              transform={`translate(${leaf.x.toFixed(1)},${leaf.y.toFixed(1)}) rotate(${rotation.toFixed(1)})`}
              fill="#A7D8C3"
              animate={{ opacity: isDead ? 0 : 0.92 }}
              transition={{ duration: 0.7 }}
            />
          );
        })}
      </g>
    </>
  );
};

// Full-size tree (for large/xlarge)
const TreeVisualizer = ({ stress, lightningActive, fallingLeaves, lightningPaths, className = 'h-72' }: {
  stress: number; lightningActive: boolean; fallingLeaves: number[];
  lightningPaths: LightningPaths | null; className?: string;
}) => (
  <motion.div
    className={`relative w-full ${className} flex items-center justify-center`}
    animate={lightningActive ? { x: [0, -6, 5, -4, 3, -1, 0], y: [0, -3, 2, -1, 1, 0] } : { x: 0, y: 0 }}
    transition={{ duration: 0.32, ease: 'easeOut' }}
  >
    <LightningStrike active={lightningActive} paths={lightningPaths} />
    {fallingLeaves.map(id => <FallingLeaf key={id} id={id} />)}
    <svg viewBox="-100 -100 200 200" className="w-full h-full"><TreePaths stress={stress} /></svg>
    <div className="absolute bottom-2 left-0 right-0 text-center">
      <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
        <Leaf size={12} className={stress > 0.7 ? 'text-orange-400' : 'text-uib-mint'} />
        <span className="text-[10px] uppercase tracking-widest text-white font-bold">
          Treets helse: {Math.max(0, Math.round((1 - stress) * 100))}%
        </span>
      </div>
    </div>
  </motion.div>
);

// --- Size picker ---
const SizePickerIcon = ({ size, active }: { size: WidgetSize; active: boolean }) => {
  const color = active ? 'white' : 'rgba(255,255,255,0.45)';
  const icons: Record<WidgetSize, React.ReactNode> = {
    small: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill={color}>
        <rect x="2" y="2" width="7" height="7" rx="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    medium: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill={color}>
        <rect x="2" y="2" width="7" height="16" rx="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    large: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill={color}>
        <rect x="2" y="2" width="7" height="16" rx="1.5"/>
        <rect x="11" y="2" width="7" height="16" rx="1.5"/>
      </svg>
    ),
    xlarge: (
      <svg viewBox="0 0 22 20" width="24" height="22" fill={color}>
        <rect x="2" y="2" width="14" height="16" rx="1.5"/>
        <rect x="18" y="2" width="2" height="16" rx="1"/>
      </svg>
    ),
  };
  return <>{icons[size]}</>;
};

// --- Widget layouts ---

interface WidgetProps {
  stress: number; stats: Stats; lightningActive: boolean;
  fallingLeaves: number[]; lightningPaths: LightningPaths | null;
  viewMode: ViewMode; selectedModel: AIModel; manualInput: string; tipIndex: number;
  onSimulate: () => void; onReset: () => void;
  onViewChange: (m: ViewMode) => void;
  onModelChange: (m: AIModel) => void;
  onManualInputChange: (v: string) => void;
  leaderboard: { name: string; impact: number }[];
}

// SMALL: 170×170 — always shows today's daily consumption in the tree
const SmallWidget = ({ lightningActive, fallingLeaves, lightningPaths }: WidgetProps) => {
  const dailyPrompts = MOCK_DATA.daily.prompts;   // 12
  const dailyEnergy = MOCK_DATA.daily.energy;     // 0.040
  // Tree stress based on daily usage (max ~50 prompts/day)
  const dailyStress = Math.min(dailyPrompts / 50, 1);
  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 shrink-0">
        <div className="flex items-center gap-1">
          <Leaf size={7} className="text-uib-mint" />
          <span className="text-white/80 text-[6.5px] font-black uppercase tracking-widest">AI-treet</span>
        </div>
        <span className={`text-[6.5px] font-black uppercase tracking-widest ${dailyStress > 0.7 ? 'text-orange-400' : 'text-uib-mint'}`}>
          {Math.max(0, Math.round((1 - dailyStress) * 100))}%
        </span>
      </div>

      {/* Tree shows daily stress level */}
      <motion.div
        className="flex-1 relative"
        animate={lightningActive ? { x: [0, -4, 3, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LightningStrike active={lightningActive} paths={lightningPaths} />
        {fallingLeaves.map(id => <FallingLeaf key={id} id={id} />)}
        <svg viewBox="-120 -130 240 260" className="w-full h-full">
          <TreePaths stress={dailyStress} />
        </svg>
      </motion.div>

      {/* Daily stats — very small, one line */}
      <div className="shrink-0 pb-2.5 px-3 flex items-center gap-1.5">
        <Send size={6} className="text-white/35 shrink-0" />
        <span className="text-white/55 text-[6px] font-semibold">{dailyPrompts} prompts</span>
        <span className="text-white/25 text-[6px]">·</span>
        <Zap size={6} className="text-white/35 shrink-0" />
        <span className="text-white/55 text-[6px] font-semibold">{dailyEnergy.toFixed(3)} kWh</span>
      </div>
    </div>
  );
};

// MEDIUM: 358×170 — tree left + stats right
const MediumWidget = ({ stress, stats, lightningActive, fallingLeaves, lightningPaths, viewMode, selectedModel, manualInput, onSimulate, onModelChange, onManualInputChange }: WidgetProps) => (
  <div className="w-full h-full flex overflow-hidden relative">
    {/* Tree side */}
    <div className="w-[45%] relative flex items-center justify-center">
      <motion.div
        className="w-full h-full relative"
        animate={lightningActive ? { x: [0, -5, 4, -3, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LightningStrike active={lightningActive} paths={lightningPaths} />
        {fallingLeaves.map(id => <FallingLeaf key={id} id={id} />)}
        <svg viewBox="-75 -95 150 165" className="w-full h-full">
          <TreePaths stress={stress} />
        </svg>
      </motion.div>
      {/* Health badge over tree */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <span className="text-[7px] text-white/50 font-bold uppercase tracking-widest">
          {Math.max(0, Math.round((1 - stress) * 100))}%
        </span>
      </div>
    </div>
    {/* Stats side */}
    <div className="w-[55%] flex flex-col justify-between p-4 py-5">
      <div>
        <p className="text-white/50 text-[7px] font-bold uppercase tracking-widest">AI-treet</p>
        <p className="text-white font-black text-xl leading-none mt-0.5">
          {Math.max(0, Math.round((1 - stress) * 100))}<span className="text-sm font-bold text-white/60">%</span>
        </p>
        <p className="text-uib-mint text-[7px] font-bold uppercase tracking-widest">helse</p>
      </div>
      <div className="space-y-1">
        {[
          { icon: <Send size={8}/>, label: `${stats.prompts} prompter` },
          { icon: <Droplets size={8}/>, label: `${stats.water.toFixed(1)} L` },
          { icon: <Zap size={8}/>, label: `${stats.energy.toFixed(3)} kWh` },
        ].map(({ icon, label }, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-white/40">{icon}</span>
            <span className="text-white/70 text-[9px] font-semibold">{label}</span>
          </div>
        ))}
      </div>
      {viewMode === 'simulation' && (
        <button onClick={onSimulate}
          className="bg-uib-mint text-uib-burgundy font-black text-[8px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1 hover:bg-white transition-all active:scale-95 w-fit">
          <Zap size={9}/> Simuler
        </button>
      )}
    </div>
  </div>
);

// LARGE: 358×390 — full tree + stats + controls
const LargeWidget = ({ stress, stats, lightningActive, fallingLeaves, lightningPaths, viewMode, selectedModel, manualInput, tipIndex, onSimulate, onReset, onModelChange, onManualInputChange, onViewChange }: WidgetProps) => (
  <div className="w-full h-full flex flex-col overflow-hidden relative p-5">
    {/* Top bar */}
    <div className="flex items-center justify-between mb-1 shrink-0">
      <div>
        <p className="text-white font-black text-sm">AI-treet</p>
        <p className="text-white/40 text-[8px] font-semibold">AI-treet</p>
      </div>
      <div className="flex items-center gap-1.5">
        {viewMode === 'simulation' && (
          <select value={selectedModel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onModelChange(e.target.value as AIModel)}
            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-[8px] font-bold focus:outline-none text-white appearance-none cursor-pointer hover:bg-white/20">
            {Object.keys(MODEL_MULTIPLIERS).map(m => <option key={m} value={m} className="text-uib-burgundy">{m}</option>)}
          </select>
        )}
        <button onClick={viewMode === 'simulation' ? onReset : () => onViewChange('simulation')}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <RefreshCw size={13} className="text-uib-mint"/>
        </button>
      </div>
    </div>
    {/* Tree */}
    <TreeVisualizer stress={stress} lightningActive={lightningActive} fallingLeaves={fallingLeaves} lightningPaths={lightningPaths} className="flex-1 min-h-0"/>
    {/* Stats */}
    <div className="grid grid-cols-3 gap-2 mt-3 shrink-0">
      {viewMode === 'simulation' ? (
        <div className="bg-white rounded-xl p-2.5">
          <Send size={11} className="text-uib-burgundy mb-1"/>
          <p className="text-[7px] font-bold uppercase text-uib-burgundy/40 tracking-wider">Prompter</p>
          <input type="number" value={manualInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onManualInputChange(e.target.value)}
            className="w-full bg-transparent text-sm font-black text-uib-burgundy focus:outline-none border-b border-uib-burgundy/20"/>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-2.5">
          <Send size={11} className="text-uib-burgundy mb-1"/>
          <p className="text-[7px] font-bold uppercase text-uib-burgundy/40 tracking-wider">Prompter</p>
          <p className="text-sm font-black text-uib-burgundy">{stats.prompts}</p>
        </div>
      )}
      <div className="bg-white rounded-xl p-2.5">
        <Droplets size={11} className="text-uib-burgundy mb-1"/>
        <p className="text-[7px] font-bold uppercase text-uib-burgundy/40 tracking-wider">Vann (L)</p>
        <p className="text-sm font-black text-uib-burgundy">{stats.water.toFixed(1)}</p>
      </div>
      <div className="bg-white rounded-xl p-2.5">
        <Zap size={11} className="text-uib-burgundy mb-1"/>
        <p className="text-[7px] font-bold uppercase text-uib-burgundy/40 tracking-wider">kWh</p>
        <p className="text-sm font-black text-uib-burgundy">{stats.energy.toFixed(3)}</p>
      </div>
    </div>
    {viewMode === 'simulation' && (
      <button onClick={onSimulate}
        className="mt-2 w-full bg-uib-mint text-uib-burgundy font-black text-[10px] uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-white transition-all active:scale-[0.98] shrink-0">
        <Zap size={11}/> Simuler
      </button>
    )}
    <p className="text-center text-white/35 text-[7px] font-medium mt-2 leading-relaxed line-clamp-1 shrink-0">
      {ECO_TIPS[tipIndex]}
    </p>
  </div>
);

// XLARGE: original full dashboard
const XLargeWidget = ({ stress, stats, lightningActive, fallingLeaves, lightningPaths, viewMode, selectedModel, manualInput, tipIndex, onSimulate, onReset, onModelChange, onManualInputChange, onViewChange, leaderboard }: WidgetProps) => (
  <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className="lg:col-span-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-uib-burgundy tracking-tight">AI-treet</h1>
          <p className="text-slate-500 text-sm font-medium">AI AI AI, brukte jeg så mye energi?!</p>
        </div>
        <div className="bg-slate-200 p-1 rounded-2xl flex gap-1 overflow-x-auto flex-wrap sm:flex-nowrap">
          {(['simulation', 'daily', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => onViewChange(mode)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === mode ? 'bg-white text-uib-burgundy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {mode === 'simulation' ? 'Hurtigsjekk' : mode === 'daily' ? 'Daglig' : mode === 'weekly' ? 'Ukentlig' : 'Månedlig'}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-uib-burgundy uib-gradient rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"/>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-uib-mint rounded-full blur-3xl"/>
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                <Clock size={12} className="text-uib-mint"/>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {viewMode === 'simulation' ? 'Hurtigsjekk' : `${viewMode === 'daily' ? 'Daglig' : viewMode === 'weekly' ? 'Ukentlig' : 'Månedlig'} visning`}
                </span>
              </div>
              {viewMode === 'simulation' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                  <select value={selectedModel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onModelChange(e.target.value as AIModel)}
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-[9px] font-bold focus:outline-none text-white appearance-none cursor-pointer hover:bg-white/20 transition-colors">
                    {Object.keys(MODEL_MULTIPLIERS).map(m => <option key={m} value={m} className="text-uib-burgundy">{m}</option>)}
                  </select>
                  <button onClick={onSimulate} className="bg-uib-mint text-uib-burgundy font-bold py-1 px-3 rounded-lg hover:bg-white transition-all active:scale-[0.95] flex items-center gap-1 text-[9px] shadow-sm">
                    <Zap size={10}/> Simuler
                  </button>
                </motion.div>
              )}
            </div>
            <button onClick={viewMode === 'simulation' ? onReset : () => onViewChange('simulation')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <RefreshCw size={16} className="text-uib-mint"/>
            </button>
          </div>
          <TreeVisualizer stress={stress} lightningActive={lightningActive} fallingLeaves={fallingLeaves} lightningPaths={lightningPaths}/>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/10">
            {viewMode === 'simulation' ? (
              <div className="bg-white p-4 rounded-2xl border border-white/20 transition-transform hover:scale-[1.02] shadow-sm">
                <div className="text-uib-burgundy mb-2"><Send size={14}/></div>
                <label className="text-[8px] font-bold uppercase text-uib-burgundy/40 tracking-wider mb-1 block">Prompter</label>
                <input type="number" value={manualInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onManualInputChange(e.target.value)}
                  className="w-full bg-transparent text-base font-black text-uib-burgundy focus:outline-none border-b border-uib-burgundy/20"/>
              </div>
            ) : (
              <InnerMetricCard icon={<Send size={14}/>} label="Prompter" value={stats.prompts.toString()}/>
            )}
            <InnerMetricCard icon={<Droplets size={14}/>} label="Vann (L)" value={stats.water.toFixed(1)}/>
            <InnerMetricCard icon={<Zap size={14}/>} label="Energi (kWh)" value={stats.energy.toFixed(3)}/>
          </div>
        </div>
      </div>
    </div>
    <div className="lg:col-span-4 space-y-6">
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-uib-burgundy"/>
            <h2 className="font-bold text-xs uppercase tracking-widest">Toppliste</h2>
          </div>
          {viewMode === 'simulation' ? (
            <span className="text-[9px] font-black bg-uib-burgundy text-white px-2 py-1 rounded-md uppercase animate-pulse">Forrige måned</span>
          ) : (
            <span className="text-[9px] font-bold bg-slate-100 px-2 py-1 rounded-md text-slate-400 uppercase">
              {viewMode === 'daily' ? 'Daglig' : viewMode === 'weekly' ? 'Ukentlig' : 'Månedlig'}
            </span>
          )}
        </div>
        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
          {leaderboard.map((school, i) => (
            <motion.div layout key={school.name}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all ${school.name === 'UiB' ? 'bg-uib-mint/20 border border-uib-mint/30' : 'bg-slate-50 border border-slate-100'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${i === 0 ? 'bg-uib-burgundy text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
                <span className="text-xs font-bold text-slate-700">{school.name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">{school.impact.toFixed(3)} kWh</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Snitt/Student</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="bg-uib-mint/10 rounded-[2.5rem] p-6 border border-uib-mint/20 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <Leaf size={18} className="text-uib-burgundy"/>
          <h2 className="font-bold text-xs uppercase tracking-widest text-uib-burgundy">Miljøtips</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p key={tipIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
              className="text-uib-burgundy font-black italic text-lg leading-tight text-center">
              "{ECO_TIPS[tipIndex]}"
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex justify-center gap-1.5 mt-8">
          {ECO_TIPS.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === tipIndex ? 'w-6 bg-uib-burgundy' : 'w-1.5 bg-uib-burgundy/20'}`}/>
          ))}
        </div>
      </div>
      <div className="px-6 text-center">
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
          Den skjulte kostnaden ved AI: Én forespørsel kan bruke opptil 500 ml vann til kjøling av datasentre.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Cloud size={14} className="text-slate-200"/>
          <ZapOff size={14} className="text-slate-200"/>
          <Droplets size={14} className="text-slate-200"/>
        </div>
      </div>
    </div>
  </div>
);

// --- Main App ---
export default function App() {
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('large');
  const [viewMode, setViewMode] = useState<ViewMode>('simulation');
  const [stats, setStats] = useState<Stats>({ prompts: 0, water: 0, energy: 0 });
  const [selectedModel, setSelectedModel] = useState<AIModel>('ChatGPT');
  const [manualInput, setManualInput] = useState<string>('1');
  const [lightningActive, setLightningActive] = useState(false);
  const [lightningPaths, setLightningPaths] = useState<LightningPaths | null>(null);
  const [fallingLeaves, setFallingLeaves] = useState<number[]>([]);
  const [tipIndex, setTipIndex] = useState(0);

  const stress = useMemo(() => {
    const maxPrompts = viewMode === 'monthly' ? 500 : viewMode === 'weekly' ? 150 : 50;
    return Math.min(stats.prompts / maxPrompts, 1);
  }, [stats.prompts, viewMode]);

  const triggerEffects = (_waterCost: number) => {
    setLightningPaths(generateLightningPaths());
    setLightningActive(true);
    setTimeout(() => setLightningActive(false), 550);
    const newLeaves = Array.from({ length: 6 }).map(() => Math.random());
    setFallingLeaves(prev => [...prev, ...newLeaves]);
    setTimeout(() => setFallingLeaves(prev => prev.filter((id: number) => !newLeaves.includes(id))), 2500);
  };

  const handleSimulate = () => {
    const count = parseInt(manualInput) || 1;
    const multiplier = MODEL_MULTIPLIERS[selectedModel];
    const water = count * BASE_WATER_PER_PROMPT * multiplier;
    const energy = count * BASE_ENERGY_PER_PROMPT * multiplier;
    setStats(prev => ({ prompts: prev.prompts + count, water: prev.water + water, energy: prev.energy + energy }));
    triggerEffects(water / count);
  };

  const handleReset = () => { setStats({ prompts: 0, water: 0, energy: 0 }); setManualInput('1'); };

  const handleViewChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    setViewMode(mode);
    if (mode === 'simulation') {
      setStats({ prompts: 0, water: 0, energy: 0 });
    } else {
      setStats(MOCK_DATA[mode]);
      triggerEffects(MOCK_DATA[mode].water / MOCK_DATA[mode].prompts);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setTipIndex(prev => (prev + 1) % ECO_TIPS.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const leaderboard = useMemo(() => {
    if (viewMode === 'simulation') return LAST_MONTH_LEADERBOARD;
    const multiplier = viewMode === 'monthly' ? 30 : viewMode === 'weekly' ? 7 : 1;
    return Object.entries(SCHOOL_PROMPTS_BASE)
      .map(([name, prompts]) => ({ name, impact: prompts * BASE_ENERGY_PER_PROMPT * multiplier }))
      .sort((a, b) => a.impact - b.impact);
  }, [viewMode]);

  // Draggable picker position (starts centered at bottom)
  const pickerX = useMotionValue(0);
  const pickerY = useMotionValue(0);

  const sharedProps: WidgetProps = {
    stress, stats, lightningActive, fallingLeaves, lightningPaths,
    viewMode, selectedModel, manualInput, tipIndex,
    onSimulate: handleSimulate, onReset: handleReset,
    onViewChange: handleViewChange, onModelChange: setSelectedModel,
    onManualInputChange: setManualInput, leaderboard,
  };

  const frameDims: Record<Exclude<WidgetSize, 'xlarge'>, string> = {
    small: 'w-[170px] h-[170px]',
    medium: 'w-full max-w-[358px] h-[170px]',
    large: 'w-full max-w-[358px] h-[390px]',
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Draggable size picker (bottom) ── */}
      <motion.div
        drag
        dragMomentum={false}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          translateX: '-50%',
          x: pickerX,
          y: pickerY,
          zIndex: 50,
        }}
        className="flex items-center gap-1 bg-slate-400 rounded-[20px] p-1.5 shadow-xl cursor-grab active:cursor-grabbing select-none max-w-[calc(100vw-2rem)]"
      >
        {(['small', 'medium', 'large', 'xlarge'] as WidgetSize[]).map(s => (
          <button
            key={s}
            onClick={() => setWidgetSize(s)}
            className={`flex items-center justify-center w-[54px] h-[46px] rounded-[14px] transition-all ${
              widgetSize === s ? 'bg-slate-300 shadow-inner' : 'hover:bg-white/10'
            }`}
          >
            <SizePickerIcon size={s} active={widgetSize === s} />
          </button>
        ))}
      </motion.div>

      {/* ── Content ── */}
      {widgetSize === 'xlarge' ? (
        // Full dashboard — original layout
        <div className="p-4 md:p-8 pb-32 flex items-start justify-center">
          <div className="w-full max-w-5xl">
            <XLargeWidget {...sharedProps} />
          </div>
        </div>
      ) : (
        // Centered widget card
        <div className="flex items-center justify-center min-h-screen pb-24 px-4">
          <div className={`${frameDims[widgetSize]} bg-uib-burgundy uib-gradient rounded-[2.5rem] shadow-2xl overflow-hidden`}>
            <AnimatePresence mode="wait">
              {widgetSize === 'small' && (
                <motion.div key="small" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                  <SmallWidget {...sharedProps} />
                </motion.div>
              )}
              {widgetSize === 'medium' && (
                <motion.div key="medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                  <MediumWidget {...sharedProps} />
                </motion.div>
              )}
              {widgetSize === 'large' && (
                <motion.div key="large" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                  <LargeWidget {...sharedProps} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function InnerMetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-white/20 transition-transform hover:scale-[1.02] shadow-sm">
      <div className="text-uib-burgundy mb-2">{icon}</div>
      <p className="text-[8px] font-bold uppercase text-uib-burgundy/40 tracking-wider mb-1">{label}</p>
      <p className="text-base font-black text-uib-burgundy">{value}</p>
    </div>
  );
}
