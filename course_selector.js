/// COURSE SELECTOR api

var current_folder_key = "";
var current_season_key = "";
var current_course_key = "";

var local_db = null;

const ipcRenderer = require('electron').ipcRenderer


function read_state() {
	current_folder_key = ipcRenderer.sendSync('get_config', 'cs_folder_key');
	current_season_key = ipcRenderer.sendSync('get_config', 'cs_season_key');
	current_course_key = ipcRenderer.sendSync('get_config', 'cs_course_key');
}

function save_state() {
	 ipcRenderer.send("set_config","cs_folder_key",current_folder_key); 	
	 ipcRenderer.send("set_config","cs_season_key",current_season_key); 	
	 ipcRenderer.send("set_config","cs_course_key",current_course_key); 	
}


function removeOptions(selectbox)
{
    var i;
    for(i = selectbox.options.length - 1 ; i >= 0 ; i--)
    {
        selectbox.remove(i);
    }
}


function fill_season_list(ondone) {
  var select=document.getElementById("selectSeason")
  removeOptions(select);

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

    if (current_season_key != "") {
    	select.value = current_season_key;
    }

    ondone();
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}

function fill_folder_list(ondone) {
  var select=document.getElementById("selectFolder")
  removeOptions(select);

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
    if (current_folder_key != "") {
    	select.value = current_folder_key;
    }
    ondone();
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}


function fill_course_list(ondone) {

  select =  document.getElementById("selectCourse");
  removeOptions(select);
  var setit = false;
  local_db.find({
    selector: {gae_ds_kind: "Course", season_key: current_season_key, folder_key: current_folder_key},
  }).then(function (result) {
    for(var i = 0; i < result.docs.length; i++) {
      s = result.docs[i]
      var el = document.createElement("option");
      el.textContent = s.code;
      el.value = s._id;
      select.appendChild(el);
      if (s._id == current_course_key) {
      	setit = true;
      }
    }
    if (setit) {
      select.value = current_course_key;
    }
    ondone();
  }).catch(function (err) {
    alert("find err");
    console.log(err);
  });
}

function refill_course_list() {
  var sf = document.getElementById("selectFolder");
  current_folder_key = sf.options[sf.selectedIndex].value;
  var ss = document.getElementById("selectSeason");
  current_season_key = ss.options[ss.selectedIndex].value;
  save_state();
  fill_course_list(function(){});
}

function course_changed() {
  var sf = document.getElementById("selectCourse");
  current_course_key = sf.options[sf.selectedIndex].value;
  save_state();
}

function init(db) {
	local_db = db;
	read_state();	
	fill_season_list(function(){
		document.getElementById("selectSeason").addEventListener("change",refill_course_list);
	});
	fill_folder_list(function(){
		document.getElementById("selectFolder").addEventListener("change",refill_course_list);
	});
	fill_course_list(function(){
		document.getElementById("selectCourse").addEventListener("change",course_changed);
	});
}
function get_ck() {
	return current_course_key;
}

module.exports = {
  init: init,
  get_ck: get_ck,
};
