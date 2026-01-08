#!/bin/bash

# Manual Refuel Script
# Helper to credit a project's gas tank after receiving a deposit

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Sorted.fund Manual Refuel ===${NC}\n"

# Check arguments
if [ "$#" -lt 2 ]; then
  echo -e "${RED}Usage: $0 <project_id> <amount_in_S> [tx_hash] [note]${NC}"
  echo ""
  echo "Example:"
  echo "  $0 test-game 5.0"
  echo "  $0 test-game 5.0 0xabc123... \"Initial funding\""
  echo ""
  exit 1
fi

PROJECT_ID="$1"
AMOUNT_S="$2"
TX_HASH="${3:-}"
NOTE="${4:-Manual refuel}"

# Convert S to wei (multiply by 10^18)
AMOUNT_WEI=$(node -e "console.log(BigInt(Math.floor($AMOUNT_S * 1e18)).toString())")

echo -e "${YELLOW}Project ID:${NC} $PROJECT_ID"
echo -e "${YELLOW}Amount:${NC} $AMOUNT_S S ($AMOUNT_WEI wei)"
if [ -n "$TX_HASH" ]; then
  echo -e "${YELLOW}TX Hash:${NC} $TX_HASH"
fi
echo -e "${YELLOW}Note:${NC} $NOTE"
echo ""

# Confirm
read -p "Confirm refuel? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled"
  exit 0
fi

# Build JSON payload
if [ -n "$TX_HASH" ]; then
  JSON_PAYLOAD=$(cat <<EOF
{
  "amount": "$AMOUNT_WEI",
  "note": "$NOTE",
  "txHash": "$TX_HASH"
}
EOF
)
else
  JSON_PAYLOAD=$(cat <<EOF
{
  "amount": "$AMOUNT_WEI",
  "note": "$NOTE"
}
EOF
)
fi

# Call API
echo -e "${YELLOW}Calling API...${NC}"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  "http://localhost:3000/projects/$PROJECT_ID/refuel")

# Check if successful
if echo "$RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Refuel successful!${NC}"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}✗ Refuel failed:${NC}"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
