import React, { JSX, useEffect, useState } from "react";
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
import { time, calendarOutline, locationOutline, peopleOutline } from "ionicons/icons";
import "./Tab2.css";

const TITLE_DICTIONARY = [
  { keyword: "Exam", display: "Examinations" },
  { keyword: "Mid Semester", display: "Mid Exams" },
  { keyword: "End Semester", display: "Final Exams" },
  { keyword: "Lecture", display: "Lectures" },
  { keyword: "Laboratory", display: "Labs" },
  { keyword: "Lab", display: "Labs" },
  { keyword: "Practical", display: "Practicals" },
  { keyword: "Meeting", display: "Meetings" },
  { keyword: "Workshop", display: "Workshops" },
  { keyword: "Seminar", display: "Seminars" },
  { keyword: "Discussion", display: "Discussions" },
  { keyword: "Event", display: "Events" },
  { keyword: "Booking", display: "Venue Bookings" },
  { keyword: "Extra", display: "Extra Classes" },
  { keyword: "Quiz", display: "Quizzes" },
  { keyword: "Presentation", display: "Presentations" },
  { keyword: "Defence", display: "Project Defence" },
];

const standardizeTitle = (rawTitle: string): string => {
  if (!rawTitle) return "Schedule";
  const lowerTitle = rawTitle.toLowerCase();
  for (const item of TITLE_DICTIONARY) {
    if (lowerTitle.includes(item.keyword.toLowerCase())) return item.display;
  }
  let clean = rawTitle;
  clean = clean.replace(/\b(booking|schedule|allocation|timetable|session|venue)\b/gi, "");
  clean = clean.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "");
  clean = clean.replace(/\d{4}\/\d{4}/g, "");
  clean = clean.replace(/[-–]/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean.length < 2 ? rawTitle : clean;
};

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

interface SectionRow {
  index: number;
  effectiveDate: string;
}

interface SectionData {
  id: string;
  title: string;
  startColIndex: number;
  headers: string[];
  rows: SectionRow[];
}

interface Tab2Props {
  data: string[][];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

const Tab2: React.FC<Tab2Props> = ({ data, isLoading, onRefresh }) => {
  const [columns, setColumns] = useState<string[][]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [lecturerMap, setLecturerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data && data.length > 0) processData(data);
  }, [data]);

  const processData = (rawRows: string[][]) => {
    const newMap: Record<string, string> = {};
    rawRows.forEach((row) => {
      for (let c = 10; c < row.length; c++) {
        const cell = row[c];
        if (cell && typeof cell === "string") {
          const normalizedCell = cell.replace(/–/g, "-").trim();
          if (normalizedCell.includes("-")) {
            const parts = normalizedCell.split("-");
            if (parts.length >= 2) {
              const shortCode = parts[0].replace(/[^a-zA-Z]/g, "");
              const fullName = parts.slice(1).join("-").trim();
              if (shortCode.length > 0 && shortCode.length < 6 && fullName.length > 0)
                newMap[shortCode] = fullName;
            }
          }
        }
      }
    });
    newMap["MK"] = "Mr. M. Kokulan";
    setLecturerMap(newMap);
    const columnWiseData = transpose(rawRows);
    setColumns(columnWiseData);
    processSections(columnWiseData);
  };

  const processSections = (cols: string[][]) => {
    if (!cols || cols.length < 10) return;
    const rowCount = cols[0]?.length;
    const processedRows = new Set<number>();
    const foundSections: SectionData[] = [];

    for (let i = 0; i < rowCount; i++) {
      if (processedRows.has(i)) continue;

      let startCol = -1;
      for (let c = 15; c < Math.min(cols.length, 50); c++) {
        if (cols[c]?.[i]?.trim().toLowerCase() === "date") {
          startCol = c;
          break;
        }
      }

      if (startCol !== -1) {
        // --- 1. Identify Headers ---
        const headers: string[] = [];
        let hCol = startCol;
        while (hCol < cols.length) {
          const headerVal = cols[hCol]?.[i]?.trim();
          if (!headerVal) break;
          headers.push(headerVal);
          hCol++;
        }

        // --- 2. Identify Section Title ---
        let rawTitle = "Event Schedule";
        const prevRow1 = cols[startCol]?.[i - 1]?.trim();
        const prevRow2 = cols[startCol]?.[i - 2]?.trim();
        if (prevRow1 && prevRow1 !== "") rawTitle = prevRow1;
        else if (prevRow2 && prevRow2 !== "") rawTitle = prevRow2;

        const displayTitle = standardizeTitle(rawTitle);

        // --- 3. Process Rows (With Smart Breaks) ---
        const sectionRows: SectionRow[] = [];
        let dRow = i + 1;
        let lastValidDate = "";
        let consecutiveEmptyRows = 0;

        while (dRow < rowCount) {
          const rawDateVal = cols[startCol]?.[dRow];
          const dateStr = rawDateVal ? rawDateVal.trim() : "";
          const lowerDate = dateStr.toLowerCase();

          // --- BREAK CHECK 1: Start of a new Header Row ---
          if (lowerDate === "date") break;

          // --- BREAK CHECK 2: Start of a new Table Title ---
          // Logic: If the row has text that matches a Title keyword (like "Exam") 
          // AND it doesn't look like a valid event (no valid time), it's a separator.
          
          // Gather data for this row
          const rowValues = headers.map((_, idx) => cols[startCol + idx]?.[dRow]?.trim() || "");
          const timeValue = rowValues.find((v, idx) => headers[idx].toLowerCase().includes('time'));
          const hasNumberInTime = timeValue && /\d/.test(timeValue);

          const isTitleKeyword = TITLE_DICTIONARY.some(t => lowerDate.includes(t.keyword.toLowerCase()));
          
          // If it looks like a Title and doesn't have a time (e.g., "Mid Semester Exams"), stop processing.
          if (isTitleKeyword && !hasNumberInTime) {
             break;
          }

          // --- BREAK CHECK 3: Merged Title Row (Repeated Data) ---
          // If every column has the exact same non-empty value, it's a title row, not data.
          const firstVal = rowValues[0];
          const allSame = firstVal && rowValues.length > 1 && rowValues.every(v => v === firstVal);
          if (allSame) {
            break;
          }

          // --- Standard Row Processing ---
          let currentRowDate = lastValidDate;
          if (dateStr !== "") {
            currentRowDate = dateStr;
            lastValidDate = dateStr;
          }

          // Check if row has ANY data (even if date is empty - merged cells)
          const hasData = rowValues.some(v => v !== "");

          if (hasData) {
            if (currentRowDate) {
              sectionRows.push({
                index: dRow,
                effectiveDate: currentRowDate,
              });
              processedRows.add(dRow);
            }
            consecutiveEmptyRows = 0;
          } else {
            consecutiveEmptyRows++;
            if (consecutiveEmptyRows > 3) break;
          }

          dRow++;
        }

        foundSections.push({
          id: `sec-${i}`,
          title: displayTitle,
          startColIndex: startCol,
          headers: headers,
          rows: sectionRows,
        });

        processedRows.add(i);
      }
    }
    setSections(foundSections);
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await onRefresh();
    event.detail.complete();
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
      if (["&", ",", "/", "+"].includes(code)) return part;
      const cleanCode = code.replace(/[^a-zA-Z]/g, "");
      if (lecturerMap[cleanCode]) return lecturerMap[cleanCode];
      return lecturerMap[code] || code;
    });
    return translatedParts.join("");
  };

  const renderSectionHeader = (title: string, key: string) => (
    <div key={key} className="section-header-container">
      <div className="section-header-line" />
      <div className="section-header-badge">
        <span className="section-header-text">{title}</span>
      </div>
      <div className="section-header-line" />
    </div>
  );

  const renderSchedule = () => {
    if (sections.length === 0) {
      if (!isLoading) {
        return (
          <div className="empty-container">
            <span className="empty-text">No upcoming bookings found.</span>
          </div>
        );
      }
      return null;
    }

    const renderedItems: JSX.Element[] = [];
    
    sections.forEach((section) => {
      if (section.rows.length > 0) {
        renderedItems.push(renderSectionHeader(section.title, section.id));
        
        section.rows.forEach((rowObj) => {
          const rowIndex = rowObj.index;
          const rowData: Record<string, string> = {};
          
          section.headers.forEach((h, idx) => {
            const val = columns[section.startColIndex + idx]?.[rowIndex];
            rowData[h.toLowerCase()] = val || "";
          });

          // Use the effective date from logic
          rowData['date'] = rowObj.effectiveDate;

          let title = rowData['event'] || rowData['activity'] || rowData['subject'] || rowData['topic'];
          if (!title) {
            const unknownKey = Object.keys(rowData).find((k) =>
              !['date', 'day', 'time', 'venue', 'organised by', 'poc'].includes(k)
            );
            if (unknownKey) title = rowData[unknownKey];
            else title = section.title;
          }

          const timeVal = rowData['time'];
          const venueVal = rowData['venue'];
          const orgVal = rowData['organised by'] || rowData['poc'] || rowData['organizer'] || rowData['lecturer'];
          const dateVal = rowData['date'];
          const color = getSubjectColor(title);

          renderedItems.push(
            <div key={`event-${rowIndex}`} className="card" style={{ backgroundColor: color }}>
              <div className="card-accent" />
              <div className="card-content">
                <div className="subject-text">{title}</div>
                {timeVal && (
                  <div className="time-container">
                    <IonIcon icon={time} className="time-icon" />
                    <span className="time-text">{timeVal}</span>
                  </div>
                )}
                <div className="meta-container">
                  <div className="meta-row">
                    <IonIcon icon={calendarOutline} className="meta-icon" />
                    <span className="detail-text"> {dateVal}</span>
                    {rowData['day'] && <span className="detail-text" style={{ fontWeight: 400 }}> ({rowData['day']})</span>}
                  </div>
                  {venueVal && (
                    <div className="meta-row">
                      <IonIcon icon={locationOutline} className="meta-icon" />
                      <span className="sub-detail-text"> Venue: {venueVal}</span>
                    </div>
                  )}
                  {orgVal && (
                    <div className="meta-row">
                      <IonIcon icon={peopleOutline} className="meta-icon" />
                      <span className="sub-detail-text"> By: {getLecturerName(orgVal)}</span>
                    </div>
                  )}
                  {section.headers.map((h, idx) => {
                    const lower = h.toLowerCase();
                    if (['date', 'day', 'event', 'time', 'venue', 'organised by', 'organizer', 'poc', 'activity', 'topic', 'subject', 'lecturer'].some((k) => lower.includes(k))) return null;
                    const val = columns[section.startColIndex + idx]?.[rowIndex];
                    if (!val) return null;
                    return (
                      <div key={`extra-${rowIndex}-${idx}`} className="meta-row">
                        <span className="extra-detail-text">{h}: {val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        });
      }
    });
    return renderedItems;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border tab2-header-bg">
        <div className="tab2-header-wrapper">
          <div className="tab2-header-container">
            <div className="tab2-header-title">Venues</div>
            <div className="tab2-header-subtitle">Booking Schedule</div>
          </div>
        </div>
      </IonHeader>

      <IonContent fullscreen className="tab2-content-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingText="Pull to refresh" refreshingSpinner="circles" />
        </IonRefresher>

        <div className="tab2-content-wrapper">
          {isLoading ? (
            <div className="loading-container">
              <IonSpinner color="primary" />
              <div className="loading-text">Syncing schedule...</div>
            </div>
          ) : (
            <div className="tab2-scroll-content">
              {renderSchedule()}
              <div style={{ height: 80 }} />
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Tab2;