"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getItem, setItem } from "./storage";

const CALORIE_TARGET_KEY = "calorie_target";
export const DEFAULT_CALORIE_TARGET = 2000;

type SettingsContextType = {
  calorieTarget: number;
  setCalorieTarget: (val: number) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  calorieTarget: DEFAULT_CALORIE_TARGET,
  setCalorieTarget: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [calorieTarget, setCalorieTargetState] = useState(
    DEFAULT_CALORIE_TARGET,
  );

  useEffect(() => {
    const val = getItem(CALORIE_TARGET_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (val) setCalorieTargetState(parseInt(val));
  }, []);

  function setCalorieTarget(val: number) {
    setCalorieTargetState(val);
    setItem(CALORIE_TARGET_KEY, String(val));
  }

  return (
    <SettingsContext.Provider value={{ calorieTarget, setCalorieTarget }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
