import mongoose from "mongoose";
import "dotenv/config";
import connectDB from "../configurations/database.js";
import Department from "../models/department.js";
import Course from "../models/course.js";
import Faculty from "../models/faculty.js";
import Student from "../models/student.js";
import Timetable from "../models/timetable.js";
import Exam from "../models/exam.js";

async function runMigration() {
  try {
    await connectDB();
    console.log("🚀 Database connected. Starting migration...");

    const colleges = await mongoose.connection.db.collection("colleges").find({}).toArray();

    for (const college of colleges) {
      const collegeId = college._id;
      console.log(`\nProcessing College: ${college.collegeName} (${collegeId})`);

      // 1. Migrate Faculty Departments and Courses
      const faculties = await Faculty.find({ collegeId });
      for (const faculty of faculties) {
        let isUpdated = false;

        // Migrate Department
        if (faculty.department && !mongoose.Types.ObjectId.isValid(faculty.department)) {
          const deptName = faculty.department.toString();
          let deptDoc = await Department.findOne({ collegeId, name: deptName });
          if (!deptDoc) {
            deptDoc = await Department.create({ collegeId, name: deptName, code: deptName.substring(0, 5).toUpperCase() });
          }
          faculty.department = deptDoc._id;
          isUpdated = true;
        }

        // Migrate Course
        if (faculty.course && !mongoose.Types.ObjectId.isValid(faculty.course)) {
          const courseName = faculty.course.toString();
          let courseDoc = await Course.findOne({ collegeId, department: faculty.department, courseName });
          if (!courseDoc) {
            courseDoc = await Course.create({
              collegeId,
              courseName,
              courseCode: courseName.substring(0, 5).toUpperCase() + Math.floor(100 + Math.random() * 900),
              department: faculty.department,
              credits: 3,
              status: "Active"
            });
          }
          faculty.course = courseDoc._id;
          isUpdated = true;
        }

        if (isUpdated) {
          await faculty.save();
          console.log(`✅ Migrated Faculty: ${faculty.name}`);
        }
      }

      // 2. Migrate Student Departments
      const students = await Student.find({ collegeId });
      for (const student of students) {
        if (student.department && !mongoose.Types.ObjectId.isValid(student.department)) {
          const deptName = student.department.toString();
          let deptDoc = await Department.findOne({ collegeId, name: deptName });
          if (!deptDoc) {
            deptDoc = await Department.create({ collegeId, name: deptName, code: deptName.substring(0, 5).toUpperCase() });
          }
          student.department = deptDoc._id;
          await student.save();
          console.log(`✅ Migrated Student: ${student.name}`);
        }
      }

      // 3. Migrate Timetables
      const timetables = await Timetable.find({ collegeId });
      for (const timetable of timetables) {
        if (timetable.department && !mongoose.Types.ObjectId.isValid(timetable.department)) {
          const deptName = timetable.department.toString();
          let deptDoc = await Department.findOne({ collegeId, name: deptName });
          if (deptDoc) {
            timetable.department = deptDoc._id;
            await timetable.save();
            console.log(`✅ Migrated Timetable ID: ${timetable._id}`);
          }
        }
      }

      // 4. Migrate Exams
      const exams = await Exam.find({ collegeId });
      for (const exam of exams) {
        if (exam.department && !mongoose.Types.ObjectId.isValid(exam.department)) {
          const deptName = exam.department.toString();
          let deptDoc = await Department.findOne({ collegeId, name: deptName });
          if (deptDoc) {
            exam.department = deptDoc._id;
            await exam.save();
            console.log(`✅ Migrated Exam Subject: ${exam.subjectName}`);
          }
        }
      }
    }

    console.log("\n🎉 Database migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
