import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Row, Col, ListGroup, Badge, Nav, Tab, Alert, Container, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaUpload, FaRoad } from 'react-icons/fa';
import { trackModsApi } from '../services/api';

const TrackMods = () => {
  const [tracks, setTracks] = useState([]);
  const [stockTracks, setStockTracks] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadWarning, setUploadWarning] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    fetchTracks();
    fetchStockTracks();
  }, []);
  
  const fetchTracks = async () => {
    setLoading(true);
    try {
      const data = await trackModsApi.getAllTracks();
      setTracks(data);
    } catch (error) {
      setError('Fehler beim Laden der Strecken-Mods: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStockTracks = async () => {
    try {
      const data = await trackModsApi.getStockTracks();
      setStockTracks(data);
    } catch (error) {
      console.error('Fehler beim Laden der Standard-Strecken:', error);
      // Wir setzen keinen Fehler, da dies eine optionale Funktion ist
    }
  };
  
  const handleUpload = async (e) => {
    e.preventDefault();
    
    // Zurücksetzen des Upload-Status
    setUploadError(null);
    setUploadSuccess(null);
    setUploadWarning(null);
    
    if (!file) {
      setUploadError('Bitte wählen Sie eine Datei aus');
      return;
    }

    // Prüfen des Dateiformats
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'zip') {
      setUploadWarning('Hinweis: Nur ZIP-Dateien werden automatisch entpackt. Sie müssen andere Formate manuell entpacken.');
    }

    setUploadLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('trackmod', file);
      
      const response = await trackModsApi.uploadTrack(formData);
      
      if (response.warning) {
        setUploadWarning(response.message || response.warning);
      } else {
        setUploadSuccess('Strecken-Mod erfolgreich hochgeladen' + 
                        (response.extracted ? ' und entpackt' : ''));
        // Strecken neu laden nach erfolgreichem Upload
        fetchTracks();
      }
      
      setFile(null);
      // Form zurücksetzen
      document.getElementById('track-upload-form').reset();
    } catch (error) {
      setUploadError('Fehler beim Hochladen: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadLoading(false);
    }
  };
  
  const renderTrackList = () => {
    // Alle Strecken (Standard + Mods)
    const allTracks = [...(stockTracks || []), ...(tracks || [])];
    
    // Die anzuzeigenden Strecken je nach Tab auswählen
    let displayTracks = [];
    
    if (activeTab === 'all') {
      displayTracks = allTracks;
    } else if (activeTab === 'mods') {
      displayTracks = tracks;
    } else if (activeTab === 'stock') {
      displayTracks = stockTracks;
    }
    
    if (loading) {
      return <Spinner animation="border" role="status"><span className="visually-hidden">Laden...</span></Spinner>;
    }
    
    if (error) {
      return <Alert variant="danger">{error}</Alert>;
    }
    
    if (displayTracks.length === 0) {
      if (activeTab === 'all') {
        return <Alert variant="info">Keine Strecken gefunden</Alert>;
      } else if (activeTab === 'mods') {
        return <Alert variant="info">Keine Strecken-Mods gefunden</Alert>;
      } else if (activeTab === 'stock') {
        return <Alert variant="info">Keine Standard-Strecken gefunden</Alert>;
      }
    }
    
    return (
      <ListGroup>
        {displayTracks.map(track => (
          <ListGroup.Item key={track.id} className="d-flex justify-content-between align-items-center">
            <div>
              <FaRoad className="me-2" />
              {track.name}
              {track.layouts && track.layouts.length > 0 && (
                <small className="text-muted ms-2">
                  ({track.layouts.length} Layout{track.layouts.length !== 1 ? 's' : ''})
                </small>
              )}
            </div>
            {track.isStock && <span className="badge bg-info">Standard</span>}
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };
  
  return (
    <Container className="my-4">
      <h2>Strecken-Mods verwalten</h2>
      
      <Row className="mt-4">
        <Col md={6}>
          <Card>
            <Card.Header as="h5">Strecken-Mod hochladen</Card.Header>
            <Card.Body>
              <Form id="track-upload-form" onSubmit={handleUpload}>
                <Form.Group controlId="trackmod">
                  <Form.Label>Wählen Sie eine Mod-Datei aus (ZIP empfohlen)</Form.Label>
                  <Form.Control 
                    type="file" 
                    onChange={(e) => setFile(e.target.files[0])} 
                    required
                  />
                  <Form.Text className="text-muted">
                    ZIP-Dateien werden automatisch entpackt. Andere Formate müssen manuell entpackt werden.
                  </Form.Text>
                </Form.Group>
                
                {uploadSuccess && (
                  <Alert variant="success" className="mt-3">
                    {uploadSuccess}
                  </Alert>
                )}
                
                {uploadWarning && (
                  <Alert variant="warning" className="mt-3">
                    {uploadWarning}
                  </Alert>
                )}
                
                {uploadError && (
                  <Alert variant="danger" className="mt-3">
                    {uploadError}
                  </Alert>
                )}
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="mt-3"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Hochladen...
                    </>
                  ) : (
                    <>
                      <FaUpload className="me-2" />
                      Hochladen
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header as="h5">Verfügbare Strecken</Card.Header>
            <Card.Body>
              <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link eventKey="all">Alle</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="mods">Mods</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="stock">Standard</Nav.Link>
                  </Nav.Item>
                </Nav>
                <Tab.Content>
                  <Tab.Pane eventKey={activeTab}>
                    {renderTrackList()}
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TrackMods; 
