# Assetto Corsa Server Manager

Eine Webanwendung zum Verwalten und Betreiben eines benutzerdefinierten Assetto Corsa Servers. Diese Anwendung ermöglicht es, Track-Mods und Car-Mods hochzuladen, auszuwählen und den Server mit benutzerdefinierten Einstellungen zu starten.

## Funktionen

- Hochladen von Track-Mods (Strecken)
- Hochladen von Car-Mods (Fahrzeuge)
- Auswahl hochgeladener Mods für den Server
- Konfiguration der Servereinstellungen
- Starten und Stoppen des Assetto Corsa Servers
- Überwachung des Serverstatus

## Voraussetzungen

- Node.js (v14 oder höher)
- npm oder yarn
- Assetto Corsa Server (acServer) installiert auf dem System
- Zugang zu einem Linux-Plesk-Server für die Bereitstellung

## Installation

1. Repository klonen oder Dateien auf Ihren Server hochladen:

```bash
git clone https://github.com/yourusername/assetto-corsa-server-manager.git
cd assetto-corsa-server-manager
```

2. Server-Abhängigkeiten installieren:

```bash
cd server
npm install
```

3. Client-Abhängigkeiten installieren und Frontend bauen:

```bash
cd ../client
npm install
npm run build
```

4. Serverkonfiguration anpassen:

Öffnen Sie die Datei `server/server.js` und aktualisieren Sie den Pfad zum Assetto Corsa Server:

```javascript
// Pfad zur Assetto Corsa Server-Executable
let acServerPath = '/pfad/zu/acServer'; // Ändern Sie dies zum tatsächlichen Pfad
```

5. Server starten:

```bash
cd ../server
npm start
```

Der Server wird standardmäßig auf Port 3001 gestartet. Sie können den Port ändern, indem Sie die Umgebungsvariable PORT setzen.

## Verwendung

1. Öffnen Sie einen Webbrowser und navigieren Sie zu `http://ihre-server-adresse:3001`
2. Verwenden Sie die Benutzeroberfläche, um Track-Mods und Car-Mods hochzuladen
3. Konfigurieren Sie den Server nach Ihren Wünschen
4. Starten Sie den Server mit der Schaltfläche "Server starten"

## Plesk-Einrichtung

Um die Anwendung auf einem Plesk-Server einzurichten:

1. Erstellen Sie ein neues Node.js-Anwendungssubskription in Plesk
2. Wählen Sie "Git" als Bereitstellungsmethode und geben Sie die Repository-URL ein
3. Stellen Sie sicher, dass der Anwendungssubskriptionspfad auf das Serververzeichnis zeigt
4. Stellen Sie den Anwendungsstartbefehl auf `npm start` ein
5. Konfigurieren Sie den Pfad zu Ihrem Assetto Corsa Server

## Benutzerdefinierte Konfiguration

Sie können die Standardkonfiguration des Assetto Corsa Servers im Abschnitt `acServerConfig` in der Datei `server/server.js` anpassen:

```javascript
const acServerConfig = {
  serverName: 'Mein Assetto Corsa Server',
  cars: ['abarth500', 'bmw_m3_e30'],
  track: 'monza',
  trackLayout: '',
  maxClients: 15,
  port: 9600,
  httpPort: 8081,
  registerToLobby: 1,
  password: '',
  adminPassword: 'adminpass'
};
```

## Sicherheit

Stellen Sie sicher, dass Sie die Sicherheitseinstellungen anpassen:

- Ändern Sie das Admin-Passwort in der Serverkonfiguration
- Verwenden Sie HTTPS für die Webanwendung
- Beschränken Sie den Zugriff auf die Webanwendung auf vertrauenswürdige IP-Adressen

## Lizenz

MIT

## Fehlerbehandlung

Wenn Sie Probleme beim Starten des Servers haben:

1. Überprüfen Sie, ob der Pfad zum acServer korrekt ist
2. Stellen Sie sicher, dass der acServer-Prozess die erforderlichen Berechtigungen hat
3. Überprüfen Sie die Logs für detaillierte Fehlermeldungen

## Hilfe und Support

Bei Fragen oder Problemen erstellen Sie bitte ein Issue im GitHub-Repository oder kontaktieren Sie den Autor. 
