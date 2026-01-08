import { ethers } from 'hardhat';

async function main() {
  const SIMPLE_ACCOUNT = process.env.SIMPLE_ACCOUNT_ADDRESS!;

  const simpleAccount = await ethers.getContractAt('SimpleAccount', SIMPLE_ACCOUNT);
  const nonce = await simpleAccount.getNonce();

  console.log(`\nSimpleAccount: ${SIMPLE_ACCOUNT}`);
  console.log(`Current nonce: ${nonce}`);
  console.log(`\nThis is the next nonce that will be used for a UserOperation.`);
  console.log(`If you're getting AA25 errors, wait 60 seconds and try again.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
