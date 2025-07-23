const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let activeVisitors = new Map();

// Server-sent events for real-time updates
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const visitorId = req.ip + req.headers['user-agent'];
  
  // Store this connection
  activeVisitors.set(visitorId, { 
    lastSeen: Date.now(), 
    eventStream: res 
  });
  
  // Send initial state
  res.write(`data: ${JSON.stringify({ 
    type: 'status', 
    count: activeVisitors.size 
  })}\n\n`);
  
  // If there are now 2+ people, everyone fails
  if (activeVisitors.size >= 2) {
    broadcastFailure();
  }
  
  req.on('close', () => {
    activeVisitors.delete(visitorId);
    broadcastUpdate();
  });
});

// Broadcast failure to everyone
function broadcastFailure() {
  const message = `data: ${JSON.stringify({ 
    type: 'too_many_people', 
    count: activeVisitors.size 
  })}\n\n`;
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    try {
      visitor.eventStream.write(message);
    } catch (e) {
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
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    try {
      visitor.eventStream.write(message);
    } catch (e) {
      activeVisitors.delete(visitorId);
    }
  }
}

// Heartbeat endpoint
app.post('/heartbeat', (req, res) => {
  const visitorId = req.ip + req.headers['user-agent'];
  
  if (activeVisitors.has(visitorId)) {
    activeVisitors.get(visitorId).lastSeen = Date.now();
  }
  res.json({ status: 'alive' });
});

// Clean up inactive visitors every 5 seconds
setInterval(() => {
  const now = Date.now();
  let changed = false;
  
  for (const [visitorId, visitor] of activeVisitors.entries()) {
    if (now - visitor.lastSeen > 10000) { // 10 seconds without heartbeat = gone
      activeVisitors.delete(visitorId);
      console.log(`👋 Visitor ${visitorId.slice(0, 10)}... left`);
      changed = true;
    }
  }
  
  if (changed) {
    broadcastUpdate();
  }
}, 5000);

// Track visitors 
app.use((req, res, next) => {
  // Skip visitor tracking for heartbeat and events
  if (req.path === '/heartbeat' || req.path === '/events') {
    return next();
  }

  const visitorId = req.ip + req.headers['user-agent'];
  
  console.log(`👤 Visitor checking in from ${req.ip}`);
  console.log(`👥 Currently active visitors: ${activeVisitors.size}`);
  
  // Add this visitor as active (this is the key change - no longer blocking here)
  activeVisitors.set(visitorId, { 
    lastSeen: Date.now(), 
    eventStream: null 
  });

  next();
});

// The main website
app.get('/', (req, res) => {
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
            white-space: pre;
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
            /* Gentle wave border */
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
          

          
          /* Gentle presence */
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
          
          @media (max-width: 600px) {
            body { padding: 20px 15px; font-size: 14px; }
            .ascii-art { font-size: 8px; }
          }
        /* layered ASCII animation */
        .ascii-stack      { position: relative; display: inline-block; }
        .ascii-stack .ascii {
          position: absolute;             /* pile the layers */
          top: 0; left: 0; margin: 0;
          font-family: "Courier New", monospace;
          white-space: pre;
          animation: pulse 8s ease-in-out infinite;
          will-change: opacity, filter;   /* helps to smooth the first seconds */
          transform: translateZ(0);       /* forces GPU compositing */
        }
        .ascii.d0 { filter: blur(0   ); animation-delay: 0s; }
        .ascii.d1 { filter: blur(0.4px); opacity: .90; animation-delay: 1s; }
        .ascii.d2 { filter: blur(0.8px); opacity: .85; animation-delay: 2s; }
        .ascii.d3 { filter: blur(1.2px); opacity: .80; animation-delay: 3s; }
        .ascii.d4 { filter: blur(1.6px); opacity: .75); animation-delay: 4s; }
        .ascii-stack .ascii:first-child{
          position: static;         /* restores height */
          visibility: hidden;       /* removes it from view */
          animation: none;          /* stops the pulse */
        }

        @keyframes pulse {
          0%,100% { opacity: .35; }
          50%     { opacity: 1;  }
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
          <p style="margin: 0; font-size: 14px; color: #666;">Only one person can use this site. If more than one user connects, it fails for everyone.
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
│          no analytics track         │
│            your movement            │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
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
│          no analytics track         │
│            your movement            │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
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
│          no analytics track         │
│            your movement            │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
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
│          no analytics track         │
│            your movement            │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
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
│          no analytics track         │
│            your movement            │
│         no cookies remember         │
│              your visit             │
│          no database stores         │
│            your presence            │
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
          <p>built with intentional fragility • a meditation on digital solitude</p>
          <p>concept & code: <a href="https://www.guillaumeslizewicz.com">Guillaume Slizewicz</a> • 2025</p>
        </div>
        
        <script>
          // Real-time updates via Server-Sent Events
          const eventSource = new EventSource('/events');
          
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
              }
            }
          };
          
          // Keep visitor alive while on page
          function sendHeartbeat() {
            fetch('/heartbeat', { method: 'POST' })
              .catch(() => {}); // Ignore errors silently
          }
          
          // Send heartbeat every 5 seconds while page is active
          const heartbeat = setInterval(sendHeartbeat, 5000);
          
          // Stop heartbeat when page is hidden/closed
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              clearInterval(heartbeat);
              eventSource.close();
            }
          });
          
          // Stop heartbeat when leaving page
          window.addEventListener('beforeunload', () => {
            clearInterval(heartbeat);
            eventSource.close();
          });
          
          // Subtle cursor tracking (no data sent anywhere)
          let mouseTrail = [];
          document.addEventListener('mousemove', (e) => {
            mouseTrail.push({x: e.clientX, y: e.clientY, time: Date.now()});
            if (mouseTrail.length > 10) mouseTrail.shift();
          });
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
  process.exit(0);
});