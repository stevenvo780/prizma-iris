import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TourContextValue {
  startTour: () => void;
  registerStart: (fn: () => void) => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => undefined,
  registerStart: () => undefined,
});

export function TourProvider({ children }: { children: ReactNode }) {
  const [startFn, setStartFn] = useState<(() => void) | null>(null);

  const registerStart = useCallback((fn: () => void) => {
    setStartFn(() => fn);
  }, []);

  const startTour = useCallback(() => {
    startFn?.();
  }, [startFn]);

  return (
    <TourContext.Provider value={{ startTour, registerStart }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  return useContext(TourContext);
}
