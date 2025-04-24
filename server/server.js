const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
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
  { id: 'abarth500', name: 'Abarth 500 EsseEsse', isStock: true },
  { id: 'abarth500_s1', name: 'Abarth 500 S1', isStock: true },
  { id: 'alfa_romeo_giulietta_qv', name: 'Alfa Romeo Giulietta QV', isStock: true },
  { id: 'alfa_romeo_giulietta_qv_le', name: 'Alfa Romeo Giulietta QV LE', isStock: true },
  { id: 'bmw_1m', name: 'BMW 1M', isStock: true },
  { id: 'bmw_m3_e30', name: 'BMW M3 E30', isStock: true },
  { id: 'bmw_m3_e30_drift', name: 'BMW M3 E30 Drift', isStock: true },
  { id: 'bmw_m3_e30_dtm', name: 'BMW M3 E30 DTM', isStock: true },
  { id: 'bmw_m3_e30_gra', name: 'BMW M3 E30 Group A', isStock: true },
  { id: 'bmw_m3_e30_s1', name: 'BMW M3 E30 Step 1', isStock: true },
  { id: 'bmw_m3_e92', name: 'BMW M3 E92', isStock: true },
  { id: 'bmw_m3_e92_drift', name: 'BMW M3 E92 Drift', isStock: true },
  { id: 'bmw_m3_e92_s1', name: 'BMW M3 E92 Step 1', isStock: true },
  { id: 'bmw_m3_gt2', name: 'BMW M3 GT2', isStock: true },
  { id: 'bmw_z4', name: 'BMW Z4', isStock: true },
  { id: 'bmw_z4_drift', name: 'BMW Z4 Drift', isStock: true },
  { id: 'bmw_z4_gt3', name: 'BMW Z4 GT3', isStock: true },
  { id: 'bmw_z4_s1', name: 'BMW Z4 Step 1', isStock: true },
  { id: 'ferrari_312t', name: 'Ferrari 312T', isStock: true },
  { id: 'ferrari_458', name: 'Ferrari 458', isStock: true },
  { id: 'ferrari_458_gt2', name: 'Ferrari 458 GT2', isStock: true },
  { id: 'ferrari_458_s3', name: 'Ferrari 458 S3', isStock: true },
  { id: 'ferrari_599xxevo', name: 'Ferrari 599XX Evo', isStock: true },
  { id: 'ferrari_f40', name: 'Ferrari F40', isStock: true },
  { id: 'ferrari_f40_s3', name: 'Ferrari F40 S3', isStock: true },
  { id: 'ferrari_laferrari', name: 'Ferrari LaFerrari', isStock: true },
  { id: 'ks_abarth500_assetto_corse', name: 'Abarth 500 Assetto Corse', isStock: true },
  { id: 'ks_abarth_595ss', name: 'Abarth 595 SS', isStock: true },
  { id: 'ks_abarth_595ss_s1', name: 'Abarth 595 SS S1', isStock: true },
  { id: 'ks_abarth_595ss_s2', name: 'Abarth 595 SS S2', isStock: true },
  { id: 'ks_alfa_33_stradale', name: 'Alfa Romeo 33 Stradale', isStock: true },
  { id: 'ks_alfa_giulia_qv', name: 'Alfa Romeo Giulia Quadrifoglio', isStock: true },
  { id: 'ks_alfa_mito_qv', name: 'Alfa Romeo MiTo QV', isStock: true },
  { id: 'ks_audi_a1s1', name: 'Audi S1', isStock: true },
  { id: 'ks_audi_r18_etron_quattro', name: 'Audi R18 e-tron quattro', isStock: true },
  { id: 'ks_audi_r8_lms', name: 'Audi R8 LMS', isStock: true },
  { id: 'ks_audi_r8_lms_2016', name: 'Audi R8 LMS 2016', isStock: true },
  { id: 'ks_audi_r8_plus', name: 'Audi R8 V10 Plus', isStock: true },
  { id: 'ks_audi_sport_quattro', name: 'Audi Sport Quattro', isStock: true },
  { id: 'ks_audi_sport_quattro_rally', name: 'Audi Sport Quattro Rally', isStock: true },
  { id: 'ks_audi_sport_quattro_s1', name: 'Audi Sport Quattro S1 E2', isStock: true },
  { id: 'ks_audi_tt_cup', name: 'Audi TT Cup', isStock: true },
  { id: 'ks_audi_tt_vln', name: 'Audi TT RS VLN', isStock: true },
  // ... weitere Autos könnten hier hinzugefügt werden
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
    
    // Wenn es eine ZIP-Datei ist, entpacken
    if (path.extname(filePath).toLowerCase() === '.zip') {
      await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: path.join(__dirname, 'uploads/cars') }))
        .promise();
      
      // ZIP-Datei nach dem Entpacken löschen
      await fs.unlink(filePath);
    }
    
    res.json({ message: 'Car-Mod erfolgreich hochgeladen', filename: req.file.originalname });
  } catch (error) {
    console.error('Fehler beim Hochladen des Car-Mods:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen des Car-Mods' });
  }
});

// Hochladen von Track-Mods
app.post('/api/upload/track', uploadTrack.single('trackmod'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const filePath = req.file.path;
    
    // Wenn es eine ZIP-Datei ist, entpacken
    if (path.extname(filePath).toLowerCase() === '.zip') {
      await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: path.join(__dirname, 'uploads/tracks') }))
        .promise();
      
      // ZIP-Datei nach dem Entpacken löschen
      await fs.unlink(filePath);
    }
    
    res.json({ message: 'Track-Mod erfolgreich hochgeladen', filename: req.file.originalname });
  } catch (error) {
    console.error('Fehler beim Hochladen des Track-Mods:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen des Track-Mods' });
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
  res.json({ running: isRunning });
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
    
    // Server starten
    serverProcess = exec(`${acServerPath}`, (error) => {
      if (error) {
        console.error('Fehler beim Starten des Servers:', error);
        serverProcess = null;
      }
    });
    
    serverProcess.on('exit', () => {
      console.log('Assetto Corsa Server beendet');
      serverProcess = null;
    });
    
    res.json({ message: 'Assetto Corsa Server gestartet' });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    res.status(500).json({ error: 'Fehler beim Starten des Servers' });
  }
});

// Stoppe den Assetto Corsa Server
app.post('/api/server/stop', (req, res) => {
  if (!serverProcess) {
    return res.status(400).json({ error: 'Server läuft nicht' });
  }
  
  try {
    // Serverneustart SIGTERM-Signal senden
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    
    res.json({ message: 'Assetto Corsa Server gestoppt' });
  } catch (error) {
    console.error('Fehler beim Stoppen des Servers:', error);
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
