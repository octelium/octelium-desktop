import { defaultPrefs, type Prefs, type ThemeMode } from "@/utils/prefs";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type State = {
  prefs: Prefs;
  isLoaded: boolean;
  prefersDark: boolean;
  error?: string;
};

const prefersDark =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export const slice = createSlice({
  name: "prefs",
  initialState: {
    prefs: defaultPrefs,
    isLoaded: false,
    prefersDark,
  } as State,
  reducers: {
    setPrefs: (state, action: PayloadAction<{ prefs: Prefs }>) => {
      state.prefs = action.payload.prefs;
      state.isLoaded = true;
    },

    setTheme: (state, action: PayloadAction<{ theme: ThemeMode }>) => {
      state.prefs.theme = action.payload.theme;
    },

    setPrimaryDomain: (state, action: PayloadAction<{ domain?: string }>) => {
      state.prefs.primaryDomain = action.payload.domain;
    },

    setItemsPerPage: (
      state,
      action: PayloadAction<{ itemsPerPage: number }>,
    ) => {
      state.prefs.itemsPerPage = action.payload.itemsPerPage;
    },

    setPrefersDark: (state, action: PayloadAction<{ prefersDark: boolean }>) => {
      state.prefersDark = action.payload.prefersDark;
    },

    setPrefsError: (state, action: PayloadAction<{ error?: string }>) => {
      state.error = action.payload.error;
    },
  },
});

export const {
  setPrefs,
  setTheme,
  setPrimaryDomain,
  setItemsPerPage,
  setPrefersDark,
  setPrefsError,
} = slice.actions;

export default slice.reducer;
