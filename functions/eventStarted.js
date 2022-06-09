const axios = require('axios');
const ethers = require('ethers');
const { abis, addresses } = require('../contracts');
const MAX_GAS_PRICE = ethers.BigNumber.from(4000000000000); 
const dotenv = require('dotenv');

exports.handler = async function(event) {
  if(!event || !event.eventId || event.eventId < 0) {
    throw new Error ('Invalid input: No event id given.');
  }

  console.log('Starting...');
  // Load Contract ABIs
  const AdminABI = abis.Admin;
  const AdminAddress = addresses.Admin;
  console.log('Contract ABIs loaded');

  // Initialize Ethers wallet
  let localConfig = dotenv.config().parsed
  let RPC_PROVIDER = process.env.RPC_PROVIDER || localConfig.RPC_PROVIDER;
  let PRIVATE_KEY = process.env.PRIVATE_KEY || localConfig.PRIVATE_KEY;
  const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log('Ethers wallet loaded');

  // Load contract
  const contract = new ethers.Contract(
    AdminAddress,
    AdminABI,
    wallet,
  )
  console.log('Contract loaded');

  console.log('Calculating gas...');
  let gas = await gasPrice(provider);

  console.log('Sending transaction...');
  try {
    // Specify custom tx overrides, such as gas price https://docs.ethers.io/ethers.js/v5-beta/api-contract.html#overrides
    const overrides = { gasPrice: gas, gasLimit: 50000 };

    // Call smart contract function
    const tx = await contract.pauseEvent(event.eventId, overrides)

    const txReceipt = await provider.waitForTransaction(tx.hash, 14);
    if (txReceipt && txReceipt.status == 1) {
      console.log(`Transaction successfully mined. Hash ${tx.hash}`);
    } else {
      throw new Error(`Failed TxHash: ${tx.hash}`);
    }
  } catch (err) {
    const errorMessage = `Transaction failed: ${err.message}`;
    console.error(errorMessage)
    return false;
  }

  console.log('Completed');
  return true;
}

function postToSlack(text) {
  const payload = JSON.stringify({ 
    text,
  });
  return axios.post(process.env.SLACK_HOOK_URL, payload)
}

async function gasPrice(provider){
  const lastBlock = provider.blockNumber - 1;
  let gasPrices = []

  let blockWithTransactions = await provider.getBlockWithTransactions(lastBlock);
  let currentBlockGasPrices = blockWithTransactions.transactions.map(tx => tx.gasPrice).filter(price => price != undefined);
  gasPrices.push.apply(gasPrices, currentBlockGasPrices);
  if(!gasPrices || gasPrices.length == 0) {
      return undefined;
  }

  // keep higher 15% (without first 5, may be outliers), filter outliers, and return avg.
  gasPrices.sort().reverse();
  const ommitedTopGases = 5;
  if(gasPrices.length > ommitedTopGases) {
    gasPrices = gasPrices.slice(ommitedTopGases, ommitedTopGases + gasPrices.length*0.15); // Future Work: make this with probabilistic algorithms.
  }
  let averageTopGasPrice = gasPrices
      .reduce((a, b) => ethers.BigNumber.from(a || 0).add(b || ethers.BigNumber.from(0)), ethers.BigNumber.from(0))
      .div(ethers.BigNumber.from(gasPrices.length));

  averageTopGasPrice = averageTopGasPrice.mul(ethers.BigNumber.from(2)); // 2x than average

  if (averageTopGasPrice.gt(MAX_GAS_PRICE)) {
      console.log("FastPrice is too expensive " + averageTopGasPrice)
      throw new Error("The network is currently colapsed and gasPrice is too expensive.")
  }

  return averageTopGasPrice.toNumber();
}