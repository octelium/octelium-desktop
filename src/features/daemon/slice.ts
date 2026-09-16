import type { GetInfoResponse, GetStatusResponse } from "@/gen/client/daemonv1";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Availability = "unknown" | "available" | "unavailable" | "incompatible";

type State = {
  availability: Availability;
  info?: GetInfoResponse;
  status?: GetStatusResponse;
  error?: string;
  selectedDomain?: string;
};

export const slice = createSlice({
  name: "daemon",
  initialState: {
    availability: "unknown",
  } as State,
  reducers: {
    setInfo: (state, action: PayloadAction<{ info: GetInfoResponse }>) => {
      state.info = action.payload.info;
    },

    setStatus: (state, action: PayloadAction<{ status: GetStatusResponse }>) => {
      state.status = action.payload.status;
      state.availability = "available";
      state.error = undefined;
    },

    setUnavailable: (
      state,
      action: PayloadAction<{ error: string; availability?: Availability }>,
    ) => {
      state.availability = action.payload.availability ?? "unavailable";
      state.error = action.payload.error;
      state.status = undefined;
    },

    setSelectedDomain: (state, action: PayloadAction<{ domain?: string }>) => {
      state.selectedDomain = action.payload.domain;
    },
  },
});

export const { setInfo, setStatus, setUnavailable, setSelectedDomain } =
  slice.actions;

export default slice.reducer;
