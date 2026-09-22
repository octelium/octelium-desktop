import {
  Button,
  createTheme,
  MultiSelect,
  NumberInput,
  Select,
  Switch,
  Textarea,
  TextInput,
  Tooltip,
  virtualColor,
  type CSSVariablesResolver,
} from "@mantine/core";

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-accent-filled": "var(--oct-inverse)",
    "--mantine-color-accent-filled-hover": "var(--oct-inverse-hover)",
    "--mantine-color-accent-outline": "var(--oct-inverse)",
    "--mantine-color-accent-contrast": "var(--oct-inverse-fg)",
  },
  dark: {
    "--mantine-color-dark-0": "var(--oct-strong)",
    "--mantine-color-black": "var(--oct-surface)",

    "--mantine-color-dark-1": "var(--oct-body)",
    "--mantine-color-dark-2": "var(--oct-muted)",
    "--mantine-color-dark-3": "var(--oct-faint)",
    "--mantine-color-dark-4": "var(--oct-line-strong)",
    "--mantine-color-dark-5": "var(--oct-surface-3)",
    "--mantine-color-dark-6": "var(--oct-surface-2)",
    "--mantine-color-dark-7": "var(--oct-surface)",
    "--mantine-color-dark-8": "var(--oct-app)",
    "--mantine-color-dark-9": "var(--oct-app)",
    "--mantine-color-default-color": "var(--oct-strong)",
    "--mantine-color-accent-filled": "var(--oct-inverse)",
    "--mantine-color-accent-filled-hover": "var(--oct-inverse-hover)",
    "--mantine-color-accent-outline": "var(--oct-inverse)",
    "--mantine-color-accent-outline-hover":
      "color-mix(in oklab, var(--oct-inverse) 6%, transparent)",
    "--mantine-color-accent-contrast": "var(--oct-inverse-fg)",
    "--mantine-color-accent-light": "var(--oct-surface-3)",
    "--mantine-color-accent-light-hover": "var(--oct-surface-active)",
    "--mantine-color-accent-light-color": "var(--oct-strong)",
    "--mantine-primary-color-light": "var(--oct-surface-3)",
    "--mantine-primary-color-light-hover": "var(--oct-surface-active)",
    "--mantine-primary-color-light-color": "var(--oct-strong)",
  },
});

const theme = createTheme({
  fontFamily: "Ubuntu, sans-serif",

  colors: {
    accent: virtualColor({ name: "accent", light: "dark", dark: "gray" }),
  },
  primaryColor: "accent",
  autoContrast: true,
  defaultRadius: "md",

  components: {
    Button: Button.extend({
      defaultProps: {
        variant: "filled",
        className:
          "font-bold shadow-md transition-all duration-300 rounded-md active:translate-y-px active:shadow-sm",
      },
    }),
    TextInput: TextInput.extend({
      classNames: {
        label: "font-semibold",
        input:
          "font-medium transition-all duration-300 rounded-md focus:shadow-md focus:border-inverse border-2",
      },
    }),
    Textarea: Textarea.extend({
      classNames: {
        label: "font-semibold",
        input:
          "font-medium transition-all duration-300 rounded-md focus:shadow-md focus:border-inverse border-2",
      },
    }),
    NumberInput: NumberInput.extend({
      classNames: {
        label: "font-semibold",
        input:
          "font-medium transition-all duration-300 rounded-md focus:shadow-md focus:border-inverse border-2",
      },
    }),
    Switch: Switch.extend({
      classNames: {
        label: "font-semibold",
        input: "transition-all duration-300",
      },
    }),
    Select: Select.extend({
      defaultProps: {
        radius: "md",
        comboboxProps: {
          transitionProps: { transition: "pop", duration: 200 },
          shadow: "sm",
          radius: "md",
        },
      },
      classNames: {
        input: "border-2 transition-all duration-300 focus:shadow-md focus:border-inverse",
        label: "font-semibold",
        option:
          "transition-colors font-medium hover:bg-surface-3",
      },
    }),
    MultiSelect: MultiSelect.extend({
      defaultProps: {
        radius: "md",
        comboboxProps: {
          transitionProps: { transition: "pop", duration: 200 },
          shadow: "sm",
          radius: "md",
        },
      },
      classNames: {
        input: "border-2 transition-all duration-300 focus:shadow-md focus:border-inverse",
        label: "font-semibold",
        option:
          "transition-colors font-medium hover:bg-surface-3",
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        transitionProps: {
          transition: "fade",
          duration: 350,
        },
        classNames: {
          tooltip: "shadow-md font-bold text-xs rounded-sm",
        },
      },
    }),
  },
});

export default theme;
