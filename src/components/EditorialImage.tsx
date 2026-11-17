import { useState } from 'react';
import { Compass } from 'lucide-react';

interface EditorialImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClassName?: string;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

export default function EditorialImage({
  src,
  alt,
  className = '',
  aspectClassName = 'aspect-[16/9]',
  fallbackTitle,
  fallbackSubtitle,
}: EditorialImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`${aspectClassName} w-full overflow-hidden rounded-2xl border border-[var(--amnd-border)] bg-gradient-to-br from-[var(--amnd-bg-secondary)] via-[var(--amnd-bg-elevated)] to-[var(--amnd-bg-subtle)] flex flex-col items-center justify-center p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-7 h-7 text-[var(--amnd-wood)] mb-2.5 opacity-80" strokeWidth={1.5} />
        <p className="font-serif text-base font-semibold text-[var(--amnd-text-primary)]">
          {fallbackTitle || alt}
        </p>
        {fallbackSubtitle && (
          <p className="text-xs text-[var(--amnd-text-muted)] mt-1 max-w-xs">
            {fallbackSubtitle}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${aspectClassName} w-full overflow-hidden rounded-2xl border border-[var(--amnd-border)] bg-[var(--amnd-bg-secondary)] ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-500"
      />
    </div>
  );
}
