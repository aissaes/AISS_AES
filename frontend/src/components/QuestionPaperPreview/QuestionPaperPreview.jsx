import React from 'react';
import styles from './QuestionPaperPreview.module.css';

const QuestionPaperPreview = ({ paper }) => {
  if (!paper) return <div className={styles.loading}>Loading paper...</div>;

  return (
    <div className={styles.previewContainer}>
      {/* General Instructions */}
      {paper.instructions?.length > 0 && (
        <div className={styles.instructionsBox}>
          <h5 className={styles.instructionsTitle}>General Instructions</h5>
          <ol className={styles.instructionsList}>
            {paper.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Sections */}
      <div className={styles.sectionsContainer}>
        {paper.sections?.map((section, sIdx) => {
          const secRule = paper.sectionChoices?.[sIdx];

          return (
            <div key={sIdx} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h5 className={styles.sectionTitle}>
                  Section {String.fromCharCode(65 + sIdx)}
                  <span className={styles.questionCountBadge}>
                    {section.length} main question{section.length !== 1 ? 's' : ''}
                  </span>
                </h5>

                {secRule && (secRule.total > 0 || secRule.attempt > 0) && (
                  <div className={styles.ruleDisplay}>
                    <span className={styles.ruleMain}>Rule: Attempt {secRule.attempt} out of {secRule.total}</span>
                    {secRule.compulsory?.length > 0 && (
                      <span className={styles.ruleCompulsory}>Compulsory: {secRule.compulsory.map(idx => `Q${idx + 1}`).join(', ')}</span>
                    )}
                    {secRule.groups?.length > 0 && (
                      <span className={styles.ruleChoice}>Choices: {secRule.groups.map(g => g.map(idx => `Q${idx + 1}`).join(' OR ')).join(' | ')}</span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.questionsList}>
                {section.map((q, qIdx) => {
                  const renderQuestion = (question, indexLabel, isSub = false) => {
                    const isCompulsorySub = isSub && q.choice?.compulsory?.includes(indexLabel.charCodeAt(0) - 97);

                    return (
                      <div key={indexLabel} className={`${styles.questionWrapper} ${isSub ? styles.subQuestionWrapper : ''}`}>
                        <div className={`${styles.questionContent} ${isCompulsorySub ? styles.isCompulsory : ''} ${isSub ? styles.isSubContent : ''}`}>
                          <span className={`${styles.questionLabel} ${isCompulsorySub ? styles.compulsoryLabel : ''}`}>
                            {indexLabel}
                          </span>

                          <div className={styles.questionTextCol}>
                            <p className={styles.questionText}>{question.text}</p>
                            {question.imageUrl && (
                              <img src={question.imageUrl} alt="Figure" className={styles.questionImage} />
                            )}

                            {question.choice && (question.choice.total > 0 || question.choice.attempt > 0) && (
                              <div className={styles.subRuleBox}>
                                ↳ Attempt {question.choice.attempt} out of {question.choice.total} sub-questions below.
                                {question.choice.compulsory?.length > 0 && ` (Compulsory: ${question.choice.compulsory.map(idx => String.fromCharCode(97 + idx)).join(', ')})`}
                                {question.choice.groups?.length > 0 && (
                                  <span className={styles.subRuleChoice}>
                                    Choices: {question.choice.groups.map(g => g.map(idx => String.fromCharCode(97 + idx)).join(' OR ')).join(' | ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <span className={styles.marksBadge}>{question.marks}M</span>
                        </div>

                        {question.children && question.children.length > 0 && (
                          <div className={styles.childrenWrapper}>
                            {question.children.map((child, cIdx) => 
                              renderQuestion(child, `${String.fromCharCode(97 + cIdx)})`, true)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return renderQuestion(q, `${qIdx + 1}.`);
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback if rejected */}
      {paper.feedback && (
        <div className={styles.feedbackBox}>
          <h5 className={styles.feedbackTitle}>Previous Feedback</h5>
          <p className={styles.feedbackText}>{paper.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionPaperPreview;
