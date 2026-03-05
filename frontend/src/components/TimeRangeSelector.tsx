import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';

export type PresetRange = '1h' | '24h' | '7d' | '30d';
export type Granularity = '5m' | '1h' | '6h' | '1d';

export interface TimeseriesParams {
  range?: PresetRange;
  started_after?: string;
  started_before?: string;
  granularity?: Granularity;
}

interface TimeRangeSelectorProps {
  onChange: (params: TimeseriesParams) => void;
  loading?: boolean;
}

function suggestGranularity(startMs: number, endMs: number): Granularity {
  const hours = (endMs - startMs) / 3_600_000;
  if (hours <= 2) return '5m';
  if (hours <= 48) return '1h';
  if (hours <= 336) return '6h';
  return '1d';
}

const PRESET_GRANULARITY: Record<PresetRange, Granularity> = {
  '1h': '5m',
  '24h': '1h',
  '7d': '6h',
  '30d': '1d',
};

export function granularityFromParams(params: TimeseriesParams): Granularity {
  if (params.granularity) return params.granularity;
  if (params.range) return PRESET_GRANULARITY[params.range];
  return '1h';
}

export default function TimeRangeSelector({ onChange, loading }: TimeRangeSelectorProps) {
  const theme = useTheme();

  const [preset, setPreset] = useState<PresetRange>('1h');
  const [isCustom, setIsCustom] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('5m');

  // Fire initial params on mount
  useEffect(() => {
    onChange({ range: '1h' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreset = useCallback((v: PresetRange) => {
    setPreset(v);
    setIsCustom(false);
    setStartDate(null);
    setEndDate(null);
    setGranularity(PRESET_GRANULARITY[v]);
    onChange({ range: v });
  }, [onChange]);

  const handleDateChange = useCallback((start: Dayjs | null, end: Dayjs | null, gran: Granularity) => {
    if (start && end && end.isAfter(start)) {
      setIsCustom(true);
      onChange({
        started_after: start.toISOString(),
        started_before: end.toISOString(),
        granularity: gran,
      });
    }
  }, [onChange]);

  const handleStartChange = (val: Dayjs | null) => {
    setStartDate(val);
    const newGran = (val && endDate) ? suggestGranularity(val.valueOf(), endDate.valueOf()) : granularity;
    if (val && endDate) setGranularity(newGran);
    handleDateChange(val, endDate, newGran);
  };

  const handleEndChange = (val: Dayjs | null) => {
    setEndDate(val);
    const newGran = (startDate && val) ? suggestGranularity(startDate.valueOf(), val.valueOf()) : granularity;
    if (startDate && val) setGranularity(newGran);
    handleDateChange(startDate, val, newGran);
  };

  const handleGranularity = (v: Granularity) => {
    setGranularity(v);
    if (isCustom && startDate && endDate) {
      onChange({
        started_after: startDate.toISOString(),
        started_before: endDate.toISOString(),
        granularity: v,
      });
    }
  };

  const pickerSlotProps = {
    textField: {
      size: 'small' as const,
      sx: { width: 188, '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.625 } },
    },
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      {/* Preset toggle */}
      <ToggleButtonGroup
        size="small"
        value={isCustom ? null : preset}
        exclusive
        onChange={(_, v) => { if (v) handlePreset(v as PresetRange); }}
      >
        {(['1h', '24h', '7d', '30d'] as PresetRange[]).map((r) => (
          <ToggleButton key={r} value={r} sx={{ fontSize: '0.75rem', px: 1.5, textTransform: 'none' }}>
            {r}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Divider */}
      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', userSelect: 'none' }}>|</Typography>

      {/* Date range */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <DateTimePicker
          label="From"
          value={startDate}
          onChange={handleStartChange}
          maxDateTime={endDate ?? dayjs()}
          slotProps={pickerSlotProps}
        />
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>→</Typography>
        <DateTimePicker
          label="To"
          value={endDate}
          onChange={handleEndChange}
          minDateTime={startDate ?? undefined}
          maxDateTime={dayjs()}
          slotProps={pickerSlotProps}
        />
      </Box>

      {/* Granularity — only when custom */}
      {isCustom && (
        <ToggleButtonGroup
          size="small"
          value={granularity}
          exclusive
          onChange={(_, v) => { if (v) handleGranularity(v as Granularity); }}
        >
          {(['5m', '1h', '6h', '1d'] as Granularity[]).map((g) => (
            <ToggleButton key={g} value={g} sx={{ fontSize: '0.75rem', px: 1, textTransform: 'none' }}>
              {g}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {loading && <CircularProgress size={14} color="inherit" />}
    </Box>
  );
}
