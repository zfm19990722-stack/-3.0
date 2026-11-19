import { lazy, Suspense, useEffect } from 'react';
import { Compass } from 'lucide-react';
import type { PrimaryViewId } from './HomePage';
import { useTempleLightingMode } from '../temple/templeLightingTime';

const Temple3DExperience = lazy(() => import('../temple/Temple3DExperience'));

interface TemplePageProps {
  language: 'zh' | 'en';
  onNavigate: (view: PrimaryViewId) => void;
  onEnterStillness?: () => void;
  onExitTemple?: () => void;
}

export default function TemplePage({
  language,
  onNavigate,
  onExitTemple,
}: TemplePageProps) {
  const isEn = language === 'en';
  const {
    preference: lightingPreference,
    setPreference: setLightingPreference,
    resolvedMode: resolvedEnvironment,
    beijingTimeLabel,
  } = useTempleLightingMode();
  const isNightEnv = resolvedEnvironment === 'night';

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleExit = () => {
    if (onExitTemple) {
      onExitTemple();
    } else {
      onNavigate('home');
    }
  };

  return (
    <div id="temple-page">
      <Suspense
        fallback={
          <div
            className={`fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 text-center px-6 ${
              isNightEnv
                ? 'bg-[#26201a] text-[#f5efe6]'
                : 'bg-[#ede6da] text-[#262320]'
            }`}
            role="status"
          >
            <Compass
              className="w-6 h-6 text-[var(--amnd-gold)] animate-spin"
              style={{ animationDuration: '6s' }}
            />
            <p className="font-serif text-base font-medium">
              {isEn ? 'Entering Yixiu Little Temple…' : '正在进入一休小庙…'}
            </p>
            <p className="text-xs opacity-75">
              {isEn
                ? 'A little place to pause and return to yourself.'
                : '累了，就回来歇一歇。'}
            </p>
          </div>
        }
      >
        <Temple3DExperience
          language={language}
          onClose={handleExit}
          lightingPreference={lightingPreference}
          onChangeLightingPreference={setLightingPreference}
          resolvedEnvironment={resolvedEnvironment}
          beijingTimeLabel={beijingTimeLabel}
        />
      </Suspense>
    </div>
  );
}
