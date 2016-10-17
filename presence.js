

var course_list = [];
var course_hm_list = [];

var presence_list = [];


function init() {
	presence_list=[];
	course_list=[];
	course_hm_list=[];
}

function add_course(course) {
	course_list.push(course);
}

function add_course_mh(course) {
	course_hm_list.push(course);
}

function find_course(course_key) {
	for(var i = 0; i < course_list.length; i++) {
		if (course_list[i]._id = course_key) {
			return course_list[i];
		}
    }
    return null;
}
function find_mh_course(course_key) {
	for(var i = 0; i < course_mh_list.length; i++) {
		if (course_mh_list[i]._id = course_key) {
			return course_mh_list[i];
		}
    }
    return null;
}
function find_in_presence_list(student_key) {
	for (var i=0; i<presence_list.length; i++) {
		if (presence_list[i].student._id == student_key) {
			return presence_list[i];
		}
	}
	return null;
}

function try_attend(student) {
	if (r=find_in_presence_list(student._id)){
		return {ok:false,dupl:true,dupl_time:r.time,male:r.male,name:student.name};
	}
	var male = false;
	if (student.addressing=="p") {
		male = true;
	}
	presence_list.push({student:student,male:male,time:Date.now()});
	return {ok:true,rs:"",male:male,name:student.name};
}

function get_stats() {
	var m =0;
	for (var i=0; i<presence_list.length; i++) {
		if (presence_list[i].male) { m++;}
	}

	return {'total':presence_list.length,'m':m,'f':presence_list.length-m};
}


module.exports = {
  init: init,
  try_attend:try_attend,
  get_stats:get_stats
}



