require('@nomicfoundation/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-verify');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();
function getRemappings() {
  return fs
    .readFileSync('remappings.txt', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.trim().split('='));
}

module.exports = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts/',
    artifacts: './artifacts',
    cache: './cache',
  },
  networks: {
    baseSepolia: {
      url: 'https://rpc.ankr.com/base_sepolia/ea0fdcba2481a3863fcf3e2655da7c837d66fed33fb5efd8c760d19dbd2ef1d3',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: '2PXFYC8SA41D8XMXD6WV1PAKB3TSXFF8UU',
    // apiKey: {
    //   polygonMumbai: "QFZE642XXV4YANFUCC3MQ3NERX6XH1UXAV",
    //   polygon: "E4BJZUVP3WER9IJD5QIPCTPTJRMQVFY5RZ",
    //   goerli: "7TMQDQN93WFJ6Y9IGK7GAPJCQK8WSH6YMT",
    //   sepolia:"7TMQDQN93WFJ6Y9IGK7GAPJCQK8WSH6YMT",
    //   mainnet: "7TMQDQN93WFJ6Y9IGK7GAPJCQK8WSH6YMT",
    //   zkEVMTest: "C7546JVE9YTJD37SBGFK5S1UJ8DJQ126VY",
    //   scrollSepolia: "48EQKFV3BTGJN8DRY4E2UNMMYZIITYFSPY",
    //   'base-goerli': "7M6RR9S9IKPD8NPWKS31WJKBEGMJ7DSFEU",
    //   mantleTest: '7TMQDQN93WFJ6Y9IGK7GAPJCQK8WSH6YMT',
    //   arbitrumSepolia: "D9GTGHZAGBC6113J2AWP7A88J9YM9QINKN",
    //   "blast_sepolia": "blast_sepolia",
    //   "haqq-test": "haqq-test",
    //   "haqq": "haqq",
    //   "optimism-sepolia": "P4ZWIXR1RBBND4VBGHJDEPFBPM7RDJZ1FZ",
    //   "optimism": "P4ZWIXR1RBBND4VBGHJDEPFBPM7RDJZ1FZ",
    //   polygonAmoy: "QFZE642XXV4YANFUCC3MQ3NERX6XH1UXAV",
    //   "blast": "QURH2Y7ICHRUM3RPUMJKSNK13MWQSBUM7F",
    //   "moonbeam": "9YDEXVXIY26M162QFKP5Z2T3QPZDCSM8G5",
    //   "celo": "4U7N4IKS99MDQKKWFUQ4V8HQYSQKX7MQNQ",
    //   "klaytn": "unnecessary",
    //   "klaytn-baobab": "unnecessary",
    //   "base_sepolia": "K28YD7BM4DVNY29MKU6ZY4B3AW39PN59Y2",
    //   "base-mainnet": "6HX5KUBSHQZRWQCEMPXEQ16SWBCN5JT3I8",
    //   "kroma-mainnet": "J5Y18ZM4DC8D3AA4ITY9ZJISGVTIFX5PVX",
    //   "kroma-testnet": "J5Y18ZM4DC8D3AA4ITY9ZJISGVTIFX5PVX",
    //   baseSepolia: "6HX5KUBSHQZRWQCEMPXEQ16SWBCN5JT3I8",
    // },
    // customChains: [
    //   {
    //     network: "polygonAmoy",
    //     chainId: 80002,
    //     urls: {
    //       apiURL: "https://api-amoy.polygonscan.com/api",
    //       browserURL: "https://amoy.polygonscan.com/"
    //     }
    //   },
    //   {
    //     network: "arbitrumSepolia",
    //     chainId: 421614,
    //     urls: {
    //       apiURL: "https://api-sepolia.arbiscan.io/api",
    //       browserURL: "https://sepolia.arbiscan.io/"
    //     }
    //   },
    //   {
    //     network: "zkEVMTest",
    //     chainId: 1442,
    //     urls: {
    //       apiURL: "https://api-testnet-zkevm.polygonscan.com/api",
    //       browserURL: "https://testnet-zkevm.polygonscan.com/"
    //     }
    //   },
    //   {
    //     network: 'scrollSepolia',
    //     chainId: 534351,
    //     urls: {
    //       apiURL: 'https://api-sepolia.scrollscan.com/api',
    //       browserURL: 'https://sepolia-blockscout.scroll.io/',
    //     },
    //   },
    //   {
    //     network: 'base-goerli',
    //     chainId: 84531,
    //     urls: {
    //       apiURL: 'https://api-goerli.basescan.org/api',
    //       browserURL: 'https://goerli.basescan.org/',
    //     },
    //   },
    //   {
    //     network: "mantleTest",
    //     chainId: 5001,
    //     urls: {
    //       apiURL: "https://explorer.testnet.mantle.xyz/api",
    //       browserURL: "https://explorer.testnet.mantle.xyz"
    //     }
    //   },
    //   {
    //     network: "haqq-test",
    //     chainId: 54211,
    //     urls: {
    //       apiURL: "https://explorer.testedge2.haqq.network/api",
    //       browserURL: "explorer.testedge2.haqq.network"

    //     }
    //   },
    //   {
    //     network: "blast_sepolia",
    //     chainId: 168587773,
    //     urls: {
    //       apiURL: "https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan",
    //       browserURL: "https://testnet.blastscan.io"
    //     }
    //   },
    //   {
    //     network: "optimism-sepolia",
    //     chainId: 11155420,
    //     urls: {
    //       apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
    //       browserURL: "https://sepolia.optimism.io"
    //     }
    //   },
    //   {
    //     network: "optimism",
    //     chainId: 10,
    //     urls: {
    //       apiURL: "https://api-optimistic.etherscan.io/api",
    //       browserURL: "https://optimistic.etherscan.io"
    //     }
    //   },
    //   {
    //     network: "haqq",
    //     chainId: 11235,
    //     urls: {
    //       apiURL: "https://explorer.haqq.network/api",
    //       browserURL: "https://explorer.haqq.network"
    //     }
    //   },
    //   {
    //     network: "blast",
    //     chainId: 81457,
    //     urls: {
    //       apiURL: "https://api.blastscan.io/api",
    //       browserURL: "https://blastscan.io"
    //     }
    //   },
    //   {
    //     network: "moonbeam",
    //     chainId: 1284,
    //     urls: {
    //       apiURL: "https://api-moonbeam.moonscan.io/api",
    //       browserURL: "https://moonbeam.moonscan.io/"
    //     }
    //   },
    //   {
    //     network: "celo",
    //     chainId: 42220,
    //     urls: {
    //       apiURL: "https://api.celoscan.io/api",
    //       browserURL: "https://celoscan.io/"
    //     }
    //   },
    //   {
    //     network: "klaytn",
    //     chainId: 8217,
    //     urls: {
    //       apiURL: "https://api-cypress.klaytnscope.com/api",
    //       browserURL: "https://klaytnscope.com",
    //     },
    //   },
    //   {
    //     network: "klaytn-baobab",
    //     chainId: 1001,
    //     urls: {
    //       apiURL: "https://www.oklink.com/api/explorer/v1/contract/verify/async/api/polygonAmoy",
    //       browserURL: "https://www.oklink.com/amoy"
    //     },
    //   },
    //   {
    //     network: "base_sepolia",
    //     chainId: 84532,
    //     urls: {
    //       apiURL: "https://rpc.ankr.com/base_sepolia",
    //       browserURL: "https://sepolia.basescan.org"
    //     }
    //   },
    //   {
    //     network: "base-mainnet",
    //     chainId: 8453,
    //     urls: {
    //       apiURL: "https://api.basescan.org/api",
    //       browserURL: "https://mainnet.basescan.org"
    //     }
    //   },
    //   {
    //     network: "kroma-mainnet",
    //     chainId: 255,
    //     urls: {
    //       apiURL: "https://api.kromascan.com/api",
    //       browserURL: "https://kromascan.com/",
    //     },
    //   },
    //   {
    //     network: "kroma-testnet",
    //     chainId: 2358,
    //     urls: {
    //       apiURL: "https://api-sepolia.kromascan.com/",
    //       browserURL: "https://sepolia.kromascan.com/",
    //     },
    //   },
    //   {
    //     network: "baseSepolia",
    //     chainId: 84532,
    //     urls: {
    //       apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
    //       browserURL: "https://sepolia.basescan.org"
    //     }
    //   }
    // ]
  },
  verify: {
    blockscout: {
      enabled: false,
    },
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
  // This fully resolves paths for imports in the ./lib directory for Hardhat
  preprocess: {
    eachLine: () => ({
      transform: (line) => {
        if (line.match(/^\s*import /i)) {
          getRemappings().forEach(([find, replace]) => {
            if (line.match(find)) {
              line = line.replace(find, replace);
            }
          });
        }
        return line;
      },
    }),
  },
};
