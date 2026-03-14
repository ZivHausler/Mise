import { useState, useEffect, useRef, memo } from 'react';

interface RotatingImageProps {
  photos: string[];
  alt: string;
  className?: string;
}

export const RotatingImage = memo(function RotatingImage({ photos, alt, className = '' }: RotatingImageProps) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || photos.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, 5000);
    return () => clearInterval(id);
  }, [isVisible, photos.length]);

  if (!photos || photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <div ref={containerRef} className={`overflow-hidden ${className}`}>
        <img src={photos[0]} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }

  const prevIndex = (index - 1 + photos.length) % photos.length;

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <img
        src={photos[prevIndex]}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <img
        key={index}
        src={photos[index]}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover animate-image-crossfade"
      />
    </div>
  );
});
