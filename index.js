const express = require("express");
const bp = require("body-parser");
const ejs = require("ejs");
const app = express();
const axios = require("axios");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require("express-session");
let hpassword = null;
app.use(bp.urlencoded({ extended: true }));
app.set("view engine", "ejs");
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: "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",
});
const { exec } = require("child_process");
const { google } = require("googleapis");
const pythonScript = "mypython.py";
const apiKey = "AIzaSyBtVY7Ro5EgGZXOBBBqzS4CeHEyO4KyVXM";
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
var serviceAccount = require("./key.json");
let videoIds = [];
app.use(
  session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
  }),
);
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { wrong: null });
});

app.get("/register", (req, res) => {
  res.render("register.ejs", { msg: null });
});

app.post("/register", async (req, res) => {
  const name = req.body.newUsername;
  const mail = req.body.newEmail;
  req.session.email = mail;
  req.session.name1 = name;
  const password = req.body.newPassword.toString();
  const querySnapshot = await db
    .collection("gdsc-hack")
    .where("Email", "==", mail)
    .get();

  if (!querySnapshot.empty) {
    res.render("register.ejs", { msg: "Already registered Email!!!" });
  } else {
    const hpassword = await bcrypt.hash(password, saltRounds);

    const data = {
      Name: name,
      Email: mail,
      Password: hpassword,
    };
    await db.collection("gdsc-hack").add(data);
    res.render("search.ejs", { text: null,name:"Hello"+" "+name+"...!"  });
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.username;
  req.session.email = email;
  const user1Snapshot = await db
    .collection("gdsc-hack")
    .where("Email", "==", email)
    .get();
  if (user1Snapshot.empty) {
    res.render("login.ejs", { wrong: "Invalid Email" });
    return;
  }
  const user1Data = user1Snapshot.docs[0].data();
  const hPassword = user1Data.Password;
  const password = req.body.password;
  bcrypt.compare(password, hPassword, function (err, result) {
    db.collection("gdsc-hack")
      .where("Email", "==", email)
      .where("Password", "==", hPassword)
      .get()
      .then((docs) => {
        if (docs.size > 0) {
          const name1=user1Data.Name;
          req.session.name1=name1;
          res.render("search.ejs", { text: null,name:"Hello"+" "+name1+"...!" });
        } else {
          res.render("login.ejs", { wrong: "Invalid Password" });
        }
      });
  });
});

app.post("/search", async (req, res) => {
  const topic = req.body.topic;
  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  youtube.search.list(
    {
      q: topic,
      type: "video",
      part: "id,snippet",
      maxResults: 5,
    },
    async (err, response) => {
      if (err) {
        console.error("Error executing API request:", err);
        return;
      }

      const videos = response.data.items;
      videos.forEach((video) => {
        const videoId = video.id.videoId;
        videoIds.push(videoId);
      });

      const ipstring = videoIds.join(" ");

      const command = `python ${pythonScript} ${ipstring}`;

      const pythonProcess = exec(command, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        const text = stdout.toString();

        const trimmedText = text.substring(0, 4096);

        async function main() {
          const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: `give notes of ${trimmedText} on the topic ${topic} with minimum 60 sentences`,
              },
            ],
            stream: true,
          });
          let result = "";

          for await (const chunk of stream) {
            result += chunk.choices[0]?.delta?.content || "";
          }

          res.render("search.ejs", { text: result ,name:"Hello"+" "+req.session.name1+"...!"});
          videoIds = [];
        }

        main();
      });

      pythonProcess.on("exit", (code) => {
        console.log(`Python Script exited with code ${code}`);
      });
    },
  );
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});
