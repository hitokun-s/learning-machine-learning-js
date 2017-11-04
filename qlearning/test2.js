

// 基本形

var action = agent.act(s); // s is an array of length 8
//... execute action in environment and get the reward
var reward = env.exec(action);
agent.learn(reward); //

// 上記を繰り返す

// karpathyの実装では、envには以下の２メソッドさえあればいい。それはQテーブルを作るため。
this.ns = this.env.getNumStates();
this.na = this.env.getMaxNumActions();
this.Q = zeros(this.ns * this.na);


// 状態によって可能なアクションはその都度変わるので、
this.env.allowedActions(s);
// というメソッドも用意している

// 次のアクション候補を提示したり、報酬を計算するのもenvの役目
var ns = this.env.nextStateDistribution(s,a);
var rs = this.env.reward(s,a,ns);

// // gridworld is deterministic, so return only a single next state
// とあるように、ゲームの種類によっては、次の状態が複数になることがある。
// ここらへんは、
// https://qiita.com/Hironsan/items/56f6c0b2f4cfd28dd906
// にある、遷移確率と深く関係。
// というか、状態遷移確率がわからない問題が出てくるから、Q学習が登場する。

// 状態遷移関数とは、ある状態 s で行動 a を取った時に次の状態 s′s′ へどのくらいの確率で遷移するかの確率分布
// もしかすると、例えば迷路だと、まっすぐアクションをして壁にぶつかるときに左右どちらに進むか、とか？


