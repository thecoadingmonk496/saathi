require('dotenv').config({ path: '../backend/.env' });
require('@nomicfoundation/hardhat-toolbox');

const networks = {};

if (process.env.POLYGON_AMOY_RPC_URL && process.env.BLOCKCHAIN_PRIVATE_KEY) {
  networks.amoy = {
    url: process.env.POLYGON_AMOY_RPC_URL,
    accounts: [process.env.BLOCKCHAIN_PRIVATE_KEY],
    chainId: 80002,
  };
}

module.exports = {
  solidity: '0.8.20',
  networks,
};
