import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  getExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from "../api";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.100.186:8000/";

export default function ExerciseListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    repetitions: "",
    duration: "",
    calories_burned: "",
  });
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [editId, setEditId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const res = await getExercises();
      setExercises(res.data);
    } catch (err) {
      console.log(err);
      Alert.alert("Lỗi", "Không thể lấy danh sách bài tập");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Lỗi",
          "Bạn cần cấp quyền truy cập ảnh để chọn ảnh minh họa!"
        );
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      console.log("Kết quả chọn ảnh:", result);
      if (!result.canceled) {
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh. Vui lòng thử lại.");
    }
  };

  const handleEditExercise = () => {
    if (selected.length === 1) {
      const ex = exercises.find((e) => e.id === selected[0]);
      if (ex) {
        setForm({
          name: ex.name,
          description: ex.description,
          repetitions: ex.repetitions?.toString() || "",
          duration: ex.duration?.toString() || "",
          calories_burned: ex.calories_burned?.toString() || "",
        });
        setImage(null);
        setEditId(ex.id);
        setSelectedExercise(ex);
        setModalVisible(true);
      }
    }
  };

  const handleDeleteExercise = async () => {
    if (selected.length === 1) {
      const ex = exercises.find((e) => e.id === selected[0]);
      if (ex && ex.is_custom) {
        Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bài tập này?", [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: async () => {
              await deleteExercise(ex.id);
              setSelected([]);
              fetchExercises();
            },
          },
        ]);
      }
    } else if (selected.length > 1) {
      Alert.alert(
        "Xác nhận",
        `Bạn có chắc muốn xóa ${selected.length} bài tập?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: async () => {
              for (let id of selected) {
                const ex = exercises.find((e) => e.id === id);
                if (ex && ex.is_custom) await deleteExercise(id);
              }
              setSelected([]);
              fetchExercises();
            },
          },
        ]
      );
    }
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddOrUpdateExercise = async () => {
    if (
      !form.name ||
      !form.description ||
      !form.duration ||
      !form.calories_burned
    ) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      if (form.repetitions) formData.append("repetitions", form.repetitions);
      formData.append("duration", form.duration);
      formData.append("calories_burned", form.calories_burned);

      if (image) {
        const imageUri = image.uri;
        const imageName = image.fileName || "exercise_image.jpg";
        const imageType = image.mimeType || "image/jpeg";

        formData.append("image", {
          uri: imageUri,
          type: imageType,
          name: imageName,
        });
      }

      let response;
      if (editId) {
        // Cập nhật bài tập
        response = await updateExercise(editId, formData);
      } else {
        // Thêm bài tập mới
        response = await createExercise(formData);
      }

      if (response.data) {
        setModalVisible(false);
        setForm({
          name: "",
          description: "",
          repetitions: "",
          duration: "",
          calories_burned: "",
        });
        setImage(null);
        setEditId(null);
        setSelectedExercise(null);
        fetchExercises();
      }
    } catch (error) {
      console.error("Lỗi khi lưu bài tập:", error);
      Alert.alert("Lỗi", "Không thể lưu bài tập. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header với nút quay lại và tiêu đề */}
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bài tập</Text>
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={fetchExercises}
        renderItem={({ item }) => {
          // Xử lý đường dẫn ảnh
          let imageUrl = item.image;
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `${BASE_URL}${imageUrl}`;
          }
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelect(item.id)}
              style={{
                borderColor: selected.includes(item.id) ? "#007AFF" : "#eee",
                borderWidth: 2,
                borderRadius: 14,
                marginHorizontal: 10,
                marginVertical: 6,
                backgroundColor: "#f5f5f5",
              }}
            >
              <View style={styles.exerciseItem}>
                <Image
                  source={
                    imageUrl
                      ? { uri: imageUrl }
                      : require("../../assets/avatar.png")
                  }
                  resizeMode="contain"
                  style={styles.exerciseImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <Text style={styles.exerciseDesc}>{item.description}</Text>
                  <Text style={styles.exerciseInfo}>
                    Số lần: {item.repetitions || "-"} | Thời gian:{" "}
                    {item.duration} phút | Calo: {item.calories_burned}
                  </Text>
                  {item.is_custom && (
                    <Text style={{ color: "#007AFF", fontSize: 12 }}>
                      Bài tập cá nhân
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 30 }}>
            Chưa có bài tập nào
          </Text>
        }
        style={{ marginBottom: 70 }}
      />
      {/* Nút bắt đầu tập luyện */}
      {selected.length > 0 && (
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => {
            // Đảm bảo các ID là số nguyên
            const validExercises = selected
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id));
            if (validExercises.length === 0) {
              Alert.alert("Lỗi", "Vui lòng chọn ít nhất một bài tập hợp lệ");
              return;
            }
            navigation.navigate("WorkoutScreen", {
              selectedExercises: validExercises,
            });
          }}
        >
          <Icon name="play-circle" size={28} color="#fff" />
          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 18,
              marginLeft: 8,
            }}
          >
            Bắt đầu tập luyện ({selected.length})
          </Text>
        </TouchableOpacity>
      )}
      {/* Nút sửa và xóa bài tập cá nhân */}
      {selected.length === 1 &&
        (() => {
          const selectedExercise = exercises.find((e) => e.id === selected[0]);
          if (selectedExercise && selectedExercise.is_custom) {
            return (
              <View
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  bottom: 100,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <TouchableOpacity
                  style={styles.actionBtnEdit}
                  onPress={handleEditExercise}
                >
                  <Icon
                    name="pencil"
                    size={28}
                    color="#fff"
                    style={{ alignSelf: "center" }}
                  />
                  <Text style={styles.actionBtnText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnDelete}
                  onPress={handleDeleteExercise}
                >
                  <Icon
                    name="delete"
                    size={28}
                    color="#fff"
                    style={{ alignSelf: "center" }}
                  />
                  <Text style={styles.actionBtnText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        })()}
      {selected.length > 1 &&
        selected.every((id) => {
          const ex = exercises.find((e) => e.id === id);
          return ex && ex.is_custom;
        }) && (
          <View
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 100,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              style={styles.actionBtnDelete}
              onPress={handleDeleteExercise}
            >
              <Icon
                name="delete"
                size={28}
                color="#fff"
                style={{ alignSelf: "center" }}
              />
              <Text style={styles.actionBtnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      {/* Nút thêm bài tập chỉ hiện khi chưa chọn bài tập */}
      {!selected || selected.length === 0 ? (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setForm({
              name: "",
              description: "",
              repetitions: "",
              duration: "",
              calories_burned: "",
            });
            setImage(null);
            setEditId(null);
            setSelectedExercise(null);
            setModalVisible(true);
          }}
        >
          <Icon name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      ) : null}
      {/* Modal thêm bài tập */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setEditId(null);
          setSelectedExercise(null);
        }}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editId ? "Sửa bài tập cá nhân" : "Thêm bài tập cá nhân"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Tên bài tập"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Mô tả"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Số lần lặp"
              value={form.repetitions}
              onChangeText={(v) => setForm({ ...form, repetitions: v })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Thời gian (phút)"
              value={form.duration}
              onChangeText={(v) => setForm({ ...form, duration: v })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Calo tiêu thụ"
              value={form.calories_burned}
              onChangeText={(v) => setForm({ ...form, calories_burned: v })}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Icon name="image" size={22} color="#007AFF" />
              <Text style={{ marginLeft: 8 }}>Chọn hình ảnh minh họa</Text>
            </TouchableOpacity>
            {image && image.uri ? (
              <Image
                source={{ uri: image.uri }}
                style={{
                  width: 80,
                  height: 80,
                  alignSelf: "center",
                  marginVertical: 8,
                }}
              />
            ) : (
              editId &&
              selectedExercise?.image && (
                <Image
                  source={{ uri: selectedExercise.image }}
                  style={{
                    width: 80,
                    height: 80,
                    alignSelf: "center",
                    marginVertical: 8,
                  }}
                />
              )
            )}
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => {
                  setModalVisible(false);
                  setEditId(null);
                  setSelectedExercise(null);
                }}
                disabled={saving}
              >
                <Text>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#007AFF" }]}
                onPress={handleAddOrUpdateExercise}
                disabled={saving}
              >
                <Text style={{ color: "#fff" }}>
                  {saving ? "Đang lưu..." : "Lưu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
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
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    margin: 0,
    borderRadius: 12,
    padding: 12,
  },
  exerciseImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 8,
    marginLeft: 0,
  },
  exerciseName: { fontWeight: "bold", fontSize: 16 },
  exerciseDesc: { color: "#333", fontSize: 14 },
  exerciseInfo: { color: "#888", fontSize: 13, marginTop: 2 },
  addBtn: {
    position: "absolute",
    right: 28,
    bottom: 36,
    backgroundColor: "#007AFF",
    borderRadius: 32,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "92%",
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  imagePicker: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginLeft: 12,
  },
  startBtn: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: "#007AFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    elevation: 6,
    shadowColor: "#007AFF",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  actionBtnEdit: {
    backgroundColor: "#FFA500",
    borderRadius: 16,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
    elevation: 4,
    flexDirection: "column",
  },
  actionBtnDelete: {
    backgroundColor: "#FF3B30",
    borderRadius: 16,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    flexDirection: "column",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 6,
    textAlign: "center",
  },
});
