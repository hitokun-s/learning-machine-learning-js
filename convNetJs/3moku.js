// 『実装ディープラーニング』の「3目並べ」を、convNetJsを使って、jsで実装する
// convnetJsページ：http://cs.stanford.edu/people/karpathy/convnetjs/docs.html
// 最下部には強化学習

convnetjs = require("convnetjs");
cnnutil = require("convnetjs/build/util");
const deepqlearn = require("convnetjs/build/deepqlearn");

var brain = new deepqlearn.Brain(3, 2); // 3 inputs, 2 possible outputs (0,1)
var state = [Math.random(), Math.random(), Math.random()];
for(var k=0;k<10000;k++) {
  var action = brain.forward(state); // returns index of chosen action
  var reward = action === 0 ? 1.0 : 0.0;
  brain.backward([reward]); // <-- learning magic happens here
  state[Math.floor(Math.random()*3)] += Math.random()*2-0.5;
}
brain.epsilon_test_time = 0.0; // don't make any more random choices
brain.learning = false;

// get an optimal action from the learned policy
var action = brain.forward([0.1,0.2,0.3]);