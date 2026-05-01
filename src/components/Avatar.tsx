import React from "react";

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

const initials = (name?: string | null, email?: string | null): string => {
  const source = (name?.trim() || email || "").trim();
  if (!source) return "·";
  const parts = source.split(/\s+|[._-]/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 1).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const hueFor = (key: string): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) % 360;
  }
  return h;
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  email,
  size = 24,
  className = "",
}) => {
  const key = (name || email || "?").trim();
  const hue = hueFor(key);
  const text = initials(name, email);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.4)),
        background: `hsl(${hue} 60% 88%)`,
        color: `hsl(${hue} 50% 28%)`,
      }}
      aria-label={key}
      title={key}
    >
      {text}
    </span>
  );
};

export default Avatar;
