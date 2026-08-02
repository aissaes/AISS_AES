import Student from "../models/student.js";
import Exam from "../models/exam.js";
import Upload from "../models/uploadSession.js";
import Answers from "../models/answer.js";
import StudentCourseEnrollment from "../models/studentCourseEnrollment.js";
import Result from "../models/result.js";

export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id; // Securely pulled from student token

    // 1. Fetch Student Profile
    const student = await Student.findById(studentId).populate("semester");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const { collegeId, semester } = student;

    // 2. Fetch Course Enrollments (with course credits)
    const enrollments = await StudentCourseEnrollment.find({ student: studentId }, "course")
      .populate("course", "credits")
      .exec();

    const crs = enrollments.map(e => e.course?._id).filter(id => id != null);

    // Return empty dashboard structure if student has no enrollments
    if (crs.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          priorityCard: {
            type: "overview",
            data: {
              semesterName: student.semester?.semesterName || "N/A",
              coursesCount: 0,
              totalCredits: 0,
              totalExams: 0,
              completedExams: 0
            }
          },
          semesterSnapshot: {
            semesterName: student.semester?.semesterName || "N/A",
            coursesCount: 0,
            totalCredits: 0,
            upcomingExams: 0,
            completedExams: 0
          },
          latestResult: null,
          recentActivity: []
        }
      });
    }

    const now = new Date();

    // 3. Fetch all related collections in parallel with projections
    const [exams, submissions, results, uploadSessions] = await Promise.all([
      // Fetch all exams for these enrolled courses (projecting necessary fields)
      Exam.find(
        { collegeId, courseId: { $in: crs } },
        "subjectName subjectCode examType startTime endTime maxMarks resultsPublished"
      ).exec(),
      // Fetch answer script submissions (only projecting ID and for_exam)
      Answers.find({ uploaded_student: studentId }, "for_exam").exec(),
      // Fetch results published/evaluated (projecting totalMarksObtained, evaluations, and exam)
      Result.find({ student: studentId }, "exam totalMarksObtained evaluations updatedAt")
        .populate("exam", "subjectName subjectCode examType maxMarks resultsPublished")
        .exec(),
      // Fetch upload active sessions (projecting exam)
      Upload.find({ student: studentId }, "exam")
        .populate("exam", "subjectCode")
        .exec()
    ]);

    const submittedExamIds = new Set(submissions.map(s => s.for_exam.toString()));
    const resultExamIds = new Set(results.map(r => r.exam?._id.toString()));
    const completedExamIds = new Set([...submittedExamIds, ...resultExamIds]);

    // 4. Compute states for Smart Priority Card
    let liveExam = null;
    let upcomingExam = null;
    const upcomingThreshold = 24 * 60 * 60 * 1000; // 24 Hours

    // Filter exams to find active live one or closest upcoming one
    exams.forEach(exam => {
      const startTime = new Date(exam.startTime);
      const endTime = new Date(exam.endTime);

      if (now >= startTime && now <= endTime && !completedExamIds.has(exam._id.toString())) {
        if (!liveExam || endTime < new Date(liveExam.endTime)) {
          liveExam = exam;
        }
      } else if (startTime > now && !completedExamIds.has(exam._id.toString())) {
        if (!upcomingExam || startTime < new Date(upcomingExam.startTime)) {
          upcomingExam = exam;
        }
      }
    });

    let priorityCard = { type: "overview", data: {} };

    if (liveExam) {
      const remainingMs = new Date(liveExam.endTime) - now;
      priorityCard = {
        type: "live_exam",
        data: {
          examId: liveExam._id,
          subjectName: liveExam.subjectName,
          subjectCode: liveExam.subjectCode,
          examType: liveExam.examType,
          startTime: liveExam.startTime,
          endTime: liveExam.endTime,
          remainingMinutes: Math.max(0, Math.round(remainingMs / 60000))
        }
      };
    } else if (upcomingExam && (new Date(upcomingExam.startTime) - now) <= upcomingThreshold) {
      const startsInMs = new Date(upcomingExam.startTime) - now;
      priorityCard = {
        type: "upcoming_exam",
        data: {
          examId: upcomingExam._id,
          subjectName: upcomingExam.subjectName,
          subjectCode: upcomingExam.subjectCode,
          examType: upcomingExam.examType,
          startTime: upcomingExam.startTime,
          startsInHours: Math.max(0, Math.round(startsInMs / 3600000))
        }
      };
    } else {
      // Find latest result published in the last 7 days for the priority hero slot
      const publishedResults = results.filter(r => r.exam && r.exam.resultsPublished === true);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newResults = publishedResults.filter(r => new Date(r.updatedAt) >= sevenDaysAgo);

      if (newResults.length > 0) {
        newResults.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const newest = newResults[0];
        const maxMarks = newest.exam.maxMarks || 100;

        priorityCard = {
          type: "result",
          data: {
            examId: newest.exam._id,
            subjectName: newest.exam.subjectName,
            subjectCode: newest.exam.subjectCode,
            examType: newest.exam.examType,
            marksObtained: newest.totalMarksObtained,
            maxMarks: maxMarks
          }
        };
      } else {
        // Fallback: Default Semester Overview details
        const totalCredits = enrollments.reduce((sum, e) => sum + (e.course?.credits || 0), 0);
        priorityCard = {
          type: "overview",
          data: {
            semesterName: student.semester?.semesterName || `Semester ${semester}`,
            coursesCount: crs.length,
            totalCredits: totalCredits,
            totalExams: exams.length,
            completedExams: exams.filter(e => completedExamIds.has(e._id.toString())).length
          }
        };
      }
    }

    // 5. Compute Semester Snapshot
    const totalCredits = enrollments.reduce((sum, e) => sum + (e.course?.credits || 0), 0);
    const completedExamsCount = exams.filter(e => completedExamIds.has(e._id.toString())).length;
    const upcomingExamsCount = exams.filter(e => new Date(e.startTime) > now && !completedExamIds.has(e._id.toString())).length;

    const semesterSnapshot = {
      semesterName: student.semester?.semesterName || `Semester ${semester}`,
      coursesCount: crs.length,
      totalCredits: totalCredits,
      upcomingExams: upcomingExamsCount,
      completedExams: completedExamsCount
    };

    // 6. Compute Latest Result Preview (unrestricted by the 7-day window)
    const publishedResults = results.filter(r => r.exam && r.exam.resultsPublished === true);
    publishedResults.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    let latestResult = null;
    if (publishedResults.length > 0) {
      const newest = publishedResults[0];
      const maxMarks = newest.exam.maxMarks || 100;

      latestResult = {
        examId: newest.exam._id,
        subjectName: newest.exam.subjectName,
        subjectCode: newest.exam.subjectCode,
        marksObtained: newest.totalMarksObtained,
        maxMarks: maxMarks
      };
    }

    // 7. Synthesize Recent Activities Timeline
    const recentActivity = [];

    // Submissions
    submissions.forEach(sub => {
      const examDetail = exams.find(e => e._id.toString() === sub.for_exam.toString());
      if (examDetail) {
        recentActivity.push({
          id: `sub_${sub._id}`,
          title: `${examDetail.subjectCode} Script Submitted`,
          timestamp: sub._id.getTimestamp(),
          type: "submission"
        });
      }
    });

    // Results & Feedback
    publishedResults.forEach(res => {
      if (res.exam) {
        recentActivity.push({
          id: `res_${res._id}`,
          title: `${res.exam.subjectCode} Result Published`,
          timestamp: res.updatedAt,
          type: "result"
        });

        const hasFeedback = res.evaluations && res.evaluations.some(e => e.aiFeedback || e.overrideReason);
        if (hasFeedback) {
          recentActivity.push({
            id: `fb_${res._id}`,
            title: `Faculty Feedback Added for ${res.exam.subjectCode}`,
            timestamp: new Date(new Date(res.updatedAt).getTime() + 1000), // slightly offset
            type: "feedback"
          });
        }
      }
    });

    // Active upload session tokens
    uploadSessions.forEach(session => {
      if (session.exam) {
        recentActivity.push({
          id: `tok_${session._id}`,
          title: `Exam Token Activated (${session.exam.subjectCode})`,
          timestamp: session._id.getTimestamp(),
          type: "token"
        });
      }
    });



    // Sort and slice
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivity = recentActivity.slice(0, 5);

    // 8. Return response
    return res.status(200).json({
      success: true,
      data: {
        priorityCard,
        semesterSnapshot,
        latestResult,
        recentActivity: limitedActivity
      }
    });

  } catch (error) {
    console.error("Error fetching aggregated student dashboard:", error);
    return res.status(500).json({ success: false, message: "Server error aggregating dashboard." });
  }
};
