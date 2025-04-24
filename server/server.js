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

// Assetto Corsa Konfiguration
const acConfig = {
  // Pfad zur Assetto Corsa Installation
  installPath: '/pfad/zu/assetto-corsa', // Linux-Pfad - anpassen nach tatsächlichem Pfad
  // Alternativ für Windows: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\assettocorsa'
  
  // Pfad zu den Standard-Autos
  carsPath: function() {
    return path.join(this.installPath, 'content/cars');
  },
  
  // Pfad zu den Standard-Strecken
  tracksPath: function() {
    return path.join(this.installPath, 'content/tracks');
  },
  
  // Pfad zur Server-Executable
  serverPath: '/pfad/zu/acServer' // Linux-Pfad - anpassen nach tatsächlichem Pfad
};

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

// Aktuelle Serverprozess-ID
let serverProcess = null;

// API-Endpunkte

// Abrufen der verfügbaren Assetto Corsa Standard-Autos
app.get('/api/stock-cars', async (req, res) => {
  try {
    const stockCarsPath = acConfig.carsPath();
    
    // Prüfen, ob der Pfad existiert
    if (!fs.existsSync(stockCarsPath)) {
      return res.status(404).json({ 
        error: 'Assetto Corsa Installationspfad nicht gefunden', 
        path: stockCarsPath 
      });
    }
    
    // Standard-Autos auslesen
    const carFolders = await fs.readdir(stockCarsPath);
    const cars = carFolders.filter(item => 
      fs.statSync(path.join(stockCarsPath, item)).isDirectory()
    ).map(car => ({
      id: car,
      name: car,
      isStock: true
    }));
    
    res.json(cars);
  } catch (error) {
    console.error('Fehler beim Abrufen der Standard-Autos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standard-Autos' });
  }
});

// Abrufen der verfügbaren Assetto Corsa Standard-Strecken
app.get('/api/stock-tracks', async (req, res) => {
  try {
    const stockTracksPath = acConfig.tracksPath();
    
    // Prüfen, ob der Pfad existiert
    if (!fs.existsSync(stockTracksPath)) {
      return res.status(404).json({ 
        error: 'Assetto Corsa Installationspfad nicht gefunden', 
        path: stockTracksPath 
      });
    }
    
    // Standard-Strecken auslesen
    const trackFolders = await fs.readdir(stockTracksPath);
    const tracks = await Promise.all(trackFolders.filter(item => 
      fs.statSync(path.join(stockTracksPath, item)).isDirectory()
    ).map(async track => {
      const trackDir = path.join(stockTracksPath, track);
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
        isStock: true
      };
    }));
    
    res.json(tracks);
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
    const [stockResponse, modsResponse] = await Promise.all([
      fetch(`http://localhost:${PORT}/api/stock-cars`).then(res => res.json()),
      fetch(`http://localhost:${PORT}/api/cars`).then(res => res.json())
    ]);
    
    // Alle Autos zusammenführen
    const allCars = [
      ...stockResponse,
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
    const [stockResponse, modsResponse] = await Promise.all([
      fetch(`http://localhost:${PORT}/api/stock-tracks`).then(res => res.json()),
      fetch(`http://localhost:${PORT}/api/tracks`).then(res => res.json())
    ]);
    
    // Alle Strecken zusammenführen
    const allTracks = [
      ...stockResponse,
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

// AC Installationspfad aktualisieren
app.post('/api/ac-config', (req, res) => {
  try {
    const { installPath } = req.body;
    
    if (installPath) {
      acConfig.installPath = installPath;
      
      // Testen, ob der Pfad korrekt ist
      const carsPath = acConfig.carsPath();
      const tracksPath = acConfig.tracksPath();
      
      if (!fs.existsSync(carsPath) || !fs.existsSync(tracksPath)) {
        return res.status(400).json({ 
          error: 'Ungültiger Assetto Corsa Installationspfad',
          validCarsPath: fs.existsSync(carsPath),
          validTracksPath: fs.existsSync(tracksPath)
        });
      }
      
      res.json({ 
        message: 'Assetto Corsa Konfiguration aktualisiert',
        config: {
          installPath: acConfig.installPath,
          carsPath: acConfig.carsPath(),
          tracksPath: acConfig.tracksPath()
        }
      });
    } else {
      res.status(400).json({ error: 'Installationspfad muss angegeben werden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der AC-Konfiguration:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der AC-Konfiguration' });
  }
});

// AC Server Pfad aktualisieren
app.post('/api/server-path', (req, res) => {
  try {
    const { serverPath } = req.body;
    
    if (serverPath) {
      acConfig.serverPath = serverPath;
      res.json({ 
        message: 'Assetto Corsa Server Pfad aktualisiert',
        serverPath: acConfig.serverPath
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
    serverProcess = exec(`${acConfig.serverPath}`, (error) => {
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
