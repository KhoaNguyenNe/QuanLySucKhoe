import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  getExercises,
  createWorkoutSession,
  completeExercise,
  completeWorkout,
  getWorkoutSession,
  createHealthJournal,
} from "../api";

export default function WorkoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [workoutSession, setWorkoutSession] = useState(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const initializeWorkout = async () => {
      try {
        if (
          !route.params?.selectedExercises ||
          !Array.isArray(route.params.selectedExercises) ||
          route.params.selectedExercises.length === 0
        ) {
          throw new Error("Vui lòng chọn ít nhất một bài tập");
        }

        // Log dữ liệu trước khi gửi
        const workoutData = {
          exercises: route.params.selectedExercises.map((id) => ({
            id: parseInt(id, 10),
          })),
        };

        // Tạo buổi tập mới với danh sách bài tập
        const response = await createWorkoutSession(workoutData);

        if (!response || !response.data) {
          throw new Error("Không thể tạo buổi tập");
        }

        // Lấy thông tin chi tiết của buổi tập
        const sessionResponse = await getWorkoutSession(response.data.id);
        if (!sessionResponse || !sessionResponse.data) {
          throw new Error("Không thể lấy thông tin buổi tập");
        }

        // Cập nhật state với thông tin buổi tập
        setWorkoutSession(sessionResponse.data);
        setCurrentExerciseIndex(0);
        setWorkoutStarted(true);

        // Lấy thông tin chi tiết các bài tập
        const exercisesResponse = await getExercises();
        const allExercises = exercisesResponse.data;
        const selectedExercisesData = route.params.selectedExercises
          .map((id) => allExercises.find((ex) => ex.id === parseInt(id)))
          .filter(Boolean);

        if (selectedExercisesData.length === 0) {
          throw new Error("Không tìm thấy thông tin bài tập");
        }

        setExercises(selectedExercisesData);
        setTimeLeft(selectedExercisesData[0]?.duration * 60 || 0);
      } catch (error) {
        console.error("Lỗi khi khởi tạo buổi tập:", error);
        Alert.alert(
          "Lỗi",
          error.response?.data?.error ||
            error.message ||
            "Có lỗi xảy ra khi khởi tạo buổi tập"
        );
      }
    };

    initializeWorkout();
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timerRef.current);
      handleCompleteExercise();
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStartExercise = () => {
    setIsActive(true);
  };

  const handlePauseExercise = () => {
    setIsActive(false);
  };

  const handleCompleteExercise = async () => {
    if (!workoutSession) return;

    const currentExercise = exercises[currentExerciseIndex];
    const actualDuration = Math.max(
      currentExercise.duration * 60 - timeLeft,
      1
    );
    const caloriesBurned =
      Math.round(
        (actualDuration / (currentExercise.duration * 60)) *
          currentExercise.calories_burned
      ) || currentExercise.calories_burned;

    try {
      await completeExercise(workoutSession.id, {
        exercise_id: currentExercise.id,
        duration: actualDuration,
        calories_burned: caloriesBurned,
      });

      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        setTimeLeft(exercises[nextIndex].duration * 60);
        setIsActive(false);
      } else {
        // Hoàn thành buổi tập
        await completeWorkout(workoutSession.id);
        Alert.alert("Chúc mừng!", "Bạn đã hoàn thành buổi tập", [
          {
            text: "Viết nhật ký",
            onPress: async () => {
              const sessionResponse = await getWorkoutSession(
                workoutSession.id
              );
              navigation.navigate("HealthJournalScreen", {
                workoutSession: sessionResponse.data,
                exercises,
              });
            },
          },
          {
            text: "Quay lại",
            onPress: async () => {
              try {
                await createHealthJournal({
                  content: "không có",
                  workout_session: workoutSession.id,
                });
              } catch (error) {
                console.error("Lỗi khi lưu nhật ký tự động:", error);
              }
              navigation.navigate("HomeScreen");
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Lỗi khi hoàn thành bài tập:", error);
      Alert.alert("Lỗi", "Không thể lưu thông tin bài tập");
    }
  };

  const currentExercise = exercises[currentExerciseIndex];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              "Xác nhận",
              "Bạn có chắc muốn thoát buổi tập? Tiến độ sẽ không được lưu.",
              [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Thoát",
                  style: "destructive",
                  onPress: () => navigation.goBack(),
                },
              ]
            );
          }}
        >
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Bài tập {currentExerciseIndex + 1}/{exercises.length}
        </Text>
      </View>

      {currentExercise && (
        <View style={styles.exerciseContainer}>
          <Image
            source={
              currentExercise.image
                ? { uri: currentExercise.image }
                : require("../../assets/avatar.png")
            }
            style={styles.exerciseImage}
            resizeMode="contain"
          />
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>
          <Text style={styles.exerciseDescription}>
            {currentExercise.description}
          </Text>
          <Text style={styles.exerciseInfo}>
            Số lần: {currentExercise.repetitions || "-"} | Calo:{" "}
            {currentExercise.calories_burned}
          </Text>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <View style={styles.timerButtons}>
              {!isActive ? (
                <TouchableOpacity
                  style={[styles.timerButton, styles.startButton]}
                  onPress={handleStartExercise}
                >
                  <Icon name="play" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Bắt đầu</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.timerButton, styles.pauseButton]}
                  onPress={handlePauseExercise}
                >
                  <Icon name="pause" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Tạm dừng</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.timerButton, styles.completeButton]}
                onPress={handleCompleteExercise}
              >
                <Icon name="check" size={24} color="#fff" />
                <Text style={styles.buttonText}>Hoàn thành</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16,
  },
  exerciseContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  exerciseImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  exerciseDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  exerciseInfo: {
    fontSize: 14,
    color: "#888",
    marginBottom: 30,
  },
  timerContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 20,
  },
  timerButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    minWidth: 120,
    justifyContent: "center",
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  pauseButton: {
    backgroundColor: "#FFA000",
  },
  completeButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
