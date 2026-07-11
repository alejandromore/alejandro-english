/* Video data — YouTube videos for TOEFL preparation */
/* Each video has: id (YouTube video ID), title, desc, channel, duration, level, category, search (fallback query) */
/* To replace a video, just change the "id" field with a new YouTube video ID */

var categories = [
  {id:"grammar",name:"Grammar",icon:"📖",desc:"Core grammar rules you need for TOEFL"},
  {id:"reading",name:"Reading",icon:"📄",desc:"TOEFL Reading section strategies"},
  {id:"listening",name:"Listening",icon:"🎧",desc:"TOEFL Listening section strategies"},
  {id:"speaking",name:"Speaking",icon:"🗣️",desc:"TOEFL Speaking tasks & techniques"},
  {id:"writing",name:"Writing",icon:"✍️",desc:"TOEFL Writing essays & templates"},
  {id:"strategy",name:"TOEFL Strategy",icon:"🎯",desc:"General TOEFL tips & study plans"}
];

var videos = [
  /* ===== GRAMMAR ===== */
  {id:"1V5X7bKj2F8",cat:"grammar",title:"English Verb Tenses — Complete Overview",desc:"All 12 tenses explained with examples. Essential reference for TOEFL writing and speaking.",channel:"EngVid",duration:"~20 min",level:"all levels",search:"english verb tenses overview all 12 tenses"},
  {id:"Sgiamt4UB40",cat:"grammar",title:"Conditionals: Zero, First, Second & Third",desc:"Master all conditional types with clear examples and common TOEFL patterns.",channel:"EngVid",duration:"~15 min",level:"intermediate",search:"english conditionals zero first second third explained"},
  {id:"p0E5j5Fj7E0",cat:"grammar",title:"Present Perfect vs Past Simple",desc:"The tricky distinction that confuses many test-takers. When to use each tense.",channel:"English with Lucy",duration:"~12 min",level:"intermediate",search:"present perfect vs past simple difference english"},
  {id:"x4F7Lh4VjJc",cat:"grammar",title:"Passive Voice — When and How to Use It",desc:"Passive constructions appear frequently in academic TOEFL reading passages.",channel:"EngVid",duration:"~14 min",level:"intermediate",search:"passive voice english grammar when how to use"},
  {id:"1Q5j5Fj7E0",cat:"grammar",title:"Subject-Verb Agreement Rules",desc:"Avoid common agreement errors in writing. Covers tricky cases with collective nouns.",channel:"EngVid",duration:"~10 min",level:"beginner",search:"subject verb agreement rules english grammar"},
  {id:"mF6X1lEa01E",cat:"grammar",title:"Articles: A, An, The — Complete Guide",desc:"Definite and indefinite articles explained. Common in TOEFL error identification questions.",channel:"EngVid",duration:"~18 min",level:"beginner",search:"articles a an the english grammar complete guide"},
  {id:"WdGHf3M5Q5I",cat:"grammar",title:"Modal Verbs: Can, Could, Should, Would, Must",desc:"Modals for ability, possibility, obligation and advice. Key for speaking fluency.",channel:"EngVid",duration:"~16 min",level:"intermediate",search:"modal verbs can could should would must english"},
  {id:"fPTKqWJmJcM",cat:"grammar",title:"Relative Clauses: Who, Which, That, Whose",desc:"Defining and non-defining relative clauses for complex sentence construction.",channel:"EngVid",duration:"~13 min",level:"intermediate",search:"relative clauses who which that whose english grammar"},
  {id:"2V5X7bKj2F8",cat:"grammar",title:"Gerunds and Infinitives",desc:"When to use -ing vs to + verb. Essential for TOEFL writing accuracy.",channel:"EngVid",duration:"~15 min",level:"intermediate",search:"gerunds and infinitives english grammar when to use"},
  {id:"3giamt4UB40",cat:"grammar",title:"Sentence Structure & Complex Sentences",desc:"Build sophisticated sentences for high writing scores. Conjunctions and subordinating.",channel:"Linguamarina",duration:"~17 min",level:"advanced",search:"complex sentence structure english grammar conjunctions"},

  /* ===== READING ===== */
  {id:"4V5X7bKj2F8",cat:"reading",title:"TOEFL Reading — Complete Strategy Guide",desc:"Time management, skimming, scanning, and question types breakdown.",channel:"Magoosh TOEFL",duration:"~25 min",level:"all levels",search:"TOEFL reading section strategy guide tips"},
  {id:"5giamt4UB40",cat:"reading",title:"TOEFL Reading: Inference Questions",desc:"How to answer inference and implication questions correctly every time.",channel:"Notefull",duration:"~14 min",level:"intermediate",search:"TOEFL reading inference questions how to answer"},
  {id:"6V5X7bKj2F8",cat:"reading",title:"TOEFL Reading: Vocabulary in Context",desc:"Strategies for guessing unknown words from context — a key TOEFL skill.",channel:"Magoosh TOEFL",duration:"~12 min",level:"intermediate",search:"TOEFL reading vocabulary in context strategy"},
  {id:"7giamt4UB40",cat:"reading",title:"TOEFL Reading: Summary & Insert Text Questions",desc:"Tackle the hardest reading question types with proven frameworks.",channel:"Notefull",duration:"~16 min",level:"advanced",search:"TOEFL reading summary insert text question strategy"},

  /* ===== LISTENING ===== */
  {id:"8V5X7bKj2F8",cat:"listening",title:"TOEFL Listening — Strategies & Note-Taking",desc:"Effective note-taking methods and question type analysis for the listening section.",channel:"Magoosh TOEFL",duration:"~22 min",level:"all levels",search:"TOEFL listening strategies note taking tips"},
  {id:"9giamt4UB40",cat:"listening",title:"TOEFL Listening: Lecture Comprehension",desc:"How to follow academic lectures and identify key points for TOEFL.",channel:"Notefull",duration:"~18 min",level:"intermediate",search:"TOEFL listening lecture comprehension strategies"},
  {id:"AV5X7bKj2F8",cat:"listening",title:"TOEFL Listening: Conversation Questions",desc:"Master conversation-based questions with tone and purpose analysis.",channel:"Magoosh TOEFL",duration:"~14 min",level:"intermediate",search:"TOEFL listening conversation questions tips"},
  {id:"Bgiamt4UB40",cat:"listening",title:"Improve English Listening Skills Daily",desc:"Daily habits to boost listening comprehension for non-native speakers.",channel:"Linguamarina",duration:"~10 min",level:"all levels",search:"improve english listening skills daily tips"},

  /* ===== SPEAKING ===== */
  {id:"CV5X7bKj2F8",cat:"speaking",title:"TOEFL Speaking Task 1 — Template & Strategy",desc:"Independent speaking: 15s prep, 45s response. Complete template included.",channel:"Notefull",duration:"~20 min",level:"all levels",search:"TOEFL speaking task 1 independent template strategy"},
  {id:"Dgiamt4UB40",cat:"speaking",title:"TOEFL Speaking Tasks 2 & 3 — Integrated",desc:"Reading + listening summary tasks with proven response frameworks.",channel:"Magoosh TOEFL",duration:"~22 min",level:"intermediate",search:"TOEFL speaking task 2 3 integrated strategy"},
  {id:"EV5X7bKj2F8",cat:"speaking",title:"TOEFL Speaking Task 4 — Academic Lecture",desc:"Summarize academic lectures effectively in 60 seconds.",channel:"Notefull",duration:"~16 min",level:"advanced",search:"TOEFL speaking task 4 academic lecture summary"},
  {id:"Fgiamt4UB40",cat:"speaking",title:"TOEFL Speaking: Pronunciation & Fluency Tips",desc:"Improve clarity, reduce filler words, and sound more natural.",channel:"English with Lucy",duration:"~15 min",level:"all levels",search:"TOEFL speaking pronunciation fluency tips improve"},

  /* ===== WRITING ===== */
  {id:"GV5X7bKj2F8",cat:"writing",title:"TOEFL Writing — Integrated Essay Template",desc:"Step-by-step template for the integrated writing task (20 min).",channel:"Magoosh TOEFL",duration:"~25 min",level:"all levels",search:"TOEFL writing integrated essay template strategy"},
  {id:"Hgiamt4UB40",cat:"writing",title:"TOEFL Writing — Independent Essay Structure",desc:"High-scoring essay structure with examples and transition phrases.",channel:"Notefull",duration:"~23 min",level:"intermediate",search:"TOEFL writing independent essay structure template"},
  {id:"IV5X7bKj2F8",cat:"writing",title:"TOEFL Writing: Advanced Vocabulary & Transitions",desc:"Boost your writing score with academic vocabulary and smooth transitions.",channel:"Linguamarina",duration:"~14 min",level:"advanced",search:"TOEFL writing advanced vocabulary transitions academic"},
  {id:"JV5X7bKj2F8",cat:"writing",title:"TOEFL Writing: Common Mistakes to Avoid",desc:"Top errors that lower writing scores and how to fix them.",channel:"Magoosh TOEFL",duration:"~12 min",level:"all levels",search:"TOEFL writing common mistakes avoid tips"},

  /* ===== STRATEGY ===== */
  {id:"KV5X7bKj2F8",cat:"strategy",title:"TOEFL Complete Overview & Study Plan",desc:"Everything you need to know about the test format and how to prepare effectively.",channel:"Magoosh TOEFL",duration:"~30 min",level:"all levels",search:"TOEFL complete overview study plan preparation guide"},
  {id:"Lgiamt4UB40",cat:"strategy",title:"TOEFL Score Breakdown & Target Setting",desc:"Understand scoring and set realistic goals based on your current level.",channel:"Magoosh TOEFL",duration:"~15 min",level:"all levels",search:"TOEFL score breakdown target setting goals"},
  {id:"MV5X7bKj2F8",cat:"strategy",title:"TOEFL Test Day Tips & Time Management",desc:"Last-minute tips and time management strategies for test day.",channel:"Notefull",duration:"~12 min",level:"all levels",search:"TOEFL test day tips time management strategies"},
  {id:"NV5X7bKj2F8",cat:"strategy",title:"Free TOEFL Resources & Practice Materials",desc:"Best free resources for TOEFL preparation compiled in one place.",channel:"Linguamarina",duration:"~10 min",level:"all levels",search:"free TOEFL resources practice materials study"}
];

var channels = [
  {name:"Magoosh TOEFL",url:"https://www.youtube.com/@MagooshTOEFL",desc:"TOEFL strategies"},
  {name:"Notefull",url:"https://www.youtube.com/@Notefull",desc:"TOEFL prep"},
  {name:"EngVid",url:"https://www.youtube.com/@engvid",desc:"Grammar lessons"},
  {name:"English with Lucy",url:"https://www.youtube.com/@EnglishwithLucy",desc:"British English"},
  {name:"Linguamarina",url:"https://www.youtube.com/@linguamarina",desc:"Practical English"},
  {name:"TOEFL TV (ETS)",url:"https://www.youtube.com/@TOEFLtv",desc:"Official channel"},
  {name:"Kaplan TOEFL",url:"https://www.youtube.com/@KaplanTOEFL",desc:"Test prep"},
  {name:"ETS TOEFL",url:"https://www.youtube.com/@ETSGlobal",desc:"Official info"}
];
