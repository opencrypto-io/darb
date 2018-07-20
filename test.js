
var Exchanges = require('./exchanges')

async function testBook() {
  let book = await Exchanges.TokenJar.getBook('0x607f4c5bb672230e8672085532f7e901544a7375/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
  //let book2 = await Exchanges.Paradex.getBook('1')
  //let book = await Exchanges.EtherDelta.getBook('0x286bda1413a2df81731d4930ce2f862a35a609fe')
  //let book = await Exchanges.IDEX.getBook('ETH_CS')
  
  console.log(book)
}

async function testMarkets() {
  let markets
  try {
    markets = await Exchanges.EtherDelta.getMarkets()
  } catch (e) {
    console.error(e)
  }
  console.log(markets)
}

testBook()
//testMarkets()


