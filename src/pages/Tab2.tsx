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
import {
  time,
  calendarOutline,
  locationOutline,
  peopleOutline,
} from "ionicons/icons";
import "./Tab2.css";

// --- TITLE DICTIONARY ---
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
    if (lowerTitle.includes(item.keyword.toLowerCase())) {
      return item.display;
    }
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

interface SectionData {
  id: string;
  title: string;
  startColIndex: number;
  headers: string[];
  rowIndices: number[];
}

// Props definition
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
    if (data && data.length > 0) {
      processData(data);
    }
  }, [data]);

  const processData = (rawRows: string[][]) => {
    const newMap: Record<string, string> = {};
    rawRows.forEach((row) => {
        for(let c = 10; c < row.length; c++) {
           const cell = row[c];
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
            const headers: string[] = [];
            let hCol = startCol;
            while(hCol < cols.length) {
                const headerVal = cols[hCol]?.[i]?.trim();
                if (!headerVal) break;
                headers.push(headerVal);
                hCol++;
            }

            let rawTitle = "Event Schedule";
            const prevRow1 = cols[startCol]?.[i - 1]?.trim();
            const prevRow2 = cols[startCol]?.[i - 2]?.trim();
            if (prevRow1 && prevRow1 !== "") rawTitle = prevRow1;
            else if (prevRow2 && prevRow2 !== "") rawTitle = prevRow2;

            const displayTitle = standardizeTitle(rawTitle);

            const rowIndices: number[] = [];
            let dRow = i + 1;
            while (dRow < rowCount) {
                const dateVal = cols[startCol]?.[dRow];
                if (!dateVal || dateVal.trim() === "" || dateVal.toLowerCase() === "date") break;
                rowIndices.push(dRow);
                processedRows.add(dRow);
                dRow++;
            }

            foundSections.push({
                id: `sec-${i}`,
                title: displayTitle,
                startColIndex: startCol,
                headers: headers,
                rowIndices: rowIndices
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
      if (section.rowIndices.length > 0) {
        renderedItems.push(renderSectionHeader(section.title, section.id));

        section.rowIndices.forEach((rowIndex) => {
            const rowData: Record<string, string> = {};
            section.headers.forEach((h, idx) => {
                const val = columns[section.startColIndex + idx]?.[rowIndex];
                rowData[h.toLowerCase()] = val || "";
            });

            let title = rowData['event'] || rowData['activity'] || rowData['subject'] || rowData['topic'];
            
            if (!title) {
                const unknownKey = Object.keys(rowData).find(k => 
                    !['date','day','time','venue','organised by','poc'].includes(k)
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
                        {rowData['day'] && <span className="detail-text" style={{fontWeight:400}}> ({rowData['day']})</span>}
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
                          if (['date','day','event','time','venue','organised by','organizer','poc','activity','topic','subject','lecturer'].some(k => lower.includes(k))) return null;
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