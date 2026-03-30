export const playgroundHtml = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Next Game Realtime Playground</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #07111c;
        --panel: rgba(13, 27, 43, 0.72);
        --panel-strong: rgba(15, 32, 50, 0.92);
        --border: rgba(170, 210, 255, 0.18);
        --text: #e8f2ff;
        --muted: #9cb7d3;
        --accent: #7bd7c6;
        --danger: #ff7f7f;
        --warning: #ffd27d;
        --shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "SFMono-Regular", "Consolas", "Liberation Mono", monospace;
        background:
          radial-gradient(circle at top left, rgba(78, 146, 224, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(123, 215, 198, 0.16), transparent 24%),
          linear-gradient(180deg, #07111c 0%, #0b1727 100%);
        color: var(--text);
      }

      .shell {
        width: min(1280px, calc(100vw - 32px));
        margin: 24px auto 48px;
        display: grid;
        gap: 16px;
      }

      .hero,
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 20px;
        backdrop-filter: blur(22px);
        box-shadow: var(--shadow);
      }

      .hero {
        padding: 24px;
      }

      .hero h1 {
        margin: 0 0 10px;
        font-size: clamp(28px, 4vw, 42px);
      }

      .hero p,
      .muted {
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
      }

      .panel {
        padding: 18px;
      }

      .panel h2 {
        margin: 0 0 14px;
        font-size: 18px;
      }

      .row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .stack {
        display: grid;
        gap: 10px;
      }

      input,
      textarea,
      select,
      button {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: rgba(6, 14, 24, 0.8);
        color: var(--text);
        padding: 11px 12px;
        font: inherit;
      }

      button {
        cursor: pointer;
        background: linear-gradient(135deg, rgba(123, 215, 198, 0.25), rgba(96, 153, 234, 0.25));
      }

      button.danger {
        background: linear-gradient(135deg, rgba(255, 127, 127, 0.24), rgba(255, 180, 135, 0.18));
      }

      button.ghost {
        background: rgba(8, 18, 29, 0.4);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 12px;
      }

      .list {
        display: grid;
        gap: 10px;
      }

      .card {
        padding: 12px;
        border-radius: 16px;
        background: rgba(8, 18, 29, 0.55);
        border: 1px solid rgba(170, 210, 255, 0.12);
      }

      .card strong {
        display: block;
        margin-bottom: 6px;
      }

      .members {
        display: grid;
        gap: 8px;
      }

      .member {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(7, 15, 24, 0.75);
      }

      .board {
        display: grid;
        grid-template-columns: repeat(3, minmax(72px, 1fr));
        gap: 8px;
        width: min(320px, 100%);
      }

      .cell {
        aspect-ratio: 1;
        font-size: clamp(28px, 8vw, 48px);
        font-weight: 700;
        border-radius: 16px;
        border: 1px solid rgba(170, 210, 255, 0.2);
        background: rgba(10, 22, 36, 0.86);
      }

      pre {
        margin: 0;
        max-height: 320px;
        overflow: auto;
        padding: 14px;
        border-radius: 14px;
        background: rgba(5, 11, 19, 0.86);
        border: 1px solid rgba(170, 210, 255, 0.12);
        color: #cde1f5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .chat-feed {
        max-height: 220px;
        overflow: auto;
        display: grid;
        gap: 8px;
      }

      .chat-line {
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(6, 14, 24, 0.68);
      }

      .chat-line small {
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>Realtime Migration Playground</h1>
        <p>Use separate tabs with different nicknames to test the new worker-native flow locally. This page stores the auth token in per-tab session storage so two tabs can act as different users against the same localhost worker.</p>
        <div class="row">
          <span class="pill" id="authStatus">Signed out</span>
          <span class="pill" id="wsStatus">Lobby socket disconnected</span>
          <span class="pill" id="lobbyStatus">No lobby selected</span>
        </div>
      </section>

      <section class="grid">
        <div class="panel stack">
          <h2>Identity</h2>
          <div class="row">
            <input id="nicknameInput" placeholder="nickname" />
            <button id="registerButton">Register</button>
            <button id="restoreButton" class="ghost">Restore Session</button>
            <button id="logoutButton" class="danger">Logout</button>
          </div>
          <pre id="sessionView">No session</pre>
        </div>

        <div class="panel stack">
          <h2>Create Lobby</h2>
          <div class="row">
            <input id="lobbyIdInput" placeholder="lobby id" />
            <input id="lobbyNameInput" placeholder="display name (optional)" />
          </div>
          <div class="row">
            <input id="passwordInput" placeholder="password (optional)" />
            <button id="createLobbyButton">Create TicTacToe Lobby</button>
            <button id="refreshLobbiesButton" class="ghost">Refresh Lobbies</button>
          </div>
          <pre id="createResultView">No create request yet</pre>
        </div>
      </section>

      <section class="grid">
        <div class="panel stack">
          <h2>Lobby List</h2>
          <div id="lobbyList" class="list"></div>
        </div>

        <div class="panel stack">
          <h2>Current Lobby</h2>
          <div class="row">
            <input id="selectedLobbyInput" placeholder="lobby id" />
            <select id="roleSelect">
              <option value="player">Join as player</option>
              <option value="spectator">Join as spectator</option>
            </select>
            <input id="joinPasswordInput" placeholder="join password" />
          </div>
          <div class="row">
            <button id="connectLobbyButton">Connect</button>
            <button id="syncLobbyButton" class="ghost">Sync</button>
            <button id="leaveLobbyButton" class="ghost">Leave</button>
            <button id="destroyLobbyButton" class="danger">Destroy</button>
          </div>
          <pre id="lobbySnapshotView">No lobby snapshot yet</pre>
        </div>
      </section>

      <section class="grid">
        <div class="panel stack">
          <h2>Members And Ready Check</h2>
          <div class="row">
            <button id="startReadyButton">Start Ready Check</button>
            <button id="readyTrueButton">I am ready</button>
            <button id="readyFalseButton" class="danger">I am not ready</button>
            <button id="startGameButton">Start Game</button>
          </div>
          <div id="membersView" class="members"></div>
        </div>

        <div class="panel stack">
          <h2>TicTacToe</h2>
          <div id="board" class="board"></div>
          <pre id="gameSummaryView">No active game</pre>
        </div>
      </section>

      <section class="grid">
        <div class="panel stack">
          <h2>Chat</h2>
          <div id="chatFeed" class="chat-feed"></div>
          <div class="row">
            <input id="chatInput" placeholder="message" />
            <button id="sendChatButton">Send</button>
          </div>
        </div>

        <div class="panel stack">
          <h2>Event Log</h2>
          <pre id="eventLog"></pre>
        </div>
      </section>
    </main>

    <script>
      const storageKey = "realtime.playground.token";
      const state = {
        session: null,
        token: sessionStorage.getItem(storageKey),
        lobbies: [],
        lobbyId: "",
        lobbySnapshot: null,
        socket: null
      };

      const el = id => document.getElementById(id);
      const authStatus = el("authStatus");
      const wsStatus = el("wsStatus");
      const lobbyStatus = el("lobbyStatus");
      const sessionView = el("sessionView");
      const createResultView = el("createResultView");
      const lobbySnapshotView = el("lobbySnapshotView");
      const membersView = el("membersView");
      const gameSummaryView = el("gameSummaryView");
      const chatFeed = el("chatFeed");
      const eventLog = el("eventLog");

      function log(label, payload) {
        const line = "[" + new Date().toLocaleTimeString() + "] " + label + (payload ? "\n" + JSON.stringify(payload, null, 2) : "");
        eventLog.textContent = line + "\n\n" + eventLog.textContent;
      }

      function getHttpHeaders(extra = {}) {
        const headers = { ...extra };
        if (state.token) {
          headers.Authorization = "Bearer " + state.token;
        }
        return headers;
      }

      async function api(path, init = {}) {
        const response = await fetch(path, {
          ...init,
          headers: getHttpHeaders(init.headers || {})
        });
        const text = await response.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (_error) {
          data = text;
        }
        if (!response.ok) {
          throw new Error((data && data.message) || response.statusText);
        }
        return data;
      }

      function renderSession() {
        authStatus.textContent = state.session ? "Signed in as " + state.session.user.userNickname : "Signed out";
        sessionView.textContent = state.session ? JSON.stringify(state.session, null, 2) : "No session";
      }

      function renderLobbies() {
        const lobbyList = el("lobbyList");
        lobbyList.innerHTML = "";

        if (!state.lobbies.length) {
          lobbyList.innerHTML = '<div class="card muted">No active lobbies yet</div>';
          return;
        }

        state.lobbies.forEach(lobby => {
          const card = document.createElement("div");
          card.className = "card";
          card.innerHTML =
            "<strong>" + lobby.name + "</strong>" +
            "<div class='muted'>id: " + lobby.id + " | creator: " + lobby.creatorNickname + "</div>" +
            "<div class='muted'>members: " + lobby.membersCount + " | players: " + lobby.playersCount + " | status: " + lobby.status + "</div>";

          const controls = document.createElement("div");
          controls.className = "row";

          const asPlayer = document.createElement("button");
          asPlayer.textContent = "Open as player";
          asPlayer.onclick = () => {
            el("selectedLobbyInput").value = lobby.id;
            el("roleSelect").value = "player";
            connectLobby();
          };

          const asSpectator = document.createElement("button");
          asSpectator.textContent = "Open as spectator";
          asSpectator.className = "ghost";
          asSpectator.onclick = () => {
            el("selectedLobbyInput").value = lobby.id;
            el("roleSelect").value = "spectator";
            connectLobby();
          };

          const fetchState = document.createElement("button");
          fetchState.textContent = "Fetch state";
          fetchState.className = "ghost";
          fetchState.onclick = async () => {
            const result = await api("/lobbies/" + encodeURIComponent(lobby.id) + "/state");
            state.lobbySnapshot = result.room;
            state.lobbyId = lobby.id;
            renderLobby();
            log("fetched lobby state", result);
          };

          controls.append(asPlayer, asSpectator, fetchState);
          card.appendChild(controls);
          lobbyList.appendChild(card);
        });
      }

      function renderMembers() {
        membersView.innerHTML = "";
        const members = state.lobbySnapshot ? state.lobbySnapshot.members : [];

        if (!members.length) {
          membersView.innerHTML = '<div class="member muted">No members in this room</div>';
          return;
        }

        const participantByMemberId = new Map(
          state.lobbySnapshot && state.lobbySnapshot.game && state.lobbySnapshot.game.participants
            ? state.lobbySnapshot.game.participants.map(participant => [participant.memberId, participant])
            : []
        );

        members.forEach(member => {
          const participant = participantByMemberId.get(member.id);
          const participantLabel =
            participant && "seat" in participant
              ? " (" + participant.seat + ")"
              : participant && "isMaster" in participant && participant.isMaster
                ? " (master)"
                : "";
          const ready = state.lobbySnapshot && state.lobbySnapshot.readyCheck ? state.lobbySnapshot.readyCheck.votes[member.id] : null;
          const row = document.createElement("div");
          row.className = "member";
          row.innerHTML =
            "<div><strong style='color:" + member.userColor + "'>" + member.userNickname + "</strong>" +
            "<div class='muted'>" + member.role + participantLabel + (member.isCreator ? " | creator" : "") + "</div></div>" +
            "<div class='muted'>" + (member.connected ? "connected" : "offline") + " | ready: " + (ready === null || typeof ready === "undefined" ? "-" : String(ready)) + "</div>";
          membersView.appendChild(row);
        });
      }

      function renderBoard() {
        const board = el("board");
        board.innerHTML = "";
        const session = state.lobbySnapshot && state.lobbySnapshot.game ? state.lobbySnapshot.game.session : null;
        const grid = session ? session.board : [[null, null, null], [null, null, null], [null, null, null]];

        grid.forEach((row, rowIndex) => {
          row.forEach((cell, columnIndex) => {
            const button = document.createElement("button");
            button.className = "cell";
            button.textContent = cell || "";
            button.onclick = () =>
              sendLobbyMessage({
                type: "game.command",
                payload: {
                  commandName: "$Move",
                  commandPayload: { cell: [rowIndex, columnIndex] }
                }
              });
            board.appendChild(button);
          });
        });

        gameSummaryView.textContent = session ? JSON.stringify(session, null, 2) : "No active game";
      }

      function renderChat() {
        chatFeed.innerHTML = "";
        const messages = state.lobbySnapshot ? state.lobbySnapshot.chat : [];

        if (!messages.length) {
          chatFeed.innerHTML = '<div class="chat-line muted">No messages yet</div>';
          return;
        }

        messages.forEach(message => {
          const line = document.createElement("div");
          line.className = "chat-line";
          line.innerHTML =
            "<strong style='color:" + (message.fromColor || "#fff") + "'>" + message.from + "</strong> " +
            "<small>" + new Date(message.createdAt).toLocaleTimeString() + "</small>" +
            "<div>" + message.text + "</div>";
          chatFeed.appendChild(line);
        });
      }

      function renderLobby() {
        lobbyStatus.textContent = state.lobbyId ? "Lobby: " + state.lobbyId : "No lobby selected";
        lobbySnapshotView.textContent = state.lobbySnapshot ? JSON.stringify(state.lobbySnapshot, null, 2) : "No lobby snapshot yet";
        renderMembers();
        renderBoard();
        renderChat();
      }

      function setSocketStatus(label) {
        wsStatus.textContent = label;
      }

      function storeToken(token) {
        state.token = token || null;
        if (token) {
          sessionStorage.setItem(storageKey, token);
        } else {
          sessionStorage.removeItem(storageKey);
        }
      }

      async function restoreSession() {
        if (!state.token) {
          state.session = null;
          renderSession();
          return;
        }

        try {
          const data = await api("/auth/session");
          state.session = data.session;
          renderSession();
          log("session restored", data);
        } catch (error) {
          storeToken(null);
          state.session = null;
          renderSession();
          log("session restore failed", { message: error.message });
        }
      }

      async function refreshLobbies() {
        const data = await api("/lobbies");
        state.lobbies = data.lobbies || [];
        renderLobbies();
      }

      async function register() {
        const nickname = el("nicknameInput").value.trim();
        if (!nickname) return;

        const response = await fetch("/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userNickname: nickname })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Register failed");
        }

        storeToken(data.sessionToken);
        state.session = data.session;
        renderSession();
        log("registered", data);
      }

      async function createLobby() {
        const lobbyId = el("lobbyIdInput").value.trim();
        if (!lobbyId) return;

        const payload = {
          game: {
            kind: "TicTacToe",
            config: {}
          },
          lobbyId,
          name: el("lobbyNameInput").value.trim() || undefined,
          password: el("passwordInput").value.trim() || undefined
        };

        const data = await api("/lobbies", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });

        createResultView.textContent = JSON.stringify(data, null, 2);
        state.lobbyId = lobbyId;
        state.lobbySnapshot = data.room;
        el("selectedLobbyInput").value = lobbyId;
        renderLobby();
        await refreshLobbies();
        log("lobby created", data);
      }

      function closeSocket() {
        if (state.socket) {
          try {
            state.socket.close();
          } catch (_error) {
            return;
          }
        }
        state.socket = null;
        setSocketStatus("Lobby socket disconnected");
      }

      function sendLobbyMessage(message) {
        if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
          log("socket not ready", message);
          return;
        }
        state.socket.send(JSON.stringify(message));
      }

      function connectLobby() {
        if (!state.token) {
          log("connect blocked", { message: "Sign in first" });
          return;
        }

        const lobbyId = el("selectedLobbyInput").value.trim();
        if (!lobbyId) return;

        closeSocket();
        state.lobbyId = lobbyId;

        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(protocol + "//" + location.host + "/lobbies/" + encodeURIComponent(lobbyId) + "/websocket?token=" + encodeURIComponent(state.token));

        socket.onopen = () => {
          state.socket = socket;
          setSocketStatus("Lobby socket connected");
          sendLobbyMessage({
            type: "lobby.command",
            payload: {
              commandName: "join",
              commandPayload: {
                role: el("roleSelect").value,
                password: el("joinPasswordInput").value.trim() || undefined
              }
            }
          });
          sendLobbyMessage({ type: "lobby.sync" });
        };

        socket.onmessage = event => {
          const message = JSON.parse(event.data);
          log("socket message", message);

          if (message.type === "lobby.state") {
            state.lobbySnapshot = message.payload;
            state.lobbyId = message.payload.lobbyId;
            renderLobby();
            refreshLobbies().catch(error => log("refresh lobbies failed", { message: error.message }));
          }
        };

        socket.onclose = () => {
          setSocketStatus("Lobby socket disconnected");
          state.socket = null;
        };

        socket.onerror = () => {
          setSocketStatus("Lobby socket error");
        };
      }

      async function destroyLobby() {
        const lobbyId = el("selectedLobbyInput").value.trim();
        if (!lobbyId) return;
        await api("/lobbies/" + encodeURIComponent(lobbyId), { method: "DELETE" });
        closeSocket();
        state.lobbySnapshot = null;
        state.lobbyId = "";
        renderLobby();
        await refreshLobbies();
        log("room destroyed", { lobbyId });
      }

      async function logout() {
        if (!state.token) return;
        await api("/auth/logout", { method: "POST" });
        storeToken(null);
        state.session = null;
        closeSocket();
        renderSession();
        log("logged out");
      }

      el("registerButton").onclick = () => register().catch(error => log("register failed", { message: error.message }));
      el("restoreButton").onclick = () => restoreSession().catch(error => log("restore failed", { message: error.message }));
      el("logoutButton").onclick = () => logout().catch(error => log("logout failed", { message: error.message }));
      el("createLobbyButton").onclick = () => createLobby().catch(error => log("create lobby failed", { message: error.message }));
      el("refreshLobbiesButton").onclick = () => refreshLobbies().catch(error => log("refresh lobbies failed", { message: error.message }));
      el("connectLobbyButton").onclick = () => connectLobby();
      el("syncLobbyButton").onclick = () => sendLobbyMessage({ type: "lobby.sync" });
      el("leaveLobbyButton").onclick = () => sendLobbyMessage({ type: "lobby.command", payload: { commandName: "leave" } });
      el("destroyLobbyButton").onclick = () => destroyLobby().catch(error => log("destroy lobby failed", { message: error.message }));
      el("startReadyButton").onclick = () => sendLobbyMessage({ type: "lobby.command", payload: { commandName: "ready.start" } });
      el("readyTrueButton").onclick = () => sendLobbyMessage({ type: "lobby.command", payload: { commandName: "ready.set", commandPayload: { ready: true } } });
      el("readyFalseButton").onclick = () => sendLobbyMessage({ type: "lobby.command", payload: { commandName: "ready.set", commandPayload: { ready: false } } });
      el("startGameButton").onclick = () => sendLobbyMessage({ type: "lobby.command", payload: { commandName: "game.start" } });
      el("sendChatButton").onclick = () => {
        const input = el("chatInput");
        const text = input.value.trim();
        if (!text) return;
        sendLobbyMessage({ type: "lobby.command", payload: { commandName: "chat.send", commandPayload: { text } } });
        input.value = "";
      };

      restoreSession().then(refreshLobbies).catch(error => log("initialization failed", { message: error.message }));
      renderSession();
      renderLobbies();
      renderLobby();
    </script>
  </body>
</html>`
