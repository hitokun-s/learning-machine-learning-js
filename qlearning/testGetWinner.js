const SanmokuEnvironmentCompete = require("./components/SanmokuEnvironmentCompete");
const _ = require("lodash");

const size = 5;
const n = 4;

var env = new SanmokuEnvironmentCompete(size, n);


var test = [
  '1', '1', '2', '1', '1',
  '1', '1', '0', '2', '2',
  '0', '2', '0', '0', '0',
  '0', '2', '0', '1', '2',
  '0', '2', '0', '2', '1'
];

var winner = env.getWinner(test.join(""));
console.log(winner);

var test2 = [
  '1', '2', '1', '2', '1',
  '2', '1', '2', '1', '2',
  '1', '2', '1', '2', '1',
  '2', '0', '0', '0', '0',
  '0', '2', '2', '1', '1'
];

var winner = env.getWinner(test2.join(""));
console.log(winner);