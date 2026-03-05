import React, { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

export type PresetRange = '1h' | '24h' | '7d' | '30d';
export type Granularity = '5m' | '1h' | '6h' | '1d';

export interface TimeseriesParams {
  range?: PresetRange;
  started_after?: string;
  started_before?: string;
  granularity?: Granularity;
}

const TOGGLE_GRANULARITY: Record<PresetRange, Granularity> = {
  '1h': '1h',
  '24h': '6h',
  '7d': '6h',
  '30d': '1d',
};

// Minimum date-range days required to enable each toggle
const TOGGLE_MIN_DAYS: Record<PresetRange, number> = {
  '1h': 0,
  '24h': 0,
  '7d': 7,
  '30d': 30,
};

// Ordered from largest to smallest for auto-fallback
const TOGGLE_ORDER: PresetRange[] = ['30d', '7d', '24h', '1h'];

export function granularityFromParams(params: TimeseriesParams): Granularity {
  if (params.granularity) return params.granularity;
  if (params.range) return TOGGLE_GRANULARITY[params.range];
  return '1h';
}

interface TimeRangeSelectorProps {
  onChange: (params: TimeseriesParams) => void;
  loading?: boolean;
}

export default function TimeRangeSelector({ onChange, loading }: TimeRangeSelectorProps) {
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, 'day'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());
  const [toggle, setToggle] = useState<PresetRange>('1h');

  const rangeDays = endDate.diff(startDate, 'day');

  const isDisabled = (r: PresetRange) => rangeDays < TOGGLE_MIN_DAYS[r];

  const fire = useCallback(
    (start: Dayjs, end: Dayjs, g: PresetRange) => {
      onChange({
        started_after: start.startOf('day').toISOString(),
        started_before: end.endOf('day').toISOString(),
        granularity: TOGGLE_GRANULARITY[g],
      });
    },
    [onChange],
  );

  // Fire initial value
  useEffect(() => {
    fire(startDate, endDate, toggle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fallback when date range shrinks and current toggle becomes disabled
  useEffect(() => {
    if (isDisabled(toggle)) {
      const fallback = TOGGLE_ORDER.find((r) => !isDisabled(r)) ?? '1h';
      setToggle(fallback);
      fire(startDate, endDate, fallback);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const handleStartChange = (val: Dayjs | null) => {
    if (!val) return;
    setStartDate(val);
    fire(val, endDate, toggle);
  };

  const handleEndChange = (val: Dayjs | null) => {
    if (!val) return;
    setEndDate(val);
    fire(startDate, val, toggle);
  };

  const handleToggle = useCallback(
    (_: React.MouseEvent, v: PresetRange | null) => {
      if (!v) return;
      setToggle(v);
      fire(startDate, endDate, v);
    },
    [fire, startDate, endDate],
  );

  const pickerSlotProps = {
    textField: {
      size: 'small' as const,
      sx: { width: 140, '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.75 } },
    },
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      {/* Date range picker */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <DatePicker
          label="From"
          value={startDate}
          onChange={handleStartChange}
          maxDate={endDate}
          format="YYYY/MM/DD"
          slotProps={pickerSlotProps}
        />
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>→</Typography>
        <DatePicker
          label="To"
          value={endDate}
          onChange={handleEndChange}
          minDate={startDate}
          maxDate={dayjs()}
          format="YYYY/MM/DD"
          slotProps={pickerSlotProps}
        />
      </Box>

      {/* Granularity toggle */}
      <ToggleButtonGroup size="small" value={toggle} exclusive onChange={handleToggle}>
        {(['1h', '24h', '7d', '30d'] as PresetRange[]).map((r) => (
          <ToggleButton
            key={r}
            value={r}
            disabled={isDisabled(r)}
            sx={{ fontSize: '0.75rem', px: 1.5, textTransform: 'none' }}
          >
            {r}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {loading && <CircularProgress size={14} color="inherit" />}
    </Box>
  );
}
