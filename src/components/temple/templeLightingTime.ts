import { useCallback, useEffect, useRef, useState } from 'react';

export const TEMPLE_LIGHTING_STORAGE_KEY = 'amnd_temple_lighting_mode_v1';
export const TEMPLE_BEIJING_TIMEZONE = 'Asia/Shanghai';

export type TempleLightingPreference = 'auto' | 'day' | 'night';
export type TempleResolvedEnvironment = 'day' | 'night';

export interface BeijingClockParts {
  hour: number;
  minute: number;
  second: number;
  formattedTime: string; // HH:mm in Asia/Shanghai
}

const beijingTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TEMPLE_BEIJING_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Extracts hour, minute, second and formatted HH:mm explicitly in Asia/Shanghai (Beijing Time),
 * completely independent of the user's device local timezone.
 */
export function getBeijingTimeParts(date: Date = new Date()): BeijingClockParts {
  const parts = beijingTimeFormatter.formatToParts(date);
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    if (part.type === 'hour') {
      hour = Number.parseInt(part.value, 10) % 24;
    } else if (part.type === 'minute') {
      minute = Number.parseInt(part.value, 10);
    } else if (part.type === 'second') {
      second = Number.parseInt(part.value, 10);
    }
  }

  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');

  return {
    hour,
    minute,
    second,
    formattedTime: `${hh}:${mm}`,
  };
}

/**
 * Automatic Day/Night rule based strictly on Beijing Time (Asia/Shanghai):
 * - 06:00 – 18:59 -> 'day'
 * - 19:00 – 05:59 -> 'night'
 */
export function getBeijingLightingMode(
  date: Date = new Date()
): TempleResolvedEnvironment {
  const { hour } = getBeijingTimeParts(date);
  return hour >= 6 && hour < 19 ? 'day' : 'night';
}

/**
 * Resolves active lighting environment given user preference and reference Date.
 * Manual ('day' | 'night') always overrides automatic Beijing Time detection.
 */
export function resolveTempleEnvironment(
  preference: TempleLightingPreference,
  date: Date = new Date()
): TempleResolvedEnvironment {
  if (preference === 'day' || preference === 'night') {
    return preference;
  }
  return getBeijingLightingMode(date);
}

/**
 * Computes milliseconds until the next Beijing Time minute tick or Day/Night boundary,
 * capped between 250ms and 30_000ms so transitions at 06:00 / 19:00 trigger promptly
 * without running a high-frequency polling timer.
 */
export function getNextBeijingCheckDelayMs(date: Date = new Date()): number {
  const { second } = getBeijingTimeParts(date);
  const msPastSecond = date.getMilliseconds();
  const msToNextMinute = (60 - second) * 1000 - msPastSecond + 150;
  return Math.max(250, Math.min(msToNextMinute, 30_000));
}

export function loadTempleLightingPreference(): TempleLightingPreference {
  try {
    const raw = window.localStorage.getItem(TEMPLE_LIGHTING_STORAGE_KEY);
    if (raw === 'auto' || raw === 'day' || raw === 'night') {
      return raw;
    }
  } catch (e) {
    console.warn('Unable to read temple lighting preference:', e);
  }
  return 'auto';
}

export function saveTempleLightingPreference(
  preference: TempleLightingPreference
): void {
  try {
    window.localStorage.setItem(TEMPLE_LIGHTING_STORAGE_KEY, preference);
  } catch (e) {
    console.warn('Unable to persist temple lighting preference:', e);
  }
}

/**
 * React hook managing Beijing Time auto-switching + manual preference persistence.
 * - Uses a single non-overlapping timeout scheduled cleanly to minute boundaries.
 * - Pauses background timer when document is hidden and refreshes immediately on return.
 */
export function useTempleLightingMode() {
  const [preference, setPreferenceState] = useState<TempleLightingPreference>(
    () => loadTempleLightingPreference()
  );
  const [beijingTime, setBeijingTime] = useState<BeijingClockParts>(() =>
    getBeijingTimeParts(new Date())
  );

  const preferenceRef = useRef<TempleLightingPreference>(preference);
  preferenceRef.current = preference;

  const timerRef = useRef<number | null>(null);

  const clearScheduledTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setPreference = useCallback((next: TempleLightingPreference) => {
    saveTempleLightingPreference(next);
    setPreferenceState(next);
    setBeijingTime(getBeijingTimeParts(new Date()));
  }, []);

  useEffect(() => {
    let unmounted = false;

    const syncAndSchedule = () => {
      if (unmounted) return;
      clearScheduledTimer();

      const now = new Date();
      setBeijingTime(getBeijingTimeParts(now));

      if (document.hidden) {
        return;
      }

      // When in Auto mode, align checks neatly to Beijing minute boundaries (max 30s)
      // When in Manual mode, refresh Beijing clock display gently every 30s if visible
      const delay =
        preferenceRef.current === 'auto'
          ? getNextBeijingCheckDelayMs(now)
          : 30_000;

      timerRef.current = window.setTimeout(syncAndSchedule, delay);
    };

    syncAndSchedule();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearScheduledTimer();
      } else {
        syncAndSchedule();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === TEMPLE_LIGHTING_STORAGE_KEY) {
        setPreferenceState(loadTempleLightingPreference());
        syncAndSchedule();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      unmounted = true;
      clearScheduledTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearScheduledTimer, preference]);

  const resolvedMode: TempleResolvedEnvironment =
    preference === 'auto'
      ? beijingTime.hour >= 6 && beijingTime.hour < 19
        ? 'day'
        : 'night'
      : preference;

  return {
    preference,
    setPreference,
    resolvedMode,
    beijingTimeLabel: beijingTime.formattedTime,
  };
}
