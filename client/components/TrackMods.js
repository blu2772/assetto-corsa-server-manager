import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, ListGroup, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaUpload, FaRoad } from 'react-icons/fa';
import { trackModsApi } from '../services/api';

const TrackMods = () => {
  const [tracks, setTracks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchTracks();
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
              <FaRoad className="me-2" /> Verfügbare Strecken-Mods ({tracks.length})
            </Card.Header>
            <Card.Body>
              {loading ? (
                <p>Strecken werden geladen...</p>
              ) : tracks.length === 0 ? (
                <p>Keine Strecken-Mods gefunden. Laden Sie Mods hoch, um zu beginnen.</p>
              ) : (
                <div className="mod-list">
                  <ListGroup>
                    {tracks.map((track, index) => (
                      <ListGroup.Item key={index} className="mod-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <FaRoad className="me-2 text-success" />
                            <span className="fw-bold">{track.name}</span>
                            
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
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TrackMods; 
