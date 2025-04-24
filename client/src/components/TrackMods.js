import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, ListGroup, Badge, Nav, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaUpload, FaRoad } from 'react-icons/fa';
import { trackModsApi } from '../services/api';

const TrackMods = () => {
  const [tracks, setTracks] = useState([]);
  const [stockTracks, setStockTracks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    fetchTracks();
    fetchStockTracks();
  }, []);
  
  const fetchTracks = async () => {
    try {
      setLoading(true);
      const tracksData = await trackModsApi.getAllTracks();
      setTracks(tracksData);
    } catch (error) {
      console.error('Fehler beim Laden der Strecken:', error);
      toast.error('Fehler beim Laden der Strecken');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStockTracks = async () => {
    try {
      const stockTracksData = await trackModsApi.getStockTracks();
      setStockTracks(stockTracksData);
    } catch (error) {
      console.error('Fehler beim Laden der Standard-Strecken:', error);
      toast.error('Fehler beim Laden der Standard-Strecken. Bitte konfigurieren Sie den Assetto Corsa Pfad.');
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }
    
    try {
      setUploading(true);
      await trackModsApi.uploadTrack(selectedFile);
      toast.success('Strecken-Mod erfolgreich hochgeladen');
      setSelectedFile(null);
      // Formular zurücksetzen
      e.target.reset();
      // Streckenliste aktualisieren
      fetchTracks();
    } catch (error) {
      console.error('Fehler beim Hochladen des Strecken-Mods:', error);
      toast.error('Fehler beim Hochladen des Strecken-Mods');
    } finally {
      setUploading(false);
    }
  };
  
  const renderTrackList = (trackList, isStock = false) => {
    if (loading && !isStock) {
      return <p>Strecken werden geladen...</p>;
    }
    
    if (trackList.length === 0) {
      return (
        <p>
          {isStock 
            ? 'Keine Standard-Strecken gefunden. Bitte konfigurieren Sie den Assetto Corsa Pfad.'
            : 'Keine Strecken-Mods gefunden. Laden Sie Mods hoch, um zu beginnen.'}
        </p>
      );
    }
    
    return (
      <div className="mod-list">
        <ListGroup>
          {trackList.map((track, index) => (
            <ListGroup.Item key={index} className="mod-item">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaRoad className={`me-2 ${isStock ? 'text-success' : 'text-primary'}`} />
                  <span className="fw-bold">{track.name}</span>
                  {isStock && <small className="ms-2 text-muted">(Standard)</small>}
                  
                  {track.layouts && track.layouts.length > 0 && (
                    <div className="mt-2">
                      <small className="text-muted">Verfügbare Layouts:</small>
                      <div className="mt-1">
                        {track.layouts.map((layout, idx) => (
                          <Badge 
                            key={idx} 
                            bg="secondary" 
                            className="me-1"
                          >
                            {layout || 'Default'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    );
  };
  
  // Kombiniere alle Strecken für die "Alle"-Ansicht
  const allTracks = [...tracks, ...stockTracks];
  
  return (
    <div>
      <h1 className="mb-4">Strecken-Mods</h1>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <FaUpload className="me-2" /> Strecken-Mod hochladen
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleUpload}>
                <Form.Group className="mb-3">
                  <div className={`file-upload-wrapper ${selectedFile ? 'file-selected' : ''}`}>
                    <Form.Control 
                      type="file" 
                      onChange={handleFileChange}
                      className="file-upload-input"
                      accept=".zip,.rar,.7z,.tar.gz"
                    />
                    <div className="file-upload-button">
                      {selectedFile 
                        ? `Ausgewählt: ${selectedFile.name}` 
                        : 'Klicken Sie hier, um eine Strecken-Mod-Datei auszuwählen (.zip)'}
                    </div>
                  </div>
                  <Form.Text className="text-muted">
                    Unterstützte Formate: ZIP, RAR, 7Z, TAR.GZ
                  </Form.Text>
                </Form.Group>
                
                <Button 
                  variant="success" 
                  type="submit" 
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                </Button>
              </Form>
              
              <div className="mt-3">
                <h5>Hinweise:</h5>
                <ul>
                  <li>Strecken-Mods sollten im richtigen Format für Assetto Corsa vorliegen</li>
                  <li>Die Datei sollte den Ordner der Strecke enthalten</li>
                  <li>Große Dateien können einige Zeit zum Hochladen benötigen</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header>
              <FaRoad className="me-2" /> Verfügbare Strecken
            </Card.Header>
            <Card.Body>
              <Tab.Container id="track-tabs" activeKey={activeTab} onSelect={setActiveTab}>
                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link eventKey="all">
                      Alle ({allTracks.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="mods">
                      Mods ({tracks.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="stock">
                      Standard ({stockTracks.length})
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                
                <Tab.Content>
                  <Tab.Pane eventKey="all">
                    {renderTrackList(allTracks)}
                  </Tab.Pane>
                  <Tab.Pane eventKey="mods">
                    {renderTrackList(tracks)}
                  </Tab.Pane>
                  <Tab.Pane eventKey="stock">
                    {renderTrackList(stockTracks, true)}
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TrackMods; 
