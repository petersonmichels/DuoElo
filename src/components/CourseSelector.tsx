import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Propriedades que este botão vai receber da tela principal
interface CourseSelectorProps {
  activeCourseId: string;
  enrolledCourses: string[];
  onChangeCourse: (newCourseId: string) => void;
}

export default function CourseSelector({
  activeCourseId,
  enrolledCourses,
  onChangeCourse,
}: CourseSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Trilha Atual:</Text>
      <Text style={styles.activeText}>{activeCourseId}</Text>

      <View style={styles.buttonRow}>
        {enrolledCourses.map((courseId) => (
          <TouchableOpacity
            key={courseId}
            style={[
              styles.button,
              activeCourseId === courseId && styles.buttonActive,
            ]}
            onPress={() => onChangeCourse(courseId)}
          >
            <Text style={styles.buttonText}>{courseId}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 20,
  },
  label: { fontSize: 12, color: "#666" },
  activeText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ddd",
    borderRadius: 20,
  },
  buttonActive: {
    backgroundColor: "#FF4500", // Laranja vibrante do DuoElo
  },
  buttonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
});
