import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaCog, FaSave } from 'react-icons/fa';
import { serverApi } from '../services/api';

const ServerSettings = () => {
  const [serverPath, setServerPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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
      setError(`Fehler beim Aktualisieren des Server-Pfads: ${error.message}`);
      toast.error('Fehler beim Aktualisieren des Server-Pfads');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">Server-Einstellungen</h1>
      
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
      
      <Card>
        <Card.Header>
          <FaCog className="me-2" /> Assetto Corsa Server Pfad Konfiguration
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
                placeholder="z.B. /pfad/zu/acServer oder C:\server\acServer.exe"
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
      
      <Card className="mt-4">
        <Card.Header>
          <FaCog className="me-2" /> Standard-Inhalte
        </Card.Header>
        <Card.Body>
          <p>
            Diese Anwendung enthält eine integrierte Liste aller Standard-Fahrzeuge und -Strecken von Assetto Corsa.
            Sie können diese Standard-Inhalte in Ihrer Serverkonfiguration zusammen mit den hochgeladenen Mods verwenden.
          </p>
          
          <Alert variant="info">
            <strong>Hinweis:</strong> Wenn Sie Standard-Inhalte auf Ihrem Server verwenden möchten, stellen Sie sicher, dass die entsprechenden Dateien
            im Assetto Corsa Server vorhanden sind.
          </Alert>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ServerSettings; 
