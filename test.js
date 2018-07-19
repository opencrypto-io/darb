
var Exchanges = require('./exchanges')

async function testBook() {
  let book = await Exchanges.OasisDEX.getBook('MKRDAI')
  console.log(book)
}

async function testMarkets() {
  let markets = await Exchanges.IDEX.getMarkets()
  console.log(markets)
}

testBook()
//testMarkets()


