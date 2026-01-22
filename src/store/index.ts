import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import musicPlayerReducer from "./slices/musicPlayer";
import { apiSlice } from "./slices/apiSlice";

const store = configureStore({
  reducer: {
    musicPlayer: musicPlayerReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Ignore non-serializable values in RTK Query cache (Date objects, etc.)
      serializableCheck: {
        ignoredActions: [
          "api/executeQuery/pending",
          "api/executeQuery/fulfilled",
          "api/executeQuery/rejected",
        ],
        ignoredPaths: ["api"],
      },
    }).concat(apiSlice.middleware),
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
