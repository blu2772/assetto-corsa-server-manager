import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaSave, FaPlay, FaStop, FaCog, FaSync } from 'react-icons/fa';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { serverApi, carModsApi, trackModsApi } from '../services/api';

const ServerConfig = () => {
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState({ running: false });
  const [availableCars, setAvailableCars] = useState([]);
  const [availableTracks, setAvailableTracks] = useState([]);
  
  useEffect(() => {
    fetchData();
    fetchServerStatus();
    
    // Aktualisiere den Serverstatus alle 10 Sekunden
    const interval = setInterval(fetchServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      // Alle Autos und Strecken abrufen (Mods und Standard)
      const [cars, tracks] = await Promise.all([
        carModsApi.getAllCarsAndStock(),
        trackModsApi.getAllTracksAndStock()
      ]);
      
      setAvailableCars(cars);
      setAvailableTracks(tracks);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error('Fehler beim Laden der Daten');
      
      // Versuchen, nur Mods zu laden, falls Standard-Content nicht verfügbar ist
      try {
        const [modCars, modTracks] = await Promise.all([
          carModsApi.getAllCars(),
          trackModsApi.getAllTracks()
        ]);
        
        setAvailableCars(modCars);
        setAvailableTracks(modTracks);
      } catch (modError) {
        console.error('Fehler beim Laden der Mods:', modError);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchServerStatus = async () => {
    try {
      const status = await serverApi.getStatus();
      setServerStatus(status);
    } catch (error) {
      console.error('Fehler beim Abrufen des Serverstatus:', error);
    }
  };
  
  const validationSchema = Yup.object().shape({
    serverName: Yup.string().required('Servername ist erforderlich'),
    cars: Yup.array().min(1, 'Mindestens ein Fahrzeug muss ausgewählt sein'),
    track: Yup.string().required('Eine Strecke muss ausgewählt sein'),
    maxClients: Yup.number()
      .required('Maximale Clientanzahl ist erforderlich')
      .min(1, 'Mindestens 1 Client')
      .max(30, 'Maximal 30 Clients'),
    port: Yup.number()
      .required('Server-Port ist erforderlich')
      .min(1000, 'Port muss >= 1000 sein')
      .max(65535, 'Port muss <= 65535 sein'),
    httpPort: Yup.number()
      .required('HTTP-Port ist erforderlich')
      .min(1000, 'Port muss >= 1000 sein')
      .max(65535, 'Port muss <= 65535 sein'),
    registerToLobby: Yup.number().required('Lobby-Registrierung ist erforderlich'),
    adminPassword: Yup.string().required('Admin-Passwort ist erforderlich')
  });
  
  const handleUpdateConfig = async (values) => {
    try {
      setLoading(true);
      await serverApi.updateConfig(values);
      toast.success('Serverkonfiguration erfolgreich aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Serverkonfiguration:', error);
      toast.error('Fehler beim Aktualisieren der Serverkonfiguration');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartServer = async (values) => {
    try {
      setLoading(true);
      await serverApi.startServer(values);
      toast.success('Server erfolgreich gestartet');
      await fetchServerStatus();  // Wichtig: Status sofort aktualisieren
    } catch (error) {
      console.error('Fehler beim Starten des Servers:', error);
      toast.error('Fehler beim Starten des Servers: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const handleStopServer = async () => {
    try {
      setLoading(true);
      await serverApi.stopServer();
      toast.success('Server erfolgreich gestoppt');
      await fetchServerStatus();  // Wichtig: Status sofort aktualisieren
    } catch (error) {
      console.error('Fehler beim Stoppen des Servers:', error);
      toast.error('Fehler beim Stoppen des Servers: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Hilfsfunktion zum Extrahieren der Auto-ID
  const getCarId = (car) => {
    if (typeof car === 'string') return car;
    return car.id || car.name;
  };
  
  // Hilfsfunktion zum Extrahieren des Streckennamens
  const getTrackName = (track) => {
    if (typeof track === 'string') return track;
    return track.name;
  };
  
  return (
    <div>
      <h1 className="mb-4">Serverkonfiguration</h1>
      
      <div className={`server-status ${serverStatus.running ? 'server-status-running' : 'server-status-stopped'}`}>
        <div className="d-flex justify-content-between align-items-center">
          <h4>
            {serverStatus.running ? 'Server läuft' : 'Server ist gestoppt'}
          </h4>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={fetchServerStatus}
            disabled={loading}
          >
            <FaSync className={loading ? "fa-spin" : ""} /> Status aktualisieren
          </Button>
        </div>
        <p>
          {serverStatus.running 
            ? 'Der Assetto Corsa Server ist aktiv und Spieler können beitreten.' 
            : 'Der Assetto Corsa Server ist derzeit nicht aktiv.'}
        </p>
      </div>
      
      <Card className="mt-4">
        <Card.Header>
          <FaCog className="me-2" /> Server-Einstellungen
        </Card.Header>
        <Card.Body>
          {loading ? (
            <p>Lade Daten...</p>
          ) : (
            <Formik
              initialValues={{
                serverName: 'Mein Assetto Corsa Server',
                cars: availableCars.length > 0 ? [getCarId(availableCars[0])] : [],
                track: availableTracks.length > 0 ? getTrackName(availableTracks[0]) : '',
                trackLayout: '',
                maxClients: 15,
                port: 9600,
                httpPort: 8081,
                registerToLobby: 1,
                password: '',
                adminPassword: 'adminpass'
              }}
              validationSchema={validationSchema}
              enableReinitialize={true}
              onSubmit={handleUpdateConfig}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                setFieldValue,
                isValid
              }) => (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Servername</Form.Label>
                        <Form.Control
                          type="text"
                          name="serverName"
                          value={values.serverName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.serverName && errors.serverName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.serverName}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Verfügbare Fahrzeuge</Form.Label>
                        {availableCars.length === 0 ? (
                          <Alert variant="warning">
                            Keine Fahrzeuge verfügbar. Bitte laden Sie zuerst Fahrzeug-Mods hoch oder konfigurieren Sie den Assetto Corsa Pfad.
                          </Alert>
                        ) : (
                          <div className="mod-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {availableCars.map((car, index) => {
                              const carId = getCarId(car);
                              const isStock = car.isStock;
                              const displayName = typeof car === 'string' ? car : car.name || car.id;
                              
                              return (
                                <Form.Check
                                  key={index}
                                  type="checkbox"
                                  id={`car-${index}`}
                                  label={
                                    <>
                                      {displayName}
                                      {isStock && <Badge bg="success" className="ms-2" pill>Standard</Badge>}
                                    </>
                                  }
                                  checked={values.cars.includes(carId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFieldValue('cars', [...values.cars, carId]);
                                    } else {
                                      setFieldValue(
                                        'cars',
                                        values.cars.filter((c) => c !== carId)
                                      );
                                    }
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                        {touched.cars && errors.cars && (
                          <div className="text-danger">{errors.cars}</div>
                        )}
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Strecke</Form.Label>
                        {availableTracks.length === 0 ? (
                          <Alert variant="warning">
                            Keine Strecken verfügbar. Bitte laden Sie zuerst Strecken-Mods hoch oder konfigurieren Sie den Assetto Corsa Pfad.
                          </Alert>
                        ) : (
                          <Form.Select
                            name="track"
                            value={values.track}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.track && errors.track}
                          >
                            <option value="">Strecke auswählen</option>
                            <optgroup label="Standard-Strecken">
                              {availableTracks.filter(track => track.isStock).map((track, index) => (
                                <option key={`stock-${index}`} value={track.name}>
                                  {track.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Strecken-Mods">
                              {availableTracks.filter(track => !track.isStock).map((track, index) => (
                                <option key={`mod-${index}`} value={track.name}>
                                  {track.name}
                                </option>
                              ))}
                            </optgroup>
                          </Form.Select>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {errors.track}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Streckenlayout</Form.Label>
                        <Form.Select
                          name="trackLayout"
                          value={values.trackLayout}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value="">Standard-Layout</option>
                          {availableTracks
                            .find((track) => getTrackName(track) === values.track)
                            ?.layouts.map((layout, index) => (
                              <option key={index} value={layout}>
                                {layout || 'Default'}
                              </option>
                            ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Maximale Anzahl Clients</Form.Label>
                        <Form.Control
                          type="number"
                          name="maxClients"
                          value={values.maxClients}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.maxClients && errors.maxClients}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.maxClients}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Server-Port</Form.Label>
                        <Form.Control
                          type="number"
                          name="port"
                          value={values.port}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.port && errors.port}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.port}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>HTTP-Port</Form.Label>
                        <Form.Control
                          type="number"
                          name="httpPort"
                          value={values.httpPort}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.httpPort && errors.httpPort}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.httpPort}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>In Lobby anzeigen</Form.Label>
                        <Form.Select
                          name="registerToLobby"
                          value={values.registerToLobby}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value={1}>Ja</option>
                          <option value={0}>Nein</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Server-Passwort (optional)</Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <Form.Text className="text-muted">
                          Leer lassen für einen öffentlichen Server
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Admin-Passwort</Form.Label>
                        <Form.Control
                          type="password"
                          name="adminPassword"
                          value={values.adminPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.adminPassword && errors.adminPassword}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.adminPassword}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-between mt-3">
                    <Button 
                      variant="primary" 
                      type="submit" 
                      disabled={!isValid || loading}
                    >
                      <FaSave className="me-2" /> Konfiguration speichern
                    </Button>
                    
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
                        onClick={() => handleStartServer(values)} 
                        disabled={!isValid || loading || availableCars.length === 0 || availableTracks.length === 0}
                      >
                        <FaPlay className="me-2" /> Server starten
                      </Button>
                    )}
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ServerConfig; 
