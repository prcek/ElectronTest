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
document.getElementById("btn_change_fsmode").onclick = function() {
  ipcRenderer.send('change_fsmode');
}; 

document.getElementById("btn_enable_debug").onclick = function() {
  ipcRenderer.send('enable_debug');
}; 

document.getElementById("btn_shutdown").onclick = function() {
  ipcRenderer.send('shutdown');
}; 

document.getElementById("btn_open_set").onclick = function() {
  sb = document.getElementById("manual_setbar");
  if (sb.style.display=="none") {
    sb.style.display=null;
  } else {
    sb.style.display="none";
  }
}; 
function hide_manual_setbar() {
  sb = document.getElementById("manual_setbar");
  sb.style.display="none";
}
hide_manual_setbar();



//////////////////////////////////////////////////////////////
// open local db
var PouchDB = require('prcek_pouchdb');
PouchDB.plugin(require('pouchdb-find'));

var local_db = new PouchDB('cdb_local');
var local_updb = new PouchDB('upcdb_local')




local_db.info().then(function (result){
   console.log(result);
   sys_status_localdb_ready()
}).catch(function (err){
   console.log(err);
   sys_status_localdb_error()
});

local_updb.info().then(function (result){
   console.log(result);
   sys_status_localupdb_ready()
}).catch(function (err){
   console.log(err);
   sys_status_localupdb_error()
});


//local_db.viewCleanup().then(function (result) {
//  alert("db viewCleanup done");
//  console.log(result);
//}).catch(function (err) {
//  console.log(err);
//});


//reg_gif
sys_status_localdb_index_A_indexing();


//reg_gif
local_db.createIndex({
  index: {
    fields: ['gae_ds_kind','season_key','folder_key','course_key']
  }
}).then(function (result) {
  sys_status_localdb_index_A_ready();
  console.log("gae_ds_kind index ready");
  console.log(result);
}).catch(function (err) {
  sys_status_localdb_error()
  console.log("ref_gid index err");
  console.log(err);
});

sys_status_localdb_index_B_indexing();
local_db.createIndex({
  index: {
    fields: ['gae_ds_kind','ref_gid']
  }
}).then(function (result) {
  sys_status_localdb_index_B_ready();
  console.log("gae_ds_kind index ready");
  console.log(result);
}).catch(function (err) {
  sys_status_localdb_error()
  console.log("ref_gid index err");
  console.log(err);
});



function cdb_get_course(id, callback) {
  local_db.get(id).then(function (res) {
    callback(res)
  })
}

function cdb_get_course_sib(id,callback) {
  cdb_get_course(id,function(c){
    var fk = c.folder_key;
    var sk = c.season_key;

    local_db.find({
      selector: {gae_ds_kind: "Course", season_key: sk, folder_key: fk},
    }).then(function (result) {
      for(var i = 0; i < result.docs.length; i++) {
        s = result.docs[i]
        console.log(s)
      }
      callback(result.docs)
    });
  })
}

function cdb_lookup(id,callback) {
 // document.getElementById("decode_out").innerText = "..."

//  alert("find " + id);
  local_db.find({
    selector: {gae_ds_kind: "Student", ref_gid: id},
//    fields: ['_id', 'name'],
//    sort: ['name']
  }).then(function (result) {
   // alert("find ok");
    console.log(result);
    callback(result.docs[0]);
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}

var remote_db_url = ipcRenderer.sendSync('get_config', 'cdb_url');
var remote_db = new PouchDB(remote_db_url);

var remote_updb_url = ipcRenderer.sendSync('get_config', 'upcdb_url');
var remote_updb = new PouchDB(remote_updb_url);



function remotedb_state() {
  remote_db.info().then(function (result){
     console.log(result);
     sys_status_remotedb_ready()
     if (!first_sync) {
        cdb_sync();
     }
  }).catch(function (err){
     //cdb_log("remote db err = " + err);
     //console.log(err);
     console.log("remote_db_state error: "+err);

     sys_status_remotedb_error()
  });
}
remotedb_state();
window.setInterval(remotedb_state,60000);


function remote_updb_state() {
  remote_updb.info().then(function (result){
     console.log(result);
     sys_status_remoteupdb_ready()
     if (!up_first_sync) {
        upcdb_sync();
     }
     //cdb_log("remote db = " + result.db_name + " " + result.doc_count + " " + result.update_seq + ";");
  }).catch(function (err){
     //cdb_log("remote db err = " + err);
     console.log("remote_updb_state error: "+err);
     sys_status_remoteupdb_error()
  });
}
remote_updb_state();
window.setInterval(remote_updb_state,60000);




var first_sync = false;
let replication;
sys_status_syncdb_idle();
function cdb_sync() {
  first_sync = true;
  replication = PouchDB.replicate(remote_db,local_db, {live:false, retry:true}).on('change', function (info) {
  sys_status_syncdb_tick();
}).on('paused', function (err) {
  sys_status_syncdb_idle();
}).on('active', function () {
  sys_status_syncdb_active();
}).on('denied', function (err) {
  sys_status_syncdb_error();
}).on('complete', function (info) {
  sys_status_syncdb_done();
}).on('error', function (err) {
  sys_status_syncdb_error();
}); 
}

remote_db.info().then(function (result){
  cdb_sync();
})


var up_first_sync = false;
let up_replication;
sys_status_syncupdb_idle();
function upcdb_sync() {
  up_first_sync = true;
  replication = PouchDB.replicate(local_updb,remote_updb, {live:true, retry:true}).on('change', function (info) {
  sys_status_syncupdb_tick();
}).on('paused', function (err) {
  sys_status_syncupdb_idle();
}).on('active', function () {
  sys_status_syncupdb_active();
}).on('denied', function (err) {
  sys_status_syncupdb_error();
}).on('complete', function (info) {
  sys_status_syncupdb_done();
}).on('error', function (err) {
  sys_status_syncupdb_error();
}); 
}


remote_updb.info().then(function (result){
  upcdb_sync();
})


function updb_store_new_presence(doc) {
  local_updb.post(doc).then(function (response) {
    console.log(response);
  }).catch(function (err) {
    console.log("local_updb_post error: " +err);
  });
}



COURSE_SELECTOR = require("./course_selector.js");

COURSE_SELECTOR.init(local_db);


function update_presence_filter() {
  var x = PRESENCE.get_course_lists();
  var h = render_template("tpl_course",x);
  el = document.getElementById("presence_filter").innerHTML = h;
}

document.getElementById("btn_set_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=COURSE_SELECTOR.get_ck();
  cdb_get_course(course_key,function(course){
    PRESENCE.init();
    PRESENCE.add_course(course);
    clear_presence_stats();
    update_presence_filter();
  });
  hide_manual_setbar();
}; 

document.getElementById("btn_add_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=COURSE_SELECTOR.get_ck();
  cdb_get_course(course_key,function(course){
    PRESENCE.add_course(course);
    update_presence_filter();
  });
  hide_manual_setbar();
}; 

document.getElementById("btn_add_m_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=COURSE_SELECTOR.get_ck();
  cdb_get_course(course_key,function(course){
    PRESENCE.add_course_hm(course);
    update_presence_filter();
  });
  hide_manual_setbar();
}; 


document.getElementById("btn_set_ah_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=COURSE_SELECTOR.get_ck();
  cdb_get_course(course_key,function(course){
    PRESENCE.init();
    PRESENCE.add_course(course);
    clear_presence_stats();
    cdb_get_course_sib(course_key,function(courses){
        for(var i = 0; i < courses.length; i++) {
          PRESENCE.add_course_hm(courses[i])
        }
        update_presence_filter();
    });
  });
  hide_manual_setbar();
}; 


function set_test_value(ev) {
    document.getElementById("decode_input").value = ev.target.getAttribute("value");
    document.getElementById("qrcode_form").onsubmit(ev);
}
document.getElementById("btn_test_code1").addEventListener("click",set_test_value);
document.getElementById("btn_test_code2").addEventListener("click",set_test_value);
document.getElementById("btn_test_code3").addEventListener("click",set_test_value);
document.getElementById("btn_test_code4").addEventListener("click",set_test_value);



/*
document.getElementById("qrcode_form").onsubmit = function(ev) {
  ev.preventDefault(); 
	val = document.getElementById("decode_input").value;
  if (val == "") {
		document.getElementById("decode_input").value = TEST_QR_VAL_C2;
		return
	}
  document.getElementById("decode_input").value = "";

  if (val.startsWith("TS*")) {
	    dec_val = qr_decode_z(val);
      cdb_lookup(dec_val.id, cdb_show_res);
  } else if (val.startsWith("TS_CMD*")) {
      dec_val = qr_cmd_decode_z(val);
      console.log(dec_val);

      if (dec_val.id.startsWith("C_") ) {
        cdb_get_course(dec_val.course_id,function(course) {
          // Commands:  C_SETUP, C_ADD, C_ADD_M, C_ADD_F

          document.getElementById("decode_out").innerText = "CMD: " + dec_val.id + " " + course.code + " " + course.name;
          if (dec_val.id == "C_SETUP") {
            pdb_setup_course(course,function(res){
              alert(res);
            })
          }
        })
      } 
  }

};
*/


//// HOLD focus
set_focus();
var last_focus_time = 0;
function hold_focus() {
  if (document.activeElement.id == "decode_input") {
    last_focus_time = Date.now();
  } else {
    if ((Date.now() - last_focus_time) > 5000)  {
        last_focus_time = Date.now();
        set_focus();
    }
  }
}
window.setInterval(hold_focus,1000);
//// END of hold focus


/*
function cdb_show_res(res) {
  if (res.docs.length != 1) {
    document.getElementById("decode_out").innerText ="CDB: NOT FOUND";
    return;
  }
  doc = res.docs[0]
  document.getElementById("decode_out").innerText ="CDB: " + doc.ref_gid + " " + doc.name +" " +doc.surname;
  pdb_put_student(doc,function(res){
    alert(res);
  })

}
*/





document.getElementById("decode_input").oninput = function () {
  SCAN_RESULT.flash()
}

var CRC = require("crc");
function check_ts_crc(val) {
  vals = val.split("\*");
  data = vals[2];
  crc = vals[4];
  c = CRC.crc32(data+"*"+vals[0]);
//  console.log(c.toString(2) + " vs. " + Number.parseInt(crc,10).toString(2) ) ; 
  return (c == crc) 
}

function check_tscmd_crc(val) {
  vals = val.split("\*");
  data = vals[1];
  crc = vals[2];
  c = CRC.crc32(data+"*"+vals[0]); 
//  console.log(c.toString(2) + " vs. " + Number.parseInt(crc,10).toString(2) ) ; 
  return (c == crc) 
}

var PAKO = require("pako");
function unpack_json(val) {
  var strData     = atob(val);
  var charData    = strData.split('').map(function(x){return x.charCodeAt(0);});
  var binData     = new Uint8Array(charData);
  var data        = PAKO.inflate(binData);
  var strData     = String.fromCharCode.apply(null, new Uint16Array(data));
  return JSON.parse(strData);
}

function timedformat(time) {
  time = time /(1000);
  if (time < 120) {
    return Math.round(time) + " sec";
  }
  time = time /60;
  return Math.round(time)+" min";
}

var UUID = require('node-uuid'); 
var STATION_NAME = ipcRenderer.sendSync('get_config', 'station_name');


function do_ts_attend(ref_gid,ses) {


      cdb_lookup(ref_gid,function(s){
        if (s == null) {
          SCAN_RESULT.show_error("Neznámý žák!");
          updb_store_new_presence({"type":"res", "data":"wrong_student", "session": ses});
        } else { 
          r = PRESENCE.try_attend(s);   
          console.log(r);
          if (r.ok) {  
            if (r.male) {
              SCAN_RESULT.show_ok_male(r.name);
            } else {
              SCAN_RESULT.show_ok_female(r.name);
            }
            ps = PRESENCE.get_stats();
            show_presence_stats(ps.total,ps.m,ps.f);
            updb_store_new_presence({"type":"res", "data":"ok","presence":r, "session": ses});
          } else if (r.dupl) {
            delay = Date.now () - r.dupl_time;
            if (r.male) {
                SCAN_RESULT.show_dupl_male(r.name + "(před " + timedformat(delay) + ")");
            } else {
                SCAN_RESULT.show_dupl_female(r.name + "(před " + timedformat(delay) + ")");
            }
            updb_store_new_presence({"type":"res", "data":"dupl","presence":r, "session": ses});
          } else if (r.diff) {
            SCAN_RESULT.show_error(r.name + " - jiný kurz.")
            updb_store_new_presence({"type":"res", "data":"diff","presence":r, "session": ses});
          } else {
            SCAN_RESULT.show_error("Neznámá chyba.")
            updb_store_new_presence({"type":"res", "data":"unknow","presence":r, "session": ses});
          }
        }
      });

}


document.getElementById("qrcode_form").onsubmit = function(ev) {
  ev.preventDefault(); 
  val = document.getElementById("decode_input").value;
  document.getElementById("decode_input").value = "";
  //console.log(val);
  ses = { "ts": Date.now(), "id": UUID.v4(), "station_name": STATION_NAME};
  updb_store_new_presence({"type":"raw_scan", "data":val, "session": ses});

  if (val.startsWith("TS*")) {
    if (!check_ts_crc(val)) {
      SCAN_RESULT.show_error("Neplatný ochraný kód.");
      updb_store_new_presence({"type":"res", "data":"invalid_checksum", "session": ses});
    } else {
      d = unpack_json(val.split("\*")[2]);      
      //console.log(d);
      ref_gid = d.id;
      updb_store_new_presence({"type":"decoded_ts", "data":ref_gid, "fulldata": d, "session": ses});
      do_ts_attend(ref_gid,ses);
    }
  } else if (val.startsWith("#")) {
    ref_gid = parseInt(val.substr(1));
    if (ref_gid) {
      updb_store_new_presence({"type":"manual_ts", "data":ref_gid, "fulldata": val, "session": ses});
      do_ts_attend(ref_gid,ses);      
    } else {
      SCAN_RESULT.show_error("Neplatný kód.");
    }
  } else if (val.startsWith("TS_CMD*")) {
    if (!check_tscmd_crc(val)) {
      SCAN_RESULT.show_error("Neplatný ochraný kód.");
      updb_store_new_presence({"type":"res", "data":"invalid_checksum", "session": ses});
    } else {
      d = unpack_json(val.split("\*")[1]);
      updb_store_new_presence({"type":"decoded_tscmd", "data":d.id, "fulldata": d, "session": ses});
      if (d.id == "C_SETUP") {
        cdb_get_course(d.course_id,function(c){
          if (c) {
            PRESENCE.init();
            PRESENCE.add_course(c);
            clear_presence_stats();
            update_presence_filter();
            SCAN_RESULT.show_setup_ok("Nastaven kurz " + c.code);
          } else{ 
            SCAN_RESULT.show_setup_error("Neznámý kurz");
          }
        });
      } else if (d.id == "C_SETUP_GM") {
        cdb_get_course(d.course_id,function(c){
          if (c) {
            PRESENCE.init();
            PRESENCE.add_course(c);
            clear_presence_stats();
            update_presence_filter();
            cdb_get_course_sib(d.course_id,function(courses){
              for(var i = 0; i < courses.length; i++) {
                PRESENCE.add_course_hm(courses[i])
              }
              update_presence_filter();
              SCAN_RESULT.show_setup_ok("Nastaven kurz " + c.code + " a hostující kluci");
            });
          } else { 
            SCAN_RESULT.show_setup_error("Neznámý kurz");
          }
        });
      } else if (d.id == "C_ADD") {
        cdb_get_course(d.course_id,function(c){
          if (c) {
            PRESENCE.add_course(c);
            update_presence_filter();
            SCAN_RESULT.show_setup_ok("Přidán kurz " + c.code);
          } else{ 
            SCAN_RESULT.show_setup_error("Neznámý kurz");
          }
        });
      } else if (d.id == "C_ADD_M") {
        cdb_get_course(d.course_id,function(c){
          if (c) {
            PRESENCE.add_course_hm(c);
            update_presence_filter();
            SCAN_RESULT.show_setup_ok("Přidáni kluci z kurzu " + c.code);
          } else{ 
            SCAN_RESULT.show_setup_error("Neznámý kurz");
          }
        });
      } else {
        SCAN_RESULT.show_setup_error("Neznámá příkazová karta");
      }
    }
  } else {
      SCAN_RESULT.show_error("Neznámý typ karty.")
  }
}


//////////////////////////////

SCAN_RESULT.show_ready();

PRESENCE = require("./presence.js");
PRESENCE.init();
clear_presence_stats();
update_presence_filter();
///////////////////////////////
if (ipcRenderer.sendSync('get_config', 'debug')) {
  document.getElementById("debugbar").style.display=null;
}

