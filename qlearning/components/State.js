class State{
  constructor(name){
    this.name = name;
    this.actions = {};
    this.actionsList = [];
  }
  addAction(nextState, reward, actionName){
    var action =  {
      name: actionName===undefined ? nextState : actionName,
      nextState: nextState,
      reward: reward
    };
    this.actionsList.push(action);
    this.actions[action.name] = action;
  }
  randomAction(){
    return this.actionsList[~~(this.actionsList.length * Math.random())];
  };
}
module.exports = State;