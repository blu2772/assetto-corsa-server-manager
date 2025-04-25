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

// Assetto Corsa Konfiguration
const acConfig = {
  // Pfad zur Assetto Corsa Installation
  acPath: process.env.AC_PATH || '/home/steam/assetto', // Standard für den Assetto Corsa Server
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

// Initial Pfade setzen
updateAcPaths();

// Funktionen zum Lesen der Assetto Corsa Inhalte aus dem Installationsverzeichnis

// Funktion zum Lesen der verfügbaren Autos
async function getStockCarsFromDisk() {
  try {
    if (!fs.existsSync(acConfig.carsPath)) {
      console.warn(`Warnung: Pfad ${acConfig.carsPath} existiert nicht`);
      return [];
    }
    
    const carFolders = await fs.readdir(acConfig.carsPath);
    const cars = carFolders
      .filter(car => fs.statSync(path.join(acConfig.carsPath, car)).isDirectory())
      .map(car => ({
        id: car,
        name: car.replace(/_/g, ' '),
        isStock: true
      }));
    
    console.log(`${cars.length} Standard-Autos aus dem Verzeichnis geladen`);
    return cars;
  } catch (error) {
    console.error('Fehler beim Lesen der Standard-Autos:', error);
    return [];
  }
}

// Funktion zum Lesen der verfügbaren Strecken und ihrer Layouts
async function getStockTracksFromDisk() {
  try {
    if (!fs.existsSync(acConfig.tracksPath)) {
      console.warn(`Warnung: Pfad ${acConfig.tracksPath} existiert nicht`);
      return [];
    }
    
    const trackFolders = await fs.readdir(acConfig.tracksPath);
    const tracks = await Promise.all(trackFolders
      .filter(track => fs.statSync(path.join(acConfig.tracksPath, track)).isDirectory())
      .map(async track => {
        const trackDir = path.join(acConfig.tracksPath, track);
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
          id: track,
          name: track.replace(/_/g, ' '),
          layouts: layouts.map(layout => layout.name || ''),
          isStock: true
        };
      }));
    
    console.log(`${tracks.length} Standard-Strecken aus dem Verzeichnis geladen`);
    return tracks;
  } catch (error) {
    console.error('Fehler beim Lesen der Standard-Strecken:', error);
    return [];
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
    const stockCars = await getStockCarsFromDisk();
    res.json(stockCars);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Autos' });
  }
});

// Abrufen der verfügbaren Assetto Corsa Standard-Strecken
app.get('/api/stock-tracks', async (req, res) => {
  try {
    const stockTracks = await getStockTracksFromDisk();
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

// GET: Alle Cars und Tracks über einen Endpunkt abrufen
app.get('/api/all-cars', async (req, res) => {
  try {
    // Standard-Autos direkt aus dem Verzeichnis lesen
    const stockCars = await getStockCarsFromDisk();
    
    // Mod-Autos abrufen
    const carsDir = path.join(__dirname, 'uploads/cars');
    let modCars = [];
    
    try {
      if (fs.existsSync(carsDir)) {
        const carFolders = await fs.readdir(carsDir);
        modCars = carFolders.filter(item => 
          fs.statSync(path.join(carsDir, item)).isDirectory()
        ).map(car => ({
          id: car,
          name: car,
          isStock: false
        }));
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
    // Standard-Strecken direkt aus dem Verzeichnis lesen
    const stockTracks = await getStockTracksFromDisk();
    
    // Mod-Strecken abrufen
    const tracksDir = path.join(__dirname, 'uploads/tracks');
    let modTracks = [];
    
    try {
      if (fs.existsSync(tracksDir)) {
        const trackFolders = await fs.readdir(tracksDir);
        const tracks = trackFolders.filter(item => 
          fs.statSync(path.join(tracksDir, item)).isDirectory()
        );
        
        // Für jeden Track die verfügbaren Layouts abrufen
        modTracks = await Promise.all(tracks.map(async track => {
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
            id: track,
            name: track,
            layouts: layouts.map(layout => layout.name || ''),
            isStock: false
          };
        }));
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
    
    // Die Konfiguration des Benutzers mit der verbesserten saveServerConfig-Funktion speichern
    // Diese Funktion enthält Standardwerte für Wetter, dynamische Strecke, etc.
    const result = saveServerConfig(req.body);
    
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    
    // Aktualisiere die globale Server-Konfiguration
    acServerConfig = { ...acServerConfig, ...req.body };
    
    res.json({
      message: 'Konfiguration erfolgreich aktualisiert',
      config: req.body,
      paths: result.paths
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
    
    // Aktuelle Konfiguration sichern oder neue Konfiguration verwenden
    const config = req.body || acServerConfig;
    
    // Konfiguration speichern, um sicherzustellen, dass Wetter korrekt konfiguriert ist
    // Dies verhindert den "invalid argument to Intn" Fehler
    const configResult = saveServerConfig(config);
    
    if (configResult.error) {
      return res.status(500).json({ error: configResult.error });
    }
    
    // Verzeichnis überprüfen, in dem sich der Server befindet
    const acServerDir = path.dirname(acServerPath);
    
    // Server starten
    serverStartTime = Date.now();
    serverOutput = []; // Ausgabe zurücksetzen
    
    acServerProcess = spawn(acServerPath, [], { 
      cwd: acServerDir, 
      env: { ...process.env },
      detached: false
    });

    console.log(`Server gestartet mit PID: ${acServerProcess.pid}`);

    acServerProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`AC Server Ausgabe: ${output}`);
      // Ausgabe für spätere Anzeige speichern (begrenzt auf die letzten 1000 Zeilen)
      serverOutput.push(...output.split('\n'));
      if (serverOutput.length > 1000) {
        serverOutput = serverOutput.slice(-1000);
      }
    });

    acServerProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      console.error(`AC Server Fehler: ${error}`);
      // Fehler zur Ausgabe hinzufügen
      serverOutput.push(`FEHLER: ${error}`);
      if (serverOutput.length > 1000) {
        serverOutput = serverOutput.slice(-1000);
      }
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

// Speichern der Serverkonfiguration
function saveServerConfig(config) {
  try {
    if (!config) {
      console.error("Fehler: Keine Konfiguration angegeben");
      return { error: "Keine Konfiguration angegeben" };
    }
    
    // Stelle sicher, dass der Konfigurationsordner existiert
    const cfgDir = path.join(path.dirname(acServerPath), 'cfg');
    fs.ensureDirSync(cfgDir);
    
    // Pfade für die Konfigurationsdateien
    const serverCfgPath = path.join(cfgDir, 'server_cfg.ini');
    const entryListPath = path.join(cfgDir, 'entry_list.ini');
    
    // Standardwerte für Konfigurationsabschnitte, die fehlen
    // Dies verhindert Server-Abstürze aufgrund fehlender Konfigurationsparameter
    const defaultConfig = {
      // Standard-Wetterkonfiguration, verhindert den "invalid argument to Intn" Fehler
      WEATHER: {
        GRAPHICS: "3_clear",
        BASE_TEMPERATURE_AMBIENT: 18,
        BASE_TEMPERATURE_ROAD: 6,
        VARIATION_AMBIENT: 2,
        VARIATION_ROAD: 1,
        WIND_BASE_SPEED_MIN: 0,
        WIND_BASE_SPEED_MAX: 10,
        WIND_BASE_DIRECTION: 30,
        WIND_VARIATION_DIRECTION: 15
      },
      // Standardwerte für Dynamischer Streckengrip
      DYNAMIC_TRACK: {
        SESSION_START: 90,
        RANDOMNESS: 2,
        LAP_GAIN: 1,
        SESSION_TRANSFER: 50
      },
      // Standard-Renneinstellungen
      RACE: {
        RACE_OVER_TIME: 40,
        RESULT_SCREEN_TIME: 60
      }
    };
    
    // Erstellen der server_cfg.ini-Datei im INI-Format
    let serverCfgContent = "";
    
    // Servereinstellungen
    serverCfgContent += "[SERVER]\n";
    serverCfgContent += `NAME=${config.serverName || 'Assetto Corsa Server'}\n`;
    serverCfgContent += `CARS=${(config.cars || []).join(';')}\n`;
    serverCfgContent += `TRACK=${config.track || 'monza'}\n`;
    serverCfgContent += `CONFIG_TRACK=${config.trackLayout || ''}\n`;
    serverCfgContent += `MAX_CLIENTS=${config.maxClients || 15}\n`;
    serverCfgContent += `PORT=${config.port || 9600}\n`;
    serverCfgContent += `HTTP_PORT=${config.httpPort || 8081}\n`;
    serverCfgContent += `REGISTER_TO_LOBBY=${config.registerToLobby || 1}\n`;
    serverCfgContent += `ADMIN_PASSWORD=${config.adminPassword || 'adminpass'}\n`;
    serverCfgContent += `PASSWORD=${config.password || ''}\n`;
    
    // Weitere Server-Einstellungen können hier hinzugefügt werden
    
    // Praxis-Einstellungen (Freies Fahren)
    serverCfgContent += "\n[PRACTICE]\n";
    serverCfgContent += `NAME=Freies Fahren\n`;
    serverCfgContent += `TIME=${config.practiceTime || 30}\n`;
    serverCfgContent += `IS_OPEN=1\n`;
    
    // Qualifikations-Einstellungen
    serverCfgContent += "\n[QUALIFY]\n";
    serverCfgContent += `NAME=Qualifikation\n`;
    serverCfgContent += `TIME=${config.qualifyTime || 15}\n`;
    serverCfgContent += `IS_OPEN=1\n`;
    
    // Rennen-Einstellungen
    serverCfgContent += "\n[RACE]\n";
    serverCfgContent += `NAME=Rennen\n`;
    serverCfgContent += `TIME=${config.raceTime || 20}\n`;
    serverCfgContent += `LAPS=${config.raceLaps || 5}\n`;
    serverCfgContent += `IS_OPEN=1\n`;
    serverCfgContent += `RACE_OVER_TIME=${config.raceOverTime || defaultConfig.RACE.RACE_OVER_TIME}\n`;
    serverCfgContent += `RESULT_SCREEN_TIME=${config.resultScreenTime || defaultConfig.RACE.RESULT_SCREEN_TIME}\n`;
    
    // Wetter-Einstellungen - WICHTIG: Verhindert den "invalid argument to Intn" Fehler
    serverCfgContent += "\n[WEATHER_0]\n";
    
    if (config.weather) {
      // Wenn Wettereinstellungen in der Konfiguration vorhanden sind, diese verwenden
      serverCfgContent += `GRAPHICS=${config.weather.graphics || defaultConfig.WEATHER.GRAPHICS}\n`;
      serverCfgContent += `BASE_TEMPERATURE_AMBIENT=${config.weather.ambientTemp || defaultConfig.WEATHER.BASE_TEMPERATURE_AMBIENT}\n`;
      serverCfgContent += `BASE_TEMPERATURE_ROAD=${config.weather.roadTemp || defaultConfig.WEATHER.BASE_TEMPERATURE_ROAD}\n`;
      serverCfgContent += `VARIATION_AMBIENT=${config.weather.ambientVariation || defaultConfig.WEATHER.VARIATION_AMBIENT}\n`;
      serverCfgContent += `VARIATION_ROAD=${config.weather.roadVariation || defaultConfig.WEATHER.VARIATION_ROAD}\n`;
      
      // Windeinstellungen
      serverCfgContent += `WIND_BASE_SPEED_MIN=${config.weather.windSpeedMin || defaultConfig.WEATHER.WIND_BASE_SPEED_MIN}\n`;
      serverCfgContent += `WIND_BASE_SPEED_MAX=${config.weather.windSpeedMax || defaultConfig.WEATHER.WIND_BASE_SPEED_MAX}\n`;
      serverCfgContent += `WIND_BASE_DIRECTION=${config.weather.windDirection || defaultConfig.WEATHER.WIND_BASE_DIRECTION}\n`;
      serverCfgContent += `WIND_VARIATION_DIRECTION=${config.weather.windVariation || defaultConfig.WEATHER.WIND_VARIATION_DIRECTION}\n`;
    } else {
      // Wenn keine Wettereinstellungen vorhanden sind, Standardwerte verwenden
      serverCfgContent += `GRAPHICS=${defaultConfig.WEATHER.GRAPHICS}\n`;
      serverCfgContent += `BASE_TEMPERATURE_AMBIENT=${defaultConfig.WEATHER.BASE_TEMPERATURE_AMBIENT}\n`;
      serverCfgContent += `BASE_TEMPERATURE_ROAD=${defaultConfig.WEATHER.BASE_TEMPERATURE_ROAD}\n`;
      serverCfgContent += `VARIATION_AMBIENT=${defaultConfig.WEATHER.VARIATION_AMBIENT}\n`;
      serverCfgContent += `VARIATION_ROAD=${defaultConfig.WEATHER.VARIATION_ROAD}\n`;
      
      // Windeinstellungen
      serverCfgContent += `WIND_BASE_SPEED_MIN=${defaultConfig.WEATHER.WIND_BASE_SPEED_MIN}\n`;
      serverCfgContent += `WIND_BASE_SPEED_MAX=${defaultConfig.WEATHER.WIND_BASE_SPEED_MAX}\n`;
      serverCfgContent += `WIND_BASE_DIRECTION=${defaultConfig.WEATHER.WIND_BASE_DIRECTION}\n`;
      serverCfgContent += `WIND_VARIATION_DIRECTION=${defaultConfig.WEATHER.WIND_VARIATION_DIRECTION}\n`;
    }
    
    // Dynamischer Streckengrip
    serverCfgContent += "\n[DYNAMIC_TRACK]\n";
    
    if (config.dynamicTrack) {
      serverCfgContent += `SESSION_START=${config.dynamicTrack.sessionStart || defaultConfig.DYNAMIC_TRACK.SESSION_START}\n`;
      serverCfgContent += `RANDOMNESS=${config.dynamicTrack.randomness || defaultConfig.DYNAMIC_TRACK.RANDOMNESS}\n`;
      serverCfgContent += `LAP_GAIN=${config.dynamicTrack.lapGain || defaultConfig.DYNAMIC_TRACK.LAP_GAIN}\n`;
      serverCfgContent += `SESSION_TRANSFER=${config.dynamicTrack.sessionTransfer || defaultConfig.DYNAMIC_TRACK.SESSION_TRANSFER}\n`;
    } else {
      serverCfgContent += `SESSION_START=${defaultConfig.DYNAMIC_TRACK.SESSION_START}\n`;
      serverCfgContent += `RANDOMNESS=${defaultConfig.DYNAMIC_TRACK.RANDOMNESS}\n`;
      serverCfgContent += `LAP_GAIN=${defaultConfig.DYNAMIC_TRACK.LAP_GAIN}\n`;
      serverCfgContent += `SESSION_TRANSFER=${defaultConfig.DYNAMIC_TRACK.SESSION_TRANSFER}\n`;
    }
    
    // Erstellen der entry_list.ini-Datei für die Autoeinträge
    let entryListContent = "";
    const cars = config.cars || [];
    
    cars.forEach((car, index) => {
      entryListContent += `[CAR_${index}]\n`;
      entryListContent += `MODEL=${car}\n`;
      entryListContent += `SKIN=\n`; // Standard-Skin
      entryListContent += `SPECTATOR_MODE=0\n`;
      entryListContent += `DRIVERNAME=\n`;
      entryListContent += `TEAM=\n`;
      entryListContent += `GUID=\n`;
      entryListContent += `BALLAST=0\n`;
      entryListContent += `RESTRICTOR=0\n\n`;
    });
    
    // Schreiben der Konfigurationsdateien
    fs.writeFileSync(serverCfgPath, serverCfgContent);
    fs.writeFileSync(entryListPath, entryListContent);
    
    console.log(`Konfigurationen gespeichert in:\n- Server Config: ${serverCfgPath}\n- Entry List: ${entryListPath}`);
    
    return { 
      success: true, 
      paths: { 
        serverCfg: serverCfgPath, 
        entryList: entryListPath 
      } 
    };
  } catch (error) {
    console.error("Fehler beim Speichern der Serverkonfiguration:", error);
    return { error: `Fehler beim Speichern der Konfiguration: ${error.message}` };
  }
} 
