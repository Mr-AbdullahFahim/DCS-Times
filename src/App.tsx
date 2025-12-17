import React, { useEffect, useState, useCallback } from "react";
import { Redirect, Route } from "react-router-dom";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonAlert,
  IonToast,
  setupIonicReact,
  isPlatform,
  IonPage,
  IonContent,
  IonButton,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { calendar, book, informationCircle, cloudOfflineOutline, refreshOutline, wifi } from "ionicons/icons";
import Papa, { ParseResult } from "papaparse";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Network } from "@capacitor/network";
import { LocalNotifications } from "@capacitor/local-notifications";
// 1. IMPORT PREFERENCES (Async Storage)
import { Preferences } from '@capacitor/preferences';

import Tab1 from "./pages/Tab1";
import Tab2 from "./pages/Tab2";
import Tab3 from "./pages/Tab3";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

import "./theme/variables.css";

setupIonicReact();

const MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/1tZ_6OE0Ht8_xAvl2Wof6tvsB0OMrzp_SU6jHo6GIgIA/export?format=csv";
const TIMETABLE_GID = "1890970529";
const GITHUB_OWNER = "Mr-AbdullahFahim";
const GITHUB_REPO = "DCS-Times";
const STORAGE_KEY = "cached_timetable_data";
const LEVEL_KEY = "user_study_level";

const App: React.FC = () => {
  const [timetableData, setTimetableData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  
  // Level State
  const [userLevel, setUserLevel] = useState<number>(1);
  const [showLevelAlert, setShowLevelAlert] = useState(false);

  // Update State
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: "", url: "", body: "" });

  /* ---------------- INIT & CACHE LOAD ---------------- */

  useEffect(() => {
    // We wrap everything in an async function to handle Preferences
    const initApp = async () => {
      // 1. Request Notification Permissions
      if (isPlatform('hybrid')) {
        await LocalNotifications.requestPermissions();
      }

      // 2. Check for User Level (ASYNC)
      const { value: storedLevel } = await Preferences.get({ key: LEVEL_KEY });
      
      if (storedLevel) {
        setUserLevel(parseInt(storedLevel));
      } else {
        // Only show alert if storage is empty
        setShowLevelAlert(true);
      }

      // 3. Load Cache (ASYNC)
      const { value: cached } = await Preferences.get({ key: STORAGE_KEY });
      
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setTimetableData(parsedData);
            setIsLoading(false); // Show cached data immediately
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    };

    initApp();
  }, []);

  /* ---------------- DATA FETCH ---------------- */

  const fetchAllData = useCallback(async () => {
    const status = await Network.getStatus();
    
    if (!status.connected) {
      setIsNetworkAvailable(false);
      if (timetableData.length === 0) setIsLoading(false);
      else setShowOfflineToast(true);
      return;
    }

    setIsNetworkAvailable(true);
    if (timetableData.length === 0) setIsLoading(true);

    try {
      const masterResponse = await fetch(MASTER_SHEET_URL);
      if (!masterResponse.ok) throw new Error("Master sheet fetch failed");
      const masterCsvText = await masterResponse.text();

      Papa.parse(masterCsvText, {
        complete: async (masterResults: ParseResult<string[]>) => {
          const sheetId = masterResults.data?.[0]?.[0]?.trim();
          if (!sheetId) return;

          const dynamicUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${TIMETABLE_GID}`;
          const dataResponse = await fetch(dynamicUrl);
          const dataCsvText = await dataResponse.text();

          Papa.parse(dataCsvText, {
            complete: async (results: ParseResult<string[]>) => {
              const freshData = results.data;
              if (freshData && freshData.length > 0) {
                setTimetableData(freshData);
                // SAVE TO ASYNC STORAGE
                await Preferences.set({
                  key: STORAGE_KEY,
                  value: JSON.stringify(freshData)
                });
              }
              setIsLoading(false);
            },
            error: () => setIsLoading(false),
          });
        },
        error: () => setIsLoading(false),
      });
    } catch (error) {
      console.error("Sync error:", error);
      const currentStatus = await Network.getStatus();
      if (!currentStatus.connected) setIsNetworkAvailable(false);
      setIsLoading(false);
    }
  }, [timetableData.length]);

  useEffect(() => {
    fetchAllData();
    const networkListener = Network.addListener('networkStatusChange', status => {
      setIsNetworkAvailable(status.connected);
      if (status.connected) {
        setShowOfflineToast(false);
        fetchAllData();
      } else {
        setShowOfflineToast(true);
      }
    });
    return () => { networkListener.then(handle => handle.remove()); };
  }, [fetchAllData]);

  /* ---------------- UPDATE CHECK ---------------- */

  const checkForUpdate = async () => {
    try {
      if (!isPlatform("hybrid")) return;
      const appInfo = await CapApp.getInfo();
      const currentVersion = appInfo.version;

      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
      );
      if (!response.ok) return;

      const data = await response.json();
      if (isNewer(currentVersion, data.tag_name)) {
        setUpdateInfo({
          version: data.tag_name,
          url: data.html_url,
          body: data.body || "Performance improvements and bug fixes.",
        });
        setShowUpdateAlert(true);
      }
    } catch (e) { console.error(e); }
  };

  const isNewer = (v1: string, v2: string) => {
    const a = v1.replace(/^v/, "").split(".").map(Number);
    const b = v2.replace(/^v/, "").split(".").map(Number);
    return b.some((n, i) => n > (a[i] || 0));
  };

  useEffect(() => { if (isNetworkAvailable) checkForUpdate(); }, [isNetworkAvailable]);

  /* ---------------- STATUS BAR ---------------- */

  useEffect(() => {
    const applyStatusBar = async (dark: boolean) => {
      if (!isPlatform("hybrid")) return;
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      if (isPlatform("android")) await StatusBar.setOverlaysWebView({ overlay: false });
      else await StatusBar.setOverlaysWebView({ overlay: true });
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyStatusBar(media.matches);
    const listener = (e: MediaQueryListEvent) => applyStatusBar(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  /* ---------------- RENDER UI ---------------- */

  const isBlockingError = !isNetworkAvailable && timetableData.length === 0;

  if (isBlockingError) {
    return (
      <IonApp>
        <IonPage>
          <IonContent fullscreen className="ion-padding">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'var(--ion-color-light-shade)', padding: '30px', borderRadius: '50%', marginBottom: '20px' }}>
                <IonIcon icon={cloudOfflineOutline} style={{ fontSize: '64px', color: 'var(--ion-color-medium)' }} />
              </div>
              <h2 style={{ fontWeight: 700, marginBottom: '8px' }}>No Connection</h2>
              <p style={{ color: 'var(--ion-color-medium)', maxWidth: '280px', marginBottom: '30px' }}>
                We couldn't find any saved data on your device, and there is no internet connection.
              </p>
              <IonButton shape="round" onClick={() => fetchAllData()}>
                <IonIcon slot="start" icon={refreshOutline} />
                Try Again
              </IonButton>
            </div>
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonToast isOpen={showOfflineToast} onDidDismiss={() => setShowOfflineToast(false)} message="You are offline. Showing cached data." duration={3000} position="top" icon={wifi} color="warning" buttons={[{ text: 'Dismiss', role: 'cancel' }]} style={{ marginTop: '40px' }} />

      {/* LEVEL SELECTION ALERT */}
      <IonAlert
        isOpen={showLevelAlert}
        backdropDismiss={false}
        header="Welcome! 👋"
        subHeader="Select your Study Level"
        message="This helps us show you the correct timetable and send notifications."
        inputs={[
          { label: 'Level 1', type: 'radio', value: 1 },
          { label: 'Level 2', type: 'radio', value: 2 },
          { label: 'Level 3', type: 'radio', value: 3 },
          { label: 'Level 4', type: 'radio', value: 4 },
        ]}
        buttons={[
          {
            text: 'Get Started',
            handler: async (data) => {
              if (data) {
                setUserLevel(data);
                // SAVE LEVEL TO ASYNC STORAGE
                await Preferences.set({
                  key: LEVEL_KEY,
                  value: data.toString()
                });
                setShowLevelAlert(false);
              } else {
                return false; 
              }
            }
          }
        ]}
      />

      <IonAlert isOpen={showUpdateAlert} onDidDismiss={() => setShowUpdateAlert(false)} header="Update Available 🚀" subHeader={`Version ${updateInfo.version}`} buttons={[{ text: "Later", role: "cancel" }, { text: "Update", handler: () => Browser.open({ url: updateInfo.url }) }]} />

      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/tab1">
              <Tab1 data={timetableData} isLoading={isLoading} onRefresh={fetchAllData} userLevel={userLevel} />
            </Route>
            <Route exact path="/tab2">
              <Tab2 data={timetableData} isLoading={isLoading} onRefresh={fetchAllData} />
            </Route>
            <Route exact path="/tab3">
              <Tab3 />
            </Route>
            <Route exact path="/">
              <Redirect to="/tab1" />
            </Route>
          </IonRouterOutlet>

          <IonTabBar slot="bottom" className="custom-tabbar">
            <IonTabButton tab="tab1" href="/tab1">
              <IonIcon icon={calendar} />
              <IonLabel>Schedule</IonLabel>
            </IonTabButton>
            <IonTabButton tab="tab2" href="/tab2">
              <IonIcon icon={book} />
              <IonLabel>Bookings</IonLabel>
            </IonTabButton>
            <IonTabButton tab="tab3" href="/tab3">
              <IonIcon icon={informationCircle} />
              <IonLabel>Info</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;