import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// --- CONFIGURATION ---
const APP_VERSION = "1.0.0";
const CONTACT_EMAIL = "fahimabdullah528@gmail.com";
const GITHUB_URL = "https://github.com/Mr-AbdullahFahim"; 
const LINKEDIN_URL = "https://www.linkedin.com/in/mr-abdullah/";

export default function ExploreScreen() {
  
  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Timetable App Bug Report`);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Info</Text>
        <Text style={styles.headerSubtitle}>About & Support</Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          
          {/* 1. WHY WE BUILT THIS */}
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="bulb-outline" size={24} color="#4A90E2" />
            </View>
            <Text style={styles.cardTitle}>Why this app?</Text>
            <Text style={styles.cardText}>
              Navigating complex spreadsheets on a mobile screen is difficult. 
              I built this app to provide students of the <Text style={{fontWeight: '700'}}>Department of Computer Science</Text> with a clean, 
              native, and mobile-friendly way to check their daily schedules and venue bookings instantly.
            </Text>
          </View>

          {/* 2. THE DEVELOPER */}
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#F3E5F5" }]}>
              <Ionicons name="code-slash-outline" size={24} color="#AB47BC" />
            </View>
            <Text style={styles.cardTitle}>The Developer</Text>
            <Text style={styles.cardText}>
              This application was designed and developed by a student from the <Text style={{fontWeight: '700'}}>47th Batch</Text>, 
              dedicated to improving the digital experience at UoJ.
            </Text>
            
            <View style={styles.divider} />
            
            {/* Developer Details */}
            <View style={styles.devContainer}>
              <View style={styles.devInfo}>
                <View style={styles.devRow}>
                  <Ionicons name="person-circle-outline" size={20} color="#4A90E2" />
                  <Text style={styles.devName}>Mr. M. F. Abdullah</Text>
                </View>
                <Text style={styles.devId}>2021/CSC/074</Text>
              </View>

              {/* Social Links */}
              <View style={styles.socialRow}>
                <TouchableOpacity onPress={() => openLink(GITHUB_URL)} style={styles.socialButton}>
                  <Ionicons name="logo-github" size={22} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openLink(LINKEDIN_URL)} style={styles.socialButton}>
                  <Ionicons name="logo-linkedin" size={22} color="#0077B5" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. DISCLAIMER / RELEASE NOTE (NEW) */}
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.cardTitle}>Important Notice</Text>
            <Text style={styles.cardText}>
              This app renders schedules by dynamically fetching data directly from the University's official timetable spreadsheet.
              {"\n\n"}
              <Text style={{fontWeight: '700', color: '#E65100'}}>Disclaimer:</Text> The developer is not responsible for missed classes, incorrect timings, or errors resulting from changes to the source sheet or network failures. 
              {"\n\n"}
              If you encounter a data sync failure or a crash, please report it below.
            </Text>
          </View>

          {/* 4. REPORT BUGS */}
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="bug-outline" size={24} color="#EF5350" />
            </View>
            <Text style={styles.cardTitle}>Found a bug?</Text>
            <Text style={styles.cardText}>
              Noticed a conflict in the timetable or a crash in the app? 
              Please let me know so I can fix it immediately.
            </Text>
            
            <TouchableOpacity 
              style={styles.button}
              activeOpacity={0.8}
              onPress={handleEmailPress}
            >
              <Ionicons name="mail-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Version {APP_VERSION}</Text>
            <Text style={styles.footerText}>Made with ❤️ at DCS, UoJ</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -10,
    paddingTop: 20,
    overflow: "hidden",
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A2138",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8F9BB3",
    marginTop: 2,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  
  // --- CARDS ---
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2138",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#596886",
    lineHeight: 22,
    fontWeight: "400",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginVertical: 16,
  },
  
  // --- TEAM SECTION ---
  devContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  devInfo: {
    flex: 1,
  },
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  devName: {
    marginLeft: 8,
    fontSize: 15,
    color: "#1A2138",
    fontWeight: "600",
  },
  devId: {
    fontSize: 13,
    color: "#8F9BB3",
    fontWeight: "500",
    marginLeft: 28, // Indent to align with name
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  socialButton: {
    padding: 10,
    backgroundColor: "#F7F9FC",
    borderRadius: 50,
    marginLeft: 10,
  },

  // --- BUTTON ---
  button: {
    backgroundColor: "#4A90E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },

  // --- FOOTER ---
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#8F9BB3",
    marginBottom: 4,
  },
});