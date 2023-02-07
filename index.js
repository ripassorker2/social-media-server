const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(express.json());
app.use(cors());

// Database Connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gvjclco.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const usersCollection = client.db("social-media").collection("users");
    const postsCollection = client.db("social-media").collection("posts");

    // <<.......... post post.............>>
    app.post("/post", async (req, res) => {
      const post = req.body;
      const result = await postsCollection.insertOne(post);
      res.send(result);
    });

    app.get("/posts", async (req, res) => {
      const query = {};
      const result = await postsCollection
        .find(query)
        .sort({ $natural: -1 })
        .toArray();
      res.send(result);
    });

    // delete react

    app.delete("/delete/:id", async (req, res) => {
      const react = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const post = await postsCollection.findOne(filter);
      const allReact = post?.reacts;

      const existReactUser = allReact?.find(
        (prevReact) => prevReact.userId === react.userId
      );

      if (existReactUser) {
        const result = await postsCollection.updateOne(
          filter,
          {
            $pull: { reacts: { userId: react.userId } },
          },
          { upsert: false }
        );
        return res.send(result);
      }
    });

    // add react

    app.put("/react/:id", async (req, res) => {
      const react = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const post = await postsCollection.findOne(filter);
      const allReact = post?.reacts;

      const existReactUser = allReact?.find(
        (singlereact) => singlereact.userId === react.userId
      );

      if (existReactUser) {
        const updateReact = await postsCollection.updateOne(
          { _id: ObjectId(id), "reacts.userId": react.userId },
          {
            $set: {
              "reacts.$.reactName": react.reactName,
              "reacts.$.reactImg": react.reactImg,
            },
          }
        );
        return res.send(updateReact);
      }

      const options = { upsert: true };
      const result = await postsCollection.updateOne(
        filter,
        {
          $push: {
            reacts: react,
          },
        },
        options
      );
      res.send(result);
    });

    // add comment

    app.put("/comment/:id", async (req, res) => {
      const commemt = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const result = await postsCollection.updateOne(
        filter,
        {
          $push: {
            comments: commemt,
          },
        },
        options
      );
      res.send(result);
    });

    // <<.......... Save user & generate JWT.............>>

    app.get("/users", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res.send({ result, token });
    });
  } finally {
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Server is running -->>->>");
});

app.listen(port, () => {
  console.log(`Server is running...on ${port}--->>=>>`);
});
