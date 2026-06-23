"use client";

import { createContext, useContext, useState } from "react";

type DrawerContextType = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const DrawerContext = createContext<DrawerContextType>({
  drawerOpen: false,
  setDrawerOpen: () => {},
});

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <DrawerContext.Provider value={{ drawerOpen, setDrawerOpen }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}
