const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config()
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/",(req, res) => {
    res.send("Server is running")
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.n72f5gi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const verifyJWT = (req, res, next) => {
    const authHeaders = req.headers.authorization;
    if(!authHeaders){
        return res.status(403).send({message: "unauthorized access"});
    }

    const token = authHeaders.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(403).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next()
    })
}


const server = async() => {
    try{
        const serviceCollection = client.db("genius-car").collection("services")
        const orderCollection = client.db("genius-car").collection("orders")

        app.post("/jwt", async(req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
            res.send({token})
        })

        app.get("/services", async(req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();

            res.send(services)
        })

        app.get("/services/:id", async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const service = await serviceCollection.findOne(query);

            res.send(service)
        })

        app.get("/orders", verifyJWT, async(req, res) => {
            const decoded = req.decoded;
            if (decoded.email !== req.query.email){
                return res.status(403).send({ message: "unauthorized access" });
            }
            let query = {}
            if(req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders)
        })

        app.post("/orders", verifyJWT, async(req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        })

        app.patch("/orders/:id", verifyJWT, async(req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc );
            res.send(result)
        })

        app.delete("/orders/:id", verifyJWT, async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await orderCollection.deleteOne(query);

            res.send(order)
        })
    }
    finally{

    }
}

server().catch((error) => console.log(error))

app.listen(port, () => {
    console.log("Server is running on port", port);
})