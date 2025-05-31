import React, { createContext, useContext, useEffect, useState } from "react";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const StepCounterContext = createContext();

export const StepCounterProvider = ({ children }) => {
  const [steps, setSteps] = useState(0);
  const [lastStepTime, setLastStepTime] = useState(0);

  useEffect(() => {
    // Load steps từ AsyncStorage
    (async () => {
      const savedSteps = await AsyncStorage.getItem("daily_steps");
      if (savedSteps) setSteps(parseInt(savedSteps));
    })();

    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const currentTime = new Date().getTime();

      if (magnitude > 1.2 && currentTime - lastStepTime > 400) {
        setSteps((prev) => {
          const updated = prev + 1;
          AsyncStorage.setItem("daily_steps", updated.toString());
          return updated;
        });
        setLastStepTime(currentTime);
      }
    });

    return () => subscription && subscription.remove();
  }, [lastStepTime]);

  return (
    <StepCounterContext.Provider value={{ steps }}>
      {children}
    </StepCounterContext.Provider>
  );
};

export const useStepCounter = () => useContext(StepCounterContext);
