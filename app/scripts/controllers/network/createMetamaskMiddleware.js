const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createScaffoldMiddleware = require('json-rpc-engine/src/createScaffoldMiddleware')
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createWalletSubprovider = require('eth-json-rpc-middleware/wallet')

module.exports = createMetamaskMiddleware

/**
 * 创建 Metamask 中间件
 * createMetamaskMiddleware
 * @param version `MetaMask/v${version}`
 * @param getAccounts(req) lookupAccounts middleware next
 * @param processTransaction(txParams, req) sendTransaction middleware next
 * @param processEthSignMessage(msgParams, req) message signatures middleware next
 * @param processTypedMessage(msgParams, req, version) signTypedData middleware next
 * @param processTypedMessageV3(msgParams, req, version) signTypedDataV3 middleware next
 * @param processTypedMessageV4(msgParams, req, version) signTypedDataV4 middleware next
 * @param processPersonalMessage(msgParams, req) personalSign middleware next
 * @param getPendingNonce(address) get pending nonce
 */
function createMetamaskMiddleware ({
  version,
  getAccounts,
  processTransaction,
  processEthSignMessage,
  processTypedMessage,
  processTypedMessageV3,
  processTypedMessageV4,
  processPersonalMessage,
  getPendingNonce,
}) {
  const metamaskMiddleware = mergeMiddleware([
    // createScaffoldMiddleware - if handler is fn, call as middleware
    // if handler is some other value, use as result
    createScaffoldMiddleware({
      // staticSubprovider
      eth_syncing: false,
      web3_clientVersion: `MetaMask/v${version}`,
    }),

    createWalletSubprovider({
      getAccounts,
      processTransaction,
      processEthSignMessage,
      processTypedMessage,
      processTypedMessageV3,
      processTypedMessageV4,
      processPersonalMessage,
    }),

    // if pending, get pending nonce
    createPendingNonceMiddleware({ getPendingNonce }),
  ])
  return metamaskMiddleware
}

function createPendingNonceMiddleware ({ getPendingNonce }) {
  return createAsyncMiddleware(async (req, res, next) => {
    // eth_getTransactionCount 返回指定地址发起的交易总数
    if (req.method !== 'eth_getTransactionCount') return next()
    const address = req.params[0]
    const blockRef = req.params[1]
    if (blockRef !== 'pending') return next()
    res.result = await getPendingNonce(address)
  })
}
