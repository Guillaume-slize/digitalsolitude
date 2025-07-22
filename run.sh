#!/bin/bash

echo "🌐 starting digitalsolitude..."
echo "🔄 auto-restart enabled: site will recreate after each disappearance"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

disappearance_count=0

# Infinite loop to restart the server
while true; do
    echo -e "${GREEN}⚡ starting server... (disappearance #$disappearance_count)${NC}"
    
    # Run the Node.js server
    node server.js
    
    # If we get here, the server disappeared
    disappearance_count=$((disappearance_count + 1))
    
    echo ""
    echo -e "${RED}🌫️ digitalsolitude disappeared! (total disappearances: $disappearance_count)${NC}"
    echo -e "${YELLOW}⏳ recreating in 3 seconds...${NC}"
    echo ""
    
    # Wait a moment before restarting
    sleep 3
done