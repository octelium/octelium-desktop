import {
  ActionIcon,
  Alert,
  Button,
  createTheme,
  Input,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Pagination,
  PasswordInput,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
  TextInput,
  Tooltip,
  virtualColor,
  type CSSVariablesResolver,
  type MantineTransition,
} from "@mantine/core";

const FONT =
  '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const SIZE_MICRO = "0.6875rem";
const SIZE_META = "0.75rem";
const SIZE_BODY = "0.8125rem";

const colors = {
  "--mantine-color-body": "var(--oct-surface)",
  "--mantine-color-text": "var(--oct-strong)",
  "--mantine-color-dimmed": "var(--oct-muted)",
  "--mantine-color-placeholder": "var(--oct-faint)",
  "--mantine-color-default": "var(--oct-surface)",
  "--mantine-color-default-hover": "var(--oct-surface-3)",
  "--mantine-color-default-color": "var(--oct-strong)",
  "--mantine-color-default-border": "var(--oct-line-strong)",
  "--mantine-color-accent-filled": "var(--oct-inverse)",
  "--mantine-color-accent-filled-hover": "var(--oct-inverse-hover)",
  "--mantine-color-accent-outline": "var(--oct-inverse)",
  "--mantine-color-accent-outline-hover":
    "color-mix(in oklab, var(--oct-inverse) 6%, transparent)",
  "--mantine-color-accent-contrast": "var(--oct-inverse-fg)",
  "--mantine-color-accent-light": "var(--oct-surface-3)",
  "--mantine-color-accent-light-hover": "var(--oct-surface-active)",
  "--mantine-color-accent-light-color": "var(--oct-strong)",
  "--mantine-primary-color-filled": "var(--oct-inverse)",
  "--mantine-primary-color-filled-hover": "var(--oct-inverse-hover)",
  "--mantine-primary-color-contrast": "var(--oct-inverse-fg)",
  "--mantine-primary-color-light": "var(--oct-surface-3)",
  "--mantine-primary-color-light-hover": "var(--oct-surface-active)",
  "--mantine-primary-color-light-color": "var(--oct-strong)",
};

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: colors,
  dark: {
    ...colors,
    "--mantine-color-black": "var(--oct-surface)",
    "--mantine-color-dark-0": "var(--oct-strong)",
    "--mantine-color-dark-1": "var(--oct-body)",
    "--mantine-color-dark-2": "var(--oct-muted)",
    "--mantine-color-dark-3": "var(--oct-faint)",
    "--mantine-color-dark-4": "var(--oct-line-strong)",
    "--mantine-color-dark-5": "var(--oct-surface-active)",
    "--mantine-color-dark-6": "var(--oct-surface-3)",
    "--mantine-color-dark-7": "var(--oct-surface)",
    "--mantine-color-dark-8": "var(--oct-surface-2)",
    "--mantine-color-dark-9": "var(--oct-app)",
  },
});

const labelStyles = {
  label: {
    fontSize: SIZE_META,
    fontWeight: 700,
    color: "var(--oct-body)",
    marginBottom: "4px",
  },
  description: {
    fontSize: SIZE_META,
    fontWeight: 500,
    lineHeight: 1.45,
    color: "var(--oct-muted)",
    marginBottom: "6px",
  },
  error: {
    fontSize: SIZE_META,
    fontWeight: 600,
  },
};

const inputStyles = {
  input: {
    fontSize: SIZE_BODY,
    fontWeight: 500,
    backgroundColor: "var(--oct-surface)",
    border: "1px solid var(--oct-line)",
    borderRadius: "8px",
    color: "var(--oct-strong)",
    minHeight: "38px",
    transition: "border-color 150ms, box-shadow 150ms",
  },
};

const comboboxProps = {
  transitionProps: { transition: "pop" as MantineTransition, duration: 150 },
  shadow: "md",
  radius: "lg" as const,
  styles: {
    dropdown: {
      border: "1px solid var(--oct-line)",
      boxShadow: "var(--oct-shadow-overlay)",
      padding: "6px",
    },
    option: {
      fontSize: SIZE_BODY,
      fontWeight: 500,
      borderRadius: "7px",
      minHeight: "34px",
      transition: "background-color 150ms, color 150ms",
    },
  },
};

const theme = createTheme({
  fontFamily: FONT,
  fontFamilyMonospace:
    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  headings: { fontFamily: FONT },

  colors: {
    accent: virtualColor({ name: "accent", light: "dark", dark: "gray" }),
  },
  primaryColor: "accent",
  autoContrast: true,
  defaultRadius: "md",
  cursorType: "default",

  components: {
    Button: Button.extend({
      defaultProps: { variant: "filled" },
      styles: {
        root: {
          fontWeight: 700,
          fontSize: SIZE_BODY,
          borderRadius: "8px",
          transition:
            "background-color 150ms, border-color 150ms, color 150ms, opacity 150ms, transform 100ms",
        },
      },
      classNames: {
        root: "active:translate-y-px disabled:active:translate-y-0",
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: "subtle", color: "gray" },
    }),
    Input: Input.extend({ styles: { ...labelStyles, ...inputStyles } }),
    TextInput: TextInput.extend({ styles: { ...labelStyles, ...inputStyles } }),
    PasswordInput: PasswordInput.extend({
      styles: { ...labelStyles, ...inputStyles },
    }),
    Textarea: Textarea.extend({ styles: { ...labelStyles, ...inputStyles } }),
    NumberInput: NumberInput.extend({
      styles: { ...labelStyles, ...inputStyles },
    }),
    Select: Select.extend({
      defaultProps: { comboboxProps, withCheckIcon: false },
      styles: { ...labelStyles, ...inputStyles },
    }),
    MultiSelect: MultiSelect.extend({
      defaultProps: { comboboxProps },
      styles: {
        ...labelStyles,
        ...inputStyles,
        pill: {
          fontSize: SIZE_META,
          fontWeight: 600,
          backgroundColor: "var(--oct-surface-3)",
          color: "var(--oct-strong)",
          border: "1px solid var(--oct-line)",
        },
      },
    }),
    Switch: Switch.extend({
      defaultProps: { size: "md", withThumbIndicator: false },
      vars: () => ({
        root: { "--switch-color": "var(--oct-switch-on)" },
      }),
      styles: {
        track: {
          cursor: "default",
          transition: "background-color 150ms, border-color 150ms",
        },
      },
    }),
    SegmentedControl: SegmentedControl.extend({
      styles: {
        root: {
          backgroundColor: "var(--oct-surface-3)",
          border: "1px solid var(--oct-line)",
          borderRadius: "10px",
          padding: "3px",
        },
        label: {
          fontSize: SIZE_BODY,
          fontWeight: 700,
          color: "var(--oct-muted)",
          transition: "color 150ms",
        },
        indicator: {
          backgroundColor: "var(--oct-segment)",
          borderRadius: "7px",
          boxShadow: "var(--oct-shadow-card)",
        },
      },
    }),
    Pagination: Pagination.extend({
      styles: {
        control: {
          fontWeight: 700,
          fontSize: SIZE_BODY,
          border: "1px solid var(--oct-line)",
          backgroundColor: "var(--oct-surface)",
          color: "var(--oct-body)",
          transition: "background-color 150ms, border-color 150ms, color 150ms",
        },
      },
    }),
    Menu: Menu.extend({
      defaultProps: {
        shadow: "md",
        radius: "lg",
        transitionProps: {
          transition: "pop" as MantineTransition,
          duration: 150,
        },
      },
      styles: {
        dropdown: {
          border: "1px solid var(--oct-line)",
          boxShadow: "var(--oct-shadow-overlay)",
          padding: "6px",
        },
        item: {
          borderRadius: "7px",
          fontSize: SIZE_BODY,
          fontWeight: 600,
          minHeight: "34px",
          transition: "background-color 150ms, color 150ms",
        },
        label: {
          color: "var(--oct-muted)",
          fontSize: SIZE_MICRO,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        },
        divider: { borderColor: "var(--oct-line)" },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: "lg",
        shadow: "xl",
        overlayProps: { backgroundOpacity: 0.4, blur: 2 },
        transitionProps: { transition: "pop", duration: 150 },
      },
      styles: {
        content: {
          border: "1px solid var(--oct-line)",
          boxShadow: "var(--oct-shadow-overlay)",
        },
      },
    }),
    Alert: Alert.extend({
      defaultProps: { radius: "lg", variant: "light" },
      styles: {
        title: { fontSize: SIZE_BODY, fontWeight: 700 },
        message: { fontSize: SIZE_BODY },
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        openDelay: 300,
        transitionProps: {
          transition: "fade" as MantineTransition,
          duration: 150,
        },
      },
      styles: {
        tooltip: {
          fontWeight: 500,
          fontSize: SIZE_META,
          backgroundColor: "var(--oct-inverse)",
          color: "var(--oct-inverse-fg)",
          borderRadius: "7px",
          boxShadow: "var(--oct-shadow-raised)",
          padding: "4px 9px",
        },
      },
    }),
  },
});

export default theme;
