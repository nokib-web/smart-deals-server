const express = require('express')
const cors = require('cors')
require('dotenv').config();
const iwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
var admin = require("firebase-admin");
const port = process.env.PORT || 3000



var serviceAccount = require("./smart-deals-firebase-adminSDK.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9bjil3c.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



// middleware
app.use(cors());
app.use(express.json())


const logger = (req, res, next) => {
    console.log('logging info')
    next()
}



const verifyFirebaseToken = async (req, res, next) => {
    console.log('in the verify middleware', req.headers.authorization)
    if (!req.headers.authorization) {
        return res.status(401).send({ message: ' unauthorize access' })
    }
    const token = req.headers.authorization.split(' ')[1]
    if (!token) {
        return res.status(401).send({ message: ' unauthorize access' })
    }
    try {
        const userInfo = await admin.auth().verifyIdToken(token);
        req.token_email = userInfo.email;
        console.log('after token validation ', userInfo)
        next()
    }
    catch {
        return res.status(401).send({ message: ' unauthorize access' })
    }


}





app.get('/', (req, res) => {
    res.send('Hello World!')
})

async function run() {
    try {

        await client.connect();


        const db = client.db('smart_db')
        const productsCollection = db.collection('products')
        const bidsCollection = db.collection('bids');
        const userCollection = db.collection('users')

        // jwt re related api
        app.post ('/getToken',(req,res)=>{
            const loggedUser = req.body;
            const token = jwt.sign({loggedUser}, process.env.JWT_SECRET, {expiresIn: '1h'})
            res.send({token:token})
        })

        // Users api
        app.post('/users', async (req, res) => {
            const newUser = req.body;

            const email = req.body.email
            const query = { email: email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                res.send({ message: "User already exist" })
            }
            else {
                const result = await userCollection.insertOne(newUser);
                res.send(result)

            }

        });

        app.get('/users', async (req, res) => {
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        // Read Products=>>>R
        app.get('/products', async (req, res) => {


            // const projectsFields = {title:1, price_min:1 , price_max:1, image:1}
            // const cursor = productsCollection.find().sort({price_min: -1}).skip(2).limit(5).project(projectsFields);

            console.log(req.query);

            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email;
            }

            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });

        app.get('/latest-products', async (req, res) => {
            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result)
        })

        //  Get single Products=> R
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result)

        })




        // create Products=>> C
        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        });


        // Update Products=> U
        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id) };

            const update = { $set: updatedProduct }

            const result = await productsCollection.updateOne(query, update);
            res.send(result);
        })


        // Delete Products =>>  D
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });


        // bids related api

        app.get('/bids', logger, verifyFirebaseToken, async (req, res) => {

            console.log('headers', req.headers)

            const email = req.query.email;
            const query = {}
            if (email) {
                if(email !==req.token_email){
                    return res.status(403).send({message: ' forbidden access'})
                }
                query.buyer_email = email;
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });

        app.get('/products/bids/:productId', verifyFirebaseToken, async (req, res) => {
            const productId = req.params.productId;
            const query = { product: productId }
            const cursor = bidsCollection.find(query).sort((a, b) => b.bid_price - a.bid_Price);
            const result = await cursor.toArray();
            res.send(result);
        });




        app.post('/bids', async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        })

        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        })







        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {


    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
