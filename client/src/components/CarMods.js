import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Row, Col, ListGroup, Nav, Tab, Alert, Container, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaUpload, FaCar } from 'react-icons/fa';
import { carModsApi } from '../services/api';

const CarMods = () => {
  const [cars, setCars] = useState([]);
  const [stockCars, setStockCars] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadWarning, setUploadWarning] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef(null);
  
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
    const file = e.target.carmod.files[0];
    
    if (!file) {
      setUploadError('Bitte wählen Sie eine Datei aus');
      return;
    }
    
    // Zurücksetzen der Statusmeldungen
    setUploadError(null);
    setUploadSuccess(null);
    setUploadWarning(null);
    setUploadMessage('');
    
    const formData = new FormData();
    formData.append('carmod', file);
    
    setUploading(true);
    
    try {
      const response = await carModsApi.uploadCar(file);
      
      if (response.error) {
        setUploadError(response.error);
      } else {
        if (response.warning) {
          setUploadWarning(response.warning);
          setUploadMessage(response.message || '');
        } else {
          setUploadSuccess(`Datei "${response.filename}" wurde erfolgreich hochgeladen`);
        }
        
        // Wenn die Datei erfolgreich extrahiert wurde, aktualisieren wir die Liste
        if (response.extracted) {
          fetchCars();
        }
      }
      
      // Zurücksetzen des Datei-Inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    } catch (error) {
      setUploadError(`Fehler beim Hochladen: ${error.message}`);
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
    <Container>
      <h2>Car Mods</h2>
      
      <Form onSubmit={handleUpload} className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Car Mod hochladen (ZIP-Format empfohlen)</Form.Label>
              <Form.Control 
                type="file" 
                name="carmod"
                ref={fileInputRef}
                accept=".zip,.rar,.7z,.tar.gz" 
              />
              <Form.Text className="text-muted">
                Nur ZIP-Dateien werden automatisch entpackt. Andere Formate müssen manuell behandelt werden.
              </Form.Text>
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex align-items-end">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  {' '}Hochladen...
                </>
              ) : (
                'Hochladen'
              )}
            </Button>
          </Col>
        </Row>
      </Form>
      
      {uploadSuccess && (
        <Alert variant="success" onClose={() => setUploadSuccess(null)} dismissible>
          {uploadSuccess}
        </Alert>
      )}
      
      {uploadWarning && (
        <Alert variant="warning" onClose={() => setUploadWarning(null)} dismissible>
          <Alert.Heading>{uploadWarning}</Alert.Heading>
          <p>{uploadMessage}</p>
        </Alert>
      )}
      
      {uploadError && (
        <Alert variant="danger" onClose={() => setUploadError(null)} dismissible>
          {uploadError}
        </Alert>
      )}
      
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="all">Alle Autos</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="mods">Mods</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="stock">Standard-Autos</Nav.Link>
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
            {renderCarList(stockCars)}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default CarMods; 
