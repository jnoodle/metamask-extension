const asmcrypto = require('asmcrypto.js')
const Unibabel = require('browserify-unibabel')

/**
 * 微软 Edge 浏览器特定的加解密 API
 * A Microsoft Edge-specific encryption class that exposes
 * the interface expected by eth-keykeyring-controller
 */
class EdgeEncryptor {
  /**
   * 将任意对象加密为密文
   * Encrypts an arbitrary object to ciphertext
   *
   * @param {string} password Used to generate a key to encrypt the data
   * @param {Object} dataObject Data to encrypt
   * @returns {Promise<string>} Promise resolving to an object with ciphertext
   */
  encrypt (password, dataObject) {
    var salt = this._generateSalt()
    return this._keyFromPassword(password, salt)
      .then(function (key) {
        var data = JSON.stringify(dataObject)
        var dataBuffer = Unibabel.utf8ToBuffer(data)
        var vector = global.crypto.getRandomValues(new Uint8Array(16))
        var resultbuffer = asmcrypto.AES_GCM.encrypt(dataBuffer, key, vector)

        var buffer = new Uint8Array(resultbuffer)
        var vectorStr = Unibabel.bufferToBase64(vector)
        var vaultStr = Unibabel.bufferToBase64(buffer)
        return JSON.stringify({
          data: vaultStr,
          iv: vectorStr,
          salt: salt,
        })
      })
  }

  /**
   * 从密文解密任意对象
   * Decrypts an arbitrary object from ciphertext
   *
   * @param {string} password Used to generate a key to decrypt the data
   * @param {string} text Ciphertext of an encrypted object
   * @returns {Promise<Object>} Promise resolving to copy of decrypted object
   */
  decrypt (password, text) {
    const payload = JSON.parse(text)
    const salt = payload.salt
    return this._keyFromPassword(password, salt)
      .then(function (key) {
        const encryptedData = Unibabel.base64ToBuffer(payload.data)
        const vector = Unibabel.base64ToBuffer(payload.iv)
        return new Promise((resolve, reject) => {
          var result
          try {
            result = asmcrypto.AES_GCM.decrypt(encryptedData, key, vector)
          } catch (err) {
            return reject(new Error('Incorrect password'))
          }
          const decryptedData = new Uint8Array(result)
          const decryptedStr = Unibabel.bufferToUtf8(decryptedData)
          const decryptedObj = JSON.parse(decryptedStr)
          resolve(decryptedObj)
        })
      })
  }

  /**
   * 使用密码检索加密密钥
   * Retrieves a cryptographic key using a password
   *
   * @private
   * @param {string} password Password used to unlock a cryptographic key
   * @param {string} salt Random base64 data
   * @returns {Promise<Object>} Promise resolving to a derived key
   */
  _keyFromPassword (password, salt) {

    var passBuffer = Unibabel.utf8ToBuffer(password)
    var saltBuffer = Unibabel.base64ToBuffer(salt)
    const iterations = 10000
    const length = 32 // SHA256 hash size
    return new Promise((resolve) => {
      var key = asmcrypto.Pbkdf2HmacSha256(passBuffer, saltBuffer, iterations, length)
      resolve(key)
    })
  }

  /**
   * 生成随机的base64编码数据
   * Generates random base64 encoded data
   *
   * @private
   * @returns {string} Randomized base64 encoded data
   */
  _generateSalt (byteCount = 32) {
    var view = new Uint8Array(byteCount)
    global.crypto.getRandomValues(view)
    var b64encoded = btoa(String.fromCharCode.apply(null, view))
    return b64encoded
  }
}

module.exports = EdgeEncryptor
