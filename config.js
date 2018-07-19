module.exports = {
  pairs: {
    'REQ-WETH': {
      src: {
        RadarRelay: 'REQ-WETH',
        DDEX: 'REQ-ETH',
        IDEX: 'ETH_REQ',
      }
    },
    'BAT-WETH': {
      src: {
        RadarRelay: 'BAT-WETH',
        DDEX: 'BAT-ETH',
        ERCDex: 'baseTokenAddress=0x0d8775f648430679a709e98d2b0cb6250d2887ef&quoteTokenAddress=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        Paradex: '9',
        IDEX: 'ETH_BAT',
      }
    },
    'REP-WETH': {
      src: {
        RadarRelay: 'REP-WETH',
        ERCDex: 'baseTokenAddress=0x1985365e9f78359a9b6ad760e32412f4a445e862&quoteTokenAddress=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        IDEX: 'ETH_REP',
      }
    },
    'ZRX-WETH': {
      src: {
        RadarRelay: 'ZRX-WETH',
        DDEX: 'ZRX-ETH',
        Paradex: '4',
        ERCDex: 'baseTokenAddress=0xe41d2489571d322189246dafa5ebde1f4699f498&quoteTokenAddress=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        IDEX: 'ETH_ZRX',
      }
    },
    'OMG-WETH': {
      src: {
        RadarRelay: 'OMG-WETH',
        DDEX: 'OMG-ETH',
        Paradex: '6',
        ERCDex: 'baseTokenAddress=0xd26114cd6ee289accf82350c8d8487fedb8a0c07&quoteTokenAddress=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        IDEX: 'ETH_OMG',
      }
    },
    'WETH-DAI': {
      src: {
        //Oasis: 'WETHDAI',
        DDEX: 'DAI-ETH',
        RadarRelay: 'DAI-WETH'
      }
    },
    'MKR-WETH': {
      src: {
        Oasis: 'MKRWETH',
        RadarRelay: 'MKR-WETH',
        Paradex: '1', // MKR-WETH
        DDEX: 'MKR-ETH',
        ERCDex: 'baseTokenAddress=0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2&quoteTokenAddress=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        IDEX: 'ETH_MKR',
      }
    },
    'MKR-DAI': {
      src: {
        Oasis: 'MKRDAI',
        Paradex: '12',
        //RadarRelay: 'MKR-DAI',
      }
    }
  }
}

