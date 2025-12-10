import React from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonIcon,
} from "@ionic/react";
import {
  bulbOutline,
  codeSlashOutline,
  personCircleOutline,
  logoGithub,
  logoLinkedin,
  alertCircleOutline,
  bugOutline,
  mailOutline,
  gitBranchOutline, // Added for Open Source section
} from "ionicons/icons";
import "./Tab3.css";

// --- CONFIGURATION ---
const APP_VERSION = "1.0.0";
const CONTACT_EMAIL = "fahimabdullah528@gmail.com";
const GITHUB_URL = "https://github.com/Mr-AbdullahFahim";
// Ideally, update this to the specific repository URL when created
const REPO_URL = "https://github.com/Mr-AbdullahFahim/DCS-Times.git"; 
const LINKEDIN_URL = "https://www.linkedin.com/in/mr-abdullah/";

const Tab3: React.FC = () => {
  const handleEmailPress = () => {
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=Timetable App Bug Report`;
  };

  const openLink = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border tab3-header-bg">
        <div className="tab3-header-wrapper">
          <div className="tab3-header-container">
            <div className="tab3-header-title">Info</div>
            <div className="tab3-header-subtitle">About & Support</div>
          </div>
        </div>
      </IonHeader>

      <IonContent fullscreen className="tab3-content-bg">
        <div className="tab3-content-wrapper">
          <div className="tab3-scroll-content">
            
            {/* 1. WHY WE BUILT THIS */}
            <div className="info-card">
              <div
                className="icon-container"
                style={{ backgroundColor: "#E3F2FD" }}
              >
                <IonIcon icon={bulbOutline} size="large" style={{ color: "#4A90E2", fontSize: "24px" }} />
              </div>
              <div className="card-title">Why this app?</div>
              <div className="card-text">
                Navigating complex spreadsheets on a mobile screen is difficult. I
                built this app to provide students of the{" "}
                <span style={{ fontWeight: 700 }}>
                  Department of Computer Science
                </span>{" "}
                with a clean, native, and mobile-friendly way to check their
                daily schedules and venue bookings instantly.
              </div>
            </div>

            {/* 2. OPEN SOURCE CONTRIBUTION (NEW SECTION) */}
            <div className="info-card">
              <div
                className="icon-container"
                style={{ backgroundColor: "#E0F2F1" }} // Light Teal bg
              >
                <IonIcon icon={gitBranchOutline} style={{ color: "#009688", fontSize: "24px" }} />
              </div>
              <div className="card-title">We are Open Source!</div>
              <div className="card-text">
                This project is open-source and community-driven. Whether you want to fix a bug, add a new feature, or improve the UI, your contributions are welcome.
                <br/><br/>
                Join us in making this tool better for everyone at UoJ.
              </div>

              <div 
                className="contact-button" 
                onClick={() => openLink(REPO_URL)}
                style={{ backgroundColor: "#009688", marginTop: "16px" }} // Teal button
              >
                <IonIcon icon={logoGithub} style={{ marginRight: "8px", fontSize: "18px", color: "white" }} />
                <span className="button-text" style={{ color: "white" }}>Contribute Now</span>
              </div>
            </div>

            {/* 3. THE DEVELOPER */}
            <div className="info-card">
              <div
                className="icon-container"
                style={{ backgroundColor: "#F3E5F5" }}
              >
                <IonIcon icon={codeSlashOutline} style={{ color: "#AB47BC", fontSize: "24px" }} />
              </div>
              <div className="card-title">The Developer</div>
              <div className="card-text">
                This application was designed and developed by a student from
                the <span style={{ fontWeight: 700 }}>47th Batch</span>,
                dedicated to improving the digital experience at UoJ.
              </div>

              <div className="divider" />

              {/* Developer Details */}
              <div className="dev-container">
                <div className="dev-info">
                  <div className="dev-row">
                    <IonIcon icon={personCircleOutline} style={{ fontSize: "20px", color: "#4A90E2" }} />
                    <span className="dev-name">Mr. M. F. Abdullah</span>
                  </div>
                  <div className="dev-id">2021/CSC/074</div>
                </div>

                {/* Social Links */}
                <div className="social-row">
                  <div
                    onClick={() => openLink(GITHUB_URL)}
                    className="social-button"
                  >
                    <IonIcon icon={logoGithub} style={{ fontSize: "22px", color: "#333" }} />
                  </div>
                  <div
                    onClick={() => openLink(LINKEDIN_URL)}
                    className="social-button"
                  >
                    <IonIcon icon={logoLinkedin} style={{ fontSize: "22px", color: "#0077B5" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DISCLAIMER */}
            <div className="info-card">
              <div
                className="icon-container"
                style={{ backgroundColor: "#FFF3E0" }}
              >
                <IonIcon icon={alertCircleOutline} style={{ color: "#FF9800", fontSize: "24px" }} />
              </div>
              <div className="card-title">Important Notice</div>
              <div className="card-text">
                This app renders schedules by dynamically fetching data directly
                from the University's official timetable spreadsheet.
                <br />
                <br />
                <span style={{ fontWeight: 700, color: "#E65100" }}>
                  Disclaimer:
                </span>{" "}
                The developer is not responsible for missed classes, incorrect
                timings, or errors resulting from changes to the source sheet or
                network failures.
                <br />
                <br />
                If you encounter a data sync failure or a crash, please report
                it below.
              </div>
            </div>

            {/* 5. REPORT BUGS */}
            <div className="info-card">
              <div
                className="icon-container"
                style={{ backgroundColor: "#FFEBEE" }}
              >
                <IonIcon icon={bugOutline} style={{ color: "#EF5350", fontSize: "24px" }} />
              </div>
              <div className="card-title">Found a bug?</div>
              <div className="card-text">
                Noticed a conflict in the timetable or a crash in the app?
                Please let me know so I can fix it immediately.
              </div>

              <div className="contact-button" onClick={handleEmailPress}>
                <IonIcon icon={mailOutline} style={{ marginRight: "8px", fontSize: "18px" }} />
                <span className="button-text">Contact Support</span>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <div className="footer-text">Version {APP_VERSION}</div>
              <div className="footer-text">Made with ❤️ at DCS, UoJ</div>
            </div>

            <div style={{ height: 40 }} />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;