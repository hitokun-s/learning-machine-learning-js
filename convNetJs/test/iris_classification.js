// ConvNetJs documentation
// http://cs.stanford.edu/people/karpathy/convnetjs/docs.html

require('require-csv');
const convnetjs = require("convNetJs");
const _ = require("lodash");
// const fs = require("fs");
// const iris = fs.readFileSync("data/iris.csv", "utf-8");
const iris = require("../../data/iris.csv");
console.log(iris);

var answers = _.uniq(iris.map(d => d[4]));
console.log("answers", answers);

var ansMap = _.zipObject(answers, answers.map(a => answers.indexOf(a)));
console.log(ansMap);

iris.forEach(d => {
  d[0] = +d[0];
  d[1] = +d[1];
  d[2] = +d[2];
  d[3] = +d[3];
});
console.log(iris);

var layer_defs = [];
// input layer of size 1x1x2 (all volumes are 3D)
layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:4});
// some fully connected layers
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
// a softmax classifier predicting probabilities for two classes: 0,1
layer_defs.push({type:'softmax', num_classes:3});

// create a net out of it
var net = new convnetjs.Net();
net.makeLayers(layer_defs);

// the network always works on Vol() elements. These are essentially
// simple wrappers around lists, but also contain gradients and dimensions
// line below will create a 1x1x2 volume and fill it with 0.5 and -1.3

var trainer = new convnetjs.Trainer(net, {
  learning_rate:0.01, 
  l2_decay:0.001,
  batch_size: 10
});

var index = 0;
var rightCount = 0;
_.times(500000, () => {
  index++;
  var sample = _.sample(iris, 10);
  var teacherIdx = ansMap[sample[4]];
  var x = new convnetjs.Vol(sample.slice(0, 4));
  trainer.train(x, teacherIdx);

  // net.forward(x);
  if(net.getPrediction() == teacherIdx){
    rightCount++;
  }
  
  if(index % 10000 == 0){
    console.log('correct ratio', rightCount / 10000);
    rightCount = 0;
  }
});




