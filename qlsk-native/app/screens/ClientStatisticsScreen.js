import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import {
  getUserStatistics,
  getUserDetail,
  getHealthMetricsHistoryByUser,
} from "../api";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart, BarChart } from "react-native-chart-kit";
import moment from "moment";

const screenWidth = Dimensions.get("window").width - 32;
const chartWidth = screenWidth - 24;
const chartConfigBlue = {
  backgroundGradientFrom: "#1e2a78",
  backgroundGradientTo: "#1e2a78",
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" },
  propsForBackgroundLines: { stroke: "#3b4a8b" },
  propsForLabels: { fontSize: 10 },
  barPercentage: 0.6,
};
const chartConfigWhite = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(30,42,120,${opacity})`,
  labelColor: (opacity = 1) => `rgba(30,42,120,${opacity})`,
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#1e2a78" },
  propsForBackgroundLines: { stroke: "#eee" },
  propsForLabels: { fontSize: 10 },
  barPercentage: 0.6,
};
const cardBlue = {
  backgroundColor: "#1e2a78",
  borderRadius: 18,
  marginBottom: 18,
  padding: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 6,
  elevation: 4,
  alignItems: "center",
};
const cardWhite = {
  backgroundColor: "#fff",
  borderRadius: 18,
  marginBottom: 18,
  padding: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 6,
  elevation: 4,
  alignItems: "center",
};
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MODES = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

function UserStatisticsCharts({
  stats,
  healthHistory,
  mode,
  setMode,
  loading,
  error,
  screenWidth,
}) {
  // Lấy đúng mảng dữ liệu theo mode, luôn đảm bảo là array
  let trainingData = [];
  if (mode === "week")
    trainingData = Array.isArray(stats?.week) ? stats.week : [];
  else if (mode === "month")
    trainingData = Array.isArray(stats?.month) ? stats.month : [];

  // Biểu đồ tập luyện
  const getTrainingChart = (field, label) => {
    if (!trainingData) return null;
    let labels = [];
    let data = [];
    if (mode === "week") {
      const today = moment();
      const startOfWeek = today.clone().startOf("isoWeek");
      for (let i = 0; i < 7; i++) {
        const day = startOfWeek.clone().add(i, "days");
        const label = `${WEEKDAYS[i]} ${day.format("DD")}`;
        labels.push(label);
        const found = trainingData.find(
          (item) => item.date === day.format("DD/MM")
        );
        data.push(found ? found[field] || 0 : 0);
      }
    } else if (mode === "month") {
      const year = moment().year();
      for (let m = 1; m <= 12; m++) {
        const label = m.toString().padStart(2, "0");
        labels.push(label);
        const found = trainingData.find(
          (item) => item.month && item.month.startsWith(label)
        );
        data.push(found ? found[field] || 0 : 0);
      }
    }
    return {
      labels,
      datasets: [
        {
          data,
        },
      ],
      legend: [label],
    };
  };

  // Biểu đồ sức khỏe
  const getHealthHistoryChart = (field, label) => {
    if (!healthHistory) return null;
    if (mode === "week") {
      const today = moment();
      const startOfWeek = today.clone().startOf("isoWeek");
      const labels = [];
      const data = [];
      for (let i = 0; i < 7; i++) {
        const day = startOfWeek.clone().add(i, "days");
        const label = `${WEEKDAYS[i]} ${day.format("DD")}`;
        labels.push(label);
        const found = healthHistory.find(
          (item) => moment(item.date).format("DD/MM") === day.format("DD/MM")
        );
        data.push(found ? found[field] || 0 : 0);
      }
      return {
        labels,
        datasets: [
          {
            data,
          },
        ],
        legend: [label],
      };
    } else if (mode === "month") {
      const year = moment().year();
      const labels = [];
      const data = [];
      for (let m = 1; m <= 12; m++) {
        const label = m.toString().padStart(2, "0");
        labels.push(label);
        const itemsInMonth = healthHistory.filter(
          (item) =>
            moment(item.date).year() === year &&
            moment(item.date).month() + 1 === m
        );
        const sum = itemsInMonth.reduce(
          (acc, cur) => acc + (cur[field] || 0),
          0
        );
        data.push(sum);
      }
      return {
        labels,
        datasets: [
          {
            data,
          },
        ],
        legend: [label],
      };
    }
    return null;
  };

  const sessionChart = getTrainingChart("session_count", "Số buổi tập luyện");
  const caloriesChart = getTrainingChart(
    "total_calories",
    "Lượng calo tiêu thụ"
  );
  const stepsChart = getHealthHistoryChart("steps", "Số bước đi");
  const waterChart = getHealthHistoryChart("water_intake", "Nước uống (lít)");

  return (
    <>
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => setMode(m.key)}
          >
            <Text
              style={mode === m.key ? styles.modeTextActive : styles.modeText}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {sessionChart && (
            <View style={cardBlue}>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                {mode === "week"
                  ? "Số buổi tập luyện trong tuần"
                  : mode === "month"
                  ? "Số buổi tập luyện trong tháng"
                  : "Số buổi tập luyện theo năm"}
              </Text>
              {mode === "month" && sessionChart.labels.length > 8 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={sessionChart}
                    width={chartWidth * 2}
                    height={180}
                    yAxisLabel={""}
                    chartConfig={{
                      ...chartConfigBlue,
                      barPercentage: 0.6,
                    }}
                    fromZero
                    style={{ borderRadius: 12 }}
                  />
                </ScrollView>
              ) : (
                <BarChart
                  data={sessionChart}
                  width={chartWidth}
                  height={180}
                  yAxisLabel={""}
                  chartConfig={{
                    ...chartConfigBlue,
                    barPercentage: 0.6,
                  }}
                  fromZero
                  style={{ borderRadius: 12 }}
                />
              )}
            </View>
          )}
          {caloriesChart && (
            <View style={cardWhite}>
              <Text
                style={{
                  color: "#1e2a78",
                  fontWeight: "bold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                {mode === "week"
                  ? "Lượng calo tiêu thụ trong tuần"
                  : mode === "month"
                  ? "Lượng calo tiêu thụ trong tháng"
                  : "Lượng calo tiêu thụ theo năm"}
              </Text>
              {mode === "month" && caloriesChart.labels.length > 8 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={caloriesChart}
                    width={chartWidth * 2}
                    height={180}
                    yAxisLabel={""}
                    chartConfig={chartConfigWhite}
                    bezier
                    fromZero
                    style={{ borderRadius: 12 }}
                  />
                </ScrollView>
              ) : (
                <LineChart
                  data={caloriesChart}
                  width={chartWidth}
                  height={180}
                  yAxisLabel={""}
                  chartConfig={chartConfigWhite}
                  bezier
                  fromZero
                  style={{ borderRadius: 12 }}
                />
              )}
            </View>
          )}
          {stepsChart && (
            <View style={cardBlue}>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                {mode === "week"
                  ? "Số bước đi trong tuần"
                  : mode === "month"
                  ? "Số bước đi trong tháng"
                  : "Số bước đi theo năm"}
              </Text>
              {mode === "month" && stepsChart.labels.length > 8 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={stepsChart}
                    width={chartWidth * 2}
                    height={180}
                    yAxisLabel={""}
                    chartConfig={chartConfigBlue}
                    fromZero
                    style={{ borderRadius: 12 }}
                    bezier={false}
                  />
                </ScrollView>
              ) : (
                <LineChart
                  data={stepsChart}
                  width={chartWidth}
                  height={180}
                  yAxisLabel={""}
                  chartConfig={chartConfigBlue}
                  fromZero
                  style={{ borderRadius: 12 }}
                  bezier={false}
                />
              )}
            </View>
          )}
          {waterChart && (
            <View style={cardWhite}>
              <Text
                style={{
                  color: "#1e2a78",
                  fontWeight: "bold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                {mode === "week"
                  ? "Lượng nước uống trong tuần"
                  : mode === "month"
                  ? "Lượng nước uống trong tháng"
                  : "Lượng nước uống theo năm"}
              </Text>
              {mode === "month" && waterChart.labels.length > 8 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={waterChart}
                    width={chartWidth * 2}
                    height={180}
                    yAxisLabel={""}
                    chartConfig={chartConfigWhite}
                    fromZero
                    style={{ borderRadius: 12 }}
                  />
                </ScrollView>
              ) : (
                <BarChart
                  data={waterChart}
                  width={chartWidth}
                  height={180}
                  yAxisLabel={""}
                  chartConfig={chartConfigWhite}
                  fromZero
                  style={{ borderRadius: 12 }}
                />
              )}
            </View>
          )}
        </>
      )}
    </>
  );
}

export default function ClientStatisticsScreen({ route, navigation }) {
  const { userId, username } = route.params;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [healthHistory, setHealthHistory] = useState([]);
  const [mode, setMode] = useState("week");
  const [error, setError] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, [mode]);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [userRes, statsRes, healthRes] = await Promise.all([
        getUserDetail(userId),
        getUserStatistics(userId),
        getHealthMetricsHistoryByUser(userId),
      ]);
      setUserInfo(userRes.data);
      setStats(statsRes.data);
      setHealthHistory(healthRes.data);
    } catch (err) {
      setError("Không thể lấy dữ liệu người dùng");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2d6cf5" />
      </View>
    );
  }

  if (!stats || !userInfo) {
    return (
      <View style={styles.center}>
        <Text>Không có dữ liệu thống kê</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#2d6cf5" />
        </TouchableOpacity>
        <Text style={styles.header}>Thống kê của {username}</Text>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Thẻ thông tin cá nhân */}
        <View style={styles.profileCard}>
          <Image
            source={require("../../assets/avatar.png")}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {userInfo.username || "Chưa đặt tên"}
            </Text>
            <Text style={styles.uid}>Email: {userInfo.email || "..."}</Text>
            <Text style={styles.info}>
              Chiều cao: {userInfo.height ? userInfo.height + " cm" : "--"}
            </Text>
            <Text style={styles.info}>
              Cân nặng: {userInfo.weight ? userInfo.weight + " kg" : "--"}
            </Text>
            <Text style={styles.info}>Tuổi: {userInfo.age || "--"}</Text>
            <Text style={styles.info}>
              Mục tiêu: {userInfo.health_goal || "--"}
            </Text>
          </View>
        </View>
        {/* Thẻ theo dõi sức khỏe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theo dõi sức khỏe</Text>
          <View style={styles.infoRow}>
            <Icon name="scale-bathroom" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>BMI: {userInfo.bmi || "--"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="cup-water" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>
              Nước uống: {stats.latest_metrics?.water_intake ?? "--"} lít
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="walk" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>
              Số bước: {stats.latest_metrics?.steps ?? "--"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="heart-pulse" size={22} color="#007AFF" />
            <Text style={styles.infoValue}>
              Nhịp tim: {stats.latest_metrics?.heart_rate ?? "--"}
            </Text>
          </View>
        </View>
        {/* Biểu đồ thống kê - tái sử dụng đúng chuẩn */}
        <UserStatisticsCharts
          stats={stats}
          healthHistory={healthHistory}
          mode={mode}
          setMode={setMode}
          loading={loading}
          error={error}
          screenWidth={screenWidth}
        />
      </ScrollView>
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
    fontSize: 20,
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 18,
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: "#eee",
  },
  name: { fontSize: 20, fontWeight: "bold", color: "#222" },
  uid: { color: "#888", fontSize: 13, marginTop: 2 },
  info: { color: "#222", fontSize: 15 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
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
  infoValue: {
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 6,
  },
  modeBtnActive: {
    backgroundColor: "#007AFF",
  },
  modeText: {
    color: "#333",
    fontWeight: "bold",
  },
  modeTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 40,
  },
});
