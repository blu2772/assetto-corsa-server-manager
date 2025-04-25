const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const unzipper = require('unzipper');
const ini = require('ini');

const app = express();
const PORT = process.env.PORT || 3001;

// Konfigurationsdatei für Pfade
const configFilePath = path.join(__dirname, 'config.json');

// Lade bestehende Konfiguration beim Start
let configData = {
  acServerPath: '',
  acInstallPath: ''
};

// Funktion zum Laden der Konfiguration
function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const configContent = fs.readFileSync(configFilePath, 'utf8');
      const loadedConfig = JSON.parse(configContent);
      
      // Übertrage Werte aus der geladenen Konfiguration
      if (loadedConfig.acServerPath) {
        acServerPath = loadedConfig.acServerPath;
        console.log(`Geladen: Assetto Corsa Server Pfad: ${acServerPath}`);
      }
      
      if (loadedConfig.acInstallPath) {
        acConfig.acPath = loadedConfig.acInstallPath;
        updateAcPaths();
        console.log(`Geladen: Assetto Corsa Installation Pfad: ${acConfig.acPath}`);
      }
      
      return loadedConfig;
    }
  } catch (error) {
    console.error('Fehler beim Laden der Konfigurationsdatei:', error);
  }
  return configData;
}

// Funktion zum Speichern der Konfiguration
function saveConfig() {
  try {
    // Aktualisiere die Konfigurationsdaten mit den aktuellen Werten
    configData = {
      acServerPath: acServerPath,
      acInstallPath: acConfig.acPath
    };
    
    fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2));
    console.log('Konfiguration gespeichert in:', configFilePath);
  } catch (error) {
    console.error('Fehler beim Speichern der Konfigurationsdatei:', error);
  }
}

// Lade Konfiguration beim Start
configData = loadConfig();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Konfiguration für Datei-Uploads
const carStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/cars'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const trackStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/tracks'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const uploadCar = multer({ storage: carStorage });
const uploadTrack = multer({ storage: trackStorage });

// Statische Liste von Standard-Autos in Assetto Corsa
const stockCars = [
  { id: 'abarth500_assetto_corse', name: 'Abarth 500 Assetto Corse', isStock: true },
  { id: 'abarth500', name: 'Abarth 500 EsseEsse', isStock: true },
  { id: 'abarth500_s1', name: 'Abarth 500 EsseEsse Step1', isStock: true },
  { id: 'abarth595ss', name: 'Abarth 595 SS', isStock: true },
  { id: 'abarth595ss_s1', name: 'Abarth 595 SS Step 1', isStock: true },
  { id: 'abarth595ss_s2', name: 'Abarth 595 SS Step 2', isStock: true },
  { id: 'alfa_romeo_155_v6', name: 'Alfa Romeo 155 TI V6', isStock: true },
  { id: 'alfa_romeo_4c', name: 'Alfa Romeo 4C', isStock: true },
  { id: 'alfa_romeo_giulietta_qv', name: 'Alfa Romeo Giulietta QV', isStock: true },
  { id: 'alfa_romeo_giulietta_qv_le', name: 'Alfa Romeo Giulietta QV Launch Edition 2014', isStock: true },
  { id: 'alfa_romeo_gta', name: 'Alfa Romeo GTA', isStock: true },
  { id: 'alfa_romeo_mito_qv', name: 'Alfa Romeo Mito QV', isStock: true },
  { id: 'audi_r8_lms_ultra', name: 'Audi R8 LMS Ultra', isStock: true },
  { id: 'audi_r8_v10_plus', name: 'Audi R8 V10 Plus', isStock: true },
  { id: 'audi_s1', name: 'Audi S1', isStock: true },
  { id: 'audi_sport_quattro', name: 'Audi Sport quattro', isStock: true },
  { id: 'audi_sport_quattro_s1', name: 'Audi Sport quattro Step1', isStock: true },
  { id: 'bmw_1m', name: 'BMW 1M', isStock: true },
  { id: 'bmw_1m_s3', name: 'BMW 1M Stage 3', isStock: true },
  { id: 'bmw_m235i_racing', name: 'BMW M235i Racing', isStock: true },
  { id: 'bmw_m3_e30', name: 'BMW M3 E30', isStock: true },
  { id: 'bmw_m3_e30_drift', name: 'BMW M3 E30 Drift', isStock: true },
  { id: 'bmw_m3_e30_dtm', name: 'BMW M3 E30 DTM', isStock: true },
  { id: 'bmw_m3_e30_gra', name: 'BMW M3 E30 Group A', isStock: true },
  { id: 'bmw_m3_e30_s1', name: 'BMW M3 E30 Step1', isStock: true },
  { id: 'bmw_m3_e92', name: 'BMW M3 E92', isStock: true },
  { id: 'bmw_m3_e92_drift', name: 'BMW M3 E92 drift', isStock: true },
  { id: 'bmw_m3_e92_s1', name: 'BMW M3 E92 Step1', isStock: true },
  { id: 'bmw_m3_gt2', name: 'BMW M3 GT2', isStock: true },
  { id: 'bmw_m4', name: 'BMW M4', isStock: true },
  { id: 'bmw_m4_akrapovic', name: 'BMW M4 Akrapovic', isStock: true },
  { id: 'bmw_z4_e89', name: 'BMW Z4 E89', isStock: true },
  { id: 'bmw_z4_e89_drift', name: 'BMW Z4 E89 Drift', isStock: true },
  { id: 'bmw_z4_e89_s1', name: 'BMW Z4 E89 Step1', isStock: true },
  { id: 'bmw_z4_gt3', name: 'BMW Z4 GT3', isStock: true },
  { id: 'chevrolet_corvette_c7_stingray', name: 'Chevrolet Corvette C7 Stingray', isStock: true },
  { id: 'chevrolet_corvette_c7r', name: 'Chevrolet Corvette C7R', isStock: true },
  { id: 'ferrari_312t', name: 'Ferrari 312T', isStock: true },
  { id: 'ferrari_458_gt2', name: 'Ferrari 458 GT2', isStock: true },
  { id: 'ferrari_458_italia', name: 'Ferrari 458 Italia', isStock: true },
  { id: 'ferrari_458_s3', name: 'Ferrari 458 Italia Stage 3', isStock: true },
  { id: 'ferrari_488', name: 'Ferrari 488', isStock: true },
  { id: 'ferrari_488_gt3', name: 'Ferrari 488 GT3', isStock: true },
  { id: 'ferrari_599xxevo', name: 'Ferrari 599XX EVO', isStock: true },
  { id: 'ferrari_f138', name: 'Ferrari F138', isStock: true },
  { id: 'ferrari_f40', name: 'Ferrari F40', isStock: true },
  { id: 'ferrari_f40_s3', name: 'Ferrari F40 Stage 3', isStock: true },
  { id: 'ferrari_fxxk', name: 'Ferrari FXXK', isStock: true },
  { id: 'ferrari_laferrari', name: 'Ferrari LaFerrari', isStock: true },
  { id: 'ferrari_sf15t', name: 'Ferrari SF15-T', isStock: true },
  { id: 'ford_escort_rs1600', name: 'Ford Escort RS1600', isStock: true },
  { id: 'ford_gt40', name: 'Ford GT40', isStock: true },
  { id: 'ford_mustang_2015', name: 'Ford Mustang 2015', isStock: true },
  { id: 'ktm_xbow_r', name: 'KTM X-Bow R', isStock: true },
  { id: 'lamborghini_aventador_sv', name: 'Lamborghini Aventador SV', isStock: true },
  { id: 'lamborghini_countach', name: 'Lamborghini Countach', isStock: true },
  { id: 'lamborghini_countach_s1', name: 'Lamborghini Countach S1', isStock: true },
  { id: 'lamborghini_gallardo_sl', name: 'Lamborghini Gallardo SL', isStock: true },
  { id: 'lamborghini_gallardo_sl_s3', name: 'Lamborghini Gallardo SL Step3', isStock: true },
  { id: 'lamborghini_huracan_gt3', name: 'Lamborghini Huracan GT3', isStock: true },
  { id: 'lamborghini_huracan_st', name: 'Lamborghini Huracan ST', isStock: true },
  { id: 'lamborghini_miura_sv', name: 'Lamborghini Miura P400 SV', isStock: true },
  { id: 'lotus_2_eleven', name: 'Lotus 2 Eleven', isStock: true },
  { id: 'lotus_2_eleven_gt4', name: 'Lotus 2 Eleven GT4', isStock: true },
  { id: 'lotus_72d', name: 'Lotus 72D', isStock: true },
  { id: 'lotus_98t', name: 'Lotus 98T', isStock: true },
  { id: 'lotus_elise_sc', name: 'Lotus Elise SC', isStock: true },
  { id: 'lotus_elise_sc_s1', name: 'Lotus Elise SC Step1', isStock: true },
  { id: 'lotus_elise_sc_s2', name: 'Lotus Elise SC Step2', isStock: true },
  { id: 'lotus_evora_gtc', name: 'Lotus Evora GTC', isStock: true },
  { id: 'lotus_evora_gte', name: 'Lotus Evora GTE', isStock: true },
  { id: 'lotus_evora_gte_carbon', name: 'Lotus Evora GTE Carbon', isStock: true },
  { id: 'lotus_evora_gx', name: 'Lotus Evora GX', isStock: true },
  { id: 'lotus_evora_s', name: 'Lotus Evora S', isStock: true },
  { id: 'lotus_evora_s_s2', name: 'Lotus Evora S Stage 2', isStock: true },
  { id: 'lotus_exige_240r', name: 'Lotus Exige 240R', isStock: true },
  { id: 'lotus_exige_240r_s3', name: 'Lotus Exige 240R Stage3', isStock: true },
  { id: 'lotus_exige_s', name: 'Lotus Exige S', isStock: true },
  { id: 'lotus_exige_s_roadster', name: 'Lotus Exige S roadster', isStock: true },
  { id: 'lotus_exige_scura', name: 'Lotus Exige Scura', isStock: true },
  { id: 'lotus_exige_v6_cup', name: 'Lotus Exige V6 CUP', isStock: true },
  { id: 'lotus_exos_125', name: 'Lotus Exos 125', isStock: true },
  { id: 'lotus_exos_125_s1', name: 'Lotus Exos 125 Stage 1', isStock: true },
  { id: 'lotus_type_25', name: 'Lotus Type 25', isStock: true },
  { id: 'lotus_type_49', name: 'Lotus Type 49', isStock: true },
  { id: 'maserati_250f_6c', name: 'Maserati 250F 6C', isStock: true },
  { id: 'maserati_250f_t2_12c', name: 'Maserati 250F T2 12C', isStock: true },
  { id: 'maserati_granturismo_mc_gt4', name: 'Maserati GranTurismo MC GT4', isStock: true },
  { id: 'maserati_levante', name: 'Maserati Levante', isStock: true },
  { id: 'maserati_mc12_gt1', name: 'Maserati MC12 GT1', isStock: true },
  { id: 'mazda_mx5_cup', name: 'Mazda MX5 Cup', isStock: true },
  { id: 'mazda_mx5_nd', name: 'Mazda MX5 ND', isStock: true },
  { id: 'mazda_rx7_spirit_r', name: 'Mazda RX-7 Spirit R', isStock: true },
  { id: 'mazda_rx7_tuned', name: 'Mazda RX-7 Tuned', isStock: true },
  { id: 'mclaren_650s_gt3', name: 'McLaren 650S GT3', isStock: true },
  { id: 'mclaren_f1_gtr', name: 'McLaren F1 GTR', isStock: true },
  { id: 'mclaren_mp412c', name: 'McLaren MP4-12C', isStock: true },
  { id: 'mclaren_mp412c_gt3', name: 'McLaren MP4-12C GT3', isStock: true },
  { id: 'mclaren_p1', name: 'McLaren P1', isStock: true },
  { id: 'mercedes_sls', name: 'Mercedes SLS AMG', isStock: true },
  { id: 'mercedes_sls_gt3', name: 'Mercedes SLS AMG GT3', isStock: true },
  { id: 'mercedes_190_evo2', name: 'Mercedes-Benz 190E EVO II', isStock: true },
  { id: 'mercedes_amg_gt3', name: 'Mercedes-Benz AMG GT3', isStock: true },
  { id: 'mercedes_c9', name: 'Mercedes-Benz C9 1989 LM', isStock: true },
  { id: 'nissan_370z', name: 'Nissan 370z Nismo', isStock: true },
  { id: 'nissan_gtr_gt3', name: 'Nissan GT-R GT3', isStock: true },
  { id: 'nissan_gtr_nismo', name: 'Nissan GT-R NISMO', isStock: true },
  { id: 'nissan_skyline_r34', name: 'Nissan Skyline GTR R34 V-Spec', isStock: true },
  { id: 'p4-5_competizione', name: 'P4/5 Competizione 2011', isStock: true },
  { id: 'pagani_huayra', name: 'Pagani Huayra', isStock: true },
  { id: 'pagani_zonda_r', name: 'Pagani Zonda R', isStock: true },
  { id: 'porsche_718_boxster_s', name: 'Porsche 718 Boxster S', isStock: true },
  { id: 'porsche_718_cayman_s', name: 'Porsche 718 Cayman S', isStock: true },
  { id: 'porsche_718_spyder_rs', name: 'Porsche 718 Spyder RS', isStock: true },
  { id: 'porsche_908_lh', name: 'Porsche 908 Lang Heck', isStock: true },
  { id: 'porsche_911_r', name: 'Porsche 911 R', isStock: true },
  { id: 'porsche_911_rsr', name: 'Porsche 911 3.0 RSR', isStock: true },
  { id: 'porsche_911_carrera_s', name: 'Porsche 911 991.2 Carrera S', isStock: true },
  { id: 'porsche_911_gt1', name: 'Porsche 911 GT1', isStock: true },
  { id: 'porsche_911_gt3_cup_2017', name: 'Porsche 911 GT3 Cup 2017', isStock: true },
  { id: 'porsche_911_gt3_r_2016', name: 'Porsche 911 GT3 R 2016', isStock: true },
  { id: 'porsche_911_gt3_rs', name: 'Porsche 911 GT3 RS', isStock: true },
  { id: 'porsche_911_turbo_s', name: 'Porsche 911 Turbo S', isStock: true },
  { id: 'porsche_917_k', name: 'Porsche 917 K', isStock: true },
  { id: 'porsche_917_30', name: 'Porsche 917/30', isStock: true },
  { id: 'porsche_918_spyder', name: 'Porsche 918 Spyder', isStock: true },
  { id: 'porsche_919_hybrid_2015', name: 'Porsche 919 Hybrid 2015', isStock: true },
  { id: 'porsche_919_hybrid_2016', name: 'Porsche 919 Hybrid 2016 LeMans', isStock: true },
  { id: 'porsche_935_78', name: 'Porsche 935/78 ("Moby Dick")', isStock: true },
  { id: 'porsche_962c_longtail', name: 'Porsche 962c long tail', isStock: true },
  { id: 'porsche_962c_shorttail', name: 'Porsche 962c short tail', isStock: true },
  { id: 'porsche_cayman_gt4', name: 'Porsche Cayman GT4', isStock: true },
  { id: 'porsche_cayman_gt4_clubsport', name: 'Porsche Cayman GT4 Clubsport', isStock: true },
  { id: 'porsche_macan', name: 'Porsche Macan Turbo', isStock: true },
  { id: 'praga_r1', name: 'Praga R1', isStock: true },
  { id: 'ruf_yellowbird', name: 'RUF CTR Yellowbird', isStock: true },
  { id: 'ruf_rt12r', name: 'RUF RT12 R', isStock: true },
  { id: 'ruf_rt12r_awd', name: 'RUF RT12 R AWD', isStock: true },
  { id: 'scg003', name: 'SCG 003C', isStock: true },
  { id: 'shelby_cobra_427sc', name: 'Shelby Cobra 427 S/C', isStock: true },
  { id: 'tatuusfa1', name: 'Tatuus FA01', isStock: true },
  { id: 'toyota_ae86', name: 'Toyota AE86', isStock: true },
  { id: 'toyota_ae86_drift', name: 'Toyota AE86 Drift', isStock: true },
  { id: 'toyota_ae86_tuned', name: 'Toyota AE86 Tuned', isStock: true },
  { id: 'toyota_gt86', name: 'Toyota GT86', isStock: true },
  { id: 'toyota_supra_mkiv', name: 'Toyota Supra MKIV', isStock: true },
  { id: 'toyota_supra_mkiv_drift', name: 'Toyota Supra MKIV Drift', isStock: true },
  { id: 'toyota_supra_mkiv_time_attack', name: 'Toyota Supra MKIV Time Attack', isStock: true },
];

// Statische Liste von Standard-Strecken in Assetto Corsa
const stockTracks = [
  { 
    name: 'monza', 
    layouts: ['', 'junior'], 
    isStock: true 
  },
  { 
    name: 'imola', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'mugello', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'silverstone', 
    layouts: ['', 'international', 'national'], 
    isStock: true 
  },
  { 
    name: 'barcelona', 
    layouts: ['', 'moto', 'national', 'nocurve', 'hotlap'], 
    isStock: true 
  },
  { 
    name: 'spa', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'nurburgring', 
    layouts: ['', 'sprint_a', 'sprint_b', 'sprint', 'endurance', 'nordschleife', 'touristenfahrten'], 
    isStock: true 
  },
  { 
    name: 'brands_hatch', 
    layouts: ['', 'indy'], 
    isStock: true 
  },
  { 
    name: 'vallelunga', 
    layouts: ['', 'club'], 
    isStock: true 
  },
  { 
    name: 'ks_black_cat_county', 
    layouts: ['', 'configuration_1', 'configuration_2', 'layout_1', 'layout_2', 'layout_3'], 
    isStock: true 
  },
  { 
    name: 'drag1000', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'drag400', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'drift', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'ks_highlands', 
    layouts: ['', 'drift', 'mini', 'short', 'sprint'], 
    isStock: true 
  },
  { 
    name: 'ks_laguna_seca', 
    layouts: [''], 
    isStock: true 
  },
  { 
    name: 'ks_nordschleife', 
    layouts: ['', 'endurance', 'touristenfahrten', 'sprint_b', 'sprint_a', 'sprint'], 
    isStock: true 
  },
  { 
    name: 'ks_red_bull_ring', 
    layouts: ['', 'national', 'layout_c'], 
    isStock: true 
  },
  { 
    name: 'ks_zandvoort', 
    layouts: ['', 'national', 'club'], 
    isStock: true 
  },
  // ... weitere Strecken könnten hier hinzugefügt werden
];

// Assetto Corsa Konfiguration
const acConfig = {
  // Pfad zur Assetto Corsa Installation
  acPath: process.env.AC_PATH || '', // Standardmäßig leer, muss vom Benutzer gesetzt werden
  carsPath: '', // Wird basierend auf acPath automatisch gesetzt
  tracksPath: '', // Wird basierend auf acPath automatisch gesetzt
};

// Hilfsfunktion zum Aktualisieren der Pfade basierend auf dem Hauptpfad
function updateAcPaths() {
  if (acConfig.acPath) {
    acConfig.carsPath = path.join(acConfig.acPath, 'content', 'cars');
    acConfig.tracksPath = path.join(acConfig.acPath, 'content', 'tracks');
  }
}

// Assetto Corsa Server Konfiguration
const acServerConfig = {
  serverName: 'Mein Assetto Corsa Server',
  cars: ['abarth500', 'bmw_m3_e30'],
  track: 'monza',
  trackLayout: '',
  maxClients: 15,
  port: 9600,
  httpPort: 8081,
  registerToLobby: 1,
  password: '',
  adminPassword: 'adminpass'
};

// Pfad zur Server-Executable
let acServerPath = '/home/steam/assetto/acServer'; // Korrekter Pfad zum Assetto Corsa Server

// Aktuelle Serverprozess-ID
let acServerProcess = null;
let serverStartTime = null; // Zeitpunkt, zu dem der Server gestartet wurde

// Serverausgabe speichern
let serverOutput = [];
const MAX_OUTPUT_LINES = 1000;

// API-Endpunkte

// Abrufen der verfügbaren Assetto Corsa Standard-Autos
app.get('/api/stock-cars', async (req, res) => {
  try {
    res.json(stockCars);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Autos' });
  }
});

// Abrufen der verfügbaren Assetto Corsa Standard-Strecken
app.get('/api/stock-tracks', async (req, res) => {
  try {
    res.json(stockTracks);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Strecken:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Strecken' });
  }
});

// GET: Serverkonfiguration abrufen
app.get('/api/server/config', (req, res) => {
  try {
    // Pfade zu den Konfigurationsdateien definieren
    const acServerDir = path.dirname(acServerPath);
    const cfgDir = path.join(acServerDir, 'cfg');
    const serverCfgPath = path.join(cfgDir, 'server_cfg.ini');
    
    // Überprüfen, ob die Konfigurationsdatei existiert
    if (!fs.existsSync(serverCfgPath)) {
      return res.status(404).json({ error: 'Serverkonfiguration nicht gefunden' });
    }
    
    // Serverkonfiguration aus der Datei lesen
    const serverCfgContent = fs.readFileSync(serverCfgPath, 'utf8');
    const configData = ini.parse(serverCfgContent);
    
    // Konfiguration in ein strukturiertes Objekt umwandeln
    const config = {
      serverName: configData.SERVER?.NAME || 'Mein Assetto Corsa Server',
      cars: configData.SERVER?.CARS ? configData.SERVER.CARS.split(';') : [],
      track: configData.SERVER?.TRACK || '',
      trackLayout: configData.SERVER?.CONFIG_TRACK || '',
      maxClients: parseInt(configData.SERVER?.MAX_CLIENTS || '18'),
      port: parseInt(configData.SERVER?.UDP_PORT || '9600'),
      httpPort: parseInt(configData.SERVER?.HTTP_PORT || '8081'),
      password: configData.SERVER?.PASSWORD || '',
      adminPassword: configData.SERVER?.ADMIN_PASSWORD || 'admin',
      registerToLobby: parseInt(configData.SERVER?.REGISTER_TO_LOBBY || '1')
    };
    
    res.json(config);
  } catch (error) {
    console.error('Fehler beim Abrufen der Serverkonfiguration:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Serverkonfiguration' });
  }
});

// Hochladen von Car-Mods
app.post('/api/upload/car', uploadCar.single('carmod'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const filePath = req.file.path;
    const fileExt = path.extname(filePath).toLowerCase();
    let extracted = false;
    let warning = null;
    
    // Wenn es eine ZIP-Datei ist, entpacken
    if (fileExt === '.zip') {
      try {
        await fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: path.join(__dirname, 'uploads/cars') }))
          .promise();
        
        // ZIP-Datei nach dem Entpacken löschen
        await fs.unlink(filePath);
        extracted = true;
      } catch (error) {
        console.error('Fehler beim Entpacken der ZIP-Datei:', error);
        return res.status(500).json({ 
          error: 'Fehler beim Entpacken der ZIP-Datei', 
          details: error.message 
        });
      }
    } else {
      warning = 'Nicht-ZIP-Datei hochgeladen';
      const message = 'Die Datei wurde hochgeladen, aber nicht automatisch entpackt. ' + 
                     'Bitte entpacken Sie die Datei manuell im cars-Verzeichnis und starten Sie den Server neu.';
      return res.json({ 
        message: message, 
        warning: warning, 
        filename: req.file.originalname,
        extracted: false
      });
    }
    
    res.json({ 
      message: 'Car-Mod erfolgreich hochgeladen', 
      filename: req.file.originalname,
      extracted: extracted 
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Car-Mods:', error);
    res.status(500).json({ 
      error: 'Fehler beim Hochladen des Car-Mods', 
      details: error.message 
    });
  }
});

// Hochladen von Track-Mods
app.post('/api/upload/track', uploadTrack.single('trackmod'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const filePath = req.file.path;
    const fileExt = path.extname(filePath).toLowerCase();
    let extracted = false;
    let warning = null;
    
    // Wenn es eine ZIP-Datei ist, entpacken
    if (fileExt === '.zip') {
      try {
        await fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: path.join(__dirname, 'uploads/tracks') }))
          .promise();
        
        // ZIP-Datei nach dem Entpacken löschen
        await fs.unlink(filePath);
        extracted = true;
      } catch (error) {
        console.error('Fehler beim Entpacken der ZIP-Datei:', error);
        return res.status(500).json({ 
          error: 'Fehler beim Entpacken der ZIP-Datei', 
          details: error.message 
        });
      }
    } else {
      warning = 'Nicht-ZIP-Datei hochgeladen';
      const message = 'Die Datei wurde hochgeladen, aber nicht automatisch entpackt. ' + 
                     'Bitte entpacken Sie die Datei manuell im tracks-Verzeichnis und starten Sie den Server neu.';
      return res.json({ 
        message: message, 
        warning: warning, 
        filename: req.file.originalname,
        extracted: false
      });
    }
    
    res.json({ 
      message: 'Track-Mod erfolgreich hochgeladen', 
      filename: req.file.originalname,
      extracted: extracted 
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Track-Mods:', error);
    res.status(500).json({ 
      error: 'Fehler beim Hochladen des Track-Mods', 
      details: error.message 
    });
  }
});

// Abrufen aller verfügbaren Car-Mods
app.get('/api/cars', async (req, res) => {
  try {
    const carsDir = path.join(__dirname, 'uploads/cars');
    const carFolders = await fs.readdir(carsDir);
    const cars = carFolders.filter(item => 
      fs.statSync(path.join(carsDir, item)).isDirectory()
    ).map(car => ({
      id: car,
      name: car,
      isStock: false
    }));
    
    res.json(cars);
  } catch (error) {
    console.error('Fehler beim Abrufen der Car-Mods:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Car-Mods' });
  }
});

// Abrufen aller verfügbaren Track-Mods
app.get('/api/tracks', async (req, res) => {
  try {
    const tracksDir = path.join(__dirname, 'uploads/tracks');
    const trackFolders = await fs.readdir(tracksDir);
    const tracks = trackFolders.filter(item => 
      fs.statSync(path.join(tracksDir, item)).isDirectory()
    );
    
    // Für jeden Track die verfügbaren Layouts abrufen
    const tracksWithLayouts = await Promise.all(tracks.map(async track => {
      const trackDir = path.join(tracksDir, track);
      const files = await fs.readdir(trackDir);
      
      // Suche nach UI-Ordner und dann nach ui_track.json
      const uiFolder = files.find(file => file.toLowerCase() === 'ui');
      let layouts = [];
      
      if (uiFolder) {
        const uiPath = path.join(trackDir, uiFolder);
        try {
          const uiFiles = await fs.readdir(uiPath);
          const uiTrackFile = uiFiles.find(file => file.toLowerCase() === 'ui_track.json');
          
          if (uiTrackFile) {
            const uiTrackData = await fs.readJson(path.join(uiPath, uiTrackFile));
            layouts = uiTrackData.layouts || [];
          }
        } catch (error) {
          console.error(`Fehler beim Lesen der Layouts für ${track}:`, error);
        }
      }
      
      return {
        name: track,
        layouts: layouts.map(layout => layout.name || ''),
        isStock: false
      };
    }));
    
    res.json(tracksWithLayouts);
  } catch (error) {
    console.error('Fehler beim Abrufen der Track-Mods:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Track-Mods' });
  }
});

// GET: Alle Standard-Autos von der AC-Installation abrufen
app.get('/api/stock-cars', (req, res) => {
  try {
    // Überprüfen, ob der AC-Pfad konfiguriert ist
    if (!acConfig.acPath || !acConfig.carsPath) {
      return res.status(400).json({ 
        error: 'Assetto Corsa Pfad ist nicht konfiguriert. Bitte konfigurieren Sie zuerst den AC-Pfad.' 
      });
    }
    
    // Überprüfen, ob das Cars-Verzeichnis existiert
    if (!fs.existsSync(acConfig.carsPath)) {
      return res.status(404).json({ 
        error: `Das Verzeichnis existiert nicht: ${acConfig.carsPath}` 
      });
    }
    
    // Verzeichnisse im Cars-Ordner auslesen
    const carDirectories = fs.readdirSync(acConfig.carsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Autos mit Zusatzinformationen zurückgeben
    const cars = carDirectories.map(car => ({
      id: car,
      name: car.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      isStock: true
    }));
    
    res.json(cars);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Autos' });
  }
});

// GET: Alle Standard-Strecken von der AC-Installation abrufen
app.get('/api/stock-tracks', (req, res) => {
  try {
    // Überprüfen, ob der AC-Pfad konfiguriert ist
    if (!acConfig.acPath || !acConfig.tracksPath) {
      return res.status(400).json({ 
        error: 'Assetto Corsa Pfad ist nicht konfiguriert. Bitte konfigurieren Sie zuerst den AC-Pfad.' 
      });
    }
    
    // Überprüfen, ob das Tracks-Verzeichnis existiert
    if (!fs.existsSync(acConfig.tracksPath)) {
      return res.status(404).json({ 
        error: `Das Verzeichnis existiert nicht: ${acConfig.tracksPath}` 
      });
    }
    
    // Verzeichnisse im Tracks-Ordner auslesen
    const trackDirectories = fs.readdirSync(acConfig.tracksPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Für jede Strecke die Layouts ermitteln
    const tracks = trackDirectories.map(track => {
      const trackPath = path.join(acConfig.tracksPath, track);
      const layoutsPath = path.join(trackPath, 'ui', 'ui_track.json');
      
      let layouts = [];
      
      // Versuche, die Layouts aus der ui_track.json zu lesen
      if (fs.existsSync(layoutsPath)) {
        try {
          const uiTrackData = JSON.parse(fs.readFileSync(layoutsPath, 'utf8'));
          if (uiTrackData.layouts) {
            layouts = Object.keys(uiTrackData.layouts);
          }
        } catch (parseError) {
          console.warn(`Fehler beim Parsen der ui_track.json für ${track}:`, parseError);
        }
      }
      
      // Alternativ: Layouts aus dem Verzeichnis auslesen
      if (layouts.length === 0) {
        const layoutsDir = path.join(trackPath, 'layouts');
        if (fs.existsSync(layoutsDir)) {
          layouts = fs.readdirSync(layoutsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        }
      }
      
      // Wenn keine Layouts gefunden wurden, mindestens ein leeres Layout hinzufügen
      if (layouts.length === 0) {
        layouts = [''];
      }
      
      // Name der Strecke aus dem Verzeichnisnamen ableiten
      const trackName = track.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      return {
        id: track,
        name: trackName,
        layouts: layouts,
        isStock: true
      };
    });
    
    res.json(tracks);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Strecken:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Strecken' });
  }
});

// GET: Alle Cars und Tracks über einen Endpunkt abrufen
app.get('/api/all-cars', async (req, res) => {
  try {
    // Standard-Autos abrufen
    let stockCars = [];
    if (acConfig.acPath && acConfig.carsPath && fs.existsSync(acConfig.carsPath)) {
      try {
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/stock-cars`);
        if (response.ok) {
          stockCars = await response.json();
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Standard-Autos:', error);
      }
    }
    
    // Mod-Autos abrufen
    let modCars = [];
    try {
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/cars`);
      if (response.ok) {
        modCars = await response.json();
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Mod-Autos:', error);
    }
    
    // Alle Autos kombinieren
    const allCars = [...stockCars, ...modCars];
    
    res.json(allCars);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen aller Autos' });
  }
});

// GET: Alle Strecken über einen Endpunkt abrufen
app.get('/api/all-tracks', async (req, res) => {
  try {
    // Standard-Strecken abrufen
    let stockTracks = [];
    if (acConfig.acPath && acConfig.tracksPath && fs.existsSync(acConfig.tracksPath)) {
      try {
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/stock-tracks`);
        if (response.ok) {
          stockTracks = await response.json();
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Standard-Strecken:', error);
      }
    }
    
    // Mod-Strecken abrufen
    let modTracks = [];
    try {
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/tracks`);
      if (response.ok) {
        modTracks = await response.json();
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Mod-Strecken:', error);
    }
    
    // Alle Strecken kombinieren
    const allTracks = [...stockTracks, ...modTracks];
    
    res.json(allTracks);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Strecken:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen aller Strecken' });
  }
});

// GET: Server-Status abrufen
app.get('/api/server/status', (req, res) => {
  if (acServerProcess) {
    res.json({
      status: 'running',
      pid: acServerProcess.pid,
      uptime: Math.floor((Date.now() - serverStartTime) / 1000) // Uptime in Sekunden
    });
  } else {
    res.json({
      status: 'stopped'
    });
  }
});

// Serverausgabe abrufen
app.get('/api/server/output', (req, res) => {
  res.json({ output: serverOutput });
});

// Server-Verbindungsinformationen abrufen
app.get('/api/server/connect-info', (req, res) => {
  try {
    // Hole die IP-Adresse des Servers
    const networkInterfaces = require('os').networkInterfaces();
    let ipAddress = '';
    
    // Durchsuche die Netzwerkschnittstellen nach einer geeigneten IP-Adresse
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      const interfaces = networkInterfaces[interfaceName];
      for (let i = 0; i < interfaces.length; i++) {
        const iface = interfaces[i];
        // Verwende IPv4-Adressen, die nicht localhost sind
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          break;
        }
      }
    });
    
    // Wenn keine externe IP gefunden wurde, verwende localhost
    if (!ipAddress) {
      ipAddress = '127.0.0.1';
    }
    
    // Generiere den Verbindungslink (Format für Content Manager: acmanager://?)
    const connectionInfo = {
      serverName: acServerConfig.serverName,
      ipAddress: ipAddress,
      port: acServerConfig.port,
      httpPort: acServerConfig.httpPort,
      password: acServerConfig.password,
      running: acServerProcess !== null,
      cars: acServerConfig.cars,
      track: acServerConfig.track,
      trackLayout: acServerConfig.trackLayout,
      // Direktlink für Content Manager
      contentManagerLink: `acmanager:join?ip=${ipAddress}&port=${acServerConfig.port}`,
      // Direktlink für Browser
      directLink: `http://${ipAddress}:${acServerConfig.httpPort}`
    };
    
    res.json(connectionInfo);
  } catch (error) {
    console.error('Fehler beim Abrufen der Server-Verbindungsinformationen:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Server-Verbindungsinformationen' });
  }
});

// POST: Serverkonfiguration aktualisieren
app.post('/api/server/config', (req, res) => {
  // Überprüfen, ob Konfiguration empfangen wurde
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Keine Konfigurationsdaten erhalten' });
  }

  try {
    console.log('Neue Serverkonfiguration erhalten:', JSON.stringify(req.body, null, 2));
    
    // Pfade zu den Konfigurationsdateien definieren
    const acServerDir = path.dirname(acServerPath);
    const cfgDir = path.join(acServerDir, 'cfg');
    const serverCfgPath = path.join(cfgDir, 'server_cfg.ini');
    const entryListPath = path.join(cfgDir, 'entry_list.ini');
    
    // Sicherstellen, dass das Konfigurationsverzeichnis existiert
    if (!fs.existsSync(cfgDir)) {
      console.log(`Erstelle Konfigurationsverzeichnis: ${cfgDir}`);
      fs.mkdirSync(cfgDir, { recursive: true });
    }

    // Aktualisiere die Serverkonfiguration im acServerConfig-Objekt
    const config = req.body;
    
    // Sicherstellen, dass die Autos als Array vorliegen
    if (!Array.isArray(config.cars)) {
      config.cars = [config.cars];
    }

    // Die server_cfg.ini erstellen
    const serverCfg = [
      '[SERVER]',
      `NAME=${config.serverName}`,
      `CARS=${config.cars.join(';')}`,
      `TRACK=${config.track}`,
      `CONFIG_TRACK=${config.trackLayout || ''}`,
      `MAX_CLIENTS=${config.maxClients || 18}`,
      `ADMIN_PASSWORD=${config.adminPassword || 'admin'}`,
      `UDP_PORT=${config.port || 9600}`,
      `TCP_PORT=${config.port || 9600}`,
      `HTTP_PORT=${config.httpPort || 8081}`,
      `PASSWORD=${config.password || ''}`,
      '',
      '[PRACTICE]',
      'NAME=Freies Fahren',
      'TIME=0',
      'IS_OPEN=1',
      '',
      '[WEATHER]',
      'GRAPHICS=3_clear',
      'BASE_TEMPERATURE_AMBIENT=18',
      'BASE_TEMPERATURE_ROAD=7',
      'VARIATION_AMBIENT=2',
      'VARIATION_ROAD=2',
      '',
      '[DYNAMIC_TRACK]',
      'SESSION_START=90',
      'RANDOMNESS=0',
      'SESSION_TRANSFER=90',
      'LAP_GAIN=22',
      '',
      '[BOOK]',
      'NAME=acServerManager'
    ].join('\n');

    // Die entry_list.ini erstellen
    let entryList = [];
    
    // Für jedes Auto einen Eintrag erstellen
    config.cars.forEach((car, index) => {
      entryList.push(`[CAR_${index}]`);
      entryList.push(`MODEL=${car}`);
      entryList.push(`SKIN=` + (config.skins && config.skins[index] ? config.skins[index] : 'default'));
      entryList.push(`SPECTATOR_MODE=0`);
      entryList.push(`DRIVERNAME=`);
      entryList.push(`TEAM=`);
      entryList.push(`GUID=`);
      entryList.push(`BALLAST=0`);
      entryList.push(`RESTRICTOR=0`);
      entryList.push('');
    });

    // Konfigurationsdateien speichern
    fs.writeFileSync(serverCfgPath, serverCfg);
    fs.writeFileSync(entryListPath, entryList.join('\n'));
    
    console.log(`Konfigurationen gespeichert in:`);
    console.log(`- Server Config: ${serverCfgPath}`);
    console.log(`- Entry List: ${entryListPath}`);
    
    res.json({
      message: 'Konfiguration erfolgreich aktualisiert',
      config: config
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Konfiguration:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Konfiguration: ' + error.message });
  }
});

// AC Server Pfad aktualisieren
app.post('/api/server-path', (req, res) => {
  try {
    const { serverPath } = req.body;
    
    if (serverPath) {
      acServerPath = serverPath;
      
      // Konfiguration speichern
      saveConfig();
      
      res.json({ 
        message: 'Assetto Corsa Server Pfad aktualisiert',
        serverPath: acServerPath
      });
    } else {
      res.status(400).json({ error: 'Server-Pfad muss angegeben werden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Server-Pfads:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Server-Pfads' });
  }
});

// POST: Server starten
app.post('/api/server/start', (req, res) => {
  if (acServerProcess) {
    return res.status(400).json({ error: 'Server läuft bereits' });
  }

  if (!fs.existsSync(acServerPath)) {
    return res.status(400).json({ error: `Serverpfad existiert nicht: ${acServerPath}` });
  }

  try {
    console.log('Server wird gestartet...');
    
    // Pfade zu den Konfigurationsdateien definieren
    const acServerDir = path.dirname(acServerPath);
    const cfgDir = path.join(acServerDir, 'cfg');
    
    // Verzeichnis überprüfen, in dem sich der Server befindet
    serverStartTime = Date.now();
    acServerProcess = spawn(acServerPath, [], { 
      cwd: acServerDir, 
      env: { ...process.env },
      detached: false
    });

    console.log(`Server gestartet mit PID: ${acServerProcess.pid}`);

    acServerProcess.stdout.on('data', (data) => {
      console.log(`AC Server Ausgabe: ${data}`);
    });

    acServerProcess.stderr.on('data', (data) => {
      console.error(`AC Server Fehler: ${data}`);
    });

    acServerProcess.on('close', (code) => {
      console.log(`AC Server beendet mit Code: ${code}`);
      acServerProcess = null;
    });

    res.json({ 
      message: 'Server erfolgreich gestartet', 
      pid: acServerProcess.pid 
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    res.status(500).json({ error: 'Fehler beim Starten des Servers: ' + error.message });
  }
});

// POST: Server stoppen
app.post('/api/server/stop', (req, res) => {
  if (!acServerProcess) {
    return res.status(400).json({ error: 'Server läuft nicht' });
  }

  try {
    console.log('Server wird gestoppt...');
    const stopped = acServerProcess.kill();
    acServerProcess = null;
    
    if (stopped) {
      res.json({ message: 'Server erfolgreich gestoppt' });
    } else {
      res.status(500).json({ error: 'Fehler beim Stoppen des Servers' });
    }
  } catch (error) {
    console.error('Fehler beim Stoppen des Servers:', error);
    res.status(500).json({ error: 'Fehler beim Stoppen des Servers: ' + error.message });
  }
});

// POST: AC Installation Pfad aktualisieren
app.post('/api/ac-path', (req, res) => {
  try {
    const { acPath } = req.body;
    
    if (!acPath) {
      return res.status(400).json({ error: 'AC-Installationspfad muss angegeben werden' });
    }
    
    // Überprüfen, ob der Pfad existiert
    if (!fs.existsSync(acPath)) {
      return res.status(400).json({ error: `Der angegebene Pfad existiert nicht: ${acPath}` });
    }
    
    // Überprüfen, ob es sich um eine gültige AC-Installation handelt
    const contentPath = path.join(acPath, 'content');
    const carsPath = path.join(contentPath, 'cars');
    const tracksPath = path.join(contentPath, 'tracks');
    
    if (!fs.existsSync(contentPath) || !fs.existsSync(carsPath) || !fs.existsSync(tracksPath)) {
      return res.status(400).json({ 
        error: 'Ungültiger Assetto Corsa Pfad. Es wurden keine content/cars/tracks Verzeichnisse gefunden.' 
      });
    }
    
    // Pfad in der Konfiguration speichern
    acConfig.acPath = acPath;
    updateAcPaths();
    
    // Konfiguration dauerhaft speichern
    saveConfig();
    
    res.json({ 
      message: 'Assetto Corsa Installationspfad aktualisiert',
      acPath: acConfig.acPath,
      carsPath: acConfig.carsPath,
      tracksPath: acConfig.tracksPath
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des AC-Installationspfads:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des AC-Installationspfads' });
  }
});

// Catch-all Route für React-App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log(`Assetto Corsa Server Pfad: ${acServerPath}`);
  console.log(`Assetto Corsa Installation Pfad: ${acConfig.acPath}`);
  
  // Stellen Sie sicher, dass die Upload- und Konfigurations-Verzeichnisse existieren
  fs.ensureDirSync(path.join(__dirname, 'uploads/cars'));
  fs.ensureDirSync(path.join(__dirname, 'uploads/tracks'));
  
  // Sicherstellen, dass das cfg-Verzeichnis im Assetto Corsa Verzeichnis existiert
  if (acServerPath) {
    const cfgDir = path.join(path.dirname(acServerPath), 'cfg');
    fs.ensureDirSync(cfgDir);
    console.log(`Assetto Corsa cfg-Verzeichnis: ${cfgDir}`);
  } else {
    console.warn('Warnung: AC Server Pfad ist nicht konfiguriert');
  }
}); 
