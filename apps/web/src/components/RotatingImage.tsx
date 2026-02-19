import { useState, useEffect } from 'react';

interface RotatingImageProps {
  photos: string[];
  alt: string;
  className?: string;
}

export function RotatingImage({ photos, alt, className = '' }: RotatingImageProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, 5000);
    return () => clearInterval(id);
  }, [photos.length]);

  if (!photos || photos.length === 0) return null;

  if (photos.length === 1) {
    return <img src={photos[0]} alt={alt} className={className} />;
  }

  const prevIndex = (index - 1 + photos.length) % photos.length;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={photos[prevIndex]}
        alt={alt}
        className="h-full w-full object-cover"
      />
      <img
        key={index}
        src={photos[index]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover animate-image-crossfade"
      />
    </div>
  );
}
