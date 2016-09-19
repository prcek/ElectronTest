// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


const ipcRenderer = require('electron').ipcRenderer

console.log("render start");


//////////////////////////////////////////////////////////////
// keylogger setup
function checkKey(e) {
    e = e || window.event;
    var t = document.getElementById("keylogger").innerText;
    if (t.length>70) {
       t = t.substr(1)
    }
    document.getElementById("keylogger").innerText = t +  String.fromCharCode(e.keyCode)
//    console.log(e.keyCode);
}
document.onkeydown = checkKey;
//////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////
// config open button
document.getElementById("btn_open_cfg").onclick = function() {
	ipcRenderer.send('open_config_dialog')
}; 
//////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////
// open local db
var PouchDB = require('prcek_pouchdb');
var local_db = new PouchDB('cdb_local');

function cdb_log(x) {
    document.getElementById("cdb_status").innerText +=  " " + x;
}


local_db.info().then(function (result){
   console.log(result);
   cdb_log("local db = " + result.db_name + " " + result.doc_count + " " + result.update_seq + ";");
}).catch(function (err){
   cdb_log("local db err = " + err);
   console.log(err);
});


var remote_db_url = ipcRenderer.sendSync('get_config', 'cdb_url');
var remote_db = new PouchDB(remote_db_url);


remote_db.info().then(function (result){
   console.log(result);
   cdb_log("remote db = " + result.db_name + " " + result.doc_count + " " + result.update_seq + ";");
}).catch(function (err){
   cdb_log("remote db err = " + err);
   console.log(err);
});


let replication;
function cdb_sync() {
   replication = PouchDB.replicate(remote_db,local_db, {live:false, retry:true}).on('change', function (info) {
   cdb_log('change ' + info);
}).on('paused', function (err) {
  // replication paused (e.g. replication up to date, user went offline)
   cdb_log('paused '+err);
}).on('active', function () {
  // replicate resumed (e.g. new changes replicating, user went back online)
   cdb_log('active');
}).on('denied', function (err) {
  // a document failed to replicate (e.g. due to permissions)
   cdb_log('denied ' +err);
}).on('complete', function (info) {
  // handle complete
   cdb_log('complete '+info);
   console.log(info);
}).on('error', function (err) {
  // handle error
   cdb_log('error '+err);
}); 
}

document.getElementById("btn_cdb_sync").onclick = function() {
	cdb_log("sync start");
	cdb_sync();	
}; 

document.getElementById("btn_cdb_sync_cancel").onclick = function() {
	cdb_log("sync cancel");
        replication.cancel();	
}; 





