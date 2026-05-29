import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import OverallAdmin from "../models/overallAdmin.js";
import College from "../models/college.js";
import Faculty from "../models/faculty.js";
import Student from "../models/student.js";
import Department from "../models/department.js";
import Semester from "../models/semester.js";
import Course from "../models/course.js";
import StudentCourseEnrollment from "../models/studentCourseEnrollment.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/aissaes";

const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!");

    console.log("Clearing existing data...");
    await OverallAdmin.deleteMany({});
    await College.deleteMany({});
    await Faculty.deleteMany({});
    await Student.deleteMany({});
    await Department.deleteMany({});
    await Semester.deleteMany({});
    await Course.deleteMany({});
    await StudentCourseEnrollment.deleteMany({});

    // 1. Create Overall Admin
    console.log("Creating Overall Admin...");
    const hashedAdminPass = await bcrypt.hash("masteradmin123", 10);
    const overallAdmin = await OverallAdmin.create({
      name: "Master Admin",
      email: "admin@aiss.com",
      password: hashedAdminPass
    });

    // 2. Create College
    console.log("Creating College...");
    const newCollege = await College.create({
      collegeName: "AISS University",
      location: "Silicon Valley",
      departments: [], 
      status: "Approved"
    });

    // 3. Create Departments
    console.log("Creating Departments...");
    const adminDept = await Department.create({ collegeId: newCollege._id, name: "Administration", code: "ADMIN" });
    const cseDept = await Department.create({ collegeId: newCollege._id, name: "Computer Science", code: "CSE" });
    const eceDept = await Department.create({ collegeId: newCollege._id, name: "Electronics", code: "ECE" });
    const mechDept = await Department.create({ collegeId: newCollege._id, name: "Mechanical", code: "MECH" });

    // Link departments to college
    newCollege.departments = [adminDept._id, cseDept._id, eceDept._id, mechDept._id];
    await newCollege.save();

    // 4. Create College Admin
    console.log("Creating College Admin...");
    const hashedCAPass = await bcrypt.hash("collegeadmin123", 10);
    const collegeAdmin = await Faculty.create({
      name: "College Principal",
      email: "principal@aiss.edu",
      password: hashedCAPass,
      collegeId: newCollege._id,
      department: adminDept._id,
      phone: "1234567890",
      role: "collegeAdmin",
      isApproved: true
    });
    newCollege.collegeAdminId = collegeAdmin._id;
    await newCollege.save();

    // 5. Create HODs
    console.log("Creating HODs...");
    const hashedHodPass = await bcrypt.hash("hod123", 10);
    const cseHod = await Faculty.create({
      name: "Dr. Alan Turing",
      email: "alan@cse.aiss.edu",
      password: hashedHodPass,
      collegeId: newCollege._id,
      department: cseDept._id,
      phone: "1112223334",
      role: "hod",
      isApproved: true
    });

    // 6. Create Semesters
    console.log("Creating Semesters...");
    const cseSem5 = await Semester.create({
      collegeId: newCollege._id,
      department: cseDept._id,
      semesterNumber: 5,
      semesterName: "Semester 5",
      academicYear: "2025-26",
      status: "Active"
    });

    // 7. Create Courses
    console.log("Creating Courses...");
    const courseOS = await Course.create({
      collegeId: newCollege._id,
      courseCode: "CS301",
      courseName: "Operating Systems",
      department: cseDept._id,
      semester: cseSem5._id,
      credits: 4,
      status: "Active"
    });
    
    const courseDBMS = await Course.create({
      collegeId: newCollege._id,
      courseCode: "CS302",
      courseName: "Database Management Systems",
      department: cseDept._id,
      semester: cseSem5._id,
      credits: 4,
      status: "Active"
    });

    // 8. Create Student
    console.log("Creating Students...");
    const hashedStudentPass = await bcrypt.hash("student123", 10);
    const student = await Student.create({
      name: "Karthik",
      rollNumber: "2025CSE001",
      email: "karthik@student.aiss.edu",
      password: hashedStudentPass,
      collegeId: newCollege._id,
      department: cseDept._id,
      semester: cseSem5._id,
      cgpa: 9.5
    });

    // 9. Create Enrollments
    console.log("Creating Enrollments...");
    await StudentCourseEnrollment.create([
      { student: student._id, course: courseOS._id, semester: cseSem5._id, academicYear: "2025-26", status: "Enrolled" },
      { student: student._id, course: courseDBMS._id, semester: cseSem5._id, academicYear: "2025-26", status: "Enrolled" }
    ]);

    console.log("Seeding complete! You can now log in with:");
    console.log("Master Admin: admin@aiss.com / masteradmin123");
    console.log("College Admin: principal@aiss.edu / collegeadmin123");
    console.log("CSE HOD: alan@cse.aiss.edu / hod123");
    console.log("Student: karthik@student.aiss.edu / student123");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
