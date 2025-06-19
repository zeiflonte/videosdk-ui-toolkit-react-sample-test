import React, { useRef, useState } from "react";
import uitoolkit, { CustomizationOptions } from "@zoom/videosdk-ui-toolkit";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";
import "./App.css";

function App() {
  const sessionContainer = useRef<HTMLDivElement | null>(null);

  const loginEndpoint = "http://localhost/api/login";
  const authEndpoint = "http://localhost/api/calls/signature";

  const [sessionName, setSessionName] = useState<string>("");
  const [sessionKey, setSessionKey] = useState<string>("");

  const role = 1;

  async function getVideoSDKJWT() {
    // 1) login
    const loginRes = await fetch(loginEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: "il@test.by", password: "12345678" }),
      credentials: "include",
    });
    const loginData = await loginRes.json();
    const bearer = loginData[0]?.access_token;
    if (!bearer) {
      console.error("Login failed or no access_token");
      return;
    }

    // 2) collect request body for signature: add fields only if they are filled
    const payload: any = { role, videoWebRtcMode: 1 };
    if (sessionName.trim()) payload.sessionName = sessionName.trim();
    if (sessionKey.trim()) payload.sessionKey = sessionKey.trim();

    const jwtRes = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    });
    const jwtData = await jwtRes.json();
    if (!jwtData.signature) {
      console.error("JWT fetch failed or no signature");
      return;
    }

    joinSession(jwtData.signature);
  }

  function joinSession(signature: string) {
    if (!sessionContainer.current) return;

    // Basic config
    const baseConfig: CustomizationOptions = {
      videoSDKJWT: signature,
      userName: "React",
      sessionPasscode: "123",
      featuresOptions: {
        preview: { enable: true },
        virtualBackground: {
          enable: true,
          virtualBackgrounds: [
            {
              url:
                "https://images.unsplash.com/photo-1715490187538-30a365fa05bd?q=80&w=1945&auto=format&fit=crop",
            },
          ],
        },
      },
    };

    // Collect the final one, substitute sessionName/key only if it exists
    const finalConfig: any = { ...baseConfig };
    if (sessionName.trim()) finalConfig.sessionName = sessionName.trim();
    if (sessionKey.trim()) finalConfig.sessionKey = sessionKey.trim();

    uitoolkit.joinSession(sessionContainer.current, finalConfig);
    uitoolkit.onSessionClosed(() => {
      console.log("session closed");
      document.getElementById("join-flow")!.style.display = "block";
    });
    uitoolkit.onSessionDestroyed(() => {
      console.log("session destroyed");
      uitoolkit.destroy();
    });
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
            <label>Session Key:</label>
            <input
              type="text"
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              placeholder="Enter sessionKey"
            />
          </div>
          <button onClick={getVideoSDKJWT}>Join Session</button>
        </div>
        <div id="sessionContainer" ref={sessionContainer}></div>
      </main>
    </div>
  );
}

export default App;
