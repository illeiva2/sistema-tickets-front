import { Palette } from "lucide-react";
import { useTheme, ThemeName } from "../contexts/ThemeContext";
import { useAuth } from "../hooks";

interface ThemeOption {
  id: ThemeName;
  label: string;
  description: string;
  swatches: string[];
  /** Roles que pueden ver esta opción. Sin la prop, la ven todos. */
  showFor?: ("USER" | "AGENT" | "ADMIN")[];
}

const THEMES: ThemeOption[] = [
  {
    id: "quiet-pro",
    label: "Quiet Pro",
    description: "Sobrio. Violeta + grises neutros.",
    swatches: ["hsl(252 56% 57%)", "hsl(240 10% 12%)", "hsl(240 6% 95%)"],
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Cálido. Petróleo + crema.",
    swatches: ["hsl(188 60% 32%)", "hsl(22 65% 55%)", "hsl(36 30% 96%)"],
  },
  {
    id: "dystopia",
    label: "Distópico",
    description: "Terminal CRT. Fósforo verde sobre negro.",
    swatches: ["hsl(135 95% 55%)", "hsl(45 95% 58%)", "hsl(120 10% 4%)"],
    showFor: ["AGENT", "ADMIN"],
  },
];

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const visibleThemes = THEMES.filter(
    (t) => !t.showFor || (user?.role && t.showFor.includes(user.role)),
  );

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
        <Palette size={14} />
        <span>Apariencia</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {visibleThemes.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="flex -space-x-1.5">
                {t.swatches.map((c, i) => (
                  <span
                    key={i}
                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {t.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.description}
                </div>
              </div>
              {active && (
                <span className="text-xs font-medium text-primary">Activo</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
