const ObservableStore = require('obs-store')
const extend = require('xtend')

/**
 * @typedef {Object} InitState
 * @property {Boolean} seedPhraseBackedUp Indicates whether the user has completed the seed phrase backup challenge
 */

/**
 * @typedef {Object} OnboardingOptions
 * @property {InitState} initState The initial controller state
 */

/**
 * 设置用户是否已完成种子短语备份挑战 seedPhraseBackedUp: t/f
 * Controller responsible for maintaining
 * a cache of account balances in local storage
 */
class OnboardingController {
  /**
   * Creates a new controller instance
   *
   * @param {OnboardingOptions} [opts] Controller configuration parameters
   */
  constructor (opts = {}) {
    const initState = extend({
      seedPhraseBackedUp: true,
    }, opts.initState)
    this.store = new ObservableStore(initState)
  }

  setSeedPhraseBackedUp (newSeedPhraseBackUpState) {
    this.store.updateState({
      seedPhraseBackedUp: newSeedPhraseBackUpState,
    })
  }

  getSeedPhraseBackedUp () {
    return this.store.getState().seedPhraseBackedUp
  }

}

module.exports = OnboardingController
