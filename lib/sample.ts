import type { Campus, Course, Question, Topic, Difficulty } from './types.ts';
const addDays=(date:Date,n:number)=>new Date(date.getTime()+n*86400000).toISOString().slice(0,10);
type Q=[string,string[],number,Difficulty,string];
const bank=(topicId:string,items:Q[]):Question[]=>items.map((q,i)=>({id:`${topicId}-q${i}`,topicId,prompt:q[0],choices:q[1],correct:q[2],difficulty:q[3],explanation:q[4]}));
const topic=(id:string,title:string,notes:string,prerequisites:string[]=[]):Topic=>({id,title,notes,prerequisites,hours:2,weight:50,coverage:'COVERED',pin:false});
export function sampleCampus(name:string,now=new Date()):Campus{
 const values=topic('values','Variables & expressions','Variables store values that can be used by a program. In Python, x = 3 assigns the integer 3 to x. The expression x + 2 evaluates to 5. Assignment updates the stored value; it is not an equality test.\n\nPython uses ** for exponentiation and % for the remainder. Integer floor division // rounds down. Thus 7 // 2 is 3 and 7 % 2 is 1. Operators * and / take precedence over + and -. Parentheses change the order of evaluation.\n\nLists contain an ordered sequence of values. Python list indexing starts at zero. For a = [10, 20, 30], a[0] is 10, a[-1] is 30 and len(a) is 3. Slicing a[1:3] returns [20, 30]; the stop index is excluded.');
 const loops=topic('loops','Loops & iteration','A for loop repeats an action for each item in a sequence. range(3) produces 0, 1, 2. range(start, stop) excludes stop. A loop over range(1, 4) visits 1, 2, 3.\n\nA while loop repeats while a condition is true. Update its control variable so the condition can eventually become false. break exits the closest enclosing loop; continue skips the remainder of the current iteration.\n\nAn accumulator combines values across iterations. Starting total = 0 and adding each value in [2, 4, 6] yields 12. Nested loops multiply iteration counts: three outer iterations and two inner iterations execute the inner body six times.',['values']);
 const vectors=topic('vectors','Vectors & dot products','A vector is an ordered collection of components. Vector addition combines corresponding components: (1, 2) + (3, 4) = (4, 6). Scalar multiplication multiplies every component: 2(1, 3) = (2, 6).\n\nThe dot product of two vectors sums the products of corresponding components. For a = (a1, a2) and b = (b1, b2), a · b = a1b1 + a2b2. The dot product of (1, 2) and (3, 4) is 11. Nonzero vectors are perpendicular when their dot product is zero.\n\nThe Euclidean length of (x, y) is sqrt(x² + y²). A unit vector has length one. The length of (3, 4) is 5. Dividing a nonzero vector by its length produces a unit vector in the same direction.');
 const matrices=topic('matrices','Matrices & determinants','A matrix is a rectangular array of numbers. A matrix with two rows and three columns has size 2 × 3. Addition requires matrices with matching dimensions and adds corresponding entries.\n\nFor a 2 × 2 matrix [[a, b], [c, d]], determinant = ad − bc. A square matrix is invertible exactly when its determinant is nonzero. The 2 × 2 identity matrix is [[1, 0], [0, 1]].\n\nMatrix multiplication A × B is defined when the number of columns of A equals the number of rows of B. Each output entry is the dot product of a row of A and a column of B. Multiplying a 2 × 3 matrix by a 3 × 4 matrix gives a 2 × 4 matrix. Matrix multiplication is generally not commutative.',['vectors']);
 const vb:Q[]=[
 ['What is the value of x after x = 3?', ['0','3','x','6'],1,'easy','Assignment stores 3 in x.'],
 ['What is the first index in a Python list?', ['1','−1','0','2'],2,'easy','Python list indexing starts at zero.'],
 ['Which operator gives the remainder?', ['%','//','**','=='],0,'easy','The % operator returns the remainder.'],
 ['If x = 4, what does x * 2 + 1 evaluate to?', ['12','9','10','7'],1,'medium','Multiplication occurs first: 8 + 1 = 9.'],
 ['For a = [10, 20, 30], what is a[-1]?', ['10','20','30','An error'],2,'medium','Index −1 selects the last element.'],
 ['What is 7 // 2?', ['3.5','4','1','3'],3,'medium','Floor division of positive integers gives 3.'],
 ['What does 2 + 3 * 4 ** 2 evaluate to?', ['80','50','196','32'],1,'hard','Exponentiation first: 16; multiplication: 48; addition: 50.'],
 ['For a = [10, 20, 30, 40], what is a[1:3]?', ['[10, 20]','[20, 30]','[20, 30, 40]','[30, 40]'],1,'hard','The slice includes index 1 and excludes index 3.'],
 ['After x = 5; x = x + 2; x = x * 3, what is x?', ['15','17','21','30'],2,'hard','The value becomes 7, then 21.']
 ];
 const lb:Q[]=[
 ['How many values does range(3) produce?', ['2','3','4','0'],1,'easy','The values are 0, 1 and 2.'],
 ['Which statement exits the nearest loop?', ['continue','pass','break','return to loop'],2,'easy','break exits the enclosing loop.'],
 ['A while loop repeats while its condition is…', ['False','True','Missing','A list'],1,'easy','The condition is tested before each iteration.'],
 ['What is the sum of the values in range(1, 4)?', ['10','4','6','3'],2,'medium','range(1, 4) yields 1, 2, 3; their sum is 6.'],
 ['What does continue do?', ['Exits the program','Restarts all loops','Skips the rest of this iteration','Makes the condition false'],2,'medium','Execution proceeds to the next iteration.'],
 ['Starting total = 0, add each value in [2, 4, 6]. What is total?', ['6','8','10','12'],3,'medium','2 + 4 + 6 = 12.'],
 ['A loop runs 3 times; inside it, a loop runs 2 times. How often does the inner body execute?', ['2','3','5','6'],3,'hard','Each of three outer iterations has two inner iterations.'],
 ['What is the sum of even values in range(1, 6)?', ['6','9','12','15'],0,'hard','The even values are 2 and 4; their sum is 6.'],
 ['x starts at 1. While x < 10, set x = x * 2. What is its final value?', ['8','10','16','32'],2,'hard','Values are 1 → 2 → 4 → 8 → 16; then the condition is false.']
 ];
 const veb:Q[]=[
 ['What is (1, 2) + (3, 4)?', ['(3, 8)','(4, 6)','(2, 2)','(1, 4)'],1,'easy','Add corresponding components.'],
 ['What is 2(1, 3)?', ['(2, 6)','(1, 6)','(3, 5)','(2, 3)'],0,'easy','Multiply each component by 2.'],
 ['A unit vector has length…', ['0','1','2','Any positive value'],1,'easy','Unit means length one.'],
 ['What is the dot product (1, 2) · (3, 4)?', ['7','10','11','14'],2,'medium','1 × 3 + 2 × 4 = 11.'],
 ['What is the length of (3, 4)?', ['3','4','5','7'],2,'medium','sqrt(9 + 16) = 5.'],
 ['Nonzero perpendicular vectors have dot product…', ['1','−1','Their length','0'],3,'medium','A zero dot product establishes perpendicularity.'],
 ['Which is a unit vector in the direction of (3, 4)?', ['(3/5, 4/5)','(3/4, 1)','(1, 1)','(5/3, 5/4)'],0,'hard','Divide both components by the length 5.'],
 ['Which vector is perpendicular to (2, 3)?', ['(2, 3)','(3, −2)','(3, 2)','(1, 1)'],1,'hard','2 × 3 + 3 × (−2) = 0.'],
 ['What is (1, 2, 3) · (4, 0, −1)?', ['1','3','7','−1'],0,'hard','4 + 0 − 3 = 1.']
 ];
 const mb:Q[]=[
 ['A matrix with two rows and three columns has size…', ['3 × 2','2 × 3','2 × 2','3 × 3'],1,'easy','Matrix size is rows × columns.'],
 ['Which is the 2 × 2 identity matrix?', ['[[0,1],[1,0]]','[[1,1],[1,1]]','[[1,0],[0,1]]','[[0,0],[0,0]]'],2,'easy','Identity has ones on the main diagonal and zeros elsewhere.'],
 ['When can two matrices be added?', ['Always','Only if square','Only if invertible','When dimensions match'],3,'easy','Add corresponding entries in equal-sized arrays.'],
 ['What is det([[1, 2], [3, 4]])?', ['10','−2','2','−10'],1,'medium','ad − bc = 4 − 6 = −2.'],
 ['A square matrix is invertible when its determinant is…', ['Zero','One only','Nonzero','Negative only'],2,'medium','Any nonzero determinant establishes invertibility.'],
 ['A 2 × 3 matrix times a 3 × 4 matrix produces…', ['2 × 4','3 × 3','4 × 2','2 × 3'],0,'medium','Inner dimensions match; the result uses outer dimensions.'],
 ['What is det([[2, 1], [4, 2]])?', ['8','4','2','0'],3,'hard','2 × 2 − 1 × 4 = 0, so the matrix is singular.'],
 ['What is the top-left entry of [[1,2],[3,4]] × [[2,0],[1,2]]?', ['2','4','5','8'],1,'hard','Dot row (1, 2) with column (2, 1): 2 + 2 = 4.'],
 ['Which statement about matrix multiplication is correct?', ['AB always equals BA','Only square matrices multiply','It is generally not commutative','It is entrywise multiplication'],2,'hard','The order of multiplication generally changes the result.']
 ];
 const courses:Course[]=[{id:'programming',title:'Programming Fundamentals',code:'CS101',teacher:'Sample instructor',exam:addDays(now,14),curriculumApproved:true,bankApproved:true,topics:[values,loops],questions:[...bank(values.id,vb),...bank(loops.id,lb)],classBlocks:[],sample:true},{id:'mathematics',title:'Applied Mathematics',code:'MA101',teacher:'Sample instructor',exam:addDays(now,21),curriculumApproved:true,bankApproved:true,topics:[vectors,matrices],questions:[...bank(vectors.id,veb),...bank(matrices.id,mb)],classBlocks:[],sample:true}];
 return {name:'My learning campus',department:'Engineering',timezone:'Asia/Kolkata',courses,learners:[{id:'learner-me',name:name||'My learner profile',courseIds:courses.map(c=>c.id),availability:[0,1,2,3,4].flatMap(day=>[day*48+36,day*48+37]),blackouts:[]}],attempts:[],evidence:[],plans:[],audit:[{date:now.toISOString(),action:'Started with two clearly labeled sample courses. No assessment scores were prefilled.'}],revisionCrossings:[],interventions:[]};
}
