const {
  getMetaMetricState,
} = require('../../../ui/app/selectors/selectors')
const {
  sendMetaMetricsEvent,
} = require('../../../ui/app/helpers/utils/metametrics.util')

const inDevelopment = process.env.NODE_ENV === 'development'

const METAMETRICS_TRACKING_URL = inDevelopment
  ? 'http://www.metamask.io/metametrics'
  : 'http://www.metamask.io/metametrics-prod'

// 连接 metamask 分析服务（metametrics），统计、错误分析等
function backEndMetaMetricsEvent (metaMaskState, eventData) {
  const stateEventData = getMetaMetricState({ metamask: metaMaskState })

  if (stateEventData.participateInMetaMetrics) {
    sendMetaMetricsEvent({
      ...stateEventData,
      ...eventData,
      url: METAMETRICS_TRACKING_URL + '/backend',
    })
  }
}

module.exports = backEndMetaMetricsEvent
