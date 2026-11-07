import { setTheme } from "@/features/prefs/slice";
import { useAppDispatch, useAppSelector } from "@/utils/hooks";
import type { ThemeMode } from "@/utils/prefs";
import { SegmentedControl } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const AppearanceControl = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.prefs.prefs.theme);
  const reduceMotion = useReducedMotion();

  return (
    <SegmentedControl
      aria-label="Appearance"
      radius="xl"
      size="xs"
      value={theme}
      onChange={(value) => dispatch(setTheme({ theme: value as ThemeMode }))}
      withItemsBorders={false}
      transitionDuration={reduceMotion ? 0 : 300}
      classNames={{
        label:
          "!flex !h-7 !w-8 !items-center !justify-center !p-0 !text-muted transition-colors duration-300 hover:!text-strong data-[active]:!text-strong",
      }}
      styles={{
        root: {
          background: "var(--oct-surface)",
          border: "1px solid var(--oct-line)",
          borderRadius: "9999px",
          padding: 2,
        },
        indicator: {
          background: "var(--oct-surface-3)",
          borderRadius: "9999px",
          boxShadow: "0 0 0 1px var(--oct-line)",
        },
      }}
      data={OPTIONS.map(({ value, label, Icon }) => ({
        value,
        label: (
          <span className="flex items-center justify-center" title={label}>
            <Icon size={14} aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        ),
      }))}
    />
  );
};

export default AppearanceControl;
