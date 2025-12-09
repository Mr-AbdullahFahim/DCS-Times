import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { calendar, book, informationCircle } from 'ionicons/icons';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    {/* 1. Added safe-area padding to the top of the app.
         This ensures the status bar doesn't overlap the header.
    */}
    <div style={{ 
      paddingTop: 'var(--ion-safe-area-top)', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#FFFFFF' // Matches your light theme
    }}>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/tab1">
              <Tab1 />
            </Route>
            <Route exact path="/tab2">
              <Tab2 />
            </Route>
            <Route path="/tab3">
              <Tab3 />
            </Route>
            <Route exact path="/">
              <Redirect to="/tab1" />
            </Route>
          </IonRouterOutlet>

          {/* Applied custom styling to match React Native theme */}
          <IonTabBar 
            slot="bottom" 
            style={{
              '--background': '#FFFFFF',
              '--border': 'none',
              '--color-selected': '#4A90E2', // PRIMARY_COLOR
              '--color': '#8F9BB3',          // INACTIVE_COLOR
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)', // Shadow from RN
              
              /* 2. Height calculation includes safe area bottom.
                    Standard tab bar height (50px) + Safe Area.
              */
              height: 'calc(55px + var(--ion-safe-area-bottom))', 
              paddingTop: '6px',
              
              /* 3. Padding bottom respects the home indicator area.
              */
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

export default App;