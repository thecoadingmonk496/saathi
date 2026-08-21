const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const factory = await hre.ethers.getContractFactory('SaathiVerification');
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();

  console.log('SaathiVerification deployed to:', await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
