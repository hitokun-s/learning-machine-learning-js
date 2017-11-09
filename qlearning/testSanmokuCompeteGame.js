/**
 * 競争モードで学習済エージェント同士の試合だけみたい場合は、当然だがenvの内部エージェントもQをファイル保存しておく必要がある
 * @type {SanmokuEnvironmentCompete}
 */

const SanmokuEnvironmentCompete = require("./components/SanmokuEnvironmentCompete");
const Agent = require("./components/SanmokuAgent");
const _ = require("lodash");
const fs = require('fs');


const size = 5;
const n = 4;

var env = new SanmokuEnvironmentCompete(size, n);


var opt = {eps: 0.1} // see full options on DQN page
var agent = new Agent(env, opt);
var agent2 = new Agent(env, opt);

// agent.init(_.sample(["0","1","2","3","4"]));
// var res = agent.step(); // s is an array of length 8
//... execute action in environment and get the reward
// var res = env.step(res);

let initState = _.range(size * size).map(() => "0").join("");
console.log(initState);

agent.Q = JSON.parse(fs.readFileSync("./q.json"));
env.innerAgent.Q = JSON.parse(fs.readFileSync("./qe.json"));

// console.log(agent.Q);
console.log("Q state count:", _.keys(agent.Q).length);

// game!

// 後手にしたい場合
initState = "0000000000002000000000000";
const game = ()=>{
    
    console.log("start new game!----------------------", initState);
    var s = initState;
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
        if(winner){
            // 見やすくする
            console.log("win state");    
            _.chunk(res.state, size).forEach(c => console.log(c));
        }else{
            console.log("no winner yet");
          _.chunk(res.state, size).forEach(c => console.log(c));
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




