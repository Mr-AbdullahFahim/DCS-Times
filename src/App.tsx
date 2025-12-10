import React, { useEffect, useState, useCallback } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonSpinner,
  IonAlert, // Added IonAlert
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { calendar, book, informationCircle } from 'ionicons/icons';
import Papa, { ParseResult } from "papaparse";
import { App as CapApp } from '@capacitor/app'; // Alias to avoid conflict with App component
import { Browser } from '@capacitor/browser'; // Recommended for opening URLs

import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

// --- CONFIGURATION ---
const MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/1tZ_6OE0Ht8_xAvl2Wof6tvsB0OMrzp_SU6jHo6GIgIA/export?format=csv";
const TIMETABLE_GID = "1890970529";

// --- GITHUB UPDATE CONFIGURATION ---
// TODO: Replace with your actual GitHub username and repository name
const GITHUB_OWNER = "Mr-AbdullahFahim"; 
const GITHUB_REPO = "DCS-Times"; 

const App: React.FC = () => {
  // Data State
  const [timetableData, setTimetableData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update State
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: '', url: '', body: '' });

  // --- 1. TIMETABLE FETCHING LOGIC ---
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch Master Sheet to get ID
      const masterResponse = await fetch(MASTER_SHEET_URL);
      const masterCsvText = await masterResponse.text();

      Papa.parse(masterCsvText, {
        header: false,
        skipEmptyLines: false,
        complete: async (masterResults: ParseResult<string[]>) => {
          const sheetId = masterResults.data?.[0]?.[0]?.trim();

          if (!sheetId) {
            console.error("Sheet ID not found in Master Sheet");
            setIsLoading(false);
            return;
          }

          // Fetch Actual Timetable
          const dynamicUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${TIMETABLE_GID}`;
          
          try {
            const dataResponse = await fetch(dynamicUrl);
            const dataCsvText = await dataResponse.text();

            Papa.parse(dataCsvText, {
              header: false,
              skipEmptyLines: false,
              complete: (results: ParseResult<string[]>) => {
                setTimetableData(results.data);
                setIsLoading(false);
              },
              error: (err: Error) => {
                console.error("Error parsing Timetable CSV:", err);
                setIsLoading(false);
              }
            });
          } catch (err) {
            console.error("Error fetching Timetable:", err);
            setIsLoading(false);
          }
        },
        error: (err: Error) => {
          console.error("Error parsing Master CSV:", err);
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error("Network Error:", error);
      setIsLoading(false);
    }
  }, []);

  // --- 2. UPDATE CHECKER LOGIC ---
  const checkForUpdate = async () => {
    try {
      // A. Get Current App Version
      const appInfo = await CapApp.getInfo();
      const currentVersion = appInfo.version; // e.g., "1.0.0"

      // B. Get Latest Release from GitHub
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return; // Silent fail on network error or rate limit
      
      const data = await response.json();
      const latestVersionTag = data.tag_name; // e.g., "v1.0.1" or "1.0.1"
      
      // Clean versions string for comparison (remove 'v' prefix)
      const cleanCurrent = currentVersion.replace(/^v/, '');
      const cleanLatest = latestVersionTag.replace(/^v/, '');

      // C. Compare Versions (Simple semantic check)
      if (isNewer(cleanCurrent, cleanLatest)) {
        setUpdateInfo({
          version: latestVersionTag,
          url: data.html_url, // Link to the release page
          body: data.body || 'Performance improvements and bug fixes.'
        });
        setShowUpdateAlert(true);
      }
    } catch (error) {
      console.error("Update check failed:", error);
    }
  };

  // Helper to compare version strings (returns true if v2 > v1)
  const isNewer = (v1: string, v2: string) => {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num2 > num1) return true;
      if (num2 < num1) return false;
    }
    return false;
  };

  // --- EFFECTS ---
  
  // 1. Load Data on Mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 2. Check for Updates on Mount
  useEffect(() => {
    checkForUpdate();
  }, []);

  return (
    <IonApp>
      {/* UPDATE NOTIFICATION ALERT */}
      <IonAlert
        isOpen={showUpdateAlert}
        onDidDismiss={() => setShowUpdateAlert(false)}
        header="New Update Available!"
        subHeader={`Version ${updateInfo.version} is now available.`}
        message={updateInfo.body}
        buttons={[
          {
            text: 'Later',
            role: 'cancel',
            handler: () => setShowUpdateAlert(false)
          },
          {
            text: 'Upgrade',
            role: 'confirm',
            handler: () => {
              // Redirect to GitHub Release Page
              Browser.open({ url: updateInfo.url });
            }
          }
        ]}
      />

      <div style={{ 
        paddingTop: 'var(--ion-safe-area-top)', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#FFFFFF' 
      }}>
        <IonReactRouter>
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/tab1">
                <Tab1 
                  data={timetableData} 
                  isLoading={isLoading} 
                  onRefresh={fetchAllData} 
                />
              </Route>
              <Route exact path="/tab2">
                <Tab2 
                  data={timetableData} 
                  isLoading={isLoading} 
                  onRefresh={fetchAllData} 
                />
              </Route>
              <Route path="/tab3">
                <Tab3 />
              </Route>
              <Route exact path="/">
                <Redirect to="/tab1" />
              </Route>
            </IonRouterOutlet>

            <IonTabBar 
              slot="bottom" 
              style={{
                '--background': '#FFFFFF',
                '--border': 'none',
                '--color-selected': '#4A90E2', 
                '--color': '#8F9BB3',          
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)', 
                height: 'calc(55px + var(--ion-safe-area-bottom))', 
                paddingTop: '6px',
                paddingBottom: 'calc(6px + var(--ion-safe-area-bottom))'
              }}
            >
              <IonTabButton tab="tab1" href="/tab1">
                <IonIcon aria-hidden="true" icon={calendar} />
                <IonLabel style={{ fontWeight: '600', fontSize: '11px', marginTop: '2px' }}>
                  Schedule
                </IonLabel>
              </IonTabButton>

              <IonTabButton tab="tab2" href="/tab2">
                <IonIcon aria-hidden="true" icon={book} />
                <IonLabel style={{ fontWeight: '600', fontSize: '11px', marginTop: '2px' }}>
                  Bookings
                </IonLabel>
              </IonTabButton>

              <IonTabButton tab="tab3" href="/tab3">
                <IonIcon aria-hidden="true" icon={informationCircle} />
                <IonLabel style={{ fontWeight: '600', fontSize: '11px', marginTop: '2px' }}>
                  Info
                </IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </IonReactRouter>
      </div>
    </IonApp>
  );
};

export default App;