import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { createHealthJournal } from "../api";

export default function HealthJournalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { workoutSession, exercises } = route.params || {};
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập cảm nhận về buổi tập!");
      return;
    }
    setLoading(true);
    try {
      await createHealthJournal({ content });
      Alert.alert("Thành công", "Đã lưu nhật ký sức khỏe!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("HomeScreen"),
        },
      ]);
    } catch (error) {
      console.log("Lỗi chi tiết:", error.response?.data);
      Alert.alert("Lỗi", "Không thể lưu nhật ký sức khỏe!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Nhật ký buổi tập</Text>
        {workoutSession && (
          <View style={styles.sessionInfo}>
            <Text style={styles.label}>
              Ngày tập: {workoutSession.start_time?.slice(0, 10)}
            </Text>
            <Text style={styles.label}>
              Tổng calo: {workoutSession.total_calories}
            </Text>
            <Text style={styles.label}>Bài tập đã thực hiện:</Text>
            {exercises && exercises.length > 0 ? (
              exercises.map((ex, idx) => (
                <Text key={ex.id} style={styles.exerciseItem}>
                  {idx + 1}. {ex.name} - {ex.calories_burned} calo
                </Text>
              ))
            ) : (
              <Text style={styles.exerciseItem}>Không có dữ liệu bài tập</Text>
            )}
          </View>
        )}
        <Text style={styles.label}>Cảm nhận của bạn về buổi tập:</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập cảm nhận..."
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Đang lưu..." : "Lưu nhật ký"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  sessionInfo: {
    marginBottom: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  exerciseItem: {
    marginLeft: 10,
    marginBottom: 4,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
