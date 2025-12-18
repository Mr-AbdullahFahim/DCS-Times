import React, { useEffect, useState, useCallback, useRef } from "react";
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
  setupIonicReact,
  isPlatform,
  IonButton,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import {
  calendar,
  book,
  informationCircle,
  wifiOutline,
  checkmarkCircle,
  closeOutline
} from "ionicons/icons";
import Papa, { ParseResult } from "papaparse";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Network } from "@capacitor/network";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";

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
  const [isDismissed, setIsDismissed] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);

  const [userLevel, setUserLevel] = useState<number>(1);
  const [showLevelAlert, setShowLevelAlert] = useState(false);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: "", url: "", body: "" });

  const updateCheckedRef = useRef(false);

  const requestNotificationPermission = async () => {
    if (!isPlatform("hybrid")) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === "granted") return;
    await LocalNotifications.requestPermissions();
  };

  const fetchAllData = useCallback(async () => {
    const status = await Network.getStatus();
    if (!status.connected) {
      setIsNetworkAvailable(false);
      if (timetableData.length === 0) setIsLoading(false);
      return;
    }

    setIsNetworkAvailable(true);
    try {
      const masterRes = await fetch(MASTER_SHEET_URL);
      const masterText = await masterRes.text();
      Papa.parse(masterText, {
        complete: async (master: ParseResult<string[]>) => {
          const sheetId = master.data?.[0]?.[0]?.trim();
          if (!sheetId) return;
          const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${TIMETABLE_GID}`;
          const dataRes = await fetch(url);
          const dataText = await dataRes.text();
          Papa.parse(dataText, {
            complete: async (res: ParseResult<string[]>) => {
              const cleanData = res.data.filter(row => row && row.some(cell => cell?.trim()));
              if (cleanData.length > 0) {
                setTimetableData(cleanData);
                await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(cleanData) });
              }
              setIsLoading(false);
            },
            error: () => setIsLoading(false),
          });
        },
        error: () => setIsLoading(false),
      });
    } catch (e) { setIsLoading(false); }
  }, [timetableData]);

  useEffect(() => {
    const init = async () => {
      if (isPlatform("hybrid")) {
        await LocalNotifications.createChannel({ id: "timetable_channel", name: "Timetable Alerts", importance: 5 });
      }
      const { value: storedLevel } = await Preferences.get({ key: LEVEL_KEY });
      if (storedLevel) setUserLevel(parseInt(storedLevel));
      else setShowLevelAlert(true);

      const { value: cached } = await Preferences.get({ key: STORAGE_KEY });
      if (cached) {
        setTimetableData(JSON.parse(cached));
        setIsLoading(false);
      }
      fetchAllData();
    };
    init();
  }, []);

  useEffect(() => {
    const listener = Network.addListener("networkStatusChange", (status) => {
      if (status.connected && !isNetworkAvailable) {
        setShowOnlineStatus(true);
        setTimeout(() => setShowOnlineStatus(false), 3000);
        setIsDismissed(false); 
        fetchAllData();
      }
      setIsNetworkAvailable(status.connected);
    });
    return () => { listener.then(h => h.remove()); };
  }, [isNetworkAvailable, fetchAllData]);

  const checkForUpdate = async () => {
    if (!isPlatform("hybrid")) return;
    try {
      const info = await CapApp.getInfo();
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      const data = await res.json();
      const current = info.version.replace(/^v/, "").split(".").map(Number);
      const latest = data.tag_name.replace(/^v/, "").split(".").map(Number);
      let isNewer = false;
      for (let i = 0; i < Math.max(current.length, latest.length); i++) {
        if ((latest[i] || 0) > (current[i] || 0)) { isNewer = true; break; }
        if ((latest[i] || 0) < (current[i] || 0)) break;
      }
      if (isNewer) {
        setUpdateInfo({ version: data.tag_name, url: data.html_url, body: data.body });
        setShowUpdateAlert(true);
      }
    } catch {}
  };

  useEffect(() => {
    if (isNetworkAvailable && !updateCheckedRef.current) {
      updateCheckedRef.current = true;
      checkForUpdate();
    }
  }, [isNetworkAvailable]);

  useEffect(() => {
    if (!isPlatform("hybrid")) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = async (dark: boolean) => {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: dark ? "#000000" : "#ffffff" });
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    };
    apply(media.matches);
    media.addEventListener("change", e => apply(e.matches));
  }, []);

  return (
    <IonApp>
      {/* Container to handle the push effect */}
      <div className="app-main-wrapper">
        
        {/* 1. Back Online Component */}
        {showOnlineStatus && (
          <div className="conn-bar back-online">
            <IonIcon icon={checkmarkCircle} />
            <IonLabel>Back to online</IonLabel>
          </div>
        )}

        {/* 2. Offline States */}
        {!isNetworkAvailable && !showOnlineStatus && (
          <>
            {!isDismissed ? (
              <div className="conn-bar offline-banner">
                <div className="conn-content">
                  <IonIcon icon={wifiOutline} />
                  <IonLabel>You are offline. Showing cached data.</IonLabel>
                </div>
                <IonButton fill="clear" onClick={() => setIsDismissed(true)}>
                  <IonIcon slot="icon-only" icon={closeOutline} />
                </IonButton>
              </div>
            ) : (
              <div className="conn-bar offline-mini">
                Offline
              </div>
            )}
          </>
        )}

        {/* This Router wrapper now flexes to fill the remaining space */}
        <div className="router-wrapper">
          <IonReactRouter>
            <IonTabs>
              <IonRouterOutlet>
                <Route exact path="/tab1">
                  <Tab1 data={timetableData} isLoading={isLoading} onRefresh={fetchAllData} userLevel={userLevel} />
                </Route>
                <Route exact path="/tab2">
                  <Tab2 data={timetableData} isLoading={isLoading} onRefresh={fetchAllData} />
                </Route>
                <Route exact path="/tab3"><Tab3 /></Route>
                <Route exact path="/"><Redirect to="/tab1" /></Route>
              </IonRouterOutlet>

              <IonTabBar slot="bottom">
                <IonTabButton tab="tab1" href="/tab1">
                  <IonIcon icon={calendar} /><IonLabel>Schedule</IonLabel>
                </IonTabButton>
                <IonTabButton tab="tab2" href="/tab2">
                  <IonIcon icon={book} /><IonLabel>Bookings</IonLabel>
                </IonTabButton>
                <IonTabButton tab="tab3" href="/tab3">
                  <IonIcon icon={informationCircle} /><IonLabel>Info</IonLabel>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
          </IonReactRouter>
        </div>
      </div>

      <IonAlert
        isOpen={showLevelAlert}
        backdropDismiss={false}
        header="Welcome!"
        message="Select your study level"
        inputs={[
          { label: "Level 1", type: "radio", value: 1, checked: true },
          { label: "Level 2", type: "radio", value: 2 },
          { label: "Level 3", type: "radio", value: 3 },
          { label: "Level 4", type: "radio", value: 4 },
        ]}
        buttons={[{
          text: "Get Started",
          handler: async (level) => {
            setUserLevel(level);
            await Preferences.set({ key: LEVEL_KEY, value: level.toString() });
            await requestNotificationPermission();
            setShowLevelAlert(false);
          },
        }]}
      />

      <IonAlert
        isOpen={showUpdateAlert}
        header="Update Available"
        subHeader={`Version ${updateInfo.version}`}
        buttons={[
          { text: "Later", role: "cancel" },
          { text: "Update", handler: () => Browser.open({ url: updateInfo.url }) },
        ]}
      />
    </IonApp>
  );
};

export default App;