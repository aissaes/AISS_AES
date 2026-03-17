  import mongoose from "mongoose";

  /*
  Example structure in MongoDB

  sections[i] -> section
  sections[i][j] -> question inside that section

  {
    subjectName: "Data Structures",
    subjectCode: "CS301",
    semester: 3,

    sections: [

      // Section A
      [
        { text: "Define Stack", marks: 2 },
        { text: "Define Queue", marks: 2 }
      ],

      // Section B
      [
        {
          text: "Answer the following",
          marks: 10,
          choice: { total: 3, attempt: 2 }, // attempt any 2
          children: [
            { text: "Define AVL Tree", marks: 5 },
            { text: "Explain rotations", marks: 5 },
            { text: "Example insertion", marks: 5 }
          ]
        }
      ]

    ],

    sectionChoices: [
      { total: 6, attempt: 5 }, // section A rule
      { total: 3, attempt: 2 }  // section B rule
    ]
  }
  */
  const questionSchema = new mongoose.Schema({

    text: {
      type: String,
      required: true
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

  },{_id:false});
  
  //sub questions
  questionSchema.add({
  children: [questionSchema]
});


  const questionPaperSchema = new mongoose.Schema({

  

    // 2D array -> sections
    sections: [[questionSchema]],

    // section-level choice rules
    sectionChoices: [{
      total: Number,
      attempt: Number,
      compulsory: [Number],
      groups: [[Number]]
    }],

    createdAt: {
      type: Date,
      default: Date.now
    }

  });


  const QuestionPaper = mongoose.model("QuestionPaper", questionPaperSchema);

  export default QuestionPaper;