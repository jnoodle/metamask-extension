const extractEthjsErrorMessage = require('./extractEthjsErrorMessage')

module.exports = reportFailedTxToSentry

//
// utility for formatting failed transaction messages
// for sending to sentry
//

// 格式化失败的 tx message，发给 sentry https://sentry.io/
function reportFailedTxToSentry ({ sentry, txMeta }) {
  const errorMessage = 'Transaction Failed: ' + extractEthjsErrorMessage(txMeta.err.message)
  sentry.captureMessage(errorMessage, {
    // "extra" key is required by Sentry
    extra: { txMeta },
  })
}
