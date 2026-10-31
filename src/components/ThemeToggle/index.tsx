import { setTheme } from "@/features/prefs/slice";
import { useAppDispatch, useAppSelector } from "@/utils/hooks";
import type { ThemeMode } from "@/utils/prefs";
import { ActionIcon, Tooltip } from "@mantine/core";
import { Monitor, Moon, Sun } from "lucide-react";

const NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABELS: Record<ThemeMode, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

const ThemeToggle = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.prefs.prefs.theme);

  return (
    <Tooltip label={LABELS[theme]}>
      <ActionIcon
        aria-label={LABELS[theme]}
        size={34}
        radius="md"
        className="text-muted hover:text-strong"
        onClick={() => dispatch(setTheme({ theme: NEXT[theme] }))}
      >
        {theme === "light" && <Sun size={16} aria-hidden />}
        {theme === "dark" && <Moon size={16} aria-hidden />}
        {theme === "system" && <Monitor size={16} aria-hidden />}
      </ActionIcon>
    </Tooltip>
  );
};

export default ThemeToggle;
