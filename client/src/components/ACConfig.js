import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaCog, FaSave } from 'react-icons/fa';
import { serverApi } from '../services/api';

const ACConfig = () => {
  const [acPath, setAcPath] = useState('');
  const [serverPath, setServerPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const handleACPathUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await serverApi.updateACPath(acPath);
      setSuccess(`Assetto Corsa Pfad erfolgreich aktualisiert: ${acPath}`);
      toast.success('Assetto Corsa Pfad erfolgreich aktualisiert');
    } catch (error) {
      setError(`Fehler beim Aktualisieren des Assetto Corsa Pfads: ${error.response?.data?.error || error.message}`);
      toast.error('Fehler beim Aktualisieren des Assetto Corsa Pfads');
    } finally {
      setLoading(false);
    }
  };
  
  const handleServerPathUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await serverApi.updateServerPath(serverPath);
      setSuccess(`Server-Pfad erfolgreich aktualisiert: ${serverPath}`);
      toast.success('Server-Pfad erfolgreich aktualisiert');
    } catch (error) {
      setError(`Fehler beim Aktualisieren des Server-Pfads: ${error.response?.data?.error || error.message}`);
      toast.error('Fehler beim Aktualisieren des Server-Pfads');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">AC Konfiguration</h1>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Header>
          <FaCog className="me-2" /> Assetto Corsa Installations-Pfad
        </Card.Header>
        <Card.Body>
          <p>
            Geben Sie den Pfad zur Assetto Corsa Installation an, um Standard-Autos und -Strecken zu nutzen.
          </p>
          <Form onSubmit={handleACPathUpdate}>
            <Form.Group className="mb-3">
              <Form.Label>Assetto Corsa Installations-Pfad</Form.Label>
              <Form.Control
                type="text"
                value={acPath}
                onChange={(e) => setAcPath(e.target.value)}
                placeholder="z.B. C:\Program Files (x86)\Steam\steamapps\common\assettocorsa"
                required
              />
              <Form.Text className="text-muted">
                Der vollständige Pfad zum Assetto Corsa Hauptverzeichnis.
              </Form.Text>
            </Form.Group>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading || !acPath}
            >
              <FaSave className="me-2" /> Speichern
            </Button>
          </Form>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>
          <FaCog className="me-2" /> Assetto Corsa Server Pfad
        </Card.Header>
        <Card.Body>
          <p>
            Geben Sie den Pfad zur Assetto Corsa Server-Executable (acServer) an.
          </p>
          <Form onSubmit={handleServerPathUpdate}>
            <Form.Group className="mb-3">
              <Form.Label>Assetto Corsa Server Pfad</Form.Label>
              <Form.Control
                type="text"
                value={serverPath}
                onChange={(e) => setServerPath(e.target.value)}
                placeholder="z.B. C:\acServer\acServer.exe"
                required
              />
              <Form.Text className="text-muted">
                Der vollständige Pfad zur acServer-Executable.
              </Form.Text>
            </Form.Group>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading || !serverPath}
            >
              <FaSave className="me-2" /> Speichern
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ACConfig; 
