import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Papa, { ParseResult } from "papaparse";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yf0j1uscFgnFOSIZpwufYR2vAO6wwMLM/export?format=csv&gid=1890970529";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const LEVELS = [
  { label: "Level 1", offset: 1 },
  { label: "Level 2", offset: 2 },
  { label: "Level 3", offset: 3 },
  { label: "Level 4", offset: 4 },
];

// --- COLORS ---
const CARD_COLORS = [
  "#E3F2FD", // Blue
  "#F3E5F5", // Purple
  "#E8F5E9", // Green
  "#FFF3E0", // Orange
  "#FCE4EC", // Pink
  "#E0F7FA", // Cyan
];

const getSubjectColor = (subject: string) => {
  if (!subject) return "#FFFFFF";
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CARD_COLORS.length;
  return CARD_COLORS[index];
};

export default function HomeScreen() {
  const [columns, setColumns] = useState<string[][]>([]);
  
  // State for Dynamic Mapping
  const [lecturerMap, setLecturerMap] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -- FILTERS --
  const [selectedLevelOffset, setSelectedLevelOffset] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    fetchTimeTable();
  }, []);

  const fetchTimeTable = async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: false,
        complete: (results: ParseResult<string[]>) => {
          const rawRows = results.data;
          const newMap: Record<string, string> = {};
          
          // 1. FULL SHEET SEARCH FOR MAPPINGS
          // Iterate through EVERY row and EVERY cell
          rawRows.forEach((row) => {
            row.forEach((cell) => {
              if (cell && typeof cell === 'string') {
                // Normalize string: replace en-dash (–) with hyphen (-)
                const normalizedCell = cell.replace(/–/g, "-").trim();

                if (normalizedCell.includes("-")) {
                  const parts = normalizedCell.split("-");
                  
                  if (parts.length >= 2) {
                    // CLEANING: Keep ONLY alphabets (remove numbers, dots, spaces)
                    const rawShort = parts[0];
                    const shortCode = rawShort.replace(/[^a-zA-Z]/g, ""); 
                    
                    // Join the rest back in case the name contains a hyphen
                    const fullName = parts.slice(1).join("-").trim();
                    
                    // VALIDATION:
                    // 1. Short code must be valid (not empty).
                    // 2. Short code typically < 6 chars (e.g. KT, EYAC). Limits false positives.
                    // 3. Full name must exist.
                    if (
                        shortCode.length > 0 && 
                        shortCode.length < 6 && 
                        fullName.length > 0
                    ) {
                      newMap[shortCode] = fullName;
                    }
                  }
                }
              }
            });
          });
          
          // 2. HARDCODED FIX FOR "MK"
          // Since MK row lacks the separator, we manually inject it here.
          newMap["MK"] = "Mr. M. Kokulan";
          
          setLecturerMap(newMap);

          // 3. Transpose data
          const columnWiseData = transpose(rawRows);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setColumns(columnWiseData);
          
          setLoading(false);
          setRefreshing(false);
        },
        error: (error: Error) => {
          console.error("Error parsing CSV:", error);
          setLoading(false);
          setRefreshing(false);
        },
      });
    } catch (error) {
      console.error("Network Error:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimeTable();
  };

  const transpose = (matrix: string[][]): string[][] => {
    if (!matrix || matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
  };

  const handleLevelChange = (offset: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedLevelOffset(offset);
  };

  const handleDayChange = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDayIndex(index);
  };

  const day = 1 + selectedDayIndex * 3;

  // --- HELPER: Handles Multiple Lecturers (e.g. "KT & MS") ---
  const getLecturerName = (rawText: string) => {
    if (!rawText) return "";
    const trimmed = rawText.trim();
    
    // Direct Match
    if (lecturerMap[trimmed]) return lecturerMap[trimmed];

    // Composite Match (splitting by &, /, +)
    // We split by separators but keep the structure
    const parts = trimmed.split(/([&,/+])/); 

    const translatedParts = parts.map((part) => {
      const code = part.trim(); // "KT"
      
      // If it's a separator, return as is
      if (['&', ',', '/', '+'].includes(code)) return part;
      
      // Try to find a map for the cleaned code (alphabets only)
      // This handles cases where the cell might be "KT." or "KT "
      const cleanCode = code.replace(/[^a-zA-Z]/g, "");
      
      if (lecturerMap[cleanCode]) {
        return lecturerMap[cleanCode];
      }
      
      // Fallback: Check exact code or return original
      return lecturerMap[code] || code;
    });

    return translatedParts.join("");
  };

  // --- RENDER HELPERS ---
  const renderTimelineRow = (
    timeSlot: string,
    content: React.ReactNode,
    keyPrefix: string,
    showTime: boolean
  ) => {
    const parts = timeSlot ? timeSlot.split("-") : ["", ""];
    const startTime = parts[0]?.trim();
    const endTime = parts[1]?.trim();

    return (
      <View key={keyPrefix} style={styles.timelineRow}>
        <View style={styles.timeColumn}>
          {showTime && (
            <>
              <Text style={styles.startTime}>{startTime}</Text>
              <Text style={styles.endTime}>{endTime}</Text>
            </>
          )}
          <View style={styles.timeLineConnector} />
        </View>
        <View style={styles.cardContainer}>{content}</View>
      </View>
    );
  };

  // --- MAIN LOGIC ---
  const renderTimetable = () => {
    const items = [];
    const rowCount = columns[0]?.length || 0;

    let activeTimeSlot = "";
    let isOccupied = false;
    let lastRenderedTimeLabel = null;

    for (let index = 0; index < rowCount; index++) {
      // Skip headers (0-2) and the footer/legend area (>=38)
      if (index <= 2 || index >= 38) continue;

      const timeSlotRaw = columns[0]?.[index];
      const classData = columns[day]?.[index];

      // 1. Manage Time Slot State
      if (timeSlotRaw && timeSlotRaw !== "") {
        if (timeSlotRaw !== activeTimeSlot) {
          activeTimeSlot = timeSlotRaw;
          isOccupied = false;
        }
      }

      const nextTimeSlot = columns[0]?.[index + 1];
      let isLastRowOfBlock = false;
      if (!nextTimeSlot && nextTimeSlot !== "") {
        isLastRowOfBlock = true;
      } else if (nextTimeSlot !== "" && nextTimeSlot !== activeTimeSlot) {
        isLastRowOfBlock = true;
      }

      let cardToRender = null;
      let key = "";

      // Case A: Valid Class
      if (
        classData &&
        classData !== "" &&
        classData.includes(selectedLevelOffset.toString())
      ) {
        isOccupied = true;
        const color = getSubjectColor(classData);

        cardToRender = (
          <View style={[styles.card, { backgroundColor: color }]}>
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.subjectText}>{classData}</Text>
              <View style={styles.metaRow}>
                
                {/* LECTURER NAME LOOKUP */}
                {columns[day + 1] && columns[day + 1][index] ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={14} color="#555" />
                    <Text style={styles.detailText}>
                      {" "}
                      {getLecturerName(columns[day + 1][index])}
                    </Text>
                  </View>
                ) : null}

                {columns[day + 2] && columns[day + 2][index] ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#555" />
                    <Text style={styles.subDetailText}>
                      {" "}
                      {columns[day + 2][index]}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
        key = `class-${index}`;
      }
      // Case B: Lunch
      else if (activeTimeSlot.includes("12.00") && !isOccupied) {
        isOccupied = true;
        cardToRender = (
          <View style={styles.breakCard}>
            <Ionicons name="fast-food-outline" size={20} color="#8F9BB3" />
            <Text style={styles.breakText}>Lunch Time</Text>
          </View>
        );
        key = `lunch-${index}`;
      }
      // Case C: Free Period
      else if (!isOccupied && isLastRowOfBlock) {
        isOccupied = true;
        cardToRender = (
          <View style={styles.freeCard}>
            <Text style={styles.freeText}>Free period</Text>
          </View>
        );
        key = `free-${index}`;
      }

      // 4. Push to Timeline
      if (cardToRender) {
        const showTime = activeTimeSlot !== lastRenderedTimeLabel;

        items.push(
          renderTimelineRow(activeTimeSlot, cardToRender, key, showTime)
        );

        if (showTime) {
          lastRenderedTimeLabel = activeTimeSlot;
        }
      }
    }

    return items;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Daily Schedule</Text>
          <Text style={styles.headerSubtitle}>DCS, UoJ</Text>
        </View>
      </View>

      {/* Level Filter */}
      <View style={styles.levelFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.levelScrollContent}
        >
          {LEVELS.map((level) => (
            <TouchableOpacity
              key={level.label}
              onPress={() => handleLevelChange(level.offset)}
              style={[
                styles.levelChip,
                selectedLevelOffset === level.offset &&
                  styles.levelChipSelected,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.levelChipText,
                  selectedLevelOffset === level.offset &&
                    styles.levelChipTextSelected,
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Day Filter */}
      <View style={styles.calendarStrip}>
        {DAYS.map((d, index) => {
          const isSelected = selectedDayIndex === index;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayItem, isSelected && styles.dayItemSelected]}
              onPress={() => handleDayChange(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.dayText, isSelected && styles.dayTextSelected]}
              >
                {d}
              </Text>
              {isSelected && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Syncing timetable...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#4A90E2"]}
              />
            }
          >
            {renderTimetable()}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -10,
    paddingTop: 20,
    overflow: "hidden",
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A2138",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8F9BB3",
    marginTop: 2,
    fontWeight: "600",
  },

  // Level Filter
  levelFilterContainer: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 15,
  },
  levelScrollContent: {
    paddingHorizontal: 24,
  },
  levelChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    marginRight: 10,
  },
  levelChipSelected: {
    backgroundColor: "#1A2138",
  },
  levelChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8F9BB3",
  },
  levelChipTextSelected: {
    color: "#FFFFFF",
  },

  // Calendar Strip
  calendarStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 25,
    backgroundColor: "#FFFFFF",
    zIndex: 1,
  },
  dayItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    width: 55,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  dayItemSelected: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8F9BB3",
  },
  dayTextSelected: {
    color: "#FFF",
    fontWeight: "700",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFF",
    marginTop: 4,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  loadingText: {
    marginTop: 12,
    color: "#8F9BB3",
    fontSize: 15,
  },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  timeColumn: {
    width: 50,
    alignItems: "flex-end",
    marginRight: 15,
    paddingTop: 16,
  },
  startTime: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2138",
  },
  endTime: {
    fontSize: 11,
    color: "#8F9BB3",
    marginTop: 2,
  },
  timeLineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: "#E4E9F2",
    marginTop: 8,
    marginRight: 6,
    borderRadius: 1,
  },
  cardContainer: {
    flex: 1,
    paddingBottom: 20,
  },

  // Cards
  card: {
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardAccent: {
    width: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
  subjectText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A2138",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "column",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: "#4a5568",
    fontWeight: "500",
  },
  subDetailText: {
    fontSize: 13,
    color: "#4a5568",
    fontStyle: "italic",
  },

  // Break / Free
  breakCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(230, 230, 230, 0.4)",
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#C5CEE0",
    marginTop: 10,
  },
  breakText: {
    marginLeft: 10,
    color: "#8F9BB3",
    fontWeight: "600",
    fontSize: 14,
  },
  freeCard: {
    padding: 12,
    backgroundColor: "transparent",
    justifyContent: "center",
    marginTop: 10,
  },
  freeText: {
    color: "#C5CEE0",
    fontWeight: "600",
    fontSize: 13,
    fontStyle: "italic",
  },
});