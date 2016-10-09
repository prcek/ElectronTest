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
var present_db = new PouchDB('present')




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


//reg_gif
local_db.createIndex({
  index: {
    fields: ['ref_gid']
  }
}).then(function (result) {
  console.log("ref_gid index ready");
  console.log(result);
}).catch(function (err) {
  alert("ref_gid index err");
  console.log("ref_gid index err");
  console.log(err);
});

//reg_gif
local_db.createIndex({
  index: {
    fields: ['gae_ds_kind','season_key','folder_key','course_key']
  }
}).then(function (result) {
  console.log("gae_ds_kind index ready");
  console.log(result);
}).catch(function (err) {
  alert("gae_ds_kind index err");
  console.log("ref_gid index err");
  console.log(err);
});

//var access_courses = []
//var access_courses_m = []


let current_course;
function pdb_setup_course(course,callback) {
  if (current_course) {
    if (current_course._id != course._id) {
      current_course = course
      pdb_reset(function(res){
        console.log(res);
        callback("ok - swap")
      })
    } else {

      //pdb_reset(function(res){
      //  console.log(res);
        callback("ok - same")
      //})

    }
  } else {
    current_course = course;
    callback("ok - first");
  }
}



function pdb_reset(callback) {
  present_db.destroy().then(function(res) {
    present_db = new PouchDB('present');
    present_db.info(callback);
  })
}


function pdb_put_student(student,callback) {
  if ((current_course) && (student.course_key !=current_course._id)) {
    callback("wrong course");
  } else {
    present_db.put({_id: student._id, data: student}).then(function(res){
      console.log(res);
      callback("ok")
    }).catch(function(err){
      console.log(err);
      if (err.status == 409) {
        callback("duplicate")
      } else {
        callback("err")
      }
    })
  }
}

function pdb_get_stats(callback) {

}

function cdb_get_course(id, callback) {
  local_db.get(id).then(function (res) {
    console.log(res)
    callback(res)
  })
}


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
// fill select boxes
function fill_season_list() {
  var select=document.getElementById("selectSeason")
  local_db.find({
    selector: {gae_ds_kind: "Season"},
  }).then(function (result) {
    console.log(result);
    for(var i = 0; i < result.docs.length; i++) {
      s = result.docs[i]
      var el = document.createElement("option");
      el.textContent = s.name;
      el.value = s._id;
      select.appendChild(el);
    }
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}

function fill_folder_list() {
  var select=document.getElementById("selectFolder")
  local_db.find({
    selector: {gae_ds_kind: "Folder"},
  }).then(function (result) {
    console.log(result);
    for(var i = 0; i < result.docs.length; i++) {
      s = result.docs[i]
      var el = document.createElement("option");
      el.textContent = s.name;
      el.value = s._id;
      select.appendChild(el);
    }
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}

fill_season_list();
fill_folder_list();


function removeOptions(selectbox)
{
    var i;
    for(i = selectbox.options.length - 1 ; i >= 0 ; i--)
    {
        selectbox.remove(i);
    }
}

function removeLists(list_elem) {
  while( list_elem.firstChild ){
    list_elem.removeChild( list_elem.firstChild );
  }
}

function getOption(selectbox) {
  return selectbox.options[selectbox.selectedIndex].value;
}

function refill_course_list() {
  var sf = document.getElementById("selectFolder");
  var folder_key = sf.options[sf.selectedIndex].value;
  var ss = document.getElementById("selectSeason");
  var season_key = ss.options[ss.selectedIndex].value;

  select =  document.getElementById("selectCourse");
  removeOptions(select);

  local_db.find({
    selector: {gae_ds_kind: "Course", season_key: season_key, folder_key: folder_key},
  }).then(function (result) {
    console.log(result);
    for(var i = 0; i < result.docs.length; i++) {
      s = result.docs[i]
      var el = document.createElement("option");
      el.textContent = s.code;
      el.value = s._id;
      select.appendChild(el);
    }
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });


}

document.getElementById("selectFolder").addEventListener("change",refill_course_list);
document.getElementById("selectSeason").addEventListener("change",refill_course_list);


function refresh_course_lists() {
      removeLists(document.getElementById("courseList"));

}



document.getElementById("btn_set_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=getOption(document.getElementById("selectCourse"))
  cdb_get_course(course_key,function(course){
    pdb_setup_course(course,function(res){
      alert(res);
      refresh_course_lists()
    });
  });
}; 

document.getElementById("btn_add_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=getOption(document.getElementById("selectCourse"))
  cdb_get_course(course_key,function(course){
   // alert(course.code);
  });
}; 

document.getElementById("btn_add_m_course").onclick = function(ev) {
  ev.preventDefault(); 
  var course_key=getOption(document.getElementById("selectCourse"))
  cdb_get_course(course_key,function(course){
   // alert(course.code);
  });
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
  } else {
     console.log("crc is ok " + c);
  } 
  json_str = qr_unpack(data);
  return JSON.parse(json_str);
}

function qr_cmd_decode_z(val) {
  vals = val.split("\*");
  data = vals[1];
  c = crc32.str(data+"*"+vals[0]); 
  if (c != vals[2]) {
     console.log("wrong crc");
  } else {
     console.log("crc is ok " + c);
  } 
  json_str = qr_unpack(data);
  return JSON.parse(json_str);
}

const TEST_QR_VAL_C = "TS*38072*eJyrViouLcpLzE1VslJQckwBMpKVdBSUYCJeidmlSSCB4tTE4vw8kJCRgaGpvqEZRLACJJILYifnlxYVg/UYgrhlqUUgdkgwmJeZAuQYWxiYG9UCABEBHcs=*2213290619**"
const TEST_QR_VAL_C2 = "TS_CMD*eJyrVkrOLy0qTo3PTFGyUlBKTC+oSssLqvKJKMhIds+pSs7w9XFNj3JJMg6rTDYKjUz3dHa08I13qUpP91XSUYBpzkvMTQVpr4opNTBINczOSUzJAzNTFIpLgAxDU8vUlHwQw8wwOz+nOBssaalQkpiXChI1gClHMjM5PwVsphFIrCy1CMQOCTYE8SBudY4Pdg0JDVCqBQAw3T4N*685749921**"

document.getElementById("decode_input").value = TEST_QR_VAL_C2;
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

document.getElementById("decode_input").focus();

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


document.getElementById("qrcode_gid_form").onsubmit = function(ev) {
        ev.preventDefault(); 
        val = document.getElementById("gid_input").value;
        cdb_lookup(parseInt(val),cdb_show_res);
};


