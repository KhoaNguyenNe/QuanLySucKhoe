import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button } from "react-native-paper";
import {
  getUserProfile,
  updateUserProfile,
  updateWaterIntake,
  updateBMI,
  getHealthHistory,
  updateSteps,
} from "../api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStepCounter } from "../contexts/StepCounterContext";
import WaterIntakeInput from "./Water";
import { useFocusEffect } from "@react-navigation/native";

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userInfo, setUserInfo] = useState(null);
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [goal, setGoal] = useState("");
  const [bmi, setBMI] = useState("");
  const [todayWater, setTodayWater] = useState("--");
  const [todayHeartRate, setTodayHeartRate] = useState("--");
  const [saving, setSaving] = useState(false);
  const { steps: realtimeSteps, testNewDay } = useStepCounter();

  // Lưu số bước xuống database mỗi phút
  useEffect(() => {
    const interval = setInterval(async () => {
      if (userInfo && userInfo.id && typeof realtimeSteps === "number") {
        try {
          await updateSteps(userInfo.id, realtimeSteps);
        } catch (err) {
          // Có thể log lỗi nếu cần
        }
      }
    }, 60 * 1000); // 1 phút
    return () => clearInterval(interval);
  }, [userInfo, realtimeSteps]);

  // Reset số bước khi sang ngày mới (dùng testNewDay từ context nếu muốn test thủ công)
  useEffect(() => {
    let lastDate = new Date().toISOString().split("T")[0];
    const interval = setInterval(() => {
      const today = new Date().toISOString().split("T")[0];
      if (today !== lastDate) {
        // Reset steps về 0 (gọi testNewDay từ context)
        testNewDay && testNewDay();
        lastDate = today;
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [testNewDay]);

  useEffect(() => {
    fetchProfile();
    fetchTodayHealth();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchTodayHealth();
    }, [])
  );

  const calculateBMI = () => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      const bmiValue = (weightInKg / (heightInMeters * heightInMeters)).toFixed(
        1
      );
      setBMI(bmiValue);
    } else {
      setBMI("");
    }
  };

  useEffect(() => {
    calculateBMI();
  }, [height, weight]);

  const fetchProfile = async () => {
    try {
      const res = await getUserProfile();
      setUserInfo(res.data.user);
      setName(res.data.user.username);
      setHeight(res.data.user.height ? String(res.data.user.height) : "");
      setWeight(res.data.user.weight ? String(res.data.user.weight) : "");
      setAge(res.data.user.age ? String(res.data.user.age) : "");
      setGoal(res.data.user.health_goal || "");
      setBMI(res.data.user.bmi || "");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể lấy thông tin hồ sơ.");
    }
  };

  const fetchTodayHealth = async () => {
    try {
      const res = await getHealthHistory();
      if (res.data) {
        const today = new Date().toISOString().split("T")[0];
        const todayData = res.data.find((item) => item.date === today);
        setTodayWater(todayData ? todayData.water_intake : "--");
        setTodayHeartRate(todayData ? todayData.heart_rate : "--");
      }
    } catch (e) {
      setTodayWater("--");
      setTodayHeartRate("--");
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let bmiValue = null;
      if (height && weight) {
        const heightInMeters = parseFloat(height) / 100;
        const weightInKg = parseFloat(weight);
        bmiValue = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
      }
      await updateUserProfile({
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        age: age ? parseInt(age) : null,
        health_goal: goal,
        bmi: bmiValue ? parseFloat(bmiValue) : null,
      });
      setBMI(bmiValue);
      Alert.alert("Thành công", "Đã lưu thông tin cá nhân!");
    } catch (err) {
      console.log("Lỗi lưu thông tin:", err?.response?.data || err);
      Alert.alert("Lỗi", "Không thể lưu thông tin. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    navigation.navigate("ResetPasswordScreen", { isChangePassword: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
      </View>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/avatar.png")}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name || "Chưa đặt tên"}</Text>
            <Text style={styles.uid}>Email: {userInfo?.email || "..."}</Text>
          </View>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleChangePassword}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Đổi mật khẩu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin cá nhân */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              marginBottom: 10,
            }}
          >
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving}
              style={{ marginLeft: 8 }}
            >
              <Icon
                name="content-save"
                size={25}
                color={saving ? "#ccc" : "#007AFF"}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Icon name="human-male-height" size={22} color="#007AFF" />
            <View
              style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
            >
              <TextInput
                style={[styles.infoInput, { flex: 1 }]}
                value={height}
                onChangeText={setHeight}
                placeholder="Chiều cao"
                keyboardType="numeric"
              />
              <Text style={{ marginLeft: 4, fontWeight: 800 }}>cm</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Icon name="weight-kilogram" size={22} color="#007AFF" />
            <TextInput
              style={styles.infoInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="Cân nặng (kg)"
              keyboardType="numeric"
            />
            <Text style={{ marginLeft: 4, fontWeight: 800 }}>kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="calendar-account" size={22} color="#007AFF" />
            <TextInput
              style={styles.infoInput}
              value={age}
              onChangeText={setAge}
              placeholder="Tuổi"
              keyboardType="numeric"
            />
            <Text style={{ marginLeft: 4, fontWeight: 800 }}>Tuổi</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="target" size={22} color="#007AFF" />
            <TextInput
              style={styles.infoInput}
              value={goal}
              onChangeText={setGoal}
              placeholder="Mục tiêu sức khỏe"
            />
          </View>
        </View>

        {/* Theo dõi sức khỏe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theo dõi sức khỏe</Text>
          <View style={styles.infoRow}>
            <Icon name="scale-bathroom" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>BMI: {bmi || "--"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="cup-water" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>
              Nước uống: {todayWater ?? "--"} lít
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="walk" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>
              Số bước: {realtimeSteps ?? "--"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="heart-pulse" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>
              Nhịp tim: {todayHeartRate ?? "--"}
            </Text>
          </View>
        </View>

        {/* Các mục khác */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="sync" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Đồng bộ & khôi phục dữ liệu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="watch-variant" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Kết nối thiết bị đeo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="file-export" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Xuất dữ liệu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="translate" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Ngôn ngữ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="star-outline" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Đánh giá & nhận xét</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="account-multiple-plus" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Chia sẻ với bạn bè</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="email-outline" size={22} color="#007AFF" />
            <Text style={styles.menuLabel}>Liên hệ hỗ trợ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f7f7" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    elevation: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 12,
  },
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: 12,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: "#eee",
  },
  name: { fontSize: 20, fontWeight: "bold", color: "#222" },
  nameInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    borderBottomWidth: 1,
    borderColor: "#007AFF",
    minWidth: 120,
  },
  uid: { color: "#888", fontSize: 13, marginTop: 2 },
  loginBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 10,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 14,
    marginBottom: 18,
    padding: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#222",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoInput: {
    flex: 1,
    marginLeft: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    fontSize: 15,
    paddingVertical: 2,
    color: "#222",
  },
  infoValue: {
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  menuLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: "#222",
  },
});
