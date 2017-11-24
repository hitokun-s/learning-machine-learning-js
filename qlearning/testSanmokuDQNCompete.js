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
var agent = new Agent(env, opt, 1);
env.innerAgent.net = agent.net;

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
  
    var s = getInitState(steps % 2);
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

            s = getInitState(steps % 2);
            agent.init();
            env.init(); // この中でenvの内部Agentもinit()する！
        }
        
        if(steps % 100 == 0){
          console.log("save file!");
          // this.net.W1 = new R.RandMat(this.nh, this.ns, 0, 0.01);
          // this.net.b1 = new R.Mat(this.nh, 1, 0, 0.01);
          // this.net.W2 = new R.RandMat(this.na, this.nh, 0, 0.01);
          // this.net.b2 = new R.Mat(this.na, 1, 0, 0.01);
          
          if(!fs.existsSync(`./q-${size}-${n}.json`)){
            fs.writeFileSync(`./q-${size}-${n}.json`, JSON.stringify(agent.net.toJSON()));
          }else{
            if(gotSmarter()){
              console.log("Got smarter!");
              if(fs.existsSync(`./q-${size}-${n}.json`)){
                fs.renameSync(`./q-${size}-${n}.json`, `./q-${size}-${n}-1.json`);
              }
              fs.writeFileSync(`./q-${size}-${n}.json`, JSON.stringify(agent.net.toJSON()));
            }else{
              console.log("...failed to get smarter...");
              // // リセットしてやり直し
              // agent.net.fromJSON(JSON.parse(fs.readFileSync(`./q-${size}-${n}.json`)));
              // env.innerAgent.net = agent.net;
            } 
          }
        }
    }
}

if (fs.existsSync(`./q-${size}-${n}.json`)) {
  console.log("Q file found!");
  agent.net.fromJSON(JSON.parse(fs.readFileSync(`./q-${size}-${n}.json`)));
  env.innerAgent.net = agent.net;
}

const game = (i)=>{
  
  var s = getInitState(i % 2);
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

var gotSmarter = function(){
  env.innerAgent.net.fromJSON(JSON.parse(fs.readFileSync(`./q-${size}-${n}.json`)));

  var res = [];
  _.times(20, (i)=>{
    res.push(game(i));
  });
  res = _.countBy(res);
  console.log(res);
  
  return res["1"] >= res["2"] * 2;
}

console.log("learn!");
learn(10000000000);
// gotSmarter();

// env.innerAgent.net.fromJSON(JSON.parse(fs.readFileSync(`./q-${size}-${n}-1.json`)));
//
// var res = [];
// _.times(20, (i)=>{
//   res.push(game(i));
// });
//
// console.log("win rate:", _.countBy(res));
// console.log(_.countBy(res, "1"));



