const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000

/**
 * 9ERHx9PgxZBnlorC
 * smartDB
 */
const uri = "mongodb+srv://smartDB:9ERHx9PgxZBnlorC@cluster0.9bjil3c.mongodb.net/?appName=Cluster0";


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

app.get('/', (req, res) => {
    res.send('Hello World!')
})

async function run() {
    try {
        
        await client.connect();


        const db = client.db('smart_db')
        const productsCollection = db.collection('products')


        // Read User=>>>R
        app.get('/products', async(req, res)=>{
            const cursor = productsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        });

        //  Get single User=> R
        app.get('/products/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await productsCollection.findOne(query);
            res.send(result)

        })


        // create User=>> C
        app.post('/products', async(req,res)=>{
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        });


        // Update User=> U
        app.patch('/products/:id', async (req, res)=>{
            const id = req.params.id;
            const updatedProduct = req.body;
            const query= {_id: new ObjectId(id)};
            const update = {
                $set: {
                    name: updatedProduct.name,
                    price: updatedProduct.price
                }
            }
            const result = await productsCollection.updateOne(query, update);
            res.send(result);
        })


        // Delete User =>>  D
        app.delete('/products/:id', async(req, res)=>{
            const id = req.params.id;
            const query =  { _id : new ObjectId(id)};
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });






       
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        
       
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
