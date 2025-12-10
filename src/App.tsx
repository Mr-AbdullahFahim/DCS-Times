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
  IonAlert,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { calendar, book, informationCircle } from 'ionicons/icons';
import Papa, { ParseResult } from "papaparse";
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

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

// --- GITHUB CONFIGURATION ---
const GITHUB_OWNER = "Mr-AbdullahFahim"; 
const GITHUB_REPO = "DCS-Times"; 

const App: React.FC = () => {
  const [timetableData, setTimetableData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: '', url: '', body: '' });

  // --- HELPER: COMPARE VERSIONS ---
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

  // --- HELPER: CHECK UPDATE FROM SHEET DATA ---
  const performUpdateCheck = async (remoteTag: string) => {
    // Skip checking on web to prevent errors
    // if (!Capacitor.isNativePlatform()) return; 

    try {
      // In a real native build, use CapApp.getInfo(). For dev, we simulate or skip.
      let currentVersion = "1.0.0"; 
      if (Capacitor.isNativePlatform()) {
        const appInfo = await CapApp.getInfo();
        currentVersion = appInfo.version;
      }
      
      const cleanCurrent = currentVersion.replace(/^v/, '');
      const cleanRemote = remoteTag.replace(/^v/, '');

      console.log(`Checking Update: Local(${cleanCurrent}) vs Remote(${cleanRemote})`);

      if (isNewer(cleanCurrent, cleanRemote)) {
        setUpdateInfo({
          version: remoteTag,
          url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${remoteTag}`,
          body: 'A new version is available with performance improvements and bug fixes.'
        });
        setShowUpdateAlert(true);
      }
    } catch (error) {
      console.error("Update check logic failed:", error);
    }
  };

  // --- MAIN FETCH LOGIC ---
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const masterResponse = await fetch(MASTER_SHEET_URL);
      const masterCsvText = await masterResponse.text();

      Papa.parse(masterCsvText, {
        header: false,
        skipEmptyLines: false,
        complete: async (masterResults: ParseResult<string[]>) => {
          const sheetId = masterResults.data?.[0]?.[0]?.trim();
          const latestVersion = masterResults.data?.[1]?.[0]?.trim();

          if (latestVersion) {
            performUpdateCheck(latestVersion);
          }

          if (!sheetId) {
            console.error("Sheet ID not found in Master Sheet A1");
            setIsLoading(false);
            return;
          }

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

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <IonApp>
      {/* 1. Inject Styles for the Alert to match App Theme */}
      <style>{`
        .custom-update-alert .alert-wrapper {
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .custom-update-alert .alert-head {
          padding-bottom: 8px;
        }
        .custom-update-alert .alert-title {
          color: #1a2138;
          font-weight: 700;
          font-size: 18px;
        }
        .custom-update-alert .alert-sub-title {
          color: #4A90E2;
          font-weight: 600;
          font-size: 14px;
        }
        .custom-update-alert .alert-message {
          color: #666;
          font-size: 14px;
        }
        /* Cancel Button - Gray */
        .custom-update-alert .alert-button-cancel {
          color: #8f9bb3 !important;
          font-weight: 600;
        }
        /* Confirm Button - App Blue */
        .custom-update-alert .alert-button-confirm {
          color: #4A90E2 !important;
          font-weight: 700;
        }
      `}</style>

      {/* 2. The Themed Alert */}
      <IonAlert
        isOpen={showUpdateAlert}
        onDidDismiss={() => setShowUpdateAlert(false)}
        cssClass="custom-update-alert"
        header="Update Available 🚀"
        subHeader={`Version ${updateInfo.version} is ready!`}
        buttons={[
          {
            text: 'Not Now',
            role: 'cancel',
            cssClass: 'alert-button-cancel',
            handler: () => setShowUpdateAlert(false)
          },
          {
            text: 'Update App',
            role: 'confirm',
            cssClass: 'alert-button-confirm',
            handler: () => {
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
                  Booking
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