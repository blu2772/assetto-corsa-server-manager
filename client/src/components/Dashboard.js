import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Row, Col, Alert, InputGroup, Form, Spinner, Image, ListGroup, Badge, Accordion } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlay, FaStop, FaCar, FaRoad, FaLink, FaCopy, FaGamepad, FaGlobe, FaQrcode, FaServer, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
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
  const [error, setError] = useState(null);
  
  const qrCodeRef = useRef(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  useEffect(() => {
    fetchStats();
    fetchConnectionInfo();
  }, []);
  
  useEffect(() => {
    if (serverStatus && serverStatus.running) {
      fetchConnectionInfo();
    }
  }, [serverStatus]);
  
  useEffect(() => {
    if (connectionInfo && connectionInfo.ipAddress) {
      // Google Charts API für QR-Code Generierung
      const qrCodeData = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(connectionInfo.contentManagerLink)}&choe=UTF-8`;
      setQrCodeUrl(qrCodeData);
    }
  }, [connectionInfo]);
  
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
  
  // Informationskarte für die Verzeichnisstruktur und Arbeitsabläufe
  const ServerInfoCard = () => (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <FaInfoCircle className="me-2" /> Assetto Corsa Server-Informationen
        </div>
      </Card.Header>
      <Card.Body>
        <Accordion defaultActiveKey="0">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <FaServer className="me-2" /> Verzeichnisstruktur des Servers
            </Accordion.Header>
            <Accordion.Body>
              <p>Der Assetto Corsa Dedicated Server ist typischerweise wie folgt aufgebaut:</p>
              <ListGroup variant="flush" className="mb-3">
                <ListGroup.Item>
                  <strong>cfg/</strong>: Enthält alle Konfigurationsdateien, u. a. <code>server_cfg.ini</code> und <code>entry_list.ini</code>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>content/cars/</strong>: Hier liegen die Auto-Mods
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>content/tracks/</strong>: Hier liegen die Strecken-Mods
                </ListGroup.Item>
              </ListGroup>
              
              <Alert variant="info">
                <FaInfoCircle className="me-2" />
                Diese Webanwendung nutzt diese Struktur, um Inhalte direkt in die passenden Verzeichnisse zu laden und Konfigurationsdateien zu erstellen.
              </Alert>
            </Accordion.Body>
          </Accordion.Item>
          
          <Accordion.Item eventKey="1">
            <Accordion.Header>
              <FaInfoCircle className="me-2" /> Mods hochladen
            </Accordion.Header>
            <Accordion.Body>
              <p>So funktioniert der Upload von Mods:</p>
              
              <ol>
                <li>Laden Sie <strong>ZIP-Dateien</strong> der Mods hoch (empfohlen)</li>
                <li>Die Anwendung entpackt sie automatisch in die passenden Verzeichnisse:
                  <ul>
                    <li>Autos nach <code>content/cars/</code></li>
                    <li>Strecken nach <code>content/tracks/</code></li>
                  </ul>
                </li>
                <li>Nach dem Upload sollten Sie den Server neu starten, damit neue Inhalte erkannt werden</li>
              </ol>
              
              <Alert variant="warning">
                <FaExclamationTriangle className="me-2" />
                Stellen Sie sicher, dass die hochgeladenen ZIP-Dateien korrekt strukturiert sind! Der Inhalt der ZIP-Datei sollte direkt den Mod-Ordner enthalten (z.B. <code>ks_ferrari488/</code>).
              </Alert>
            </Accordion.Body>
          </Accordion.Item>
          
          <Accordion.Item eventKey="2">
            <Accordion.Header>
              <FaInfoCircle className="me-2" /> Konfigurationsdateien
            </Accordion.Header>
            <Accordion.Body>
              <p>Die wichtigsten Konfigurationsdateien im <code>cfg/</code>-Ordner:</p>
              
              <ListGroup variant="flush" className="mb-3">
                <ListGroup.Item>
                  <strong>server_cfg.ini</strong>: Hauptkonfigurationsdatei des Servers
                  <ul className="mt-2">
                    <li><code>TRACK</code>: Name des Strecken-Ordners</li>
                    <li><code>CONFIG_TRACK</code>: Layout-Ordner (optional)</li>
                    <li><code>CARS</code>: Semikolon-separierte Liste der erlaubten Autos</li>
                  </ul>
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>entry_list.ini</strong>: Definition der verfügbaren Autos und ihrer Skins
                </ListGroup.Item>
              </ListGroup>
              
              <Alert variant="success">
                <FaInfoCircle className="me-2" />
                Diese Anwendung erstellt diese Konfigurationsdateien automatisch basierend auf Ihren Einstellungen im Bereich "Serverkonfiguration".
              </Alert>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
  
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
          
          <div className="mb-3">
            <Button 
              variant="outline-success" 
              as="a" 
              href={`ac://${connectionInfo.ipAddress}:${connectionInfo.port}`}
              className="me-2"
            >
              Alternative Verbindung
            </Button>
            <Button 
              variant="outline-secondary" 
              onClick={() => {
                if (qrCodeRef.current) {
                  const isVisible = qrCodeRef.current.style.display !== 'none';
                  qrCodeRef.current.style.display = isVisible ? 'none' : 'block';
                }
              }}
            >
              <FaQrcode className="me-2" /> QR-Code {qrCodeRef.current?.style.display !== 'none' ? 'ausblenden' : 'anzeigen'}
            </Button>
          </div>
          
          <div 
            ref={qrCodeRef} 
            className="mb-3 text-center" 
            style={{ display: 'none' }}
          >
            {qrCodeUrl && (
              <div>
                <p>Scannen Sie diesen QR-Code mit Ihrem Mobilgerät:</p>
                <Image src={qrCodeUrl} alt="QR Code für Server-Verbindung" fluid />
              </div>
            )}
          </div>
          
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
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
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
          
          {/* Server-Informationskarte */}
          <ServerInfoCard />
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
