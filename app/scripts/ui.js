
// this must run before anything else
require('./lib/freezeGlobals')

// polyfills
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'

const PortStream = require('extension-port-stream')
const { getEnvironmentType } = require('./lib/util')
const { ENVIRONMENT_TYPE_NOTIFICATION, ENVIRONMENT_TYPE_FULLSCREEN, ENVIRONMENT_TYPE_POPUP } = require('./lib/enums')
const extension = require('extensionizer')
const ExtensionPlatform = require('./platforms/extension')
const NotificationManager = require('./lib/notification-manager')
const notificationManager = new NotificationManager()
const setupSentry = require('./lib/setupSentry')
const {EventEmitter} = require('events')
const Dnode = require('dnode')
const Eth = require('ethjs')
const EthQuery = require('eth-query')
const urlUtil = require('url')
const launchMetaMaskUi = require('../../ui')
const StreamProvider = require('web3-stream-provider')
const {setupMultiplex} = require('./lib/stream-utils.js')
const log = require('loglevel')

// UI 相关方法

start().catch(log.error)

async function start () {

  // create platform global
  global.platform = new ExtensionPlatform()

  // setup sentry error reporting
  const release = global.platform.getVersion()
  setupSentry({ release, getState })
  // provide app state to append to error logs
  function getState () {
    // get app state
    const state = window.getCleanAppState()
    // remove unnecessary data
    delete state.localeMessages
    delete state.metamask.recentBlocks
    // return state to be added to request
    return state
  }

  // 识别窗口类型（弹出窗口，通知）
  // identify window type (popup, notification)
  const windowType = getEnvironmentType(window.location.href)
  global.METAMASK_UI_TYPE = windowType
  closePopupIfOpen(windowType)

  // setup stream to background
  const extensionPort = extension.runtime.connect({ name: windowType })
  const connectionStream = new PortStream(extensionPort)

  const activeTab = await queryCurrentActiveTab(windowType)
  initializeUiWithTab(activeTab)

  // 如果 popop 开着，则关掉
  function closePopupIfOpen (windowType) {
    if (windowType !== ENVIRONMENT_TYPE_NOTIFICATION) {
      // should close only chrome popup
      notificationManager.closePopup()
    }
  }

  // 初始化 UI 出错，则提示：MetaMask应用无法加载：请重新打开并关闭MetaMask以重新启动
  function displayCriticalError (container, err) {
    container.innerHTML = '<div class="critical-error">The MetaMask app failed to load: please open and close MetaMask again to restart.</div>'
    container.style.height = '80px'
    log.error(err.stack)
    throw err
  }

  // 初始化 UI
  function initializeUiWithTab (tab) {
    const container = document.getElementById('app-content')
    initializeUi(tab, container, connectionStream, (err, store) => {
      if (err) {
        return displayCriticalError(container, err)
      }

      const state = store.getState()
      const { metamask: { completedOnboarding } = {} } = state

      if (!completedOnboarding && windowType !== ENVIRONMENT_TYPE_FULLSCREEN) {
        global.platform.openExtensionInBrowser()
      }
    })
  }
}

// 查询当前激活的 tab
async function queryCurrentActiveTab (windowType) {
  return new Promise((resolve) => {
    // At the time of writing we only have the `activeTab` permission which means
    // that this query will only succeed in the popup context (i.e. after a "browserAction")
    if (windowType !== ENVIRONMENT_TYPE_POPUP) {
      resolve({})
      return
    }

    extension.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const [activeTab] = tabs
      const {title, url} = activeTab
      const { hostname: origin, protocol } = url ? urlUtil.parse(url) : {}
      resolve({
        title, origin, protocol, url,
      })
    })
  })
}

//
function initializeUi (activeTab, container, connectionStream, cb) {
  connectToAccountManager(connectionStream, (err, backgroundConnection) => {
    if (err) {
      return cb(err)
    }

    launchMetaMaskUi({
      activeTab,
      container,
      backgroundConnection,
    }, cb)
  })
}

/**
 * 建立与后台和 Web3 provider 的连接
 * Establishes a connection to the background and a Web3 provider
 *
 * @param {PortDuplexStream} connectionStream PortStream instance establishing a background connection
 * @param {Function} cb Called when controller connection is established
 */
function connectToAccountManager (connectionStream, cb) {
  const mx = setupMultiplex(connectionStream)
  setupControllerConnection(mx.createStream('controller'), cb)
  setupWeb3Connection(mx.createStream('provider'))
}

/**
 * 建立与 Web3 provider 提供程序的流连接
 * Establishes a streamed connection to a Web3 provider
 *
 * @param {PortDuplexStream} connectionStream PortStream instance establishing a background connection
 */
function setupWeb3Connection (connectionStream) {
  const providerStream = new StreamProvider()
  providerStream.pipe(connectionStream).pipe(providerStream)
  connectionStream.on('error', console.error.bind(console))
  providerStream.on('error', console.error.bind(console))
  global.ethereumProvider = providerStream
  global.ethQuery = new EthQuery(providerStream)
  global.eth = new Eth(providerStream)
}

/**
 * 建立与后台账户管理的流式连接
 * Establishes a streamed connection to the background account manager
 *
 * @param {PortDuplexStream} connectionStream PortStream instance establishing a background connection
 * @param {Function} cb Called when the remote account manager connection is established
 */
function setupControllerConnection (connectionStream, cb) {
  const eventEmitter = new EventEmitter()
  const backgroundDnode = Dnode({
    sendUpdate: function (state) {
      eventEmitter.emit('update', state)
    },
  })
  connectionStream.pipe(backgroundDnode).pipe(connectionStream)
  backgroundDnode.once('remote', function (backgroundConnection) {
    backgroundConnection.on = eventEmitter.on.bind(eventEmitter)
    cb(null, backgroundConnection)
  })
}
