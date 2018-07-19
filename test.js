
var Exchanges = require('./exchanges')

async function testBook() {
  let book = await Exchanges.TokenJar.getBook('0xe94327d07fc17907b4db788e5adf2ed424addff6/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
  console.log(book)
  let book2 = await Exchanges.Paradex.getBook('1')
  console.log(book2)
}

async function testMarkets() {
  let markets = await Exchanges.TokenJar.getMarkets()
  console.log(markets)
}

testBook()
//testMarkets()


