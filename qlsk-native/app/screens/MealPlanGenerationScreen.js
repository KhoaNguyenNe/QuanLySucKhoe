import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../api";

const MealPlanGenerationScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleGenerateMealPlan = async () => {
    try {
      setLoading(true);
      const response = await api.post("/meal-plans/generate/");

      Alert.alert(
        "Thành công",
        "Thực đơn đã được tạo. Bạn có muốn xem chi tiết không?",
        [
          {
            text: "Để sau",
            style: "cancel",
          },
          {
            text: "Xem chi tiết",
            onPress: () =>
              navigation.navigate("MealPlanDetailScreen", {
                id: response.data.id,
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Lỗi", error.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tạo thực đơn dinh dưỡng</Text>

      <Text style={styles.description}>
        Hệ thống sẽ sử dụng ChatGPT để tạo một thực đơn dinh dưỡng phù hợp với
        mục tiêu của bạn. Thực đơn sẽ bao gồm các bữa ăn trong ngày với đầy đủ
        thông tin về dinh dưỡng và cách chế biến.
      </Text>

      <TouchableOpacity
        style={[styles.generateButton, loading && styles.disabledButton]}
        onPress={handleGenerateMealPlan}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.generateButtonText}>Tạo thực đơn</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default MealPlanGenerationScreen;
