/**
 * 競争モードで学習済エージェント同士の試合だけみたい場合は、当然だがenvの内部エージェントもQをファイル保存しておく必要がある
 * @type {SanmokuEnvironmentCompete}
 */

const SanmokuEnvironmentCompete = require("./components/SanmokuDQNEnvironmentCompete");
const Agent = require("./components/SanmokuDQNAgent");
const R = require("./components/R");
const _ = require("lodash");
const fs = require('fs');


const size = 8;
const n = 5;

var env = new SanmokuEnvironmentCompete(size, n);


var opt = {eps: 0.1} // see full options on DQN page
var agent = new Agent(env, opt);

// agent.init(_.sample(["0","1","2","3","4"]));
// var res = agent.step(); // s is an array of length 8
//... execute action in environment and get the reward
// var res = env.step(res);

let initState = _.range(size * size).map(() => "0").join("");
// 後手にしたい場合
const getInitState = function(handy){
 var  arr = _.range(size * size).map(() => "0");
  var indexes = _.sampleSize(_.range(size * size), handy);
  
  indexes.forEach(i => {
    arr[i] = "2";
  });

  return arr.join("");
};

const learn = (steps) => {
  
    var s = initState;
    agent.init();
    while (steps--){

      console.log("learn!:" + steps);
      
        var action = agent.step(s); // s is an array of length 8
        var res = env.step(s, action);

        agent.learn(res.reward);

        s = res.state;

        if(res.finish){

          if(env.getPossibleActions(s).length > 0){
            var action = agent.step(s);
            var res = env.step(s, action);
            agent.learn(res.reward);
          }

            s = initState;
            agent.init();
            env.init(); // この中でenvの内部Agentもinit()する！
        }
        
        if(steps % 1000 == 0){
          console.log("saev file!");
          // this.net.W1 = new R.RandMat(this.nh, this.ns, 0, 0.01);
          // this.net.b1 = new R.Mat(this.nh, 1, 0, 0.01);
          // this.net.W2 = new R.RandMat(this.na, this.nh, 0, 0.01);
          // this.net.b2 = new R.Mat(this.na, 1, 0, 0.01);
          fs.writeFileSync(`./q-${size}-${n}.json`, JSON.stringify(R.netToJSON(agent.net)));
          fs.writeFileSync(`./qe-${size}-${n}.json`, JSON.stringify(R.netToJSON(env.innerAgent.net)));
        }
    }
}

if (fs.existsSync(`./q-${size}-${n}.json`)) {
  console.log("file found!");
  agent.net = R.netFromJSON(JSON.parse(fs.readFileSync(`./q-${size}-${n}.json`)));
  env.innerAgent.net = R.netFromJSON(JSON.parse(fs.readFileSync(`./qe-${size}-${n}.json`)));
}

console.log("learn!");
// learn(10000);

const game = ()=>{
  
  var s = getInitState(4);
  console.log("start new game!----------------------", s);
  
  var res;
  var winner;
  while (!(res && res.finish)) {
    var action = agent.bestAction(s); // s is an array of length 8

    if(action == undefined){
      console.log(s);
      console.log(env.getWinner(s));
      throw Error("oh my god");
    }

    console.log("best action", action);

    // res = env.step(s, action);
    res = env.stepWithoutLearn(s, action);
    winner = env.getWinner(res.state);

    // console.log("game state & winner", res.state, env.getWinner(res.state));

    s = res.state;
    
    const draw = function(d){
      if(d == "1" || d == 1){
        return "○";
      }else if(d == "2" || d == 2){
        return "●";
      }else{
        return "　"
      }
    };
    
    if(winner){
      // 見やすくする
      console.log("win state");
      _.chunk(res.state, size).forEach(c => console.log(c.map(draw)));
    }else{
      console.log("no winner yet");
      _.chunk(res.state, size).forEach(c => console.log(c.map(draw)));
    }
  }
  console.log(res.state);
  return env.getWinner(res.state);
}

var res = [];
_.times(100, ()=>{
  res.push(game());
});

console.log("win rate:", _.countBy(res));



