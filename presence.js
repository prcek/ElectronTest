

var course_list = [];
var course_hm_list = [];

var presence_list = [];


function init() {
	presence_list=[];
	course_list=[];
	course_hm_list=[];
}

function add_course(course) {
	if (find_course(course._id) != null) {
		return;
	}
	if (find_hm_course(course._id) != null) {
		del_course_hm(course._id);
	}
	course_list.push(course);
}

function add_course_hm(course) {
	if (find_course(course._id) !=null) {
		return;
	}
	if (find_hm_course(course._id)) {
		return;
	}
	course_hm_list.push(course);
}

function find_course(course_key) {
	for(var i = 0; i < course_list.length; i++) {
		if (course_list[i]._id == course_key) {
			return course_list[i];
		}
    }
    return null;
}
function find_hm_course(course_key) {
	for(var i = 0; i < course_hm_list.length; i++) {
		if (course_hm_list[i]._id == course_key) {
			return course_hm_list[i];
		}
    }
    return null;
}

function del_course_hm(course_key) {
	var p=null;
	for(var i = 0; i < course_hm_list.length; i++) {
		if (course_hm_list[i]._id == course_key) {
			p=i;
			break;
		}
    }
    if (p!=null) {
    	course_hm_list.splice(p, 1);
    }
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

	if (find_course(student.course_key)==null) {
		if (!male) {
			return {ok:false,diff:true,male:male, name:student.name}
		}
		if (find_hm_course(student.course_key)==null) {
			return {ok:false,diff:true,male:male, name:student.name}
		}
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
function get_course_lists() {
	return {courses: course_list, courses_hm: course_hm_list};
}

module.exports = {
  init: init,
  try_attend:try_attend,
  get_stats:get_stats,
  get_course_lists: get_course_lists,
  add_course: add_course,
  add_course_hm: add_course_hm
}



