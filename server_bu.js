const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

let activeVisitors = new Map();

// Heartbeat endpoint
app.post('/heartbeat', (req, res) => {
  const visitorId = req.ip + req.headers['user-agent'];
  activeVisitors.set(visitorId, Date.now());
  res.json({ status: 'alive' });
});

// Clean up inactive visitors every 10 seconds
setInterval(() => {
  const now = Date.now();
  for (const [visitorId, lastSeen] of activeVisitors.entries()) {
    if (now - lastSeen > 10000) { // 10 seconds without heartbeat = gone
      activeVisitors.delete(visitorId);
      console.log(`👋 Visitor ${visitorId.slice(0, 10)}... left`);
    }
  }
}, 5000);

// Track visitors 
app.use((req, res, next) => {
  // Skip visitor tracking for heartbeat only
  if (req.path === '/heartbeat') {
    return next();
  }
  
  const visitorId = req.ip + req.headers['user-agent'];
  
  console.log(`👤 Visitor checking in from ${req.ip}`);
  console.log(`👥 Currently active visitors: ${activeVisitors.size}`);
  
  // If someone else is currently active, show graceful lock
  if (activeVisitors.size > 0 && !activeVisitors.has(visitorId)) {
    console.log('🔒 Space is occupied. Showing lock message...');
    
    // Send simple lock message
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>digitalsolitude → occupied</title>
          <style>
            body { 
              background: #fff; 
              color: #000; 
              font-family: 'Courier New', monospace; 
              font-size: 15px;
              line-height: 1.6;
              padding: 40px 20px;
              margin: 0;
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
            }
            .message {
              margin: 40px 0;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #000;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>digitalsolitude</h1>
            <div class="subtitle">a website for one person only</div>
          </div>

          <div class="message">
            <p>this digital space is currently inhabited.</p>
            
            <p>someone else is there.</p>
            
            <p>come back in a moment.</p>
          </div>
          
          <div class="footer">
            <p>built with intentional fragility • a meditation on digital solitude</p>
          </div>
        </body>
      </html>
    `);
    
    return;
  }
  
  // Add this visitor as active
  activeVisitors.set(visitorId, Date.now());
  
  next();
});

// The main website - only for one person
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
            font-size: 10px;
            white-space: pre;
            margin: 30px 0;
            color: #333;
          }
          
          .content {
            margin: 40px 0;
          }
          
          .content p {
            margin-bottom: 20px;
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
            position: absolute;
            left: 0;
            right: 0;
            font-size: 8px;
            color: #ddd;
            text-align: center;
            letter-spacing: 0px;
            overflow: hidden;
          }
          
          .explainer-box::before {
            top: -4px;
          }
          
          .explainer-box::after {
            bottom: -4px;
          }
          
          .explainer-box h3 {
            font-size: 14px;
            font-weight: normal;
            margin-bottom: 15px;
            letter-spacing: 0.3px;
          }
          
          /* Breathing animation */
          .breathe {
            animation: breathe 4s ease-in-out infinite;
          }
          
          @keyframes breathe {
            0%, 100% { 
              transform: scale(1); 
              opacity: 0.9;
            }
            50% { 
              transform: scale(1.015); 
              opacity: 1;
            }
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>digitalsolitude</h1>
          <div class="subtitle">a website for one person only</div>
        </div>

        <div class="ascii-art">
     ╭─────────────────────────────────────╮
     │                                     │
     │          you are alone here         │
     │                                     │
     │        in this quiet moment         │
     │       this space belongs to you     │
     │                                     │
     │           no one else               │
     │          can see this               │
     │                                     │
     ╰─────────────────────────────────────╯
        </div>

        <div class="content">
          <p >this website exists in this moment for you alone.</p>
          
          <p>no analytics track your movement<br>
          no cookies remember your visit<br>
          no database stores your presence</p>
          
          <p class="presence">you have created a temporary, private corner of the internet simply by being here.</p>
          
          <div class="explainer-box">
            <h3>how this works</h3>
            <p>this website can only be visible by one person at a time.</p>
            <p>if someone else tries to visit while you're here, they will see a message letting them know the space is occupied, and they can return when you are gone.</p>
          </div>
          
          <p >stay as long as you need.</p>
          
          <p>the website will wait.</p>
        </div>
        
        <div class="footer">
          <p>built with intentional fragility • a meditation on digital solitude</p>
          <p>concept & code: <a href="www.guillaumeslizewicz.com">Guillaume Slizewicz</a> • 2025</p>
        </div>
        
        <script>
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
            }
          });
          
          // Stop heartbeat when leaving page
          window.addEventListener('beforeunload', () => {
            clearInterval(heartbeat);
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