// practice description: ”５部屋ハウス脱出ゲーム”
// http://mnemstudio.org/path-finding-q-learning-tutorial.htm

const QLearner = require("./components/QLearner");

var ql = new QLearner(gamma = 0.8);

ql.add(0,4,0);
ql.add(1,3,0);
ql.add(1,5,100);
ql.add(2,3,0);
ql.add(3,1,0);
ql.add(3,2,0);
ql.add(3,4,0);
ql.add(4,0,0);
ql.add(4,5,100);
ql.add(5,1,0);
ql.add(5,4,0);
ql.add(5,5,100);

ql.learn(500);

console.log("hoge");

const goOutside = (st)=>{
  console.log("let's go out!");
  ql.setState(st);

  var prevSt;
  while(st != prevSt){
    console.log(ql.currentState.name);
    prevSt = st;
    st = ql.runOnce();
  }
}

goOutside(0);
goOutside(1);
goOutside(2);
goOutside(3);
goOutside(4);

