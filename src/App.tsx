import React, { useRef, useState, useEffect } from "react";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import "./App.css";

// Environment variables configuration
declare const process: {
  env: {
    REACT_APP_LOGIN_ENDPOINT?: string;
    REACT_APP_AUTH_ENDPOINT?: string;
    REACT_APP_TEST_EMAIL?: string;
    REACT_APP_TEST_PASSWORD?: string;
  };
};

interface User {
  userId: number;
  bVideoOn: boolean;
}

interface JWTResponse {
  signature?: string;
  access_token?: string;
}

function App() {
  const sessionContainer = useRef<HTMLDivElement>(null);
  const [client, setClient] = useState<ReturnType<typeof ZoomVideo.createClient> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [, setParticipants] = useState<User[]>([]);

  const loginEndpoint =  "http://localhost/api/login";
  const authEndpoint =  "http://localhost/api/calls/signature";
  const role = 1;

  // Initialize the Zoom Video SDK client
  useEffect(() => {
    const videoClient = ZoomVideo.createClient();
    setClient(videoClient);
    return () => {
      if ('destroy' in videoClient) {
        (videoClient as { destroy: () => void }).destroy();
      }
    };
  }, []);

  // Fetch JWT and join session
  async function getVideoSDKJWT() {
    if (!client) return;

    try {
      setLoading(true);
      setError(null);
      
      // 1) Login
      const loginRes = await fetch(loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: "il@test.by", password: "12345678" }),
        credentials: "include",
      });
      
      if (!loginRes.ok) throw new Error('Login failed');
      
      const loginData: JWTResponse[] = await loginRes.json();
      const bearer = loginData[0]?.access_token;
      if (!bearer) {
        throw new Error('No access token received');
      }

    // 2) Prepare payload for signature
    const payload = {
      role,
      sessionName: sessionName.trim(),
      sessionKey: sessionPassword.trim(),
      userIdentity: "1",
      videoWebRtcMode: 1,
    };

      const jwtRes = await fetch(authEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!jwtRes.ok) throw new Error('JWT request failed');
      
      const jwtData: JWTResponse = await jwtRes.json();
      if (!jwtData.signature) {
        throw new Error('No signature received');
      }

      await joinSession(jwtData.signature);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Join session and set up event listeners
  async function joinSession(signature: string) {
    if (!client || !sessionContainer.current) return;

    await client.init("en-US", "Global");
    await client.join(sessionName.trim(), signature, "react", sessionPassword.trim());

    updateParticipants();
    // Initialize media stream but don't need to store it
    client.getMediaStream();

    // Event listeners for participant and video changes
    client.on("user-added", updateParticipants);
    client.on("user-removed", updateParticipants);
    client.on("video-active-change", updateParticipants);

    const joinFlow = document.getElementById("join-flow");
    if (joinFlow) {
      joinFlow.style.display = "none";
    }
  }

  // Update participant list and render video streams
  function updateParticipants() {
    if (!client || !sessionContainer.current) return;

    const users = client.getAllUser().map(user => ({
      userId: user.userId,
      bVideoOn: user.bVideoOn
    })) as User[];
    setParticipants(users);

    const stream = client.getMediaStream();
    if (!stream) {
      console.warn('No media stream available');
      return;
    }
    const container = sessionContainer.current;
    container.innerHTML = "";

    users.forEach((user) => {
      if (user.bVideoOn) {
        const videoEl = document.createElement("video");
        videoEl.id = `video-${user.userId}`;
        videoEl.width = 320;
        videoEl.height = 240;
        videoEl.autoplay = true;
        videoEl.muted = user.userId === client.getCurrentUserInfo().userId;
        container.appendChild(videoEl);
        stream.renderVideo(
          videoEl,
          user.userId,
          320,
          240,
          0,
          0,
          VideoQuality.Video_90P
        );
      }
    });
  }

  // Start cloud recording
  async function startRecording() {
    if (!client || isRecording) return;
    try {
      setIsRecordingLoading(true);
      const recordingClient = client.getRecordingClient();
      if (recordingClient && typeof recordingClient.startCloudRecording === 'function') {
        await recordingClient.startCloudRecording();
        setIsRecording(true);
      } else {
        throw new Error('Recording feature not available in this session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed');
      console.error(err);
    } finally {
      setIsRecordingLoading(false);
    }
  }

  // Stop cloud recording
  async function stopRecording() {
    if (!client || !isRecording) return;
    try {
      setIsRecordingLoading(true);
      const recordingClient = client.getRecordingClient();
      if (recordingClient && typeof recordingClient.stopCloudRecording === 'function') {
        await recordingClient.stopCloudRecording();
        setIsRecording(false);
      } else {
        throw new Error('Recording feature not available in this session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      console.error(err);
    } finally {
      setIsRecordingLoading(false);
    }
  }

  return (
    <div className="App">
      <main>
        <div id="join-flow">
          <h1>Zoom Video SDK Sample React</h1>
          <div className="form-group">
            <label>Session Name:</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter sessionName"
            />
          </div>
          <div className="form-group">
            <label>Session Password:</label>
            <input
              type="text"
              value={sessionPassword}
              onChange={(e) => setSessionPassword(e.target.value)}
              placeholder="Enter session password"
            />
          </div>
          <button 
            onClick={getVideoSDKJWT}
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div id="sessionContainer" ref={sessionContainer}></div>
        {client && (
          <div className="recording-controls">
            <button 
              onClick={startRecording} 
              disabled={isRecording || isRecordingLoading}
            >
              {isRecordingLoading ? 'Processing...' : 'Start Recording'}
            </button>
            <button 
              onClick={stopRecording} 
              disabled={!isRecording || isRecordingLoading}
            >
              {isRecordingLoading ? 'Processing...' : 'Stop Recording'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
