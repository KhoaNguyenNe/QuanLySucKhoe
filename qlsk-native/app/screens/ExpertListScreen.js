import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getExperts, linkExpert, unlinkExpert, getUserProfile } from "../api";

const ExpertListScreen = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkedExpertId, setLinkedExpertId] = useState(null);
  const [linkedExpertName, setLinkedExpertName] = useState("");
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [expertsRes, profileRes] = await Promise.all([
        getExperts(),
        getUserProfile(),
      ]);
      setExperts(expertsRes.data);
      const expert = profileRes.data.user.expert;
      setLinkedExpertId(expert ? expert : null);
      // Lấy tên chuyên gia đã liên kết (nếu có)
      if (expert) {
        const found = expertsRes.data.find((e) => e.id === expert);
        setLinkedExpertName(found ? found.username : "");
      } else {
        setLinkedExpertName("");
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải dữ liệu chuyên gia");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExpert = async (expertId, expertName) => {
    try {
      await linkExpert(expertId);
      Alert.alert("Thành công", `Bạn đã liên kết với chuyên gia ${expertName}`);
      fetchAll();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Không thể liên kết với chuyên gia";
      Alert.alert("Lỗi", msg);
    }
  };

  const handleUnlinkExpert = async () => {
    try {
      await unlinkExpert();
      Alert.alert("Thành công", "Đã hủy liên kết với chuyên gia.");
      fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Không thể hủy liên kết";
      Alert.alert("Lỗi", msg);
    }
  };

  const renderItem = ({ item }) => {
    const isLinked = linkedExpertId === item.id;
    return (
      <View
        style={[
          styles.item,
          isLinked && {
            backgroundColor: "#d1f7c4",
            borderColor: colors.primary,
            borderWidth: 2,
          },
        ]}
      >
        <Text style={[styles.name, isLinked && { color: colors.primary }]}>
          {item.username}
        </Text>
        <Text style={styles.email}>{item.email}</Text>
        {isLinked ? (
          <Text
            style={{ color: colors.primary, marginTop: 6, fontWeight: "bold" }}
          >
            Đã liên kết
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.linkBtn,
            isLinked || linkedExpertId
              ? { backgroundColor: "#ccc" }
              : { backgroundColor: colors.primary },
          ]}
          disabled={!!linkedExpertId}
          onPress={() => handleLinkExpert(item.id, item.username)}
        >
          <Text style={{ color: isLinked || linkedExpertId ? "#888" : "#fff" }}>
            {isLinked ? "Đã liên kết" : "Liên kết"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Icon
            name="arrow-left"
            size={26}
            color={colors.primary || "#007AFF"}
          />
        </TouchableOpacity>
        <Text style={styles.header}>Chọn chuyên gia</Text>
      </View>
      <View style={styles.container}>
        {linkedExpertId ? (
          <TouchableOpacity
            style={styles.unlinkBtn}
            onPress={handleUnlinkExpert}
          >
            <Icon name="link-off" size={20} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 6 }}>
              Hủy liên kết với chuyên gia {linkedExpertName}
            </Text>
          </TouchableOpacity>
        ) : null}
        <FlatList
          data={experts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              Không có chuyên gia nào
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
};

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
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  item: {
    backgroundColor: "#f2f2f2",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  email: {
    fontSize: 14,
    color: "#666",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  linkBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  unlinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 18,
  },
});

export default ExpertListScreen;
