const MAX = Number.MAX_SAFE_INTEGER

let idCounter = Math.round(Math.random() * MAX)

// 生成随机id（初始id++）
function createRandomId () {
  idCounter = idCounter % MAX
  return idCounter++
}

module.exports = createRandomId
