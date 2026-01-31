const WebSocket = require("ws");

const API_TOKEN = "PUT_YOUR_API_TOKEN_HERE";
const APP_ID = 1089; // Deriv official app id
const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);

// ===== BOT SETTINGS =====
const SYMBOL = "R_100";
const STAKE = 1.0;           // small stake = low risk
const DURATION = 1;
const DURATION_UNIT = "t";
const BARRIER = 5;
const CONTRACT_TYPE = "DIGITOVER";

const MAX_LOSS = 5;          // stop after $5 loss
const TAKE_PROFIT = 5;       // stop after $5 profit

let totalProfit = 0;
let totalLoss = 0;
let tradeActive = false;

// ===== FUNCTIONS =====
function send(data) {
  ws.send(JSON.stringify(data));
}

function authorize() {
  send({ authorize: API_TOKEN });
}

function buyContract() {
  if (tradeActive) return;
  if (totalLoss >= MAX_LOSS || totalProfit >= TAKE_PROFIT) {
    console.log("🛑 Trading stopped (risk limits reached)");
    ws.close();
    return;
  }

  tradeActive = true;

  send({
    buy: 1,
    price: STAKE,
    parameters: {
      amount: STAKE,
      basis: "stake",
      contract_type: CONTRACT_TYPE,
      currency: "USD",
      duration: DURATION,
      duration_unit: DURATION_UNIT,
      symbol: SYMBOL,
      barrier: BARRIER
    }
  });
}

// ===== WEBSOCKET EVENTS =====
ws.on("open", () => {
  console.log("✅ Connected to Deriv");
  authorize();
});

ws.on("message", (msg) => {
  const data = JSON.parse(msg);

  if (data.msg_type === "authorize") {
    console.log("🔐 Authorized");
    buyContract();
  }

  if (data.msg_type === "buy") {
    console.log("📈 Trade opened");
  }

  if (data.msg_type === "proposal_open_contract") {
    if (data.proposal_open_contract.is_sold) {
      const profit = data.proposal_open_contract.profit;

      if (profit >= 0) {
        totalProfit += profit;
        console.log(`✅ Win: $${profit.toFixed(2)}`);
      } else {
        totalLoss += Math.abs(profit);
        console.log(`❌ Loss: $${profit.toFixed(2)}`);
      }

      console.log(
        `📊 Total Profit: $${totalProfit.toFixed(2)} | Total Loss: $${totalLoss.toFixed(2)}`
      );

      tradeActive = false;

      setTimeout(buyContract, 3000); // wait before next trade
    }
  }
});

ws.on("close", () => {
  console.log("🔌 Connection closed");
});
