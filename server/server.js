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

// Pfad zur Assetto Corsa Server-Executable
let acServerPath = '/pfad/zu/acServer'; // Linux-Pfad - anpassen nach tatsächlichem Pfad

// Aktuelle Serverprozess-ID
let serverProcess = null;

// API-Endpunkte

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
    );
    
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
        layouts: layouts.map(layout => layout.name || '')
      };
    }));
    
    res.json(tracksWithLayouts);
  } catch (error) {
    console.error('Fehler beim Abrufen der Track-Mods:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Track-Mods' });
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
