const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createFetchMiddleware = require('eth-json-rpc-middleware/fetch')
const createBlockRefRewriteMiddleware = require('eth-json-rpc-middleware/block-ref-rewrite')
const createBlockCacheMiddleware = require('eth-json-rpc-middleware/block-cache')
const createInflightMiddleware = require('eth-json-rpc-middleware/inflight-cache')
const createBlockTrackerInspectorMiddleware = require('eth-json-rpc-middleware/block-tracker-inspector')
const providerFromMiddleware = require('eth-json-rpc-middleware/providerFromMiddleware')
const BlockTracker = require('eth-block-tracker')

module.exports = createJsonRpcClient

// 创建 Json Rpc Client
// https://github.com/MetaMask/json-rpc-engine

function createJsonRpcClient ({ rpcUrl }) {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl })
  const blockProvider = providerFromMiddleware(fetchMiddleware)
  const blockTracker = new BlockTracker({ provider: blockProvider })

  const networkMiddleware = mergeMiddleware([
    // rewrite blockRef to block-tracker's block number if necessary
    createBlockRefRewriteMiddleware({ blockTracker }),
    // block cache
    createBlockCacheMiddleware({ blockTracker }),
    // inflight cache
    createInflightMiddleware(),
    // inspect if response contains a block ref higher than our latest block
    createBlockTrackerInspectorMiddleware({ blockTracker }),
    // do fetch, 出现超时错误会重试
    fetchMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}
