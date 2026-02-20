interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 -5 400 125"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="50%"
        y="60"
        textAnchor="middle"
        fontSize="78"
        textLength="280"
        lengthAdjust="spacing"
        fill="currentColor"
        fontFamily="'Playfair Display', serif"
        fontWeight="900"
      >
        Mise
      </text>
      <text
        x="50%"
        y="100"
        textAnchor="middle"
        fontSize="32"
        textLength="280"
        lengthAdjust="spacing"
        letterSpacing="0"
        fill="currentColor"
        fontFamily="'Cormorant Garamond', serif"
        fontWeight="300"
      >
        EN PLACE
      </text>
    </svg>
  );
}
