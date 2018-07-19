//const Table = require('cli-table')
const _ = require('lodash')
const Hapi = require('hapi')
const Config = require('./config')

const Exchanges = require('./exchanges')

const Matrix = require('./defs/matrix.json')
const Tokens = require('./defs/tokens.json')

var DB = {}


function ref(t) {
  if (t == 'bid') {
    return 'SELL'
  }
  if (t == 'ask') {
    return 'BUY'
  }
}

async function comparePair(id, conf) {

  /*const table = new Table({
    head: [ 'Pair', 'From', 'Action', 'Price', 'To', 'Action', 'Price', 'Profit' ]
  })*/
  //let book = await Exchange_Oasis.getBook('MKR-WETH')
  //console.log(book)
  //console.log(`---\nPair: ${id}\n---`)
  // load books
  let books = await Promise.all(Object.keys(conf.src).map((exchange) => {
    return async function() {
      var book = null
      try {
        book = await Exchanges[exchange].getBook(conf.src[exchange])
      } catch (e) {
        console.error(`${exchange} Error: ${e}`)
        return { src: exchange, book: { bid: [], ask: [] } }
      }
      return { src: exchange, book }
    }()
  }))
  // console.log(books)
  let typ = [ 'ask' ]
  let count = 0
  typ.forEach(t => {
    //console.log(`\n\n.. finding by ${t} ..`)
    books.forEach(i => {
      //console.log(`---`)
      //console.log(`From: ${i.src}`)
      //console.log(`${t} ${JSON.stringify(i.book[t][0])}`)

      books.forEach(i2 => {
        if (i2.src == i.src) {
          return
        }
        let rtyp = null
        switch (t) {
          case 'bid':
            rtyp = 'ask'
            break
          case 'ask':
            rtyp = 'bid'
            break
        }
        //console.log(`compare to ${i2.src} (${rtyp}) - ${JSON.stringify(i2.book[rtyp][0])}`)
        //console.log(`${t} `)

        if(!i.book[t][0] || !i2.book[rtyp][0]) {
          return null
        }


        let p1 = i.book[t][0].price
        let p2 = i2.book[rtyp][0].price
        let a1 = i.book[t][0].amount
        let a2 = i2.book[rtyp][0].amount

        let profit = null
        if (t == 'bid') {
          profit = p1 - p2
        } else {
          profit = p2 - p1
        }
        let profitPerc = parseFloat((profit/(p1/100)))

        let pp1 = (a1 * p1)
        let pp2 = (a2 * p2)
        let am = null
        if (pp1 > pp2) {
          am = pp2
        } else {
          am = pp1
        }
        let profitETH = (profitPerc/100 * am)

        let pid = [ id, i.src, i2.src, t ].join(':')

        DB[pid] = {
          pair: id,
          from_src: i.src,
          from_action: ref(t),
          from_price: p1,
          from_amount: a1,
          to_src: i2.src,
          to_action: ref(rtyp),
          to_price: p2,
          to_amount: a2,
          profit: profit,
          profit_perc: profitPerc,
          profit_eth: profitETH,
          last_updated: new Date(),
        }

        count++
        //table.push([ id, i.src, ref(t), p1, i2.src, ref(rtyp), p2, profitPerc+'%' ])
        //console.log(`${id} ${i.src} -> ${i2.src} : ${ref(t)} ${i.book[t][0].price} -> ${ref(rtyp)} ${}`)
      })
    })
  })
  //console.log(table.toString())
  console.log(`Pair ${id} processed: ${count} items`)
}

async function run() {
  Object.keys(Matrix).forEach((c) => {
    comparePair(c, Matrix[c])
  })
}

//run()

const server = Hapi.server({
  host: 'localhost',
  port: 8056
})

function toArray(obj) {
  return Object.keys(obj).map(k => {
    let i = obj[k]
    i.id = k
    return i
  })
}

server.route({
  method: 'GET',
  path: '/offers',
  options: {
    cors: true
  },
  handler: function(req, h) {
    return _.sortBy(_.filter(toArray(DB), (o) => {
      return (o.profit_eth >= 0)
    }), [ 'profit_eth' ]).reverse()
  }
})

server.route({
  method: 'GET',
  path: '/tokens',
  options: {
    cors: true
  },
  handler: function(req, h) {
    return Tokens
  }
})

server.route({
  method: 'GET',
  path: '/exchanges',
  options: {
    cors: true
  },
  handler: function(req, h) {
    let output = {}
    Object.keys(Exchanges).forEach(ek => {
      let ed = Exchanges[ek]
      output[ek] = {
        id: ek
      }
      if (ed.info) {
        let info = ed.info()
        _.assign(output[ek], info)
      }
    })
    return output
  }
})

server.route({
  method: 'GET',
  path: '/config',
  options: {
    cors: true
  },
  handler: function(req, h) {
    return Config
  }
})

async function update() {
  await run()
}

async function startServer() {
  await server.start()
  console.log('Server started at port 8056')

  setInterval(update, 60 * 1000)
  update()
}

startServer()
