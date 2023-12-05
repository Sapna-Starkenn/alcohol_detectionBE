const express = require("express");
require("dotenv").config();
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");
const client = mqtt.connect(process.env.MQTT_IP);

const app = express();
app.use(cors());

client.on("connect", () => {
  client.subscribe("starkennInv3/DMS_PROD_1/data", (err) => {});
});

function convertToRange(number) {
  // Ensure the input is within the desired range
  number = (Number(number) - 0.73) / 1.92;

  // Map the input to the output range (0 to 100)
  return number;
}

let accelVal = [0, 0];
let prevVal = 0;

function generateData(io) {
  io.on("connection", (socket) => {
    console.log("Socket Connection ", socket.connected);
    console.log("User connected", socket.id);

    // let acceleration = 0.01;
    // let alcoholDetected = false;
    // let firstTimeExceeded = false;

    // const intervalId = setInterval(() => {
    //   const timestamp = Date.now() / 1000; // Convert milliseconds to seconds
    //   acceleration += Math.random() * 0.1; // Increase acceleration randomly

    //   if (acceleration > 2.5) {
    //     if (!firstTimeExceeded) {
    //       firstTimeExceeded = true;
    //     } else {
    //       alcoholDetected = true;
    //       console.log("Alcohol detected!");
    //     }
    //   }

    //   const dataPoint = {
    //     timestamp: timestamp,
    //     acceleration: acceleration,
    //     alcohol: alcoholDetected,
    //   };

    //   socket.emit("data", dataPoint);

    //   // console.log(dataPoint);

    //   // Stop after 10 iterations (adjust as needed)
    //   if (acceleration > 0.5 && alcoholDetected) {
    //     clearInterval(intervalId);
    //     return;
    //     // socket.disconnect(); // Disconnect the client socket
    //   }
    // }, 500);
    client.on("message", (topic, message) => {
      let mqttData = JSON.parse(message.toString());
      console.log(mqttData);
      accelVal = [prevVal, convertToRange(mqttData.Acceleration_input_voltage)];

      prevVal = convertToRange(mqttData.Acceleration_input_voltage);

      const timestamp = Date.now() / 1000; // Convert milliseconds to seconds
      const dataPoint = {
        timestamp: timestamp,
        alcohol: mqttData.Result_Alcohol,
        img_url: mqttData.img_url,
        // acceleration: convertToRange(mqttData.Acceleration_input_voltage),
        acceleration: accelVal,
      };

      console.log(accelVal);

      socket.emit("data", dataPoint);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    method: ["GET", "POST"],
  },
});

generateData(io);

// app.get("/", (req, res) => {
//   return new Promise((ress, reject) => {
//     generateData(io);

//     // console.log(io);
//     ress(res.send("OK"));
//   });
// });

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
