const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');

const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Sevice Import
const { uploadObject, listObjectsInBucket, checkAndCreateBucket } = require('./s3Service');



const app = express();

// Set the view engine to EJS
app.set('view engine', 'ejs');



app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

// Multer storage configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


let users = {

}
const createBucketName = (email)=>{
    const bucketName = email.replace('@', '-').replace('.', '-').replace('+', '-');
    return bucketName;

}

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Define routes
app.get('/', (req, res) => {
    res.render('signup');
});

// Define routes
app.get('/home', async (req, res) => {
    let email = req.query.email;
    if (!email){
        res.redirect('/');
    }
    if (!users[email]) {
        const bucketName = createBucketName(email) //email.replace('@', '-').replace('.', '-');
        const isCreated = await checkAndCreateBucket(bucketName);
        if (!isCreated) {
            res.redirect('/');
        }else{
            users[email] = email;
        }
    }

    res.render('index',{ email});
});

app.get('/list', (req, res) => {

    let email = req.query.email;

    if (!email || !users[email]) {
        res.redirect('/');
    }

    const bucketName = createBucketName(email)
  
    listObjectsInBucket(bucketName)
    .then(result=>{
    //   return res.send({data: result, code: 200, message: "Success"})
      res.render('list', { urls: result, email });
  
    })
    .catch(err=>{
    //   res.send({code: 4000, message: "Data Not Found"})
    res.render('list', { urls: [], email });
    })
    
});


// API to upload an image
app.post('/upload', upload.single('file'), async (req, res) => {
    console.log("image upload", req.body)

    // req.body = JSON.parse(req.body.data)
    const { email, directory } = req.body;
  
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
  
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const maxFileSize = 1024 * 1024; // 1 MB
  
    const fileExtension = req.file.originalname.toLowerCase().slice(-4);
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: 'Invalid file extension' });
    }
  
    if (req.file.size > maxFileSize) {
      return res.status(400).json({ error: 'File size exceeds the limit' });
    }
  
    const bucketName = createBucketName(email);
    const keyPrefix = directory ? directory + '/' : '';
    const key = keyPrefix + uuidv4() + fileExtension;
  
    try {
  
      // Check if the bucket exists, create if not
      let content = req.file.buffer;
      const isUploded = await uploadObject(bucketName, key, fileExtension, content);
  
      if (!isUploded) {
        return res.json({code: 400, message: 'Image Not uploaded' });
      }
  
      console.log('Uploaded successfully');
      return res.json({code:200, message: 'Image uploaded successfully' });
    } catch (err) {
      console.error('Error uploading:', err);
      res.status(500).json({code:500, error: 'Error uploading image' });
    }
  
  });


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
