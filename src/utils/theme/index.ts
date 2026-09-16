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
} from "@mantine/core";

const theme = createTheme({
  fontFamily: "Ubuntu, sans-serif",

  primaryColor: "blue",
  primaryShade: { light: 6, dark: 5 },
  autoContrast: true,
  defaultRadius: "md",

  components: {
    Button: Button.extend({
      defaultProps: {
        variant: "filled",
        className: "font-semibold shadow-sm transition-colors rounded-lg",
      },
    }),
    TextInput: TextInput.extend({
      classNames: {
        label: "font-semibold",
        input:
          "font-medium transition-colors rounded-lg focus:border-blue-500 border",
      },
    }),
    Textarea: Textarea.extend({
      classNames: {
        label: "font-semibold",
        input:
          "font-medium transition-colors rounded-lg focus:border-blue-500 border",
      },
    }),
    NumberInput: NumberInput.extend({
      classNames: {
        label: "font-semibold",
        input:
          "font-medium transition-colors rounded-lg focus:border-blue-500 border",
      },
    }),
    Switch: Switch.extend({
      classNames: {
        label: "font-semibold",
        input: "transition-all duration-500",
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
        input: "border",
        label: "font-semibold",
        option:
          "transition-colors font-medium hover:bg-slate-100 dark:hover:bg-slate-700",
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
        input: "border",
        label: "font-semibold",
        option:
          "transition-colors font-medium hover:bg-slate-100 dark:hover:bg-slate-700",
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
