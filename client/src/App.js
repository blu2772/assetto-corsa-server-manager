import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Navbar, Container, Nav } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import { serverApi } from './services/api';

// Importiere Komponenten
import Dashboard from './components/Dashboard';
import CarMods from './components/CarMods';
import TrackMods from './components/TrackMods';
import ServerConfig from './components/ServerConfig';
import ServerSettings from './components/ServerSettings';

function App() {
  const [serverStatus, setServerStatus] = useState({ running: false });
  const [statusLoading, setStatusLoading] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    // Serverstatus beim Start und alle 5 Sekunden aktualisieren
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchServerStatus = async () => {
    try {
      setStatusLoading(true);
      const status = await serverApi.getStatus();
      setServerStatus(status);
    } catch (error) {
      console.error('Fehler beim Abrufen des Serverstatus:', error);
    } finally {
      setStatusLoading(false);
    }
  };
  
  const updateServerStatus = () => {
    fetchServerStatus();
  };
  
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">Assetto Corsa Server Manager</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link 
                as={Link} 
                to="/" 
                active={location.pathname === '/'}
              >
                Dashboard
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/cars" 
                active={location.pathname === '/cars'}
              >
                Fahrzeug-Mods
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/tracks" 
                active={location.pathname === '/tracks'}
              >
                Strecken-Mods
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/config" 
                active={location.pathname === '/config'}
              >
                Serverkonfiguration
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/server-settings" 
                active={location.pathname === '/server-settings'}
              >
                Server-Einstellungen
              </Nav.Link>
            </Nav>
            <Navbar.Text>
              Server Status: 
              <span className={serverStatus.running ? "text-success ms-2" : "text-danger ms-2"}>
                <span className={`status-indicator ${serverStatus.running ? 'status-indicator-running' : 'status-indicator-stopped'}`}></span>
                {statusLoading ? 'Prüfe...' : serverStatus.running ? "Läuft" : "Gestoppt"}
              </span>
            </Navbar.Text>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <Container className="main-container">
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                serverStatus={serverStatus} 
                onStatusChange={updateServerStatus} 
              />
            } 
          />
          <Route path="/cars" element={<CarMods />} />
          <Route path="/tracks" element={<TrackMods />} />
          <Route path="/config" element={<ServerConfig />} />
          <Route path="/server-settings" element={<ServerSettings />} />
        </Routes>
      </Container>
      
      <ToastContainer position="bottom-right" />
    </>
  );
}

export default App; 
