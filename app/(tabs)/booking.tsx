import React, { JSX, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
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

// --- COLORS & HELPERS ---
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
  const [lecturerMap, setLecturerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          
          // --- FULL SHEET MAPPING LOGIC ---
          const newMap: Record<string, string> = {};
          rawRows.forEach((row) => {
            row.forEach((cell) => {
              if (cell && typeof cell === 'string') {
                const normalizedCell = cell.replace(/–/g, "-").trim();
                if (normalizedCell.includes("-")) {
                  const parts = normalizedCell.split("-");
                  if (parts.length >= 2) {
                    const rawShort = parts[0];
                    const shortCode = rawShort.replace(/[^a-zA-Z]/g, ""); 
                    const fullName = parts.slice(1).join("-").trim();
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
          newMap["MK"] = "Mr. M. Kokulan";
          setLecturerMap(newMap);
          // --------------------------------

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

  const getLecturerName = (rawText: string) => {
    if (!rawText) return "";
    const trimmed = rawText.trim();
    if (lecturerMap[trimmed]) return lecturerMap[trimmed];
    const parts = trimmed.split(/([&,/+])/); 
    const translatedParts = parts.map((part) => {
      const code = part.trim();
      if (['&', ',', '/', '+'].includes(code)) return part;
      const cleanCode = code.replace(/[^a-zA-Z]/g, "");
      if (lecturerMap[cleanCode]) return lecturerMap[cleanCode];
      return lecturerMap[code] || code;
    });
    return translatedParts.join("");
  };

  // --- RENDER HELPERS ---
  const renderSectionHeader = (title: string, key: string) => (
    <View key={key} style={styles.sectionHeaderContainer}>
      <View style={styles.sectionHeaderLine} />
      <View style={styles.sectionHeaderBadge}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
      <View style={styles.sectionHeaderLine} />
    </View>
  );

  // --- MAIN LOGIC ---
  const renderSchedule = () => {
    if (!columns || columns.length < 24) return null;

    const rowCount = columns[0]?.length;
    
    // STEP 1: GROUP DATA INTO SECTIONS
    // We build an array of "Section" objects. 
    // Each section holds its title, its specific headers, and the row indices that belong to it.
    const sections: { 
        id: string; 
        title: string; 
        type: string; 
        headers: string[]; 
        rowIndices: number[] 
    }[] = [];

    let currentSection: { 
        id: string; 
        title: string; 
        type: string; 
        headers: string[]; 
        rowIndices: number[] 
    } | null = null;

    for (let i = 0; i < rowCount; i++) {
      const colS = columns[18]?.[i]?.trim() || ""; 
      
      // A. DETECT SECTION TITLE (Blue Bar)
      const isTitleRow = colS !== "" && (!columns[19]?.[i] || columns[19][i] === "");
      
      if (isTitleRow) {
        let displayTitle = "Other Schedules";
        let type = "generic";
        
        if (colS.includes("Event Booking")) {
          displayTitle = "Auditorium Events & bookings";
          type = "auditorium";
        } else if (colS.includes("Lecture Hall") || colS.includes("Laboratory")) {
          displayTitle = "Lecture & Lab bookings";
          type = "labs";
        } else {
          const lower = colS.toLowerCase();
          if (lower.includes("exam")) displayTitle = "Exams";
          else if (lower.includes("lecture")) displayTitle = "Lectures";
          else displayTitle = colS.length > 30 ? "Other Schedules" : colS;
        }

        // Start a new section
        currentSection = {
            id: `sec-${i}`,
            title: displayTitle,
            type: type,
            headers: [], // Will be filled by the next step
            rowIndices: []
        };
        sections.push(currentSection);
        continue;
      }

      // B. DETECT TABLE HEADERS (The "Date", "Day" row)
      if (colS.toLowerCase() === "date" && currentSection) {
        // Capture headers for the CURRENT section
        const headers = [];
        for (let k = 0; k < 6; k++) {
            headers.push(columns[18 + k]?.[i] || "");
        }
        currentSection.headers = headers;
        continue;
      }

      // C. COLLECT DATA ROWS
      // If we have a valid section and valid data (Date + Title exist)
      if (colS !== "" && columns[20]?.[i] && currentSection) {
          currentSection.rowIndices.push(i);
      }
    }

    // STEP 2: RENDER SECTIONS
    // Only render sections that actually have dataRows
    const renderedItems: JSX.Element[] = [];

    sections.forEach((section) => {
        // *** CORE LOGIC CHANGE: Check length before rendering ***
        if (section.rowIndices.length > 0) {
            
            // 1. Render Header
            renderedItems.push(renderSectionHeader(section.title, section.id));

            // 2. Render Rows for this section
            section.rowIndices.forEach((i) => {
                const title = columns[20][i];
                const color = getSubjectColor(title);
                const colS = columns[18][i]; // Date

                // Helpers for this specific row using the section's captured headers
                const getValByHeader = (keyword: string) => {
                    const idx = section.headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
                    return idx !== -1 ? columns[18 + idx]?.[i] : "";
                };

                const timeVal = getValByHeader("time");
                const venueVal = getValByHeader("venue");
                const orgVal = getValByHeader("organis") || getValByHeader("poc");

                renderedItems.push(
                    <View key={`event-${i}`} style={[styles.card, { backgroundColor: color }]}>
                      <View style={styles.cardAccent} />
                      <View style={styles.cardContent}>
                        <Text style={styles.subjectText}>{title}</Text>
                        
                        {/* Time Row */}
                        {timeVal ? (
                          <View style={styles.timeContainer}>
                            <Ionicons name="time" size={16} color="#4A90E2" />
                            <Text style={styles.timeText}>{timeVal}</Text>
                          </View>
                        ) : null}
                        
                        <View style={styles.metaContainer}>
                          <View style={styles.metaRow}>
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text style={styles.detailText}> {colS}</Text>
                          </View>
                          {venueVal ? (
                            <View style={styles.metaRow}>
                              <Ionicons name="location-outline" size={14} color="#555" />
                              <Text style={styles.subDetailText}> Venue: {venueVal}</Text>
                            </View>
                          ) : null}
                          {orgVal ? (
                            <View style={styles.metaRow}>
                              <Ionicons name="people-outline" size={14} color="#555" />
                              <Text style={styles.subDetailText}> By: {getLecturerName(orgVal)}</Text>
                            </View>
                          ) : null}
                          
                          {/* Generic Columns (if any non-standard headers exist) */}
                          {section.headers.map((header, idx) => {
                             const val = columns[18 + idx]?.[i];
                             const lowerHeader = header.toLowerCase();
                             if (!val || 
                                 lowerHeader === 'date' || 
                                 lowerHeader === 'day' || 
                                 lowerHeader === 'event' || 
                                 lowerHeader === 'time' || 
                                 lowerHeader === 'venue' || 
                                 lowerHeader.includes('organis')) return null;
                             
                             return (
                                <View key={`extra-${i}-${idx}`} style={styles.metaRow}>
                                   <Text style={[styles.subDetailText, {fontStyle:'normal', fontSize: 12, color:'#666'}]}>
                                     {header}: {val}
                                   </Text>
                                </View>
                             );
                          })}
                        </View>
                      </View>
                    </View>
                );
            });
        }
    });

    if (renderedItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No upcoming bookings found.</Text>
        </View>
      );
    }

    return renderedItems;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Venues</Text>
          <Text style={styles.headerSubtitle}>Booking Schedule</Text>
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Syncing schedule...</Text>
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
            {renderSchedule()}
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
    paddingTop: 10,
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
  emptyContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#8F9BB3",
    fontSize: 16,
    fontStyle: "italic",
  },

  // --- Section Headers ---
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 15,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4E9F2",
  },
  sectionHeaderBadge: {
    backgroundColor: "#E4E9F2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  sectionHeaderText: {
    color: "#1A2138",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },

  // --- Cards ---
  card: {
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 100,
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2138",
    marginBottom: 6,
  },
  
  // --- Time Specific Styles ---
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E3A59",
    marginLeft: 6,
  },

  // --- Meta Details ---
  metaContainer: {
    flexDirection: "column",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 14,
    color: "#4a5568",
    fontWeight: "600",
    marginLeft: 6,
  },
  subDetailText: {
    fontSize: 13,
    color: "#4a5568",
    fontStyle: "italic",
    marginLeft: 6,
    flex: 1,
  },
});