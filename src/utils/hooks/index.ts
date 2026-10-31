import { useCallback } from "react";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import type { AppDispatch, RootState } from "../../store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useFilterParams = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const buildURL = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("common.page");

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          nextParams.set(key, value);
        } else {
          nextParams.delete(key);
        }
      }

      const query = nextParams.toString();
      return `${location.pathname}${query ? `?${query}` : ""}`;
    },
    [location.pathname, searchParams],
  );

  const setParams = useCallback(
    (
      updates: Record<string, string | null>,
      options?: { replace?: boolean },
    ) => {
      navigate(buildURL(updates), { replace: options?.replace });
    },
    [buildURL, navigate],
  );

  return { searchParams, setParams, buildURL };
};
