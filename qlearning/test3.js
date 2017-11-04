

const Environment = require("./components/Environment");
const HogeAgent = require("./components/HogeAgent");
const _ = require("lodash");



var env = new Environment([0,1,2,3,4,5]);


var opt = {} // see full options on DQN page
var agent = new HogeAgent(env, opt);

// agent.init(_.sample(["0","1","2","3","4"]));
// var res = agent.step(); // s is an array of length 8
//... execute action in environment and get the reward
// var res = env.step(res);


const learn = (steps) => {
    var s = _.sample(["0","1","2","3","4"]);
    agent.init();
    while (steps--){
        var action = agent.step(s); // s is an array of length 8

        console.log("action", action);

        var res = env.step(s, action);

        console.log("res", res);

        agent.learn(res.reward);

        s = res.state;

        if(res.finish){

            var action = agent.step(s); // s is an array of length 8
            var res = env.step(s, action);
            agent.learn(res.reward);

            console.log("reset!");
            s = _.sample(["0","1","2","3","4"]);
            agent.init();
        }
    }
}

learn(30);

console.log(agent.Q);

