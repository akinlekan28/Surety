var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "talent cigar hint skirt impose hire second rule comic bone auction inside";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      gas: 4600000
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};