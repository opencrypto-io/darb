//const Table = require('cli-table')
const _ = require('lodash')
const Hapi = require('hapi')
const sleep = require('util').promisify(setTimeout)
const Promise = require('bluebird')
const moment = require('moment')
const Redis = require('redis')
const msgpack = require('msgpack-lite')
const redis = Redis.createClient()

const Config = require('./config')
const Exchanges = require('./exchanges')

const Matrix = require('./defs/matrix.json')
const Tokens = require('./defs/tokens.json')

var DB = {}
var DBMetaData = {
 '0x68d57c9a1c35f63e2c83ee8e49a64e9d70528d25:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    time: -1
  }
}

class PoolEngine {
  constructor() {
    this.count = 0
    this.gaplag = 1000
    this.per = 5
    this.conc = 5
  }
  async start() {
    console.log('Pool started')
    this.iterate()
    setInterval(() => { this.iterate() }, this.gaplag)
  }
  async iterate() {
    var self = this
    // next block
    if (this.count > 0) {
      await sleep(this.gaplag)
    }
    let q = await this.pick()

    Promise.map(q, async function(i) {
      DBMetaData[i].active = true
      comparePair(i, Matrix[i])
    }, { 
      concurrency: self.conc
    }).then(() => {
      console.log('block[%s] {%s}', self.count, JSON.stringify(q, null, 2))
      self.count++
    })
  }
  async pick(per) {
    if (!per) {
      per = this.per
    }
    //console.log('Picking %s pairs', per)

    let wq = Object.keys(Matrix)
    wq = _.shuffle(wq)
    wq = wq.map((k) => {
      let md = DBMetaData[k]
      if (!md) {
        md = DBMetaData[k] = {
          time: 0
        }
      }
      return Object.assign({ id: k }, md)
    })
    wq = _.filter(wq, (i) => { return (i.active !== true) })
    wq = _.sortBy(wq, [ 'time' ])
    return wq.slice(0, per).map((i) => { return i.id })
  }
}

const pool = new PoolEngine()

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

        let item = {
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

        redis.set('offers:'+pid, JSON.stringify(item)), 
      
        DB[pid] = item
        DBMetaData[id] = {
          time: item.last_updated,
          active: false
        } 

        count++
        //table.push([ id, i.src, ref(t), p1, i2.src, ref(rtyp), p2, profitPerc+'%' ])
        //console.log(`${id} ${i.src} -> ${i2.src} : ${ref(t)} ${i.book[t][0].price} -> ${ref(rtyp)} ${}`)
      })
    })
  })
  //console.log(table.toString())
  //console.log(`Pair ${id} processed: ${count} items`)
}

function loadDB() {
  let count = 0
  return new Promise((resolve) => {
    console.log('Bootstrapping DB from Redis ..')
    redis.keys('offers:*', function(err, keys) {
      return Promise.map(keys, (k) => {
        return new Promise(resolveItem => {
          redis.get(k, (err, ki) => {
            if (err) {
              throw new Error(err)
            }
            let lid = k.replace(/^offers:/, '')
            DB[lid] = JSON.parse(ki)
            count++
            resolveItem()
          })
        })
      })
      .then(() => {
        console.log('DB bootstraped ('+count+' items)')
        resolve()
      })
    })
  })
}

async function run() {
  console.log('Starting crawling ..')
  let lma = _.clone(Matrix)
  lma = _.shuffle(Object.keys(lma))
  Promise.map(lma, async function(c) {
    await comparePair(c, Matrix[c])
  }, { concurrency: 20 })
}

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

  //setInterval(update, 120 * 1000)
  await loadDB()

  let wait = 1
  console.log('Waiting %ss before start the pool ..', wait)
  await sleep(1000 * wait)

  // start the pool
  await pool.start()
}

startServer()
