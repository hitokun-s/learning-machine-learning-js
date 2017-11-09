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
// 後手にしたい場合
initState = "0000000000002000000000000";
console.log(initState);

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

            var action = agent.step(s); // s is an array of length 8
            var res = env.step(s, action);
            agent.learn(res.reward);

            s = initState;
            agent.init();
            env.init(); // この中でenvの内部Agentもinit()する！
        }
        
        if(steps % 10000 == 0){
          console.log("saev file!");
          fs.writeFileSync("./q.json", JSON.stringify(agent.Q));
          fs.writeFileSync("./qe.json", JSON.stringify(env.innerAgent.Q));
        }
    }
}

if (fs.existsSync("./q.json")) {
  console.log("file found!");
  agent.Q = JSON.parse(fs.readFileSync("./q.json"));
  env.innerAgent.Q = JSON.parse(fs.readFileSync("./qe.json"));
}

console.log("learn!");
learn(100000);
fs.writeFileSync("./q.json", JSON.stringify(agent.Q));
fs.writeFileSync("./qe.json", JSON.stringify(env.innerAgent.Q));

// console.log(agent.Q);
console.log("Q state count:", _.keys(agent.Q).length);
