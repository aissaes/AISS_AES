import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/student.js";
import connectDB from "./configurations/database.js";

dotenv.config();

const migrateStudents = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully. Starting student schema migration...");

    // Fetch all students using lean() to get raw database documents bypassing standard schema definition
    const students = await Student.find({}).lean();
    console.log(`Found ${students.length} student records in the database.`);

    let updatedCount = 0;

    for (const studentData of students) {
      let needsUpdate = false;
      const setFields = {};
      const unsetFields = {};

      // Initialize plural arrays if they don't exist
      let departments = Array.isArray(studentData.departments) ? [...studentData.departments] : [];
      let courses = Array.isArray(studentData.courses) ? [...studentData.courses] : [];

      // 1. Check singular 'department' field
      if (studentData.department && typeof studentData.department === "string") {
        const trimmedDept = studentData.department.trim();
        if (trimmedDept && !departments.includes(trimmedDept)) {
          departments.push(trimmedDept);
        }
        needsUpdate = true;
        unsetFields.department = "";
      }

      // 2. Check singular 'course' field
      if (studentData.course && typeof studentData.course === "string") {
        const trimmedCourse = studentData.course.trim();
        if (trimmedCourse && !courses.includes(trimmedCourse)) {
          courses.push(trimmedCourse);
        }
        needsUpdate = true;
        unsetFields.course = "";
      }

      // Ensure arrays are deduplicated and non-empty
      const cleanDepts = [...new Set(departments.map(d => d && d.trim()).filter(Boolean))];
      const cleanCourses = [...new Set(courses.map(c => c && c.trim()).filter(Boolean))];

      // If array contents have changed relative to what was in the database, we flag it for update
      const deptsChanged = JSON.stringify(cleanDepts) !== JSON.stringify(studentData.departments || []);
      const coursesChanged = JSON.stringify(cleanCourses) !== JSON.stringify(studentData.courses || []);

      if (needsUpdate || deptsChanged || coursesChanged) {
        setFields.departments = cleanDepts;
        setFields.courses = cleanCourses;

        const updatePayload = {};
        if (Object.keys(setFields).length > 0) {
          updatePayload.$set = setFields;
        }
        if (Object.keys(unsetFields).length > 0) {
          updatePayload.$unset = unsetFields;
        }

        await Student.updateOne({ _id: studentData._id }, updatePayload);
        console.log(`Migrated student [${studentData.name}] (${studentData.email}):`);
        if (Object.keys(setFields).length > 0) console.log(`  -> $set:`, setFields);
        if (Object.keys(unsetFields).length > 0) console.log(`  -> $unset:`, unsetFields);
        updatedCount++;
      }
    }

    console.log(`\nMigration completed! Successfully updated ${updatedCount} student records.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed with error:", error);
    process.exit(1);
  }
};

migrateStudents();
