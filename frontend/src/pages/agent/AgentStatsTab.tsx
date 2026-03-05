import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  BarChart, Bar, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts';
import type { AgentDetailContext } from '../../types/agentDetail';
import type { AgentStats, AgentTimeseries } from '../../types/agentStats';
import { agentApi } from '../../services/agentApi';
import TimeRangeSelector, { granularityFromParams } from '../../components/TimeRangeSelector';
import type { TimeseriesParams, Granularity } from '../../components/TimeRangeSelector';

function formatXAxisTick(bucket: string, granularity: Granularity): string {
  const d = new Date(bucket);
  if (granularity === '5m' || granularity === '1h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatBucketLabel(d: Date): string {
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LatencyTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string }) {
  const theme = useTheme();
  const colors = theme.colors;
  if (!active || !payload?.length) return null;
  const avg = payload.find((p) => p.dataKey === 'avg_latency_ms')?.value ?? null;
  const p95 = payload.find((p) => p.dataKey === 'p95_latency_ms')?.value ?? null;
  const spread = avg != null && p95 != null ? p95 - avg : null;

  return (
    <Box sx={{ background: colors.canvas.overlay, border: `1px solid ${colors.border.default}`, borderRadius: '6px', p: '8px 12px', fontSize: 12, minWidth: 140 }}>
      <Typography sx={{ fontSize: 11, color: colors.fg.muted, mb: 0.75 }}>
        {label ? formatBucketLabel(new Date(label)) : ''}
      </Typography>
      {avg != null ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 2, background: '#2DD4BF', borderRadius: 1 }} />
            <Typography component="span" sx={{ fontSize: 12, color: colors.fg.muted }}>Avg</Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 12, color: colors.fg.default, fontWeight: 600 }}>{(avg / 1000).toFixed(2)}s</Typography>
        </Box>
      ) : null}
      {p95 != null ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: spread != null ? 0.5 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 2, background: '#F59E0B', borderRadius: 1 }} />
            <Typography component="span" sx={{ fontSize: 12, color: colors.fg.muted }}>p95</Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 12, color: colors.fg.default, fontWeight: 600 }}>{(p95 / 1000).toFixed(2)}s</Typography>
        </Box>
      ) : null}
      {spread != null && (
        <Box sx={{ borderTop: `1px solid ${colors.border.muted}`, pt: 0.5, mt: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography component="span" sx={{ fontSize: 12, color: colors.fg.muted }}>Spread</Typography>
            <Typography component="span" sx={{ fontSize: 12, color: spread > 0.1 ? '#F85149' : colors.fg.muted }}>{(spread / 1000).toFixed(2)}s</Typography>
          </Box>
        </Box>
      )}
      {avg == null && (
        <Typography sx={{ fontSize: 11, color: colors.fg.subtle, fontStyle: 'italic' }}>No data</Typography>
      )}
    </Box>
  );
}

function TrendBadge({ pct, invert }: { pct: number | null; invert?: boolean }) {
  const theme = useTheme();
  if (pct === null) return null;
  const isPositive = pct > 0;
  const isGood = invert ? !isPositive : isPositive;
  const isDark = theme.palette.mode === 'dark';
  const color = isGood ? '#3FB950' : '#F85149';
  const bg = isGood
    ? isDark ? '#1F3A2E' : 'rgba(63, 185, 80, 0.15)'
    : isDark ? '#3A1F1F' : 'rgba(248, 81, 73, 0.15)';
  const arrow = isPositive ? '↑' : '↓';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: '6px',
        py: '2px',
        borderRadius: '4px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color,
        backgroundColor: bg,
        ml: 1,
        lineHeight: 1.4,
      }}
    >
      {arrow} {Math.abs(pct).toFixed(1)}%
    </Box>
  );
}

export default function AgentStatsTab() {
  const { agent } = useOutletContext<AgentDetailContext>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const [stats, setStats] = useState<AgentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [timeseries, setTimeseries] = useState<AgentTimeseries | null>(null);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null);
  const [timeseriesParams, setTimeseriesParams] = useState<TimeseriesParams>({ range: '1h' });

  useEffect(() => {
    agentApi.getStats(agent.id)
      .then(setStats)
      .catch((err: Error) => setStatsError(err.message))
      .finally(() => setStatsLoading(false));
  }, [agent.id]);

  function loadTimeseries(params: TimeseriesParams) {
    setTimeseriesParams(params);
    setTimeseriesLoading(true);
    setTimeseriesError(null);
    agentApi.getTimeseries(agent.id, params)
      .then(setTimeseries)
      .catch((err: Error) => setTimeseriesError(err.message))
      .finally(() => setTimeseriesLoading(false));
  }

  if (statsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      {statsError && <Alert severity="error" sx={{ mb: 2 }}>{statsError}</Alert>}
      {timeseriesError && <Alert severity="error" sx={{ mb: 2 }}>{timeseriesError}</Alert>}

      {!statsError && stats && (
        <>
          {/* ── Summary Cards ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
            {([
              {
                label: 'Total Runs',
                value: stats.total_runs.toLocaleString(),
                trendPct: timeseries?.trend.total_runs_pct ?? null,
                invert: false,
              },
              {
                label: 'Success',
                value: stats.success_count.toLocaleString(),
                trendPct: null,
                invert: false,
              },
              {
                label: 'Errors',
                value: stats.error_count.toLocaleString(),
                trendPct: null,
                invert: true,
                clickTo: stats.error_count > 0 ? `/agents/${agent.id}/traces?status=error` : undefined,
              },
              {
                label: 'Avg Latency',
                value: stats.avg_latency_ms !== null ? `${(stats.avg_latency_ms / 1000).toFixed(2)}s` : '—',
                trendPct: timeseries?.trend.avg_latency_pct ?? null,
                invert: true,
                tooltip: 'Average response time across all runs in the selected period.',
              },
              {
                label: 'p95 Latency',
                value: stats.p95_latency_ms !== null ? `${(stats.p95_latency_ms / 1000).toFixed(2)}s` : '—',
                trendPct: timeseries?.trend.p95_latency_pct ?? null,
                invert: true,
                tooltip: '95th percentile latency — 95% of runs completed faster than this value. A high p95 indicates occasional slow responses even if the average looks healthy.',
              },
            ] as { label: string; value: string; trendPct: number | null; invert: boolean; tooltip?: string; clickTo?: string }[]).map(({ label, value, trendPct, invert, tooltip, clickTo }) => (
              <Box
                key={label}
                onClick={clickTo ? () => navigate(clickTo) : undefined}
                sx={{
                  border: `1px solid ${colors.border.muted}`,
                  borderRadius: '8px',
                  px: 2,
                  py: 1.75,
                  background: colors.canvas.subtle,
                  cursor: clickTo ? 'pointer' : 'default',
                  transition: 'border-color 0.15s',
                  '&:hover': clickTo ? { borderColor: colors.border.default } : {},
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.muted }}>
                    {label}
                  </Typography>
                  {tooltip && (
                    <Tooltip title={tooltip} arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 13, color: '#6E7681', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                    </Tooltip>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: colors.fg.default }}>
                    {value}
                  </Typography>
                  <TrendBadge pct={trendPct} invert={invert} />
                </Box>
              </Box>
            ))}
          </Box>

          {/* ── Time Range Selector ── */}
          <Box sx={{ mb: 2 }}>
            <TimeRangeSelector onChange={loadTimeseries} loading={timeseriesLoading} />
          </Box>

          {/* ── Charts ── */}
          {timeseries && timeseries.buckets.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Run Count Bar Chart */}
              <Box
                sx={{
                  border: `1px solid ${colors.border.muted}`,
                  borderRadius: '8px',
                  p: 2,
                  background: colors.canvas.subtle,
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.fg.muted, mb: 1.5 }}>
                  Run Count
                </Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={timeseries.buckets} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke={colors.border.muted} />
                    <XAxis
                      dataKey="ts"
                      tickFormatter={(v) => formatXAxisTick(v as string, granularityFromParams(timeseriesParams))}
                      tick={{ fill: colors.fg.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: colors.fg.muted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <RechartsTooltip
                      contentStyle={{ background: colors.canvas.overlay, border: `1px solid ${colors.border.default}`, borderRadius: 6, fontSize: 12 }}
                      labelStyle={{ color: colors.fg.muted }}
                      itemStyle={{ color: '#5E6AD2' }}
                      labelFormatter={(v) => new Date(v as string).toLocaleString()}
                      formatter={(v) => [v, 'Runs']}
                    />
                    <Bar dataKey="run_count" fill="#5E6AD2" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Latency Chart */}
              <Box
                sx={{
                  border: `1px solid ${colors.border.muted}`,
                  borderRadius: '8px',
                  p: 2,
                  background: colors.canvas.subtle,
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.fg.muted, mb: 1.5 }}>
                  Latency (ms)
                </Typography>
                {(() => {
                  const buckets = timeseries.buckets;
                  const bucketCount = buckets.length;
                  const dotStyle = bucketCount > 20 ? false : { r: 3 };

                  const enrichedBuckets = buckets.map((b) => ({
                    ...b,
                    band: b.avg_latency_ms !== null && b.p95_latency_ms !== null
                      ? [b.avg_latency_ms, b.p95_latency_ms] as [number, number]
                      : [null, null] as [null, null],
                  }));

                  const nullRanges: { x1: string; x2: string }[] = [];
                  let rangeStart: string | null = null;
                  for (let i = 0; i < buckets.length; i++) {
                    const isNull = buckets[i].avg_latency_ms === null;
                    if (isNull && rangeStart === null) {
                      rangeStart = buckets[i].ts;
                    } else if (!isNull && rangeStart !== null) {
                      nullRanges.push({ x1: rangeStart, x2: buckets[i - 1].ts });
                      rangeStart = null;
                    }
                  }
                  if (rangeStart !== null) {
                    nullRanges.push({ x1: rangeStart, x2: buckets[buckets.length - 1].ts });
                  }

                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={enrichedBuckets} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid vertical={false} stroke={colors.border.muted} strokeDasharray="2 4" />
                        <XAxis
                          dataKey="ts"
                          tickFormatter={(v) => formatXAxisTick(v as string, granularityFromParams(timeseriesParams))}
                          tick={{ fill: colors.fg.muted, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`}
                          tick={{ fill: colors.fg.subtle, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <RechartsTooltip
                          content={<LatencyTooltip />}
                          cursor={{ stroke: colors.border.default, strokeWidth: 1 }}
                        />
                        <Legend
                          iconType="plainline"
                          wrapperStyle={{ fontSize: 11, color: colors.fg.muted }}
                          formatter={(value) => value === 'avg_latency_ms' ? 'Avg' : 'p95'}
                        />
                        {nullRanges.map((range, i) => (
                          <ReferenceArea
                            key={i}
                            x1={range.x1}
                            x2={range.x2}
                            fill="rgba(110, 118, 129, 0.15)"
                            strokeOpacity={0}
                          />
                        ))}
                        <Area
                          dataKey="band"
                          stroke="none"
                          fill="#F59E0B"
                          fillOpacity={0.08}
                          connectNulls={false}
                          legendType="none"
                          activeDot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="avg_latency_ms"
                          stroke="#2DD4BF"
                          strokeWidth={1.5}
                          dot={dotStyle}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="p95_latency_ms"
                          stroke="#F59E0B"
                          strokeWidth={1.5}
                          dot={dotStyle}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  );
                })()}

                {/* Interpretation Guide */}
                <Box
                  sx={{
                    mt: 2,
                    p: '10px 14px',
                    background: colors.canvas.inset,
                    border: `1px solid ${colors.border.muted}`,
                    borderLeft: `2px solid ${colors.accent.emphasis}`,
                    borderRadius: '4px',
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.fg.subtle, mb: 0.75 }}>
                    How to read this chart
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: colors.fg.subtle, lineHeight: 1.6 }}>
                    The <span style={{ color: '#2DD4BF' }}>Avg</span> line shows the typical response time experienced by most users.
                    The <span style={{ color: '#F59E0B' }}>p95</span> line shows the latency threshold that 95% of requests fall under —
                    meaning 1 in 20 requests takes longer than this value.
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: colors.fg.subtle, lineHeight: 1.6, mt: 0.75 }}>
                    A small gap between Avg and p95 indicates consistent performance.
                    A widening gap signals that a subset of requests are significantly slower,
                    which may point to cold starts, outliers, or resource contention.
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : !timeseriesLoading ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                border: `1px solid ${colors.border.muted}`,
                borderRadius: '8px',
                background: colors.canvas.subtle,
              }}
            >
              <Typography sx={{ color: colors.fg.muted, fontWeight: 500, mb: 0.5 }}>
                No data for this range
              </Typography>
              <Typography sx={{ color: colors.fg.subtle, fontSize: '0.8125rem' }}>
                Try selecting a wider range
              </Typography>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
