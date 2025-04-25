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

// Laden der Standard-Inhalte aus JSON-Dateien
let stockCars = [];
let stockTracks = [];

try {
  const stockCarsPath = path.join(__dirname, 'config/stockCars.json');
  const stockTracksPath = path.join(__dirname, 'config/stockTracks.json');
  
  if (fs.existsSync(stockCarsPath)) {
    stockCars = JSON.parse(fs.readFileSync(stockCarsPath, 'utf8'));
    console.log(`${stockCars.length} Standard-Autos geladen`);
  } else {
    console.warn('Warnung: stockCars.json nicht gefunden');
  }
  
  if (fs.existsSync(stockTracksPath)) {
    stockTracks = JSON.parse(fs.readFileSync(stockTracksPath, 'utf8'));
    console.log(`${stockTracks.length} Standard-Strecken geladen`);
  } else {
    console.warn('Warnung: stockTracks.json nicht gefunden');
  }
} catch (error) {
  console.error('Fehler beim Laden der Standard-Inhalte:', error);
}

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
    if (acConfig.acPath && acConfig.carsPath && fs.existsSync(acConfig.carsPath)) {
      // Versuche Autos aus der AC-Installation zu lesen
      try {
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
        
        return res.json(cars);
      } catch (error) {
        console.error('Fehler beim Auslesen der Standard-Autos aus der Installation:', error);
        // Fallback zur statischen Liste, wenn Fehler auftreten
      }
    }
    
    // Wenn kein AC-Pfad konfiguriert ist oder Fehler auftreten, verwende die statische Liste
    console.log('Verwende statische Standard-Auto-Liste');
    return res.json(stockCars);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Autos' });
  }
});

// GET: Alle Standard-Strecken von der AC-Installation abrufen
app.get('/api/stock-tracks', (req, res) => {
  try {
    // Überprüfen, ob der AC-Pfad konfiguriert ist
    if (acConfig.acPath && acConfig.tracksPath && fs.existsSync(acConfig.tracksPath)) {
      // Versuche Strecken aus der AC-Installation zu lesen
      try {
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
        
        return res.json(tracks);
      } catch (error) {
        console.error('Fehler beim Auslesen der Standard-Strecken aus der Installation:', error);
        // Fallback zur statischen Liste, wenn Fehler auftreten
      }
    }
    
    // Wenn kein AC-Pfad konfiguriert ist oder Fehler auftreten, verwende die statische Liste
    console.log('Verwende statische Standard-Strecken-Liste');
    return res.json(stockTracks);
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
