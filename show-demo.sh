#!/bin/bash

# Colors
RESET='\033[0m'
BRIGHT='\033[1m'
GREEN='\033[32m'
BLUE='\033[34m'
YELLOW='\033[33m'
CYAN='\033[36m'
MAGENTA='\033[35m'

echo ""
echo "======================================================================"
echo -e "${BRIGHT}${MAGENTA}🎮  SORTED.FUND - GASLESS TRANSACTION DEMO${RESET}"
echo "======================================================================"
echo ""

echo -e "${CYAN}What this shows:${RESET}"
echo "  • A user made a blockchain transaction"
echo "  • The transaction executed on Sonic testnet"
echo -e "  • ${BRIGHT}${GREEN}The user paid ZERO gas fees${RESET}"
echo "  • Sorted.fund sponsored the entire transaction"
echo ""

echo -e "${BLUE}📊 Transaction Details:${RESET}"
echo ""
echo "  Counter incremented: ${BRIGHT}0${RESET} → ${BRIGHT}${GREEN}1${RESET} ${GREEN}✓${RESET}"
echo "  User balance change: ${BRIGHT}${GREEN}0.0 S (ZERO!)${RESET}"
echo "  Gas used: ${BRIGHT}203,944${RESET}"
echo "  Gas cost: ${BRIGHT}0.000203944 S${RESET} ${YELLOW}(paid by Sorted.fund)${RESET}"
echo ""

echo "======================================================================"
echo -e "${BRIGHT}${CYAN}🔗 View LIVE on Sonic Testnet Explorer:${RESET}"
echo ""
echo -e "${BRIGHT}https://testnet.soniclabs.com/tx/0xef679dfc09206f4c6b8358715ddc519353ce7d5a5b29fa18bf11141bb927cc2c${RESET}"
echo ""

echo -e "${YELLOW}📝 What you can verify on the explorer:${RESET}"
echo "  ${GREEN}✓${RESET} Transaction executed successfully"
echo "  ${GREEN}✓${RESET} SimpleAccount (user) called TestCounter.increment()"
echo "  ${GREEN}✓${RESET} Gas was paid by SortedPaymaster (not the user!)"
echo "  ${GREEN}✓${RESET} User's balance remained unchanged"
echo ""

echo "======================================================================"
echo -e "${BRIGHT}${MAGENTA}✨ That's Sorted.fund - Gasless transactions made simple!${RESET}"
echo ""
echo -e "${CYAN}Want to run it yourself?${RESET}"
echo "  ${BRIGHT}cd contracts && npx hardhat run scripts/demo.ts --network sonic${RESET}"
echo "======================================================================"
echo ""
