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
let acServerPath = '/pfad/zu/acServer'; // Anpassen nach tatsächlichem Pfad

// Aktuelle Serverprozess-ID
let serverProcess = null;

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

// Abrufen aller verfügbaren Autos (Standard und Mods)
app.get('/api/all-cars', async (req, res) => {
  try {
    // Standard-Autos und Mods abrufen
    const [stockCarsResponse, modsResponse] = await Promise.all([
      stockCars,
      fetch(`http://localhost:${PORT}/api/cars`).then(res => res.json())
    ]);
    
    // Alle Autos zusammenführen
    const allCars = [
      ...stockCarsResponse,
      ...modsResponse
    ];
    
    res.json(allCars);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen aller Autos' });
  }
});

// Abrufen aller verfügbaren Strecken (Standard und Mods)
app.get('/api/all-tracks', async (req, res) => {
  try {
    // Standard-Strecken und Mods abrufen
    const [stockTracksResponse, modsResponse] = await Promise.all([
      stockTracks,
      fetch(`http://localhost:${PORT}/api/tracks`).then(res => res.json())
    ]);
    
    // Alle Strecken zusammenführen
    const allTracks = [
      ...stockTracksResponse,
      ...modsResponse
    ];
    
    res.json(allTracks);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Strecken:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen aller Strecken' });
  }
});

// Serverstatus abrufen
app.get('/api/server/status', (req, res) => {
  const isRunning = serverProcess !== null;
  res.json({ 
    running: isRunning,
    outputCount: serverOutput.length
  });
});

// Serverausgabe abrufen
app.get('/api/server/output', (req, res) => {
  res.json({ output: serverOutput });
});

// Serverkonfiguration aktualisieren
app.post('/api/server/config', (req, res) => {
  try {
    const newConfig = req.body;
    
    // Konfiguration aktualisieren
    Object.assign(acServerConfig, newConfig);
    
    // Konfigurationsdatei speichern
    saveServerConfig();
    
    res.json({ message: 'Serverkonfiguration aktualisiert', config: acServerConfig });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Serverkonfiguration:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Serverkonfiguration' });
  }
});

// AC Server Pfad aktualisieren
app.post('/api/server-path', (req, res) => {
  try {
    const { serverPath } = req.body;
    
    if (serverPath) {
      acServerPath = serverPath;
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

// Starte den Assetto Corsa Server
app.post('/api/server/start', (req, res) => {
  if (serverProcess) {
    return res.status(400).json({ error: 'Server läuft bereits' });
  }
  
  try {
    // Konfiguration aktualisieren, falls neue Werte vorhanden sind
    if (req.body) {
      Object.assign(acServerConfig, req.body);
      saveServerConfig();
    }
    
    // Serverausgabe zurücksetzen
    serverOutput = [];
    
    // Protokolliere Start-Informationen
    const timestamp = new Date().toISOString();
    serverOutput.push(`[${timestamp}] Starting Assetto Corsa Server...`);
    serverOutput.push(`[${timestamp}] Server path: ${acServerPath}`);
    serverOutput.push(`[${timestamp}] Server configuration: ${JSON.stringify(acServerConfig, null, 2)}`);
    
    // Server als spawn statt exec starten, um Ausgabe zu erfassen
    const options = {
      cwd: path.dirname(acServerPath),
      shell: true
    };
    
    serverProcess = spawn(acServerPath, [], options);
    
    if (!serverProcess) {
      throw new Error('Server konnte nicht gestartet werden');
    }
    
    // Ausgabe vom Server erfassen
    serverProcess.stdout.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const lines = data.toString().split('\n').filter(line => line.trim() !== '');
      
      lines.forEach(line => {
        serverOutput.push(`[${timestamp}] ${line}`);
        // Begrenze die Anzahl der gespeicherten Zeilen
        if (serverOutput.length > MAX_OUTPUT_LINES) {
          serverOutput.shift();
        }
      });
      
      console.log(`Server stdout: ${data}`);
    });
    
    // Fehlerausgabe vom Server erfassen
    serverProcess.stderr.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const lines = data.toString().split('\n').filter(line => line.trim() !== '');
      
      lines.forEach(line => {
        serverOutput.push(`[${timestamp}] ERROR: ${line}`);
        // Begrenze die Anzahl der gespeicherten Zeilen
        if (serverOutput.length > MAX_OUTPUT_LINES) {
          serverOutput.shift();
        }
      });
      
      console.error(`Server stderr: ${data}`);
    });
    
    // Ereignisse vom Server überwachen
    serverProcess.on('error', (error) => {
      const timestamp = new Date().toISOString();
      serverOutput.push(`[${timestamp}] ERROR: ${error.message}`);
      console.error('Server process error:', error);
      serverProcess = null;
    });
    
    serverProcess.on('exit', (code, signal) => {
      const timestamp = new Date().toISOString();
      serverOutput.push(`[${timestamp}] Assetto Corsa Server beendet mit Code ${code}, Signal: ${signal}`);
      console.log(`Server exited with code ${code} and signal ${signal}`);
      serverProcess = null;
    });
    
    // Protokolliere erfolgreichen Start
    serverOutput.push(`[${timestamp}] Assetto Corsa Server erfolgreich gestartet mit PID ${serverProcess.pid}`);
    
    res.json({ 
      message: 'Assetto Corsa Server gestartet',
      pid: serverProcess.pid
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    const timestamp = new Date().toISOString();
    serverOutput.push(`[${timestamp}] FEHLER BEIM STARTEN: ${error.message}`);
    res.status(500).json({ error: 'Fehler beim Starten des Servers: ' + error.message });
  }
});

// Stoppe den Assetto Corsa Server
app.post('/api/server/stop', (req, res) => {
  if (!serverProcess) {
    return res.status(400).json({ error: 'Server läuft nicht' });
  }
  
  try {
    const timestamp = new Date().toISOString();
    serverOutput.push(`[${timestamp}] Stoppe Assetto Corsa Server...`);
    
    // Serverneustart SIGTERM-Signal senden
    serverProcess.kill('SIGTERM');
    
    // Optional: Warte kurz und töte den Prozess gewaltsam, falls er nicht reagiert
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
        serverProcess = null;
      }
    }, 5000);
    
    serverOutput.push(`[${timestamp}] Assetto Corsa Server gestoppt`);
    res.json({ message: 'Assetto Corsa Server gestoppt' });
  } catch (error) {
    console.error('Fehler beim Stoppen des Servers:', error);
    const timestamp = new Date().toISOString();
    serverOutput.push(`[${timestamp}] FEHLER BEIM STOPPEN: ${error.message}`);
    res.status(500).json({ error: 'Fehler beim Stoppen des Servers' });
  }
});

// Hilfsfunktion zum Speichern der Serverkonfiguration
function saveServerConfig() {
  const serverConfigPath = path.join(__dirname, 'config/server_cfg.ini');
  const entryListPath = path.join(__dirname, 'config/entry_list.ini');
  
  // server_cfg.ini erstellen
  const serverCfg = {
    SERVER: {
      NAME: acServerConfig.serverName,
      CARS: acServerConfig.cars.join(';'),
      TRACK: acServerConfig.track,
      CONFIG_TRACK: acServerConfig.trackLayout,
      MAX_CLIENTS: acServerConfig.maxClients,
      PORT: acServerConfig.port,
      HTTP_PORT: acServerConfig.httpPort,
      REGISTER_TO_LOBBY: acServerConfig.registerToLobby,
      PASSWORD: acServerConfig.password,
      ADMIN_PASSWORD: acServerConfig.adminPassword
    }
  };
  
  fs.writeFileSync(serverConfigPath, ini.stringify(serverCfg));
  
  // entry_list.ini erstellen (vereinfacht)
  let entryList = '';
  acServerConfig.cars.forEach((car, index) => {
    entryList += `[CAR_${index}]\n`;
    entryList += `MODEL=${car}\n`;
    entryList += `SKIN=\n`;
    entryList += `BALLAST=0\n`;
    entryList += `RESTRICTOR=0\n\n`;
  });
  
  fs.writeFileSync(entryListPath, entryList);
}

// Catch-all Route für React-App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
  
  // Stellen Sie sicher, dass die Upload- und Konfigurations-Verzeichnisse existieren
  fs.ensureDirSync(path.join(__dirname, 'uploads/cars'));
  fs.ensureDirSync(path.join(__dirname, 'uploads/tracks'));
  fs.ensureDirSync(path.join(__dirname, 'config'));
  
  // Initialen Serverkonfigurationsdateien erstellen
  saveServerConfig();
}); 
