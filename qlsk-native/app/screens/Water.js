import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { updateWaterIntake, getHealthHistory } from "../api";
import { getWaterSessions, addWaterSession } from "../api";

export default function WaterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [waterHistory, setWaterHistory] = useState([]);
  const [totalWater, setTotalWater] = useState(0);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const dateRef = useRef(currentDate);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().split("T")[0];
      if (dateRef.current !== today) {
        setCurrentDate(today);
        dateRef.current = today;
        setTotalWater(0);
        fetchWaterHistory();
      }
    }, 60 * 1000); // Kiểm tra mỗi phút
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchWaterHistory();
  }, []);

  const fetchWaterHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Lấy lịch sử từng lần nhập nước từ water-sessions
      const response = await getWaterSessions();
      if (response.data) {
        // Lấy ngày hiện tại theo local (yyyy-mm-dd)
        const now = new Date();
        const todayStr =
          now.getFullYear() +
          "-" +
          String(now.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(now.getDate()).padStart(2, "0");

        // Lọc lịch sử nước uống chỉ của ngày hiện tại
        const todayHistory = response.data
          .filter((item) => item.date === todayStr)
          .sort(
            (a, b) =>
              new Date(b.date + "T" + b.time) - new Date(a.date + "T" + a.time)
          );
        setWaterHistory(todayHistory);

        // Lấy tổng nước hôm nay từ health-metrics/history
        const healthRes = await getHealthHistory();
        let total = 0;
        if (healthRes.data) {
          const todayHealth = healthRes.data.find(
            (item) => item.date === todayStr
          );
          if (todayHealth) {
            total = todayHealth.water_intake || 0;
          }
        }
        setTotalWater(total);
      }
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử nước uống:", error);
      setError("Không thể lấy lịch sử nước uống. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập lượng nước hợp lệ");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Lưu từng lần nhập nước vào water-sessions
      await addWaterSession(parseFloat(amount) / 1000); // Đơn vị lít
      setAmount("");
      Alert.alert("Thành công", "Đã cập nhật lượng nước uống!");
      fetchWaterHistory();
    } catch (error) {
      console.error("Lỗi khi cập nhật lượng nước:", error);
      setError("Không thể cập nhật lượng nước. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date, time) => {
    const dateObj = new Date(date + " " + time);
    return dateObj.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
        <Text style={styles.header}>Theo dõi nước uống</Text>
      </View>

      <View style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Tổng lượng nước uống trong ngày */}
        <View style={styles.totalContainer}>
          <Icon name="cup-water" size={40} color="#007AFF" />
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>Tổng lượng nước hôm nay</Text>
            <Text style={styles.totalAmount}>
              {(totalWater * 1000).toFixed(0)} ml
            </Text>
          </View>
        </View>

        {/* Nhập lượng nước */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Nhập lượng nước"
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>ml</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddWater}>
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Lịch sử nước uống */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Lịch sử nước uống trong ngày</Text>
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#007AFF"
              style={styles.loader}
            />
          ) : (
            <FlatList
              data={waterHistory}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                // Hiển thị đúng lượng nước vừa nhập ở mỗi lần
                let added = item.amount * 1000; // ml
                return (
                  <View style={styles.historyItem}>
                    <Icon name="cup-water" size={24} color="#007AFF" />
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyAmount}>
                        {added > 0 ? added.toFixed(0) : 0} ml
                      </Text>
                      <Text style={styles.historyTime}>
                        {formatDateTime(item.date, item.time)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Chưa có lịch sử nước uống trong ngày
                </Text>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

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
    padding: 16,
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },
  totalInfo: {
    marginLeft: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: "#666",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  unitText: {
    paddingRight: 12,
    color: "#666",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  historyContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#222",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  historyInfo: {
    marginLeft: 12,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  historyTime: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
  },
});
