import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Alert, InputGroup, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlay, FaStop, FaCar, FaRoad, FaLink, FaCopy, FaGamepad, FaGlobe } from 'react-icons/fa';
import { serverApi, carModsApi, trackModsApi } from '../services/api';
import ServerTerminal from './ServerTerminal';

const Dashboard = ({ serverStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    cars: 0,
    tracks: 0
  });
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [loadingConnectionInfo, setLoadingConnectionInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  useEffect(() => {
    fetchStats();
    fetchConnectionInfo();
  }, []);
  
  useEffect(() => {
    if (serverStatus && serverStatus.running) {
      fetchConnectionInfo();
    }
  }, [serverStatus]);
  
  const fetchStats = async () => {
    try {
      const [cars, tracks] = await Promise.all([
        carModsApi.getAllCars(),
        trackModsApi.getAllTracks()
      ]);
      
      setStats({
        cars: cars.length,
        tracks: tracks.length
      });
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      toast.error('Fehler beim Laden der Statistiken');
    }
  };
  
  const fetchConnectionInfo = async () => {
    try {
      setLoadingConnectionInfo(true);
      const info = await serverApi.getConnectionInfo();
      setConnectionInfo(info);
    } catch (error) {
      console.error('Fehler beim Laden der Verbindungsinformationen:', error);
      // Keine Toast-Nachricht hier, da es nicht kritisch ist
    } finally {
      setLoadingConnectionInfo(false);
    }
  };
  
  const handleStartServer = async () => {
    try {
      setLoading(true);
      await serverApi.startServer();
      toast.success('Server erfolgreich gestartet');
      onStatusChange();
      fetchConnectionInfo(); // Lade Verbindungsinformationen nach dem Serverstart
    } catch (error) {
      console.error('Fehler beim Starten des Servers:', error);
      toast.error('Fehler beim Starten des Servers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStopServer = async () => {
    try {
      setLoading(true);
      await serverApi.stopServer();
      toast.success('Server erfolgreich gestoppt');
      onStatusChange();
    } catch (error) {
      console.error('Fehler beim Stoppen des Servers:', error);
      toast.error('Fehler beim Stoppen des Servers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTerminalAction = (action) => {
    if (action === 'start' || action === 'stop') {
      onStatusChange();
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        toast.success('Link in die Zwischenablage kopiert!');
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Fehler beim Kopieren in die Zwischenablage:', err);
        toast.error('Fehler beim Kopieren in die Zwischenablage');
      });
  };
  
  // Komponente für Serververbindungsinformationen
  const ServerConnectionCard = () => {
    if (!serverStatus || !serverStatus.running) {
      return (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div><FaLink className="me-2" /> Server-Verbindung</div>
          </Card.Header>
          <Card.Body>
            <Alert variant="info">
              Starten Sie den Server, um einen Verbindungslink zu generieren.
            </Alert>
          </Card.Body>
        </Card>
      );
    }
    
    if (loadingConnectionInfo || !connectionInfo) {
      return (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div><FaLink className="me-2" /> Server-Verbindung</div>
          </Card.Header>
          <Card.Body className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Lade...</span>
            </Spinner>
            <p className="mt-2">Verbindungsinformationen werden geladen...</p>
          </Card.Body>
        </Card>
      );
    }
    
    return (
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div><FaLink className="me-2" /> Server-Verbindung</div>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={fetchConnectionInfo}
          >
            Aktualisieren
          </Button>
        </Card.Header>
        <Card.Body>
          <Alert variant="success">
            <strong>Server läuft!</strong> Nutzen Sie die folgenden Links, um sich zu verbinden:
          </Alert>
          
          <h5><FaGamepad className="me-2" /> Assetto Corsa Content Manager</h5>
          <InputGroup className="mb-3">
            <Form.Control
              value={connectionInfo.contentManagerLink}
              readOnly
            />
            <Button 
              variant="outline-primary" 
              onClick={() => copyToClipboard(connectionInfo.contentManagerLink)}
            >
              <FaCopy className="me-2" /> Kopieren
            </Button>
            <Button 
              variant="primary" 
              as="a" 
              href={connectionInfo.contentManagerLink}
            >
              Öffnen
            </Button>
          </InputGroup>
          
          <h5><FaGlobe className="me-2" /> Direkte HTTP-Verbindung</h5>
          <InputGroup className="mb-3">
            <Form.Control
              value={connectionInfo.directLink}
              readOnly
            />
            <Button 
              variant="outline-primary" 
              onClick={() => copyToClipboard(connectionInfo.directLink)}
            >
              <FaCopy className="me-2" /> Kopieren
            </Button>
            <Button 
              variant="primary" 
              as="a" 
              href={connectionInfo.directLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Öffnen
            </Button>
          </InputGroup>
          
          <h5>Server-Informationen</h5>
          <p><strong>Name:</strong> {connectionInfo.serverName}</p>
          <p><strong>IP-Adresse:</strong> {connectionInfo.ipAddress}</p>
          <p><strong>Port:</strong> {connectionInfo.port}</p>
          <p><strong>HTTP-Port:</strong> {connectionInfo.httpPort}</p>
        </Card.Body>
      </Card>
    );
  };
  
  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>
      
      <ServerTerminal 
        serverStatus={serverStatus} 
        onAction={handleTerminalAction} 
      />
      
      <Row className="mt-4">
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>Verfügbare Mods</Card.Header>
            <Card.Body>
              <Row>
                <Col xs={6}>
                  <div className="d-flex align-items-center">
                    <FaCar className="me-2 text-primary" size={24} />
                    <div>
                      <h5>Fahrzeuge</h5>
                      <h3>{stats.cars}</h3>
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="d-flex align-items-center">
                    <FaRoad className="me-2 text-success" size={24} />
                    <div>
                      <h5>Strecken</h5>
                      <h3>{stats.tracks}</h3>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>Schnellzugriff</Card.Header>
            <Card.Body>
              <Row>
                <Col>
                  <Button 
                    variant="outline-primary" 
                    className="w-100 mb-2" 
                    href="/cars"
                  >
                    <FaCar className="me-2" /> Fahrzeug-Mods verwalten
                  </Button>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Button 
                    variant="outline-success" 
                    className="w-100 mb-2" 
                    href="/tracks"
                  >
                    <FaRoad className="me-2" /> Strecken-Mods verwalten
                  </Button>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Button 
                    variant="outline-dark" 
                    className="w-100" 
                    href="/config"
                  >
                    Serverkonfiguration
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <ServerConnectionCard />
        </Col>
      </Row>
      
      {(!stats.cars || !stats.tracks) && (
        <Alert variant="warning" className="mt-4">
          <Alert.Heading>Server-Setup unvollständig</Alert.Heading>
          <p>
            Um den Assetto Corsa Server zu starten, benötigen Sie mindestens einen Fahrzeug-Mod und eine Strecke. 
            Bitte laden Sie die erforderlichen Mods hoch, bevor Sie den Server starten.
          </p>
        </Alert>
      )}
    </div>
  );
};

export default Dashboard; 
