import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, ListGroup, Nav, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaUpload, FaCar } from 'react-icons/fa';
import { carModsApi } from '../services/api';

const CarMods = () => {
  const [cars, setCars] = useState([]);
  const [stockCars, setStockCars] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    fetchCars();
    fetchStockCars();
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
  
  const fetchStockCars = async () => {
    try {
      const stockCarsData = await carModsApi.getStockCars();
      setStockCars(stockCarsData);
    } catch (error) {
      console.error('Fehler beim Laden der Standard-Fahrzeuge:', error);
      toast.error('Fehler beim Laden der Standard-Fahrzeuge. Bitte konfigurieren Sie den Assetto Corsa Pfad.');
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
  
  const renderCarList = (carList, isStock = false) => {
    if (loading && !isStock) {
      return <p>Fahrzeuge werden geladen...</p>;
    }
    
    if (carList.length === 0) {
      return (
        <p>
          {isStock 
            ? 'Keine Standard-Fahrzeuge gefunden. Bitte konfigurieren Sie den Assetto Corsa Pfad.'
            : 'Keine Fahrzeug-Mods gefunden. Laden Sie Mods hoch, um zu beginnen.'}
        </p>
      );
    }
    
    return (
      <div className="mod-list">
        <ListGroup>
          {carList.map((car, index) => (
            <ListGroup.Item key={index} className="mod-item">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaCar className={`me-2 ${isStock ? 'text-success' : 'text-primary'}`} />
                  <span className="fw-bold">{typeof car === 'string' ? car : car.name || car.id}</span>
                  {isStock && <small className="ms-2 text-muted">(Standard)</small>}
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    );
  };
  
  // Kombiniere alle Autos für die "Alle"-Ansicht
  const allCars = [...cars, ...stockCars];
  
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
              <FaCar className="me-2" /> Verfügbare Fahrzeuge
            </Card.Header>
            <Card.Body>
              <Tab.Container id="car-tabs" activeKey={activeTab} onSelect={setActiveTab}>
                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link eventKey="all">
                      Alle ({allCars.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="mods">
                      Mods ({cars.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="stock">
                      Standard ({stockCars.length})
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                
                <Tab.Content>
                  <Tab.Pane eventKey="all">
                    {renderCarList(allCars)}
                  </Tab.Pane>
                  <Tab.Pane eventKey="mods">
                    {renderCarList(cars)}
                  </Tab.Pane>
                  <Tab.Pane eventKey="stock">
                    {renderCarList(stockCars, true)}
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

export default CarMods; 
