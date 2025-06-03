import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useStepCounter } from "../contexts/StepCounterContext";

export default function StepCounterScreen() {
  const navigation = useNavigation();
  const { steps, testNewDay } = useStepCounter();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đếm số bước đi</Text>
      </View>

      <View style={styles.stepsContainer}>
        <Icon name="walk" size={80} color="#2d6cf5" />
        <Text style={styles.stepsText}>{steps}</Text>
        <Text style={styles.stepsLabel}>bước</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Ứng dụng đang tự động đếm số bước đi của bạn
        </Text>
        <Text style={styles.infoSubText}>
          Số bước sẽ được lưu lại và cập nhật tự động
        </Text>
      </View>

      {/* Nút test giả lập qua ngày mới */}
      <TouchableOpacity style={styles.testButton} onPress={testNewDay}>
        <Text style={styles.testButtonText}>Test: Giả lập qua ngày mới</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 30,
  },
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
  backBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#222",
  },
  stepsContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  stepsText: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#2d6cf5",
    marginTop: 20,
  },
  stepsLabel: {
    fontSize: 24,
    color: "#666",
    marginTop: 10,
  },
  infoContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  infoSubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  testButton: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#2d6cf5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  testButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
