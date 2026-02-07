import PulseraIcon from "./PulseraIcon";
import PulseraWordmark from "./PulseraWordmark";

interface PulseraLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export default function PulseraLogo({
  className = "",
  size = 36,
  color = "currentColor",
}: PulseraLogoProps) {
  const fontSize = Math.round(size * 0.95);

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: size * 0.2 }}
    >
      <PulseraIcon size={size} color={color} />
      <PulseraWordmark size={fontSize} color={color} />
    </div>
  );
}
