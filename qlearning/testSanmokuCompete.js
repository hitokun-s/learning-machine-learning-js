

const SanmokuEnvironmentCompete = require("./components/SanmokuEnvironmentCompete");
const Agent = require("./components/SanmokuAgent");
const _ = require("lodash");
const fs = require('fs');


const size = 5;
const n = 4;

var env = new SanmokuEnvironmentCompete(size, n);


var opt = {} // see full options on DQN page
var agent = new Agent(env, opt);
var agent2 = new Agent(env, opt);

// agent.init(_.sample(["0","1","2","3","4"]));
// var res = agent.step(); // s is an array of length 8
//... execute action in environment and get the reward
// var res = env.step(res);

const initState = _.range(size * size).map(() => "0").join("");
console.log(initState);

const learn = (steps) => {
    var s = initState;
    agent.init();
    while (steps--){
        var action = agent.step(s); // s is an array of length 8
        var res = env.step(s, action);

        agent.learn(res.reward);

        s = res.state;

        if(res.finish){

            var action = agent.step(s); // s is an array of length 8
            var res = env.step(s, action);
            agent.learn(res.reward);

            console.log("reset!");
            s = initState;
            agent.init();
            env.init(); // この中でenvの内部Agentもinit()する！
        }
    }
}

if(fs.existsSync("./q.json")){
    console.log("file found!");
    agent.Q = JSON.parse(fs.readFileSync("./q.json"));
}else{
    console.log("learn!");
    learn(100000);
    fs.writeFileSync("./q.json", JSON.stringify(agent.Q));
}

// console.log(agent.Q);
console.log("Q state couns:", _.keys(agent.Q).length);

// game!

const game = ()=>{
    
    console.log("start new game!----------------------", initState);
    var s = initState;
    var res;
    var winner;
    while (!(res && res.finish && winner)) {
        var action = agent.bestAction(s); // s is an array of length 8
      
        console.log("best action", action);
        
        if(!action){
            console.log(s);
            console.log(env.getWinner(s));
        }

        res = env.step(s, action);
        winner = env.getWinner(res.state);

        // console.log("game state & winner", res.state, env.getWinner(res.state));

        s = res.state;
        if(winner){
            // 見やすくする
            console.log("win state");    
            _.chunk(res.state, size).forEach(c => console.log(c));
        }
    }
    console.log(res.state);
    return env.getWinner(res.state);
}

var res = [];
_.times(10, ()=>{
    res.push(game());
});

console.log("win rate:", _.countBy(res));




