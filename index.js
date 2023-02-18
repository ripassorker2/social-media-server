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

    //.............verify JWT........................

    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res
          .status(401)
          .send({ message: "Unauthorization access .. kono access nai... !!" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(402).send({
              success: false,
              message: "Forbidden access",
            });
          }
          req.decoded = decoded;
          next();
        }
      );
    }

    // <<.......... add Friend.............>>

    app.put("/addFriend/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== req.body.email) {
        return res.status(403).send({ message: "Unmatched email" });
      }

      const body = req.body;
      const senderFilter = { _id: ObjectId(req.body.id) };
      const receiverFilter = { _id: ObjectId(req.params.id) };

      if (req.params.id !== body.id) {
        const sender = await usersCollection.findOne(senderFilter);

        const receiver = await usersCollection.findOne(receiverFilter);

        console.log(receiver);
        console.log(sender);

        const exisReceiver = receiver?.followers?.find(
          (r) => r.email === body.email
        );
        const options = { upsert: true };

        if (!exisReceiver) {
          const result1 = await usersCollection.updateOne(
            senderFilter,
            {
              $push: {
                requests: {
                  id: receiver._id,
                  name: receiver.name,
                  email: receiver.email,
                  profileImg: receiver?.profileImg,
                  currentDate: body.currentDate,
                  currentTime: body.currentTime,
                },
              },
            },
            options
          );
          const result2 = await usersCollection.updateOne(
            senderFilter,
            {
              $push: {
                following: {
                  id: receiver._id,
                  name: receiver.name,
                  email: receiver.email,
                  profileImg: receiver?.profileImg,
                  currentDate: body.currentDate,
                  currentTime: body.currentTime,
                },
              },
            },
            options
          );
          const result3 = await usersCollection.updateOne(
            receiverFilter,
            {
              $push: {
                followers: {
                  id: sender._id,
                  name: sender.name,
                  email: sender.email,
                  profileImg: sender?.profileImg,
                  currentDate: body.currentDate,
                  currentTime: body.currentTime,
                },
              },
            },
            options
          );
          return res.send(result1, result2, result3);
        } else {
          return res.send("All ready sent request");
        }
      } else {
        return res.send("You cannot send request yourself....");
      }
    });
    // <<.......... accept  friend request .............>>

    app.put("/accept/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== req.body.email) {
        return res.status(403).send({ message: "Unmatched email" });
      }

      const body = req.body;

      const senderFilter = { _id: ObjectId(req.params.id) };
      const receiverFilter = { _id: ObjectId(req.body.id) };

      if (req.params.id !== body.id) {
        const sender = await usersCollection.findOne(senderFilter);
        const receiver = await usersCollection.findOne(receiverFilter);
        receiver;

        console.log(sender);
        console.log();

        const existReceiver = receiver?.followers?.find(
          (r) => r.email === sender.email
        );
        const options = { upsert: true };

        if (existReceiver) {
          const result1 = await usersCollection.updateOne(
            senderFilter,
            {
              $push: {
                friends: {
                  id: receiver._id,
                  name: receiver.name,
                  email: receiver.email,
                  profileImg: receiver?.profileImg,
                },
              },
            },
            options
          );
          const result2 = await usersCollection.updateOne(
            receiverFilter,
            {
              $push: {
                friends: {
                  id: sender._id,
                  name: sender.name,
                  email: sender.email,
                  profileImg: sender?.profileImg,
                },
              },
            },
            options
          );
          const result3 = await usersCollection.updateOne(
            receiverFilter,
            {
              $pull: {
                followers: { email: sender.email },
              },
            },
            { upsert: false }
          );
          const result4 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                requests: { email: body.email },
              },
            },
            { upsert: false }
          );
          const result5 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                following: { email: body.email },
              },
            },
            { upsert: false }
          );
          return res.send(result1, result2, result3, result4, result5);
        } else {
          return res.send("user not exixt");
        }
      } else {
        return res.send("You cannot send request yourself....");
      }
    });
    // // <<.......... delete  request friend request .............>>

    app.put("/delete/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== req.body.email) {
        return res.status(403).send({ message: "Unmatched email" });
      }

      const body = req.body;

      const senderFilter = { _id: ObjectId(req.params.id) };
      const receiverFilter = { _id: ObjectId(req.body.id) };

      if (req.params.id !== body.id) {
        const sender = await usersCollection.findOne(senderFilter);
        const receiver = await usersCollection.findOne(receiverFilter);

        const existReceiver = receiver?.followers?.find(
          (r) => r.email === sender.email
        );

        const options = { upsert: false };

        if (existReceiver) {
          const result1 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                requests: { email: body.email },
              },
            },
            options
          );
          const result2 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                following: { email: body.email },
              },
            },
            options
          );
          const result3 = await usersCollection.updateOne(
            receiverFilter,
            {
              $pull: {
                followers: { email: sender.email },
              },
            },
            options
          );

          return res.send(result1, result2, result3);
        } else {
          return res.send("user not exixt");
        }
      } else {
        return res.send("You cannot send request yourself....");
      }
    });
    // // <<.......... delete  friend request .............>>

    app.put("/deleteFrn/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== req.body.email) {
        return res.status(403).send({ message: "Unmatched email" });
      }

      const body = req.body;

      const senderFilter = { _id: ObjectId(req.params.id) };
      const receiverFilter = { _id: ObjectId(req.body.id) };

      if (req.params.id !== body.id) {
        const sender = await usersCollection.findOne(senderFilter);
        const receiver = await usersCollection.findOne(receiverFilter);

        const existReceiver = receiver?.friends?.find(
          (r) => r.email === sender.email
        );

        const options = { upsert: false };

        if (existReceiver) {
          const result1 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                friends: { email: body.email },
              },
            },
            options
          );

          const result2 = await usersCollection.updateOne(
            receiverFilter,
            {
              $pull: {
                friends: { email: sender.email },
              },
            },
            options
          );

          return res.send({ result1, result2 });
        } else {
          return res.send("user not exixt");
        }
      } else {
        return res.send("You cannot send request yourself....");
      }
    });
    // // <<.......... cancle request friend request .............>>

    app.put("/cancle/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== req.body.email) {
        return res.status(403).send({ message: "Unmatched email" });
      }

      const body = req.body;
      const senderFilter = { _id: ObjectId(req.body.id) };
      const receiverFilter = { _id: ObjectId(req.params.id) };

      if (req.params.id !== body.id) {
        const sender = await usersCollection.findOne(senderFilter);
        const receiver = await usersCollection.findOne(receiverFilter);

        const exisReceiver = receiver?.followers?.find(
          (r) => r.email === body.email
        );

        const options = { upsert: false };

        if (exisReceiver) {
          const result1 = await usersCollection.updateOne(
            receiverFilter,
            {
              $pull: {
                followers: { email: body.email },
              },
            },
            options
          );
          const result2 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                requests: { email: receiver.email },
              },
            },
            options
          );
          const result3 = await usersCollection.updateOne(
            senderFilter,
            {
              $pull: {
                following: { email: receiver.email },
              },
            },
            options
          );

          return res.send(result1, result2, result3);
        } else {
          return res.send("user not exixt");
        }
      } else {
        return res.send("You cannot send request yourself....");
      }
    });

    // <<.......... post post.............>>

    app.post("/post", async (req, res) => {
      const post = req.body;
      const result = await postsCollection.insertOne(post);
      res.send(result);
    });

    // <<.......... update post.............>>

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const postText = body.postText;

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = { $set: { postText } };
      const result = await postsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // <<.......... get post.............>>
    app.get("/posts", async (req, res) => {
      const query = {};
      const result = await postsCollection
        .find(query)
        .sort({ $natural: -1 })
        .toArray();
      res.send(result);
    });

    // <<.......... get post.............>>

    app.get("/posts/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { posterEmail: email };
      const result = await postsCollection
        .find(filter)
        .sort({ $natural: -1 })
        .toArray();
      res.send(result);
    });

    // <<.......... post delete.............>>

    app.delete("/post/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await postsCollection.deleteOne(filter);
      res.send(result);
    });

    // <<.......... delete react.............>>

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

    // <<.......... add or update react.............>>

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

    // <<.......... add comment.............>>

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

    // <<.......... get all user.............>>

    app.get("/users", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // <<.......... get user by email.............>>

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });

    // <<.......... post and update user and user info.............>>

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const body = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = { $set: body };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(body, process.env.ACCESS_TOKEN_SECRET, {
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
