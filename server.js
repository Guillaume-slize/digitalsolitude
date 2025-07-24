const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let activeVisitors = new Map();

// Server-sent events for real-time updates
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering if behind proxy
  });
  
  // Get session ID from query parameter
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'No session ID' })}\n\n`);
    res.end();
    return;
  }
  
  const visitorId = sessionId; // Use session ID as the unique identifier
  
  // Store this connection - this is the ONLY place we add visitors
  activeVisitors.set(visitorId, { 
    lastSeen: Date.now(), 
    eventStream: res,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  console.log(`👤 New SSE connection established for session ${visitorId}`);
  console.log(`👥 Active visitors: ${activeVisitors.size}`);
  
  // Send initial state
  res.write(`data: ${JSON.stringify({ 
    type: 'status', 
    count: activeVisitors.size 
  })}\n\n`);
  
  // If there are now 2+ people, everyone fails (including the new visitor)
  if (activeVisitors.size >= 2) {
    broadcastFailure();
  }
  
  // Server-side keepalive to detect dead connections
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(`:keepalive\n\n`);
    } catch (e) {
      // Connection is dead
      clearInterval(keepAliveInterval);
      activeVisitors.delete(visitorId);
      console.log(`👋 Dead connection removed for session ${visitorId}`);
      broadcastUpdate();
    }
  }, 30000); // Every 30 seconds
  
  // Clean up on connection close
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    activeVisitors.delete(visitorId);
    console.log(`👋 SSE connection closed for session ${visitorId}`);
    broadcastUpdate();
  });
});

// Broadcast failure to everyone
function broadcastFailure() {
  const message = `data: ${JSON.stringify({ 
    type: 'too_many_people', 
    count: activeVisitors.size 
  })}\n\n`;
  
  console.log(`🚫 Broadcasting failure to ${activeVisitors.size} visitors`);
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    try {
      visitor.eventStream.write(message);
    } catch (e) {
      console.log(`Failed to send to ${visitorId}, removing...`);
      activeVisitors.delete(visitorId);
    }
  }
}

// Broadcast updates to all active visitors
function broadcastUpdate() {
  const message = `data: ${JSON.stringify({ 
    type: 'count_update', 
    count: activeVisitors.size 
  })}\n\n`;
  
  console.log(`📢 Broadcasting update: ${activeVisitors.size} visitors`);
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    try {
      visitor.eventStream.write(message);
    } catch (e) {
      console.log(`Failed to send to ${visitorId}, removing...`);
      activeVisitors.delete(visitorId);
    }
  }
}

// Heartbeat endpoint
app.post('/heartbeat', express.json(), (req, res) => {
  const sessionId = req.body.sessionId;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'No session ID' });
  }
  
  if (activeVisitors.has(sessionId)) {
    activeVisitors.get(sessionId).lastSeen = Date.now();
    res.json({ status: 'alive', count: activeVisitors.size });
  } else {
    // Visitor not in active list - they need to reconnect
    res.json({ status: 'reconnect_needed', count: activeVisitors.size });
  }
});

// Clean up inactive visitors every 5 seconds
setInterval(() => {
  const now = Date.now();
  let changed = false;
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    if (now - visitor.lastSeen > 15000) { // 15 seconds without heartbeat = gone
      activeVisitors.delete(visitorId);
      console.log(`👋 Inactive visitor ${visitorId} removed`);
      changed = true;
    }
  }
  
  if (changed) {
    broadcastUpdate();
  }
}, 5000);

// The main website
app.get('/', (req, res) => {
  console.log(`🌐 Page request from ${req.ip}`);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>digitalsolitude</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 15px;
            text-align: center;
            line-height: 1.6;
            background: #ffffff;
            color: #000000;
            padding: 40px 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .header {
            margin-bottom: 60px;
            border-bottom: 1px solid #000;
            padding-bottom: 20px;
          }
          
          h1 {
            font-size: 24px;
            font-weight: normal;
            letter-spacing: -0.5px;
            margin-bottom: 10px;
          }
          
          .subtitle {
            font-size: 13px;
            color: #666;
            margin-bottom: 20px;
          }
          
          .ascii-art {
            font-family: monospace;
            font-size: 20px;
            margin: 30px 0;
            color: #333;
          }
          
          .content {
            margin: 40px 0;
          }
          
          .content p {
            margin-bottom: 10px;
          }
          
          .explainer-box {
            padding: 25px;
            margin: 30px 0;
            background: #fafafa;
            border-top: 2px solid #eee;
            border-bottom: 2px solid #eee;
            position: relative;
          }
          
          .explainer-box::before,
          .explainer-box::after {
            content: '∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿';
            position: relative;
            left: 0;
            right: 0;
            font-size: 8px;
            color: #ddd;
            text-align: center;
            letter-spacing: 0px;
            overflow: hidden;
          }
          
          .explainer-box::before {
            top: 4px;
          }
          
          .explainer-box::after {
            bottom: 4px;
          }
          
          .explainer-box h3 {
            font-size: 14px;
            font-weight: normal;
            margin-bottom: 15px;
            color: #666;
            letter-spacing: 0.3px;
          }
          
          .presence {
            animation: presence 6s ease-in-out infinite;
          }
          
          @keyframes presence {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #000;
            font-size: 12px;
            color: #999;
          }
          
          a {
            color: #000;
            text-decoration: none;
            border-bottom: 1px solid #000;
          }
          
          a:hover {
            background: #000;
            color: #fff;
          }
          
          .status-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 12px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 11px;
            color: #666;
            opacity: 0.7;
            transition: opacity 0.3s;
          }
          
          .status-indicator:hover {
            opacity: 1;
          }
          
          .status-indicator.connected {
            border-color: #4CAF50;
            color: #4CAF50;
          }
          
          .status-indicator.disconnected {
            border-color: #f44336;
            color: #f44336;
          }
          
          @media (max-width: 600px) {
            body { padding: 5px 5px; font-size: 16px; }
            .ascii-art { font-size: 16px; }
            .status-indicator { display: none; }
          }
          
          /* layered ASCII animation */
          .ascii-stack { position: relative; display: inline-block; }
          .ascii-stack .ascii {
            position: absolute;
            top: 0; left: 0; margin: 0;
            font-family: "Courier New", monospace;
            white-space: pre;
            animation: pulse 8s ease-in-out infinite;
            will-change: opacity, filter;
            transform: translateZ(0);
          }
          .ascii.d0 { mask-image: linear-gradient(50deg, transparent 0%, #000 30%, #000 70%, transparent 100%); filter: blur(0); animation-delay: 0s; mix-blend-mode: multiply; }
          .ascii.d1 { mask-image: linear-gradient(120deg, transparent 0%, #000 30%, #000 70%, transparent 100%); filter: blur(0.2px); opacity: .90; animation-delay: 1s; mix-blend-mode: screen; }
          .ascii.d2 { mask-image: linear-gradient(100deg, transparent 0%, #000 20%, #000 80%, transparent 100%); filter: blur(0.4px); opacity: .85; animation-delay: 2s; }
          .ascii.d3 { mask-image: radial-gradient(circle at 70% 30%, #000 60%, transparent 100%); filter: blur(0.6px); opacity: .80; animation-delay: 3s; }
          .ascii.d4 { mask-image: linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%); filter: blur(1.2px); opacity: .75; animation-delay: 4s; }
          .ascii-stack .ascii:first-child{
            position: static;
            visibility: hidden;
            animation: none;
          }

          @keyframes pulse {
            0%,100% { opacity: .35; }
            50% { opacity: 1; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>digitalsolitude</h1>
          <div class="subtitle">a website for one person only</div>
        </div>
        
        <div id="failure-notice" style="display: none; margin: 20px 0; padding: 20px; border: 1px solid #000; background: #f5f5f5; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: normal;">too many people</h3>
          <p style="margin: 0; font-size: 14px; color: #666;">Only one person can use this site. If more than one user connects, it fails for everyone.</p>
          <p style="margin: 0; font-size: 14px; color: #666;">Current visitors: <span id="people-count">2</span></p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">please try again later.</p>
        </div>
        
        <div class="content">
          <div class="ascii-art">
            <div class="ascii-stack">
<pre class="ascii d0">╭─────────────────────────────────────╮
│         this website exists         │
│            in this moment           │
│            for you alone            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│          you have created a         │
│          temporary, private         │
│        corner of the internet       │
│        simply by being here.        │
╰─────────────────────────────────────╯</pre>

<pre class="ascii d1">╭─────────────────────────────────────╮
│         this website exists         │
│            in this moment           │
│            for you alone            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│          you have created a         │
│          temporary, private         │
│        corner of the internet       │
│        simply by being here.        │
╰─────────────────────────────────────╯</pre>

<pre class="ascii d2">╭─────────────────────────────────────╮
│         this website exists         │
│            in this moment           │
│            for you alone            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│          you have created a         │
│          temporary, private         │
│        corner of the internet       │
│        simply by being here.        │
╰─────────────────────────────────────╯</pre>

<pre class="ascii d3">╭─────────────────────────────────────╮
│         this website exists         │
│            in this moment           │
│            for you alone            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│          you have created a         │
│          temporary, private         │
│        corner of the internet       │
│        simply by being here.        │
╰─────────────────────────────────────╯</pre>

<pre class="ascii d4">╭─────────────────────────────────────╮
│         this website exists         │
│            in this moment           │
│            for you alone            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
│                                     │
│             \'/     \'/             │
│            - @ -   - @ -            │
│             /.\     /.\             │
│                                     │
│          you have created a         │
│          temporary, private         │
│        corner of the internet       │
│        simply by being here.        │
╰─────────────────────────────────────╯</pre>
            </div>
          </div>

          <div class="explainer-box">
            <h3>how this works</h3>
            <p>this website can only be visible per person at a time.</p>
            <p>if someone else tries to visit while you're here, both of you will see a failure message. the website cannot function when there are multiple people. it needs complete solitude to exist.</p>
          </div>
        </div>
        
        <div class="footer">
          <p></p>
          <p>built by <a href="https://www.guillaumeslizewicz.com">Guillaume Slizewicz</a> • 2025</p>
        </div>
        
        <div id="status" class="status-indicator disconnected">connecting...</div>
        
        <script>
          // Generate a unique session ID for this visitor
          const sessionId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
          
          let eventSource = null;
          let heartbeatInterval = null;
          let reconnectTimeout = null;
          let isConnected = false;
          
          function updateStatus(text, connected) {
            const status = document.getElementById('status');
            status.textContent = text;
            status.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
          }
          
          function connect() {
            // Clean up any existing connection
            if (eventSource) {
              eventSource.close();
            }
            
            updateStatus('connecting...', false);
            
            // Establish SSE connection with session ID
            eventSource = new EventSource('/events?sessionId=' + sessionId);
            
            eventSource.onopen = function() {
              console.log('Connected to server');
              isConnected = true;
              updateStatus('connected', true);
              
              // Start heartbeat
              if (heartbeatInterval) clearInterval(heartbeatInterval);
              heartbeatInterval = setInterval(sendHeartbeat, 5000);
            };
            
            eventSource.onmessage = function(event) {
              const data = JSON.parse(event.data);
              const failureNotice = document.getElementById('failure-notice');
              const content = document.querySelector('.content');
              const peopleCount = document.getElementById('people-count');
              
              if (data.type === 'too_many_people') {
                // Show failure state
                failureNotice.style.display = 'block';
                content.style.display = 'none';
                peopleCount.textContent = data.count;
              } else if (data.type === 'count_update' || data.type === 'status') {
                if (data.count <= 1) {
                  // Back to normal
                  failureNotice.style.display = 'none';
                  content.style.display = 'block';
                } else {
                  // Still too many people
                  failureNotice.style.display = 'block';
                  content.style.display = 'none';
                  peopleCount.textContent = data.count;
                }
              }
            };
            
            eventSource.onerror = function(e) {
              console.error('SSE connection error', e);
              isConnected = false;
              updateStatus('disconnected', false);
              
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }
              
              // Clear heartbeat
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
              
              // Try to reconnect after a delay
              if (reconnectTimeout) clearTimeout(reconnectTimeout);
              reconnectTimeout = setTimeout(() => {
                console.log('Attempting to reconnect...');
                connect();
              }, 3000);
            };
          }
          
          // Send heartbeat
          async function sendHeartbeat() {
            try {
              const response = await fetch('/heartbeat', { 
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: sessionId })
              });
              
              const data = await response.json();
              
              if (data.status === 'reconnect_needed') {
                console.log('Server says reconnect needed');
                connect();
              }
            } catch (e) {
              console.error('Heartbeat failed:', e);
            }
          }
          
          // Handle page visibility changes
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              // Page is hidden - disconnect
              console.log('Page hidden, disconnecting...');
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
              updateStatus('paused', false);
            } else {
              // Page is visible again - reconnect
              console.log('Page visible, reconnecting...');
              connect();
            }
          });
          
          // Clean up when leaving the page
          window.addEventListener('beforeunload', () => {
            if (eventSource) {
              eventSource.close();
            }
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
            }
          });
          
          // Subtle cursor tracking (no data sent anywhere)
          let mouseTrail = [];
          document.addEventListener('mousemove', (e) => {
            mouseTrail.push({x: e.clientX, y: e.clientY, time: Date.now()});
            if (mouseTrail.length > 10) mouseTrail.shift();
          });
          
          // Start the connection
          connect();
        </script>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🌐 digitalsolitude is running on port ${PORT}`);
  console.log(`🔗 Visit: http://localhost:${PORT}`);
  console.log(`⚠️  Capacity: 1 visitor maximum`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🌫️ digitalsolitude fading away...');
  
  // Send final message to all connected visitors
  const message = `data: ${JSON.stringify({ 
    type: 'server_shutdown', 
    message: 'Server is shutting down' 
  })}\n\n`;
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    try {
      visitor.eventStream.write(message);
      visitor.eventStream.end();
    } catch (e) {
      // Ignore errors during shutdown
    }
  }
  
  process.exit(0);
});