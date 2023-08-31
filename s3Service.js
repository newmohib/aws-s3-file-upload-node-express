const { S3Client, PutObjectCommand, HeadObjectCommand, CreateBucketCommand, ListBucketsCommand, ListObjectsCommand, BucketAlreadyExists, DeleteBucketCommand, HeadBucketCommand, PutBucketPolicyCommand,PutPublicAccessBlockCommand,DeletePublicAccessBlockCommand, PutBucketAclCommand } = require('@aws-sdk/client-s3');


// Configure AWS SDK
// Set the AWS region
const region = 'ap-south-1';

// Set your AWS credentials
const credentials = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY
};

// Create an S3 client instance with the specified credentials
const s3Client = new S3Client({
  region,
  credentials,
});

// Async function to list buckets
const listOfBuckets = () => {
  return new Promise((resolve, reject) => {
    const listBucketsCommand = new ListBucketsCommand({});
    s3Client.send(listBucketsCommand)
      .then(data => {
        console.log("Bucket List", data.Buckets);
        resolve(data.Buckets);
      })
      .catch(err => {
        console.error("Error", err);
        reject(err);
      });
  });
};

const generateObjectUrl = (objectList, bucketName)=>{
  //https://mohibbs-23-net.s3.ap-south-1.amazonaws.com/79038364-8b42-434d-ab71-d6573300ab5b.jpg

  const objectUrls = objectList.map(object => {
    return `https://${bucketName}.s3.${region}.amazonaws.com/${object.Key}`;
  });
  return objectUrls;
}

// Async function to list all objects in a bucket
const listObjectsInBucket = (bucketName) => {
  return new Promise((resolve, reject) => {
    const listObjectsCommand = new ListObjectsCommand({
      Bucket: bucketName,
    });

    s3Client.send(listObjectsCommand)
      .then(data => {
        console.log("Object List", data.Contents);
        let objectList = generateObjectUrl(data.Contents, bucketName)
        resolve(objectList);
      })
      .catch(err => {
        console.error("Error", err);
        reject(err);
      });
  });
};

// Async function to check bucket existence
const isExistBucket = (bucketName) => {
  return new Promise((resolve, reject) => {
    const headBucketCommand = new HeadBucketCommand({
      Bucket: bucketName,
    });

    s3Client.send(headBucketCommand)
      .then(() => {
        console.log(`Bucket "${bucketName}" already exists`);
        resolve(true);
      })
      .catch(err => {
        console.log(err);
        resolve(false);
      });
  });
};


// Function to enable public access block
const enablePublicAccessBlock = async (bucketName) => {
  try {
    // Set the PublicAccessBlockConfiguration options deletePublicAccessBlock
    const publicAccessBlockParams2 = {
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        BlockPublicPolicy: false,
        IgnorePublicAcls: false,
        RestrictPublicBuckets: false,
      },
    };

    const publicAccessBlockParams = {
      Bucket: bucketName
    };

    // Call S3 to enable public access block using await
    const response = await s3Client.send(new DeletePublicAccessBlockCommand(publicAccessBlockParams));
    const updateResponse = await s3Client.send(new PutPublicAccessBlockCommand(publicAccessBlockParams2));

    console.log(`Public access block enabled for bucket "${bucketName}".`);
    console.log("Response", response);
    return true;
  } catch (error) {
    console.error('Error enabling public access block:', error);
    return false;
  }
};

// Async function to create a bucket
const createBucket = (bucketName) => {
  return new Promise((resolve, reject) => {
    const createBucketCommand = new CreateBucketCommand({
      Bucket: bucketName,
      ACLs: "public-read",
      ObjectLockEnabledForBucket: false,
      ObjectOwnership: "BucketOwnerPreferred"

    });

    s3Client.send(createBucketCommand)
      .then(response => {
        console.log(`Bucket "${bucketName}" created successfully`);
        console.log("Response", response);
        // return resolve(true);

        enablePublicAccessBlock(bucketName)
          .then(created => {
            if (created) {
             return resolve(true);
            }
            return resolve(false);
          })
          .catch(err => {
            console.error("Error", err);
            return resolve(false);
          });
        
      })
      .catch(err => {
        console.error("Error", err);
        resolve(false);
      });
  });
};

// Async function to check bucket existence and create if necessary
const checkAndCreateBucket = async (bucketName) => {
  try {
    const exists = await isExistBucket(bucketName);

    if (!exists) {
      const isCreated = await createBucket(bucketName);
      return true;
    } else {
      return true;
    }
  } catch (err) {
    console.error("Error", err);
    return false;
  }
};

const generateFileExtensions = (fileExtension)=>{
  const fileExtensions = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
  
    // Text
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.log': 'text/plain',
  
    // XML
    '.xml': 'application/xml',
    '.xsd': 'application/xml',
    '.xsl': 'application/xml',
  
    // Excel
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
    // Word
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  
    // PDF
    '.pdf': 'application/pdf',

    // / HTML
    '.html': 'text/html',
  };


const contentType = fileExtension ? fileExtensions[fileExtension.toLowerCase()]: "";
return contentType

}

// Async function to upload an object to S3
const uploadObject = async (bucketName, objectKey, fileExtension, content) => {
  // Example code for uploading image files with different extensions

  try {
    const isCreated = await checkAndCreateBucket(bucketName);

    if (!isCreated) {
      return false;
    }

    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: content,
      ACLS: 'public-read',
      ContentType: generateFileExtensions(fileExtension)
    });

    const response = await s3Client.send(putObjectCommand);

    console.log(`Object "${objectKey}" uploaded successfully`);
    console.log("Response", response);

    return true;
  } catch (err) {
    console.error("Error", err);
    return false;
  }
};

// Async function to create a bucket with public read access policy
// const createBucketWithPublicAccess = (bucketName) => {
//   return new Promise(async (resolve, reject) => {

//     try {

//       // Create a bucket policy to allow public read access
//       const bucketPolicy = {
//         Version: "2012-10-17",
//         Statement: [
//           {
//             Sid: "PublicReadGetObject",
//             Effect: "Allow",
//             Principal: "*",
//             Action: "s3:GetObject",
//             Resource: `arn:aws:s3:::${bucketName}/*`,
//           },
//         ],
//       };

//       // Set the bucket policy to allow public read access
//       const putBucketPolicyCommand = new PutBucketPolicyCommand({
//         Bucket: bucketName,
//         Policy: JSON.stringify(bucketPolicy),
//       });

//       await s3Client.send(putBucketPolicyCommand);

//       // Set the bucket's ACL to public-read
//       const putBucketAclCommand = new PutBucketAclCommand({
//         Bucket: bucketName,
//         ACL: "public-read",
//       });

//       await s3Client.send(putBucketAclCommand);

//       resolve(true);
//     } catch (err) {
//       console.error("Error", err);
//       reject(false);
//     }
//   });
// };

const createBucketWithPublicAccess = async (bucketName) => {
  try {
    // Create the CreateBucketCommand
    const createBucketCommand = new CreateBucketCommand({
      Bucket: bucketName,
    });

    // Call S3 to create the bucket using await
    await s3Client.send(createBucketCommand);

    // Create a bucket policy to allow public read access
    // const bucketPolicy = {
    //   Version: "2012-10-17",
    //   Id: "PublicAccessPolicy", // Add the Id here
    //   Statement: [
    //     {
    //       Sid: "PublicReadGetObject",
    //       Effect: "Allow",
    //       Principal: "*",
    //       Action: "s3:GetObject",
    //       Resource: `arn:aws:s3:::${bucketName}/*`,
    //     },
    //   ],
    // };

    let bucketPolicy = {
      Version: "2012-10-17",
      Id: "PublicAccessPolicy",
      Statement: [
        {
          Sid: "PublicRead",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
        }
      ]
    }
    

    // Set the bucket policy to allow public read access
    const putBucketPolicyCommand = new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy),
    });

    await s3Client.send(putBucketPolicyCommand);

    return true;
  } catch (err) {
    console.error("Error", err);
    return false;
  }
};







module.exports = { checkAndCreateBucket, uploadObject, createBucket, listObjectsInBucket }