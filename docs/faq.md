# FAQ

## General

### What is Sorted?

A service that pays gas fees on behalf of your users. You fund a gas tank, we sponsor transactions to your allowlisted contracts.

### Why would I use this?

Your users don't need to:
- Own tokens
- Understand gas
- Approve wallet popups
- Know they're using blockchain

They just click buttons. You pay the gas.

### What chains do you support?

Currently Sonic Testnet. More EVM chains coming.

### How much does it cost?

You pay the actual gas cost plus a small fee (pricing TBD during testnet).

---

## Technical

### What is ERC-4337?

A standard for "account abstraction" — smart contract wallets that separate signing from paying. It lets someone else (like us) pay gas for a user's transaction.

### Do my users need wallets?

They need an address, but not necessarily a browser wallet. You can create smart contract wallets for them server-side.

### Do I need to modify my contracts?

No. Sorted works with any existing contract. You just allowlist which contracts and functions you want to sponsor.

### What's a function selector?

The first 4 bytes of the keccak256 hash of the function signature. It identifies which function is being called.

```
mint(address,uint256) → 0x40c10f19
```

### How do I find a function selector?

```javascript
const iface = new ethers.Interface(abi);
const selector = iface.getFunction('mint').selector;
```

Or use [4byte.directory](https://4byte.directory) to look them up.

---

## Security

### Is this safe?

Yes.

- We never touch user private keys
- Only your allowlisted contracts can be sponsored
- All requests are cryptographically signed
- You control spending limits

### Can someone drain my gas tank?

Only if they can call functions on your allowlisted contracts. Set daily spending limits for extra protection.

### What if Sorted goes down?

Transactions won't be sponsored, but your contracts still work normally. Users would just need to pay their own gas.

---

## Billing

### How do I add funds?

Send tokens to your project's deposit address (shown in dashboard).

### What happens when my balance runs out?

New sponsorship requests will fail with a 402 error. Fund your gas tank to continue.

### Can I get a refund?

Contact us. Unused testnet funds can be returned.

---

## Troubleshooting

### "Contract not on allowlist"

Add the contract address and function selector to your allowlist in the dashboard.

### "Insufficient balance"

Your gas tank is empty. Send more tokens to your deposit address.

### "Invalid API key"

Check that you're using the correct API key and it hasn't been revoked.

### "Rate limit exceeded"

You're sending too many requests. Default limit is 100/minute per API key.

### Transaction stuck

Check the bundler status. If using a public bundler, there may be congestion.

---

## Support

### How do I get help?

- [GitHub Issues](https://github.com/b1rdmania/sorted-fund/issues)
- Email: (coming soon)

### Can I request a feature?

Yes. Open a GitHub issue with the `enhancement` label.
