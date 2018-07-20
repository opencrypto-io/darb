const _ = require('lodash')
const axios = require('axios')
const WebSocket = require('ws')
const sleep = require('util').promisify(setTimeout)

const wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

function random() {
  return parseInt((Math.random()*1000000) + (new Date().getTime()/1000000))
}

class Exchange_OasisDEX {
  static info() {
    return {
      name: 'OasisDEX',
      url: 'https://oasisdex.com/',
      trade_url: 'https://oasisdex.com/trade/@{quote}/@{base}',
      weth: true,
      weth_symbol: 'W-ETH'
    }
  }
  static async getMarkets() {
    const resp = await axios({
      url: 'http://api.oasisdex.com/v1/markets/'
    })
    const binding = {
      WETH: {
        addr: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        symbol: 'WETH'
      },
      MKR: {
        addr: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
        symbol: 'MKR'
      },
      DAI: {
        addr: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
        symbol: 'DAI'
      }
    }
    let out = []
    Object.keys(resp.data.data).forEach(pk => {
      let i = resp.data.data[pk]
      let spl = i.pair.split('/').map((k) => {
        if (k === 'ETH') {
          return 'WETH'
        }
        return k
      })
      if (i.price == 'null') {
        return
      }
      out.push({
        pair: i.pair.replace('/', '-').replace('ETH', 'WETH'),
        key: i.pair.replace('/', ''),
        quote: binding[spl[0]],
        base: binding[spl[1]],
      })
    })
    return out
  }
  static async getBook(id) {
    const resp = await axios({
      method: 'post',
      url: 'https://data.makerdao.com/v1',
      headers: {
        'Content-Type': 'application/graphql'
      },
      data: '{ allOasisOrders(condition: { market: "'+id+'" }) { totalCount nodes { market offerId price amount act } } }'
    })
    let orders = resp.data.data.allOasisOrders.nodes
    let output = { bid: [], ask: [] }
    orders.forEach((o) => {
      output[o.act].push({
        price: parseFloat(o.price),
        amount: parseFloat(o.amount / o.price)
      })
    })
    output.bid = _.sortBy(output.bid, [ 'price' ]).reverse()
    output.ask = _.sortBy(output.ask, [ 'price' ])
    return output
  }
}

class Exchange_RadarRelay {
  static info() {
    return {
      name: 'Radar Relay',
      url: 'https://radarrelay.com/',
      trade_url: 'https://app.radarrelay.com/@{quote}/@{base}',
      weth: true
    }
  }
  static async getMarkets() {
    const resp = await axios({
      url: 'https://api.radarrelay.com/v0/markets',
    })
    return resp.data.map(m => {
      let ss = m.displayName.split('/')
      return {
        pair: m.id,
        key: m.id,
        quote: {
          addr: m.baseTokenAddress,
          symbol: ss[0],
        },
        base: {
          addr: m.quoteTokenAddress,
          symbol: ss[1],
        }
      }
    })
  }
  static async getBook(id) {
    const resp = await axios({
      url: 'https://api.radarrelay.com/v0/markets/'+id+'/book',
    })
    function fbook(ob) {
      return ob.map((x) => {
        let item = {
          price: parseFloat(x.price),
          amount: parseFloat(x.remainingBaseTokenAmount)
        }
        if (id == 'WETH-DAI') {
          item.price = 1/item.price
        }
        return item
      })
    }
    return {
      bid: fbook(resp.data.bids),
      ask: fbook(resp.data.asks)
    }
  }
}

class Exchange_ERCDex {
  static info() {
    return {
      name: 'ERC dEX',
      url: 'https://ercdex.com/',
      trade_url: 'https://app.ercdex.com/#/@{quote}/@{base}',
      weth: true
    }
  }
  static async getMarkets(id) {
    const resp = await axios({
      url: 'https://api.ercdex.com/api/token-pairs/1'
    })
    return resp.data.map(i => {
      return {
        pair: i.tokenA.symbol + '-' + i.tokenB.symbol,
        key: 'baseTokenAddress=' + i.tokenA.address + '&quoteTokenAddress=' + i.tokenB.address,
        quote: {
          addr: i.tokenA.address,
          symbol: i.tokenA.symbol,
        },
        base: {
          addr: i.tokenB.address,
          symbol: i.tokenB.symbol,
        }
      }
    })
  }
  static async getBook(id) {
    const resp = await axios({
      url: 'https://api.ercdex.com/api/aggregated_orders?networkId=1&'+id
    })
    function reform(arr) {
      return _.sortBy(arr.priceLevels.map((i) => {
        return {
          price: parseFloat(i.price),
          amount: parseFloat(i.volume/1e18)
        }
      }), [ 'price' ])
    }
    return { 
      bid: reform(resp.data.buys).reverse(),
      ask: reform(resp.data.sells)
    }
  }
}

class Exchange_DDEX {
  static info() {
    return {
      name: 'DDEX',
      url: 'https://ddex.io/',
      trade_url: 'https://ddex.io/trade/@{quote}-@{base}',
      weth: false
    }
  }
  static async getMarkets(id) {
    const resp = await axios({
      url: 'https://api.ddex.io/v2/markets'
    })
    return resp.data.data.markets.map(i => {
      return {
        pair: i.quoteToken + '-' + i.baseToken.replace('ETH', 'WETH'),
        key: i.quoteToken + '-' + i.baseToken,
        quote: {
          addr: i.quoteTokenAddress,
          symbol: i.quoteToken,
        },
        base: {
          addr: i.baseTokenAddress,
          symbol: i.baseToken,
        }
      }
    })
  }
  static async getBook(id) {
    const resp = await axios({
      url: 'https://api.ddex.io/v2/markets/'+id+'/orderbook',
    })
    function reform(arr) {
      return arr.map(i => {
        return {
          price: parseFloat(i.price),
          amount: parseFloat(i.amount)
        }
      })
    }
    let book = resp.data.data.orderBook
    return {
      bid: reform(book.bids),
      ask: reform(book.asks)
    }
  }
}

class Exchange_StarBitex {
  static info() {
    return {
      name: 'Star Bitex',
      url: 'https://www.starbitex.com/T',
      trade_url: 'https://www.starbitex.com/Trade',
      weth: true
    }
  }
  static async getMarkets() {
    const resp = await axios({
      url: 'https://www.starbitex.com/trade/gettokenaddress/',
    })
    let out = []
    resp.data.forEach((i) => {
      if (!i.tokenaddress) {
        return
      }
      out.push({
        pair: i.symbol + '-WETH',
        key: i.tokenaddress + '/' + wethAddr,
        quote: {
          addr: i.tokenaddress,
          symbol: i.symbol
        },
        base: {
          addr: wethAddr,
          symbol: 'ETH'
        }
      })
    })
    return out
  }
  static async getBook(id) {
    const respAsk = await axios({
      url: 'https://www.starbitex.com/Trade/gettokenorder/' + id,
    })
    const respBid = await axios({
      url: 'https://www.starbitex.com/Trade/gettokenorder/' + id.split('/').reverse().join('/'),
    })
    function reform(arr) {
      return arr.map(o => {
        return {
          price: parseFloat(o.price),
          amount: parseFloat(o.takerTokenAmount/1e18)
        }
      })
    }
    return {
      bid: reform(respBid.data),
      ask: reform(respAsk.data)
    }
  }
}

class Exchange_Paradex {
  static info() {
    return {
      name: 'Paradex',
      url: 'https://paradex.io/',
      trade_url: 'https://app.paradex.io/market/@{quote}-@{base}',
      weth: true
    }
  }
  static async getMarkets() {
    const tokenResp = await axios({
      url: 'https://api.paradex.io/api/v1/auth/refreshToken'
    })
    const authToken = tokenResp.data.token
    await sleep(1500)

    const resp = await axios({
      url: 'https://api.paradex.io/api/v1/markets',
      headers: {
        authorization: 'JWT '+authToken
      }
    })
    return resp.data.map(i => {
      return {
        pair: i.baseToken.symbol + '-' + i.quoteToken.symbol,
        key: String(i.id),
        quote: {
          addr: i.baseToken.address,
          symbol: i.baseToken.symbol,
        },
        base: {
          addr: i.quoteToken.address,
          symbol: i.quoteToken.symbol,
        }
      }
    })
  }
  static async getBook(id) {
    var ws = null
    try {
      ws = new WebSocket('wss://api.paradex.io/wsapi/v1')
    } catch (e) {
      console.error(e)
      return {}
    }
    let rnd = parseInt(Math.random()*1e8)
    let output = { bid: [], ask: [] }
    ws.on('open', function open() {
      ws.send('{"data":{"feed":{"marketId":'+id+',"feedType":"orderBook","history":true},"name":"sub"},"auth":{"prx_account_session_id":"60a082c85b851cad9e26edf20b4c8f3e0d778d65107daa4346218492a880a0a1"},"message_id":'+rnd+',"message_type":"command"}');
    })
    ws.on('message', function incoming(data) {
      let msg = JSON.parse(data)
      if (msg.feed_group != 'orderBook.'+id) {
        return null
      }
      let d = msg.value.doc
      let conv = {
        sell: 'ask',
        buy: 'bid'
      }
      let amount = parseFloat(d.amount)
      if ([ '10', '19', '14', '12' ].indexOf(id) !== -1) {
        amount = amount / d.price
      }
      let item = {
        price: parseFloat(d.price),
        amount
      }
      output[conv[d.type]].push(item)
    })
    await sleep(1500)
    ws.close()
    return output
  }
}

class Exchange_IDEX {
  static info() {
    return {
      name: 'IDEX',
      url: 'https://idex.market/',
      trade_url: 'https://idex.market/@{base}/@{quote}',
      weth: false,
    }
  }
  static async getMarkets(id) {
    const resp = await axios({
      url: 'https://api.idex.market/returnTicker'
    })
    const respTokens = await axios({
      url: 'https://api.idex.market/returnCurrencies'
    })
    return Object.keys(resp.data).map(mk => {
      let i = resp.data[mk]
      let expl = mk.split('_')
      let id = (expl[1] + '-' + expl[0]).replace('ETH', 'WETH')
      return {
        pair: id,
        key: mk,
        quote: {
          addr: respTokens.data[expl[1]].address,
          symbol: expl[1],
          name: respTokens.data[expl[1]].name,
        },
        base: {
          addr: respTokens.data[expl[0]].address,
          symbol: expl[0],
          name: respTokens.data[expl[0]].name,
        }
      }
    })
  }
  static async getBook(id) {
    const resp = await axios({
      url: 'https://api.idex.market/returnOrderBook?market='+id,
    })
    function reform(arr) {
      return arr.map(i => {
        return {
          price: parseFloat(i.price),
          amount: parseFloat(i.amount),
        }
      })
    }
    return {
      ask: reform(resp.data.asks),
      bid: reform(resp.data.bids)
    }
  }
}


class Exchange_BambooRelay {
  static info() {
    return {
      name: 'BambooRelay',
      url: 'https://bamboorelay.com/',
      trade_url: 'https://bamboorelay.com/trade/@{quote}-@{base}',
      weth: true,
    }
  }
  static async getMarkets(id) {
    const resp = await axios({
      url: 'https://bamboorelay.com/data/main/tokens.json',
    })
    return []
  }
}

class Exchange_EtherDelta {
  static info() {
    return {
      name: 'EtherDelta',
      url: 'https://etherdelta.com/',
      trade_url: 'https://etherdelta.com/#@{quote}-@{base}',
      weth: false,
    }
  }
  static async getMarkets(id) {
    const resp = await axios({
      url: 'https://raw.githubusercontent.com/etherdelta/etherdelta.github.io/master/site/config/main.json',
    })
    return resp.data.tokens.filter((t) => {
      return (t.name !== 'ETH')
    })
    .map((t) => {
      return {
        pair: t.name + '-ETH',
        key: t.addr,
        quote: {
          addr: t.addr,
          symbol: t.name,
        },
        base: {
          addr: wethAddr,
          symbol: t.name,
        }
      }
    })
  }
  static async getBook(id) {
    var ws = null
    try {
      ws = new WebSocket('wss://socket05.etherdelta.com/socket.io/?EIO=3&transport=websocket')
    } catch (e) {
      console.error(e)
      return {}
    }
    var out = { bid: [], ask: [] }
    let rnd = random()
    ws.on('open', function open() {
      ws.send('42["getMarket",{"token":"'+id+'"}]');
    })
    var data = []
    function reform(arr, rt) {
      return _.sortBy(arr.map(i => {
        let amount = i.amount/1e18
        if (rt === 'ask') {
          amount = -amount
        }
        return {
          price: parseFloat(i.price),
          amount
        }
      }), [ 'price' ])
    }
    ws.on('message', function incoming(data) {
      data = data.replace(/^\d+/, '').trim()
      if (!data.match(/"market"/)) {
        return
      }
      let d = JSON.parse(data)
      if (d[0] === 'market') {
        let ob = d[1]
        if (!ob.orders) {
          return
        }
        out = {
          bid: reform(ob.orders.buys, 'bid').reverse(),
          ask: reform(ob.orders.sells, 'ask'),
        }
      }
    })
    await sleep(1500)
    ws.close()
    return out
  }
}

class Exchange_ForkDelta extends Exchange_EtherDelta {
  static info() {
    return {
      name: 'ForkDelta',
      url: 'https://forkdelta.github.io/',
      trade_url: 'https://forkdelta.github.io/#!/trade/@{quote}-@{base}',
      weth: false,
    }
  }
}


class Exchange_TokenJar {
  static info() {
    return {
      name: 'TokenJar',
      url: 'https://tokenjar.io/',
      trade_url: 'https://tokenjar.io/',
      weth: true,
    }
  }
  static async getMarkets(id) {
    const resp = await axios({
      url: 'https://tokenjar.io/token/manage/query',
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: 'network=1',
    })
    let out = []
    resp.data.forEach(i => {
      if (!i.address) {
        return
      }
      out.push({
        pair: i.symbol + '-WETH',
        key: i.address + '/' + wethAddr,
        quote: {
          addr: i.address,
          symbol: i.symbol,
          decimals: i.decimals,
        },
        base: {
          addr: wethAddr,
          symbol: 'ETH',
        }
      })
    })
    return out
  }
  static async getBook(id) {
    var ws = null
    try {
      ws = new WebSocket('wss://tokenjar.io/socket.io/?eio=3&transport=websocket')
    } catch (e) {
      console.error(e)
      return {}
    }
    var out = { bid: [], ask: [] }
    let rnd = random()
    var data = []
    function reform(arr, at) {
      if (!arr) return []
      return _.sortBy(arr.map(i => {
        let amount = parseFloat(i.amount)
        if (at == 'bid') {
           amount = i.price * amount
        }
        return {
          price: parseFloat(i.price),
          amount
        }
      }), [ 'price' ]).reverse()
    }
    ws.on('message', function incoming(data) {
      data = data.replace(/^\d+/, '').trim()
      if (!data.match(/order_book_event/)) {
        return
      }
      let d
      try {
        d = JSON.parse(data)
      } catch(e) {
        console.error('TokenJar WS error: ' + e)
        return
      }
      let ob = d[1]
      out = {
        bid: reform(ob.bids, 'bid'),
        ask: reform(ob.offers, 'ask').reverse(),
      }
    })
    let openPromise = function() {
      return new Promise((resolve) => {
        ws.on('open', function () {
          ws.send('42["order_book_event","'+id+'"]')
          resolve()
        })
      }).catch(() => {})
    }
    await openPromise()
    await sleep(3000)
    ws.close()
    return out
  }
}

module.exports = {
  'RadarRelay': Exchange_RadarRelay,
  'OasisDEX': Exchange_OasisDEX,
  'Paradex': Exchange_Paradex,
  'DDEX': Exchange_DDEX,
  'ERCDex': Exchange_ERCDex,
  'IDEX': Exchange_IDEX,
  'StarBitex': Exchange_StarBitex,
  'TokenJar': Exchange_TokenJar,
  'BambooRelay': Exchange_BambooRelay,
  'EtherDelta': Exchange_EtherDelta,
}
