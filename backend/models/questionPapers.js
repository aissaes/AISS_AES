import mongoose from "mongoose";

/*
Example structure in MongoDB

sections[i] -> section
sections[i][j] -> question inside that section

{
  "examId": "665f1a...",
  "collegeId": "665c2b...",
  "createdBy": "665d3c...",
  "status": "Pending",
  
  "sections": [

    // Section A
    [
      { "text": "Define Stack", "marks": 2, "imageUrl": null },
      { "text": "Define Queue", "marks": 2, "imageUrl": null }
    ],

    // Section B
    [
      {
        "text": "Answer the following",
        "marks": 10,
        "imageUrl": "https://example.com/tree-diagram.png",
        "choice": { "total": 3, "attempt": 2 }, // attempt any 2
        "children": [
          { "text": "Define AVL Tree", "marks": 5, "imageUrl": null },
          { "text": "Explain rotations", "marks": 5, "imageUrl": null },
          { "text": "Example insertion", "marks": 5, "imageUrl": null }
        ]
      }
    ]

  ],

  "sectionChoices": [
    { "total": 6, "attempt": 5 }, // section A rule
    { "total": 3, "attempt": 2 }  // section B rule
  ]
}
*/
const questionSchema = new mongoose.Schema({

  text: {
    type: String,
    required: true
  },

  imageUrl: {
    type: String,
    default: null
  },

  marks: {
    type: Number,
    required: true
  },

  choice: {
    total: Number,
    attempt: Number,
    compulsory: [Number],
    groups: [[Number]]
  }

}, { _id: false });

//sub questions
questionSchema.add({
  children: [questionSchema]
});


const questionPaperSchema = new mongoose.Schema({


  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    index: true // Quickly find the paper for a specific exam
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true
  },
  
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
    index: true
  },
  
  instructions: [{
    type: String
  }],
  
  // 2D array -> sections
  sections: [[questionSchema]],

  // section-level choice rules
  sectionChoices: [{
    total: Number,
    attempt: Number,
    compulsory: [Number],
    groups: [[Number]]
  }],

  // --- HOD APPROVAL SYSTEM ---
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending" // All new papers start as pending
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    default: null
  },
  
  feedback: {
    type: String,
    default: "" // HOD can leave a note like "Fix question 3"
  }

}, { timestamps: true }); // Automatically handles createdAt and updatedAt


const QuestionPaper = mongoose.model("QuestionPaper", questionPaperSchema);

export default QuestionPaper;