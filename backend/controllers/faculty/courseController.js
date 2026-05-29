import Course from "../../models/course.js";
import Faculty from "../../models/faculty.js";
import FacultyCourseAssignment from "../../models/facultyCourseAssignment.js";

// 1. Create Course
export const createCourse = async (req, res) => {
  try {
    const { courseCode, courseName, semesterId, credits } = req.body;
    if (!courseCode || !courseName || !semesterId) {
      return res.status(400).json({ message: "All fields are required (courseCode, courseName, semesterId)." });
    }

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can manage courses." });
    }

    // Check if course already exists
    const existing = await Course.findOne({
      collegeId: hod.collegeId,
      department: hod.department,
      courseCode,
      status: { $ne: "Archived" }
    });
    if (existing) {
      return res.status(400).json({ message: `Course with code ${courseCode} already exists in your department.` });
    }

    const newCourse = new Course({
      collegeId: hod.collegeId,
      courseCode,
      courseName,
      department: hod.department,
      semester: semesterId,
      credits: credits ? Number(credits) : 3,
      status: "Active"
    });

    await newCourse.save();
    res.status(201).json({ message: "Course created successfully.", course: newCourse });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 2. Get Courses
export const getCourses = async (req, res) => {
  try {
    const user = await Faculty.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const query = { collegeId: user.collegeId };
    if (user.role !== "collegeAdmin") {
      query.department = user.department;
    }
    if (req.query.includeArchived !== "true") {
      query.status = { $ne: "Archived" };
    }
    if (req.query.semester) {
      query.semester = req.query.semester;
    }

    const courses = await Course.find(query)
      .populate("semester", "semesterNumber semesterName academicYear status")
      .sort({ courseCode: 1 });

    // Fetch faculty assignments for these courses
    const courseIds = courses.map(c => c._id);
    const assignments = await FacultyCourseAssignment.find({
      course: { $in: courseIds },
      status: "Active"
    }).populate("faculty", "name email");

    const assignmentMap = {};
    assignments.forEach(asg => {
      assignmentMap[asg.course.toString()] = asg.faculty;
    });

    const coursesWithFaculty = courses.map(c => {
      const courseObj = c.toObject();
      courseObj.assignedFaculty = assignmentMap[c._id.toString()] || null;
      return courseObj;
    });

    res.status(200).json({ courses: coursesWithFaculty });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 3. Update Course
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseName, credits, status } = req.body;

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can update courses." });
    }

    const courseDoc = await Course.findOne({ _id: id, collegeId: hod.collegeId, department: hod.department });
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found." });
    }

    if (courseName) courseDoc.courseName = courseName;
    if (credits) courseDoc.credits = Number(credits);
    if (status) courseDoc.status = status;

    await courseDoc.save();
    res.status(200).json({ message: "Course updated successfully.", course: courseDoc });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 4. Archive Course
export const archiveCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can archive courses." });
    }

    const courseDoc = await Course.findOne({ _id: id, collegeId: hod.collegeId, department: hod.department });
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found." });
    }

    courseDoc.status = "Archived";
    await courseDoc.save();

    res.status(200).json({ message: "Course archived successfully.", course: courseDoc });
  } catch (error) {
    console.error("Error archiving course:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 5. Assign Faculty to Course
export const assignFacultyToCourse = async (req, res) => {
  try {
    const { courseId, facultyId, academicYear } = req.body;
    if (!courseId || !facultyId || !academicYear) {
      return res.status(400).json({ message: "All fields are required (courseId, facultyId, academicYear)." });
    }

    const hod = await Faculty.findById(req.user.id);
    if (!hod || hod.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can assign faculty to courses." });
    }

    // Ensure the course exists and belongs to the HOD's department/college
    const courseDoc = await Course.findOne({ _id: courseId, collegeId: hod.collegeId, department: hod.department });
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found or belongs to another department." });
    }

    // Ensure the faculty exists and belongs to the HOD's department/college
    const facultyDoc = await Faculty.findOne({ _id: facultyId, collegeId: hod.collegeId, department: hod.department });
    if (!facultyDoc) {
      return res.status(404).json({ message: "Faculty member not found or belongs to another department." });
    }

    // Deactivate previous active assignments for this course
    await FacultyCourseAssignment.updateMany(
      { course: courseId, status: "Active" },
      { status: "Inactive" }
    );

    // Create or update the assignment
    const assignment = await FacultyCourseAssignment.findOneAndUpdate(
      { faculty: facultyId, course: courseId },
      { academicYear, status: "Active" },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: `Successfully assigned ${facultyDoc.name} to ${courseDoc.courseName}.`, assignment });
  } catch (error) {
    console.error("Error assigning faculty to course:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 6. Get Faculty Assignments
export const getFacultyAssignments = async (req, res) => {
  try {
    const user = await Faculty.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const query = {};
    if (user.role !== "collegeAdmin") {
      const courses = await Course.find({ collegeId: user.collegeId, department: user.department });
      query.course = { $in: courses.map(c => c._id) };
    }

    const assignments = await FacultyCourseAssignment.find(query)
      .populate("faculty", "name email department")
      .populate({
        path: "course",
        populate: { path: "semester", select: "semesterNumber semesterName" }
      });

    res.status(200).json({ assignments });
  } catch (error) {
    console.error("Error fetching faculty assignments:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
