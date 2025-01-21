const fs = require('fs');
const crypto = require('crypto');
const inquirer = require('inquirer');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcryptjs');
const { ENOBUFS } = require('constants');
const { validate } = require('feathers-hooks-common');
const BCRYPT_WORK_FACTOR_BASE = 12;
const BCRYPT_DATE_BASE = 1483228800000;
const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000;
const sourceFileName = './config/template.json';
const destinationFileName = './config/default.json';
const sourceFile = require(sourceFileName);
var dbo;

// This is an ugly workaround to pass the password from the first prompt to the second prompt
global.password_to_verify = null;

async function connectDB(){
  try{
    var config = require(destinationFileName);
    var db = await MongoClient.connect(config.mongodb, {});
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

async function validatePassword(password){
  if(password != global.password_to_verify) {return "Passwords do not match";}
  global.password_to_verify = null;
  return true;
}

async function savePassword1(password){
  global.password_to_verify = password;
  return true;
}


function hasher (password) {
  return bcrypt.hash(password, 10)
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
    validate: (password) => savePassword1(password)
  },
  {
    type: 'password',
    message: 'Retype the password of the Nuages user: ',
    name: 'password2',
    mask: '*',
    validate: (password) => validatePassword(password)
  }
];

function promptAddUser() {
  inquirer.default.prompt(nuagesUserQuestions).then(async function(answers) {
    nuagesUser = answers;
    nuagesUser.password = await hasher(nuagesUser.password1);
    const result = await dbo.collection('users').insertOne({
        username: nuagesUser.username,
        password: nuagesUser.password
    });
      if(!result.acknowledged) {
        console.log("  Error creating the user" );
      } else {
    console.log("  User created: " + nuagesUser.username);
      }
    promptIndex();
    });
}

async function promptDelUser() {
  var users = await dbo.collection("users").find({}).toArray();
  var choices = [];
  for(var i = 0; i< users.length; i++){
    choices.push(users[i].username);
  }
  choices.push("Cancel");
  answers = await inquirer.default.prompt([
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
  const result = await dbo.collection("users").deleteOne({username: answers.user});
    if(!result.acknowledged){
      console.log("  Error deleting the Nuages user ");
    } else {
      console.log("  User deleted: " + answers.user);
    }
    promptIndex();
  }
}


async function promptMongoDB() {
  answers = await inquirer.default.prompt([{
    type: 'input',
    message: 'Enter the mongodb connection string:  ',
    name: 'mongodb',
    default: 'mongodb://127.0.0.1:27017/nuages_c_2'
  }]);
  db = await MongoClient.connect(answers.mongodb, {});
    if (!db){
      console.log("  Error connecting to MongoDB ");
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
}

async function promptClearDatabase(){
  answers = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'clear',
      message: 'Are you sure you want to delete all data in the database?'
    }
  ]);
  if(answers.clear){
    const result = await dbo.dropDatabase();
      if(!result) {
        console.log("  Error clearing the database: ");
      } else {
        console.log("  Database cleared!");
      }
    promptIndex();
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
  inquirer.default.prompt([
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


