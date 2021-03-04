const fs = require('fs');
const crypto = require('crypto');
const inquirer = require('inquirer');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcryptjs');
const { ENOBUFS } = require('constants');
const BCRYPT_WORK_FACTOR_BASE = 12;
const BCRYPT_DATE_BASE = 1483228800000;
const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000;

const sourceFileName = './config/template.json';
const destinationFileName = './config/production.json';
const sourceFile = require(sourceFileName);
var dbo;

async function connectDB(){
  try{
    var config = require(destinationFileName);
    var db = await MongoClient.connect(config.mongodb, { useNewUrlParser: true, useUnifiedTopology: true});
    dbo = db.db(db.s.options.dbName);
  }catch(e){}
}
async function validateUsername(username){
  var users = await dbo.collection("users").find({}).toArray();
  for(var i = 0; i< users.length; i++){
    if(users[i].username == username){
      return("  A user with this username already exists");
    }
  }
  return true;
}

async function validatePassword(password,test){
  if(password != test.password1) {return "Passwords do not match";}
  return true;
}


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

nuagesUser = {}

var nuagesUserQuestions = [
  {
    type: 'input',
    message: 'Enter the username of the Nuages user:  ',
    name: 'username',
    validate: validateUsername
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
    validate: validatePassword
  }
];

function promptAddUser() {
  inquirer.prompt(nuagesUserQuestions).then(async function(answers) {
    nuagesUser = answers;
    nuagesUser.password = await hasher(nuagesUser.password1);
    dbo.collection('users').insertOne({
        username: nuagesUser.username,
        password: nuagesUser.password
    },function (err, response) {
      if(err) {
        console.log("  Error creating the Nuages user: " + err.message);
      } else {
        console.log("  User created: " + nuagesUser.username);
      }
        promptIndex();
      });
    });
}

async function promptDelUser() {
  var users = await dbo.collection("users").find({}).toArray();
  var choices = [];
  for(var i = 0; i< users.length; i++){
    choices.push(users[i].username);
  }
  choices.push("Cancel");
  answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'user',
      message: 'What user do you want to delete?',
      choices: choices
    }
  ]);
  if (answers.user == "Cancel"){
    promptIndex();
  }
  else{
  dbo.collection("users").deleteOne({username: answers.user},function (err, response) {
    if(err) {
      console.log("  Error deleting the Nuages user: " + err.message);
    } else {
      console.log("  User deleted: " + answers.user);
    }
      promptIndex();
    });
  }
}


async function promptMongoDB() {
  answers = await inquirer.prompt([{
    type: 'input',
    message: 'Enter the mongodb connection string:  ',
    name: 'mongodb',
    default: 'mongodb://localhost:27017/nuages_c_2'
  }]);
  MongoClient.connect(answers.mongodb, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, db) {
    if (err){
      console.log("  Error connecting to MongoDB: " + err.message);
      promptIndex();
    }else{
      console.log("  Connection successful!");
      dbo = db.db(db.s.options.dbName);
      sourceFile.mongodb = answers.mongodb;
      sourceFile.authentication.secret = crypto.randomBytes(256).toString('hex');
      fs.writeFile(destinationFileName, JSON.stringify(sourceFile, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
      });
      promptIndex();
    }
  });
}

async function promptClearDatabase(){
  answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'clear',
      message: 'Are you sure you want to delete all data in the database?'
    }
  ]);
  if(answers.clear){
    dbo.dropDatabase(function (err, response) {
      if(err) {
        console.log("  Error clearing the database: " + err.message);
      } else {
        console.log("  Database cleared!");
      }
        promptIndex();
      });
  }else{promptIndex();}
}

function promptIndex() {
  if (dbo === undefined){
    var choices = ['Setup database connection'];
  }else{
    var choices= [
      'Setup database connection',
      'Add a user',
      'Delete a user',
      'Clear database',
      'Exit'
    ];
  }
  inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: choices
    }
  ])
  .then((answers) => {
    if (answers.action=='Exit'){
      process.exit(0);
    }else if(answers.action=='Setup database connection'){
      promptMongoDB();
    }
    else if(answers.action=='Add a user'){
      promptAddUser();
    }
    else if(answers.action=='Delete a user'){
      promptDelUser();
    }
    else if(answers.action=='Clear database'){
      promptClearDatabase();
    }
  });
  }

async function setup(){
  await connectDB();
  promptIndex();
}

setup();


