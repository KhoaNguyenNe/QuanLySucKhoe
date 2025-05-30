import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as Notifications from "expo-notifications";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from "../api";
import { useNavigation } from "@react-navigation/native";

const REMINDER_TYPES = [
  { key: "water", label: "Uống nước", icon: "cup-water" },
  { key: "exercise", label: "Tập luyện", icon: "dumbbell" },
  { key: "rest", label: "Nghỉ ngơi", icon: "bed" },
];
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function ReminderScreen() {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [reminderType, setReminderType] = useState("water");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [message, setMessage] = useState("");
  const [repeatDays, setRepeatDays] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchReminders();
    Notifications.requestPermissionsAsync();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await getReminders();
      setReminders(
        res.data.map((item) => ({
          ...item,
          repeat_days: item.repeat_days ? JSON.parse(item.repeat_days) : [],
        }))
      );
    } catch (err) {
      Alert.alert("Lỗi", "Không thể lấy danh sách nhắc nhở");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setReminderType("water");
    setDate(new Date());
    setMessage("");
    setRepeatDays([]);
    setEnabled(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setReminderType(item.reminder_type);
    // Gán ngày và giờ
    let d = new Date();
    if (item.date && item.time) {
      const [year, month, day] = item.date.split("-");
      const [hour, minute] = item.time.split(":");
      d = new Date(year, month - 1, day, hour, minute);
    }
    setDate(d);
    setMessage(item.message);
    setRepeatDays(item.repeat_days || []);
    setEnabled(item.enabled);
    setModalVisible(true);
  };

  const handleSaveReminder = async () => {
    if (!message) {
      Alert.alert("Lỗi", "Vui lòng nhập nội dung nhắc nhở");
      return;
    }
    setSaving(true);
    const reminderData = {
      reminder_type: reminderType,
      date: date.toISOString().split("T")[0],
      time: date.toTimeString().slice(0, 8),
      message,
      repeat_days: JSON.stringify(repeatDays),
      enabled,
    };
    try {
      if (editId) {
        await updateReminder(editId, reminderData);
      } else {
        await createReminder(reminderData);
      }
      setModalVisible(false);
      fetchReminders();
    } catch (err) {
      Alert.alert(
        "Lỗi",
        err?.response?.data?.detail || "Không thể lưu nhắc nhở"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa nhắc nhở này?", [
      { text: "Hủy" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(id);
            fetchReminders();
          } catch (err) {
            Alert.alert("Lỗi", "Không thể xóa nhắc nhở");
          }
        },
      },
    ]);
  };

  const handleToggleEnabled = async (item) => {
    try {
      await updateReminder(item.id, {
        ...item,
        repeat_days: JSON.stringify(item.repeat_days),
        enabled: !item.enabled,
      });
      fetchReminders();
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái nhắc nhở");
    }
  };

  const toggleDay = (day) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.header}>Báo thức</Text>
      </View>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id.toString()}
            refreshing={loading}
            onRefresh={fetchReminders}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.reminderItem}
                onPress={() => openEditModal(item)}
                activeOpacity={0.8}
              >
                <Icon
                  name={
                    REMINDER_TYPES.find((t) => t.key === item.reminder_type)
                      ?.icon || "bell-ring"
                  }
                  size={28}
                  color="#007AFF"
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.reminderType}>
                    {
                      REMINDER_TYPES.find((t) => t.key === item.reminder_type)
                        ?.label
                    }
                  </Text>
                  <Text style={styles.reminderMsg}>{item.message}</Text>
                  <Text style={styles.reminderTime}>
                    {item.time ? item.time.slice(0, 5) : ""}{" "}
                    {item.repeat_days && item.repeat_days.length === 7
                      ? "hằng ngày"
                      : item.repeat_days && item.repeat_days.length > 0
                      ? item.repeat_days.join(" ")
                      : item.date}
                  </Text>
                </View>
                <Switch
                  value={item.enabled}
                  onValueChange={() => handleToggleEnabled(item)}
                />
                <TouchableOpacity onPress={() => handleDeleteReminder(item.id)}>
                  <Icon
                    name="delete"
                    size={24}
                    color="#ff4444"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                Chưa có nhắc nhở nào
              </Text>
            }
          />
        )}
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Icon name="plus" size={28} color="#fff" />
        </TouchableOpacity>
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalBg}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editId ? "Chỉnh sửa nhắc nhở" : "Tạo nhắc nhở mới"}
              </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={reminderType}
                  onValueChange={(itemValue) => setReminderType(itemValue)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {REMINDER_TYPES.map((type) => (
                    <Picker.Item
                      key={type.key}
                      label={type.label}
                      value={type.key}
                      style={{ fontSize: 13 }}
                    />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="clock" size={22} color="#007AFF" />
                <Text
                  style={{ marginLeft: 8, fontWeight: "bold", fontSize: 16 }}
                >
                  {date.toTimeString().slice(0, 5)}
                </Text>
              </TouchableOpacity>
              <View
                style={{
                  flexDirection: "row",
                  marginVertical: 10,
                  justifyContent: "center",
                }}
              >
                {WEEKDAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={{
                      backgroundColor: repeatDays.includes(day)
                        ? "#007AFF"
                        : "#eee",
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: "center",
                      justifyContent: "center",
                      marginHorizontal: 3,
                    }}
                    onPress={() => toggleDay(day)}
                  >
                    <Text
                      style={{
                        color: repeatDays.includes(day) ? "#fff" : "#007AFF",
                        fontWeight: "bold",
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nội dung nhắc nhở"
                value={message}
                onChangeText={setMessage}
                maxLength={100}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>
                  Bật nhắc nhở
                </Text>
                <Switch value={enabled} onValueChange={setEnabled} />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                  onPress={handleSaveReminder}
                  disabled={saving}
                >
                  <Text style={{ color: "#fff" }}>
                    {saving ? "Đang lưu..." : "Lưu"}
                  </Text>
                </TouchableOpacity>
              </View>
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime) {
                      setDate((prev) => {
                        const d = new Date(prev);
                        d.setHours(selectedTime.getHours());
                        d.setMinutes(selectedTime.getMinutes());
                        return d;
                      });
                    }
                  }}
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#222",
  },
  backBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 0,
  },
  container: { flex: 1, backgroundColor: "#fff" },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  reminderType: { fontWeight: "bold", fontSize: 17 },
  reminderMsg: { color: "#333", marginTop: 2, fontSize: 15 },
  reminderTime: { color: "#888", fontSize: 13, marginTop: 2 },
  addBtn: {
    position: "absolute",
    right: 28,
    bottom: 36,
    backgroundColor: "#007AFF",
    borderRadius: 32,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#007AFF",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "92%",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: "#f8f8f8",
    overflow: "hidden",
    width: "100%",
    minWidth: 200,
    alignSelf: "center",
  },
  picker: {
    width: "100%",
    minWidth: 250,
    height: 48,
    color: "#222",
    fontSize: 16,
    paddingHorizontal: 8,
  },
  pickerItem: {
    fontSize: 16,
    color: "#222",
    paddingHorizontal: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#f8f8f8",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginLeft: 12,
    marginTop: 0,
  },
});
