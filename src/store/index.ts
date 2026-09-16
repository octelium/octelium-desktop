import { configureStore } from "@reduxjs/toolkit";
import daemonReducer from "../features/daemon/slice";
import prefsReducer from "../features/prefs/slice";

const store = configureStore({
  reducer: {
    daemon: daemonReducer,
    prefs: prefsReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
