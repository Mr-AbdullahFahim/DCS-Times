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
  isPlatform,
} from "@ionic/react";
import { personOutline, locationOutline, fastFoodOutline } from "ionicons/icons";
import { LocalNotifications } from "@capacitor/local-notifications";
import "./Tab1.css";

const DAY_OFFSETS = [
  { label: "Mon", colIndex: 1, dayId: 0, weekday: 2 }, // weekday 2 = Monday in Capacitor
  { label: "Tue", colIndex: 4, dayId: 1, weekday: 3 },
  { label: "Wed", colIndex: 7, dayId: 2, weekday: 4 },
  { label: "Thu", colIndex: 10, dayId: 3, weekday: 5 },
  { label: "Fri", colIndex: 13, dayId: 4, weekday: 6 },
  { label: "Sat", colIndex: 16, dayId: 5, weekday: 7 },
  { label: "Sun", colIndex: 19, dayId: 6, weekday: 1 },
];

const LEVELS = [
  { label: "Level 1", offset: 1 },
  { label: "Level 2", offset: 2 },
  { label: "Level 3", offset: 3 },
  { label: "Level 4", offset: 4 },
];

const CARD_COLORS = [
  "var(--card-bg-0)",
  "var(--card-bg-1)",
  "var(--card-bg-2)",
  "var(--card-bg-3)",
  "var(--card-bg-4)",
  "var(--card-bg-5)",
];

const getSubjectColor = (subject: string) => {
  if (!subject) return "var(--ion-card-background)";
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CARD_COLORS.length;
  return CARD_COLORS[index];
};

interface DayItem { label: string; dayId: number; }
interface Tab1Props { 
    data: string[][]; 
    isLoading: boolean; 
    onRefresh: () => Promise<void>; 
    userLevel: number; 
}

const Tab1: React.FC<Tab1Props> = ({ data, isLoading, onRefresh, userLevel }) => {
  const [columns, setColumns] = useState<string[][]>([]);
  const [lecturerMap, setLecturerMap] = useState<Record<string, string>>({});
  const [selectedLevelOffset, setSelectedLevelOffset] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [availableDays, setAvailableDays] = useState<DayItem[]>([]);

  // Sync the view with the User's Level preference
  useEffect(() => {
    if (userLevel >= 1 && userLevel <= 4) {
      setSelectedLevelOffset(userLevel);
    }
  }, [userLevel]);

  // Process data when it loads
  useEffect(() => {
    if (data && data.length > 0) processData(data);
  }, [data]);

  // Schedule Notifications when data or level updates
  useEffect(() => {
    if (data && data.length > 0 && userLevel) {
       scheduleNotifications(data, userLevel);
    }
  }, [data, userLevel]);

  /* ---------------- NOTIFICATION LOGIC ---------------- */
  const scheduleNotifications = async (rawRows: string[][], level: number) => {
    if (!isPlatform('hybrid')) return;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      console.warn("Notification permission denied");
      return;
    }

    // 1. Clear existing to prevent duplicates
    try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }
    } catch (e) { console.error("Error clearing notifications", e); }

    const notificationsToSchedule: any[] = [];
    const transposed = transpose(rawRows);
    let idCounter = 1;
    const levelStr = level.toString();

    // 2. Scan every day
    DAY_OFFSETS.forEach(dayConfig => {
        // Assuming Time is in Column 0 (based on renderTimetable logic)
        const timeCol = transposed[0];
        // Based on DAY_OFFSETS, data starts at colIndex
        const classCol = transposed[dayConfig.colIndex]; 

        if (!timeCol || !classCol) return;

        const rowCount = classCol.length;
        const validTimePattern = /^(0?[89]|1[0-2]|0?[1-4])[:.]00/;

        for(let i=0; i<rowCount; i++) {
            const timeRaw = timeCol[i]?.trim();
            const cellData = classCol[i]?.trim();

            if (!timeRaw || !cellData) continue;
            // Only proceed if time is valid AND cell matches user level
            if ((validTimePattern.test(timeRaw) || /\d/.test(timeRaw)) && cellData.includes(levelStr)) {
                
                // Parse Start Time (e.g. "08.30-09.30" -> 08:30)
                const startTimeStr = timeRaw.split("-")[0].trim();
                const [hStr, mStr] = startTimeStr.split(/[:.]/);
                let hour = parseInt(hStr);
                let minute = parseInt(mStr);

                if (isNaN(hour) || isNaN(minute)) continue;

                // Subtract 15 minutes
                let notifyHour = hour;
                let notifyMinute = minute - 15;
                if (notifyMinute < 0) {
                    notifyMinute += 60;
                    notifyHour -= 1;
                }

                // Create Notification Object
                notificationsToSchedule.push({
                    id: idCounter++,
                    title: `Upcoming Lecture (${dayConfig.label})`,
                    body: `${cellData} starts at ${startTimeStr}.`,
                    channelId: "timetable_channel",
                    schedule: {
                        on: {
                            weekday: dayConfig.weekday,
                            hour: notifyHour,
                            minute: notifyMinute
                        },
                        allowWhileIdle: true,
                    }
                });
            }
        }
    });

    // 3. Schedule Batch
    if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`Scheduled ${notificationsToSchedule.length} notifications.`);
    }
  };

  /* ---------------- DATA PROCESSING ---------------- */
  const processData = (rawRows: string[][]) => {
    const newMap: Record<string, string> = {};
    rawRows.forEach((row) => {
      row.forEach((cell) => {
        if (cell && typeof cell === "string") {
          const normalizedCell = cell.replace(/–/g, "-").trim();
          if (normalizedCell.includes("-")) {
            const parts = normalizedCell.split("-");
            if (parts.length >= 2) {
              const shortCode = parts[0].replace(/[^a-zA-Z]/g, "");
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

    const transposed = transpose(rawRows);
    setColumns(transposed);

    const foundDays: DayItem[] = [];
    DAY_OFFSETS.slice(0, 5).forEach((dayDef) => {
        if (transposed.length > dayDef.colIndex) foundDays.push({ label: dayDef.label, dayId: dayDef.dayId });
    });
    DAY_OFFSETS.slice(5).forEach((dayDef) => {
        const hasColumnData = transposed.length > dayDef.colIndex;
        const headerCell = rawRows[1]?.[dayDef.colIndex]?.trim();
        if (hasColumnData && headerCell && headerCell !== "") foundDays.push({ label: dayDef.label, dayId: dayDef.dayId });
    });

    if (foundDays.length === 0) {
        setAvailableDays(DAY_OFFSETS.slice(0, 5).map(d => ({ label: d.label, dayId: d.dayId })));
    } else {
        setAvailableDays(foundDays);
        if (!foundDays.some(d => d.dayId === selectedDayIndex)) setSelectedDayIndex(foundDays[0].dayId);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await onRefresh();
    event.detail.complete();
  };

  const transpose = (matrix: string[][]): string[][] => {
    if (!matrix || matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
  };

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
    const validTimePattern = /^(0?[89]|1[0-2]|0?[1-4])[:.]00/;

    for (let index = 0; index < rowCount; index++) {
      if (index <= 2) continue; 

      const timeSlotRaw = columns[0]?.[index]?.trim() || "";
      if (timeSlotRaw !== "" && !validTimePattern.test(timeSlotRaw) && !/\d/.test(timeSlotRaw)) continue;

      if (timeSlotRaw !== "") {
        if (timeSlotRaw !== activeTimeSlot) {
          activeTimeSlot = timeSlotRaw;
          isOccupied = false; 
        }
      }
      
      if (!activeTimeSlot) continue;

      const nextTimeRaw = columns[0]?.[index + 1]?.trim();
      const nextRowExists = columns[0]?.[index + 1] !== undefined;
      let isLastRowOfBlock = false;

      if (!nextRowExists) isLastRowOfBlock = true;
      else if (nextTimeRaw !== "") {
         if (nextTimeRaw !== activeTimeSlot) isLastRowOfBlock = true;
      }

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
              <div className="subject-text">{classData.trim()}</div>
                {lecturerData ? (
                  <div className="meta-item">
                    <IonIcon icon={personOutline} className="meta-icon" />
                    <span className="detail-text">{getLecturerName(lecturerData)}</span>
                  </div>
                ) : null}
                {venueData ? (
                  <div className="meta-item">
                    <IonIcon icon={locationOutline} className="meta-icon" />
                    <span className="sub-detail-text">{venueData.trim()}</span>
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
          {isLoading ? (
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