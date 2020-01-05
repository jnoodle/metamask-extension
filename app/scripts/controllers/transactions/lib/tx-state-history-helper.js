const jsonDiffer = require('fast-json-patch')
const clone = require('clone')
/** @module*/
module.exports = {
  generateHistoryEntry,
  replayHistory,
  snapshotFromTxMeta,
  migrateFromSnapshotsToDiffs,
}

/**
  converts non-initial history entries into diffs
  将非第一条（index===0）的历史记录条目转换为差异数组
  @param longHistory {array}
  @returns {array}
*/
function migrateFromSnapshotsToDiffs (longHistory) {
  return (
    longHistory
    // convert non-initial history entries into diffs
      .map((entry, index) => {
        if (index === 0) return entry
        return generateHistoryEntry(longHistory[index - 1], entry)
      })
  )
}

/**
  Generates an array of history objects sense the previous state.
  生成可检测先前状态的历史对象数组
  The object has the keys
    op (the operation performed), 执行的操作
    path (the key and if a nested object then each key will be seperated with a `/`)
          键，如果是嵌套对象，每个键用`/`分隔
    value 值
  with the first entry having the note and a timestamp when the change took place
  第一个条目具有注释和更改发生时的时间戳
  @param previousState {object} - the previous state of the object
  @param newState {object} - the update object
  @param note {string} - a optional note for the state change
  @returns {array}
*/
function generateHistoryEntry (previousState, newState, note) {
  // 比较两个 json，将差异作为数组返回
  const entry = jsonDiffer.compare(previousState, newState)
  // Add a note to the first op, since it breaks if we append it to the entry
  if (entry[0]) {
    if (note) entry[0].note = note

    entry[0].timestamp = Date.now()
  }
  return entry
}

/**
  Recovers previous txMeta state obj 恢复之前的 txMeta state obj
  @returns {object}
*/
function replayHistory (_shortHistory) {
  const shortHistory = clone(_shortHistory)
  // 应用差异
  return shortHistory.reduce((val, entry) => jsonDiffer.applyPatch(val, entry).newDocument)
}

/**
  生成 txMeta 快照，不包含 history
  @param txMeta {Object}
  @returns {object} a clone object of the txMeta with out history
*/
function snapshotFromTxMeta (txMeta) {
  // create txMeta snapshot for history
  const snapshot = clone(txMeta)
  // dont include previous history in this snapshot
  delete snapshot.history
  return snapshot
}
