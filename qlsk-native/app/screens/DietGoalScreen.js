import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import api from "../api";

const DietGoalScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [goalType, setGoalType] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const goalTypes = [
    { id: "muscle_gain", label: "Tăng cơ" },
    { id: "weight_loss", label: "Giảm cân" },
    { id: "maintenance", label: "Duy trì sức khỏe" },
  ];

  const handleCreateGoal = async () => {
    try {
      if (!goalType) {
        Alert.alert("Lỗi", "Vui lòng chọn mục tiêu dinh dưỡng");
        return;
      }

      // Chuyển đổi định dạng ngày từ dd/mm/yyyy sang yyyy-mm-dd
      let formattedDate = null;
      if (targetDate) {
        const [day, month, year] = targetDate.split("/");
        formattedDate = `${year}-${month}-${day}`;
      }

      const response = await api.post("/diet-goals/", {
        goal_type: goalType,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        target_date: formattedDate,
      });

      Alert.alert(
        "Thành công",
        "Mục tiêu dinh dưỡng đã được tạo. Bạn có muốn tạo thực đơn ngay bây giờ không?",
        [
          {
            text: "Để sau",
            style: "cancel",
          },
          {
            text: "Tạo thực đơn",
            onPress: () => navigation.navigate("MealPlanGenerationScreen"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.error || "Có lỗi xảy ra");
    }
  };

  const formatDate = (text) => {
    // Xóa tất cả ký tự không phải số
    let cleaned = text.replace(/\D/g, "");

    // Thêm dấu / sau mỗi 2 số
    if (cleaned.length > 2) {
      cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    if (cleaned.length > 5) {
      cleaned = cleaned.slice(0, 5) + "/" + cleaned.slice(5, 9);
    }

    return cleaned;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.header}>Mục tiêu dinh dưỡng</Text>
      </View>

      <ScrollView style={styles.container}>
        <Text style={styles.title}>Chọn mục tiêu dinh dưỡng</Text>

        <View style={styles.goalTypesContainer}>
          {goalTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.goalTypeButton,
                goalType === type.id && styles.selectedGoalType,
              ]}
              onPress={() => setGoalType(type.id)}
            >
              <Text
                style={[
                  styles.goalTypeText,
                  goalType === type.id && styles.selectedGoalTypeText,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cân nặng mục tiêu (kg)</Text>
          <TextInput
            style={styles.input}
            value={targetWeight}
            onChangeText={setTargetWeight}
            keyboardType="numeric"
            placeholder="Nhập cân nặng mục tiêu"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Ngày đạt mục tiêu</Text>
          <TextInput
            style={styles.input}
            value={targetDate}
            onChangeText={(text) => setTargetDate(formatDate(text))}
            placeholder="DD/MM/YYYY"
            maxLength={10}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateGoal}
        >
          <Text style={styles.createButtonText}>Tạo mục tiêu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  goalTypesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  goalTypeButton: {
    width: "30%",
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedGoalType: {
    backgroundColor: "#007AFF",
  },
  goalTypeText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  selectedGoalTypeText: {
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default DietGoalScreen;
