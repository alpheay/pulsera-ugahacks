interface PulseraWordmarkProps {
  className?: string;
  size?: number;
  color?: string;
}

export default function PulseraWordmark({
  className = "",
  size = 20,
  color = "currentColor",
}: PulseraWordmarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-garet)",
        fontWeight: 400,
        fontSize: size,
        color: color,
        letterSpacing: "0.02em",
        lineHeight: 1,
      }}
    >
      pulsera
    </span>
  );
}
