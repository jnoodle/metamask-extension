const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createScaffoldMiddleware = require('json-rpc-engine/src/createScaffoldMiddleware')
const createBlockReRefMiddleware = require('eth-json-rpc-middleware/block-ref')
const createRetryOnEmptyMiddleware = require('eth-json-rpc-middleware/retryOnEmpty')
const createBlockCacheMiddleware = require('eth-json-rpc-middleware/block-cache')
const createInflightMiddleware = require('eth-json-rpc-middleware/inflight-cache')
const createBlockTrackerInspectorMiddleware = require('eth-json-rpc-middleware/block-tracker-inspector')
const providerFromMiddleware = require('eth-json-rpc-middleware/providerFromMiddleware')
const createInfuraMiddleware = require('eth-json-rpc-infura')
const BlockTracker = require('eth-block-tracker')

module.exports = createInfuraClient

// https://infura.io/ Infura 是一个 Web3 Provider
// https://github.com/MetaMask/json-rpc-engine
//  a tool for processing JSON RPC

/**
 * 创建 Infura API Client https://infura.io/
 * createInfuraClient
 * @param network
 * @param onRequest
 * @return {{networkMiddleware: *, blockTracker: *}}
 */
function createInfuraClient ({ network, onRequest }) {
  // mergeMiddleware add middleware to JsonRpcEngine
  // 所谓的 middleware 就是 function(req, res, next, end){} 这样一个 function
  const infuraMiddleware = mergeMiddleware([
    createRequestHookMiddleware(onRequest),

    // https://github.com/MetaMask/eth-json-rpc-infura#usage-as-middleware
    //  json-rpc-engine middleware for infura's REST endpoints.
    createInfuraMiddleware({ network, maxAttempts: 5, source: 'metamask' }),
  ])

  // https://github.com/MetaMask/eth-json-rpc-middleware
  //  Ethereum middleware for composing an ethereum provider using json-rpc-engine.
  // providerFromMiddleware 将 middleware 转换成 provider
  const infuraProvider = providerFromMiddleware(infuraMiddleware)

  // https://github.com/MetaMask/eth-block-tracker
  //  A JS module for keeping track of the latest Ethereum block by polling an ethereum provider.
  // creates a new block tracker with infuraProvider as a data source
  const blockTracker = new BlockTracker({ provider: infuraProvider })

  const networkMiddleware = mergeMiddleware([
    // network to eth_chainId, net_version
    createNetworkAndChainIdMiddleware({ network }),

    // block cache: 分为 permanently，until fork，for block，never 几种策略
    createBlockCacheMiddleware({ blockTracker }),

    // inflight cache
    createInflightMiddleware(),

    // 根据 Block 在 infura rpc 接口请求参数中的位置，获取 block，如果没有，请求最新的
    createBlockReRefMiddleware({ blockTracker, provider: infuraProvider }),

    // RetryOnEmptyMiddleware will retry any request with an empty response
    createRetryOnEmptyMiddleware({ blockTracker, provider: infuraProvider }),

    // inspect if response contains a block ref higher than our latest block
    createBlockTrackerInspectorMiddleware({ blockTracker }),

    infuraMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}

function createNetworkAndChainIdMiddleware ({ network }) {
  let chainId
  let netId

  switch (network) {
    case 'mainnet':
      netId = '1'
      chainId = '0x01'
      break
    case 'ropsten':
      netId = '3'
      chainId = '0x03'
      break
    case 'rinkeby':
      netId = '4'
      chainId = '0x04'
      break
    case 'kovan':
      netId = '42'
      chainId = '0x2a'
      break
    case 'goerli':
      netId = '5'
      chainId = '0x05'
      break
    default:
      throw new Error(`createInfuraClient - unknown network "${network}"`)
  }

  return createScaffoldMiddleware({
    eth_chainId: chainId,
    net_version: netId,
  })
}

function createRequestHookMiddleware (onRequest) {
  return (req, _, next) => {
    onRequest(req)
    next()
  }
}
