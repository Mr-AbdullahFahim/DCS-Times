import React, { useEffect, useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonIcon,
  RefresherEventDetail,
} from "@ionic/react";
import { 
  personOutline, 
  locationOutline, 
  fastFoodOutline 
} from "ionicons/icons";
import Papa, { ParseResult } from "papaparse";
import "./Tab1.css";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yf0j1uscFgnFOSIZpwufYR2vAO6wwMLM/export?format=csv&gid=1890970529";

// Mapping standard offsets. 0=Mon, 1=Tue, ... 5=Sat, 6=Sun
const DAY_OFFSETS = [
  { label: "Mon", colIndex: 1, dayId: 0 },
  { label: "Tue", colIndex: 4, dayId: 1 },
  { label: "Wed", colIndex: 7, dayId: 2 },
  { label: "Thu", colIndex: 10, dayId: 3 },
  { label: "Fri", colIndex: 13, dayId: 4 },
  { label: "Sat", colIndex: 16, dayId: 5 },
  { label: "Sun", colIndex: 19, dayId: 6 },
];

const LEVELS = [
  { label: "Level 1", offset: 1 },
  { label: "Level 2", offset: 2 },
  { label: "Level 3", offset: 3 },
  { label: "Level 4", offset: 4 },
];

const CARD_COLORS = [
  "#E3F2FD", "#F3E5F5", "#E8F5E9", "#FFF3E0", "#FCE4EC", "#E0F7FA",
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

interface DayItem {
  label: string;
  dayId: number;
}

const Tab1: React.FC = () => {
  const [columns, setColumns] = useState<string[][]>([]);
  const [lecturerMap, setLecturerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLevelOffset, setSelectedLevelOffset] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [availableDays, setAvailableDays] = useState<DayItem[]>([]);

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

          // 1. Process Lecturer Map
          rawRows.forEach((row) => {
            row.forEach((cell) => {
              if (cell && typeof cell === "string") {
                const normalizedCell = cell.replace(/–/g, "-").trim();
                if (normalizedCell.includes("-")) {
                  const parts = normalizedCell.split("-");
                  if (parts.length >= 2) {
                    const rawShort = parts[0];
                    const shortCode = rawShort.replace(/[^a-zA-Z]/g, "");
                    const fullName = parts.slice(1).join("-").trim();
                    if (shortCode.length > 0 && shortCode.length < 6 && fullName.length > 0) {
                      newMap[shortCode] = fullName;
                    }
                  }
                }
              }
            });
          });
          newMap["MK"] = "Mr. M. Kokulan";
          setLecturerMap(newMap);

          // 2. Transpose Data
          const transposed = transpose(rawRows);
          setColumns(transposed);

          // 3. Dynamic Day Detection (Fixed Logic)
          const foundDays: DayItem[] = [];
          
          // A. Standard Weekdays (Mon-Fri)
          // We assume these exist if the columns are present in the CSV.
          DAY_OFFSETS.slice(0, 5).forEach((dayDef) => {
             if (transposed.length > dayDef.colIndex) {
                 foundDays.push({ label: dayDef.label, dayId: dayDef.dayId });
             }
          });

          // B. Weekend (Sat-Sun)
          // We add these ONLY if the specific header text is present in Row 2 (Index 1).
          DAY_OFFSETS.slice(5).forEach((dayDef) => {
             const hasColumnData = transposed.length > dayDef.colIndex;
             // Check Row 2 (index 1) for explicit header text like "Saturday"
             const headerCell = rawRows[1]?.[dayDef.colIndex]?.trim();

             if (hasColumnData && headerCell && headerCell !== "") {
                 foundDays.push({ label: dayDef.label, dayId: dayDef.dayId });
             }
          });

          // Fallback safety (if CSV is totally empty/broken)
          if (foundDays.length === 0) {
             setAvailableDays(DAY_OFFSETS.slice(0, 5).map(d => ({ label: d.label, dayId: d.dayId })));
          } else {
             setAvailableDays(foundDays);
             // Ensure selection is valid
             if (!foundDays.some(d => d.dayId === selectedDayIndex)) {
                 setSelectedDayIndex(foundDays[0].dayId);
             }
          }

          setLoading(false);
        },
        error: (error: Error) => {
          console.error("Error parsing CSV:", error);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Network Error:", error);
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await fetchTimeTable();
    event.detail.complete();
  };

  const transpose = (matrix: string[][]): string[][] => {
    if (!matrix || matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
  };

  // Calculate the actual column index for the selected day
  const day = 1 + selectedDayIndex * 3;

  const getLecturerName = (rawText: string) => {
    if (!rawText) return "";
    const trimmed = rawText.trim();
    if (lecturerMap[trimmed]) return lecturerMap[trimmed];
    const parts = trimmed.split(/([&,/+])/);
    const translatedParts = parts.map((part) => {
      const code = part.trim();
      if (["&", ",", "/", "+"].includes(code)) return part;
      const cleanCode = code.replace(/[^a-zA-Z]/g, "");
      if (lecturerMap[cleanCode]) return lecturerMap[cleanCode];
      return lecturerMap[code] || code;
    });
    return translatedParts.join("");
  };

  const renderTimelineRow = (timeSlot: string, content: React.ReactNode, keyPrefix: string, showTime: boolean) => {
    const parts = timeSlot ? timeSlot.split("-") : ["", ""];
    const startTime = parts[0]?.trim();
    const endTime = parts[1]?.trim();

    return (
      <div key={keyPrefix} className="timeline-row">
        <div className="time-column">
          {showTime && (
            <>
              <span className="start-time">{startTime}</span>
              <span className="end-time">{endTime}</span>
            </>
          )}
          <div className="timeline-connector" />
        </div>
        <div className="card-container">{content}</div>
      </div>
    );
  };

  const renderTimetable = () => {
    const items = [];
    const rowCount = columns[0]?.length || 0;
    
    let activeTimeSlot = "";
    let isOccupied = false; 
    let lastRenderedTimeLabel: string | null = null;

    // Strict regex for 08.00-04.00 schedule
    const validTimePattern = /^(0?[89]|1[0-2]|0?[1-4])[:.]00/;

    for (let index = 0; index < rowCount; index++) {
      if (index <= 2) continue; 

      const timeSlotRaw = columns[0]?.[index]?.trim() || "";

      // 1. Verify Time Data
      if (timeSlotRaw !== "" && !validTimePattern.test(timeSlotRaw) && !/\d/.test(timeSlotRaw)) {
        continue;
      }

      // 2. Update Active Time
      if (timeSlotRaw !== "") {
        if (timeSlotRaw !== activeTimeSlot) {
          activeTimeSlot = timeSlotRaw;
          isOccupied = false; 
        }
      }
      
      if (!activeTimeSlot) continue;

      // 3. Look Ahead Logic
      const nextTimeRaw = columns[0]?.[index + 1]?.trim();
      const nextRowExists = columns[0]?.[index + 1] !== undefined;
      
      let isLastRowOfBlock = false;

      if (!nextRowExists) {
         isLastRowOfBlock = true;
      } else if (nextTimeRaw !== "") {
         if (nextTimeRaw !== activeTimeSlot) {
            isLastRowOfBlock = true;
         }
      } else {
         isLastRowOfBlock = false;
      }

      // 4. Render Logic
      const classData = columns[day] ? columns[day][index] : "";
      const lecturerData = columns[day + 1] ? columns[day + 1][index] : "";
      const venueData = columns[day + 2] ? columns[day + 2][index] : "";

      const currentLevelStr = selectedLevelOffset.toString();
      let cardToRender = null;
      let key = "";

      if (activeTimeSlot.includes("12.00")) {
        if (!isOccupied) {
            isOccupied = true;
            cardToRender = (
              <div className="break-card">
                <IonIcon icon={fastFoodOutline} className="break-icon" />
                <span className="break-text">Lunch Time</span>
              </div>
            );
            key = `lunch-${index}`;
        }
      } 
      else if (classData && classData.trim() !== "" && classData.includes(currentLevelStr)) {
        isOccupied = true;
        const color = getSubjectColor(classData);
        cardToRender = (
          <div className="card" style={{ backgroundColor: color }}>
            <div className="card-accent" />
            <div className="card-content">
              <div className="subject-text">{classData.trim().toUpperCase()}</div>
                {lecturerData ? (
                  <div className="meta-item">
                    <IonIcon icon={personOutline} className="meta-icon" />
                    <span className="detail-text">{getLecturerName(lecturerData)}</span>
                  </div>
                ) : null}
                {venueData ? (
                  <div className="meta-item">
                    <IonIcon icon={locationOutline} className="meta-icon" />
                    <span className="sub-detail-text">{venueData.trim().toUpperCase()}</span>
                  </div>
                ) : null}
            </div>
          </div>
        );
        key = `class-${index}`;
      } 
      else if (!isOccupied && isLastRowOfBlock) {
        isOccupied = true; 
        cardToRender = (
          <div className="free-card">
            <span className="free-text">Free period</span>
          </div>
        );
        key = `free-${index}`;
      }

      // 5. Render
      if (cardToRender) {
        const showTime = activeTimeSlot !== lastRenderedTimeLabel;
        items.push(renderTimelineRow(activeTimeSlot, cardToRender, key, showTime));
        if (showTime) lastRenderedTimeLabel = activeTimeSlot;
      }
    }
    return items;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border custom-header-bg">
        <div className="fixed-header-content">
          <div className="header-container">
            <div className="header-title">Daily Schedule</div>
            <div className="header-subtitle">DCS, UoJ</div>
          </div>

          <div className="level-filter-container">
            <div className="level-scroll-content">
              {LEVELS.map((level) => (
                <div
                  key={level.label}
                  onClick={() => setSelectedLevelOffset(level.offset)}
                  className={`level-chip ${selectedLevelOffset === level.offset ? "selected" : ""}`}
                >
                  <span className={`level-chip-text ${selectedLevelOffset === level.offset ? "selected" : ""}`}>
                    {level.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Day Filter */}
          <div className="calendar-strip">
            {availableDays.map((dItem) => {
              const isSelected = selectedDayIndex === dItem.dayId;
              return (
                <div
                  key={dItem.label}
                  className={`day-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedDayIndex(dItem.dayId)}
                >
                  <span className={`day-text ${isSelected ? "selected" : ""}`}>{dItem.label}</span>
                  {isSelected && <div className="active-dot" />}
                </div>
              );
            })}
          </div>
        </div>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingText="Pull to refresh" refreshingSpinner="circles" />
        </IonRefresher>

        <div className="content-wrapper">
          {loading ? (
            <div className="loading-container">
              <IonSpinner color="primary" />
              <div className="loading-text">Syncing timetable...</div>
            </div>
          ) : (
            <div className="scroll-content">
              {renderTimetable()}
              <div style={{ height: 80 }} />
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;