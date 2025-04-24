import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from 'react-bootstrap';
import { FaTerminal, FaPlay, FaStop, FaSync } from 'react-icons/fa';
import { serverApi } from '../services/api';

const ServerTerminal = ({ serverStatus, onAction }) => {
  const [output, setOutput] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const terminalRef = useRef(null);
  
  // Serverausgabe abrufen
  const fetchOutput = async () => {
    try {
      setLoading(true);
      const data = await serverApi.getOutput();
      setOutput(data.output || []);
    } catch (error) {
      console.error('Fehler beim Abrufen der Serverausgabe:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Bei Änderung des Serverstatus aktualisieren
  useEffect(() => {
    fetchOutput();
    // Scrolle zum Ende des Terminals
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [serverStatus]);
  
  // Automatische Aktualisierung alle 3 Sekunden, wenn autoRefresh aktiviert ist
  useEffect(() => {
    let interval;
    
    if (autoRefresh && serverStatus.running) {
      interval = setInterval(() => {
        fetchOutput();
      }, 3000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, serverStatus.running]);
  
  // Scrolle zum Ende des Terminals, wenn neue Ausgabe hinzukommt
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);
  
  // Server starten
  const handleStartServer = async () => {
    try {
      await serverApi.startServer();
      await fetchOutput();
      if (onAction) onAction('start');
    } catch (error) {
      console.error('Fehler beim Starten des Servers:', error);
    }
  };
  
  // Server stoppen
  const handleStopServer = async () => {
    try {
      await serverApi.stopServer();
      await fetchOutput();
      if (onAction) onAction('stop');
    } catch (error) {
      console.error('Fehler beim Stoppen des Servers:', error);
    }
  };
  
  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <FaTerminal className="me-2" /> Server Terminal
        </div>
        <div>
          <Button 
            variant={serverStatus.running ? "danger" : "success"} 
            size="sm" 
            className="me-2"
            onClick={serverStatus.running ? handleStopServer : handleStartServer}
            disabled={loading}
          >
            {serverStatus.running ? <><FaStop className="me-1" /> Stoppen</> : <><FaPlay className="me-1" /> Starten</>}
          </Button>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={fetchOutput}
            disabled={loading}
          >
            <FaSync className={loading ? "fa-spin me-1" : "me-1"} /> Aktualisieren
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div 
          ref={terminalRef}
          className="server-terminal" 
          style={{ 
            height: '400px', 
            overflowY: 'auto', 
            backgroundColor: '#1e1e1e', 
            color: '#dcdcdc',
            fontFamily: 'monospace',
            padding: '10px',
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem'
          }}
        >
          {output.length === 0 ? (
            <div className="text-center text-muted my-5">
              Server wurde noch nicht gestartet oder es gibt noch keine Ausgabe.
            </div>
          ) : (
            output.map((line, index) => (
              <div key={index} className="terminal-line">
                {line.includes('ERROR') ? (
                  <span style={{ color: '#ff6b6b' }}>{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))
          )}
        </div>
      </Card.Body>
      <Card.Footer className="d-flex justify-content-between">
        <small className="text-muted">
          {serverStatus.running ? 'Server läuft' : 'Server ist gestoppt'}
        </small>
        <div className="form-check form-switch">
          <input 
            className="form-check-input" 
            type="checkbox" 
            id="autoRefreshSwitch" 
            checked={autoRefresh}
            onChange={() => setAutoRefresh(!autoRefresh)}
          />
          <label className="form-check-label" htmlFor="autoRefreshSwitch">
            Automatische Aktualisierung
          </label>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default ServerTerminal; 
