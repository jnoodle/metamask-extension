const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createFetchMiddleware = require('eth-json-rpc-middleware/fetch')
const createBlockRefRewriteMiddleware = require('eth-json-rpc-middleware/block-ref-rewrite')
const createBlockTrackerInspectorMiddleware = require('eth-json-rpc-middleware/block-tracker-inspector')
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const providerFromMiddleware = require('eth-json-rpc-middleware/providerFromMiddleware')
const BlockTracker = require('eth-block-tracker')

const inTest = process.env.IN_TEST === 'true'

module.exports = createLocalhostClient

// 创建本地服务 Client
function createLocalhostClient () {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl: 'http://localhost:8545/' })
  const blockProvider = providerFromMiddleware(fetchMiddleware)
  const blockTracker = new BlockTracker({ provider: blockProvider, pollingInterval: 1000 })

  const networkMiddleware = mergeMiddleware([
    // 估算交易需要的gas用量，delay 2秒？
    createEstimateGasMiddleware(),
    // rewrite blockRef to block-tracker's block number if necessary
    createBlockRefRewriteMiddleware({ blockTracker }),
    // inspect if response contains a block ref higher than our latest block
    createBlockTrackerInspectorMiddleware({ blockTracker }),
    // do fetch
    fetchMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}

function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}


function createEstimateGasMiddleware () {
  return createAsyncMiddleware(async (req, _, next) => {
    if (req.method === 'eth_estimateGas' && inTest) {
      await delay(2000)
    }
    return next()
  })
}
