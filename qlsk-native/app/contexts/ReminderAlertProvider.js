import React, { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { getReminders } from "../api";

export const ReminderAlertContext = React.createContext();

export default function ReminderAlertProvider({ children }) {
  const [reminders, setReminders] = useState([]);
  const alertedRemindersRef = useRef({});

  // Đặt fetchReminders ở ngoài useEffect
  const fetchReminders = async () => {
    try {
      const res = await getReminders();
      setReminders(
        res.data.map((item) => ({
          ...item,
          repeat_days: item.repeat_days ? JSON.parse(item.repeat_days) : [],
        }))
      );
    } catch (err) {}
  };

  useEffect(() => {
    fetchReminders();
    const fetchInterval = setInterval(fetchReminders, 2 * 60 * 1000); // 2 phút
    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndAlertReminders(reminders, alertedRemindersRef);
    }, 1000); // 1 giây
    return () => clearInterval(interval);
  }, [reminders]);

  return (
    <ReminderAlertContext.Provider value={{ fetchReminders }}>
      {children}
    </ReminderAlertContext.Provider>
  );
}

function checkAndAlertReminders(reminders, alertedRemindersRef) {
  const now = new Date();
  reminders.forEach((reminder) => {
    if (!reminder.enabled) return;
    const key = `${reminder.id}_${now
      .toISOString()
      .slice(0, 10)}_${now.getHours()}_${now.getMinutes()}`;
    if (alertedRemindersRef.current[key]) return;

    let shouldAlert = false;
    if (reminder.repeat_days && reminder.repeat_days.length === 7) {
      if (
        now.getHours() === parseInt(reminder.time.slice(0, 2)) &&
        now.getMinutes() === parseInt(reminder.time.slice(3, 5))
      ) {
        shouldAlert = true;
      }
    } else if (reminder.repeat_days && reminder.repeat_days.length > 0) {
      const weekday = now.getDay() === 0 ? "CN" : "T" + (now.getDay() + 1);
      if (
        reminder.repeat_days.includes(weekday) &&
        now.getHours() === parseInt(reminder.time.slice(0, 2)) &&
        now.getMinutes() === parseInt(reminder.time.slice(3, 5))
      ) {
        shouldAlert = true;
      }
    } else {
      if (
        reminder.date === now.toISOString().slice(0, 10) &&
        now.getHours() === parseInt(reminder.time.slice(0, 2)) &&
        now.getMinutes() === parseInt(reminder.time.slice(3, 5))
      ) {
        shouldAlert = true;
      }
    }
    if (shouldAlert) {
      const title =
        reminder.reminder_type === "water"
          ? "Uống nước"
          : reminder.reminder_type === "exercise"
          ? "Tập luyện"
          : "Nghỉ ngơi";
      const alertMsg =
        reminder.message && reminder.message.trim() !== ""
          ? title + ": " + reminder.message
          : title;
      Alert.alert("Nhắc nhở", alertMsg);
      alertedRemindersRef.current[key] = true;
    }
  });
}
