import type {Question} from './types.ts';
// Common deterministic grading boundary. Selection consumes this result;
// the diagnostic selector never compares a response with an answer key.
export function gradeChoice(question:Question,answer:number){return {correct:question.correct===answer,score:Number(question.correct===answer),gradedBy:'KEY' as const};}
