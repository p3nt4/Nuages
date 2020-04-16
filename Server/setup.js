const fs = require('fs');
const crypto = require('crypto');
const inquirer = require('inquirer');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcryptjs');

const BCRYPT_WORK_FACTOR_BASE = 12;
const BCRYPT_DATE_BASE = 1483228800000;
const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000;

function hasher (password) {
  return new Promise((resolve, reject) => {
    let BCRYPT_CURRENT_DATE = new Date().getTime();
    let BCRYPT_WORK_INCREASE = Math.max(0, Math.floor((BCRYPT_CURRENT_DATE - BCRYPT_DATE_BASE) / BCRYPT_WORK_INCREASE_INTERVAL));
    let BCRYPT_WORK_FACTOR = Math.min(19, BCRYPT_WORK_FACTOR_BASE + BCRYPT_WORK_INCREASE);
    bcrypt.genSalt(BCRYPT_WORK_FACTOR, function (error, salt) {
      if (error) {
        return reject(error);
      }

      bcrypt.hash(password, salt, function (error, hashedPassword) {
        if (error) {
          return reject(error);
        }

        resolve(hashedPassword);
      });
    });
  });
};

const sourceFileName = './config/template.json';
const destinationFileName = './config/default.json';
const sourceFile = require(sourceFileName);

nuagesUser = {}

var nuagesUserQuestions = [
  {
    type: 'input',
    message: 'Enter the username of the Nuages user:  ',
    name: 'username',
  },
  {
    type: 'password',
    message: 'Enter the password of the Nuages user:  ',
    name: 'password1',
    mask: '*',
  },
  {
    type: 'password',
    message: 'Retype the password of the Nuages user: ',
    name: 'password2',
    mask: '*',
  }
];

function promptNuagesUser() {
  inquirer.prompt(nuagesUserQuestions).then(answers => {
    if (answers.password1 != answers.password2) {
      console.log("  Passwords do not match!")
      promptNuagesUser();
    } else {
      nuagesUser = answers;
      hasher(nuagesUser.password1).then((hash)=>{
        nuagesUser.password = hash;
        promptMongoDB();
      });
    }
  });
}

function promptMongoDB() {
  inquirer.prompt([{
    type: 'input',
    message: 'Enter the mongodb connection string:  ',
    name: 'mongodb',
    default: 'mongodb://localhost:27017/nuages_c_2'
  }]).then(answers => {
    MongoClient.connect(answers.mongodb, { useNewUrlParser: true }, function(err, db) {
        if (err){
          console.log("  Error connecting to MongoDB: " + err.message);
          promptMongoDB();
        }else{
          var dbo = db.db(db.s.options.dbName);
          dbo.collection('users').insertOne({
              email: nuagesUser.username,
              password: nuagesUser.password
          },function (error, response) {
            if(err) {
              console.log("  Error creating the Nuages user: " + err.message);
              promptMongoDB();
            } else {
                sourceFile.mongodb = answers.mongodb;
                sourceFile.authentication.secret = crypto.randomBytes(256).toString('hex');
                fs.writeFile(destinationFileName, JSON.stringify(sourceFile, null, 2), function writeJSON(err) {
                  if (err) return console.log(err); else process.exit(0);
                });
                //process.exit(0);
              // return 
            }
        });
        }
    });
  });
}

promptNuagesUser();

