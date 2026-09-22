import {
  setPrefersDark,
  setPrefs,
  setPrefsError,
} from "@/features/prefs/slice";
import { useAppDispatch, useAppSelector } from "@/utils/hooks";
import { defaultPrefs, loadPrefs, resolveTheme, savePrefs } from "@/utils/prefs";
import theme, { cssVariablesResolver } from "@/utils/theme";
import { MantineProvider } from "@mantine/core";
import { useEffect, useLayoutEffect, type ReactNode } from "react";

const AppTheme = (props: { children?: ReactNode }) => {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((state) => state.prefs.prefs);
  const isLoaded = useAppSelector((state) => state.prefs.isLoaded);
  const prefersDark = useAppSelector((state) => state.prefs.prefersDark);

  useEffect(() => {
    void loadPrefs()
      .then((ret) => dispatch(setPrefs({ prefs: ret })))
      .catch((error) => {
        dispatch(setPrefs({ prefs: defaultPrefs }));
        dispatch(
          setPrefsError({
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      });
  }, [dispatch]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      dispatch(setPrefersDark({ prefersDark: media.matches }));

    onChange();
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void savePrefs(prefs)
      .then(() => dispatch(setPrefsError({ error: undefined })))
      .catch((error) =>
        dispatch(
          setPrefsError({
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
  }, [dispatch, isLoaded, prefs]);

  const scheme = resolveTheme(prefs.theme, prefersDark);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", scheme);
  }, [scheme]);

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme={scheme}
    >
      {props.children}
    </MantineProvider>
  );
};

export default AppTheme;
