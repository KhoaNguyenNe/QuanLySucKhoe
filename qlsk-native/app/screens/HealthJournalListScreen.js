import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { getHealthJournals, getWorkoutSessions } from "../api";

// Hàm định dạng ngày dd/MM/yyyy (không cộng +7h nữa)
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Hàm định dạng ngày giờ dd/MM/yyyy HH:mm (không cộng +7h nữa)
function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export default function HealthJournalListScreen() {
  const [journals, setJournals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState("");
  const [searchContent, setSearchContent] = useState("");
  const [filteredJournals, setFilteredJournals] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [journalsRes, sessionsRes] = await Promise.all([
          getHealthJournals(),
          getWorkoutSessions(),
        ]);
        setJournals(journalsRes.data);
        setFilteredJournals(journalsRes.data);
        setSessions(sessionsRes.data);
      } catch (err) {
        setJournals([]);
        setFilteredJournals([]);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Hàm tìm kiếm nhật ký
  useEffect(() => {
    const searchJournals = () => {
      let filtered = [...journals];

      // Tìm kiếm theo ngày
      if (searchDate) {
        const searchDateLower = searchDate.toLowerCase();
        filtered = filtered.filter((journal) =>
          formatDate(journal.date).includes(searchDateLower)
        );
      }

      // Tìm kiếm theo nội dung
      if (searchContent) {
        const searchContentLower = searchContent.toLowerCase();
        filtered = filtered.filter((journal) =>
          journal.content.toLowerCase().includes(searchContentLower)
        );
      }

      setFilteredJournals(filtered);
    };

    searchJournals();
  }, [searchDate, searchContent, journals]);

  // Lấy các session trong ngày
  const getSessionInfoByDate = (date) => {
    // date: yyyy-mm-dd
    const sessionList = sessions.filter(
      (s) => s.start_time && formatDate(s.start_time) === formatDate(date)
    );
    let allExercises = [];
    let totalCalories = 0;
    sessionList.forEach((s) => {
      if (s.exercises && Array.isArray(s.exercises)) {
        allExercises = allExercises.concat(s.exercises);
        totalCalories += s.total_calories || 0;
      }
    });
    // Loại trùng bài tập theo id
    const uniqueExercises = [];
    const seen = new Set();
    for (const ex of allExercises) {
      if (!seen.has(ex.id)) {
        uniqueExercises.push(ex);
        seen.add(ex.id);
      }
    }
    return { exercises: uniqueExercises, totalCalories };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.header}>Nhật ký sức khỏe</Text>
      </View>

      {/* Thêm phần tìm kiếm */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon
            name="calendar"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo ngày (dd/mm/yyyy)"
            value={searchDate}
            onChangeText={setSearchDate}
          />
        </View>
        <View style={styles.searchInputContainer}>
          <Icon
            name="text-search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo nội dung"
            value={searchContent}
            onChangeText={setSearchContent}
          />
        </View>
      </View>

      <ScrollView style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : filteredJournals.length === 0 ? (
          <Text style={{ color: "#888", textAlign: "center" }}>
            {journals.length === 0
              ? "Chưa có nhật ký nào."
              : "Không tìm thấy nhật ký phù hợp."}
          </Text>
        ) : (
          filteredJournals.map((j) => {
            const session = sessions.find((s) => s.id === j.workout_session);
            const exercises =
              session && session.exercises ? session.exercises : [];
            const totalCalories = session ? session.total_calories : 0;
            return (
              <View key={j.id} style={styles.journalItem}>
                <Text style={styles.journalDate}>
                  Ngày: {formatDate(j.date)}
                </Text>
                <Text style={styles.journalLabel}>Bài tập đã thực hiện:</Text>
                {exercises.length > 0 ? (
                  exercises.map((ex) => (
                    <Text key={ex.id} style={styles.exerciseItem}>
                      -{" "}
                      {!ex.exercise && !ex.exercise_id
                        ? "Bài tập đã bị xóa"
                        : `${ex.exercise_name || ex.name} (${
                            ex.calories_burned
                          } calo)`}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.exerciseItem}>
                    Không có dữ liệu bài tập
                  </Text>
                )}
                <Text style={styles.journalLabel}>
                  Tổng calo: {totalCalories}
                </Text>
                <Text style={styles.journalLabel}>
                  Cảm nhận của bạn:
                  <Text style={{ fontWeight: "400" }}> {j.content}</Text>
                </Text>
              </View>
            );
          })
        )}
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
  backBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 0,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#222",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  journalItem: {
    marginBottom: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
  },
  journalDate: {
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 2,
  },
  journalContent: {
    color: "#333",
    fontSize: 15,
    marginBottom: 6,
  },
  journalLabel: {
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 2,
  },
  exerciseItem: {
    marginLeft: 10,
    marginBottom: 2,
    color: "#333",
    fontSize: 14,
  },
  searchContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
});
