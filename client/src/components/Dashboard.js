import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlay, FaStop, FaCar, FaRoad } from 'react-icons/fa';
import { serverApi, carModsApi, trackModsApi } from '../services/api';

const Dashboard = ({ serverStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    cars: 0,
    tracks: 0
  });
  
  useEffect(() => {
    fetchStats();
  }, []);
  
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
  
  const handleStartServer = async () => {
    try {
      setLoading(true);
      await serverApi.startServer();
      toast.success('Server erfolgreich gestartet');
      onStatusChange();
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
  
  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>
      
      <div className={`server-status ${serverStatus.running ? 'server-status-running' : 'server-status-stopped'}`}>
        <h4>
          {serverStatus.running ? 'Server läuft' : 'Server ist gestoppt'}
        </h4>
        <p>
          {serverStatus.running 
            ? 'Der Assetto Corsa Server ist aktiv und Spieler können beitreten.' 
            : 'Der Assetto Corsa Server ist derzeit nicht aktiv.'}
        </p>
        
        {serverStatus.running ? (
          <Button 
            variant="danger" 
            onClick={handleStopServer} 
            disabled={loading}
          >
            <FaStop className="me-2" /> Server stoppen
          </Button>
        ) : (
          <Button 
            variant="success" 
            onClick={handleStartServer} 
            disabled={loading}
          >
            <FaPlay className="me-2" /> Server starten
          </Button>
        )}
      </div>
      
      <Row className="mt-4">
        <Col md={6}>
          <Card>
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
        </Col>
        
        <Col md={6}>
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
