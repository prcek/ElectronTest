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
//document.onkeydown = checkKey;
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
PouchDB.plugin(require('pouchdb-find'));

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


local_db.viewCleanup().then(function (result) {
//  alert("db viewCleanup done");
  console.log(result);
}).catch(function (err) {
  console.log(err);
});



local_db.createIndex({
  index: {
    fields: ['ref_gid']
  }
}).then(function (result) {
  alert("index ready");
  console.log(result);
}).catch(function (err) {
  alert("index err");
  console.log(err);
});



function cdb_lookup(id,callback) {
  document.getElementById("decode_out").innerText = "..."

//  alert("find " + id);
  local_db.find({
    selector: {ref_gid: id},
//    fields: ['_id', 'name'],
//    sort: ['name']
  }).then(function (result) {
   // alert("find ok");
    console.log(result);
    callback(result);
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}

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



//////////////////////////////////////////////////////////////
// qrcode decode test
var pako = require("pako");
var crc32 = require("crc-32");

function qr_unpack(b64Data) {
  var strData     = atob(b64Data);
  var charData    = strData.split('').map(function(x){return x.charCodeAt(0);});
  var binData     = new Uint8Array(charData);
  var data        = pako.inflate(binData);
  var strData     = String.fromCharCode.apply(null, new Uint16Array(data));
  return strData;
}

function qr_decode_z(val) {
  vals = val.split("\*");
  data = vals[2];
  salt = 12345;
  c = crc32.str(data+"*"+salt); 
  if (c != vals[3]) {
     console.log("wrong crc");
//     alert("wrong crc");
  } else {
     console.log("crc is ok " + c);
  } 
  json_str = qr_unpack(data);
  return JSON.parse(json_str);
}


const TEST_QR_VAL_C = "TS*38072*eJyrViouLcpLzE1VslJQckwBMpKVdBSUYCJeidmlSSCB4tTE4vw8kJCRgaGpvqEZRLACJJILYifnlxYVg/UYgrhlqUUgdkgwmJeZAuQYWxiYG9UCABEBHcs=*2213290619**"
document.getElementById("decode_input").value = TEST_QR_VAL_C;
document.getElementById("btn_decode_test").onclick = function() {
	val = document.getElementById("decode_input").value;
	dec_val = qr_decode_z(val);
        console.log(dec_val);
	document.getElementById("decode_out").innerText = dec_val.id + " " + dec_val.name +" " +dec_val.surname;
}; 

document.getElementById("qrcode_form").onsubmit = function(ev) {
        ev.preventDefault(); 
	val = document.getElementById("decode_input").value;
        if (val == "") {
		document.getElementById("decode_input").value = TEST_QR_VAL_C;
		return
	}
        document.getElementById("decode_input").value = "";
	dec_val = qr_decode_z(val);
	//alert("on submit " + dec_val.id);
  cdb_lookup(dec_val.id, cdb_show_res);
};

document.getElementById("decode_input").focus();

function cdb_show_res(res) {
  if (res.docs.length != 1) {
    //alert("not found!");
    document.getElementById("decode_out").innerText ="CDB: NOT FOUND";
    return;
  }
  doc = res.docs[0]
  //alert('result is ' + doc.name );
  document.getElementById("decode_out").innerText ="CDB: " + doc.ref_gid + " " + doc.name +" " +doc.surname;
}

document.getElementById("qrcode_gid_form").onsubmit = function(ev) {
        ev.preventDefault(); 
        val = document.getElementById("gid_input").value;
        cdb_lookup(parseInt(val),cdb_show_res);
};


