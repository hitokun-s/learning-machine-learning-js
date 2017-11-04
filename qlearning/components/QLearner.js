// クラスではthisに追加されたプロパティがメンバ変数となります。メンバ変数の参照もthisを介します。
// メソッドはstaticをつけると静的メソッドになります。

const State = require("./State");

// reinforce.jsでの設計
/**
 env = new Gridworld();
 agent = new RL.DPAgent(env, {'gamma':0.9});
 agent.learn();
 var action = agent.act(); // returns the index of the chosen action
 */


class QLearner{
  constructor(gamma){
    this.gamma = gamma || 0.8;
    this.Q = {};
    this.states = {};
    this.statesList = [];
    this.currentState = null;  
    
    this.Q = {}; // Q[state][action] でQ値をもつ
  }
  add(from, to, reward, actionName){
    if (!this.states[from]) this.addState(from);
    if (!this.states[to]) this.addState(to);
    this.states[from].addAction(to, reward, actionName);
  }
  addState(name){
    var state = new State(name);
    this.states[name] = state;
    this.statesList.push(state);
    return state;
  }
  setState(name){
    this.currentState = this.states[name];
    return this.currentState;
  }
  getState(){
    return this.currentState && this.currentState.name;
  }
  randomState(){
    return this.statesList[~~(this.statesList.length * Math.random())];
  }
  // ある状態から可能なアクションの中で、最大のQ値を返す
  optimalFutureValue(state){
    // var stateRewards = this.Q[state];
    // var max = 0;
    // for (var action in stateRewards){
    //   if (stateRewards.hasOwnProperty(action)){
    //     max = Math.max(max, stateRewards[action] || 0);
    //   }
    // }
    // return max;
    var max = 0;
    for(var action in this.Q[state]){
      max = Math.max(max, this.Q[state][action]);
    }
    return max;
  }
  step(){
    this.currentState || (this.currentState = this.randomState());
    var action = this.currentState.randomAction();
    if (!action) return null;
    this.Q[this.currentState.name] || (this.Q[this.currentState.name] = {});
    this.Q[this.currentState.name][action.name] = (action.reward || 0) + this.gamma * this.optimalFutureValue(action.nextState);
    return this.currentState = this.states[action.nextState];
  }
  learn(steps){
    steps = Math.max(1, steps || 0);
    while (steps--){
      this.currentState = this.randomState();
      this.step();
    }
  }
  bestAction(state){
    var stateRewards = this.Q[state] || {};
    var bestAction = null;
    for (var action in stateRewards){
      if (stateRewards.hasOwnProperty(action)){
        if (!bestAction){
          bestAction = action;
        } else if ((this.Q[state][action] == this.Q[state][bestAction]) && (Math.random()>0.5)){
          bestAction = action;
        } else if (this.Q[state][action] > this.Q[state][bestAction]){
          bestAction = action;
        }
      }
    }
    // 基本的には、最大Q値のアクションを選ぶ。
    // ただし、最大Q値のアクションが複数ある場合は、その中からランダムに選ぶ
    return bestAction;
  }
  // knowsAction(state, action){
  //   return (this.Q[state] || {}).hasOwnProperty(action);
  // }
  
  // currentStateにおいて、指定されたactionを実行し、遷移したstateを返す
  applyAction(actionName){
    var actionObject = this.states[this.currentState.name].actions[actionName];
    if (actionObject){
      this.currentState = this.states[actionObject.nextState];
    }
    return actionObject && this.currentState;
  }
  runOnce(){
    var best = this.bestAction(this.currentState.name);
    var action = this.states[this.currentState.name].actions[best];
    if (action){
      this.currentState = this.states[action.nextState];
    }
    return action && this.currentState;
  };
}
module.exports = QLearner;