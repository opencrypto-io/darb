
var Exchanges = require('./exchanges')

async function testBook() {
  let book = await Exchanges.StarBitex.getBook('0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
  console.log(book)
}

async function testMarkets() {
  let markets = await Exchanges.StarBitex.getMarkets()
  console.log(markets)
}

testBook()
//testMarkets()


