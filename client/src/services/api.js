import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || `${window.location.origin}/api`;

// API Client mit Axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API-Funktionen für Car-Mods
export const carModsApi = {
  // Alle Car-Mods abrufen
  getAllCars: async () => {
    try {
      const response = await apiClient.get('/cars');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Car-Mods:', error);
      throw error;
    }
  },
  
  // Standard-Autos abrufen
  getStockCars: async () => {
    try {
      const response = await apiClient.get('/stock-cars');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Standard-Autos:', error);
      throw error;
    }
  },
  
  // Alle Autos (Standard und Mods) abrufen
  getAllCarsAndStock: async () => {
    try {
      // Versuche zuerst den all-cars Endpunkt
      try {
        const response = await apiClient.get('/all-cars');
        return response.data;
      } catch (allCarsError) {
        // Fallback: Beide Anfragen separat ausführen und selbst kombinieren
        const [standardCars, modCars] = await Promise.all([
          carModsApi.getStockCars().catch(() => []),
          carModsApi.getAllCars()
        ]);
        
        return [...standardCars, ...modCars];
      }
    } catch (error) {
      console.error('Fehler beim Abrufen aller Autos:', error);
      throw error;
    }
  },
  
  // Car-Mod hochladen
  uploadCar: async (carModFile) => {
    try {
      const formData = new FormData();
      formData.append('carmod', carModFile);
      
      const response = await apiClient.post('/upload/car', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Hochladen des Car-Mods:', error);
      throw error;
    }
  },
};

// API-Funktionen für Track-Mods
export const trackModsApi = {
  // Alle Track-Mods abrufen
  getAllTracks: async () => {
    try {
      const response = await apiClient.get('/tracks');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Track-Mods:', error);
      throw error;
    }
  },
  
  // Standard-Strecken abrufen
  getStockTracks: async () => {
    try {
      const response = await apiClient.get('/stock-tracks');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Standard-Strecken:', error);
      throw error;
    }
  },
  
  // Alle Strecken (Standard und Mods) abrufen
  getAllTracksAndStock: async () => {
    try {
      // Versuche zuerst den all-tracks Endpunkt
      try {
        const response = await apiClient.get('/all-tracks');
        return response.data;
      } catch (allTracksError) {
        // Fallback: Beide Anfragen separat ausführen und selbst kombinieren
        const [standardTracks, modTracks] = await Promise.all([
          trackModsApi.getStockTracks().catch(() => []),
          trackModsApi.getAllTracks()
        ]);
        
        return [...standardTracks, ...modTracks];
      }
    } catch (error) {
      console.error('Fehler beim Abrufen aller Strecken:', error);
      throw error;
    }
  },
  
  // Track-Mod hochladen
  uploadTrack: async (trackModFile) => {
    try {
      const formData = new FormData();
      formData.append('trackmod', trackModFile);
      
      const response = await apiClient.post('/upload/track', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Hochladen des Track-Mods:', error);
      throw error;
    }
  },
};

// API-Funktionen für Serververwaltung
export const serverApi = {
  // Serverstatus abrufen
  getStatus: async () => {
    try {
      const response = await apiClient.get('/server/status');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen des Serverstatus:', error);
      throw error;
    }
  },
  
  // Serverausgabe abrufen
  getOutput: async () => {
    try {
      const response = await apiClient.get('/server/output');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Serverausgabe:', error);
      throw error;
    }
  },
  
  // Serverkonfiguration aktualisieren
  updateConfig: async (config) => {
    try {
      const response = await apiClient.post('/server/config', config);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Serverkonfiguration:', error);
      throw error;
    }
  },
  
  // Server starten
  startServer: async (config) => {
    try {
      const response = await apiClient.post('/server/start', config);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Starten des Servers:', error);
      throw error;
    }
  },
  
  // Server stoppen
  stopServer: async () => {
    try {
      const response = await apiClient.post('/server/stop');
      return response.data;
    } catch (error) {
      console.error('Fehler beim Stoppen des Servers:', error);
      throw error;
    }
  },
  
  // AC Server-Pfad aktualisieren
  updateServerPath: async (serverPath) => {
    try {
      const response = await apiClient.post('/server-path', { serverPath });
      return response.data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Server-Pfads:', error);
      throw error;
    }
  }
};

// Exportiere alle API-Dienste
export default {
  carModsApi,
  trackModsApi,
  serverApi,
}; 
