import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import api from "../api";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MealPlanDetailScreen = ({ route }) => {
  const { id } = route?.params || {};
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Nếu không có id, báo lỗi rõ ràng
  if (!id) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Không tìm thấy thông tin thực đơn (id bị thiếu hoặc không hợp lệ)
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    fetchMealPlan();
  }, []);

  const fetchMealPlan = async () => {
    try {
      const response = await api.get(`/meal-plans/${id}/`);
      setMealPlan(response.data);
      await saveRecentMealPlan(response.data);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải thông tin thực đơn");
    } finally {
      setLoading(false);
    }
  };

  // Lưu meal plan đã xem vào AsyncStorage
  const saveRecentMealPlan = async (plan) => {
    try {
      let recent = await AsyncStorage.getItem("recent_meal_plans");
      recent = recent ? JSON.parse(recent) : [];
      // Xóa nếu đã có
      recent = recent.filter((item) => item.id !== plan.id);
      // Thêm mới lên đầu
      recent.unshift({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        total_calories: plan.total_calories,
        protein: plan.protein,
        carbs: plan.carbs,
        fat: plan.fat,
        created_at: plan.created_at,
      });
      // Giới hạn tối đa 10 meal plan gần đây
      if (recent.length > 10) recent = recent.slice(0, 10);
      await AsyncStorage.setItem("recent_meal_plans", JSON.stringify(recent));
    } catch (e) {
      // Bỏ qua lỗi lưu local
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!mealPlan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy thực đơn</Text>
      </View>
    );
  }

  const mealTypes = {
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối",
    snack: "Bữa phụ",
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.header}>Chi tiết thực đơn</Text>
      </View>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{mealPlan.title}</Text>
        <Text style={styles.description}>{mealPlan.description}</Text>

        <View style={styles.nutritionInfo}>
          <Text style={styles.nutritionTitle}>Thông tin dinh dưỡng</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {mealPlan.total_calories}
              </Text>
              <Text style={styles.nutritionLabel}>Calo</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{mealPlan.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{mealPlan.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{mealPlan.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {mealPlan.meals.map((meal) => (
          <View key={meal.id} style={styles.mealContainer}>
            <Text style={styles.mealType}>{mealTypes[meal.meal_type]}</Text>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealDescription}>{meal.description}</Text>

            <View style={styles.mealNutrition}>
              <Text style={styles.mealNutritionText}>
                Calo: {meal.calories} | Protein: {meal.protein}g | Carbs:{" "}
                {meal.carbs}g | Fat: {meal.fat}g
              </Text>
            </View>

            <View style={styles.mealDetails}>
              <Text style={styles.sectionTitle}>Nguyên liệu:</Text>
              <Text style={styles.mealText}>{meal.ingredients}</Text>

              <Text style={styles.sectionTitle}>Cách chế biến:</Text>
              <Text style={styles.mealText}>{meal.instructions}</Text>
            </View>
          </View>
        ))}
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
    fontSize: 22,
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
    backgroundColor: "#fff",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    lineHeight: 24,
  },
  nutritionInfo: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  nutritionLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  mealContainer: {
    marginBottom: 30,
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 10,
  },
  mealType: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 5,
  },
  mealName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  mealDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    lineHeight: 24,
  },
  mealNutrition: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  mealNutritionText: {
    fontSize: 14,
    color: "#666",
  },
  mealDetails: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  mealText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
});

export default MealPlanDetailScreen;
