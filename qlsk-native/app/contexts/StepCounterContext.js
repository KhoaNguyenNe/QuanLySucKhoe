import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateSteps, saveStepsHistory } from "../api";

const StepCounterContext = createContext();

export const StepCounterProvider = ({ children }) => {
  const [steps, setSteps] = useState(0);
  const [lastStepTime, setLastStepTime] = useState(0);
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const dateRef = useRef(currentDate);

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

  // Gửi số bước mỗi 1 phút
  useEffect(() => {
    const interval = setInterval(async () => {
      let uid = await AsyncStorage.getItem("user_id");
      if (uid && steps >= 0) {
        // Cập nhật số bước hiện tại vào HealthProfile
        updateSteps(uid, steps).catch((err) =>
          console.log("Lỗi cập nhật steps:", err?.response?.data || err)
        );
      }
    }, 60 * 1000); // 1 phút
    return () => clearInterval(interval);
  }, [steps]);

  // Reset steps khi sang ngày mới
  useEffect(() => {
    const interval = setInterval(async () => {
      const today = new Date().toISOString().split("T")[0];
      if (dateRef.current !== today) {
        const uid = await AsyncStorage.getItem("user_id");
        if (uid) {
          try {
            // Lưu số bước cuối cùng của ngày cũ vào HealthMetricsHistory
            if (steps > 0) {
              await saveStepsHistory({
                user: uid,
                date: dateRef.current, // Ngày cũ
                steps: steps,
                metric_type: "steps",
              });
              console.log("Đã lưu số bước của ngày cũ vào history:", steps);
            }

            // Reset số bước trong HealthProfile về 0
            await updateSteps(uid, 0);
            console.log("Đã reset số bước trong profile về 0");

            // Reset số bước cho ngày mới
            setCurrentDate(today);
            dateRef.current = today;
            setSteps(0);
            AsyncStorage.setItem("daily_steps", "0");
          } catch (err) {
            console.log("Lỗi xử lý sang ngày mới:", err?.response?.data || err);
          }
        }
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [steps]);

  // Hàm test giả lập qua ngày mới
  const testNewDay = async () => {
    const uid = await AsyncStorage.getItem("user_id");
    if (uid) {
      try {
        // Lưu số bước hiện tại vào HealthMetricsHistory
        if (steps > 0) {
          await saveStepsHistory({
            user: uid,
            date: dateRef.current,
            steps: steps,
            metric_type: "steps",
          });
          console.log("Test: Đã lưu số bước vào history:", steps);
        }

        // Reset số bước trong HealthProfile về 0
        await updateSteps(uid, 0);
        console.log("Test: Đã reset số bước trong profile về 0");

        // Reset số bước cho ngày mới
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        setCurrentDate(tomorrowStr);
        dateRef.current = tomorrowStr;
        setSteps(0);
        AsyncStorage.setItem("daily_steps", "0");
        console.log("Test: Đã reset số bước về 0 cho ngày mới");
      } catch (err) {
        console.log(
          "Test: Lỗi xử lý sang ngày mới:",
          err?.response?.data || err
        );
      }
    }
  };

  return (
    <StepCounterContext.Provider value={{ steps, testNewDay }}>
      {children}
    </StepCounterContext.Provider>
  );
};

export const useStepCounter = () => useContext(StepCounterContext);
