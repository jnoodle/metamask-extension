const Through = require('through2')
const ObjectMultiplex = require('obj-multiplex')
const pump = require('pump')

// https://github.com/rvagg/through2
// https://github.com/kumavis/obj-multiplex
// https://github.com/mafintosh/pump

module.exports = {
  jsonParseStream: jsonParseStream,
  jsonStringifyStream: jsonStringifyStream,
  setupMultiplex: setupMultiplex,
}

/**
 * 返回 JSON.parse 后的 stream
 * Returns a stream transform that parses JSON strings passing through
 * @return {stream.Transform}
 */
function jsonParseStream () {
  return Through.obj(function (serialized, _, cb) {
    this.push(JSON.parse(serialized))
    cb()
  })
}

/**
 * 返回 JSON.stringify 后的 stream
 * Returns a stream transform that calls {@code JSON.stringify}
 * on objects passing through
 * @return {stream.Transform} the stream transform
 */
function jsonStringifyStream () {
  return Through.obj(function (obj, _, cb) {
    this.push(JSON.stringify(obj))
    cb()
  })
}

/**
 * 把 stream 转换成多路复用 stream
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
function setupMultiplex (connectionStream) {
  const mux = new ObjectMultiplex()
  pump(
    connectionStream,
    mux,
    connectionStream,
    (err) => {
      if (err) console.error(err)
    }
  )
  return mux
}
