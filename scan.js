
const Exchanges = require('./exchanges')
const fs = require('fs')
const _ = require('lodash')

var data = {}
var tokens = {}

async function loadExchanges() {
  return Promise.all(Object.keys(Exchanges).map(ek => {
    return async function() {
      let e = Exchanges[ek]
      if (e.getMarkets) {
        try {
          data[ek] = await e.getMarkets()
        } catch (e) {
          console.error(`getMarkets() error: ${ek} [${e}]`)
        }
      }
    }()
  }))
}

function ensureToken(t, e) {
  if (!tokens[t.addr]) {
    tokens[t.addr] = {}
  }
  if (!tokens[t.addr].exchanges) {
    tokens[t.addr].exchanges = []
  }
  if (tokens[t.addr].exchanges.indexOf(e) === -1) {
    tokens[t.addr].exchanges.push(e)
  }
  _.assign(tokens[t.addr], t)
}

function norm(token, exchange) {
  if (token.addr == '0x0000000000000000000000000000000000000000') {
    return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  }
  ensureToken(token, exchange)
  return token.addr
}

async function run() {
  await loadExchanges()
  let output = {}
  Object.keys(data).forEach(e => {
    let pairs = data[e]
    pairs.forEach(i => {
      if (!i.base || !i.quote) {
        console.error(`${e} ${i.pair} error: no 'base' and 'query' props`)
        return
      }
      let id = [ norm(i.quote, e), norm(i.base, e) ].join(':')
      //console.log(e, id, i.pair)
      if (!output[id]) {
        output[id] = { src: {} }
      }
      output[id].src[e] = i.key
    })
  })
  let fin = {}
  Object.keys(output).forEach(dk => {
    let i = output[dk]
    //console.log(i)
    if (Object.keys(i.src).length < 2) {
      return
    }
    fin[dk] = i
  })

  const fn = './defs/matrix.json'
  fs.writeFileSync(fn, JSON.stringify(fin, null, 2))
  console.log(`File writed: ${fn} (${Object.keys(fin).length} pairs)`)

  let outTokens = {}
  Object.keys(tokens).forEach(tk => {
    let t = tokens[tk]
    if (t.exchanges.length < 2) {
      return
    }
    outTokens[tk] = t
  })

  const tokensFn = './defs/tokens.json'
  fs.writeFileSync(tokensFn, JSON.stringify(outTokens, null, 2))
  console.log(`File writed: ${tokensFn} (${Object.keys(outTokens).length} tokens)`)
}

run()
