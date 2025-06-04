import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import {
  LineChart,
  BarChart,
  ProgressChart,
  PieChart,
  ContributionGraph,
} from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";
import {
  getTrainingStatistics,
  getHealthMetricsHistory,
  getUserProfile,
} from "../api";

const screenWidth = Dimensions.get("window").width - 32;

const chartConfigBlue = {
  backgroundGradientFrom: "#1e2a78",
  backgroundGradientTo: "#1e2a78",
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: "#fff",
  },
  propsForBackgroundLines: {
    stroke: "#3b4a8b",
  },
  propsForLabels: { fontSize: 10 },
  barPercentage: 0.6,
};

const chartWidth = screenWidth - 24;
const chartConfigWhite = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(30,42,120,${opacity})`,
  labelColor: (opacity = 1) => `rgba(30,42,120,${opacity})`,
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: "#1e2a78",
  },
  propsForBackgroundLines: {
    stroke: "#eee",
  },
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

const MODES = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
];

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function StatisticsScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [trainingStats, setTrainingStats] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("week");

  useEffect(() => {
    getUserProfile().then((res) => {
      setUserId(res.data.user.id);
    });
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTrainingStats(mode);
      fetchHealthHistory();
    }
  }, [userId, mode]);

  const todayString = moment().format("DD/MM/YYYY");

  const fetchTrainingStats = async (mode) => {
    setLoading(true);
    setError("");
    try {
      const res = await getTrainingStatistics(mode);
      setTrainingStats(res.data);
    } catch (err) {
      setError("Không thể lấy dữ liệu thống kê. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthHistory = async () => {
    try {
      const res = await getHealthMetricsHistory();
      setHealthHistory(res.data);
    } catch (err) {}
  };

  // Biểu đồ tập luyện
  const getTrainingChart = (field, label) => {
    if (!trainingStats) return null;
    let labels = [];
    let data = [];
    if (mode === "week") {
      // Tạo đủ 7 ngày từ Chủ nhật đến Thứ 7 tuần hiện tại
      const today = moment();
      const startOfWeek = today.clone().startOf("week"); // Chủ nhật
      labels = [];
      data = [];
      for (let i = 0; i < 7; i++) {
        const day = startOfWeek.clone().add(i, "days");
        const label = `${WEEKDAYS[i]} ${day.format("DD")}`; // Thứ và ngày
        labels.push(label);
        // Tìm dữ liệu backend trả về cho ngày này
        const found = trainingStats.find(
          (item) =>
            item.weekday === WEEKDAYS[i] && item.date === day.format("DD/MM")
        );
        data.push(found ? found[field] || 0 : 0);
      }
    } else if (mode === "month") {
      // 12 tháng
      labels = [];
      data = [];
      const year = moment().year();
      for (let m = 1; m <= 12; m++) {
        const label = m.toString().padStart(2, "0"); // chỉ lấy số tháng
        labels.push(label);
        const found = trainingStats.find(
          (item) => item.month && item.month.startsWith(label)
        );
        data.push(found ? found[field] || 0 : 0);
      }
    } else if (mode === "year") {
      labels = trainingStats.map((item) => item.year);
      data = trainingStats.map((item) => item[field] || 0);
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
      // Tạo đủ 7 ngày từ Chủ nhật đến Thứ 7 tuần hiện tại
      const today = moment();
      const startOfWeek = today.clone().startOf("week"); // Chủ nhật
      const labels = [];
      const data = [];
      for (let i = 0; i < 7; i++) {
        const day = startOfWeek.clone().add(i, "days");
        const label = `${WEEKDAYS[i]} ${day.format("DD")}`; // Thứ và ngày
        labels.push(label);
        // Tìm dữ liệu backend trả về cho ngày này
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
      // Tổng hợp theo tháng trong năm hiện tại
      const year = moment().year();
      const labels = [];
      const data = [];
      for (let m = 1; m <= 12; m++) {
        const label = m.toString().padStart(2, "0");
        labels.push(label);
        // Lọc các bản ghi trong tháng m năm hiện tại
        const itemsInMonth = healthHistory.filter(
          (item) =>
            moment(item.date).year() === year &&
            moment(item.date).month() + 1 === m
        );
        // Tổng hợp số bước hoặc nước uống trong tháng
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
    } else if (mode === "year") {
      // ... giữ nguyên ...
      const years = [
        ...new Set(healthHistory.map((item) => moment(item.date).year())),
      ];
      const labels = years.map((y) => y.toString());
      const data = years.map((y) => {
        const itemsInYear = healthHistory.filter(
          (item) => moment(item.date).year() === y
        );
        return itemsInYear.reduce((acc, cur) => acc + (cur[field] || 0), 0);
      });
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
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.header}>Báo cáo & Thống kê</Text>
      </View>
      <ScrollView
        style={{ backgroundColor: "#fff" }}
        contentContainerStyle={{ padding: 16 }}
      >
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
        <Text
          style={{
            fontSize: 16,
            color: "#007AFF",
            textAlign: "center",
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          Hôm nay: {todayString}
        </Text>
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
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: 18,
    marginBottom: 6,
    textAlign: "center",
  },
  chart: {
    borderRadius: 12,
    marginBottom: 8,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 40,
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
});
