const Agent = require("./Agent");
const _ = require("lodash");

// 参考：『実装ディープラーニング』
class SanmokuAgent extends Agent {

    constructor(env) {
        super();
        this.gamma = 0.8;
        this.env = env;
        this.Q = {};
        this.P = {}; // policy distribution \pi(s,a) // Qと同じ、[state][action]という構造になる

        this.smooth_policy_update = true;
        this.epsilon = 0.1;
        this.alpha = 0.01;
    }

    init() {
        this.r0 = null;
        this.r1 = null;
        this.s0 = null;
        this.s1 = null;
        this.a0 = null;
        this.a1 = null;
    }

    // ある状態から可能なアクションの中で、最大のQ値を返す
    optimalFutureValue(state) {
        var max = 0;
        for (var action in this.Q[state]) {
            max = Math.max(max, this.Q[state][action]);
        }
        return max;
    }

    sampleWeighted(p) {
        var r = Math.random();
        var c = 0.0;
        for(var i=0,n=p.length;i<n;i++) {
            c += p[i];
            if(c >= r) { return i; }
        }
    }

    step(s) {
        // act according to epsilon greedy policy

        var poss = this.env.getPossibleActions(s);
        console.log(s, poss);

        // Pの初期値は、各アクション均等割
        if(this.P[s] === undefined){
            this.P[s] = {};
        }
        poss.forEach(action => {
            this.P[s][action] || (this.P[s][action] = 1 / poss.length);
        });

        var probs = poss.map((action, i) => {
           return this.P[s][action];
        });

        // epsilon greedy policy
        var action;
        if (Math.random() < this.epsilon) {
            action = _.sample(poss); // random available action
            // this.explored = true;
        } else {
            // 状態遷移確率に応じてアクションを決めているだけ。
            action = poss[this.sampleWeighted(probs)];
            // console.log("hoge", poss, action, probs, this.P[s]);
            // this.explored = false;
        }

        // shift state memory
        this.s0 = this.s1;
        this.a0 = this.a1;
        this.s1 = s;
        this.a1 = action;

        console.log("s0", this.s0, "s1", this.s1);

        return action;
    }

    learn(r1) {
        // takes reward for previous action, which came from a call to act()
        if (!(this.r0 == null)) {
            // lambda: eligibility trace decay を使うときに必要
            this.learnFromTuple(this.s0, this.a0, this.r0, this.s1, this.a1, this.lambda);
            // if(this.planN > 0) {
            //     this.updateModel(this.s0, this.a0, this.r0, this.s1);
            //     this.plan();
            // }
        }
        this.r0 = r1; // store this for next update
    }

    learnFromTuple(s0, a0, r0, s1, a1) {
        // var sa = a0 * this.ns + s0;

        if(!this.Q[s0]){
            this.Q[s0] = {};
        }
        if(!this.Q[s1]){
            this.Q[s1] = {};
        }

        // calculate the target for Q(s,a)
        // Q learning target is Q(s0,a0) = r0 + gamma * max_a Q[s1,a]

        // in GridWorld, ns in the code is just a single integer indicating the next state
        var poss = this.env.getPossibleActions(s1);
        var qmax = 0;
        poss.forEach((action, i) => {
            this.Q[s1][action] || (this.Q[s1][action] = 0);
        });
        qmax = _.max(_.values(this.Q[s1]));
        var target = r0 + this.gamma * qmax;


        // simpler and faster update without eligibility trace
        // update Q[sa] towards it with some step size
        // alpha; 学習率
        this.Q[s0][a0] || (this.Q[s0][a0] = 0);
        var update = this.alpha * (target - this.Q[s0][a0]);
        this.Q[s0][a0] += update;
        // this.updatePriority(s0, a0, update);
        // update the policy to reflect the change (if appropriate)
        this.updatePolicy(s0);
    }

    updatePolicy(s) {

        var poss = this.env.getPossibleActions(s);

        // Pの初期値は、各アクション均等割
        if(!this.P[s]){
            this.P[s] = {};
            poss.forEach(action => {
                this.P[s][action] = 1 / poss.length;
            });
        }

        // set policy at s to be the action that achieves max_a Q(s,a)
        // first find the maxy Q values
        var qmax, nmax;
        var qs = [];
        poss.forEach((action, i) => {
            var qval = this.Q[s][action];
            qs.push(qval);
            if (i === 0 || qval > qmax) {
                qmax = qval;
                nmax = 1;
            }
            else if (qval === qmax) {
                nmax += 1;
            }
        });
        // now update the policy smoothly towards the argmaxy actions
        var psum = 0.0;
        poss.forEach((a, i) => {
            var target = (qs[i] === qmax) ? 1.0 / nmax : 0.0;

            if (this.smooth_policy_update) {
                // slightly hacky :p
                this.P[s][a] += this.beta * (target - this.P[s][a]);
                psum += this.P[s][a];
            } else {
                // set hard target
                this.P[s][a] = target;
            }
        });
        if (this.smooth_policy_update) {
            // renomalize P if we're using smooth policy updates
            poss.forEach((a, i) => {
                var a = poss[i];
                this.P[s][a] /= psum;
            });
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

}

module.exports = SanmokuAgent;