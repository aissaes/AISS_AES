import express from "express";

import Exam from "../models/exam.js";

export const getExamByIdByToken = async (req, res) => {
  try {
    const { token } = req.body;

    // 1. Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // 2. Find exam using token
    const exam = await Exam.findOne({ token });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // 3. Optional: check if exam is active (recommended)
    if (exam.startTime && Date.now() < new Date(exam.startTime)) {
      return res.status(403).json({
        success: false,
        message: "Exam has not started yet",
      });
    }

    if (exam.endTime && Date.now() > new Date(exam.endTime)) {
      return res.status(403).json({
        success: false,
        message: "Exam has ended",
      });
    }

    // 4. Return exam details
    return res.status(200).json({
      success: true,
      message:exam
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

