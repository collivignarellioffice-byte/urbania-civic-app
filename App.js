import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
  useWindowDimensions,
  Share,
  Alert,
  Keyboard,
  Image,
} from "react-native";
import MapView, { Marker, Callout } from "./components/MapView";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Location from "expo-location";

const APP_NAME = "URBANiA";
const LOGO_SOURCE = require("./assets/urbania-logo.jpg");

const CATEGORIES = [
  "Rifiuti",
  "Traffico",
  "Sicurezza",
  "Rumore",
  "Manutenzione",
  "Verde pubblico",
];

const CATEGORY_COLORS = {
  Rifiuti: "#2E7D32",
  Traffico: "#EF6C00",
  Sicurezza: "#C62828",
  Rumore: "#6A1B9A",
  Manutenzione: "#1565C0",
  "Verde pubblico": "#558B2F",
};

const LIKERT_COLORS = {
  1: "#22C55E",
  2: "#84CC16",
  3: "#FACC15",
  4: "#F97316",
  5: "#DC2626",
};

const CITY_COORDS = {
  Milano: { latitude: 45.4642, longitude: 9.19 },
  Roma: { latitude: 41.9028, longitude: 12.4964 },
  Napoli: { latitude: 40.8518, longitude: 14.2681 },
  Torino: { latitude: 45.0703, longitude: 7.6869 },
  Bologna: { latitude: 44.4949, longitude: 11.3426 },
  Firenze: { latitude: 43.7696, longitude: 11.2558 },
  Palermo: { latitude: 38.1157, longitude: 13.3615 },
  Genova: { latitude: 44.4056, longitude: 8.9463 },
  Bari: { latitude: 41.1171, longitude: 16.8719 },
  Venezia: { latitude: 45.4408, longitude: 12.3155 },
  Cagliari: { latitude: 39.2238, longitude: 9.1217 },
};

const AREAS = {
  Milano: [
    "Sempione",
    "Porta Romana",
    "Navigli",
    "Bicocca",
    "Centrale",
    "Isola",
    "Lambrate",
    "CityLife",
  ],
  Roma: ["Trastevere", "San Lorenzo", "Prati", "Ostiense"],
  Napoli: ["Vomero", "Chiaia", "Centro storico", "Fuorigrotta"],
  Torino: ["San Salvario", "Crocetta", "Aurora", "Lingotto"],
  Bologna: ["Bolognina", "Centro", "San Donato", "Saragozza"],
  Firenze: ["Santa Croce", "Oltrarno", "Novoli", "Campo di Marte"],
  Palermo: ["Kalsa", "Politeama", "Mondello", "Ballarò"],
  Genova: ["Centro storico", "Sampierdarena", "Albaro", "Marassi"],
  Bari: ["Murat", "Madonnella", "San Paolo", "Poggiofranco"],
  Venezia: ["Cannaregio", "Dorsoduro", "Castello", "Mestre"],
  Cagliari: ["Castello", "Marina", "Poetto", "Pirri"],
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchesPlace(issue, query) {
  const q = normalizeText(query);
  if (!q) return true;

  return [issue.city, issue.area, issue.title, issue.description]
    .map(normalizeText)
    .some((field) => field.includes(q));
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function average(values) {
  if (!values || values.length === 0) return 1;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function titleFor(category, area) {
  const titles = {
    Rifiuti: `Rifiuti abbandonati in zona ${area}`,
    Traffico: `Congestione ricorrente in zona ${area}`,
    Sicurezza: `Segnalazioni di sicurezza in zona ${area}`,
    Rumore: `Rumore persistente in zona ${area}`,
    Manutenzione: `Manutenzione stradale necessaria in zona ${area}`,
    "Verde pubblico": `Degrado del verde pubblico in zona ${area}`,
  };

  return titles[category];
}

function descriptionFor(category, area) {
  const descriptions = {
    Rifiuti: `Presenza ricorrente di rifiuti abbandonati e cestini pieni nell’area di ${area}.`,
    Traffico: `Code frequenti e rallentamenti nelle fasce di maggiore passaggio in zona ${area}.`,
    Sicurezza: `Diversi cittadini hanno indicato una percezione di insicurezza nella zona di ${area}.`,
    Rumore: `Rumore ripetuto nelle ore serali e notturne segnalato da più residenti in zona ${area}.`,
    Manutenzione: `Marciapiedi, pavimentazione o arredi urbani risultano danneggiati in zona ${area}.`,
    "Verde pubblico": `Aree verdi poco curate, con necessità di pulizia e manutenzione in zona ${area}.`,
  };

  return descriptions[category];
}

function createInitialIssues() {
  const data = [];
  let id = 1;

  Object.keys(CITY_COORDS).forEach((city) => {
    const base = CITY_COORDS[city];
    const areas = AREAS[city];
    const total = city === "Milano" ? 8 : 4;

    for (let i = 0; i < total; i++) {
      const category = CATEGORIES[(i + city.length) % CATEGORIES.length];
      const area = areas[i % areas.length];
      const latOffset = (i % 4) * 0.006 - 0.009;
      const lngOffset = Math.floor(i / 2) * 0.006 - 0.006;
      const reports = 3 + ((i + city.length) % 12);
      const scores = [
        2 + ((i + 1) % 4),
        3 + (i % 3),
        2 + ((i + 2) % 4),
      ].map((v) => Math.min(v, 5));

      data.push({
        id: String(id++),
        city,
        area,
        latitude: base.latitude + latOffset,
        longitude: base.longitude + lngOffset,
        category,
        title: titleFor(category, area),
        description: descriptionFor(category, area),
        status: i % 7 === 0 ? "Risolto" : "In corso",
        numberOfReports: reports,
        confirmations: reports + ((i * 2) % 5),
        urgencyScores: scores,
        averagePriority: average(scores),
        createdAt: daysAgo(2 + i * 3),
        hasPhoto: i % 3 === 0,
        isUserReport: city === "Milano" && (i === 1 || i === 3),
      });
    }
  });

  return data;
}

async function searchPlaces(query) {
  const clean = query.trim();

  if (clean.length < 3) return [];

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&limit=6&countrycodes=it&addressdetails=1&q=${encodeURIComponent(clean)}`;

    const response = await fetch(url);
    const json = await response.json();

    return json
      .filter((item) => item.lat && item.lon)
      .map((item) => ({
        id: item.place_id?.toString() || `${item.lat}-${item.lon}`,
        displayName: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        address: item.address || {},
      }));
  } catch (error) {
    console.log("Errore geocoding:", error);
    return [];
  }
}

function extractCityFromPlace(place) {
  const address = place?.address || {};

  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.province ||
    place?.displayName?.split(",")?.[0] ||
    "Luogo selezionato"
  );
}

function extractAreaFromPlace(place) {
  const address = place?.address || {};

  return (
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.road ||
    address.pedestrian ||
    address.square ||
    address.city ||
    address.town ||
    address.village ||
    place?.displayName?.split(",")?.[0] ||
    "Area selezionata"
  );
}

function getIssueScore(issue, maxReports) {
  const avg = issue.averagePriority || average(issue.urgencyScores);
  const normalizedReports = maxReports ? issue.numberOfReports / maxReports : 0;
  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(issue.createdAt).getTime()) / 86400000)
  );
  const persistenceScore = Math.min(days / 30, 1);
  const recencyScore = Math.max(0, 1 - days / 30);

  let score =
    avg * 0.45 +
    normalizedReports * 5 * 0.3 +
    persistenceScore * 5 * 0.15 +
    recencyScore * 5 * 0.1;

  if (issue.status === "Risolto") score *= 0.25;

  return Number(score.toFixed(2));
}

function explainPriority(issue) {
  if (issue.status === "Risolto") {
    return "La segnalazione ha priorità ridotta perché risulta risolta, pur restando visibile nello storico civico.";
  }

  if (issue.averagePriority >= 4 && issue.numberOfReports >= 8) {
    return "Questa segnalazione è prioritaria perché combina alta urgenza media e numerose conferme dei cittadini.";
  }

  if (issue.averagePriority >= 4) {
    return "Questa segnalazione resta rilevante perché l’urgenza percepita dai cittadini è elevata.";
  }

  return "Questa segnalazione è monitorata in base a urgenza, numero di segnalazioni, persistenza e stato.";
}

function buildReportText(location, report) {
  return `Report civico — ${location}

Sintesi della situazione:
${report.summary}

Problemi principali:
${report.mainProblems}

Zone più colpite:
${report.areas}

Proposte operative:
${report.suggestions}

Nota:
Le indicazioni generate automaticamente hanno funzione di supporto analitico e non sostituiscono le decisioni dell’amministrazione comunale.`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function App() {
  const mapRef = useRef(null);
  const notificationPopupShown = useRef(false);
  const windowSize = useWindowDimensions();
  const showPhoneFrame = Platform.OS === "web" && windowSize.width > 640;

  const [activeTab, setActiveTab] = useState("Mappa");
  const [issues, setIssues] = useState(createInitialIssues());
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [currentPlaceLabel, setCurrentPlaceLabel] = useState("Milano");
  const [userCity, setUserCity] = useState("Milano");
  const [notificationsActive, setNotificationsActive] = useState(false);
  const [language, setLanguage] = useState("Italiano");

  const [mapRegion, setMapRegion] = useState({
    latitude: CITY_COORDS.Milano.latitude,
    longitude: CITY_COORDS.Milano.longitude,
    latitudeDelta: 0.07,
    longitudeDelta: 0.07,
  });

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (notificationPopupShown.current) return;

    notificationPopupShown.current = true;

    setTimeout(() => {
      Alert.alert(
        "Notifiche Urbania",
        "Vuoi ricevere notifiche quando le tue segnalazioni vengono confermate o risolte?",
        [
          {
            text: "Non ora",
            style: "cancel",
            onPress: () => setNotificationsActive(false),
          },
          {
            text: "Accetta",
            onPress: () => setNotificationsActive(true),
          },
        ]
      );
    }, 600);
  }, []);

  useEffect(() => {
    async function detectUserCity() {
      if (Platform.OS === "web") {
        setUserCity("Milano");
        return;
      }

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          setUserCity("Milano");
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const reverse = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        const first = reverse?.[0];
        const detectedCity =
          first?.city ||
          first?.district ||
          first?.subregion ||
          first?.region ||
          "Milano";

        setUserCity(detectedCity);
      } catch (error) {
        console.log("Errore geolocalizzazione:", error);
        setUserCity("Milano");
      }
    }

    detectUserCity();
  }, []);

  const moveMapToPlace = (place) => {
    Keyboard.dismiss();

    const region = {
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };

    setCurrentPlaceLabel(extractCityFromPlace(place));
    setActiveTab("Mappa");
    setMapRegion(region);
    setTimeout(() => mapRef.current?.animateToRegion(region, 600), 150);
  };

  const openDetail = (issue) => {
    setSelectedIssue(issue);
    setDetailOpen(true);
  };

  const focusIssue = (issue) => {
    Keyboard.dismiss();
    setActiveTab("Mappa");
    setSelectedIssue(issue);
    setDetailOpen(true);

    const region = {
      latitude: issue.latitude,
      longitude: issue.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };

    setMapRegion(region);
    setTimeout(() => mapRef.current?.animateToRegion(region, 500), 150);
  };

  const confirmIssueUpdate = (issueId, statusChoice, urgencyValue) => {
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const updatedScores =
          typeof urgencyValue === "number"
            ? [...issue.urgencyScores, urgencyValue]
            : issue.urgencyScores;

        const updated = {
          ...issue,
          status:
            statusChoice === "In corso"
              ? "In corso"
              : statusChoice === "Risolto"
              ? "Risolto"
              : issue.status,
          urgencyScores: updatedScores,
          averagePriority: average(updatedScores),
          confirmations:
            statusChoice === "In corso" || statusChoice === "Risolto"
              ? issue.confirmations + 1
              : issue.confirmations,
        };

        setSelectedIssue(updated);
        return updated;
      })
    );
  };

  const addNewIssue = (issue) => {
    Keyboard.dismiss();
    setIssues((prev) => [...prev, issue]);
    setActiveTab("Mappa");
    setSelectedIssue(issue);
    setDetailOpen(false);
    setCurrentPlaceLabel(issue.city);

    const region = {
      latitude: issue.latitude,
      longitude: issue.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };

    setMapRegion(region);
    setTimeout(() => mapRef.current?.animateToRegion(region, 500), 200);
  };

  return (
    <View style={[styles.demoStage, showPhoneFrame && styles.demoStageDesktop]}>
    <SafeAreaView
      style={[
        styles.app,
        showPhoneFrame && styles.webPhone,
        showPhoneFrame && { height: Math.min(windowSize.height - 32, 900) },
      ]}
    >
      <Header
        activeTab={activeTab}
        currentPlaceLabel={currentPlaceLabel}
        moveMapToPlace={moveMapToPlace}
        openProfile={() => setActiveTab("Profilo")}
      />

      <View style={styles.content}>
        {activeTab === "Mappa" && (
          <MapScreen
            mapRef={mapRef}
            mapRegion={mapRegion}
            setMapRegion={setMapRegion}
            issues={issues}
            selectedIssue={selectedIssue}
            setSelectedIssue={setSelectedIssue}
            detailOpen={detailOpen}
            setDetailOpen={setDetailOpen}
            openDetail={openDetail}
            confirmIssueUpdate={confirmIssueUpdate}
          />
        )}

        {activeTab === "Segnala" && (
          <ReportScreen issues={issues} mapRegion={mapRegion} addNewIssue={addNewIssue} />
        )}

        {activeTab === "Priorità" && (
          <PriorityScreen issues={issues} focusIssue={focusIssue} />
        )}

        {activeTab === "Report" && (
          <CivicReportScreen issues={issues} userCity={userCity} />
        )}

        {activeTab === "Profilo" && (
          <ProfileSettingsScreen
            issues={issues}
            notificationsActive={notificationsActive}
            setNotificationsActive={setNotificationsActive}
            language={language}
            setLanguage={setLanguage}
            closeProfile={() => setActiveTab("Mappa")}
          />
        )}
      </View>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </SafeAreaView>
    </View>
  );
}

function AppLogo() {
  return (
    <Image
      source={LOGO_SOURCE}
      style={styles.logoImage}
      resizeMode="contain"
    />
  );
}

function Header({ activeTab, currentPlaceLabel, moveMapToPlace, openProfile }) {
  return (
    <View style={[styles.header, activeTab !== "Mappa" && styles.headerCompact]}>
      <View style={styles.headerTopRow}>
        <View style={styles.brandRow}>
          <AppLogo />

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{APP_NAME}</Text>
            <Text style={styles.headerSubtitle}>Mappa civica delle priorità urbane</Text>
          </View>
        </View>

        {activeTab === "Mappa" && (
          <Pressable style={styles.userIconButton} onPress={openProfile}>
            <Text style={styles.userIconText}>👤</Text>
          </Pressable>
        )}
      </View>

      {activeTab === "Mappa" && (
        <View style={styles.headerSearchWrapper}>
          <PlaceSearchBox
            placeholder="Cerca città, indirizzo o luogo"
            onSelectPlace={moveMapToPlace}
            compact
          />
          <Text style={styles.currentPlaceText}>Area visualizzata: {currentPlaceLabel}</Text>
        </View>
      )}
    </View>
  );
}

function PlaceSearchBox({ placeholder, onSelectPlace, compact = false }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!showSuggestions || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const results = await searchPlaces(query);

      if (active) {
        setSuggestions(results);
        setLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, showSuggestions]);

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(false);
    Keyboard.dismiss();
  };

  const selectPlace = (place) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(false);
    setQuery(place.displayName);
    Keyboard.dismiss();
    onSelectPlace(place);
  };

  const submitSearch = async () => {
    setShowSuggestions(false);
    setLoading(false);
    Keyboard.dismiss();

    if (suggestions.length > 0) {
      selectPlace(suggestions[0]);
      return;
    }

    const results = await searchPlaces(query);

    setSuggestions([]);

    if (results.length > 0) {
      selectPlace(results[0]);
    }
  };

  return (
    <View style={styles.placeSearchContainer}>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          style={[styles.searchInput, compact && styles.searchInputCompact]}
          onSubmitEditing={submitSearch}
        />

        {query.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearButtonText}>×</Text>
          </Pressable>
        )}

        <Pressable style={styles.searchButton} onPress={submitSearch}>
          <Text style={styles.searchButtonText}>Cerca</Text>
        </Pressable>
      </View>

      {showSuggestions && query.trim().length >= 3 && (
        <View style={styles.suggestionBox}>
          {loading && <Text style={styles.suggestionText}>Ricerca in corso...</Text>}

          {!loading &&
            suggestions.map((item) => (
              <Pressable
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => selectPlace(item)}
              >
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {extractAreaFromPlace(item)}
                </Text>
                <Text style={styles.suggestionTextSmall} numberOfLines={2}>
                  {item.displayName}
                </Text>
              </Pressable>
            ))}

          {!loading && suggestions.length === 0 && (
            <Text style={styles.suggestionText}>Nessun risultato trovato</Text>
          )}
        </View>
      )}
    </View>
  );
}

function LocalSearchBox({ value, onChangeText, onSubmit, onClear, placeholder }) {
  const clear = () => {
    if (onClear) onClear();
    else onChangeText("");
    Keyboard.dismiss();
  };

  const submit = () => {
    Keyboard.dismiss();
    onSubmit();
  };

  return (
    <View style={styles.localSearchBox}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.localSearchInput}
        onSubmitEditing={submit}
      />

      {value.length > 0 && (
        <Pressable style={styles.localClearButton} onPress={clear}>
          <Text style={styles.localClearButtonText}>×</Text>
        </Pressable>
      )}

      <Pressable style={styles.localSearchButton} onPress={submit}>
        <Text style={styles.localSearchButtonText}>Cerca</Text>
      </Pressable>
    </View>
  );
}

function MapScreen({
  mapRef,
  mapRegion,
  setMapRegion,
  issues,
  selectedIssue,
  setSelectedIssue,
  detailOpen,
  setDetailOpen,
  openDetail,
  confirmIssueUpdate,
}) {
  return (
    <View style={styles.mapScreen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={false}
      >
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            coordinate={{
              latitude: issue.latitude,
              longitude: issue.longitude,
            }}
            onPress={() => setSelectedIssue(issue)}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: CATEGORY_COLORS[issue.category] || "#333" },
                selectedIssue?.id === issue.id && styles.markerSelected,
                issue.status === "Risolto" && styles.markerResolved,
              ]}
            >
              <View style={styles.markerDot} />
            </View>

            <Callout tooltip onPress={() => openDetail(issue)}>
              <View style={styles.callout}>
                <View style={styles.calloutTop}>
                  <Text style={styles.calloutCategory}>{issue.category}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      issue.status === "Risolto"
                        ? styles.statusResolved
                        : styles.statusOngoing,
                    ]}
                  >
                    {issue.status}
                  </Text>
                </View>

                <Text style={styles.calloutTitle}>{issue.title}</Text>
                <Text style={styles.calloutArea}>
                  {issue.area}, {issue.city}
                </Text>

                <View style={styles.calloutMetrics}>
                  <Text style={styles.metricText}>
                    {issue.numberOfReports} segnalazioni
                  </Text>
                  <Text style={styles.metricText}>
                    Priorità {issue.averagePriority.toFixed(1)}/5
                  </Text>
                </View>

                <View style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Vedi dettaglio</Text>
                </View>

                <View style={styles.calloutPointer} />
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {detailOpen && selectedIssue && (
        <IssueBottomSheet
          issue={selectedIssue}
          close={() => setDetailOpen(false)}
          confirmIssueUpdate={confirmIssueUpdate}
        />
      )}
    </View>
  );
}

function IssueBottomSheet({ issue, close, confirmIssueUpdate }) {
  const [tempStatus, setTempStatus] = useState(null);
  const [selectedUrgency, setSelectedUrgency] = useState(null);

  const toggleStatus = (status) => {
    setTempStatus((prev) => (prev === status ? null : status));

    if (status === "Risolto") {
      setSelectedUrgency(null);
    }
  };

  const confirm = () => {
    Keyboard.dismiss();
    confirmIssueUpdate(issue.id, tempStatus, selectedUrgency);
    close();
  };

  const urgencyEnabled = tempStatus !== "Risolto";

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />

      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetCategory}>{issue.category}</Text>
          <Text style={styles.sheetTitle}>{issue.title}</Text>
          <Text style={styles.sheetPlace}>
            {issue.area}, {issue.city}
          </Text>
        </View>

        <Pressable onPress={close} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.sheetDescription}>{issue.description}</Text>

      {issue.hasPhoto && (
        <View style={styles.photoBox}>
          <Text style={styles.photoText}>Foto allegata alla segnalazione</Text>
        </View>
      )}

      <View style={styles.infoRow}>
        <InfoCard label="Segnalazioni" value={issue.numberOfReports} />
        <InfoCard label="Priorità media" value={`${issue.averagePriority.toFixed(1)}/5`} />
        <InfoCard label="Stato attuale" value={issue.status} />
      </View>

      <Text style={styles.sectionLabel}>Conferma lo stato della segnalazione</Text>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => toggleStatus("In corso")}
          style={[
            styles.toggleButton,
            tempStatus === "In corso" && styles.toggleSelectedYellow,
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              tempStatus === "In corso" && styles.toggleTextDark,
            ]}
          >
            Ancora in corso
          </Text>
        </Pressable>

        <Pressable
          onPress={() => toggleStatus("Risolto")}
          style={[
            styles.toggleButton,
            tempStatus === "Risolto" && styles.toggleSelectedBlue,
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              tempStatus === "Risolto" && styles.toggleTextSelected,
            ]}
          >
            Risolto
          </Text>
        </Pressable>
      </View>

      {urgencyEnabled && (
        <>
          <Text style={styles.sectionLabel}>Quanto è urgente intervenire?</Text>

          <View style={styles.likertRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => setSelectedUrgency(value)}
                style={[
                  styles.likertCircle,
                  selectedUrgency === value && {
                    backgroundColor: LIKERT_COLORS[value],
                    borderColor: LIKERT_COLORS[value],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.likertText,
                    selectedUrgency === value && {
                      color: value === 3 ? "#111827" : "#FFFFFF",
                    },
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.likertLegend}>
            1 Molto bassa · 2 Bassa · 3 Media · 4 Alta · 5 Molto alta
          </Text>
        </>
      )}

      {tempStatus === "Risolto" && (
        <Text style={styles.resolvedNote}>
          La segnalazione indicata come risolta non richiede un nuovo voto di urgenza.
        </Text>
      )}

      <Pressable style={styles.confirmButton} onPress={confirm}>
        <Text style={styles.confirmButtonText}>Conferma</Text>
      </Pressable>
    </View>
  );
}

function ReportScreen({ issues, mapRegion, addNewIssue }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Rifiuti");
  const [urgency, setUrgency] = useState(3);
  const [photoAdded, setPhotoAdded] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [coord, setCoord] = useState({
    latitude: mapRegion.latitude,
    longitude: mapRegion.longitude,
  });

  const city = selectedPlace ? extractCityFromPlace(selectedPlace) : "Luogo selezionato";
  const area = selectedPlace
    ? extractAreaFromPlace(selectedPlace)
    : locationLabel || "Area selezionata";

  const similar = useMemo(() => {
    return issues.filter((issue) => {
      const sameCategory = issue.category === category;
      const sameCity =
        selectedPlace && normalizeText(issue.city).includes(normalizeText(city));
      const similarArea =
        area.length > 2 && normalizeText(issue.area).includes(normalizeText(area));

      return sameCategory && (sameCity || similarArea);
    });
  }, [issues, category, selectedPlace, city, area]);

  const selectPlaceForReport = (place) => {
    setSelectedPlace(place);
    setLocationLabel(place.displayName);
    setCoord({
      latitude: place.latitude,
      longitude: place.longitude,
    });
    Keyboard.dismiss();
  };

  const submit = () => {
    Keyboard.dismiss();

    if (!title.trim()) {
      Alert.alert("Titolo mancante", "Inserisci un titolo per la segnalazione.");
      return;
    }

    if (!locationLabel && !selectedPlace) {
      Alert.alert(
        "Posizione mancante",
        "Cerca un indirizzo o seleziona una posizione sulla mappa."
      );
      return;
    }

    const newIssue = {
      id: String(Date.now()),
      city,
      area,
      latitude: coord.latitude,
      longitude: coord.longitude,
      category,
      title: title.trim(),
      description:
        description.trim() || "Segnalazione sintetica inserita dal cittadino.",
      status: "In corso",
      numberOfReports: 1,
      confirmations: 0,
      urgencyScores: [urgency],
      averagePriority: urgency,
      createdAt: new Date().toISOString(),
      hasPhoto: photoAdded,
      isUserReport: true,
    };

    addNewIssue(newIssue);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Text style={styles.pageTitle}>Nuova segnalazione</Text>
      <Text style={styles.pageSubtitle}>
        La tua segnalazione contribuisce alla mappa collettiva delle priorità urbane.
      </Text>

      <Text style={styles.inputLabel}>Titolo segnalazione</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Es. Rifiuti abbandonati vicino al parco"
        style={styles.input}
      />

      <Text style={styles.inputLabel}>Descrizione breve</Text>
      <TextInput
        value={description}
        onChangeText={(v) => setDescription(v.slice(0, 250))}
        placeholder="Descrivi brevemente il problema"
        style={[styles.input, styles.textArea]}
        multiline
      />
      <Text style={styles.counter}>{description.length}/250</Text>

      <Text style={styles.inputLabel}>Categoria</Text>
      <View style={styles.chipWrap}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            style={[
              styles.chip,
              category === item && {
                backgroundColor: CATEGORY_COLORS[item],
                borderColor: CATEGORY_COLORS[item],
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                category === item && styles.chipTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.inputLabel}>Posizione della segnalazione</Text>
      <Text style={styles.helperText}>
        Cerca un indirizzo, una via, una piazza o un luogo in Italia. Puoi poi correggere il punto trascinando la puntina sulla mappa.
      </Text>

      <PlaceSearchBox
        placeholder="Cerca indirizzo o luogo"
        onSelectPlace={selectPlaceForReport}
      />

      <Text style={styles.locationSelectedText}>
        Posizione selezionata: {locationLabel || "nessuna posizione selezionata"}
      </Text>

      <View style={styles.formMapContainer}>
        <MapView
          style={styles.formMap}
          region={{
            latitude: coord.latitude,
            longitude: coord.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
        >
          <Marker
            draggable
            coordinate={coord}
            onDragEnd={(e) => {
              const next = e.nativeEvent.coordinate;
              setCoord(next);

              if (!locationLabel) {
                setLocationLabel(
                  `Posizione manuale (${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)})`
                );
              }

              Keyboard.dismiss();
            }}
          />
        </MapView>
      </View>

      <Text style={styles.inputLabel}>Livello di urgenza</Text>

      <View style={styles.likertRowForm}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => setUrgency(value)}
            style={[
              styles.likertCircle,
              urgency === value && {
                backgroundColor: LIKERT_COLORS[value],
                borderColor: LIKERT_COLORS[value],
              },
            ]}
          >
            <Text
              style={[
                styles.likertText,
                urgency === value && {
                  color: value === 3 ? "#111827" : "#FFFFFF",
                },
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.likertLegend}>
        1 Molto bassa · 2 Bassa · 3 Media · 4 Alta · 5 Molto alta
      </Text>

      <Text style={styles.inputLabel}>Eventuale foto</Text>

      <Pressable style={styles.photoUpload} onPress={() => setPhotoAdded(!photoAdded)}>
        <Text style={styles.photoUploadText}>
          {photoAdded ? "Foto aggiunta (demo)" : "Aggiungi foto (opzionale)"}
        </Text>
      </Pressable>

      {similar.length > 0 && (
        <View style={styles.similarBox}>
          <Text style={styles.similarTitle}>Segnalazioni simili già presenti</Text>

          {similar.slice(0, 3).map((issue) => (
            <View key={issue.id} style={styles.similarItem}>
              <Text style={styles.similarItemTitle}>{issue.title}</Text>
              <Text style={styles.similarItemText}>
                {issue.area} · priorità {issue.averagePriority.toFixed(1)}/5
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.submitButton} onPress={submit}>
        <Text style={styles.submitButtonText}>Invia segnalazione</Text>
      </Pressable>
    </ScrollView>
  );
}

function PriorityScreen({ issues, focusIssue }) {
  const [placeInput, setPlaceInput] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tutte le categorie");

  const maxReports = Math.max(...issues.map((i) => i.numberOfReports), 1);

  const sortedIssues = useMemo(() => {
    return issues
      .filter((issue) => !placeQuery || matchesPlace(issue, placeQuery))
      .filter(
        (issue) =>
          categoryFilter === "Tutte le categorie" ||
          issue.category === categoryFilter
      )
      .map((issue) => ({
        ...issue,
        priorityScore: getIssueScore(issue, maxReports),
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [issues, placeQuery, categoryFilter, maxReports]);

  const applySearch = () => {
    Keyboard.dismiss();
    setPlaceQuery(placeInput.trim());
  };

  const clearPrioritySearch = () => {
    setPlaceInput("");
    setPlaceQuery("");
    Keyboard.dismiss();
  };

  const selectedCategoryColor =
    categoryFilter !== "Tutte le categorie" ? CATEGORY_COLORS[categoryFilter] : null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Text style={styles.pageTitle}>Priorità urbane</Text>
      <Text style={styles.pageSubtitle}>
        Elenco ordinato per urgenza, rilevanza, persistenza e numero di segnalazioni.
      </Text>

      <Text style={styles.inputLabel}>Cerca luogo</Text>
      <LocalSearchBox
        value={placeInput}
        onChangeText={setPlaceInput}
        onSubmit={applySearch}
        onClear={clearPrioritySearch}
        placeholder="Scrivi città, quartiere o zona"
      />

      <Text style={styles.inputLabel}>Filtra per tipologia</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {["Tutte le categorie", ...CATEGORIES].map((item) => {
          const isSelected = categoryFilter === item;
          const color =
            item === "Tutte le categorie" ? "#111827" : CATEGORY_COLORS[item];

          return (
            <Pressable
              key={item}
              onPress={() => setCategoryFilter(item)}
              style={[
                styles.cityChip,
                isSelected && {
                  backgroundColor: color,
                  borderColor: color,
                },
              ]}
            >
              <Text
                style={[
                  styles.cityChipText,
                  isSelected && {
                    color: item === "Tutte le categorie" ? "#FFFFFF" : "#FFFFFF",
                  },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {sortedIssues.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessuna segnalazione disponibile per questo luogo.</Text>
          <Text style={styles.emptyText}>
            Prova a cercare un’altra zona oppure crea una nuova segnalazione.
          </Text>
        </View>
      )}

      {sortedIssues.map((issue, index) => (
        <View key={issue.id} style={styles.priorityCard}>
          <View style={styles.priorityHeader}>
            <Text style={styles.priorityRank}>#{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.priorityTitle}>{issue.title}</Text>
              <Text style={styles.priorityMeta}>
                {issue.city} · {issue.area} · {issue.category}
              </Text>
            </View>

            <Text
              style={[
                styles.statusBadge,
                issue.status === "Risolto"
                  ? styles.statusResolved
                  : styles.statusOngoing,
              ]}
            >
              {issue.status}
            </Text>
          </View>

          <View style={styles.priorityStats}>
            <InfoCard label="Score" value={issue.priorityScore} />
            <InfoCard label="Priorità" value={`${issue.averagePriority.toFixed(1)}/5`} />
            <InfoCard label="Report" value={issue.numberOfReports} />
          </View>

          <Text style={styles.priorityExplanation}>{explainPriority(issue)}</Text>

          <Pressable style={styles.secondaryButton} onPress={() => focusIssue(issue)}>
            <Text style={styles.secondaryButtonText}>Vedi dettaglio</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function CivicReportScreen({ issues, userCity }) {
  const [searchInput, setSearchInput] = useState("");
  const [reportLocation, setReportLocation] = useState(userCity || "Milano");

  useEffect(() => {
    setReportLocation((prev) => {
      if (!prev || prev === "Milano") return userCity || "Milano";
      return prev;
    });
  }, [userCity]);

  const applySearch = () => {
    Keyboard.dismiss();
    const value = searchInput.trim();
    setReportLocation(value || userCity || "Milano");
  };

  const clearReportSearch = () => {
    setSearchInput("");
    setReportLocation(userCity || "Milano");
    Keyboard.dismiss();
  };

  const cityIssues = useMemo(() => {
    return issues.filter((issue) => matchesPlace(issue, reportLocation));
  }, [issues, reportLocation]);

  const report = useMemo(
    () => generateCityReport(reportLocation, cityIssues),
    [reportLocation, cityIssues]
  );

  const reportText = useMemo(
    () => buildReportText(reportLocation, report),
    [reportLocation, report]
  );

  const shareReport = async () => {
    Keyboard.dismiss();

    try {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: `Report civico — ${reportLocation}`,
            text: reportText,
          });
        } else if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(reportText);
          Alert.alert("Report copiato", "Il report è stato copiato negli appunti.");
        }
        return;
      }

      await Share.share({
        title: `Report civico — ${reportLocation}`,
        message: reportText,
      });
    } catch (error) {
      Alert.alert("Errore", "Non è stato possibile condividere il report.");
    }
  };

  const downloadPdf = async () => {
    Keyboard.dismiss();

    try {
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 32px;
                color: #111827;
                line-height: 1.5;
              }
              h1 {
                font-size: 26px;
                margin-bottom: 4px;
              }
              h2 {
                font-size: 18px;
                margin-top: 24px;
                margin-bottom: 8px;
              }
              p {
                font-size: 14px;
              }
              .disclaimer {
                margin-top: 28px;
                padding: 14px;
                background: #EFF6FF;
                color: #1E3A8A;
                border-radius: 10px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1>Report civico — ${escapeHtml(reportLocation)}</h1>
            <p><strong>${APP_NAME}</strong> · Report generato da dati civici strutturati.</p>

            <h2>Sintesi della situazione</h2>
            <p>${escapeHtml(report.summary)}</p>

            <h2>Problemi principali</h2>
            <p>${escapeHtml(report.mainProblems)}</p>

            <h2>Zone più colpite</h2>
            <p>${escapeHtml(report.areas)}</p>

            <h2>Proposte operative</h2>
            <p>${escapeHtml(report.suggestions)}</p>

            <p class="disclaimer">
              Le indicazioni generate automaticamente hanno funzione di supporto analitico e non sostituiscono le decisioni dell’amministrazione comunale.
            </p>
          </body>
        </html>
      `;

      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
          Alert.alert(
            "Popup bloccato",
            "Consenti l’apertura della finestra per salvare il report come PDF."
          );
          return;
        }

        printWindow.opener = null;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
        return;
      }

      const file = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Scarica report civico — ${reportLocation}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF generato", file.uri);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Errore", "Non è stato possibile generare il PDF.");
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Text style={styles.pageTitle}>Report civici</Text>
      <Text style={styles.pageSubtitle}>
        Report generati a partire dalle segnalazioni strutturate della città o area selezionata.
      </Text>

      <Text style={styles.inputLabel}>Cerca report per città o luogo</Text>

      <LocalSearchBox
        value={searchInput}
        onChangeText={setSearchInput}
        onSubmit={applySearch}
        onClear={clearReportSearch}
        placeholder={`Default: ${userCity || "Milano"}`}
      />

      <Text style={styles.currentReportText}>Report visualizzato: {reportLocation}</Text>

      {cityIssues.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessuna segnalazione disponibile per questa area.</Text>
          <Text style={styles.emptyText}>
            Il report resta disponibile come struttura dimostrativa, ma non contiene ancora dati locali sufficienti.
          </Text>
        </View>
      )}

      <View style={styles.reportBox}>
        <Text style={styles.reportTitle}>Report mensile — {reportLocation}</Text>

        <Text style={styles.reportSectionTitle}>Sintesi della situazione</Text>
        <Text style={styles.reportParagraph}>{report.summary}</Text>

        <Text style={styles.reportSectionTitle}>Problemi principali</Text>
        <Text style={styles.reportParagraph}>{report.mainProblems}</Text>

        <Text style={styles.reportSectionTitle}>Zone più colpite</Text>
        <Text style={styles.reportParagraph}>{report.areas}</Text>

        <Text style={styles.reportSectionTitle}>Proposte operative</Text>
        <Text style={styles.reportParagraph}>{report.suggestions}</Text>

        <Text style={styles.aiDisclaimer}>
          Le indicazioni generate automaticamente hanno funzione di supporto analitico e non sostituiscono le decisioni dell’amministrazione comunale.
        </Text>

        <View style={styles.reportButtons}>
          <Pressable style={styles.secondaryButton} onPress={shareReport}>
            <Text style={styles.secondaryButtonText}>Condividi report</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={downloadPdf}>
            <Text style={styles.secondaryButtonText}>Scarica PDF</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function generateCityReport(location, cityIssues) {
  if (!cityIssues.length) {
    return {
      summary: `Per ${location} non sono ancora presenti abbastanza segnalazioni per produrre una lettura robusta delle priorità urbane.`,
      mainProblems: "Non risultano categorie prevalenti per l’area cercata.",
      areas: "Non risultano aree critiche consolidate.",
      suggestions:
        "È consigliabile aumentare la raccolta strutturata delle segnalazioni prima di pianificare interventi operativi.",
    };
  }

  const active = cityIssues.filter((i) => i.status === "In corso");
  const sorted = [...cityIssues].sort((a, b) => b.averagePriority - a.averagePriority);
  const top = sorted.slice(0, 3);
  const categories = [...new Set(top.map((i) => i.category))];
  const areas = [...new Set(top.map((i) => i.area))];

  const suggestionByCategory = {
    Rifiuti:
      "incrementare la frequenza di raccolta, verificare i punti di accumulo e ottimizzare i percorsi nelle aree più segnalate",
    Traffico:
      "monitorare le fasce orarie critiche, valutare interventi di regolazione della viabilità e migliorare la gestione degli attraversamenti",
    Sicurezza:
      "rafforzare il monitoraggio territoriale, migliorare illuminazione e presidio informativo nelle zone ricorrenti",
    Rumore:
      "programmare controlli mirati nelle fasce serali e verificare la ripetitività delle fonti di disturbo",
    Manutenzione:
      "pianificare ispezioni tecniche per marciapiedi, pavimentazioni e arredi urbani danneggiati",
    "Verde pubblico":
      "organizzare interventi di manutenzione ordinaria, pulizia e cura delle aree verdi più segnalate",
  };

  const suggestions = categories
    .map((cat) => `${cat}: ${suggestionByCategory[cat]}.`)
    .join(" ");

  return {
    summary: `Nell’area di ${location} emergono ${cityIssues.length} segnalazioni strutturate, di cui ${active.length} ancora in corso. Il quadro mostra una concentrazione di criticità su alcune categorie ricorrenti e su zone specifiche.`,
    mainProblems: `Le categorie più rilevanti risultano ${categories.join(
      ", "
    )}. Le segnalazioni con maggiore urgenza media sono: ${top
      .map((i) => `"${i.title}"`)
      .join(", ")}.`,
    areas: `Le aree più interessate sono ${areas.join(
      ", "
    )}. Queste zone dovrebbero essere considerate prioritarie per controlli, sopralluoghi e pianificazione degli interventi.`,
    suggestions: `Sulla base delle priorità emerse, si suggerisce di ${suggestions}`,
  };
}

function ProfileSettingsScreen({
  issues,
  notificationsActive,
  setNotificationsActive,
  language,
  setLanguage,
  closeProfile,
}) {
  const [openFaq, setOpenFaq] = useState(null);

  const userReports = issues.filter((issue) => issue.isUserReport);

  const faq = [
    {
      q: "Come funziona Urbania?",
      a: "Urbania raccoglie segnalazioni urbane strutturate, le organizza per luogo e categoria e le trasforma in dati leggibili.",
    },
    {
      q: "Le segnalazioni sono anonime?",
      a: "Nel prototipo le segnalazioni sono pseudonime. Pubblicamente non viene mostrata l’identità completa dell’utente.",
    },
    {
      q: "Come vengono stabilite le priorità?",
      a: "Le priorità sono calcolate combinando urgenza media, numero di segnalazioni, conferme, persistenza e stato del problema.",
    },
    {
      q: "Cosa succede quando una segnalazione viene risolta?",
      a: "Quando una segnalazione viene marcata come risolta, resta nello storico ma perde peso nella classifica delle priorità.",
    },
    {
      q: "I report vengono inviati automaticamente al Comune?",
      a: "Nel prototipo no. I report sono pensati per essere condivisi, scaricati e usati come base informativa da cittadini, enti e stakeholder.",
    },
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.profileHeaderRow}>
        <View style={styles.profileTitleBrand}>
          <AppLogo />
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Profilo e impostazioni</Text>
            <Text style={styles.pageSubtitleNoMargin}>
              Gestisci account, segnalazioni e preferenze.
            </Text>
          </View>
        </View>

        <Pressable style={styles.profileCloseButton} onPress={closeProfile}>
          <Text style={styles.profileCloseButtonText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.profileLabel}>Account</Text>
        <Text style={styles.profileEmail}>utente@urbania.app</Text>
      </View>

      <Text style={styles.inputLabel}>Le tue segnalazioni</Text>

      {userReports.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Non hai ancora creato segnalazioni.</Text>
          <Text style={styles.emptyText}>
            Le segnalazioni inviate da te appariranno qui con stato e conferme ricevute.
          </Text>
        </View>
      )}

      {userReports.map((issue) => (
        <View key={issue.id} style={styles.userReportCard}>
          <Text style={styles.userReportTitle}>{issue.title}</Text>
          <Text style={styles.userReportMeta}>
            {issue.category} · {issue.area}, {issue.city}
          </Text>

          <View style={styles.userReportFooter}>
            <Text style={styles.userReportSmall}>{issue.confirmations} conferme</Text>
            <Text
              style={[
                styles.statusBadge,
                issue.status === "Risolto" ? styles.statusResolved : styles.statusOngoing,
              ]}
            >
              {issue.status}
            </Text>
          </View>
        </View>
      ))}

      <Text style={styles.inputLabel}>Lingua</Text>

      <View style={styles.toggleRow}>
        {["Italiano", "English"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setLanguage(item)}
            style={[
              styles.toggleButton,
              language === item && styles.toggleSelectedBlue,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                language === item && styles.toggleTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.inputLabel}>Notifiche</Text>

      <View style={styles.profileCardRow}>
        <View>
          <Text style={styles.profileLabel}>Stato notifiche</Text>
          <Text style={styles.profileValue}>
            {notificationsActive ? "Attive" : "Non attive"}
          </Text>
        </View>

        <Pressable
          style={[
            styles.notificationToggle,
            notificationsActive && styles.notificationToggleActive,
          ]}
          onPress={() => setNotificationsActive((prev) => !prev)}
        >
          <Text style={styles.notificationToggleText}>
            {notificationsActive ? "Disattiva" : "Attiva"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.inputLabel}>FAQ</Text>

      {faq.map((item, index) => (
        <Pressable
          key={item.q}
          style={styles.faqItem}
          onPress={() => setOpenFaq(openFaq === index ? null : index)}
        >
          <Text style={styles.faqQuestion}>{item.q}</Text>
          {openFaq === index && <Text style={styles.faqAnswer}>{item.a}</Text>}
        </Pressable>
      ))}

      <Text style={styles.inputLabel}>Termini di servizio</Text>

      <View style={styles.legalBox}>
        <Text style={styles.legalText}>
          Urbania è un prototipo dimostrativo. I dati inseriti sono trattati in forma locale e hanno finalità esclusivamente informative e sperimentali. L’app non garantisce l’intervento diretto dell’amministrazione pubblica.
        </Text>
      </View>

      <Text style={styles.inputLabel}>Informativa sulla privacy</Text>

      <View style={styles.legalBox}>
        <Text style={styles.legalText}>
          In questa versione prototipale, le informazioni sono gestite localmente nell’app. In una versione reale, i dati personali, le segnalazioni e le preferenze di notifica dovrebbero essere trattati secondo normativa applicabile e con adeguate misure di sicurezza.
        </Text>
      </View>
    </ScrollView>
  );
}

function InfoCard({ label, value }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function BottomNav({ activeTab, setActiveTab }) {
  return (
    <View style={styles.bottomNav}>
      {["Mappa", "Segnala", "Priorità", "Report"].map((tab) => (
        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.navItem}>
          <Text style={[styles.navIcon, activeTab === tab && styles.navActive]}>
            {tab === "Mappa"
              ? "◎"
              : tab === "Segnala"
              ? "+"
              : tab === "Priorità"
              ? "≡"
              : "▤"}
          </Text>
          <Text style={[styles.navText, activeTab === tab && styles.navActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  demoStage: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  demoStageDesktop: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EBF0",
    paddingVertical: 16,
  },
  app: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  webPhone: {
    width: 430,
    maxWidth: "100%",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#CDD3DC",
    shadowColor: "#111827",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  header: {
    minHeight: 148,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "android" ? 18 : 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    justifyContent: "space-between",
    zIndex: 20,
  },
  headerCompact: {
    minHeight: 82,
    justifyContent: "center",
    paddingTop: Platform.OS === "android" ? 16 : 12,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  userIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginLeft: 10,
  },
  userIconText: {
    fontSize: 18,
  },
  headerSearchWrapper: {
    zIndex: 40,
    marginTop: 12,
  },
  currentPlaceText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 5,
    fontWeight: "700",
  },
  placeSearchContainer: {
    position: "relative",
    zIndex: 50,
  },
  searchBox: {
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    color: "#111827",
  },
  searchInputCompact: {
    fontSize: 13,
  },
  clearButton: {
    width: 30,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: {
    fontSize: 22,
    lineHeight: 22,
    color: "#6B7280",
    fontWeight: "800",
  },
  searchButton: {
    height: "100%",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  suggestionBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 999,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 13,
  },
  suggestionText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionTextSmall: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  content: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    zIndex: 1,
  },
  mapScreen: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  markerSelected: {
    transform: [{ scale: 1.18 }],
  },
  markerResolved: {
    opacity: 0.45,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  callout: {
    width: 245,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  calloutTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calloutCategory: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusOngoing: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  statusResolved: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginTop: 8,
    lineHeight: 19,
  },
  calloutArea: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  calloutMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  metricText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "700",
  },
  detailButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  calloutPointer: {
    position: "absolute",
    bottom: -8,
    left: 110,
    width: 16,
    height: 16,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: height * 0.68,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 15,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  sheetCategory: {
    fontSize: 12,
    fontWeight: "900",
    color: "#2563EB",
    textTransform: "uppercase",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
    lineHeight: 24,
  },
  sheetPlace: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 24,
    lineHeight: 26,
    color: "#374151",
  },
  sheetDescription: {
    marginTop: 12,
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
  },
  photoBox: {
    marginTop: 10,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "800",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "900",
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  toggleSelectedYellow: {
    backgroundColor: "#FACC15",
    borderColor: "#FACC15",
  },
  toggleSelectedBlue: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#374151",
  },
  toggleTextSelected: {
    color: "#FFFFFF",
  },
  toggleTextDark: {
    color: "#111827",
  },
  resolvedNote: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
    padding: 12,
    borderRadius: 12,
    fontWeight: "700",
  },
  confirmButton: {
    marginTop: 18,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  likertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  likertRowForm: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  likertCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  likertText: {
    fontWeight: "900",
    color: "#374151",
  },
  likertLegend: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 16,
  },
  bottomNav: {
    height: 78,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 8 : 4,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  navIcon: {
    fontSize: 24,
    color: "#9CA3AF",
    fontWeight: "900",
  },
  navText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "900",
    marginTop: 2,
  },
  navActive: {
    color: "#111827",
  },
  page: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  pageContent: {
    padding: 16,
    paddingBottom: 28,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#111827",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  pageSubtitleNoMargin: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    marginTop: 14,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  chipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "900",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  cityChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  cityChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "900",
  },
  localSearchBox: {
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  localSearchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
  localClearButton: {
    width: 32,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  localClearButtonText: {
    fontSize: 22,
    lineHeight: 22,
    color: "#6B7280",
    fontWeight: "900",
  },
  localSearchButton: {
    height: "100%",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  localSearchButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  emptyBox: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginTop: 6,
  },
  locationSelectedText: {
    fontSize: 12,
    color: "#374151",
    marginTop: 10,
    marginBottom: 8,
    fontWeight: "700",
  },
  photoUpload: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoUploadText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#374151",
  },
  formMapContainer: {
    height: 185,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formMap: {
    flex: 1,
  },
  similarBox: {
    marginTop: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
  },
  similarTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#92400E",
    marginBottom: 8,
  },
  similarItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
  },
  similarItemTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  similarItemText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  priorityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priorityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  priorityRank: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    width: 34,
  },
  priorityTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 19,
  },
  priorityMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  priorityStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  priorityExplanation: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
  currentReportText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
    marginTop: 10,
  },
  reportBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reportTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  reportSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginTop: 16,
    marginBottom: 6,
  },
  reportParagraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  aiDisclaimer: {
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    color: "#1E3A8A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  reportButtons: {
    marginTop: 8,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  profileTitleBrand: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  profileCloseButtonText: {
    fontSize: 24,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "800",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileCardRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "800",
  },
  profileEmail: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "900",
    marginTop: 4,
  },
  profileValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "900",
    marginTop: 4,
  },
  userReportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  userReportTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  userReportMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  userReportFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userReportSmall: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "800",
  },
  notificationToggle: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  notificationToggleActive: {
    backgroundColor: "#16A34A",
  },
  notificationToggleText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 12,
  },
  faqItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  faqAnswer: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    marginTop: 8,
  },
  legalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  legalText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
});
