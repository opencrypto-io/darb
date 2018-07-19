const m = require('mithril')
const moment = require('moment')

const apiBase = 'https://darb-api.opencrypto.io'

var offers = null
var offersVisible = 0
var offersExchangesCount = {}
var tokens = null
var exchanges = null
var ethData = null

var state = {
  minProfit: '0.0001',
  minProfitPerc: '0',
  maxMinAge: '5',
  exchanges: {},
}

function setStateValue(k) {
  return function(v) {
    state[k] = v
  }
}

function switchExchange(e) {
  return function(v) {
    if (v == "true") {
      state.exchanges[e] = false
    } else {
      state.exchanges[e] = true
    }
  }
}

function tokenFormat(t) {
  return m('a', { href: 'https://etherscan.io/token/'+t.addr, title: `${t.name} [${t.addr}]` }, t.symbol)
}

function exchangeFormat(e, key) {
  let info = exchanges[e]
  let href = info.url

  let base = key[0].symbol
  let quote = key[1].symbol

  let wethSymbol = 'WETH'
  
  if (info.weth_symbol) {
    wethSymbol = info.weth_symbol
  }

  if (info.weth) {
    base = base.replace('ETH', wethSymbol)
    quote = quote.replace('ETH', wethSymbol)
  }

  if (key && info.trade_url) {
    href = info.trade_url.replace('@{base}', base).replace('@{quote}', quote)
  }
  return m('a', { href }, info.name || e)
}

var Table = {
  oninit: function() {
    m.request({ url: apiBase + '/offers' })
    .then(function(data) {
      offersVisible = 0
      offers = data
    })
    m.request({ url: apiBase + '/tokens' })
    .then(function(data) {
      tokens = data
    })
    m.request({ url: apiBase + '/exchanges' })
    .then(function(data) {
      exchanges = data
      let es = {}
      Object.keys(exchanges).forEach(ek => {
        let e = exchanges[ek]
        es[ek] = true
      })
      state.exchanges = es
      console.log(state)
    })
    m.request({ url: 'https://api.coinmarketcap.com/v1/ticker/ethereum/' })
    .then(function(data) {
      ethData = data[0]
    })
  },
  view: function() {
    if (!offers) {
      return m('div', 'Loading offers ..')
    }
    roffers = []
    offersExchangesCount = {}

    offers.forEach(o => {
      if (o.profit_eth < state.minProfit) {
        return
      }
      if (o.profit_perc < state.minProfitPerc) {
        return
      }
      if(!state.exchanges[o.from_src]) {
        return
      }
      if(!state.exchanges[o.to_src]) {
        return
      }
      let ageDiff = moment().diff(moment(o.last_updated), 'minutes')
      if(state.maxMinAge < ageDiff) {
        return
      }
      if (!offersExchangesCount[o.from_src]) {
        offersExchangesCount[o.from_src] = 0
      }
      if (!offersExchangesCount[o.to_src]) {
        offersExchangesCount[o.to_src] = 0
      }
      offersExchangesCount[o.from_src]++
      offersExchangesCount[o.to_src]++

      roffers.push(o)
    })
    return m('div', [
      m('.columns', [
        m('.column', m('.field', [
          m('label.label', 'Min. profit (Ξ): '),
          m('.control', m('input.input', { type: 'text', style: { width: '100px' }, oninput: m.withAttr("value", setStateValue('minProfit')), value: state.minProfit }))
        ])),
        m('.column', m('.field', [
          m('label.label', 'Min. profit (%): '),
          m('.control', m('input.input', { type: 'text', style: { width: '100px' }, oninput: m.withAttr("value", setStateValue('minProfitPerc')), value: state.minProfitPerc }))
        ])),
        m('.column', m('.field', [
          m('label.label', 'Exchanges: '),
          m('.control', function() {
            return Object.keys(exchanges).map((ek) => {
              let e = exchanges[ek]
              return m('span', { style: 'padding-right: 10px;' } , m('label.checkbox', [
                m('div', [
                  m('input', { type: 'checkbox', checked: state.exchanges[ek], oninput: m.withAttr("value", switchExchange(ek)), value: state.exchanges[ek] }),
                  m('small', ' ' +(e.name || e.id) + ' ('+(offersExchangesCount[ek] || '0')+')')
                ])
              ]))
            })
          }())
        ])),
        m('.column', m('.field', [
          m('label.label', 'Max age (min): '),
          m('.control', m('input.input', { type: 'text', style: { width: '100px' }, oninput: m.withAttr("value", setStateValue('maxMinAge')), value: state.maxMinAge }))
        ])),
        m('.column.has-text-right', [
          m('div', [
            m('span', 'Watched tokens: '),
            m('span', Object.keys(tokens).length),
          ]),
          m('div', [
            m('span', 'Offers: '),
            m('strong', offers.length),
          ]),
          m('div', [
            m('span', 'Visible: '),
            m('strong', roffers.length),
          ]),
          m('div', [
            m('small', ' (' + (offers.length - roffers.length) + ' filtered)'),
          ]),
        ])
      ]),
      m('table.table.is-fullwidth', [
        m('thead', [
          m('tr', [
            m('th', 'Pair'),
            m('th', 'From'),
            m('th', 'Price'),
            m('th', 'To'),
            m('th', 'Price'),
            m('th', 'P/L (%)'),
            m('th', 'P/L (Ξ)'),
            m('th', 'Age'),
          ])
        ]),
        m('tbody', roffers.map(function(o) {
          /*if (o.profit_eth < state.minProfit) {
            return
          }*/

          let color = 'black'
          if (o.profit_perc > 0) {
            color = 'green'
          }
          if (o.profit_perc < 0) {
            color = 'red'
          }
          let spl = o.pair.split(':')
          let base = tokens[spl[0]]
          let quote = tokens[spl[1]]
          return m('tr', [
            m('td', [
              tokenFormat(base),
              ' / ',
              tokenFormat(quote),
            ]),
            m('td', [
              exchangeFormat(o.from_src, [ quote, base ]),
              m('div', m('small', o.from_action)),
            ]),
            m('td', [
              m('small', m('b', o.from_price)),
              m('br'),
              m('small', 'Ξ' + parseFloat(o.from_amount * o.from_price).toFixed(6) + ' ($'+(parseFloat(o.from_amount * o.from_price)*ethData.price_usd).toFixed(2)+')')
            ]),
            m('td', [
              exchangeFormat(o.to_src, [ quote, base ]),
              m('div', m('small', o.to_action)),
            ]),
            m('td', [
              m('small', m('b', o.to_price)),
              m('br'),
              m('small', 'Ξ' + parseFloat(o.to_amount * o.to_price).toFixed(6) + ' ($'+(parseFloat(o.to_amount * o.to_price)*ethData.price_usd).toFixed(2)+')')
            ]),
            m('td',  m('div', { style: { color }}, [
              m('div', o.profit_perc.toFixed(2) + '%')
            ])),
            m('td', function() {
              return m('div', { style: { color }}, [
                m('div', m('span', m('b', 'Ξ' + (o.profit_eth).toFixed(6)))),
                m('div', m('small', '$' + (o.profit_eth * ethData.price_usd).toFixed(2))),
              ])
            }()),
            m('td', m('small', moment(o.last_updated).fromNow())),
          ])
        }))
      ])
    ])
  }
}

var Layout = {
  view: function() {
    return m('div', [
      m('header.hero', [
        m('.hero-body', [
          m('.container', [
            m('h1.title', m('a', { href: 'https://darb.opencrypto.io' }, 'dARB Terminal')),
            m('h2.subtitle', 'Arbitrage of Ethereum ERC-20 tokens on decentralized exchanges')
          ])
        ]),
      ]),
      m('.section', [
        m('.columns.is-centered', [
          m('.column', m(Table))
        ])
      ])
    ])
  }
}
console.log('ready')

m.mount(document.body, Layout)
