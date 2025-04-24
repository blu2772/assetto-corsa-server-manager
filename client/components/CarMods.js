import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaUpload, FaCar } from 'react-icons/fa';
import { carModsApi } from '../services/api';

const CarMods = () => {
  const [cars, setCars] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchCars();
  }, []);
  
  const fetchCars = async () => {
    try {
      setLoading(true);
      const carsData = await carModsApi.getAllCars();
      setCars(carsData);
    } catch (error) {
      console.error('Fehler beim Laden der Fahrzeuge:', error);
      toast.error('Fehler beim Laden der Fahrzeuge');
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
      await carModsApi.uploadCar(selectedFile);
      toast.success('Fahrzeug-Mod erfolgreich hochgeladen');
      setSelectedFile(null);
      // Formular zurücksetzen
      e.target.reset();
      // Fahrzeugliste aktualisieren
      fetchCars();
    } catch (error) {
      console.error('Fehler beim Hochladen des Fahrzeug-Mods:', error);
      toast.error('Fehler beim Hochladen des Fahrzeug-Mods');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">Fahrzeug-Mods</h1>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <FaUpload className="me-2" /> Fahrzeug-Mod hochladen
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
                        : 'Klicken Sie hier, um eine Fahrzeug-Mod-Datei auszuwählen (.zip)'}
                    </div>
                  </div>
                  <Form.Text className="text-muted">
                    Unterstützte Formate: ZIP, RAR, 7Z, TAR.GZ
                  </Form.Text>
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                </Button>
              </Form>
              
              <div className="mt-3">
                <h5>Hinweise:</h5>
                <ul>
                  <li>Fahrzeug-Mods sollten im richtigen Format für Assetto Corsa vorliegen</li>
                  <li>Die Datei sollte den Ordner des Fahrzeugs enthalten</li>
                  <li>Große Dateien können einige Zeit zum Hochladen benötigen</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header>
              <FaCar className="me-2" /> Verfügbare Fahrzeug-Mods ({cars.length})
            </Card.Header>
            <Card.Body>
              {loading ? (
                <p>Fahrzeuge werden geladen...</p>
              ) : cars.length === 0 ? (
                <p>Keine Fahrzeug-Mods gefunden. Laden Sie Mods hoch, um zu beginnen.</p>
              ) : (
                <div className="mod-list">
                  <ListGroup>
                    {cars.map((car, index) => (
                      <ListGroup.Item key={index} className="mod-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <FaCar className="me-2 text-primary" />
                            <span className="fw-bold">{car}</span>
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

export default CarMods; 
