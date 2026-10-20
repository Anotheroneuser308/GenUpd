import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Activity, Compass, Zap } from 'lucide-react';
import { GameState, GrowthPoint } from '../types/game';

interface GrowthHistoryChartProps {
  state: GameState;
}

function formatDurationShort(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: GrowthPoint & { timeLabel: string };
  }>;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-2xl backdrop-blur-md text-xs font-mono space-y-1.5 min-w-[190px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-slate-400 text-[11px]">
        <span>Elapsed Time</span>
        <span className="text-slate-200 font-semibold">{formatDurationShort(data.timePlayed)}</span>
      </div>
      <div>
        <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Points</span>
        <span className="text-emerald-300 font-bold text-sm tracking-tight">{data.formattedPoints}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] pt-0.5">
        <span className="text-slate-400">Log₁₀ Magnitude:</span>
        <span className="text-cyan-400 font-semibold">10^{data.logPoints.toFixed(2)}</span>
      </div>
    </div>
  );
};

export const GrowthHistoryChart: React.FC<GrowthHistoryChartProps> = ({ state }) => {
  const [scaleMode, setScaleMode] = useState<'log' | 'linear'>('log');
  const notation = state.settings.notation;

  const rawHistory = state.stats.growthHistory || [];

  // Prepare chart data; ensure at least 2 points for a continuous curve
  const chartData = useMemo(() => {
    let list = [...rawHistory];

    if (list.length === 0) {
      // Seed with initial point and current point
      const currentLog = state.points.mantissa > 0 ? Math.max(0, state.points.log10()) : 0;
      list = [
        {
          timestamp: Date.now() - 5000,
          timePlayed: Math.max(0, Math.floor(state.stats.totalTimePlayed - 5)),
          points: 10,
          logPoints: 1,
          formattedPoints: '10',
          rate: 0,
        },
        {
          timestamp: Date.now(),
          timePlayed: Math.floor(state.stats.totalTimePlayed),
          points: state.points.toNumber(),
          logPoints: Math.round(currentLog * 100) / 100,
          formattedPoints: state.points.format(notation),
          rate: state.pointsPerSecond.mantissa > 0 ? state.pointsPerSecond.log10() : 0,
        },
      ];
    } else if (list.length === 1) {
      const currentLog = state.points.mantissa > 0 ? Math.max(0, state.points.log10()) : 0;
      list.push({
        timestamp: Date.now(),
        timePlayed: Math.floor(state.stats.totalTimePlayed),
        points: state.points.toNumber(),
        logPoints: Math.round(currentLog * 100) / 100,
        formattedPoints: state.points.format(notation),
        rate: state.pointsPerSecond.mantissa > 0 ? state.pointsPerSecond.log10() : 0,
      });
    }

    return list.map((item) => ({
      ...item,
      timeLabel: formatDurationShort(item.timePlayed),
      chartValue: scaleMode === 'log' ? item.logPoints : item.points,
    }));
  }, [rawHistory, state.points, state.pointsPerSecond, state.stats.totalTimePlayed, scaleMode, notation]);

  // Compute growth velocity or acceleration
  const growthRateStatus = useMemo(() => {
    if (chartData.length < 2) return 'Stable';
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const logDiff = last.logPoints - first.logPoints;
    if (logDiff > 5) return 'Exponential Surge 🚀';
    if (logDiff > 1) return 'Accelerating ↗';
    return 'Steady Growth →';
  }, [chartData]);

  const latestLog = chartData.length > 0 ? chartData[chartData.length - 1].logPoints : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-100">
              Growth History
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {rawHistory.length} samples
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracks total point accumulation over time to visualize your exponential curve.
          </p>
        </div>

        {/* View scale selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setScaleMode('log')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              scaleMode === 'log'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Logarithmic scale shows linear steepness for exponential orders of magnitude"
          >
            Log₁₀ Scale
          </button>
          <button
            type="button"
            onClick={() => setScaleMode('linear')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              scaleMode === 'linear'
                ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Standard numerical values (best for early game)"
          >
            Standard Value
          </button>
        </div>
      </div>

      {/* Quick Trend Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Velocity</span>
          </div>
          <div className="text-cyan-300 font-semibold mt-0.5">
            {growthRateStatus}
          </div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400" />
            <span>Magnitude</span>
          </div>
          <div className="text-indigo-300 font-semibold mt-0.5">
            10^{latestLog.toFixed(1)} Points
          </div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Highest Point</span>
          </div>
          <div className="text-emerald-300 font-semibold mt-0.5 truncate" title={state.stats.highestPointsEver.format(notation)}>
            {state.stats.highestPointsEver.format(notation)}
          </div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>Time Span</span>
          </div>
          <div className="text-slate-300 font-semibold mt-0.5">
            {formatDurationShort(state.stats.totalTimePlayed)}
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full h-64 bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
            <XAxis
              dataKey="timeLabel"
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={{ stroke: '#334155' }}
              domain={['auto', 'auto']}
              tickFormatter={(val: number) => {
                if (scaleMode === 'log') {
                  return `10^${Math.round(val)}`;
                }
                if (val >= 1e6) {
                  return val.toExponential(1);
                }
                return val.toLocaleString();
              }}
            />
            <Tooltip content={<CustomChartTooltip />} />
            <Area
              type="monotone"
              dataKey="chartValue"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#growthGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
        <span>
          {scaleMode === 'log'
            ? 'Y-Axis shows exponent (Order of Magnitude: 10^X)'
            : 'Y-Axis shows direct numerical count'}
        </span>
        <span>Auto-captures point snapshots every 2s</span>
      </div>
    </div>
  );
};
